import { Component } from '@angular/core';
import { ZsMapStateService } from '../state/state.service';
import { Feature } from 'ol';
import { getCenter } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { availableProjections, mercatorProjection } from '../helper/projections';
import { transform } from 'ol/proj';

@Component({
  selector: 'app-coordinates',
  templateUrl: './coordinates.component.html',
  styleUrl: './coordinates.component.scss',
})
export class CoordinatesComponent {
  coordinates: string[] = [];
  constructor(public state: ZsMapStateService) {
    this.state.getCoordinates().subscribe((coordinates) => {
      const lv95 = this.coordinatesToString(coordinates, '1.2-2');
      const gps = this.coordinatesToString(coordinates, '1.5-5');
      this.coordinates = [lv95, gps];
    });
  }

  coordinatesToString(coordinates: Coordinate, format: string): string {
    const projection = availableProjections.find((p) => p.format === format);
    if (projection?.projection && mercatorProjection && coordinates.every((c) => !isNaN(c))) {
      return projection.translate(transform(coordinates, mercatorProjection, projection.projection));
    }
    return '';
  }

  transformToProjection(coordinates: Coordinate, projection_index: number) {
    const projection = availableProjections[projection_index].projection;
    if (projection && mercatorProjection && coordinates.every((c) => !isNaN(c))) {
      return transform(coordinates, mercatorProjection, projection);
    }
    return undefined;
  }

  getFeatureCoordinates(feature: Feature | null | undefined): number[] {
    const center = getCenter(feature?.getGeometry()?.getExtent() ?? []);
    return this.transformToProjection(center, 0) ?? [];
  }
}
