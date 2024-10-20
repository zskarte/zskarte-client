import { Extent } from 'ol/extent';

interface PresistedSettings {
  id?: number;
  owner: boolean;
  public: boolean;
}

export interface WmsSource extends PresistedSettings {
  url: string;
  label: string;
  type: 'wmts' | 'wms';
  attribution?: [string, string][];
}

//use the partial part to prevent need to use type guards in template
export interface MapSource extends Partial<WmsSource> {
  url: string;
}

export interface WmsSourceApi extends WmsSource {
  organization?: { id: number };
  createdAt?: string;
  updatedAt?: string;
}

interface SelectedMapLayerSettings {
  opacity: number;
  hidden: boolean;
  deleted?: boolean;
  zIndex: number;
}

interface MapLayerGeneralSettings {
  label: string;
  serverLayerName: string | null;
  type: string;
}

export interface GenericOptionalMapLayerOptions {
  MinScaleDenominator?: number;
  MaxScaleDenominator?: number;
  attribution?: [string, string][];
}

export interface MapLayer extends PresistedSettings, SelectedMapLayerSettings, MapLayerGeneralSettings {
  source?: MapSource | WmsSource;
  fullId: string;
  offlineAvailable?: boolean;
}

export interface WMSMapLayer extends MapLayer, GenericOptionalMapLayerOptions {
  serverLayerName: string;
  noneTiled?: boolean;
  subLayersNames?: string[];
  hiddenSubLayers?: string[];
  splitIntoSubLayers?: boolean;
  originalServerLayerName?: string;
  tileSize?: number;
  tileFormat?: string;
}

export interface GeoJSONMapLayer extends MapLayer, GenericOptionalMapLayerOptions {
  styleSourceType: 'url' | 'text';
  styleUrl?: string;
  styleText?: string;
  styleFormat: 'mapbox' | 'olFlat';
  styleSourceName?: string;
  searchable?: boolean;
  searchRegExPatterns?: string[][];
  searchResultGroupingFilterFields?: string[];
  searchResultLabelMask?: string;
  searchMaxResultCount?: number;
}

export interface CsvMapLayer extends GeoJSONMapLayer {
  delimiter: string;
  fieldX: string;
  fieldY: string;
  dataProjection: string;
  filterRegExPattern?: string[][];
  extent?: Extent;
}

export interface GeoAdminMapLayer extends MapLayer {
  serverLayerName: string;
  attribution: string;
  attributionUrl: string;
  background: boolean;
  chargeable: boolean;
  format: string;
  hasLegend: boolean;
  highlightable: boolean;
  searchable: boolean;
  timeEnabled: boolean;
  timestamps: string[];
  tooltip: boolean;
  topics: string;
  wmsLayers: string;
  wmsUrl?: string;
  subLayersIds?: string[];
  maxResolution?: number;
  minResolution?: number;
}

export interface GeoAdminMapLayers {
  [key: string]: GeoAdminMapLayer;
}

export type MapLayerAllFields = Omit<Partial<GeoAdminMapLayer & WMSMapLayer & CsvMapLayer>, 'serverLayerName'> &
  Partial<MapLayerGeneralSettings>;
export interface MapLayerOptionsApi extends Omit<MapLayerAllFields, keyof MapLayer> {
  opacity?: number;
}

export interface MapLayerSourceApi {
  wms_source?: WmsSource | number;
  custom_source?: string;
}

export interface MapLayerApi extends Partial<PresistedSettings>, MapLayerGeneralSettings, MapLayerSourceApi {
  options: MapLayerOptionsApi;
  organization?: { id: number };
  public: boolean;
}
