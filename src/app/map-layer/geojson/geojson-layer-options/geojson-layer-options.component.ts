import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../../../state/i18n.service';
import { GeoJSONMapLayer, WmsSource } from '../../map-layer-interface';
import { ZsMapStateService } from '../../../state/state.service';
import { GeoJSONService } from '../geojson.service';
import { NgModel } from '@angular/forms';

@Component({
  selector: 'app-geojson-layer-options',
  templateUrl: './geojson-layer-options.component.html',
  styleUrl: './geojson-layer-options.component.scss',
})
export class GeoJSONLayerOptionsComponent {
  sourceUrl = '';
  constructor(
    @Inject(MAT_DIALOG_DATA) public layer: GeoJSONMapLayer,
    public dialogRef: MatDialogRef<GeoJSONLayerOptionsComponent>,
    public i18n: I18NService,
    public mapState: ZsMapStateService,
    private geoJSONService: GeoJSONService,
  ) {
    this.layer = layer = { ...layer };
    if (layer.attribution) {
      layer.attribution = layer.attribution.map((a) => [...a]);
    }
    if (layer.searchRegExPatterns) {
      layer.searchRegExPatterns = layer.searchRegExPatterns.map((a) => [...a]);
    }
    if (layer.searchResultGroupingFilterFields) {
      layer.searchResultGroupingFilterFields = [...layer.searchResultGroupingFilterFields];
    }

    if (this.layer.source) {
      this.sourceUrl = this.layer.source.url;
    }
    if (this.layer.styleSourceType === undefined) {
      this.layer.styleSourceType = 'url';
    }
    if (this.layer.styleFormat === undefined) {
      this.layer.styleFormat = 'mapbox';
    }
    if (this.layer.searchable === undefined) {
      this.layer.searchable = false;
    }
  }

  removePattern(index: number) {
    if (this.layer?.searchRegExPatterns && this.layer.searchRegExPatterns.length > index) {
      this.layer.searchRegExPatterns.splice(index, 1);
    }
  }

  addPattern() {
    if (this.layer) {
      if (!this.layer.searchRegExPatterns) {
        this.layer.searchRegExPatterns = [];
      }
      this.layer.searchRegExPatterns.push(['', 'u']);
    }
  }

  // skipcq:  JS-0105
  deferredRevalidate(validInfo: NgModel) {
    setTimeout(() => validInfo.control.updateValueAndValidity(), 250);
  }

  removeField(index: number) {
    if (this.layer?.searchResultGroupingFilterFields && this.layer.searchResultGroupingFilterFields.length > index) {
      this.layer.searchResultGroupingFilterFields.splice(index, 1);
    }
  }

  addField() {
    if (this.layer) {
      if (!this.layer.searchResultGroupingFilterFields) {
        this.layer.searchResultGroupingFilterFields = [];
      }
      this.layer.searchResultGroupingFilterFields.push('');
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

  ok() {
    if (!this.layer.searchable) {
      delete this.layer.searchable;
    }
    this.layer.source = { url: this.sourceUrl } as WmsSource;
    if (this.layer.source?.url) {
      this.geoJSONService.invalidateCache(this.layer.source.url);
    }
    this.dialogRef.close(this.layer);
  }
}
