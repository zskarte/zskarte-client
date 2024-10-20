import { Injectable } from '@angular/core';
import { GeoJSONMapLayer, CsvMapLayer } from '../map-layer-interface';
import { Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { Geometry, LineString, Point } from 'ol/geom';
import { Extent, containsExtent, getCenter } from 'ol/extent';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { mercatorProjection, swissProjection } from '../../helper/projections';
import { MapLayerService } from '../map-layer.service';
import { stylefunction } from 'ol-mapbox-style';
import { StyleLike } from 'ol/style/Style';
import { IZsMapSearchResult } from '../../state/interfaces';
import { transformExtent, transform } from 'ol/proj';
import { inferSchema, initParser, SchemaColumnType } from 'udsv';
import { LocalMapLayerMeta } from 'src/app/db/db';
import { BlobService } from 'src/app/db/blob.service';

const NumberSortCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
@Injectable({
  providedIn: 'root',
})
export class GeoJSONService {
  private _searchRegExPatternsCache: Map<string, RegExp[]> = new Map();
  constructor(private _mapLayerService: MapLayerService) {}

  public invalidateCache(url: string) {
    this._searchRegExPatternsCache.delete(url);
  }

  static async fetchGeoJSONData(layer: GeoJSONMapLayer & LocalMapLayerMeta) {
    if (!layer.source) {
      return [];
    }
    let url = layer.source?.url;
    if (layer.sourceBlobId) {
      url = await BlobService.getBlobOrRealUrl(url, layer.sourceBlobId);
    }
    return fetch(url)
      .then((response) => response.json())
      .then((geojsonObject) => {
        if (mercatorProjection) {
          const swissExtentMercatorProjection = transformExtent(swissProjection.getExtent(), swissProjection, mercatorProjection);
          const features = (
            new GeoJSON().readFeatures(geojsonObject, {
              //dataProjection: swissProjection,
              featureProjection: mercatorProjection,
              //featureClass not set to RenderFeature in GeoJSON constructor so it's Feature for sure
            }) as Feature[]
          ).filter((f) => {
            //filter data not in swiss extent (e.g. invalid coors 0,0)
            const extent = f.getGeometry()?.getExtent();
            return extent && containsExtent(swissExtentMercatorProjection, extent);
          });
          return features;
        }
        return [];
      });
  }

  static async fetchCsvData(layer: CsvMapLayer & LocalMapLayerMeta) {
    if (!layer.source) {
      return [];
    }

    const regexPatterns = layer.filterRegExPattern?.map((re) => ({
      field: re[0],
      regex: new RegExp(`^${re[1]}$`, re[2]),
    }));

    let url = layer.source?.url;
    if (layer.sourceBlobId) {
      url = await BlobService.getBlobOrRealUrl(url, layer.sourceBlobId);
    }
    return fetch(url)
      .then((response) => response.text())
      .then((csvContent) => {
        //force defined delimiter
        const schema = inferSchema(csvContent, { col: layer.delimiter });
        //force number type for coord fields
        schema.cols.filter((c) => c.name === layer.fieldX || c.name === layer.fieldY).forEach((c) => (c.type = SchemaColumnType.Number));
        const parser = initParser(schema);
        const csvLines = parser.typedObjs(csvContent, (rows, append) => {
          rows = rows.filter((row) => {
            if (isNaN(row[layer.fieldX]) || isNaN(row[layer.fieldY]) || (row[layer.fieldX] === 0 && row[layer.fieldY] === 0)) {
              return false;
            }
            if (regexPatterns?.length) {
              const matches = regexPatterns
                .map((pattern) => row[pattern.field].match(pattern.regex))
                .filter((match) => match) as RegExpMatchArray[];
              if (!matches || matches.length !== regexPatterns.length) {
                return false;
              }
            }
            return true;
          });
          append(rows);
        });

        if (csvLines?.length && mercatorProjection) {
          let insideExtent: Extent;
          if (layer.extent) {
            insideExtent = transformExtent(layer.extent, layer.dataProjection, mercatorProjection);
          } else {
            insideExtent = transformExtent(swissProjection.getExtent(), swissProjection, mercatorProjection);
          }
          const destProjection = mercatorProjection;
          const features = csvLines
            .map(
              (csvLine) =>
                new Feature({
                  ...csvLine,
                  geometry: new Point(transform([csvLine[layer.fieldX], csvLine[layer.fieldY]], layer.dataProjection, destProjection)),
                }),
            )
            .filter((f) => {
              //filter data not in desired extent
              const extent = f.getGeometry()?.getExtent();
              return extent && containsExtent(insideExtent, extent);
            });
          return features;
        }
        return [];
      });
  }

  async createGeoJSONLayer(layer: GeoJSONMapLayer) {
    try {
      const features = await GeoJSONService.fetchGeoJSONData(layer);
      return this.createLayerForFeatures(layer, features);
    } catch (err) {
      console.error('Error on creating GeoJSON Layer', layer, err);
      return [];
    }
  }

  async createCsvLayer(layer: CsvMapLayer) {
    try {
      const features = await GeoJSONService.fetchCsvData(layer);
      return this.createLayerForFeatures(layer, features);
    } catch (err) {
      console.error('Error on creating Csv Layer', layer, err);
      return [];
    }
  }

  async createLayerForFeatures(
    layer: (GeoJSONMapLayer | CsvMapLayer) & LocalMapLayerMeta,
    features: Feature[],
  ): Promise<VectorLayer<VectorSource<Feature>>[]> {
    if (!layer.source) {
      return [];
    }
    const olSource = new VectorSource({
      attributions: this._mapLayerService.createAttributionFromArray(layer.attribution) ?? undefined,
    });
    const olLayer: VectorLayer<VectorSource> = new VectorLayer({
      source: olSource,
      maxZoom: MapLayerService.scaleDominatorToZoom(layer.MinScaleDenominator),
      minZoom: MapLayerService.scaleDominatorToZoom(layer.MaxScaleDenominator),
      opacity: layer.opacity,
      zIndex: layer.zIndex,
    });

    if (features?.length) {
      olSource.addFeatures(features);
    }
    let styleJson: StyleLike | null;
    if (layer.styleSourceType === 'url' && layer.styleUrl) {
      let url = layer.styleUrl;
      if (layer.styleBlobId) {
        url = await BlobService.getBlobOrRealUrl(url, layer.styleBlobId);
      }
      styleJson = await fetch(url).then((response) => response.json());
    } else {
      styleJson = layer.styleText ? JSON.parse(layer.styleText) : null;
    }
    if (layer.styleFormat === 'mapbox') {
      olLayer.setStyle(stylefunction(olLayer, styleJson, layer.styleSourceName ?? ''));
    } else if (!styleJson) {
      olLayer.setStyle();
    } else {
      olLayer.setStyle(styleJson);
    }

    return [olLayer];
  }

  private static getValue(obj, field) {
    if (typeof field === 'string') field = field.split('.');
    if (field.length === 1) return obj[field[0]];
    else if (field.length === 0) return obj;
    else return GeoJSONService.getValue(obj[field[0]], field.slice(1));
  }

  private static renderString(str, obj) {
    return str.replace(/\$\{.+?\}/g, (match) => {
      return GeoJSONService.getValue(obj, match.substring(2, match.length - 1));
    });
  }

  public search(searchText: string, layer: GeoJSONMapLayer, features: Feature<Geometry>[], maxResultCount?: number): IZsMapSearchResult[] {
    if (searchText.length < 3 || !layer.source?.url || !layer.searchRegExPatterns) {
      return [];
    }
    const url = layer.source.url;
    let regexPatterns = this._searchRegExPatternsCache.get(url);
    if (!regexPatterns) {
      regexPatterns = layer.searchRegExPatterns
        .map((re) => {
          try {
            return new RegExp(`^${re[0]}$`, re[1]);
          } catch (ex) {
            console.error(`error on create RegExp for "${re[0]}","${re[1]}", error was:`, ex);
            return undefined;
          }
        })
        .filter((re) => Boolean(re)) as RegExp[];
      this._searchRegExPatternsCache.set(url, regexPatterns);
    }
    searchText = searchText.toLowerCase();
    const matches = regexPatterns.map((pattern: RegExp) => searchText.match(pattern)).filter((match) => match) as RegExpMatchArray[];
    if (!matches || matches.length === 0) {
      return [];
    }
    const searchFields = [
      ...new Set([
        ...matches.flatMap((match) => (match.groups ? Object.keys(match.groups) : [])),
        ...(layer.searchResultGroupingFilterFields ?? []),
      ]),
    ];

    maxResultCount = maxResultCount ?? 50;
    const labels = {};
    const result: IZsMapSearchResult[] = [];
    const resultGroups = {};
    resultGroups['__count__'] = 0;
    resultGroups['__sum__'] = 0;
    let resultCount = 0;
    for (const feature of features) {
      const params = feature.getProperties();
      const filteredParams = {};
      searchFields.forEach((key) => {
        if (typeof params[key] === 'string') {
          filteredParams[key] = params[key].toLowerCase();
        } else if (typeof params[key] === 'number') {
          filteredParams[key] = params[key].toString();
        } else {
          filteredParams[key] = '';
        }
      });
      const valid = matches.find((match: RegExpMatchArray) => {
        if (match.groups) {
          const groups = match.groups;
          //verify all match groups are part of params
          const notMatch = Object.keys(groups).filter((key) => {
            return !filteredParams[key] || filteredParams[key].indexOf(groups[key]) === -1;
          });
          return notMatch.length === 0;
        }
        return false;
      });
      if (!valid) {
        continue;
      }

      let coords: Coordinate = [];
      const geometryType = feature.getGeometry()?.getType();
      if (geometryType === 'Point') {
        coords = (feature.getGeometry() as Point).getCoordinates();
      } else if (geometryType === 'LineString') {
        coords = (feature.getGeometry() as LineString).getCoordinateAt(0.5);
      } else {
        const extent = feature.getGeometry()?.getExtent();
        if (!extent) {
          continue;
        }
        coords = getCenter(extent);
      }
      const label = GeoJSONService.renderString(layer.searchResultLabelMask, params);
      //only keep first if same label
      if (labels[label]) {
        continue;
      }
      labels[label] = true;
      const info: IZsMapSearchResult = {
        label,
        mercatorCoordinates: coords,
        feature,
      };
      resultCount++;
      if (layer.searchResultGroupingFilterFields?.length) {
        const innerGroup = GeoJSONService.getInnerGroup(resultGroups, 0, filteredParams, layer.searchResultGroupingFilterFields);
        innerGroup.push(info);
        if (resultCount >= 5000 || resultGroups['__count__'] >= maxResultCount) {
          break;
        }
      } else {
        result.push(info);
        if (resultCount >= maxResultCount) {
          break;
        }
      }
    }
    if (layer.searchResultGroupingFilterFields?.length) {
      GeoJSONService.flatFilterResultGroups(resultGroups, 0, maxResultCount, result, layer.searchResultGroupingFilterFields);
    }
    result.sort((a, b) => NumberSortCollator.compare(a.label, b.label));
    return result;
  }

  static getInnerGroup(currentGroup, layer: number, filteredParams, searchResultGroupingFilterFields: string[]) {
    const key = searchResultGroupingFilterFields[layer];
    const val = filteredParams[key];
    if (layer < searchResultGroupingFilterFields.length - 1) {
      if (!currentGroup[val]) {
        currentGroup['__count__']++;
        currentGroup['__sum__']++;
        currentGroup[val] = {};
        currentGroup[val]['__count__'] = 0;
        currentGroup[val]['__sum__'] = 0;
      } else {
        currentGroup['__sum__']++;
      }
      return GeoJSONService.getInnerGroup(currentGroup[val], layer + 1, filteredParams, searchResultGroupingFilterFields);
    } else {
      if (!currentGroup[val]) {
        currentGroup['__count__']++;
        currentGroup[val] = [];
      }
      currentGroup['__sum__']++;
      return currentGroup[val];
    }
  }

  static flatFilterResultGroups(
    currentGroup,
    layer: number,
    maxCount: number,
    data: IZsMapSearchResult[],
    searchResultGroupingFilterFields: string[],
  ) {
    if (layer <= searchResultGroupingFilterFields.length - 1) {
      const keys = Object.keys(currentGroup);
      keys.splice(keys.indexOf('__count__'), 1);
      keys.splice(keys.indexOf('__sum__'), 1);
      if (currentGroup['__count__'] > 10) {
        maxCount = 1;
      } else if (currentGroup['__count__'] > 1) {
        maxCount = Math.max(1, Math.floor(maxCount / currentGroup['__count__']));
      }
      keys.forEach((key) => {
        GeoJSONService.flatFilterResultGroups(currentGroup[key], layer + 1, maxCount, data, searchResultGroupingFilterFields);
      });
    } else {
      if (currentGroup.length > 1) {
        currentGroup.sort((a, b) => NumberSortCollator.compare(a.label, b.label));
      }
      if (maxCount === 1) {
        data.push(currentGroup[0]);
      } else {
        Array.prototype.push.call(data, ...currentGroup.slice(0, maxCount));
      }
    }
  }
}
