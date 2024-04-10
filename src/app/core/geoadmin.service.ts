import { Injectable, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { Observable, firstValueFrom, map, of, tap } from 'rxjs';
import { GeoFeature, GeoFeatures } from './entity/geoFeature';
import OlTileGridWMTS from 'ol/tilegrid/WMTS';
import OlTileWMTS from 'ol/source/WMTS';
import { swissProjection } from '../helper/projections';
import { SessionService } from '../session/session.service';
import OlTileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class GeoadminService {
  private _featuresCache: GeoFeatures | undefined;
  private _legendCache: { [key: string]: string } = {};

  constructor(
    private http: HttpClient,
    public i18n: I18NService,
    private _session: SessionService,
    private domSanitizer: DomSanitizer,
  ) {}

  getFeatures(): Observable<GeoFeatures> {
    if (this._featuresCache) {
      return of(this._featuresCache);
    }

    return this.http
      .get<GeoFeatures>(`https://api3.geo.admin.ch/rest/services/api/MapServer/layersConfig?lang=${this._session.getLocale()}`)
      .pipe(
        tap((data) => {
          Object.keys(data).forEach((key) => {
            data[key].opacity = data[key].opacity ?? data[key].background ? 1.0 : 0.75;
          });
        }),
        tap((data) => (this._featuresCache = data)),
      );
  }

  getLegend(layerId: string): Observable<string> {
    if (layerId in this._legendCache) {
      return of(this._legendCache[layerId]);
    }

    return this.http
      .get(`https://api3.geo.admin.ch/rest/services/api/MapServer/${layerId}/legend?lang=${this._session.getLocale()}`, {
        responseType: 'text',
      })
      .pipe(
        map((data) => this.domSanitizer.sanitize(SecurityContext.HTML, data) ?? ''),
        tap((data) => (this._legendCache[layerId] = data)),
      );
  }

  async createGeoAdminLayer(baseFeature: GeoFeature) {
    //console.debug('createGeoAdminLayer:', baseFeature);
    let features = [baseFeature];
    if (baseFeature.type === 'aggregate' && baseFeature.subLayersIds) {
      const allFeatures = await firstValueFrom(this.getFeatures());
      features = baseFeature.subLayersIds.map((id) => allFeatures[id]);
    }
    const layers: OlTileLayer<OlTileWMTS | TileWMS>[] = [];
    features.forEach((feature) => {
      let attributionHtml: string | undefined;
      if (feature.attribution) {
        const name = this.domSanitizer.sanitize(SecurityContext.HTML, feature.attribution) ?? '';
        if (feature.attributionUrl) {
          let url = this.domSanitizer.sanitize(SecurityContext.URL, feature.attributionUrl) ?? '';
          //prevent escape the href attribute
          url = url?.replace(/"/g, '&quot;');
          attributionHtml = `<a target="_blank" href="${url}">${name}</a>`;
        } else {
          attributionHtml = name;
        }
      }
      if (feature.type === 'wmts') {
        //if (feature.timeEnabled) //=> possible different values in timestamps, make selectable?
        const timestamp = feature?.timestamps ? feature.timestamps[0] : 'current';
        const extension = feature.format;
        layers.push(
          new OlTileLayer({
            source: new OlTileWMTS({
              projection: swissProjection,
              url: `https://wmts.geo.admin.ch/1.0.0/{Layer}/default/${timestamp}/2056/{TileMatrix}/{TileCol}/{TileRow}.${extension}`,
              tileGrid: new OlTileGridWMTS({
                origin: [swissProjection.getExtent()[0], swissProjection.getExtent()[3]],
                resolutions: swissProjection.resolutions,
                matrixIds: swissProjection.matrixIds,
              }),
              layer: feature.serverLayerName,
              requestEncoding: 'REST',
              style: '',
              matrixSet: '',
              crossOrigin: 'anonymous',
              attributions: attributionHtml,
            }),
            opacity: feature.opacity,
            minResolution: feature.minResolution ?? undefined,
            maxResolution: feature.maxResolution ?? undefined,
            zIndex: feature.zIndex,
          }),
        );
      } else if (feature.type === 'wms') {
        layers.push(
          new OlTileLayer({
            source: new TileWMS({
              projection: swissProjection,
              url: feature.wmsUrl,
              params: { LAYERS: feature.wmsLayers, TILED: true },
              serverType: 'geoserver', //'mapserver'
              transition: 0,
              crossOrigin: 'anonymous',
              attributions: attributionHtml,
            }),
            opacity: feature?.opacity ?? feature.background ? 1.0 : 0.75,
            minResolution: feature.minResolution ?? undefined,
            maxResolution: feature.maxResolution ?? undefined,
            zIndex: feature.zIndex,
          }),
        );
      } else {
        console.error('unknown feature.type:', feature.type, feature, baseFeature !== feature ? baseFeature : '');
      }
    });
    return layers;
  }
}
