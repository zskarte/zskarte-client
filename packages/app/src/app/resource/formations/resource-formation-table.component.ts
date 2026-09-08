import { Component, DestroyRef, inject } from '@angular/core';
import { ZsMapStateService } from '../../state/state.service';
import { I18NService } from '../../state/i18n.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HierarchyLevel, ZsMapDrawElementState } from '@zskarte/types';
import { map } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe } from '@angular/common';
import { MatCard } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  EmptyComponent,
  EmptyHeaderComponent,
  EmptyMediaComponent,
  EmptyTitleComponent,
  EmptyDescriptionComponent,
} from '../../ui/empty';
import { convertTo, projection_LV95 } from '../../helper/projections';
import { ZsMapBaseDrawElement } from '../../map-renderer/elements/base/base-draw-element';
import { Signs } from '../../map-renderer/signs';
import { SimpleGeometry } from 'ol/geom';
import { getCenter } from 'ol/extent';

interface FormationRow {
  id: string;
  organization: string;
  formationLocation: string;
  hierarchyLevel: string;
  formationNumber: string;
  formationDetail: string;
  additionalInfo: string;
  location: string;
}

@Component({
  selector: 'app-resource-formation-table',
  imports: [
    MatTableModule,
    AsyncPipe,
    MatCard,
    MatIconModule,
    EmptyComponent,
    EmptyHeaderComponent,
    EmptyMediaComponent,
    EmptyTitleComponent,
    EmptyDescriptionComponent,
  ],
  templateUrl: './resource-formation-table.component.html',
  styleUrl: './resource-formation-table.component.scss',
})
export class ResourceFormationTableComponent {
  private state = inject(ZsMapStateService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18NService);

  readonly FORMATION_SIGN_ID = [Signs.FORMATION_SIGN_ID];

  displayedColumns: string[] = [
    'organization',
    'formationLocation',
    'hierarchyLevel',
    'formationNumber',
    'formationDetail',
    'additionalInfo',
    'location',
  ];

  resources$ = this.state.observeDrawElements().pipe(
    takeUntilDestroyed(this.destroyRef),
    map((elements) =>
      elements
        .filter((e) => this.FORMATION_SIGN_ID.includes(e.elementState?.symbolId as number))
        .map((e) => this.mapToFormationRow(e)),
    ),
  );

  private mapToFormationRow(element: ZsMapBaseDrawElement): FormationRow {
    const state = element.elementState as ZsMapDrawElementState;
    const geometry = element.getOlFeature().getGeometry() as SimpleGeometry;
    return {
      id: state.id ?? '',
      organization: state.organization ?? '',
      formationLocation: state.formationLocation ?? String(state.coordinates) ?? '',
      hierarchyLevel: this.getHierarchyLabel(state.hierarchyLevel),
      formationNumber: state.formationNumber ?? '',
      formationDetail: state.formationDetail ?? '',
      additionalInfo: state.additionalInfo ?? '',
      location: convertTo(geometry.getCoordinates() || [], projection_LV95!, false) as string,
    };
  }

  private getHierarchyLabel(level?: HierarchyLevel): string {
    if (!level) return '';
    switch (level) {
      case HierarchyLevel.TRUPP:
        return this.i18n.get('hierarchyTrupp');
      case HierarchyLevel.GRUPPE:
        return this.i18n.get('hierarchyGruppe');
      case HierarchyLevel.ZUG:
        return this.i18n.get('hierarchyZug');
      case HierarchyLevel.KOMPANIE:
        return this.i18n.get('hierarchyKompanie');
      case HierarchyLevel.BATAILLON:
        return this.i18n.get('hierarchyBataillon');
      default:
        return '';
    }
  }

  navigateTo(row: FormationRow) {
    if (row.id) {
      this.state.setSelectedFeature(row.id);
      const extent = this.state.getDrawElement(row.id)?.getOlFeature()?.getGeometry()?.getExtent();
      if (extent) {
        this.state.setMapCenter(getCenter(extent));
      }
    }
  }
}
