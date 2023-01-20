export type GeoFeature = {
  label: string;
  attribution: string;
  chargeable: boolean;
  hasLegend: boolean;
  opacity: number;
  serverLayerName: string;
  highlightable: boolean;
  timeEnabled: boolean;
  searchable: boolean;
  tooltip: boolean;
  background: boolean;
  topics: string;
  attributionUrl: string;
  type: string;
  // should be OlTileLayer<OlTileWMTS> but TS does not allow it somehow
  deleted?: boolean;
  zIndex: number;
};

export type GeoJSONFeature = GeoFeature & {
  type: 'geojson';
  opacity: number;
  updateDelay: number;
  timeEnabled: boolean;
  styleUrl: string;
  geojsonUrl: string;
};

export type WMTSFeature = GeoFeature & {
  type: 'wmts';
  format: string;
  opacity: number;
  timestamps: string[];
};

export type WMSFeature = GeoFeature & {
  type: 'wms';
  format: string;
  singleTile: false;
  gutter: number;
  wmsLayers: string;
  wmsUrl: string;
};

export type AggregateFeature = GeoFeature & {
  subLayersIds: string[];
  type: 'aggregate';
};

export interface GeoFeatures {
  [key: string]: GeoFeature;
}
