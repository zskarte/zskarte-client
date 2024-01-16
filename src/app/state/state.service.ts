import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, merge, Observable } from 'rxjs';
import produce, { applyPatches, Patch } from 'immer';
import {
  IPositionFlag,
  IZsMapDisplayState,
  IZsMapState,
  SidebarContext,
  ZsMapDisplayMode,
  ZsMapDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapElementToDraw,
  ZsMapLayerState,
  ZsMapLayerStateType,
  ZsMapPolygonDrawElementState,
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
import { MatDialog } from '@angular/material/dialog';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';
import { defineDefaultValuesForSignature, Sign } from '../core/entity/sign';
import { TextDialogComponent } from '../text-dialog/text-dialog.component';
import { Signs } from '../map-renderer/signs';
import { SyncService } from '../sync/sync.service';
import { SessionService } from '../session/session.service';
import { SimpleGeometry } from 'ol/geom';
import { MatSnackBar } from '@angular/material/snack-bar';
import { I18NService } from '../state/i18n.service';
import { ApiService } from '../api/api.service';
import { IZsMapOperation } from '../session/operations/operation.interfaces';
import { Feature } from 'ol';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from '../session/default-map-values';

@Injectable({
  providedIn: 'root',
})
export class ZsMapStateService {
  private _map = new BehaviorSubject<IZsMapState>(produce<IZsMapState>(this._getDefaultMapState(), (draft) => draft));
  private _mapPatches = new BehaviorSubject<Patch[]>([]);
  private _mapInversePatches = new BehaviorSubject<Patch[]>([]);
  private _undoStackPointer = new BehaviorSubject<number>(0);

  private _display = new BehaviorSubject<IZsMapDisplayState>(produce<IZsMapDisplayState>(this._getDefaultDisplayState(), (draft) => draft));
  private _displayPatches = new BehaviorSubject<Patch[]>([]);
  private _displayInversePatches = new BehaviorSubject<Patch[]>([]);

  private _layerCache: Record<string, ZsMapBaseLayer> = {};
  private _drawElementCache: Record<string, ZsMapBaseDrawElement> = {};
  private _elementToDraw = new BehaviorSubject<ZsMapElementToDraw | undefined>(undefined);
  private _selectedFeature = new BehaviorSubject<string | undefined>(undefined);
  private _recentlyUsedElement = new BehaviorSubject<ZsMapDrawElementState[]>([]);

  private _mergeMode = new BehaviorSubject<boolean>(false);
  private _splitMode = new BehaviorSubject<boolean>(false);
  private _drawHoleMode = new BehaviorSubject<boolean>(false);

  constructor(
    public i18n: I18NService,
    private drawDialog: MatDialog,
    private textDialog: MatDialog,
    private _sync: SyncService,
    private _session: SessionService,
    private _snackBar: MatSnackBar,
    private _api: ApiService,
  ) {}

  private _getDefaultMapState(): IZsMapState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  private _getDefaultDisplayState(mapState?: IZsMapState): IZsMapDisplayState {
    const state: IZsMapDisplayState = {
      version: 1,
      mapOpacity: 1,
      displayMode: ZsMapDisplayMode.DRAW,
      positionFlag: { coordinates: DEFAULT_COORDINATES, isVisible: false },
      mapCenter: DEFAULT_COORDINATES,
      mapZoom: DEFAULT_ZOOM,
      activeLayer: undefined,
      source: ZsMapStateSource.OPEN_STREET_MAP,
      layerOpacity: {},
      layerVisibility: {},
      layerOrder: [],
      elementVisibility: {},
      elementOpacity: {},
      features: [],
      sidebarContext: null,
      hiddenSymbols: [],
      hiddenFeatureTypes: [],
      hiddenCategories: [],
    };
    if (!mapState) {
      mapState = this._map.value;
    }
    if (mapState?.layers) {
      for (const layer of mapState?.layers) {
        if (layer.id) {
          if (!state.activeLayer) {
            state.activeLayer = layer.id;
          }
          state.layerOrder.push(layer.id);
          state.layerVisibility[layer.id] = true;
          state.layerOpacity[layer.id] = 1;
        }
      }
    }
    return state;
  }

  public copySymbol(symbolId: number, layer?: string) {
    if (layer) {
      this._elementToDraw.next({ type: ZsMapDrawElementStateType.SYMBOL, layer, symbolId });
    }
  }

  public drawSignatureAtCoordinate(coordinates: number[]) {
    const layer = this._display.value.activeLayer;
    if (layer) {
      const dialogRef = this.drawDialog.open(DrawingDialogComponent);
      dialogRef.afterClosed().subscribe((result: Sign) => {
        if (result) {
          if (result.type === 'Point') {
            const element: ZsMapDrawElementState = {
              type: ZsMapDrawElementStateType.SYMBOL,
              coordinates: coordinates,
              layer: layer,
              symbolId: result.id,
            };
            this.addDrawElement(element);
            this.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
          } else {
            this._snackBar.open(this.i18n.get('addSignatureManually'), this.i18n.get('ok'), { duration: 5000 });
            this._elementToDraw.next({ type: ZsMapDrawElementStateType.SYMBOL, layer, symbolId: result.id });
          }
        }
      });
    }
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

  public setMapState(newState?: IZsMapState): void {
    const cached = Object.keys(this._layerCache);
    for (const c of cached) {
      if (!newState?.layers?.find((l) => l.id === c)) {
        this._layerCache[c].unsubscribe();
        delete this._layerCache[c];
      }
    }
    if (this._drawElementCache) {
      for (const key in this._drawElementCache) {
        if (!newState?.drawElements?.find((e) => e.id === key)) {
          this._drawElementCache[key].unsubscribe();
        }
      }
    }
    this._drawElementCache = {};
    this.updateMapState(() => {
      return newState || this._getDefaultMapState();
    }, true);
  }

  public setDisplayState(newState?: IZsMapDisplayState): void {
    this.updateDisplayState(() => {
      return newState || this._getDefaultDisplayState();
    });
  }

  public observeMapState(): Observable<IZsMapState> {
    return this._map.asObservable();
  }

  public toggleDisplayMode(): void {
    this.updateDisplayState((draft) => {
      if (draft.displayMode == ZsMapDisplayMode.HISTORY) {
        draft.displayMode = ZsMapDisplayMode.DRAW;
        this._snackBar.open(this.i18n.get('toastDrawing'), 'OK', {
          duration: 2000,
        });
      } else {
        draft.displayMode = ZsMapDisplayMode.HISTORY;
        this._snackBar.open(this.i18n.get('toastHistory'), 'OK', {
          duration: 2000,
        });
      }
    });
  }

  public observeIsHistoryMode(): Observable<boolean> {
    return this._display.pipe(
      map((o) => {
        return o.displayMode === ZsMapDisplayMode.HISTORY;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public isHistoryMode(): boolean {
    return this._display.value?.displayMode === ZsMapDisplayMode.HISTORY;
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
        if (!o?.mapZoom || o.mapZoom === DEFAULT_ZOOM) {
          return this._session.getDefaultMapZoom();
        }
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

  public getCurrentPositionFlag(): IPositionFlag {
    return this._display.value.positionFlag;
  }

  public setSelectedFeature(featureId: string | undefined) {
    this._selectedFeature.next(featureId);
  }

  public resetSelectedFeature() {
    this._selectedFeature.next(undefined);
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
        if (
          !o?.mapCenter ||
          o.mapCenter.length !== 2 ||
          !o.mapCenter[0] ||
          !o.mapCenter[1] ||
          o.mapCenter[0] === 0 ||
          o.mapCenter[1] === 0 ||
          (o.mapCenter[0] === DEFAULT_COORDINATES[0] && o.mapCenter[1] === DEFAULT_COORDINATES[1])
        ) {
          return this._session.getDefaultMapCenter();
        }
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
    return this._display.pipe(
      map((o) => {
        return o?.source;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMapSource(source: ZsMapStateSource) {
    this.updateDisplayState((draft) => {
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

  public mergePolygons(elementA: ZsMapBaseDrawElement<ZsMapDrawElementState>, elementB: ZsMapBaseDrawElement<ZsMapDrawElementState>) {
    const featureA = elementA.getOlFeature() as Feature<SimpleGeometry>;
    const featureB = elementB.getOlFeature() as Feature<SimpleGeometry>;
    if (featureA.getGeometry()?.getType() == 'Polygon' && featureB.getGeometry()?.getType() == 'Polygon') {
      const newCoordinates: number[][] = [];
      featureA
        ?.getGeometry()
        ?.getCoordinates()
        ?.forEach((c: number[]) => newCoordinates.push(c));
      featureB
        ?.getGeometry()
        ?.getCoordinates()
        ?.forEach((c: number[]) => newCoordinates.push(c));

      elementA.updateElementState((draft) => {
        if (draft.name && elementB.elementState?.name) {
          draft.name = `${draft.name} | ${elementB.elementState?.name}`;
        } else if (draft.name || elementB.elementState?.name) {
          draft.name = draft.name ?? elementB.elementState?.name;
        }
        draft.coordinates = newCoordinates;
      });
      this.removeDrawElement(elementB.getId());
      this.setSelectedFeature(elementA.getId());
      this.setMergeMode(false);
    }
  }

  public splitPolygon(element: ZsMapBaseDrawElement<ZsMapDrawElementState>) {
    const feature = element.getOlFeature() as Feature<SimpleGeometry>;
    if (feature.getGeometry()?.getType() == 'Polygon') {
      const coords = feature.getGeometry()?.getCoordinates() as number[][];
      // we only split polygons which have multiple paths
      if (coords.length <= 1) {
        return;
      }

      for (const group of coords) {
        const state = {
          ...element.elementState,
          coordinates: [group],
        } as ZsMapPolygonDrawElementState;
        // remove id so it's set in addDrawElement
        delete state.id;
        this.addDrawElement(state);
      }

      // remove old element
      this.removeDrawElement(element.getId());
    }
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
      takeWhile((feature) => Boolean(feature)),
    );
  }

  public observeSelectedFeature(): Observable<string | undefined> {
    return this._selectedFeature.asObservable();
  }

  public observeSelectedElement(): Observable<ZsMapBaseDrawElement<ZsMapDrawElementState> | undefined> {
    return combineLatest([this.observeSelectedFeature(), this.observeDrawElements()]).pipe(
      map(([featureId, elements]) => elements.find((e) => e.getId() === featureId)),
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

  public addDrawElement(element: ZsMapDrawElementState): ZsMapDrawElementState | null {
    const activeLayerState = this.getActiveLayerState();
    if (activeLayerState?.type === ZsMapLayerStateType.DRAW) {
      const sign = Signs.getSignById(element.symbolId) ?? ({} as Sign);
      defineDefaultValuesForSignature(sign);
      const drawElement: ZsMapDrawElementState = {
        color: sign.color,
        protected: sign.protected,
        iconSize: sign.iconSize,
        hideIcon: sign.hideIcon,
        iconOffset: sign.iconOffset,
        flipIcon: sign.flipIcon,
        rotation: sign.rotation,
        iconOpacity: sign.iconOpacity,
        style: sign.style,
        arrow: sign.arrow,
        strokeWidth: sign.strokeWidth,
        fillStyle: { ...sign.fillStyle, name: sign.fillStyle?.name ?? '' },
        fillOpacity: sign.fillOpacity,
        fontSize: sign.fontSize,
        id: uuidv4(),
        nameShow: true,
        ...element,
        createdAt: Date.now(),
      };

      this.updateMapState((draft) => {
        if (!draft.drawElements) {
          draft.drawElements = [];
        }
        draft.drawElements.push(drawElement);
      });

      this.addRecentlyUsedElement(element);

      return drawElement;
    }

    return null;
  }

  private addRecentlyUsedElement(element: ZsMapDrawElementState) {
    if (!element) {
      return;
    }

    let elements = this._recentlyUsedElement.getValue();
    elements = elements.filter((e) => e.symbolId !== element.symbolId);
    elements.unshift(element);

    elements.splice(10, elements.length - 10);
    this._recentlyUsedElement.next(elements);
  }

  public observableRecentlyUsedElement() {
    return this._recentlyUsedElement.asObservable();
  }

  public updateDrawElementState<T extends keyof ZsMapDrawElementState>(id: string, field: T, value: ZsMapDrawElementState[T]) {
    this.updateMapState((draft) => {
      const index = draft.drawElements?.findIndex((e) => e.id === id);
      if (index !== undefined && index > -1 && draft.drawElements) {
        draft.drawElements[index][field] = value;
      }
    });
  }

  public removeDrawElement(id: string) {
    const index = this._map.value.drawElements?.findIndex((o) => o.id === id);
    if (index === undefined) {
      throw new Error('Id not correct');
    }
    this.updateMapState((draft) => {
      if (draft.drawElements) {
        draft.drawElements.splice(index, 1);
      }
    });
    if (this._selectedFeature.value === id) {
      this.setSelectedFeature(undefined);
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

          // unsubscribe old elements
          for (const id of Object.keys(this._drawElementCache)) {
            if (!cache[id]) {
              this._drawElementCache[id].unsubscribe();
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

  public undoMapStateChange() {
    const undoStackPointer = this._undoStackPointer.value + 1;

    if (this._mapInversePatches.value.length - undoStackPointer < 0) {
      console.log('Undo not possible');
      return;
    }

    const lastPatch = this._mapInversePatches.value.slice(
      this._mapInversePatches.value.length - undoStackPointer,
      this._mapInversePatches.value.length - undoStackPointer + 1,
    );
    const newState = applyPatches<IZsMapState>(this._map.value, lastPatch);
    this._map.next(newState);

    this._undoStackPointer.next(undoStackPointer);

    const newPatches = this._mapPatches.value.slice(0, this._mapPatches.value.length - undoStackPointer);
    this._sync.publishMapStatePatches(newPatches);
  }

  public redoMapStateChange() {
    const undoStackPointer = this._undoStackPointer.value - 1;

    if (undoStackPointer === 0) {
      console.log('Redo not possible');
      return;
    }

    const lastPatch = this._mapPatches.value.slice(
      this._mapInversePatches.value.length - undoStackPointer,
      this._mapInversePatches.value.length - undoStackPointer + 1,
    );

    const newState = applyPatches<IZsMapState>(this._map.value, lastPatch);
    this._map.next(newState);

    this._undoStackPointer.next(undoStackPointer);

    const newPatches = this._mapPatches.value.slice(0, this._mapPatches.value.length - undoStackPointer);
    this._sync.publishMapStatePatches(newPatches);
  }

  public updateMapState(fn: (draft: IZsMapState) => void, preventPatches = false) {
    if (!preventPatches && !this._session.hasWritePermission()) {
      return;
    }
    const newState = produce<IZsMapState>(this._map.value || {}, fn, (patches, inversePatches) => {
      if (preventPatches) {
        return;
      }
      this._mapPatches.value.push(...patches);
      this._mapPatches.next(this._mapPatches.value);
      this._mapInversePatches.value.push(...inversePatches);
      this._mapInversePatches.next(this._mapInversePatches.value);
      this._undoStackPointer.next(0);
      this._sync.publishMapStatePatches(patches);
    });
    this._map.next(newState);
  }

  public applyMapStatePatches(patches: Patch[]) {
    const newState = applyPatches(this._map.value, patches);
    this._map.next(newState);
  }

  public updateDisplayState(fn: (draft: IZsMapDisplayState) => void): void {
    const newState = produce<IZsMapDisplayState>(this._display.value || {}, fn, (patches, inversePatches) => {
      this._displayPatches.value.push(...patches);
      this._displayPatches.next(this._displayPatches.value);
      this._displayInversePatches.value.push(...inversePatches);
      this._displayInversePatches.next(this._displayInversePatches.value);
    });
    this._display.next(newState);
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

  public filterAll(active: boolean, featureTypes: string[], categoryNames: string[]) {
    this.updateDisplayState((draft) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      draft.hiddenSymbols = active ? [...Signs.SIGNS.map((s) => s.id!)] : [];
      draft.hiddenFeatureTypes = active ? featureTypes : [];
      draft.hiddenCategories = active ? categoryNames : [];
    });
  }

  public toggleSymbol(symbolId?: number) {
    if (!symbolId) {
      return;
    }
    this.updateDisplayState((draft) => {
      this.toggleInArray<number>(draft.hiddenSymbols, symbolId);
    });
  }

  public toggleFeatureType(featureType: string) {
    if (!featureType) {
      return;
    }
    this.updateDisplayState((draft) => {
      this.toggleInArray<string>(draft.hiddenFeatureTypes, featureType);
    });
  }

  public toggleCategory(category: string) {
    if (!category) {
      return;
    }
    this.updateDisplayState((draft) => {
      this.toggleInArray<string>(draft.hiddenCategories, category);
    });
  }

  private toggleInArray<T>(array: T[], value: T) {
    const index = array.indexOf(value);
    if (index > -1) {
      array.splice(index, 1);
    } else {
      array.push(value);
    }
  }

  public observeHiddenSymbols() {
    return this._display.pipe(
      map((o) => {
        return o?.hiddenSymbols;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }
  public observeHiddenFeatureTypes() {
    return this._display.pipe(
      map((o) => {
        return o?.hiddenFeatureTypes.filter((f) => f !== undefined);
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public observeHiddenCategories() {
    return this._display.pipe(
      map((o) => {
        return o?.hiddenCategories;
      }),
      distinctUntilChanged((x, y) => x === y),
    );
  }

  public setMergeMode(mergeMode: boolean) {
    this._mergeMode.next(mergeMode);
  }

  public observeMergeMode(): Observable<boolean> {
    return this._mergeMode.asObservable();
  }

  public observeSplitMode(): Observable<boolean> {
    return this._splitMode.asObservable();
  }

  public setDrawHoleMode(drawHoleMode: boolean) {
    this._drawHoleMode.next(drawHoleMode);
  }

  public toggleDrawHoleMode() {
    this.setDrawHoleMode(!this._drawHoleMode.getValue());
  }

  public observeDrawHoleMode(): Observable<boolean> {
    return this._drawHoleMode.asObservable();
  }

  public setSplitMode(splitMode: boolean) {
    this._splitMode.next(splitMode);
  }

  public async refreshMapState(): Promise<void> {
    if (this._session.getOperationId()) {
      await this._sync.sendCachedMapStatePatches();
      const sha256 = async (str: string): Promise<string> => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.prototype.map.call(new Uint8Array(buf), (x) => ('00' + x.toString(16)).slice(-2)).join('');
      };
      const { error, result } = await this._api.get<IZsMapOperation>('/api/operations/' + this._session.getOperationId());
      if (error || !result) return;
      if (result.mapState) {
        const [oldDigest, newDigest] = await Promise.all([
          sha256(JSON.stringify(this._map.value)),
          sha256(JSON.stringify(result.mapState)),
        ]);
        if (oldDigest !== newDigest) {
          this.setMapState(result.mapState);
        }
      }
    }
  }

  observeIsReadOnly(): Observable<boolean> {
    return merge(this.observeIsHistoryMode(), this._session.observeHasWritePermission()).pipe(
      map(() => {
        const isHistoryMode = this.isHistoryMode();
        const hasWritePermission = this._session.hasWritePermission();
        return !hasWritePermission || isHistoryMode;
      }),
    );
  }
}
