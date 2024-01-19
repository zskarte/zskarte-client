import { GeoFeature } from '../core/entity/geoFeature';
import { FillStyle } from '../core/entity/sign';

export enum ZsMapStateSource {
  OPEN_STREET_MAP = 'openStreetMap',
  GEO_ADMIN_SWISS_IMAGE = 'geoAdminSwissImage',
  GEO_ADMIN_PIXEL = 'geoAdminPixel',
  GEO_ADMIN_PIXEL_BW = 'geoAdminPixelBW',
  LOCAL = 'local',
}

export const zsMapStateSourceToDownloadUrl = {
  [ZsMapStateSource.LOCAL]: 'https://zskarte.blob.core.windows.net/etienne/ch.swisstopo.pmtiles',
};

export interface IZsMapSaveFileState {
  map: IZsMapState;
  display: IZsMapDisplayState;
}

export interface IZsMapState {
  version: number;
  id: string;
  name?: string;
  layers?: ZsMapLayerState[];
  drawElements?: ZsMapDrawElementState[];
  center: [number, number];
}

export const getDefaultIZsMapState = (): IZsMapState => {
  return {} as IZsMapState;
};

export interface IPositionFlag {
  coordinates: number[];
  isVisible: boolean;
}

export enum ZsMapDisplayMode {
  DRAW = 'draw',
  HISTORY = 'history',
}

export interface IZsMapDisplayState {
  id?: number;
  version: number;
  displayMode: ZsMapDisplayMode;
  mapOpacity: number;
  mapCenter: number[];
  mapZoom: number;
  showMyLocation: boolean;
  activeLayer: string | undefined;
  layerVisibility: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  layerOrder: string[];
  source: ZsMapStateSource;
  elementOpacity: Record<string, number>;
  elementVisibility: Record<string, boolean>;
  features: GeoFeature[];
  sidebarContext: SidebarContext | null;
  positionFlag: IPositionFlag;
  hiddenSymbols: number[];
  hiddenFeatureTypes: string[];
  hiddenCategories: string[];
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
  | ZsMapPolygonDrawElementState
  | ZsMapFreehandDrawElementState;

export interface IZsMapBaseElementState {
  id?: string;
  layer?: string;
  coordinates?: number[] | number[][];
  createdAt?: number;
}

export interface IZsMapBaseDrawElementState extends IZsMapBaseElementState {
  type: ZsMapDrawElementStateType;
  protected?: boolean;
  color?: string;
  name?: string;
  nameShow?: boolean;
  iconOpacity?: number;
  description?: string;
  iconSize?: number;
  rotation?: number;
  symbolId?: number;
  hideIcon?: boolean;
  iconOffset?: number;
  flipIcon?: boolean;
  style?: string;
  arrow?: string;
  strokeWidth?: number;
  fillStyle?: FillStyle;
  fillOpacity?: number;
  fontSize?: number;
  images?: string[];
  zindex?: number;
  reportNumber?: number;
}

export interface ZsMapTextDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.TEXT;
  text?: string;
}

export interface ZsMapSymbolDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.SYMBOL;
  coordinates: number[] | number[][];
}

export interface ZsMapLineDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.LINE;
}

export interface ZsMapPolygonDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.POLYGON;
}

export interface ZsMapFreehandDrawElementState extends IZsMapBaseDrawElementState {
  type: ZsMapDrawElementStateType.FREEHAND;
}

export enum SidebarContext {
  Layers,
  Filters,
  Connections,
  History,
  Menu,
}

export interface ZsMapElementToDraw {
  type: ZsMapDrawElementStateType;
  layer: string;
  symbolId?: number;
  text?: string;
}

export type ZsMapDrawElementParams = IZsMapBaseDrawElementParams | IZsMapSymbolDrawElementParams | IZsMapTextDrawElementParams;

interface IZsMapBaseDrawElementParams {
  type: ZsMapDrawElementStateType;
  layer: string;
}

export interface IZsMapSymbolDrawElementParams extends IZsMapBaseDrawElementParams {
  type: ZsMapDrawElementStateType.SYMBOL;
  symbolId: number;
}

export interface IZsMapTextDrawElementParams extends IZsMapBaseDrawElementParams {
  type: ZsMapDrawElementStateType.TEXT;
  text: string;
}
