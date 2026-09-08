import { Component, Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { IZsMapBaseDrawElementState, ResourceAssignment, ResourceAvailability } from '@zskarte/types';
import { ZsMapStateService } from '../../state/state.service';
import { I18NService } from '../../state/i18n.service';
import { ResourceService } from '../resource.service';
import { ResourceCatalogueFilterComponent } from '../catalogue/resource-catalogue-filter.component';
import { ResourcePlacementService } from '../placement/resource-placement.service';
import { Signs } from '../../map-renderer/signs';
import { DrawStyle } from '../../map-renderer/draw-style';
import { convertTo, projection_LV95 } from '../../helper/projections';
import { getCenter } from 'ol/extent';
import { MatTableModule } from '@angular/material/table';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { EmptyComponent, EmptyHeaderComponent, EmptyMediaComponent, EmptyTitleComponent, EmptyDescriptionComponent } from '../../ui/empty';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** One resource on one marker - a row of the nested table inside an expanded marker. */
interface DeployedRow {
  elementId: string;
  assignment: ResourceAssignment;
  /** Resolved from the catalogue for filtering; undefined when the article is no longer in it. */
  articleGroup?: string;
  articleType?: string;
  storageSites: string[];
  /** How many resource assignments the marker of this row carries in total. */
  markerAssignmentCount: number;
  signatureSrc?: string;
  signatureAlt: string;
  markerName: string;
  reportNumber: string;
  location: string;
}

/**
 * One marker, grouping the resources it carries - the top-level row of this table, mirroring
 * how the catalogue lists an article and expands to its individual pieces. The marker's
 * identity (pictogram, name, message, location) is stated once here instead of being repeated
 * on every resource, where identical rows looked like unrelated markers.
 */
interface DeployedMarkerRow {
  elementId: string;
  /** The marker's name, or what its pictogram depicts when it has none ("Materialdepot"). */
  markerLabel: string;
  signatureSrc?: string;
  signatureAlt: string;
  reportNumber: string;
  location: string;
  assignments: DeployedRow[];
}

@Component({
  selector: 'app-resource-deployed',
  imports: [
    MatTableModule,
    MatCard,
    MatIconModule,
    MatTooltipModule,
    ResourceCatalogueFilterComponent,
    EmptyComponent,
    EmptyHeaderComponent,
    EmptyMediaComponent,
    EmptyTitleComponent,
    EmptyDescriptionComponent,
  ],
  templateUrl: './resource-deployed.component.html',
  styleUrl: './resource-deployed.component.scss',
})
export class ResourceDeployedComponent {
  private state = inject(ZsMapStateService);
  private placement = inject(ResourcePlacementService);
  private dialog = inject(MatDialog);
  resourceService = inject(ResourceService);
  i18n = inject(I18NService);

  displayedColumns: string[] = ['signature', 'markerName', 'count', 'reportNumber', 'location', 'actions', 'expand'];
  /** Columns of the nested table listing the resources of one marker. */
  assignmentColumns: string[] = ['article', 'serialNumber', 'storageLocation', 'actions'];

  private readonly drawElements: Signal<IZsMapBaseDrawElementState[]> = toSignal(
    this.state.observeMapState().pipe(map((mapState) => Object.values(mapState?.drawElements ?? {}))),
    { initialValue: [] },
  );

  /** Filter state, mirroring the catalogue's filter bar (availability is meaningless here). */
  readonly search = signal('');
  readonly selectedGroups = signal<string[]>([]);
  readonly selectedTypes = signal<string[]>([]);
  readonly selectedStorageSites = signal<string[]>([]);
  readonly selectedAvailability = signal<ResourceAvailability[]>([]);

  private readonly allRows: Signal<DeployedRow[]> = computed(() => this.buildRows());

  /** Total deployed rows ignoring filters - decides whether the filter bar is shown at all. */
  readonly allRowsCount = computed(() => this.allRows().length);

  readonly rows: Signal<DeployedRow[]> = computed(() => {
    const term = this.search().trim().toLowerCase();
    const groups = this.selectedGroups();
    const types = this.selectedTypes();
    const sites = this.selectedStorageSites();
    if (!term && !groups.length && !types.length && !sites.length) {
      return this.allRows();
    }
    return this.allRows().filter((row) => {
      if (groups.length && !groups.includes(row.articleGroup ?? '')) return false;
      if (types.length && !types.includes(row.articleType ?? '')) return false;
      if (sites.length && !row.storageSites.some((site) => sites.includes(site))) return false;
      if (!term) return true;
      return [
        row.assignment.articleNumber,
        row.assignment.name,
        row.assignment.serialNumber,
        row.markerName,
        row.reportNumber,
      ]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(term));
    });
  });

  /**
   * The markers the table lists, each carrying its own resources - built by grouping the
   * filtered rows, which `buildRows()` already emits marker by marker.
   */
  readonly markerRows: Signal<DeployedMarkerRow[]> = computed(() => {
    const byElement = new Map<string, DeployedMarkerRow>();

    for (const row of this.rows()) {
      let marker = byElement.get(row.elementId);
      if (!marker) {
        marker = {
          elementId: row.elementId,
          markerLabel: row.markerName || row.signatureAlt,
          signatureSrc: row.signatureSrc,
          signatureAlt: row.signatureAlt,
          reportNumber: row.reportNumber,
          location: row.location,
          assignments: [],
        };
        byElement.set(row.elementId, marker);
      }
      marker.assignments.push(row);
    }

    return [...byElement.values()];
  });

  /** Markers the user expanded by hand; a filter expands everything on top of that (see `isExpanded`). */
  private readonly expandedElementIds = signal<ReadonlySet<string>>(new Set());

  private readonly hasActiveFilter = computed(
    () =>
      !!this.search().trim() ||
      this.selectedGroups().length > 0 ||
      this.selectedTypes().length > 0 ||
      this.selectedStorageSites().length > 0,
  );

  /**
   * Expanded while filtering: a marker is listed because one of its resources matched, so
   * collapsing it would hide the very thing that was searched for.
   */
  isExpanded(marker: DeployedMarkerRow): boolean {
    return this.hasActiveFilter() || this.expandedElementIds().has(marker.elementId);
  }

  toggleExpand(marker: DeployedMarkerRow): void {
    const next = new Set(this.expandedElementIds());
    if (next.has(marker.elementId)) {
      next.delete(marker.elementId);
    } else {
      next.add(marker.elementId);
    }
    this.expandedElementIds.set(next);
  }

  private buildRows(): DeployedRow[] {
    const rows: DeployedRow[] = [];
    for (const element of this.drawElements()) {
      if (!element.id || !element.resourceItems?.length) continue;
      const sign = Signs.getSignById(element.symbolId);
      const signatureSrc = sign?.src ? DrawStyle.getImageUrl(sign.src) : undefined;
      const signatureAlt = sign ? this.i18n.getLabelForSign(sign) : '';
      const markerName = element.name ?? '';
      const reportNumber = (Array.isArray(element.reportNumber) ? element.reportNumber : [element.reportNumber])
        .filter((n) => n !== undefined && n !== null)
        .join(', ');
      const location = element.coordinates
        ? (convertTo(element.coordinates as [number, number], projection_LV95!, false) as string)
        : '';

      for (const assignment of element.resourceItems) {
        // group/type/storage are not stored on the assignment (it keeps only a name snapshot),
        // so they are resolved from the catalogue; they stay undefined for orphaned entries.
        const article = this.resourceService.findArticle(assignment.articleNumber);
        const storageSites = article
          ? [
              ...new Set(
                article.items
                  .filter((item) => !assignment.itemKey || item.itemKey === assignment.itemKey)
                  .map((item) => item.storageLocation2 ?? item.storageLocation)
                  .filter((site): site is string => !!site),
              ),
            ]
          : [];
        rows.push({
          elementId: element.id,
          assignment,
          articleGroup: article?.articleGroup,
          articleType: article?.articleType,
          storageSites,
          markerAssignmentCount: element.resourceItems.length,
          signatureSrc,
          signatureAlt,
          markerName,
          reportNumber,
          location,
        });
      }
    }
    return rows;
  }

  navigateTo(elementId: string) {
    if (elementId) {
      this.state.setSelectedFeature(elementId);
      const extent = this.state.getDrawElement(elementId)?.getOlFeature()?.getGeometry()?.getExtent();
      if (extent) {
        this.state.setMapCenter(getCenter(extent));
      }
    }
  }

  /** Returns just this row's assignment to stock. */
  takeBack(row: DeployedRow) {
    this.placement.takeBack(row.elementId, row.assignment);
  }

  /** Returns every assignment of a marker to stock and deletes the marker - confirmed since it is destructive. */
  takeBackAll(elementId: string) {
    const confirm = this.dialog.open(ConfirmationDialogComponent, {
      data: { message: this.i18n.get('resourceTakeBackConfirm') },
    });
    confirm.afterClosed().subscribe((result) => {
      if (result) {
        this.placement.takeBackAll(elementId);
      }
    });
  }
}
