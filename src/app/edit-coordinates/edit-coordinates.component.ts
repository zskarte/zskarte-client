import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Coordinate } from 'ol/coordinate';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-edit-coordinates',
  templateUrl: './edit-coordinates.component.html',
  styleUrls: ['./edit-coordinates.component.css'],
})
export class EditCoordinatesComponent {
  coordinates: string;
  geometry: string;
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { geometry: string; coordinates: string },
    public i18n: I18NService,
    public dialogRef: MatDialogRef<EditCoordinatesComponent>,
  ) {
    this.geometry = data.geometry;
    this.coordinates = data.coordinates;
  }

  cancel() {
    this.dialogRef.close(null);
  }

  ok(): void {
    let parsedCoordinates;
    try {
      parsedCoordinates = JSON.parse(this.coordinates);
    } catch (e) {
      this.error = 'Invalid JSON payload';
    }
    if (parsedCoordinates) {
      let valid = true;
      switch (this.geometry) {
        case 'Point':
          valid = this.isValidPointCoordinate(parsedCoordinates);
          break;
        case 'LineString':
          valid = this.isValidLine(parsedCoordinates);
          break;
        case 'Polygon':
        case 'MultiPolygon':
          valid = this.isValidPolygon(parsedCoordinates);
          break;
        default:
          throw new Error(`No matching geometry: ${this.geometry}`);
      }
      if (valid) {
        this.dialogRef.close(parsedCoordinates);
      } else {
        this.error = 'Invalid coordinates';
      }
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
