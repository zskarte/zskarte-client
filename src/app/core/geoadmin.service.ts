import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { Observable, of, tap } from 'rxjs';
import { GeoFeatures } from './entity/geoFeature';
import OlTileGridWMTS from 'ol/tilegrid/WMTS';
import OlTileWMTS from 'ol/source/WMTS';
import { swissProjection } from '../helper/projections';
import { SessionService } from '../session/session.service';
import OlTileLayer from 'ol/layer/Tile';

@Injectable({
  providedIn: 'root',
})
export class GeoadminService {
  private _featuresCache: GeoFeatures | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _legendCache: any;

  constructor(
    private http: HttpClient,
    public i18n: I18NService,
    private _session: SessionService,
  ) {}

  getFeatures(): Observable<GeoFeatures> {
    if (this._featuresCache) {
      return of(this._featuresCache);
    }

    return this.http
      .get<GeoFeatures>(`https://api3.geo.admin.ch/rest/services/api/MapServer/layersConfig?lang=${this._session.getLocale()}`)
      .pipe(tap((data) => (this._featuresCache = data)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLegend(layerId: string): Observable<any> {
    if (this._legendCache) {
      return of(this._legendCache);
    }

    return this.http
      .get(`https://api3.geo.admin.ch/rest/services/api/MapServer/${layerId}/legend?lang=${this._session.getLocale()}`, {
        responseType: 'text',
      })
      .pipe(tap((data) => (this._legendCache = data)));
  }

  // skipcq: JS-0105
  createGeoAdminLayer(layerId: string, timestamp: string, extension: string, zIndex: number) {
    return new OlTileLayer({
      source: new OlTileWMTS({
        projection: swissProjection,
        url: `https://wmts.geo.admin.ch/1.0.0/{Layer}/default/${timestamp}/2056/{TileMatrix}/{TileCol}/{TileRow}.${extension}`,
        tileGrid: new OlTileGridWMTS({
          origin: [swissProjection.getExtent()[0], swissProjection.getExtent()[3]],
          resolutions: swissProjection.resolutions,
          matrixIds: swissProjection.matrixIds,
        }),
        layer: layerId,
        requestEncoding: 'REST',
        style: '',
        matrixSet: '',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.6,
      zIndex,
    });
  }
}
