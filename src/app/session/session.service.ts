import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  retry,
  skip,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { db } from '../db/db';
import { AccessTokenType, IAuthResult, IZsMapSession, PermissionType } from './session.interfaces';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import { ZsMapStateService } from '../state/state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DEFAULT_LOCALE, Locale } from '../state/i18n.service';
import { IZsMapOperation, IZsMapOrganization, IZsMapOrganizationMapLayerSettings } from './operations/operation.interfaces';
import { transform } from 'ol/proj';
import { coordinatesProjection, mercatorProjection } from '../helper/projections';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from './default-map-values';
import { decodeJWT } from '../helper/jwt';
import { WmsService } from '../map-layer/wms/wms.service';
import { MapLayerService } from '../map-layer/map-layer.service';
import { OperationService } from './operations/operation.service';
import { OrganisationLayerSettingsComponent } from '../map-layer/organisation-layer-settings/organisation-layer-settings.component';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsMapSession | undefined>(undefined);
  private _clearOperation = new Subject<void>();
  private _state!: ZsMapStateService;
  private _authError = new BehaviorSubject<HttpErrorResponse | undefined>(undefined);
  private _isOnline = new BehaviorSubject<boolean>(true);

  constructor(
    private _router: Router,
    private _api: ApiService,
    private _wms: WmsService,
    private _mapLayerService: MapLayerService,
    private _operationService: OperationService,
  ) {
    //"solve" circular dependency between OperationService and SessionService
    _operationService.setSessionService(this);

    this._session.pipe(skip(1)).subscribe(async (session) => {
      this._clearOperation.next();
      if (session?.jwt || session?.workLocal) {
        await db.sessions.put(session);
        if (session.operation?.id) {
          await this._state?.refreshMapState();
          const displayState = await db.displayStates.get({ id: session.operation?.id });
          this._state.setDisplayState(displayState);
          const globalWmsSources = await this._wms.readGlobalWMSSources(session.organization?.id ?? 0);
          if (session?.workLocal) {
            const localWmsSources = await MapLayerService.getLocalWmsSources();
            if (globalWmsSources.length > 0) {
              //use local copy if available
              const localWmsIds = localWmsSources.map((s) => s.id);
              const wmsSources = [...localWmsSources, ...globalWmsSources.filter((s) => !localWmsIds.includes(s.id))];
              this._state.setGlobalWmsSources(wmsSources);
            } else {
              this._state.setGlobalWmsSources(localWmsSources);
            }
          } else {
            this._state.setGlobalWmsSources(globalWmsSources);
          }
          const globalMapLayers = await this._mapLayerService.readGlobalMapLayers(globalWmsSources, session.organization?.id ?? 0);
          if (session?.workLocal) {
            const localMapLayers = await MapLayerService.getLocalMapLayers();
            if (globalMapLayers.length > 0) {
              //use local copy if available, keep both if different settings
              const mapLayers = [
                ...localMapLayers,
                ...globalMapLayers.filter((l) => {
                  const orig = localMapLayers.find((ll) => ll.fullId === l.fullId);
                  if (!orig) {
                    return true;
                  }
                  return !OrganisationLayerSettingsComponent.sameOptions(orig, l, [
                    'mapStatus',
                    'sourceBlobId',
                    'styleBlobId',
                    'offlineAvailable',
                  ]);
                }),
              ];
              this._state.setGlobalMapLayers(mapLayers);
            } else {
              this._state.setGlobalMapLayers(localMapLayers);
            }
          } else {
            this._state.setGlobalMapLayers(globalMapLayers);
          }
          if (!displayState) {
            if (session.organization?.wms_sources && session.organization?.wms_sources.length > 0) {
              //if no session state, fill default wms sources from organisation settings
              const selectedSources = globalWmsSources.filter((s) => s.id && session.organization?.wms_sources.includes(s.id));
              this._state.setWmsSources(selectedSources);
            } else {
              //if no session state, fill default wms sources from local settings
              const localMapLayerSettings = await MapLayerService.loadLocalMapLayerSettings();
              if (localMapLayerSettings?.wms_sources && localMapLayerSettings?.wms_sources.length > 0) {
                const selectedSources = globalWmsSources.filter((s) => s.id && localMapLayerSettings?.wms_sources.includes(s.id));
                this._state.setWmsSources(selectedSources);
              }
            }
          }
          if (!displayState && session.operation?.mapLayers) {
            //if no session state, fill mapLayers from operation settings
            this._state.setMapSource(session.operation?.mapLayers.baseLayer);
            /*
            //rehydrate mapLayer informations
            const layers = session.operation?.mapLayers.layerConfigs.map((layer) => {
              if (!layer.source) {
                layer.source = MapLayerService.getMapSource(layer, globalWmsSources);
                //need to adjust IZSMapOperationMapLayers.layerConfigs to: (Partial<MapLayer> & MapLayerSourceApi)[];
                delete layer.wms_source;
                delete layer.custom_source;
              }
              //here need to have "allFeatures$" from SidebarComponent...
              //the corresponding logic need to be extracted to a service if extractMapLayerDiff and rehyrdarte should be used
              const allLayers: MapLayer[] = [];
              const defaultLayer = allLayers.find((g) => g.fullId === layer.fullId);
              return { ...defaultLayer, ...layer } as MapLayer;
            });
            */
            const layers = session.operation?.mapLayers.layerConfigs;
            if (layers) {
              this._state.updateDisplayState((draft) => {
                draft.layers = layers;
              });
            }
          }
          //make sure layerFeature source information are up to date
          this._state.reloadAllMapLayers();

          this._state
            .observeDisplayState()
            .pipe(skip(1), takeUntil(this._clearOperation))
            .subscribe(async (displayState) => {
              if (this._session.value?.operation?.id) {
                await db.displayStates.put({ ...displayState, id: this._session.value.operation?.id });
              }
            });

          await this._router.navigateByUrl('/map');
        } else {
          await this._router.navigateByUrl('/operations');
          this._state.setMapState(undefined);
          this._state.setDisplayState(undefined);
        }
        return;
      }

      await db.displayStates.clear();
      await db.sessions.clear();
      return;
    });

    // online/offline checks
    window.addEventListener('online', () => {
      this._isOnline.next(true);
    });
    window.addEventListener('offline', () => {
      this._isOnline.next(false);
    });
    this._isOnline
      .asObservable()
      .pipe(skip(1), distinctUntilChanged())
      .subscribe((isOnline) => {
        // feature: show notification that connection was lost
        if (!isOnline) return;
        of([])
          .pipe(
            switchMap(async () => {
              await this.refreshToken();
            }),
            retry({ count: 5, delay: 1000 }),
            takeUntil(this._isOnline.asObservable().pipe(filter((isOnline) => !isOnline))),
          )
          .subscribe({
            complete: () => {
              // feature: show notification that connection was restored
            },
          });
      });
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
  }

  public getOrganization() {
    return this._session.value?.organization;
  }

  public getOrganizationId(): number | undefined {
    return this._session.value?.organization?.id;
  }

  public observeFavoriteLayers$(): Observable<number[] | undefined> {
    return this._session.pipe(
      concatMap(
        async (session) =>
          session?.organization?.map_layer_favorites ??
          (this.isWorkLocal() ? (await MapLayerService.loadLocalMapLayerSettings())?.map_layer_favorites : undefined),
      ),
    );
  }

  public async saveOrganizationMapLayerSettings(data: IZsMapOrganizationMapLayerSettings) {
    const organization = this.getOrganization();
    if (organization?.id) {
      await this._api.put(`/api/organizations/${organization?.id}/layer-settings`, { data });

      organization.wms_sources = data.wms_sources;
      organization.map_layer_favorites = data.map_layer_favorites;
      //update session object
      const currentSession = this._session.value;
      if (currentSession) {
        currentSession.organization = organization;
        this._session.next(currentSession);
      }
    } else if (this.isWorkLocal()) {
      await MapLayerService.saveLocalMapLayerSettings(data);
      this._session.next(this._session.value);
    }
  }

  public getLabel(): string | undefined {
    return this._session.value?.label;
  }

  public observeLabel(): Observable<string | undefined> {
    return this._session.pipe(map((session) => session?.label));
  }

  public setLabel(label: string): void {
    const currentSession = this._session.value;
    if (currentSession) {
      currentSession.label = label;
      this._session.next(currentSession);
    }
  }

  public getAuthError(): HttpErrorResponse | undefined {
    return this._authError.value;
  }

  public observeOrganizationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.organization?.id));
  }

  public setOperation(operation?: IZsMapOperation): void {
    if (this._session?.value) {
      this._session.value.operation = operation;
    }
    this._session.next(this._session.value);
  }

  public observeOperationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.operation?.id));
  }

  public getOperation(): IZsMapOperation | undefined {
    return this._session?.value?.operation;
  }

  public getOperationId(): number | undefined {
    return this._session?.value?.operation?.id;
  }

  public getOperationName(): string | undefined {
    return this._session?.value?.operation?.name;
  }

  public getOperationEventStates(): number[] | undefined {
    return this._session?.value?.operation?.eventStates;
  }

  public getLogo(): string | undefined {
    return this._session?.value?.organizationLogo;
  }

  // skipcq: JS-0105
  public async getSavedSession(): Promise<IZsMapSession | undefined> {
    const sessions = await db.sessions.toArray();
    if (sessions.length === 1) {
      return sessions[0];
    }
    if (sessions.length > 1) {
      if (this.isOnline()) {
        return db.sessions.get('current');
      } else {
        return db.sessions.get('local');
      }
    }
    return undefined;
  }

  public async loadSavedSession(): Promise<void> {
    const session = await this.getSavedSession();
    if (session?.jwt) {
      await this.updateJWT(session?.jwt);
      return;
    } else if (session?.workLocal) {
      this._session.next(session);
      return;
    }
    this._session.next(undefined);
  }

  public async login(params: { identifier: string; password: string }): Promise<void> {
    const { result, error: authError } = await this._api.post<IAuthResult>('/api/auth/local', params);
    this._authError.next(authError);
    if (authError || !result) {
      await this._router.navigateByUrl('/login');
      return;
    }
    await this.updateJWT(result.jwt);
  }

  public async updateJWT(jwt: string) {
    const decoded = decodeJWT(jwt);
    if (decoded.expired) {
      await this.logout();
      return;
    }

    const { error, result: meResult } = await this._api.get<{ organization: IZsMapOrganization }>(
      '/api/users/me?populate[0]=organization.logo',
      {
        token: jwt,
      },
    );
    if (error || !meResult) {
      await this.logout();
      return;
    }

    const currentSession = await this.getSavedSession();
    let newSession: IZsMapSession;

    if (currentSession && !currentSession.workLocal) {
      newSession = currentSession;
    } else {
      newSession = {
        id: 'current',
        locale: DEFAULT_LOCALE,
      };
    }

    newSession.permission = decoded.permission || PermissionType.ALL;

    newSession.label = newSession.label || meResult.organization?.name || meResult.organization?.id.toString();

    // update organization values
    newSession.jwt = jwt;
    newSession.organizationLogo = meResult.organization?.logo?.url;
    newSession.organization = meResult.organization;

    // update operation values
    const operationId = decoded.operationId || currentSession?.operation?.id;
    if (operationId) {
      const operation = await this._operationService.getOperation(operationId, { token: jwt });
      if (operation) {
        newSession.operation = operation;
      }
    }

    if (meResult.organization) {
      newSession.organization = meResult.organization;
    }

    this._session.next(newSession);
  }

  public isWorkLocal() {
    return this._session.value?.workLocal === true;
  }

  public startWorkLocal() {
    const newSession: IZsMapSession = {
      id: 'local',
      locale: DEFAULT_LOCALE,
      workLocal: true,
      permission: PermissionType.ALL,
      label: 'local',
    };

    this._session.next(newSession);
  }

  public async logout(): Promise<void> {
    this._session.next(undefined);
    await this._router.navigateByUrl('/login');
  }

  public async refreshToken(): Promise<void> {
    if (this.isWorkLocal()) {
      return;
    }
    const currentToken = this._session.value?.jwt;
    if (!currentToken) {
      await this.logout();
      return;
    }

    const { result, error: authError } = await this._api.get<IAuthResult>('/api/accesses/auth/refresh', {
      token: currentToken,
    });

    if (authError || !result?.jwt) {
      await this.logout();
      return;
    }

    await this.updateJWT(result.jwt);
  }

  public getToken(): string | undefined {
    return this._session.value?.jwt;
  }

  public observeAuthenticated(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        if (session?.workLocal) {
          return true;
        }
        if (!session?.jwt) {
          return false;
        }
        if (decodeJWT(session.jwt).expired) {
          this.logout();
          return false;
        }
        return true;
      }),
    );
  }

  public setLocale(locale: Locale): void {
    const currentSession = this._session.value;
    if (currentSession) {
      currentSession.locale = locale;
      this._session.next(currentSession);
    }
  }

  public getLocale(): Locale {
    return this._session.value?.locale ?? DEFAULT_LOCALE;
  }

  public observeIsOnline(): Observable<boolean> {
    return this._isOnline.pipe(skip(1), distinctUntilChanged());
  }

  public isOnline(): boolean {
    return this._isOnline.value;
  }

  public async generateShareLink(permission: PermissionType, tokenType: AccessTokenType) {
    if (!this.getOperationId()) {
      throw new Error('OperationId is not defined');
    }
    const response = await this._api.post<{ accessToken: string }>('/api/accesses/auth/token/generate', {
      type: permission,
      operationId: this.getOperationId(),
      tokenType,
    });
    if (!response.result?.accessToken) {
      throw new Error('Unable to generate share url');
    }
    return response.result.accessToken;
  }

  public observeHasWritePermission(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        return !(session?.permission === PermissionType.READ);
      }),
    );
  }

  public hasWritePermission(): boolean {
    return !(this._session.value?.permission === PermissionType.READ);
  }

  public getDefaultMapCenter(): number[] {
    if (coordinatesProjection && mercatorProjection) {
      if (this._session.value?.defaultLatitude && this._session.value?.defaultLongitude) {
        return transform(
          [this._session.value?.defaultLongitude, this._session.value?.defaultLatitude],
          coordinatesProjection,
          mercatorProjection,
        );
      } else if (this._session.value?.operation?.mapState?.center[0] && this._session.value?.operation?.mapState?.center[1]) {
        return transform(this._session.value.operation.mapState.center, coordinatesProjection, mercatorProjection);
      }
    }
    return DEFAULT_COORDINATES;
  }

  public getDefaultMapZoom(): number {
    return this._session.value?.defaultZoomLevel || DEFAULT_ZOOM;
  }
}
