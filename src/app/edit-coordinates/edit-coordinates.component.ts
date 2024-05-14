import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Coordinate } from 'ol/coordinate';
import { I18NService } from '../state/i18n.service';
import { convertTo, convertFrom } from '../helper/projections';
import { FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { of, delay, switchMap, Observable } from 'rxjs';
import { ChangeType } from '../projection-selection/projection-selection.component';

@Component({
  selector: 'app-edit-coordinates',
  templateUrl: './edit-coordinates.component.html',
  styleUrls: ['./edit-coordinates.component.css'],
})
export class EditCoordinatesComponent {
  projectionFormatIndex = 0;
  lastProjectionFormatIndex = 0;
  numerical = true;
  lastNumerical = true;
  coordinates: Coordinate;
  geometry: string;
  error = '';
  formatedCoordinatesControl: FormControl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { geometry: string; coordinates: Coordinate },
    public i18n: I18NService,
    public dialogRef: MatDialogRef<EditCoordinatesComponent>,
  ) {
    this.geometry = data.geometry;
    this.coordinates = data.coordinates;
    this.formatedCoordinatesControl = new FormControl(null, undefined, [this.inputValidator.bind(this)]);
    this.updateFormatedCoordinates();
  }

  inputValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    return of(control.value).pipe(
      delay(500),
      switchMap((value) => {
        const result = this.validateAndUpdate(this.transformInput(value)) ? null : { invalidInput: { value: this.error } };
        return of(result);
      }),
    );
  }

  updateFormatedCoordinates() {
    const converted = convertTo(this.coordinates, this.projectionFormatIndex, this.numerical);
    const formatedCoordinates = JSON.stringify(converted, null, '\t');
    this.lastProjectionFormatIndex = this.projectionFormatIndex;
    this.lastNumerical = this.numerical;
    this.formatedCoordinatesControl.setValue(formatedCoordinates);
  }

  updateProjection(value: ChangeType) {
    if (this.formatedCoordinatesControl.valid || this.formatedCoordinatesControl.pending) {
      this.projectionFormatIndex = value.projectionFormatIndex ?? this.lastProjectionFormatIndex;
      this.numerical = value.numerical ?? this.lastNumerical;
      this.updateFormatedCoordinates();
    } else {
      this.projectionFormatIndex = this.lastProjectionFormatIndex;
      this.numerical = this.lastNumerical;
    }
  }

  transformInput(value: string) {
    try {
      const parsedCoordinates = JSON.parse(value);
      return convertFrom(parsedCoordinates, this.projectionFormatIndex, this.numerical);
    } catch (e) {
      this.error = 'Invalid JSON payload';
      return undefined;
    }
  }

  validateAndUpdate(input: Coordinate | undefined) {
    if (input) {
      let valid: boolean;
      switch (this.geometry) {
        case 'Point':
          valid = this.isValidPointCoordinate(input);
          break;
        case 'LineString':
          valid = this.isValidLine(input);
          break;
        case 'Polygon':
        case 'MultiPolygon':
          valid = this.isValidPolygon(input);
          break;
        default:
          valid = true;
      }
      if (valid) {
        this.error = '';
        this.coordinates = input;
        return true;
      } else {
        this.error = 'Invalid coordinates';
      }
    }
    return false;
  }

  cancel() {
    this.dialogRef.close(null);
  }

  ok(): void {
    if (this.formatedCoordinatesControl.valid && !this.formatedCoordinatesControl.pending) {
      this.dialogRef.close(this.coordinates);
    }
  }

  // skipcq: JS-0105
  private isValidPointCoordinate(coordinates: Coordinate | number) {
    return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.filter((c) => typeof c !== 'number').length === 0;
  }

  private isValidLine(coordinates: Coordinate) {
    return Array.isArray(coordinates) && coordinates.length > 1 && coordinates.filter((c) => !this.isValidPointCoordinate(c)).length === 0;
  }

  private isValidPolygon(coordinates: Coordinate) {
    return (
      Array.isArray(coordinates) &&
      coordinates.length > 0 &&
      coordinates.filter(
        (coordinateGroup) =>
          !Array.isArray(coordinateGroup) ||
          coordinateGroup.length < 3 ||
          coordinateGroup.filter((c) => !this.isValidPointCoordinate(c)).length > 0,
      ).length === 0
    );
  }
}
