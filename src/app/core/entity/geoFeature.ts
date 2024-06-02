export interface GeoFeature {
  attribution: string;
  attributionUrl: string;
  background: boolean;
  chargeable: boolean;
  format: string;
  hasLegend: boolean;
  highlightable: boolean;
  label: string;
  opacity: number;
  searchable: boolean;
  serverLayerName: string;
  timeEnabled: boolean;
  timestamps: string[];
  tooltip: boolean;
  topics: string;
  type: string;
  wmsLayers: string;
  wmsUrl?: string;
  subLayersIds?: string[];
  maxResolution?: number;
  minResolution?: number;
  hidden: boolean;
  deleted?: boolean;
  zIndex: number;
}

export interface GeoFeatures {
  [key: string]: GeoFeature;
}
