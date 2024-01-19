import { Component } from '@angular/core';
import { ZsMapStateService } from '../state/state.service';
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
  constructor(private _state: ZsMapStateService) {
    this._state.getCoordinates().subscribe((coordinates) => {
      const lv95 = this.coordinatesToString(coordinates, '1.2-2');
      const gps = this.coordinatesToString(coordinates, '1.5-5');
      this.coordinates = [lv95, gps];
    });
  }

  // skipcq:  JS-0105
  coordinatesToString(coordinates: Coordinate, format: string): string {
    const projection = availableProjections.find((p) => p.format === format);
    if (projection?.projection && mercatorProjection && coordinates.every((c) => !isNaN(c))) {
      return projection.translate(transform(coordinates, mercatorProjection, projection.projection));
    }
    return '';
  }

  static transformToProjection(coordinates: Coordinate, projectionIndex: number) {
    const projection = availableProjections[projectionIndex].projection;
    if (projection && mercatorProjection && coordinates.every((c) => !isNaN(c))) {
      return transform(coordinates, mercatorProjection, projection);
    }
    return undefined;
  }
}
