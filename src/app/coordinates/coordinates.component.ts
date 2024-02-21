import { Component } from '@angular/core';
import { ZsMapStateService } from '../state/state.service';
import { projectionByIndex } from '../helper/projections';
import { ChangeType } from '../projection-selection/projection-selection.component';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-coordinates',
  templateUrl: './coordinates.component.html',
  styleUrl: './coordinates.component.scss',
})
export class CoordinatesComponent {
  showOptions: boolean = false;
  projectionFormatIndexes: number[];
  coordinates: string[] = [];
  constructor(private _state: ZsMapStateService) {
    //TODO: load this from session/state?
    this.projectionFormatIndexes = [0, 1];
    this._state.getCoordinates().subscribe(this.updateCoordinates.bind(this));
  }

  updateCoordinates(coordinates) {
    this.coordinates = this.projectionFormatIndexes.map((i) => {
      const proj = projectionByIndex(i);
      return proj.translate(proj.transformTo(coordinates));
    });
  }

  updateProjection(value: ChangeType) {
    if (value.projectionFormatIndexes!.length == 0) {
      this.projectionFormatIndexes = [0];
    } else {
      this.projectionFormatIndexes = value.projectionFormatIndexes!;
    }
    this._state.getCoordinates().pipe(first()).subscribe(this.updateCoordinates.bind(this));
    //TODO: save this to session/state?
  }
}
