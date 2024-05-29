import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../../../state/i18n.service';
import { WMSMapLayer, MapSource, WmsSource } from '../../map-layer-interface';
import { MatRadioChange } from '@angular/material/radio';
import { ZsMapStateService } from '../../../state/state.service';
import { firstValueFrom } from 'rxjs';
import { MatSelectChange } from '@angular/material/select';
import { WmsService } from '../wms.service';

@Component({
  selector: 'app-wms-layer-options',
  templateUrl: './wms-layer-options.component.html',
  styleUrl: './wms-layer-options.component.scss',
})
export class WmsLayerOptionsComponent {
  hasSublayers = false;
  sublayerHidden: { name: string; hidden: boolean }[] = [];
  sources: WmsSource[] = [];
  tileFormats: string[] = ['image/png'];
  custom_source?: MapSource;
  constructor(
    @Inject(MAT_DIALOG_DATA) public layer: WMSMapLayer,
    public dialogRef: MatDialogRef<WmsLayerOptionsComponent>,
    public i18n: I18NService,
    public mapState: ZsMapStateService,
    private wmsService: WmsService,
  ) {
    this.layer = layer = { ...layer };
    if (layer.attribution) {
      layer.attribution = layer.attribution.map((a) => [...a]);
    }
    if (layer.noneTiled === undefined) {
      layer.noneTiled = false;
    }
    if (layer.splitIntoSubLayers === undefined) {
      layer.splitIntoSubLayers = false;
    }
    if (layer.subLayersNames !== undefined && layer.subLayersNames.length > 0) {
      this.hasSublayers = true;
      this.sublayerHidden = layer.subLayersNames.map((sublayer) => {
        return { name: sublayer, hidden: layer.hiddenSubLayers?.includes(sublayer) ?? false };
      });
    }
    if (!layer.originalServerLayerName && layer.serverLayerName.indexOf(',') === -1) {
      layer.originalServerLayerName = layer.serverLayerName;
    }
    firstValueFrom(mapState.observeWmsSources$()).then((val) => {
      if (val) {
        this.sources = val;
        if (this.layer.type === 'wms_custom' && !this.sources.find((s) => s === layer.source)) {
          this.custom_source = layer.source;
        }
      }
    });
    if (layer.source) {
      wmsService.getTileFormats(layer.source as WmsSource).then((formats) => (this.tileFormats = formats));
    }
  }

  removeAttribution(index: number) {
    if (this.layer?.attribution && this.layer.attribution.length > index) {
      this.layer.attribution.splice(index, 1);
    }
  }

  addAttribution() {
    if (this.layer) {
      if (!this.layer.attribution) {
        this.layer.attribution = [];
      }
      this.layer.attribution.push(['', '']);
    }
  }

  changeType(event: MatRadioChange) {
    if (this.layer.type === event.value) {
      return;
    }
    if (event.value === 'wms_custom') {
      if (this.hasSublayers) {
        this.layer.serverLayerName = this.sublayerHidden
          .filter((sublayer) => !sublayer.hidden)
          .map((sublayer) => sublayer.name)
          .join(',');
      }
    } else if (event.value === 'wms') {
      if (this.hasSublayers) {
        const visibleLayers = this.layer.serverLayerName.split(',');
        this.sublayerHidden.forEach((sublayer) => (sublayer.hidden = !visibleLayers.includes(sublayer.name)));
      }
      if (this.layer.originalServerLayerName) {
        this.layer.serverLayerName = this.layer.originalServerLayerName;
      }
      if (this.custom_source) {
        this.layer.source = this.sources.find((s) => s.url === this.custom_source?.url);
        this.custom_source = undefined;
      }
    }
    this.layer.type = event.value;
  }

  async onSelectionChange($event: MatSelectChange) {
    if ($event.value === '_CUSTOM_') {
      if (this.layer.source) {
        this.custom_source = { url: this.layer.source?.url };
        this.layer.source = $event.value;
      }
    } else if ($event.value) {
      this.custom_source = undefined;
      this.layer.source = $event.value;
      this.tileFormats = await this.wmsService.getTileFormats($event.value);
    }
  }

  ok() {
    if (this.layer.type === 'wms') {
      if (this.hasSublayers) {
        this.layer.hiddenSubLayers = this.sublayerHidden.filter((sublayer) => sublayer.hidden).map((sublayer) => sublayer.name);
        if (this.layer.hiddenSubLayers.length === 0) {
          delete this.layer.hiddenSubLayers;
        }
      }
      delete this.layer.originalServerLayerName;
    } else if (this.layer.type === 'wms_custom') {
      if (this.hasSublayers) {
        const visibleLayers = this.layer.serverLayerName.split(',');
        this.layer.hiddenSubLayers = this.sublayerHidden
          .filter((sublayer) => !visibleLayers.includes(sublayer.name))
          .map((sublayer) => sublayer.name);
        if (this.layer.hiddenSubLayers.length === 0) {
          delete this.layer.hiddenSubLayers;
        }
      }
      if (this.custom_source) {
        this.layer.source = this.custom_source;
      }
    }
    if (!this.layer.noneTiled) {
      delete this.layer.noneTiled;
    }
    if (!this.layer.splitIntoSubLayers) {
      delete this.layer.splitIntoSubLayers;
    }
    this.dialogRef.close(this.layer);
  }
}
