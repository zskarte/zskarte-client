import OlTileLayer from 'ol/layer/Tile';
import OlTileWMTS from 'ol/source/WMTS';

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
  // should be OlTileLayer<OlTileWMTS> but TS does not allow it somehow
  deleted?: boolean;
  zIndex: number;
}

export interface GeoFeatures {
  [key: string]: GeoFeature;
}
