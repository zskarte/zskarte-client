import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GeoadminService } from '../../core/geoadmin.service';
import { I18NService } from '../../state/i18n.service';

@Component({
  selector: 'app-map-legend-display',
  templateUrl: './map-legend-display.component.html',
  styleUrls: ['./map-legend-display.component.css'],
})
export class MapLegendDisplayComponent {
  html: string | null = null;
  constructor(
    public dialogRef: MatDialogRef<MapLegendDisplayComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string,
    geoAdmin: GeoadminService,
    public i18n: I18NService,
  ) {
    if (data) {
      geoAdmin.getLegend(data).subscribe((data: string) => {
        this.html = data;
      });
    } else {
      this.html = this.i18n.get('legendNotLoaded');
    }
  }
}
