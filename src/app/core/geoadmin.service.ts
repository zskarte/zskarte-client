import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { tap, Observable, of } from 'rxjs';
import { GeoFeatures } from './entity/geoFeature';

@Injectable({
  providedIn: 'root',
})
export class GeoadminService {
  private _featuresCache: GeoFeatures | undefined;
  private _legendCache: any;

  constructor(private http: HttpClient, public i18n: I18NService) {}

  getFeatures(): Observable<GeoFeatures> {
    if (this._featuresCache) {
      return of(this._featuresCache);
    }
    return this.http
      .get<GeoFeatures>(`https://api3.geo.admin.ch/rest/services/api/MapServer/layersConfig?lang=${this.i18n.locale}`)
      .pipe(tap((data) => (this._featuresCache = data)));
  }

  getLegend(layerId: string): Observable<any> {
    if (this._legendCache) {
      return of(this._legendCache);
    }

    return this.http
      .get(`https://api3.geo.admin.ch/rest/services/api/MapServer/${layerId}/legend?lang=` + this.i18n.locale, { responseType: 'text' })
      .pipe(tap((data) => (this._legendCache = data)));
  }

  queryPolygons(layerId: string, searchField: string, searchText: string): Promise<any[]> {
    return new Promise((resolve) =>
      this.http
        .get(
          `https://api3.geo.admin.ch/rest/services/api/MapServer/find?layer=${layerId}&searchField=${searchField}&searchText=${searchText}&geometryFormat=geojson&sr=3857`,
        )
        .subscribe((data) => {
          if (data && data['results']) {
            const features = [];
            for (const r of data['results']) {
              const geometry = r['geometry'];
              if (geometry['type'] && geometry['type'] === 'MultiPolygon') {
                const coordinates = geometry['coordinates'];
                const flatCoordinates = [];
                for (const polygon of coordinates) {
                  for (const polygonCoordinates of polygon) {
                    flatCoordinates.push(polygonCoordinates);
                  }
                }
                const feature = {
                  type: 'Feature',
                  geometry: { type: 'Polygon', coordinates: flatCoordinates },
                  properties: {
                    sig: {
                      type: 'Polygon',
                      src: null,
                      label: r.properties.label,
                    },
                    zindex: 0,
                  },
                };
                features.push(feature);
              }
            }
            resolve(features);
          }
        }),
    );
  }
}
