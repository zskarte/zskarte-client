interface SelectedMapLayerSettings {
  opacity: number;
  hidden: boolean;
  deleted?: boolean;
  zIndex: number;
}

interface MapLayerGeneralSettings {
  label: string;
  serverLayerName: string;
  type: string;
}

export interface MapLayer extends SelectedMapLayerSettings, MapLayerGeneralSettings {
}

export interface GeoAdminMapLayer extends MapLayer {
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
