import { GeoFeature } from '../core/entity/geoFeature';
import { Sign } from '../core/entity/sign';

export enum ZsMapStateSource {
  OPEN_STREET_MAP = 'openStreetMap',
  GEO_ADMIN_SWISS_IMAGE = 'geoAdminSwissImage',
  GEO_ADMIN_PIXEL = 'geoAdminPixel',
  GEO_ADMIN_PIXEL_BW = 'geoAdminPixelBW',
  OFFLINE = 'offline',
}

export interface IZsMapSaveFileState {
  map: IZsMapState;
  display: IZsMapDisplayState;
}

export interface IZsMapState {
  version: number;
  id: string;
  name?: string;
  source: ZsMapStateSource;
  layers?: ZsMapLayerState[];
  drawElements?: ZsMapDrawElementState[];
  center: [number, number];
}

export interface IPositionFlag {
  coordinates: number[];
  isVisible: boolean;
}

export enum ZsMapDisplayMode {
  DRAW = 'draw',
  HISTORY = 'history',
}

export interface IZsMapDisplayState {
  version: number;
  displayMode: ZsMapDisplayMode;
  mapOpacity: number;
  mapCenter: number[];
  mapZoom: number;
  activeLayer: string | undefined;
  layerVisibility: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  layerOrder: string[];
  elementOpacity: Record<string, number>;
  elementVisibility: Record<string, boolean>;
  features: GeoFeature[];
  sidebarContext: SidebarContext | null;
  positionFlag: IPositionFlag;
}

export type ZsMapLayerState = IZsMapDrawLayerState | IZsMapGeoDataLayerState;

export enum ZsMapLayerStateType {
  DRAW = 'draw',
  GEO_DATA = 'geoData',
}

interface IZsMapBaseLayerState {
  id?: string;
  type: ZsMapLayerStateType;
  name?: string;
}

export interface IZsMapDrawLayerState extends IZsMapBaseLayerState {
  type: ZsMapLayerStateType.DRAW;
}

export interface IZsMapGeoDataLayerState extends IZsMapBaseLayerState {
  type: ZsMapLayerStateType.GEO_DATA;
}

export enum ZsMapDrawElementStateType {
  TEXT = 'text',
  SYMBOL = 'symbol',
  POLYGON = 'polygon',
  LINE = 'line',
  FREEHAND = 'freehand',
}

export type ZsMapDrawElementState =
  | ZsMapTextDrawElementState
  | ZsMapSymbolDrawElementState
  | ZsMapLineDrawElementState
  | ZsMapPolygonDrawElementState;

export interface IZsMapBaseElementState {
  id?: string;
  layer?: string;
  coordinates?: number[] | number[][];
}

export interface IZsMapBaseDrawElementState extends IZsMapBaseElementState {
  type: ZsMapDrawElementStateType;
  fixedPosition?: boolean;
  color?: string;
  name?: string;
}

export interface ZsMapTextDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.TEXT;
  fontSize?: string;
}

export interface ZsMapSymbolDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.SYMBOL;
  symbolId?: number;
  coordinates: number[] | number[][];
}

export interface ZsMapLineDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.LINE;
  symbolId?: number;
}

export interface ZsMapPolygonDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.POLYGON;
  symbolId?: number;
}

export enum SidebarContext {
  Layers,
  Filters,
}

export interface ZsMapElementToDraw {
  type: ZsMapDrawElementStateType;
  layer: string;
  symbolId?: number;
  text?: string;
}
