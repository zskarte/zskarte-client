import { Injectable, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { Observable, firstValueFrom, map, of, tap } from 'rxjs';
import { GeoAdminMapLayer, GeoAdminMapLayers } from './entity/map-layer-interface';
import OlTileGridWMTS from 'ol/tilegrid/WMTS';
import OlTileWMTS from 'ol/source/WMTS';
import { swissProjection } from '../helper/projections';
import { SessionService } from '../session/session.service';
import OlTileLayer from '../map-renderer/utils';
import TileWMS from 'ol/source/TileWMS';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class GeoadminService {
  private _layersCache: GeoAdminMapLayers | undefined;
  private _legendCache: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    public i18n: I18NService,
    private _session: SessionService,
    private domSanitizer: DomSanitizer,
  ) {}

  getLayers(): Observable<GeoAdminMapLayers> {
    if (this._layersCache) {
      return of(this._layersCache);
    }

    return this.http
      .get<GeoAdminMapLayers>(`https://api3.geo.admin.ch/rest/services/api/MapServer/layersConfig?lang=${this._session.getLocale()}`)
      .pipe(
        tap((data) => {
          Object.keys(data).forEach((key) => {
            data[key].opacity = data[key].opacity ?? data[key].background ? 1.0 : 0.75;
          });
        }),
        tap((data) => (this._layersCache = data)),
      );
  }

  getLegend(layerId: string): Observable<string> {
    if (this._legendCache.has(layerId)) {
      return of(this._legendCache.get(layerId) ?? '');
    }

    return this.http
      .get(`https://api3.geo.admin.ch/rest/services/api/MapServer/${layerId}/legend?lang=${this._session.getLocale()}`, {
        responseType: 'text',
      })
      .pipe(
        map((data) => this.domSanitizer.sanitize(SecurityContext.HTML, data) ?? ''),
        tap((data) => this._legendCache.set(layerId, data)),
      );
  }

  async createGeoAdminLayer(baseLayer: GeoAdminMapLayer) {
    //console.debug('createGeoAdminLayer:', baseLayer);
    let layerConfigs = [baseLayer];
    if (baseLayer.type === 'aggregate' && baseLayer.subLayersIds) {
      const allLayers = await firstValueFrom(this.getLayers());
      layerConfigs = baseLayer.subLayersIds.map((id) => allLayers[id]);
    }
    // @ts-expect-error "we know the type is correct"
    const layers: OlTileLayer[] = [];
    layerConfigs.forEach((layerConf) => {
      let attributionHtml: string | undefined;
      if (layerConf.attribution) {
        const name = this.domSanitizer.sanitize(SecurityContext.HTML, layerConf.attribution) ?? '';
        if (layerConf.attributionUrl) {
          let url = this.domSanitizer.sanitize(SecurityContext.URL, layerConf.attributionUrl) ?? '';
          //prevent escape the href attribute
          url = url.replace(/"/g, '&quot;');
          attributionHtml = `<a target="_blank" href="${url}">${name}</a>`;
        } else {
          attributionHtml = name;
        }
      }
      if (layerConf.type === 'wmts') {
        //if (layerConf.timeEnabled) //=> possible different values in timestamps, make selectable?
        const timestamp = layerConf?.timestamps ? layerConf.timestamps[0] : 'current';
        const extension = layerConf.format;
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
              layer: layerConf.serverLayerName,
              requestEncoding: 'REST',
              style: '',
              matrixSet: '',
              crossOrigin: 'anonymous',
              attributions: attributionHtml,
            }),
            opacity: layerConf.opacity,
            minResolution: layerConf.minResolution ?? undefined,
            maxResolution: layerConf.maxResolution ?? undefined,
            zIndex: layerConf.zIndex,
          }),
        );
      } else if (layerConf.type === 'wms') {
        layers.push(
          new OlTileLayer({
            source: new TileWMS({
              projection: swissProjection, //use same projection as view to make gutter work
              url: layerConf.wmsUrl,
              params: { LAYERS: layerConf.wmsLayers, TILED: true },
              serverType: 'geoserver', //'mapserver'
              transition: 0,
              crossOrigin: 'anonymous',
              attributions: attributionHtml,
              //gutter does not work correct e.g. for 'ch.kantone.cadastralwebmap-farbe'
              //gutter: 12, //prevent cutted layers on image boundaries => need to use same projection for tile as for view!
            }),
            opacity: layerConf?.opacity ?? layerConf.background ? 1.0 : 0.75,
            minResolution: layerConf.minResolution ?? undefined,
            maxResolution: layerConf.maxResolution ?? undefined,
            zIndex: layerConf.zIndex,
          }),
        );
      } else if (layerConf.type === 'geojson') {
        console.error('currently cannot handle geojson map layers:', layerConf);
      } else {
        console.error('unknown layer.type:', layerConf.type, layerConf, baseLayer !== layerConf ? baseLayer : '');
      }
    });
    return layers;
  }
}
