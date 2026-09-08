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

interface DeployedRow {
  kind: 'item';
  /** True when this row is listed under a group header, i.e. its marker carries several resources. */
  inGroup: boolean;
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
  articleLabel: string;
  markerName: string;
  reportNumber: string;
  location: string;
}

/**
 * Header row standing for one marker that carries several resources: the marker's identity
 * (pictogram, name, message, location) is shown once here instead of being repeated - and
 * silently looking like unrelated rows - on every one of its resources.
 */
interface DeployedGroupRow {
  kind: 'group';
  elementId: string;
  markerLabel: string;
  signatureSrc?: string;
  signatureAlt: string;
  reportNumber: string;
  location: string;
  /** Resources of this marker currently listed (filters can hide some of them). */
  count: number;
  /** Total resources on the marker, which "take back all" acts on. */
  totalCount: number;
}

type DeployedTableRow = DeployedRow | DeployedGroupRow;

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

  displayedColumns: string[] = ['signature', 'article', 'markerName', 'reportNumber', 'location', 'actions'];

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
   * The rows as the table renders them: resources of the same marker are kept together under
   * one group header. A marker with a single (visible) resource stays a plain row - a header
   * for one item would be noise.
   */
  readonly tableRows: Signal<DeployedTableRow[]> = computed(() => {
    const rows = this.rows();
    const tableRows: DeployedTableRow[] = [];

    for (let index = 0; index < rows.length; ) {
      const start = index;
      while (index < rows.length && rows[index].elementId === rows[start].elementId) {
        index++;
      }
      const group = rows.slice(start, index);
      const [head] = group;
      if (group.length === 1) {
        tableRows.push({ ...head, inGroup: false });
        continue;
      }
      tableRows.push({
        kind: 'group',
        elementId: head.elementId,
        // an unnamed marker is identified by what it depicts, e.g. "Materialdepot"
        markerLabel: head.markerName || head.signatureAlt,
        signatureSrc: head.signatureSrc,
        signatureAlt: head.signatureAlt,
        reportNumber: head.reportNumber,
        location: head.location,
        count: group.length,
        totalCount: head.markerAssignmentCount,
      });
      tableRows.push(...group.map((row) => ({ ...row, inGroup: true })));
    }

    return tableRows;
  });

  // skipcq: JS-0105
  isGroupRow(_index: number, row: DeployedTableRow): boolean {
    return row.kind === 'group';
  }

  /** Centres the map on the marker of a group header or a plain row alike. */
  navigateToElement(row: DeployedTableRow) {
    this.navigateTo(row.elementId);
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
          kind: 'item',
          inGroup: false,
          elementId: element.id,
          assignment,
          articleGroup: article?.articleGroup,
          articleType: article?.articleType,
          storageSites,
          markerAssignmentCount: element.resourceItems.length,
          signatureSrc,
          signatureAlt,
          articleLabel: this.formatAssignment(assignment),
          markerName,
          reportNumber,
          location,
        });
      }
    }
    return rows;
  }

  private formatAssignment(assignment: ResourceAssignment): string {
    const base = `${assignment.quantity}× ${assignment.name}`;
    return assignment.serialNumber ? `${base} (${this.i18n.get('resourceSerialNumber')}: ${assignment.serialNumber})` : base;
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
