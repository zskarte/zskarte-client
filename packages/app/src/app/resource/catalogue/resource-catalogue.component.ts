import { AfterViewInit, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RESOURCE_STATUS_IN_STOCK, ResourceArticle, ResourceAvailability } from '@zskarte/types';
import { DrawStyle } from '../../map-renderer/draw-style';
import { Signs } from '../../map-renderer/signs';
import { I18NService } from '../../state/i18n.service';
import { EmptyComponent, EmptyDescriptionComponent, EmptyHeaderComponent, EmptyMediaComponent, EmptyTitleComponent } from '../../ui/empty';
import { ResourceDeployDialogComponent } from '../placement/resource-deploy-dialog.component';
import { ResourceCatalogueRow } from '../resource-assignments';
import { ResourceService } from '../resource.service';
import { resolveResourceSignId } from '../resource-signature.mapping';
import { ResourceCatalogueFilterComponent } from './resource-catalogue-filter.component';
import { ResourceItemTableComponent } from './resource-item-table.component';

/** Pending selection for one article: how many pieces, and which specific ones for a serialised article. */
export interface ResourceSelectionEntry {
  quantity: number;
  itemKeys: string[];
}

/** Rendered signature (pictogram) preview for one catalogue row. */
interface SignaturePreview {
  url: string;
  label: string;
  isPlaceholder: boolean;
}

/**
 * The resource catalogue: filter bar, grouped/expandable article table, multi-select
 * across pages/filters, and the hand-off to the placement dialog.
 *
 * Selection is kept independently of the table's row objects - in `selection`, a
 * `Map<articleNumber, ResourceSelectionEntry>` - so it survives filtering, sorting and
 * pagination instead of living on rows that get replaced whenever the filtered set changes.
 */
@Component({
  selector: 'app-resource-catalogue',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    EmptyComponent,
    EmptyHeaderComponent,
    EmptyMediaComponent,
    EmptyTitleComponent,
    EmptyDescriptionComponent,
    ResourceCatalogueFilterComponent,
    ResourceItemTableComponent,
  ],
  templateUrl: './resource-catalogue.component.html',
  styleUrl: './resource-catalogue.component.scss',
})
export class ResourceCatalogueComponent implements AfterViewInit {
  resourceService = inject(ResourceService);
  i18n = inject(I18NService);
  private dialog = inject(MatDialog);

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  readonly displayedColumns = [
    'select',
    'signature',
    'articleNumber',
    'name',
    'articleGroup',
    'totalCount',
    'availableCount',
    'expand',
  ];

  readonly dataSource = new MatTableDataSource<ResourceCatalogueRow>([]);

  // Filter state, two-way bound to <app-resource-catalogue-filter>.
  readonly search = signal('');
  readonly selectedGroups = signal<string[]>([]);
  readonly selectedTypes = signal<string[]>([]);
  readonly selectedStorageSites = signal<string[]>([]);
  readonly selectedAvailability = signal<ResourceAvailability[]>([]);

  readonly expandedArticleNumbers = signal<ReadonlySet<string>>(new Set());

  /** Pending selection, independent of the (filtered/sorted/paginated) table rows. */
  readonly selection = signal<ReadonlyMap<string, ResourceSelectionEntry>>(new Map());

  readonly filteredRows = computed<ResourceCatalogueRow[]>(() => {
    const rows = this.resourceService.catalogueRows();
    const search = this.search().trim().toLowerCase();
    const groups = new Set(this.selectedGroups());
    const types = new Set(this.selectedTypes());
    const sites = new Set(this.selectedStorageSites());
    const availability = new Set(this.selectedAvailability());

    return rows.filter((row) => {
      const article = row.article;
      if (groups.size > 0 && !groups.has(article.articleGroup)) {
        return false;
      }
      if (types.size > 0 && !types.has(article.articleType)) {
        return false;
      }
      if (sites.size > 0 && !article.items.some((item) => item.storageLocation && sites.has(item.storageLocation))) {
        return false;
      }
      if (availability.size > 0 && !row.availability.some((bucket) => availability.has(bucket))) {
        return false;
      }
      if (search) {
        const haystack = [article.articleNumber, article.name, article.manufacturer ?? '']
          .concat(article.items.map((item) => item.serialNumber ?? ''))
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });
  });

  readonly totalArticleCount = computed(() => this.resourceService.catalogueRows().length);
  readonly filteredArticleCount = computed(() => this.filteredRows().length);
  readonly filteredPieceCount = computed(() => this.filteredRows().reduce((sum, row) => sum + row.article.totalCount, 0));

  readonly selectionEntries = computed(() => [...this.selection().entries()]);
  readonly totalSelectedQuantity = computed(() =>
    this.selectionEntries().reduce((sum, [, entry]) => sum + entry.quantity, 0),
  );
  readonly hasSelection = computed(() => this.totalSelectedQuantity() > 0);

  private readonly selectableFilteredRows = computed(() => this.filteredRows().filter((row) => row.availableCount > 0));

  readonly allFilteredSelected = computed(() => {
    const rows = this.selectableFilteredRows();
    return rows.length > 0 && rows.every((row) => this.isRowFullySelected(row));
  });

  readonly someFilteredSelected = computed(() => {
    if (this.allFilteredSelected()) {
      return false;
    }
    return this.selectableFilteredRows().some((row) => (this.selection().get(row.article.articleNumber)?.quantity ?? 0) > 0);
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredRows();
      // A new filtered set can leave the paginator on a now out-of-range page - go back to page 1.
      const paginator = this.paginator();
      if (paginator) {
        paginator.firstPage();
      }
    });
  }

  ngAfterViewInit(): void {
    const sort = this.sort();
    const paginator = this.paginator();
    if (sort) {
      this.dataSource.sort = sort;
    }
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
    this.dataSource.sortingDataAccessor = (row: ResourceCatalogueRow, property: string) => {
      switch (property) {
        case 'articleNumber':
          return row.article.articleNumber.toLowerCase();
        case 'name':
          return row.article.name.toLowerCase();
        case 'articleGroup':
          return row.article.articleGroup.toLowerCase();
        case 'totalCount':
          return row.article.totalCount;
        case 'availableCount':
          return row.availableCount;
        default:
          return '';
      }
    };
  }

  signaturePreview(article: ResourceArticle): SignaturePreview {
    const signId = resolveResourceSignId(article);
    const sign = Signs.getSignById(signId);
    return {
      url: sign ? DrawStyle.getImageUrl(sign.src) : '',
      label: sign ? this.i18n.getLabelForSign(sign) : '',
      isPlaceholder: signId === Signs.RESOURCE_PLACEHOLDER_SIGN_ID,
    };
  }

  isExpanded(row: ResourceCatalogueRow): boolean {
    return this.expandedArticleNumbers().has(row.article.articleNumber);
  }

  toggleExpand(row: ResourceCatalogueRow): void {
    const next = new Set(this.expandedArticleNumbers());
    if (next.has(row.article.articleNumber)) {
      next.delete(row.article.articleNumber);
    } else {
      next.add(row.article.articleNumber);
    }
    this.expandedArticleNumbers.set(next);
  }

  selectionFor(row: ResourceCatalogueRow): ResourceSelectionEntry | undefined {
    return this.selection().get(row.article.articleNumber);
  }

  isRowFullySelected(row: ResourceCatalogueRow): boolean {
    if (row.availableCount <= 0) {
      return false;
    }
    const entry = this.selectionFor(row);
    return !!entry && entry.quantity >= row.availableCount;
  }

  isRowPartiallySelected(row: ResourceCatalogueRow): boolean {
    const entry = this.selectionFor(row);
    return !!entry && entry.quantity > 0 && entry.quantity < row.availableCount;
  }

  /** Row-level checkbox: selects every currently available piece of the article, or clears it. */
  toggleRow(row: ResourceCatalogueRow): void {
    if (this.isRowFullySelected(row)) {
      this.updateSelection(row.article.articleNumber, { quantity: 0, itemKeys: [] });
      return;
    }
    this.updateSelection(row.article.articleNumber, this.fullSelectionFor(row));
  }

  /** Header checkbox: selects every available piece of every filtered article, or clears them all. */
  toggleAllFiltered(event: MatCheckboxChange): void {
    const next = new Map(this.selection());
    for (const row of this.selectableFilteredRows()) {
      if (event.checked) {
        next.set(row.article.articleNumber, this.fullSelectionFor(row));
      } else {
        next.delete(row.article.articleNumber);
      }
    }
    this.selection.set(next);
  }

  updateSelection(articleNumber: string, entry: ResourceSelectionEntry): void {
    const next = new Map(this.selection());
    if (entry.quantity <= 0 && entry.itemKeys.length === 0) {
      next.delete(articleNumber);
    } else {
      next.set(articleNumber, entry);
    }
    this.selection.set(next);
  }

  clearSelection(): void {
    this.selection.set(new Map());
  }

  private fullSelectionFor(row: ResourceCatalogueRow): ResourceSelectionEntry {
    if (!row.article.serialized) {
      return { quantity: row.availableCount, itemKeys: [] };
    }
    const assignedItemKeys = this.resourceService.assignmentIndex().byItemKey;
    const itemKeys = row.article.items
      .filter((item) => item.itemKey && item.status === RESOURCE_STATUS_IN_STOCK && !assignedItemKeys.has(item.itemKey))
      .map((item) => item.itemKey as string);
    return { quantity: itemKeys.length, itemKeys };
  }

  deploy(): void {
    const articlesByNumber = new Map(this.resourceService.articles().map((article) => [article.articleNumber, article]));
    const selections = this.selectionEntries()
      .map(([articleNumber, entry]) => {
        const article = articlesByNumber.get(articleNumber);
        return article ? { article, quantity: entry.quantity, itemKeys: entry.itemKeys } : undefined;
      })
      .filter((selection): selection is { article: ResourceArticle; quantity: number; itemKeys: string[] } => !!selection);

    if (selections.length === 0) {
      return;
    }

    this.dialog.open(ResourceDeployDialogComponent, {
      data: { selections },
      width: '560px',
    });
  }
}
