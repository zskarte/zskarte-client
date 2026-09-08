import { Injectable, Signal, computed, effect, inject, resource, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import {
  IZsMapBaseDrawElementState,
  ResourceArticle,
  ResourceArticleApi,
  ResourceImportMeta,
  ResourceImportRequestApi,
  ResourceImportResponseApi,
} from '@zskarte/types';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import { StrapiApiResponseList } from '../helper/strapi-utils';
import { db } from '../db/db';
import { ZsMapStateService } from '../state/state.service';
import {
  ResourceAssignmentIndex,
  ResourceCatalogueRow,
  OrphanedResourceAssignment,
  buildResourceAssignmentIndex,
  computeResourceCatalogueRows,
  findOrphanedAssignments,
} from './resource-assignments';

/** Sorted, de-duplicated, non-empty string values - used for the catalogue filter dropdowns. */
function distinctSorted(values: (string | undefined)[]): string[] {
  const distinct = new Set(values.filter((value): value is string => Boolean(value?.trim())));
  return [...distinct].sort((a, b) => a.localeCompare(b));
}

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private _api = inject(ApiService);
  private _session = inject(SessionService);
  //late-bound (see setStateService) to avoid a DI cycle:
  //ZsMapStateService -> SyncService -> ResourceService -> ZsMapStateService
  private _state!: ZsMapStateService;
  private _connectionId!: string;

  private operationId = signal<string | null>(null);
  private organizationId = signal<string | null>(null);
  private resourceResource = resource({
    params: () => ({
      operationId: this.operationId(),
      organizationId: this.organizationId(),
    }),
    loader: async (request) => {
      return await this.loadCatalogue(request.params.operationId, request.params.organizationId);
    },
  });
  readonly backendData = this.resourceResource.value;
  readonly loading = this.resourceResource.isLoading;
  readonly backendError = this.resourceResource.error;
  readonly error = signal(false);
  readonly cachedOnly = signal(false);
  readonly reload = () => this.resourceResource.reload();

  readonly articles = signal<ResourceArticle[]>([]);
  readonly importMeta = signal<ResourceImportMeta | undefined>(undefined);

  /** All draw elements currently on the map, kept up to date once `setStateService` is wired. */
  private readonly drawElements = signal<IZsMapBaseDrawElementState[]>([]);

  readonly assignmentIndex: Signal<ResourceAssignmentIndex> = computed(() =>
    buildResourceAssignmentIndex(this.drawElements()),
  );
  readonly catalogueRows: Signal<ResourceCatalogueRow[]> = computed(() =>
    computeResourceCatalogueRows(this.articles(), this.assignmentIndex()),
  );
  readonly orphanedAssignments: Signal<OrphanedResourceAssignment[]> = computed(() =>
    findOrphanedAssignments(this.drawElements(), this.articles()),
  );

  readonly articleGroups: Signal<string[]> = computed(() =>
    distinctSorted(this.articles().map((article) => article.articleGroup)),
  );
  readonly articleTypes: Signal<string[]> = computed(() =>
    distinctSorted(this.articles().map((article) => article.articleType)),
  );
  readonly storageSites: Signal<string[]> = computed(() =>
    distinctSorted(this.articles().flatMap((article) => article.items.map((item) => item.storageLocation))),
  );

  constructor() {
    effect(() => {
      this._session
        .observeOperationId()
        .pipe(
          tap((operationId) => this.operationId.set(operationId as string)),
          tap(() => this.resourceResource.reload()),
        )
        .subscribe();
    });
    effect(() => {
      this._session
        .observeOrganizationId()
        .pipe(
          tap((organizationId) => this.organizationId.set(organizationId as string)),
          tap(() => this.resourceResource.reload()),
        )
        .subscribe();
    });

    effect(async () => {
      if (this._session.isWorkLocal()) {
        this.applyArticles((this.backendData() as ResourceArticleApi[]) || []);
        return;
      }
      const operationId = this.operationId();
      const organizationId = this.organizationId();
      if (!operationId || !organizationId) {
        this.applyArticles([]);
        return;
      }

      if (this.backendError()) {
        try {
          const cached = await db.localResourceArticles.where({ operationId, organizationId }).toArray();
          if (cached.length > 0) {
            this.applyArticles(cached);
            this.error.set(false);
            this.cachedOnly.set(true);
            return;
          }
        } catch (e) {
          console.error(`Error retrieving cached resource articles for ${operationId}:`, e);
        }
        this.error.set(true);
        this.applyArticles([]);
      } else {
        this.error.set(false);
        this.cachedOnly.set(false);
        const current = this.backendData() as ResourceArticleApi[] | undefined;
        if (current && current.length > 0) {
          this.applyArticles(current);
          try {
            await db.transaction('rw', db.localResourceArticles, async () => {
              await db.localResourceArticles.where({ operationId, organizationId }).delete();
              await db.localResourceArticles.bulkPut(
                current.map((article) => ({
                  ...article,
                  operationId,
                  organizationId,
                  fromCache: true,
                })),
              );
            });
          } catch (e) {
            console.error(`Error updating resource cache for ${operationId}:`, e);
          }
        } else {
          this.applyArticles([]);
          //delete from cache if backend explicitly sends an empty list
          if (Array.isArray(current)) {
            try {
              await db.localResourceArticles.where({ operationId, organizationId }).delete();
            } catch (e) {
              console.error(`Error clearing resource cache for ${operationId}:`, e);
            }
          }
        }
      }
    });
  }

  private applyArticles(list: ResourceArticleApi[]): void {
    this.articles.set(list);
    const first = list[0];
    this.importMeta.set(
      first
        ? {
            importId: first.importId,
            importedAt: first.importedAt,
            sourceExportedAt: first.sourceExportedAt,
            sourceOrganisation: first.sourceOrganisation,
          }
        : undefined,
    );
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
    state.observeMapState().subscribe((mapState) => {
      this.drawElements.set(Object.values(mapState?.drawElements ?? {}));
    });
  }

  public setConnectionId(connectionId: string): void {
    this._connectionId = connectionId;
  }

  public async loadCatalogue(operationId: string | null, organizationId: string | null): Promise<ResourceArticleApi[]> {
    if (!operationId || !organizationId) {
      return [];
    }
    if (this._session.isWorkLocal() || operationId.startsWith('local-')) {
      return await db.localResourceArticles.where({ operationId, organizationId }).toArray();
    }

    const articles: ResourceArticleApi[] = [];
    let page = 0;
    const pageSize = 1000;
    let error: HttpErrorResponse | undefined;
    let result: StrapiApiResponseList<ResourceArticleApi> | undefined;
    do {
      page++;
      //organization is implicit by session
      ({ error, result } = await this._api.get<StrapiApiResponseList<ResourceArticleApi>>(
        `/api/resource-articles?operationId=${operationId}&pagination[pageSize]=${pageSize}&pagination[page]=${page}&sort=articleNumber`,
        { keepMeta: true },
      ));
      if (error || !result) {
        throw 'error on fetch resource articles';
      }
      articles.push(...result.data);
    } while (page < result.meta.pagination.pageCount);
    return articles;
  }

  public findArticle(articleNumber: string): ResourceArticle | undefined {
    return this.articles().find((article) => article.articleNumber === articleNumber);
  }

  /**
   * Local operations (guest mode, `local-…`) have no server behind them, so the catalogue is
   * written straight to IndexedDB instead of being POSTed. Mirrors what the import endpoint
   * does server-side: the operation's whole catalogue is replaced in one transaction.
   */
  private async commitImportLocally(
    request: ResourceImportRequestApi,
    operationId: string,
    organizationId: string,
  ): Promise<{ error?: unknown; result?: ResourceImportResponseApi }> {
    const importedAt = new Date();
    const rows = request.articles.map((article) => ({
      ...article,
      importId: request.importId,
      importedAt,
      sourceExportedAt: request.sourceExportedAt,
      sourceOrganisation: request.sourceOrganisation,
      operationId,
      organizationId,
      fromCache: true,
    }));
    try {
      await db.transaction('rw', db.localResourceArticles, async () => {
        await db.localResourceArticles.where({ operationId, organizationId }).delete();
        await db.localResourceArticles.bulkPut(rows);
      });
    } catch (error) {
      return { error };
    }
    this.applyArticles(rows);
    this.error.set(false);
    this.cachedOnly.set(false);
    return {
      result: {
        importId: request.importId,
        articleCount: request.articles.length,
        itemCount: request.articles.reduce((sum, article) => sum + article.items.length, 0),
        alreadyImported: false,
      },
    };
  }

  public async commitImport(
    request: ResourceImportRequestApi,
  ): Promise<{ error?: unknown; result?: ResourceImportResponseApi }> {
    const operationId = this.operationId();
    const organizationId = this.organizationId();
    if ((this._session.isWorkLocal() || operationId?.startsWith('local-')) && operationId && organizationId) {
      return await this.commitImportLocally(request, operationId, organizationId);
    }

    const response = await this._api.post<ResourceImportResponseApi>(
      '/api/resource-articles/import',
      { data: request },
      { headers: { identifier: this._connectionId } },
    );
    const { error, result } = response;
    if (!error && result) {
      this.reload();
    }
    return response;
  }
}
