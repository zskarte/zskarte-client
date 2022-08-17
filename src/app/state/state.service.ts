import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import produce, { Patch } from 'immer';
import {
  IPositionFlag,
  IZsMapDisplayState,
  IZsMapSaveFileState,
  IZsMapState,
  SidebarContext,
  ZsMapDisplayMode,
  ZsMapDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapElementToDraw,
  ZsMapLayerState,
  ZsMapLayerStateType,
  ZsMapStateSource,
} from './interfaces';
import { distinctUntilChanged, map, takeWhile } from 'rxjs/operators';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { v4 as uuidv4 } from 'uuid';
import { ZsMapDrawLayer } from '../map-renderer/layers/draw-layer';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { DrawElementHelper } from '../helper/draw-element-helper';
import { areArraysEqual } from '../helper/array';
import { GeoFeature } from '../core/entity/geoFeature';
import { IZsSession } from '../core/entity/session';
import { MatDialog } from '@angular/material/dialog';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';
import { Sign } from '../core/entity/sign';
import { TextDialogComponent } from '../text-dialog/text-dialog.component';

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
  private _elementToDraw = new BehaviorSubject<ZsMapElementToDraw | undefined>(undefined);

  private _session = new BehaviorSubject<IZsSession | null>(produce<IZsSession | null>(null, (draft) => draft));

  constructor(private drawDialog: MatDialog, private textDialog: MatDialog) {}

  private _getDefaultMapState(): IZsMapState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  private _getDefaultDisplayState(): IZsMapDisplayState {
    return {
      version: 1,
      mapOpacity: 1,
      displayMode: ZsMapDisplayMode.DRAW,
      positionFlag: { coordinates: [0, 0], isVisible: false },
      mapCenter: [0, 0],
      mapZoom: 16,
      activeLayer: undefined,
      layerOpacity: {},
      layerVisibility: {},
      layerOrder: [],
      elementVisibility: {},
      elementOpacity: {},
      features: [],
      sidebarContext: null,
    };
  }

  // drawing
  public drawElement(type: ZsMapDrawElementStateType, layer: string): void {
    if (type === ZsMapDrawElementStateType.SYMBOL) {
      const dialogRef = this.drawDialog.open(DrawingDialogComponent);

      dialogRef.afterClosed().subscribe((result: Sign) => {
        if (result) {
          this._elementToDraw.next({ type, layer, symbolId: result.id });
        }
      });
    } else if (type === ZsMapDrawElementStateType.TEXT) {
      const dialogRef = this.textDialog.open(TextDialogComponent, {
        maxWidth: '80vw',
        maxHeight: '70vh',
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this._elementToDraw.next({ type, layer, text: result });
        }
      });
    } else {
      this._elementToDraw.next({ type, layer });
    }
  }

  public cancelDrawing(): void {
    this._elementToDraw.next(undefined);
  }

  public observeElementToDraw(): Observable<ZsMapElementToDraw | undefined> {
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

  public loadMapState(state: IZsMapState) {
    this.reset(state);
  }

  public observeMapState(): Observable<IZsMapState> {
    return this._map.asObservable();
  }

  public loadDisplayState(state: IZsMapDisplayState): void {
    this.resetDisplayState(state);
  }

  public toggleDisplayMode(): void {
    this.updateDisplayState((draft) => {
      if (draft.displayMode == ZsMapDisplayMode.HISTORY) {
        draft.displayMode = ZsMapDisplayMode.DRAW;
      } else {
        draft.displayMode = ZsMapDisplayMode.HISTORY;
      }
    });
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

  public observePositionFlag(): Observable<IPositionFlag> {
    return this._display.pipe(
      map((o) => {
        return o.positionFlag;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public updatePositionFlag(positionFlag: IPositionFlag) {
    this.updateDisplayState((draft) => {
      draft.positionFlag = positionFlag;
    });
  }

  public setMapZoom(zoom: number) {
    this.updateDisplayState((draft) => {
      draft.mapZoom = zoom;
    });
  }

  public updateMapZoom(delta: number) {
    this.updateDisplayState((draft) => {
      draft.mapZoom = draft.mapZoom + delta;
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
          const cache = {};
          for (const i of o.layers) {
            if (i.id) {
              if (this._layerCache[i.id]) {
                layers.push(this._layerCache[i.id]);
                cache[i.id] = this._layerCache[i.id];
              } else {
                const layer = new ZsMapDrawLayer(i.id, this);
                layers.push(layer);
                cache[i.id] = layer;
              }
            }
          }
          this._layerCache = cache;
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
      const layerCount = (this._map.value.layers?.length || 0) + 1;
      layer.name = 'Layer ' + layerCount;
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

  // features
  public observeSelectedFeatures(): Observable<GeoFeature[]> {
    return this._display.pipe(
      map((o) => {
        return o?.features?.filter((feature) => !feature.deleted);
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public observeFeature(serverLayerName: string): Observable<GeoFeature | undefined> {
    return this._display.pipe(
      map((o) => {
        return o?.features?.find((feature) => feature.serverLayerName === serverLayerName);
      }),
      distinctUntilChanged((x, y) => x === y),
      takeWhile((feature) => !!feature),
    );
  }

  public addFeature(feature: GeoFeature) {
    this.updateDisplayState((draft) => {
      let maxIndex = Math.max(...(draft.features.map((f) => f.zIndex).filter(Boolean) as number[]));
      maxIndex = Number.isInteger(maxIndex) ? maxIndex + 1 : 0;
      draft.features.unshift({ ...feature, opacity: 0.75, deleted: false, zIndex: maxIndex });
    });
  }

  public removeFeature(index: number) {
    this.updateDisplayState((draft) => {
      draft.features.splice(index, 1);
    });
  }

  public sortFeatureUp(index: number) {
    this.updateDisplayState((draft) => {
      const feature = draft.features[index];
      const currentZIndex = feature.zIndex;

      draft.features[index - 1].zIndex = currentZIndex;
      feature.zIndex = currentZIndex + 1;
      draft.features.sort((a, b) => b.zIndex - a.zIndex);
    });
  }

  public sortFeatureDown(index: number) {
    this.updateDisplayState((draft) => {
      const feature = draft.features[index];
      const currentZIndex = feature.zIndex;

      draft.features[index + 1].zIndex = currentZIndex;
      feature.zIndex = currentZIndex - 1;
      draft.features.sort((a, b) => b.zIndex - a.zIndex);
    });
  }

  public setFeatureOpacity(index: number, opacity: number | null) {
    this.updateDisplayState((draft) => {
      draft.features[index].opacity = opacity ?? 0;
    });
  }

  public toggleFeature(item: GeoFeature, index: number) {
    const opacity = item.opacity > 0 ? 0 : 0.75;
    this.setFeatureOpacity(index, opacity);
  }

  public getActiveLayerState(): ZsMapLayerState | undefined {
    return this._map.value.layers?.find((layer) => layer.id === this._display.value.activeLayer);
  }

  public addDrawElement(element: ZsMapDrawElementState): void {
    const activeLayerState = this.getActiveLayerState();
    if (activeLayerState?.type === ZsMapLayerStateType.DRAW) {
      element.id = uuidv4();
      this.updateMapState((draft) => {
        if (!draft.drawElements) {
          draft.drawElements = [];
        }
        draft.drawElements.push(element);
      });
    }
  }

  public getDrawElementState(id: string): ZsMapDrawElementState | undefined {
    return this._map.value.drawElements?.find((o) => o.id === id);
  }

  public observeDrawElements(): Observable<ZsMapBaseDrawElement[]> {
    return this._map.pipe(
      map((o) => {
        if (o?.drawElements) {
          const elements: ZsMapBaseDrawElement[] = [];
          const cache = {};
          for (const i of o.drawElements) {
            if (i.id) {
              if (this._drawElementCache[i.id]) {
                elements.push(this._drawElementCache[i.id]);
                cache[i.id] = this._drawElementCache[i.id];
              } else {
                const element = DrawElementHelper.createInstance(i.id, this);
                elements.push(element);
                cache[i.id] = element;
              }
            }
          }
          this._drawElementCache = cache;
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

  public getSaveFileState(): IZsMapSaveFileState {
    return {
      map: this._map.value,
      display: this._display.value,
    };
  }

  public exportMap(): string {
    return 'data:text/json;charset=UTF-8,' + encodeURIComponent(JSON.stringify(this._map.value));
  }

  public exportMapWithSession(): string {
    return (
      'data:text/json;charset=UTF-8,' +
      encodeURIComponent(JSON.stringify({ map: this._map.value, display: this._display.value, session: this._session.value }))
    );
  }

  public exportMapCsv(): string {
    let lines: string[] = new Array<string>();
    /*
    const result: { features: Feature } = this.writeFeatures();
    const features: Feature[] = result.features;

    // header
    let row: string[] = new Array<string>();
    row.push(this.i18n.get('csvID'));
    row.push(this.i18n.get('csvDate'));
    row.push(this.i18n.get('csvGroup'));
    row.push(this.i18n.get('csvSignatur'));
    row.push(this.i18n.get('csvLocation'));
    row.push(this.i18n.get('csvSize'));
    row.push(this.i18n.get('csvLabel'));
    row.push(this.i18n.get('csvDescription'));
    lines.push('"' + row.join('";"') + '"');

    // entry
    for (let i = 0, l = features.length; i < l; i++) {
      let f: Feature = features[i];
      if (!f.properties || !f.properties.sig) continue;
      let s: Sign = f.properties.sig;
      let sk: string = s.kat
        ? 'sign' + this.capitalizeFirstLetter(s.kat)
        : 'csvGroupArea';
      //console.log('row', f);

      row = new Array<string>();
      row.push(f.id);
      row.push(s.createdAt.toString());
      row.push(sk && this.i18n.has(sk) ? this.i18n.get(sk) : '');
      row.push(
        this.i18n.locale == 'fr' ? s.fr : this.i18n.locale == 'en' ? s.en : s.de
      );
      row.push(JSON.stringify(f.geometry));
      row.push(s.size ? s.size.replace('<sup>2</sup>', '2') : '');
      row.push(s.label);
      row.push(s.description);

      for (let ii = 0, ll = row.length; ii < ll; ii++) {
        row[ii] = row[ii] ? row[ii].replace(/"/g, '""') : '';
      }
      lines.push('"' + row.join('";"') + '"');
    }*/

    return (
      'data:text/csv;charset=UTF-8,' + encodeURIComponent(lines.join('\r\n'))
    );
  }

  public loadSaveFileState(state: IZsMapSaveFileState): void {
    this.loadMapState(state.map);
    this.loadDisplayState(state.display);
  }

  toggleSidebarContext(context: SidebarContext | null) {
    this.updateDisplayState((draft) => {
      draft.sidebarContext = draft.sidebarContext === context ? null : context;
    });
  }

  public observeSidebarContext(): Observable<SidebarContext | null> {
    return this._display.pipe(
      map((o) => o?.sidebarContext),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public observeSession(): Observable<IZsSession | null> {
    return this._session.asObservable();
  }

  public getCurrentSession(): IZsSession | null {
    return this._session.value;
  }

  public loadSession(session: IZsSession | null) {
    this._session.next(session);
  }
}
