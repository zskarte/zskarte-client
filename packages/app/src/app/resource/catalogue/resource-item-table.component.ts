import { AfterViewInit, Component, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RESOURCE_STATUS_IN_STOCK, ResourceArticle, ResourceItem } from '@zskarte/types';
import { I18NService } from '../../state/i18n.service';
import { ResourceCatalogueRow } from '../resource-assignments';
import { ResourceService } from '../resource.service';
import { ResourceSelectionEntry } from './resource-catalogue.component';

/**
 * Expanded per-piece list for one article of the resource catalogue.
 *
 * A serialised article shows a paginated (100/page) table of individual pieces, each with
 * its own checkbox - disabled once the piece is not `an Lager` or is already assigned to a
 * draw element elsewhere on the map. A non-serialised article shows a single quantity
 * stepper instead, since its pieces are fungible.
 */
@Component({
  selector: 'app-resource-item-table',
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, MatPaginatorModule, MatTableModule],
  templateUrl: './resource-item-table.component.html',
  styleUrl: './resource-item-table.component.scss',
})
export class ResourceItemTableComponent implements AfterViewInit {
  private resourceService = inject(ResourceService);
  i18n = inject(I18NService);

  article = input.required<ResourceArticle>();
  row = input.required<ResourceCatalogueRow>();
  selection = input<ResourceSelectionEntry | undefined>(undefined);
  selectionChange = output<ResourceSelectionEntry>();

  readonly paginator = viewChild(MatPaginator);

  readonly itemColumns = ['select', 'serialNumber', 'serialNumberInternal', 'storageLocation', 'status'];
  readonly itemsDataSource = new MatTableDataSource<ResourceItem>([]);

  /** itemKeys already assigned to a draw element elsewhere on the map. */
  private readonly assignedItemKeys = computed(() => new Set(this.resourceService.assignmentIndex().byItemKey.keys()));
  private readonly selectedItemKeys = computed(() => new Set(this.selection()?.itemKeys ?? []));

  readonly quantity = computed(() => this.selection()?.quantity ?? 0);

  constructor() {
    effect(() => {
      this.itemsDataSource.data = this.article().items;
    });
  }

  ngAfterViewInit(): void {
    const paginator = this.paginator();
    if (paginator) {
      this.itemsDataSource.paginator = paginator;
    }
  }

  isItemSelected(item: ResourceItem): boolean {
    return !!item.itemKey && this.selectedItemKeys().has(item.itemKey);
  }

  isItemDisabled(item: ResourceItem): boolean {
    return (
      item.status !== RESOURCE_STATUS_IN_STOCK ||
      !item.itemKey ||
      (this.assignedItemKeys().has(item.itemKey) && !this.isItemSelected(item))
    );
  }

  toggleItem(item: ResourceItem): void {
    if (!item.itemKey || this.isItemDisabled(item)) {
      return;
    }
    const keys = new Set(this.selectedItemKeys());
    if (keys.has(item.itemKey)) {
      keys.delete(item.itemKey);
    } else {
      keys.add(item.itemKey);
    }
    const itemKeys = [...keys];
    this.selectionChange.emit({ quantity: itemKeys.length, itemKeys });
  }

  statusLabelKey(item: ResourceItem): string {
    if (item.status !== RESOURCE_STATUS_IN_STOCK) {
      return 'resourceUnavailable';
    }
    if (item.itemKey && this.assignedItemKeys().has(item.itemKey) && !this.isItemSelected(item)) {
      return 'resourceAssigned';
    }
    return 'resourceAvailable';
  }

  decreaseQuantity(): void {
    const next = Math.max(0, this.quantity() - 1);
    this.selectionChange.emit({ quantity: next, itemKeys: [] });
  }

  increaseQuantity(): void {
    const next = Math.min(this.row().availableCount, this.quantity() + 1);
    this.selectionChange.emit({ quantity: next, itemKeys: [] });
  }
}
