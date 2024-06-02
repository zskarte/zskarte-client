import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GeoadminService } from '../../map-layer/geoadmin/geoadmin.service';
import { I18NService } from '../../state/i18n.service';
import { MapLayer } from '../../map-layer/map-layer-interface';
import { WmsService } from '../../map-layer/wms/wms.service';

@Component({
  selector: 'app-map-legend-display',
  templateUrl: './map-legend-display.component.html',
  styleUrls: ['./map-legend-display.component.css'],
})
export class MapLegendDisplayComponent {
  html: string | null = null;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MapLayer,
    geoAdmin: GeoadminService,
    wmsService: WmsService,
    public i18n: I18NService,
  ) {
    if (!data.source) {
      geoAdmin.getLegend(data.serverLayerName).subscribe((data: string) => {
        this.html = data;
      });
    } else if (data.type === 'wms') {
      wmsService.getWMSLegend(data).subscribe((html: string | null) => {
        if (html) {
          this.html = html;
        } else {
          this.html = this.i18n.get('legendNotLoaded');
        }
      });
    } else if (data.type === 'wms_custom') {
      const html = wmsService.getWMSCustomLegend(data);
      if (html) {
        this.html = html;
      } else {
        this.html = this.i18n.get('legendNotLoaded');
      }
    } else {
      this.html = this.i18n.get('legendNotLoaded');
    }
  }
}
