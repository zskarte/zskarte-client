import { Injectable } from '@angular/core';
import { Observable, from, of, tap } from 'rxjs';
import { Coordinate } from 'ol/coordinate';
import { mercatorProjection, swissProjection } from '../../helper/projections';
import { MapLayer, WMSMapLayer, WmsSource, WmsSourceApi } from '../map-layer-interface';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import OlTileWMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMSCapabilities from 'ol/format/WMSCapabilities';
import { ServerType, DEFAULT_VERSION as WMS_DEFAULT_VERSION, getLegendUrl } from 'ol/source/wms';
import TileWMS from 'ol/source/TileWMS';
import OlTileLayer from '../../map-renderer/utils';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { LOG2_ZOOM_0_RESOLUTION, DEFAULT_RESOLUTION } from '../../session/default-map-values';
import { ApiResponse, ApiService } from '../../api/api.service';
import TileGrid, { Options as TileGridOptions } from 'ol/tilegrid/TileGrid';
import { getForProjection } from 'ol/tilegrid';
import { MapLayerService } from '../map-layer.service';

const ATTRIBUTION_POPUP_STYLE =
  'position: absolute; top: -80vh; width: 500px; background-color: white; text-align: left; padding: 20px; margin-left: calc(50% - 250px)';

@Injectable({
  providedIn: 'root',
})
export class WmsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _capabilitiesCache: Map<string, any> = new Map();
  private _capabilitiesAttributionCache: Map<string, string[] | string> = new Map();
  private _capabilitiesLayerCache: Map<string, MapLayer[]> = new Map();
  private _legendCache: Map<string, Map<string, string | null>> = new Map();
  private _sourceAttributionCache: Map<string, string[]> = new Map();

  constructor(
    private _api: ApiService,
    private _mapLayerService: MapLayerService,
  ) {}

  public invalidateCache(capaUrl: string) {
    this._capabilitiesCache.delete(capaUrl);
    this._capabilitiesAttributionCache.delete(capaUrl);
    this._capabilitiesLayerCache.delete(capaUrl);
    this._legendCache.delete(capaUrl);
    this._sourceAttributionCache.delete(capaUrl);
  }

  createDefaultAttribution(hostname: string, wmsTitle: string, wmsAccessConstraints: string) {
    if (wmsAccessConstraints) {
      const title = this._mapLayerService.sanitizeHTML(wmsTitle);
      const html = this._mapLayerService.sanitizeHTML(wmsAccessConstraints);
      return `<span style="cursor:pointer" onclick="this.nextElementSibling.style.display=''">${title ?? hostname}</span><div style="display: none; ${ATTRIBUTION_POPUP_STYLE}"><div onclick="this.parentElement.style.display='none'" style="cursor:pointer">close</div><div stlye="">${html}</div></div>`;
    } else {
      return hostname;
    }
  }

  getAttribution(data, parentAttribution: string[] | string): string[] | string {
    if (data) {
      if (data.Title) {
        const title = this._mapLayerService.sanitizeHTML(data.Title);
        if (data.OnlineResource) {
          const url = this._mapLayerService.sanitizeURLAttribute(data.OnlineResource);
          return `<a target="_blank" href="${url}">${title}</a>`;
        } else {
          return title;
        }
      }
    }
    return parentAttribution;
  }

  static getfullWMTSCapaUrl(capaUrl: string) {
    const url = new URL(capaUrl);
    if (url.pathname === '/' || url.pathname === '/wmts' || url.pathname === '/wmts/') {
      if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
      }
      url.pathname += '1.0.0/WMTSCapabilities.xml';
    }
    return url;
  }

  async getWMTSCapa(source: WmsSource) {
    const capaUrl = source.url;
    if (this._capabilitiesCache.has(capaUrl)) {
      return this._capabilitiesCache.get(capaUrl);
    }
    const url = WmsService.getfullWMTSCapaUrl(capaUrl);
    const parser = new WMTSCapabilities();
    return await fetch(url.toString())
      .then((response) => {
        return response.text();
      })
      .then((text) => {
        const capa = parser.read(text);
        this._capabilitiesCache.set(capaUrl, capa);
        this._capabilitiesAttributionCache.set(
          capaUrl,
          this.createDefaultAttribution(
            url.hostname,
            capa['ServiceIdentification']['Title'],
            capa['ServiceIdentification']['AccessConstraints'],
          ),
        );
        const customAttributions = this._mapLayerService.createAttributionFromArray(source.attribution);
        if (customAttributions) {
          this._sourceAttributionCache.set(source.url, customAttributions);
        }
        return capa;
      });
  }

  async getWMTSCapaLayers(source: WmsSource): Promise<MapLayer[]> {
    if (this._capabilitiesLayerCache.has(source.url)) {
      return this._capabilitiesLayerCache.get(source.url) ?? [];
    }
    const capa = await this.getWMTSCapa(source);
    const layers = capa['Contents']['Layer'].map((layer) => {
      return {
        label: layer.Title,
        opacity: 0.75,
        serverLayerName: layer.Identifier,
        type: 'wmts',
        source,
        fullId: `${source.url}|${layer.Identifier}`,
      } as MapLayer;
    });
    this._capabilitiesLayerCache.set(source.url, layers);
    return layers;
  }

  static getfullWMSCapaUrl(capaUrl: string) {
    const url = new URL(capaUrl);
    if (!url.searchParams.has('version')) {
      url.searchParams.set('version', WMS_DEFAULT_VERSION);
    }
    if (!url.searchParams.has('SERVICE')) {
      url.searchParams.set('SERVICE', 'WMS');
    }
    if (!url.searchParams.has('REQUEST')) {
      url.searchParams.set('REQUEST', 'GetCapabilities');
    }
    return url;
  }

  async getWMSCapa(source: WmsSource) {
    const capaUrl = source.url;
    if (this._capabilitiesCache.has(capaUrl)) {
      return this._capabilitiesCache.get(capaUrl);
    }
    const url = WmsService.getfullWMSCapaUrl(capaUrl);
    const parser = new WMSCapabilities();
    return await fetch(url.toString())
      .then((response) => {
        return response.text();
      })
      .then((text) => {
        const capa = parser.read(text);
        this._capabilitiesCache.set(capaUrl, capa);
        let attributionHtml: string[] | string = this.createDefaultAttribution(
          url.hostname,
          capa['Service']['Title'],
          capa['Service']['AccessConstraints'],
        );
        attributionHtml = this.getAttribution(capa['Capability']['Layer']['Attribution'], attributionHtml);
        this._capabilitiesAttributionCache.set(capaUrl, attributionHtml);
        const customAttributions = this._mapLayerService.createAttributionFromArray(source.attribution);
        if (customAttributions) {
          this._sourceAttributionCache.set(source.url, customAttributions);
        }
        return capa;
      });
  }

  async getWMSCapaLayers(source: WmsSource): Promise<MapLayer[]> {
    if (this._capabilitiesLayerCache.has(source.url)) {
      return this._capabilitiesLayerCache.get(source.url) ?? [];
    }
    const capa = await this.getWMSCapa(source);
    const layers = capa['Capability']['Layer']['Layer'].map((layer) => {
      return {
        label: layer.Title,
        opacity: 0.75,
        serverLayerName: layer.Name,
        type: 'wms',
        source,
        subLayersNames: layer.Layer?.map((info) => info.Name),
        fullId: `${source.url}|${layer.Name}`,
      } as WMSMapLayer;
    });
    this._capabilitiesLayerCache.set(source.url, layers);
    return layers;
  }

  getLegendImgFromCapa(capaInfos) {
    const url = this._mapLayerService.sanitizeURLAttribute(capaInfos.Style[0]?.LegendURL[0]?.OnlineResource);
    return `<img class="legend-img" src="${url}"/>`;
  }

  getLegendImgTagForLayer(source: string, layerId: string) {
    let url = getLegendUrl({ url: source, params: { LAYER: layerId, sld_version: '1.1.0' } });
    if (!url) {
      return '';
    }
    url = this._mapLayerService.sanitizeURLAttribute(url);
    return `<img class="legend-img" src="${url}"/>`;
  }

  getWMSLegend(mapLayer: WMSMapLayer): Observable<string | null> {
    if (!mapLayer.source) {
      return of(null);
    }
    const capaUrl = mapLayer.source.url;
    const layerId = mapLayer.serverLayerName;
    if (this._legendCache.has(capaUrl)) {
      if (this._legendCache.get(capaUrl)?.has(layerId)) {
        return of(this._legendCache.get(capaUrl)?.get(layerId) ?? null);
      }
    } else {
      this._legendCache.set(capaUrl, new Map());
    }
    return from(
      this.getWMSCapa(mapLayer.source as WmsSource).then((capa) => {
        const capaInfos = capa['Capability']['Layer']['Layer'].find((layer) => layer.Name === layerId);
        if (!capaInfos) {
          return null;
        }
        /*
        if (mapLayer.hiddenSubLayers && layer.hiddenSubLayers.length > 0) {
          //const layerIds = layer.subLayersNames?.filter((l) => !layer.hiddenSubLayers?.includes(l)).join(',');
          //getLegendUrl can only be used for single layer, so get image for each layer separate => potential dupplicates in result images...
          return capaInfos['Layer']
            .filter((layer) => !layer.hiddenSubLayers?.includes(layer.Name))
            .filter((layer) => layer.Style[0]?.LegendURL[0]?.OnlineResource !== capaInfos.Style[0]?.LegendURL[0]?.OnlineResource)
            .map((layer) => this.getLegendImgFromCapa(layer))
            .join('');
        } else {
          return this.getLegendImgFromCapa(capaInfos);
        }
        */
        return this.getLegendImgFromCapa(capaInfos);
      }),
    ).pipe(tap((data) => this._legendCache.get(capaUrl)?.set(layerId, data)));
  }

  getWMSCustomLegend(mapLayer: WMSMapLayer): string | null {
    if (!mapLayer.source) {
      return null;
    }
    const capaUrl = mapLayer.source.url;
    const layerId = mapLayer.serverLayerName;
    if (this._legendCache.has(capaUrl)) {
      if (this._legendCache.get(capaUrl)?.has(layerId)) {
        return this._legendCache.get(capaUrl)?.get(layerId) ?? null;
      }
    } else {
      this._legendCache.set(capaUrl, new Map());
    }
    const layerIds = layerId.split(',');
    const legend = layerIds.map((l) => this.getLegendImgTagForLayer(mapLayer.source?.url ?? '', l)).join('');
    this._legendCache.get(capaUrl)?.set(layerId, legend);
    return legend;
  }

  async getTileFormats(source: WmsSource): Promise<string[]> {
    const capa = await this.getWMSCapa(source);
    return capa['Capability']['Request']['GetMap']['Format'] || ['image/png', 'image/jpeg'];
  }

  static _getScaledTileGridInfos(grid: TileGrid, scaling = 1) {
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

  async createWMTSLayer(mapLayer: MapLayer) {
    if (!mapLayer.source) {
      return [];
    }
    const capa = await this.getWMTSCapa(mapLayer.source as WmsSource);
    if (!capa) {
      return [];
    }
    const options = optionsFromCapabilities(capa, {
      layer: mapLayer.serverLayerName,
      projection: swissProjection,
      matrixSet: '',
      crossOrigin: 'anonymous',
    });
    if (!options) {
      return [];
    }
    options.attributions =
      this._sourceAttributionCache.get(mapLayer.source.url) ?? this._capabilitiesAttributionCache.get(mapLayer.source.url);

    /*
    const scaling = 0.5;
    const gridParams = MapLayerService.getScaledTileGridInfos(options.tileGrid, scaling);
    if (gridParams) {
      options.tileGrid = new OlTileGridWMTS({
        ...gridParams,
        matrixIds: options.tileGrid.getMatrixIds(),
      });
    }
    */
    return [
      new OlTileLayer({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: new OlTileWMTS(options) as any,
        opacity: mapLayer.opacity,
        zIndex: mapLayer.zIndex,
      }),
    ];
  }

  public static _scaleDominatorToZoom(scaleDenominator: number | undefined) {
    if (scaleDenominator === undefined) {
      return undefined;
    }
    //no idea why the * 0.97 is required to make value match more accurate
    return (LOG2_ZOOM_0_RESOLUTION - Math.log2(scaleDenominator / DEFAULT_RESOLUTION)) * 0.97;
  }

  private static _createWMSLayer(
    tiled: boolean,
    layers: string,
    version: string,
    wmsUrl: string,
    attributionHtml: string[] | string,
    zIndex: number,
    opacity: number,
    MinScaleDenominator: number | undefined,
    MaxScaleDenominator: number | undefined,
    tileSize: number | undefined,
    tileFormat: string | undefined,
  ) {
    const sourceParams: { [key: string]: unknown } = {
      LAYERS: layers,
      VERSION: version,
    };
    if (tileFormat) {
      sourceParams['FORMAT'] = tileFormat;
    }
    const sourceOptions = {
      //projection: swissProjection, //use projection from view, if different gutter produce error artefacts
      url: wmsUrl,
      params: sourceParams,
      serverType: 'mapserver' as ServerType, //'geoserver'
      crossOrigin: 'anonymous',
      attributions: attributionHtml,
    };
    const layerOptions = {
      opacity,
      maxZoom: WmsService._scaleDominatorToZoom(MinScaleDenominator),
      minZoom: WmsService._scaleDominatorToZoom(MaxScaleDenominator),
      zIndex,
    };
    if (tiled) {
      let sourceOptionAddons = {};
      if (tileSize && mercatorProjection) {
        const defaultTileGrid = getForProjection(mercatorProjection);
        const gutter = Math.min(50, Math.ceil(tileSize * 0.05));
        const scaling = (tileSize - gutter - gutter) / 256;
        const gridParams = WmsService._getScaledTileGridInfos(defaultTileGrid, scaling);
        if (gridParams) {
          sourceOptionAddons = {
            tileGrid: new TileGrid(gridParams),
            //hidpi: false,
            //ratio: 1,
            gutter,
          };
        }
      }
      sourceParams['TILED'] = true;
      return new OlTileLayer({
        ...layerOptions,
        source: new TileWMS({
          ...sourceOptions,
          transition: 0,
          gutter: 12, //prevent cutted features on image boundaries => need to use same projection for tile as for view!
          ...sourceOptionAddons,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      });
    } else {
      return new ImageLayer({
        ...layerOptions,
        source: new ImageWMS({
          ...sourceOptions,
        }),
      });
    }
  }

  async createWMSLayer(mapLayer: WMSMapLayer) {
    if (!mapLayer.source) {
      return [];
    }
    const capa = await this.getWMSCapa(mapLayer.source as WmsSource);
    if (!capa) {
      return [];
    }
    const capaInfos = capa['Capability']['Layer']['Layer'].find((capaLayer) => capaLayer.Name === mapLayer.serverLayerName);
    if (!capaInfos) {
      return [];
    }
    const wmsUrl = capa['Capability']['Request']['GetMap']['DCPType'][0]['HTTP']['Get']['OnlineResource'];

    const attributionHtml =
      this._mapLayerService.createAttributionFromArray(mapLayer.attribution) ??
      this.getAttribution(
        capaInfos['Attribution'],
        this._sourceAttributionCache.get(mapLayer.source.url) ?? this._capabilitiesAttributionCache.get(mapLayer.source.url) ?? '',
      );

    let layerInfos = [capaInfos];
    let layerNames = capaInfos.Name;
    if (capaInfos.Layer) {
      if (mapLayer.hiddenSubLayers && mapLayer.hiddenSubLayers.length > 0) {
        layerInfos = capaInfos.Layer.filter((info) => !mapLayer.hiddenSubLayers?.includes(info.Name));
        if (!mapLayer.splitIntoSubLayers) {
          //if no split, merge layer names and reset single group info
          layerNames = layerInfos.map((info) => info.Name).join(',');
          layerInfos = [capaInfos];
        }
      } else if (mapLayer.splitIntoSubLayers) {
        layerInfos = capaInfos.Layer;
      }
    }

    return layerInfos.map((info) =>
      WmsService._createWMSLayer(
        !mapLayer.noneTiled,
        mapLayer.splitIntoSubLayers ? info.Name : layerNames,
        capa['version'],
        wmsUrl,
        this.getAttribution(info['Attribution'], attributionHtml),
        mapLayer.opacity,
        mapLayer.zIndex,
        //use layer based value as fallback or as default based on splitIntoSubLayers value
        mapLayer.splitIntoSubLayers ?
          info.MinScaleDenominator ?? mapLayer.MinScaleDenominator
        : mapLayer.MinScaleDenominator ?? info.MinScaleDenominator,
        mapLayer.splitIntoSubLayers ?
          info.MaxScaleDenominator ?? mapLayer.MaxScaleDenominator
        : mapLayer.MaxScaleDenominator ?? info.MaxScaleDenominator,
        mapLayer.tileSize,
        mapLayer.tileFormat,
      ),
    );
  }

  async createWMSCustomLayer(mapLayer: WMSMapLayer) {
    if (!mapLayer.source) {
      return [];
    }

    let capa;
    let wmsUrl = new URL(mapLayer.source.url).origin;
    try {
      capa = await this.getWMSCapa(mapLayer.source as WmsSource);
      wmsUrl = capa['Capability']['Request']['GetMap']['DCPType'][0]['HTTP']['Get']['OnlineResource'];
    } catch {
      //get infos if the custom source has a valid Capability endpoint, and use defaults otherwise
    }

    const attributionHtml =
      this._mapLayerService.createAttributionFromArray(mapLayer.attribution) ??
      this._sourceAttributionCache.get(mapLayer.source.url) ??
      this._capabilitiesAttributionCache.get(mapLayer.source.url) ??
      '';

    return [
      WmsService._createWMSLayer(
        !mapLayer.noneTiled,
        mapLayer.serverLayerName,
        capa?.version ?? WMS_DEFAULT_VERSION,
        wmsUrl,
        attributionHtml,
        mapLayer.opacity,
        mapLayer.zIndex,
        mapLayer.MinScaleDenominator,
        mapLayer.MaxScaleDenominator,
        mapLayer.tileSize,
        mapLayer.tileFormat,
      ),
    ];
  }

  static mapWmsSourceResponse(source: WmsSourceApi, organizationId: number) {
    source.owner = source.organization?.id === organizationId;
    delete source.organization;
    delete source.createdAt;
    delete source.updatedAt;
    return source as WmsSource;
  }

  async readGlobalWMSSources(organizationId: number) {
    const { error, result: sources } = await this._api.get<WmsSourceApi[]>('/api/wms-sources');
    if (error || !sources) {
      return [];
    }
    return sources.map((source) => WmsService.mapWmsSourceResponse(source, organizationId));
  }

  async saveGlobalWMSSource(source: WmsSource, organizationId: number) {
    if (!source.owner) {
      return null;
    }
    let response: ApiResponse<WmsSourceApi>;
    if (source.id) {
      response = await this._api.put(`/api/wms-sources/${source.id}`, {
        data: { ...source, organization: organizationId },
      });
    } else {
      response = await this._api.post('/api/wms-sources', { data: { ...source, organization: organizationId } });
    }
    const { error, result } = response;
    if (error) {
      console.error('saveGlobalWMSSource', error);
    } else if (result) {
      return WmsService.mapWmsSourceResponse(result, organizationId);
    }
    return null;
  }
}
