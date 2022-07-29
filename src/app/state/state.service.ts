import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import produce, { enablePatches, Patch } from 'immer';
import {
  IZsMapDisplayState,
  IZsMapState,
  ZsMapDisplayMode,
  ZsMapDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapLayerState,
  ZsMapLayerStateType,
  ZsMapStateSource,
} from './interfaces';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ZsMapBaseLayer } from './layers/base-layer';
import { v4 as uuidv4 } from 'uuid';
import { ZsMapDrawLayer } from './layers/draw-layer';
import { ZsMapBaseDrawElement } from './elements/base-draw-element';
import { DrawElementHelper } from '../helper/draw-element-helper';
import { areArraysEqual } from '../helper/array';

// TODO move this to right position
enablePatches();

@Injectable({
  providedIn: 'root',
})
export class ZsMapStateService {
  private _map = new BehaviorSubject<IZsMapState>(produce<IZsMapState>(this._getDefaultMapState(), (draft) => draft));
  private _mapPatches = new BehaviorSubject<Patch[]>([]);
  private _mapInversePatches = new BehaviorSubject<Patch[]>([]);

  private _display = new BehaviorSubject<IZsMapDisplayState>(produce<IZsMapDisplayState>(this._getDefaultDisplayState(), (draft) => draft));
  private _displayPatches = new BehaviorSubject<Patch[]>([]);
  private _displayInversePatches = new BehaviorSubject<Patch[]>([]);

  private _layerCache: Record<string, ZsMapBaseLayer> = {};
  private _drawElementCache: Record<string, ZsMapBaseDrawElement> = {};
  private _elementToDraw = new BehaviorSubject<
    | {
        type: ZsMapDrawElementStateType;
        layer: string;
      }
    | undefined
  >(undefined);

  private _getDefaultMapState(): IZsMapState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  private _getDefaultDisplayState(): IZsMapDisplayState {
    return {
      mapOpacity: 1,
      displayMode: ZsMapDisplayMode.DRAW,
      mapCenter: [0, 0],
      mapZoom: 16,
      activeLayer: undefined,
      layerOpacity: {},
      layerVisibility: {},
      layerOrder: [],
      elementVisibility: {},
      elementOpacity: {},
    };
  }

  // drawing
  public drawElement(type: ZsMapDrawElementStateType, layer: string): void {
    this._elementToDraw.next({ type, layer });
  }

  public cancelDrawing(): void {
    this._elementToDraw.next(undefined);
  }

  public observeElementToDraw(): Observable<
    | {
        type: ZsMapDrawElementStateType;
        layer: string;
      }
    | undefined
  > {
    return this._elementToDraw.asObservable();
  }

  public reset(newMapState?: IZsMapState, newDisplayState?: IZsMapDisplayState): void {
    this.resetDisplayState(newDisplayState);
    this.setMapState(newMapState);
  }

  public setMapState(newState?: IZsMapState): void {
    this._layerCache = {};
    this._drawElementCache = {};
    this.updateMapState(() => {
      return newState || this._getDefaultMapState();
    });
  }

  public resetDisplayState(newState?: IZsMapDisplayState): void {
    this.updateDisplayState(() => {
      return newState || this._getDefaultDisplayState();
    });
  }

  public loadMapState(map: IZsMapState) {
    this.reset(map);
  }

  public loadSavedMapState(): void {
    const state = JSON.parse(localStorage.getItem('tempMapState') || '{}');
    this.setMapState(state);
  }

  public saveMapState(): void {
    localStorage.setItem('tempMapState', JSON.stringify(this._map.value));
  }

  public observeMapState(): Observable<IZsMapState> {
    return this._map.asObservable();
  }

  public loadSavedDisplayState(): void {
    const state = JSON.parse(localStorage.getItem('tempDisplayState') || '{}');
    this.resetDisplayState(state);
  }

  public saveDisplayState(): void {
    localStorage.setItem('tempDisplayState', JSON.stringify(this._display.value));
  }

  public observeDisplayState(): Observable<IZsMapDisplayState> {
    return this._display.asObservable();
  }

  // zoom
  public observeMapZoom(): Observable<number> {
    return this._display.pipe(
      map((o) => {
        return o?.mapZoom;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMapZoom(zoom: number) {
    this.updateDisplayState((draft) => {
      draft.mapZoom = zoom;
    });
  }

  // center
  public observeMapCenter(): Observable<number[]> {
    return this._display.pipe(
      map((o) => {
        return o?.mapCenter;
      }),
      distinctUntilChanged((x, y) => areArraysEqual(x, y)),
    );
  }

  public setMapCenter(coordinates: number[]) {
    this.updateDisplayState((draft) => {
      draft.mapCenter = coordinates;
    });
  }

  // source
  public observeMapSource(): Observable<ZsMapStateSource> {
    return this._map.pipe(
      map((o) => {
        return o?.source;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMapSource(source: ZsMapStateSource) {
    this.updateMapState((draft) => {
      draft.source = source;
    });
  }

  // name
  public observeMapName(): Observable<string> {
    return this._map.pipe(
      map((o) => {
        return o?.name || '';
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMapName(name: string) {
    this.updateMapState((draft) => {
      draft.name = name;
    });
  }

  // opacity
  public observeMapOpacity(): Observable<number> {
    return this._display.pipe(
      map((o) => {
        return o?.mapOpacity === undefined ? 1 : o.mapOpacity;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMapOpacity(opacity: number) {
    this.updateDisplayState((draft) => {
      draft.mapOpacity = opacity;
    });
  }

  // layers

  public getLayer(layer: string): ZsMapBaseLayer {
    return this._layerCache[layer];
  }

  public getActiveLayer(): ZsMapBaseLayer | undefined {
    return this._display.value.activeLayer ? this._layerCache[this._display.value.activeLayer] : undefined;
  }

  public observeActiveLayer(): Observable<ZsMapBaseLayer | undefined> {
    return this._display.pipe(
      map((o) => {
        return o?.activeLayer ? this._layerCache[o?.activeLayer] : undefined;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public observeLayers(): Observable<ZsMapBaseLayer[]> {
    return this._map.pipe(
      map((o) => {
        if (o?.layers) {
          const layers: ZsMapBaseLayer[] = [];
          for (const i of o.layers) {
            if (i.id) {
              if (this._layerCache[i.id]) {
                layers.push(this._layerCache[i.id]);
              } else {
                const layer = new ZsMapDrawLayer(i.id, this);
                this._layerCache[i.id] = layer;
                layers.push(layer);
              }
            }
          }
          // TODO update cache
          return layers;
        }
        return [];
      }),
      distinctUntilChanged((x, y) => {
        return areArraysEqual(x.map((o) => o.getId()).sort(), y.map((o) => o.getId()).sort());
      }),
    );
  }

  public addDrawLayer(): void {
    this._addLayer({ type: ZsMapLayerStateType.DRAW });
  }

  private _addLayer(layer: ZsMapLayerState): void {
    layer.id = uuidv4();
    if (!layer.name) {
      layer.name = 'Layer ' + layer.id; // TODO count
    }
    this.updateMapState((draft) => {
      if (!draft.layers) {
        draft.layers = [];
      }
      draft.layers.push(layer);
    });
    this.updateDisplayState((draft) => {
      draft.layerVisibility[layer.id as string] = true;
      draft.activeLayer = layer.id;
      draft.layerOrder.push(layer.id as string);
    });
  }

  public addDrawElement(element: ZsMapDrawElementState): void {
    element.id = uuidv4();
    this.updateMapState((draft) => {
      if (!draft.drawElements) {
        draft.drawElements = [];
      }
      draft.drawElements.push(element);
    });
    // TODO check if layer is drawing layer
  }

  public getDrawElementState(id: string): ZsMapDrawElementState | undefined {
    return this._map.value.drawElements?.find((o) => o.id === id);
  }

  public observeDrawElements(): Observable<ZsMapBaseDrawElement[]> {
    return this._map.pipe(
      map((o) => {
        if (o?.drawElements) {
          const elements: ZsMapBaseDrawElement[] = [];
          for (const i of o.drawElements) {
            if (i.id) {
              if (this._drawElementCache[i.id]) {
                elements.push(this._drawElementCache[i.id]);
              } else {
                const element = DrawElementHelper.createInstance(i.id, this);
                this._drawElementCache[i.id] = element;
                elements.push(element);
              }
            }
          }
          // TODO update cache
          return elements;
        }
        return [];
      }),
      distinctUntilChanged((x, y) => {
        return areArraysEqual(x.map((o) => o.getId()).sort(), y.map((o) => o.getId()).sort());
      }),
    );
  }

  public updateMapState(fn: (draft: IZsMapState) => void) {
    const newState = produce<IZsMapState>(this._map.value || {}, fn, (patches, inversePatches) => {
      this._mapPatches.value.push(...patches);
      this._mapPatches.next(this._mapPatches.value);
      this._mapInversePatches.value.push(...inversePatches);
      this._mapInversePatches.next(this._mapInversePatches.value);
    });
    console.log('updated map state', newState);
    this._map.next(newState);
  }

  public updateDisplayState(fn: (draft: IZsMapDisplayState) => void): void {
    const newState = produce<IZsMapDisplayState>(this._display.value || {}, fn, (patches, inversePatches) => {
      this._displayPatches.value.push(...patches);
      this._displayPatches.next(this._displayPatches.value);
      this._displayInversePatches.value.push(...inversePatches);
      this._displayInversePatches.next(this._displayInversePatches.value);
    });
    console.log('updated display state', newState);
    this._display.next(newState);
  }
}
