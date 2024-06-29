import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Coordinate } from 'ol/coordinate';
import {
  MapLayerOptionsApi,
  MapLayerApi,
  WmsSource,
  MapLayerSourceApi,
  MapSource,
  MapLayer,
  MapLayerAllFields,
  GeoJSONMapLayer,
} from './map-layer-interface';
import { LOG2_ZOOM_0_RESOLUTION, DEFAULT_RESOLUTION } from '../session/default-map-values';
import { ApiResponse, ApiService } from '../api/api.service';
import { getPropertyDifferences } from '../helper/diff';
import TileGrid, { Options as TileGridOptions } from 'ol/tilegrid/TileGrid';
import { LocalMapLayer, LocalMapLayerMeta, db } from '../db/db';
import { IZsMapOrganizationMapLayerSettings } from '../session/operations/operation.interfaces';
import { BlobService } from '../db/blob.service';

@Injectable({
  providedIn: 'root',
})
export class MapLayerService {
  constructor(
    private _domSanitizer: DomSanitizer,
    private _api: ApiService,
    private _blobService: BlobService,
  ) {}

  public sanitizeHTML(html: string) {
    return this._domSanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  public sanitizeURLAttribute(url: string) {
    const result = this._domSanitizer.sanitize(SecurityContext.URL, url) ?? '';
    //prevent escape the href attribute
    return result.replace(/"/g, '&quot;');
  }

  createAttributionFromArray(attribution: [string, string][] | undefined) {
    if (attribution && attribution.length > 0) {
      return attribution.map((attr) => {
        const title = this.sanitizeHTML(attr[0]);
        if (attr[1]) {
          const url = this.sanitizeURLAttribute(attr[1]);
          return `<a target="_blank" href="${url}">${title}</a>`;
        } else {
          return title;
        }
      });
    }
    return null;
  }

  static getScaledTileGridInfos(grid: TileGrid, scaling = 1) {
    if (scaling === 1) {
      return null;
    }
    const resolutions = grid.getResolutions().slice(); // take a copy
    const origins: Coordinate[] = [];
    const tileSizes: Array<number | Array<number>> = [];
    for (let i = 0; i < resolutions.length; i++) {
      origins[i] = grid.getOrigin(i);
      tileSizes[i] = grid.getTileSize(i);
      if (!Array.isArray(tileSizes[i])) {
        // @ts-expect-error "it's not a number[], checked the line above..."
        tileSizes[i] = [tileSizes[i], tileSizes[i]];
      }
      tileSizes[i][0] = tileSizes[i][0] * scaling;
      tileSizes[i][1] = tileSizes[i][1] * scaling;
      resolutions[i] = resolutions[i] / scaling;
    }
    return {
      extent: grid.getExtent(),
      resolutions,
      tileSizes,
      origins,
    } as TileGridOptions;
  }

  public static scaleDominatorToZoom(scaleDenominator: number | undefined) {
    if (scaleDenominator === undefined) {
      return undefined;
    }
    //no idea why the * 0.97 is required to make value match more accurate
    return (LOG2_ZOOM_0_RESOLUTION - Math.log2(scaleDenominator / DEFAULT_RESOLUTION)) * 0.97;
  }

  static getMapSource(layerSource: MapLayerSourceApi, sources: (WmsSource | MapSource)[]) {
    let source: WmsSource | MapSource | undefined;
    if (Number.isFinite(layerSource.wms_source)) {
      source = sources.find((source) => source.id === layerSource.wms_source);
    } else if (layerSource.wms_source instanceof Object && layerSource.wms_source.id) {
      const sourceId = layerSource.wms_source.id;
      source = sources.find((source) => source.id === sourceId);
    } else if (layerSource.custom_source) {
      source = { url: layerSource.custom_source };
    }
    return source;
  }

  static convertMapLayerFromApi(mapLayerApi: MapLayerApi, sources: (WmsSource | MapSource)[], organizationId: number) {
    const source = MapLayerService.getMapSource(mapLayerApi, sources);
    const layer: MapLayer = {
      id: mapLayerApi.id,
      label: mapLayerApi.label,
      serverLayerName: mapLayerApi.serverLayerName,
      type: mapLayerApi.type,
      public: mapLayerApi.public,
      source,
      ...mapLayerApi.options,
      opacity: mapLayerApi.options.opacity ?? 0.75,
      owner: false,
      fullId: `${source?.url}|${mapLayerApi.serverLayerName}|${mapLayerApi.id}`,
      hidden: false,
      zIndex: 0,
    };
    layer.owner = mapLayerApi.organization?.id === organizationId;
    return layer;
  }

  async readGlobalMapLayers(sources: WmsSource[], organizationId: number) {
    const { error, result: mapLayers } = await this._api.get<MapLayerApi[]>('/api/map-layers');
    if (error || !mapLayers) {
      return [];
    }
    return mapLayers.map((layer) => MapLayerService.convertMapLayerFromApi(layer, sources, organizationId));
  }

  static convertMapLayerToApi(mapLayer: MapLayer & LocalMapLayerMeta): MapLayerApi {
    const cleanedOptions: MapLayerAllFields & LocalMapLayerMeta = { ...mapLayer };
    // delete values for main object / from PresistedSettings
    delete cleanedOptions.id;
    delete cleanedOptions.owner;
    delete cleanedOptions.public;
    // delete values for main object & from MapLayerGeneralSettings
    delete cleanedOptions.label;
    delete cleanedOptions.serverLayerName;
    delete cleanedOptions.type;
    // delete values for main object & from MapLayer
    delete cleanedOptions.source;
    delete cleanedOptions.fullId;
    delete cleanedOptions.offlineAvailable;
    // delete display specific values / from SelectedMapLayerSettings
    delete cleanedOptions.deleted;
    delete cleanedOptions.zIndex;
    // delete local cache specific values / from LocalMapLayerMeta
    delete cleanedOptions.sourceBlobId;
    delete cleanedOptions.styleBlobId;
    const options: MapLayerOptionsApi = cleanedOptions;
    return {
      id: mapLayer.id,
      public: mapLayer.public,
      label: mapLayer.label,
      serverLayerName: mapLayer.serverLayerName,
      type: mapLayer.type,
      wms_source: mapLayer.source?.id,
      custom_source: !mapLayer.source?.id ? mapLayer.source?.url : undefined,
      options,
    };
  }

  async saveGlobalMapLayer(mapLayer: MapLayer, organizationId: number | undefined) {
    if (!mapLayer.owner) {
      return null;
    }
    if (!organizationId) {
      return this.saveLocalMapLayer(mapLayer);
    }
    let response: ApiResponse<MapLayerApi>;
    const layerApi = MapLayerService.convertMapLayerToApi(mapLayer);
    if (mapLayer.id) {
      response = await this._api.put(`/api/map-layers/${mapLayer.id}`, {
        data: { ...layerApi, organization: organizationId },
      });
    } else {
      response = await this._api.post('/api/map-layers', { data: { ...layerApi, organization: organizationId } });
    }
    const { error, result } = response;
    if (error) {
      console.error('saveGlobalMapLayer', error);
    } else if (result) {
      const mapped = MapLayerService.convertMapLayerFromApi(result, mapLayer.source ? [mapLayer.source] : [], organizationId);
      mapped.source = mapLayer.source;
      mapped.owner = mapLayer.owner;
      mapped.fullId = `${mapped?.source?.url}|${mapped.serverLayerName}|${mapped.id}`;
      return mapped;
    }
    return null;
  }

  public async saveLocalMapLayer(mapLayer: MapLayer, downloadMissingBlobs = true) {
    if (!mapLayer.id) {
      const minId = Math.min(0, ...(await db.localMapLayer.toArray()).map((o) => o.id ?? 0));
      mapLayer.id = minId - 1;
      mapLayer.fullId = `${mapLayer.source?.url}|${mapLayer.serverLayerName}|${mapLayer.id}`;
    }
    const localMapLayer = mapLayer as LocalMapLayer;
    await db.localMapLayer.put(localMapLayer);
    if ((mapLayer.type === 'geojson' || mapLayer.type === 'csv') && downloadMissingBlobs) {
      const geoMapLayer = mapLayer as GeoJSONMapLayer;
      let sourceDownloaded = await BlobService.isDownloaded(localMapLayer.sourceBlobId);
      if (geoMapLayer.source?.url && !sourceDownloaded) {
        const localBlobMeta = await this._blobService.downloadBlob(geoMapLayer.source.url, localMapLayer.sourceBlobId);
        localMapLayer.sourceBlobId = localBlobMeta.id;
        await db.localMapLayer.put(localMapLayer);
        sourceDownloaded = localBlobMeta.blobState === 'downloaded';
      }
      let styleDownloaded: boolean;
      if (geoMapLayer.styleSourceType === 'url' && geoMapLayer.styleUrl) {
        styleDownloaded = await BlobService.isDownloaded(localMapLayer.styleBlobId);
        if (!styleDownloaded) {
          const localBlobMeta = await this._blobService.downloadBlob(geoMapLayer.styleUrl, localMapLayer.styleBlobId);
          localMapLayer.styleBlobId = localBlobMeta.id;
          await db.localMapLayer.put(localMapLayer);
          styleDownloaded = localBlobMeta.blobState === 'downloaded';
        }
      } else {
        localMapLayer.styleBlobId = undefined;
        await db.localMapLayer.put(localMapLayer);
        styleDownloaded = true;
      }
      localMapLayer.offlineAvailable = sourceDownloaded && styleDownloaded;
      await db.localMapLayer.put(localMapLayer);
    }
    return mapLayer;
  }

  public static getLocalMapLayers() {
    return db.localMapLayer.toArray();
  }

  public static async saveLocalWmsSource(wmsSource: WmsSource) {
    if (!wmsSource.id) {
      const minId = Math.min(0, ...(await db.localWmsSource.toArray()).map((o) => o.id ?? 0));
      wmsSource.id = minId - 1;
    }
    await db.localWmsSource.put(wmsSource);
  }

  public static getLocalWmsSources() {
    return db.localWmsSource.toArray();
  }

  public static async saveLocalMapLayerSettings(data: IZsMapOrganizationMapLayerSettings) {
    await db.localMapLayerSettings.put({ ...data, id: 'local' });
  }

  public static async loadLocalMapLayerSettings() {
    return await db.localMapLayerSettings.get('local');
  }

  static extractMapLayerDiffs(mapLayer: MapLayer, allLayers: MapLayer[]) {
    let reducedFeature: Partial<MapLayer> & MapLayerSourceApi;
    if (!mapLayer.source || mapLayer.type === 'wmts') {
      //no detail comparison for GeoAdmin and WMTS layers needed
      reducedFeature = {
        serverLayerName: mapLayer.serverLayerName,
        opacity: mapLayer.opacity,
        hidden: mapLayer.hidden,
        zIndex: mapLayer.zIndex,
        source: mapLayer.source,
      };
    } else {
      const defaultLayer = allLayers.find((g) => g.fullId === mapLayer.fullId);
      if (defaultLayer) {
        reducedFeature = getPropertyDifferences(defaultLayer, mapLayer, ['id', 'serverLayerName', 'source'], { source: ['id', 'url'] });
      } else {
        reducedFeature = { ...mapLayer };
      }
      delete reducedFeature.deleted;
    }
    if (reducedFeature.source?.id) {
      reducedFeature.wms_source = reducedFeature.source.id;
    } else if (reducedFeature.source?.url) {
      reducedFeature.custom_source = reducedFeature.source.url;
    }
    delete reducedFeature.source;
    return reducedFeature;
  }
}
