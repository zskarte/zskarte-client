import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Draw, Select, Translate, defaults, Modify } from 'ol/interaction';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlTileLayer from 'ol/layer/Tile';
import OlTileWMTS from 'ol/source/WMTS';
import DrawHole from 'ol-ext/interaction/DrawHole';
import { BehaviorSubject, combineLatest, EMPTY, firstValueFrom, map, Observable, skip, Subject, switchMap, takeUntil } from 'rxjs';
import { ZsMapBaseDrawElement } from './elements/base/base-draw-element';
import { areArraysEqual } from '../helper/array';
import { DrawElementHelper } from '../helper/draw-element-helper';
import { ZsMapBaseLayer } from './layers/base-layer';
import { ZsMapSources } from '../state/map-sources';
import { ZsMapStateService } from '../state/state.service';
import { debounce } from '../helper/debounce';
import { I18NService } from '../state/i18n.service';
import { SidebarContext, ZsMapDrawElementState } from '../state/interfaces';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Collection, Feature, Geolocation as OlGeolocation, Overlay } from 'ol';
import { LineString, Point, Polygon, SimpleGeometry } from 'ol/geom';
import { Icon, Style } from 'ol/style';
import { GeoadminService } from '../core/geoadmin.service';
import { DrawStyle } from './draw-style';
import { formatArea, formatLength, indexOfPointInCoordinateGroup } from '../helper/coordinates';
import { FeatureLike } from 'ol/Feature';
import { availableProjections, mercatorProjection } from '../helper/projections';
import { getCenter } from 'ol/extent';
import { transform } from 'ol/proj';
import { ScaleLine } from 'ol/control';
import { Coordinate } from 'ol/coordinate';
import { getFirstCoordinate, Sign } from '../core/entity/sign';
import { MatButton } from '@angular/material/button';
import { ZsMapOLFeatureProps } from './elements/base/ol-feature-props';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';


import { Stroke, Fill, Circle } from 'ol/style';

@Component({
  selector: 'app-map-renderer',
  templateUrl: './map-renderer.component.html',
  styleUrls: ['./map-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapRendererComponent implements AfterViewInit {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @ViewChild('delete') deleteElement!: MatButton;
  @ViewChild('rotate') rotateElement!: MatButton;
  @ViewChild('copy') copyElement!: MatButton;
  removeButton?: Overlay;
  rotateButton?: Overlay;
  copyButton?: Overlay;
  ROTATE_OFFSET_X = 30;
  ROTATE_OFFSET_Y = -30;

  sidebarContextValues = SidebarContext;
  sidebarContext: Observable<SidebarContext | null>;

  private _ngUnsubscribe = new Subject<void>();
  private _map!: OlMap;
  private _view!: OlView;
  private _geolocation!: OlGeolocation;
  private _modify!: Modify;
  private _mapLayer = new OlTileLayer({
    zIndex: 0,
  });
  private _navigationLayer!: VectorLayer<VectorSource>;
  private _positionFlag!: Feature;
  private _positionFlagLocation!: Point;
  private _layerCache: Record<string, ZsMapBaseLayer> = {};
  private _allLayers: VectorLayer<VectorSource>[] = [];
  private _drawElementCache: Record<string, { layer: string | undefined; element: ZsMapBaseDrawElement }> = {};
  private _currentDrawInteraction: Draw | undefined;
  private _featureLayerCache: Map<string, OlTileLayer<OlTileWMTS>> = new Map();
  private _modifyCache = new Collection<Feature>([]);
  private _currentSketch: FeatureLike | undefined;
  private _rotating = false;
  private _initialRotation = 0;
  private _lastModificationPointCoordinates: number[] = [];
  private _drawHole!: DrawHole;
  public currentSketchSize = new BehaviorSubject<string | null>(null);
  public mousePosition = new BehaviorSubject<number[]>([0, 0]);
  public mouseCoordinates = new BehaviorSubject<number[]>([0, 0]);
  public mouseProjection: Observable<string>;
  public availableProjections = availableProjections;
  public selectedProjectionIndex = 0;
  public selectedFeature = new BehaviorSubject<Feature<SimpleGeometry> | undefined>(undefined);
  public selectedFeatureCoordinates: Observable<string>;
  public coordinates = new BehaviorSubject<number[]>([0, 0]);

  constructor(
    private _state: ZsMapStateService,
    public i18n: I18NService,
    private geoAdminService: GeoadminService,
    private dialog: MatDialog,
  ) {
    _state
      .observeSelectedElement()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((element) => {
        if (element) {
          this.selectedFeature.next(element.getOlFeature() as Feature<SimpleGeometry>);
        } else {
          this.selectedFeature.next(undefined);
          this.toggleEditButtons(false);
        }
      });
    this.sidebarContext = this._state.observeSidebarContext();
    this.selectedFeatureCoordinates = this.selectedFeature.pipe(
      map((feature) => {
        const coords = this.getFeatureCoordinates(feature);
        return this.availableProjections[this.selectedProjectionIndex].translate(coords);
      }),
    );
    this.mouseProjection = this.mouseCoordinates.asObservable().pipe(
      takeUntil(this._ngUnsubscribe),
      map((coords) => {
        const transform = this.transformToCurrentProjection(coords) ?? [];
        return this.availableProjections[this.selectedProjectionIndex].translate(transform);
      }),
    );
  }

  public ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public ngAfterViewInit(): void {
    // TODO
    const select = new Select({
      hitTolerance: 10,
      style: (feature: FeatureLike, resolution: number) => {
        if (feature.get('hidden') === true) {
          return undefined;
        }
        return DrawStyle.styleFunctionSelect(feature, resolution, true);
      },
      layers: this._allLayers,
    });
    select.on('select', (event) => {
      this._modifyCache.clear();
      this.toggleEditButtons(false);
      for (const feature of event.selected) {
        this._state.setSelectedFeature(feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID));
      }

      if (event.selected.length === 0) {
        this._state.resetSelectedFeature();
      }
    });

    this._modify = new Modify({
      features: this._modifyCache,
      condition: (event) => {
        if (!this.areFeaturesModifiable()) {
          this.toggleEditButtons(false);
          return false;
        }

        if (this._modify['vertexFeature_'] && this._modify['lastPointerEvent_']) {
          this.setEditButtonPosition(event.coordinate);
          this._lastModificationPointCoordinates = this._modify['vertexFeature_'].getGeometry().getCoordinates();
          this.toggleEditButtons(true);
        }
        return true;
      },
    });

    this._modify.on('modifystart', (event) => {
      this._currentSketch = event.features.getArray()[0];
      this.toggleEditButtons(false);
    });

    this._modify.on('modifyend', (e) => {
      if (this._modify['vertexFeature_']) {
        this._lastModificationPointCoordinates = this._modify['vertexFeature_'].getGeometry().getCoordinates();
      }
      this.setEditButtonPosition(e.mapBrowserEvent.coordinate);
      this.toggleEditButtons(true);
      this._currentSketch = undefined;
      e.features.forEach((feature) => {
        const element = this._drawElementCache[feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];
        element.element.setCoordinates((feature.getGeometry() as SimpleGeometry).getCoordinates() as any);
      });
    });

    // select on ol-Map layer
    this.selectedFeature.pipe(takeUntil(this._ngUnsubscribe)).subscribe((feature) => {
      if (feature && !feature.get('sig').protected && !this._modifyCache.getArray().includes(feature)) {
        this._modifyCache.push(feature);
      }
    });

    // TODO
    const translate = new Translate({
      features: select.getFeatures(),
      condition: () =>
        select
          .getFeatures()
          .getArray()
          .every((feature) => !feature?.get('sig').protected),
    });

    translate.on('translatestart', () => {
      this.toggleEditButtons(false);
    });

    translate.on('translateend', (e) => {
      e.features.forEach((feature) => {
        const element = this._drawElementCache[feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];
        element.element.setCoordinates((feature.getGeometry() as SimpleGeometry).getCoordinates() as any);
      });
    });

    this._view = new OlView({
      center: [849861.97, 5905812.55], // TODO get from newly implemented session
      zoom: 16, // TODO get from newly implemented session
    });

    this._map = new OlMap({
      target: this.mapElement.nativeElement,
      view: this._view,
      controls: [
        new ScaleLine({
          units: 'metric',
          bar: true,
          steps: 4,
          text: true,
          minWidth: 140,
        }),
      ],
      interactions: defaults({
        doubleClickZoom: false,
        pinchRotate: true,
        shiftDragZoom: false,
      }).extend([select, translate, this._modify]),
    });

    this._geolocation = new OlGeolocation({
      // enableHighAccuracy must be set to true to have the heading value.
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: this._view.getProjection(),
    });

    const _coords = this._geolocation.getPosition();
    this._positionFlagLocation = _coords ? new Point(_coords) : new Point([0, 0]);
    this._positionFlag = new Feature({
      geometry: this._positionFlagLocation,
    });

    this._positionFlag.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: 'assets/img/place.png',
          scale: 0.15,
        }),
      }),
    );

    const navigationSource = new VectorSource({
      features: [this._positionFlag],
    });
    this._navigationLayer = new VectorLayer({
      source: navigationSource,
    });
    this._navigationLayer.setZIndex(99999999999);
    this._map.addLayer(this._navigationLayer);

    this._map.on('moveend', () => {
      this._state.setMapCenter(this._view.getCenter() || [0, 0]);
    });

    this._map.on('pointermove', (event) => {
      this.mousePosition.next(event.pixel);
      this.mouseCoordinates.next(event.coordinate);
      let sketchSize = null;
      if (this._currentSketch) {
        const geom = this._currentSketch.getGeometry();
        if (geom instanceof Polygon) {
          sketchSize = formatArea(geom);
        } else if (geom instanceof LineString) {
          sketchSize = formatLength(geom);
        }
      }
      this.currentSketchSize.next(sketchSize);
    });

    const debouncedZoomSave = debounce(() => {
      this._state.setMapZoom(this._view.getZoom() || 10);
    }, 1000);

    this._view.on('change:resolution', () => {
      debouncedZoomSave();
    });

    this._state
      .observeMapCenter()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((center) => {
        if (!areArraysEqual(this._view.getCenter() || [0, 0], center)) {
          // TODO implement proper fallback center
          if (!center[0] && !center[1]) {
            center = [849861.97, 5905812.55];
          }
          this._view.setCenter(center);
        }
      });

    this._state
      .observeMapZoom()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((zoom) => {
        if (this._view.getZoom() !== zoom) {
          // TODO implement proper fallback zoom
          if (!zoom) {
            zoom = 16;
          }
          this._view.setZoom(zoom);
        }
      });

    this._map.addLayer(this._mapLayer);

    this._state
      .observeElementToDraw()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((element) => {
        if (element) {
          const interaction = DrawElementHelper.createDrawHandlerForType(element, this._state);
          interaction.on('drawstart', (event) => {
            this._currentSketch = event.feature;
          });
          interaction.on('drawend', () => {
            this._currentSketch = undefined;
            this._state.cancelDrawing();
          });
          this._currentDrawInteraction = interaction;
          this._map.addInteraction(this._currentDrawInteraction);
        } else {
          if (this._currentDrawInteraction) {
            this._map.removeInteraction(this._currentDrawInteraction);
          }
          this._currentDrawInteraction = undefined;
        }
      });

    this._state
      .observeMapSource()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((source) => {
        this._mapLayer.setSource(ZsMapSources.get(source));
      });

    this._state
      .observeMapOpacity()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((opacity) => {
        this._mapLayer.setOpacity(opacity);
      });

    this._state
      .observeLayers()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((layers) => {
        for (const layer of layers) {
          if (!this._layerCache[layer.getId()]) {
            this._layerCache[layer.getId()] = layer;
            this._allLayers.push(layer.getOlLayer());
            this._map.addLayer(layer.getOlLayer());
          }
        }
      });

    this._state
      .observeHiddenSymbols()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((hiddenSymbols) => {
        for (const key in this._drawElementCache) {
          const feature = this._drawElementCache[key].element.getOlFeature();
          const hidden = hiddenSymbols.includes(feature?.get('sig')?.id);
          feature?.set('hidden', hidden);
        }
      });

    this._state
      .observeHiddenFeatureTypes()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((hiddenFeatureTypes) => {
        for (const key in this._drawElementCache) {
          const feature = this._drawElementCache[key].element.getOlFeature();
          const hidden = hiddenFeatureTypes.includes(feature?.get('sig')?.filterValue);
          feature?.set('hidden', hidden);
        }
      });

    this._state
      .observeDrawElements()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((elements) => {
        for (const element of elements) {
          if (!this._drawElementCache[element.getId()]) {
            this._drawElementCache[element.getId()] = {
              element,
              layer: undefined,
            };
            element
              .observeLayer()
              .pipe(takeUntil(element.observeUnsubscribe()))
              .subscribe((layer) => {
                const cache = this._drawElementCache[element.getId()];
                const feature = element.getOlFeature();
                if (cache.layer) {
                  const cachedLayer = this._state.getLayer(cache.layer);
                  if (cachedLayer) {
                    cachedLayer.removeOlFeature(feature);
                  }
                }
                cache.layer = layer;
                const newLayer = this._state.getLayer(layer || '');
                newLayer?.addOlFeature(feature);
              });
          }
        }

        // Removed old elements
        for (const element of Object.values(this._drawElementCache)) {
          if (elements.every((e) => e.getId() != element.element.getId())) {
            // New elements do not contain element from cache
            this._state.getLayer(element.layer || '').removeOlFeature(element.element.getOlFeature());
            delete this._drawElementCache[element.element.getId()];
          }
        }
      });

    this._state
      .observeSelectedFeatures()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((features) => {
        // removed features
        const cacheNames = Array.from(this._featureLayerCache.keys());
        features
          .filter((el) => !cacheNames.includes(el.serverLayerName))
          .forEach((feature) => {
            const layer = this.geoAdminService.createGeoAdminLayer(
              feature.serverLayerName,
              feature.timestamps[0],
              feature.format,
              feature.zIndex,
            );
            this._map.addLayer(layer);
            this._featureLayerCache.set(feature.serverLayerName, layer);

            // observe feature changes
            this._state.observeFeature(feature.serverLayerName).subscribe({
              next: (updatedFeature) => {
                if (updatedFeature) {
                  layer.setZIndex(updatedFeature.zIndex);
                  layer.setOpacity(updatedFeature.opacity);
                }
              },
              complete: () => {
                this._map.removeLayer(layer);
                this._featureLayerCache.delete(feature.serverLayerName);
              },
            });
          });
      });

    this._state
      .observePositionFlag()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((positionFlag) => {
        this._navigationLayer.setVisible(positionFlag.isVisible);
        this._positionFlagLocation.setCoordinates(positionFlag.coordinates);
        this._positionFlag.changed();
      });

    this.initButtons();
    this.initDrawHole();

    const selectLocationMarker = new Select({
      hitTolerance: 10,
      style: new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.5)',
          }),
          stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.5)',
          }),
        }),
      }),

          
      layers: [this._navigationLayer],
    });

    selectLocationMarker.on('select', (event) => {
      console.log('select', event);
    });
  }

  /**
   * Initializes the drawHole functionality for Polygons
   */
  initDrawHole() {
    this._drawHole = new DrawHole({
      layers: this._allLayers,
      type: 'Polygon',
    });
    this._drawHole.setActive(false);
    this._map.addInteraction(this._drawHole);

    this._drawHole.on('drawend', () => {
      this._state.setDrawHoleMode(false);
    });

    this._state
      .observeDrawHoleMode()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((drawHoleMode) => {
        this._drawHole.setActive(drawHoleMode);
      });
  }

  initButtons() {
    this.removeButton = new Overlay({
      element: this.deleteElement._elementRef.nativeElement,
      positioning: 'center-center',
      offset: [30, 30],
    });
    this.copyButton = new Overlay({
      element: this.copyElement._elementRef.nativeElement,
      positioning: 'center-center',
      offset: [-30, 30],
    });
    this.rotateButton = new Overlay({
      element: this.rotateElement._elementRef.nativeElement,
      positioning: 'center-center',
      offset: [this.ROTATE_OFFSET_X, this.ROTATE_OFFSET_Y],
    });

    this.rotateButton.getElement()?.addEventListener('mousedown', () => this.startRotating());
    this.rotateButton.getElement()?.addEventListener('touchstart', () => this.startRotating());
    this.removeButton.getElement()?.addEventListener('click', () => this.removeFeature());
    this.copyButton.getElement()?.addEventListener('click', async () => {
      const coordinationGroup = await this.getCoordinationGroupOfLastPoint();
      this.toggleEditButtons(false);
      if (coordinationGroup) {
        this.doCopySign(coordinationGroup?.feature);
      }
    });

    this._map.addOverlay(this.removeButton);
    this._map.addOverlay(this.rotateButton);
    this._map.addOverlay(this.copyButton);
  }

  async startRotating() {
    const feature = await firstValueFrom(this.selectedFeature);
    if (!feature?.get('sig')) {
      return;
    }
    this._rotating = true;
    this._initialRotation = feature.get('sig').rotation;
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  @HostListener('document:touchcancel')
  stopRotating() {
    this._rotating = false;
  }

  @HostListener('document:mousemove', ['$event'])
  async onMouseMove(event: MouseEvent | TouchEvent) {
    if (!this._rotating) {
      return;
    }

    if (window.TouchEvent && event instanceof TouchEvent && event.targetTouches.length <= 0) {
      return;
    }

    event.preventDefault();

    const feature = await firstValueFrom(this.selectedFeature);

    if (!feature?.get('sig')) {
      return;
    }

    let pageX = 0,
      pageY = 0;
    if (window.TouchEvent && event instanceof TouchEvent) {
      pageX = event.targetTouches[event.targetTouches.length - 1].pageX;
      pageY = event.targetTouches[event.targetTouches.length - 1].pageY;
    } else if (event instanceof MouseEvent) {
      pageX = event.pageX;
      pageY = event.pageY;
    }

    const rect = this.rotateButton?.getElement()?.getBoundingClientRect() ?? { x: 0, y: 0 };

    const radians = Math.atan2(pageX - (rect.x - this.ROTATE_OFFSET_X), pageY - (rect.y - this.ROTATE_OFFSET_Y));
    const degrees = Math.round(radians * (180 / Math.PI) * -1 + 100);
    let rotation = degrees + this._initialRotation;

    // keep the rotation between -180 and 180
    rotation = rotation > 180 ? rotation - 360 : rotation;
    const id = feature?.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID);

    // Update the signature in the UI separately from the state, to provide a smooth rotation
    feature.get('sig').rotation = rotation;
    feature.changed();

    // Update the state with the new rotation (debounced)
    this._drawElementCache[id]?.element.updateElementState((draft) => {
      draft.rotation = rotation;
    });
  }

  async removeFeature() {
    const coordinationGroup = await this.getCoordinationGroupOfLastPoint();
    if (coordinationGroup) {
      if (!coordinationGroup.minimalAmountOfPoints) {
        this._modify.removePoint();
      } else if (coordinationGroup.otherCoordinationGroupCount == 0) {
        // It's the last coordination group - we can remove the feature.
        const confirm = this.dialog.open(ConfirmationDialogComponent, {
          data: this.i18n.get('removeFeatureFromMapConfirm'), // this.i18n.get('deleteLastPointOnFeature') + " " + this.i18n.get('removeFeatureFromMapConfirm')
        });
        confirm.afterClosed().subscribe((r) => {
          if (r) {
            this._state.removeDrawElement(coordinationGroup.feature?.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID));
            this._state.resetSelectedFeature();
          }
        });
      } else if (coordinationGroup.coordinateGroupIndex) {
        // It's not the last coordination group - so we need to get rid of the coordination group inside the feature
        const oldCoordinates = coordinationGroup.feature.getGeometry()?.getCoordinates();
        const newCoordinates = [];

        if (oldCoordinates) {
          for (let i = 0; i < oldCoordinates.length; i++) {
            if (i != coordinationGroup.coordinateGroupIndex) {
              newCoordinates.push(oldCoordinates[i]);
            }
          }
          const id = coordinationGroup.feature?.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID);
          this._drawElementCache[id]?.element.setCoordinates(newCoordinates);
        }
      }
    }
    this.toggleEditButtons(false);
  }

  private async getCoordinationGroupOfLastPoint() {
    const feature = await firstValueFrom(this.selectedFeature);
    // Since we're working with single select, this should be only one - we iterate it nevertheless for being defensive
    const coordinates = feature?.getGeometry()?.getCoordinates();
    if (coordinates) {
      switch (feature?.getGeometry()?.getType()) {
        case 'Polygon':
          for (let i = 0; i < coordinates.length; i++) {
            const coordinateGroup = coordinates[i];
            if (indexOfPointInCoordinateGroup(coordinateGroup, this._lastModificationPointCoordinates) != -1) {
              return {
                feature: feature,
                coordinateGroupIndex: i,
                otherCoordinationGroupCount: coordinates.length - 1,
                minimalAmountOfPoints: coordinateGroup.length <= 4,
              };
            }
          }
          return null;
        case 'LineString':
          return {
            feature: feature,
            coordinateGroupIndex: null,
            otherCoordinationGroupCount: 0,
            minimalAmountOfPoints: coordinates.length <= 2,
          };
        case 'Point':
          return {
            feature: feature,
            coordinateGroupIndex: null,
            otherCoordinationGroupCount: 0,
            minimalAmountOfPoints: true,
          };
      }
    }
    return null;
  }

  async doCopySign(feature: Feature<SimpleGeometry>) {
    const sign = feature?.get('sig') as Sign;
    if (!sign || !sign.id) {
      return;
    }
    const layer = await firstValueFrom(this._state.observeActiveLayer());
    this._state.copySymbol(sign.id, layer?.getId());
    this._state.resetSelectedFeature();
  }

  async toggleEditButtons(show: boolean) {
    let allowRotation = false;
    if (show && this._lastModificationPointCoordinates) {
      const feature = await firstValueFrom(this.selectedFeature);

      const [pointX, pointY] = this._lastModificationPointCoordinates;
      const [iconX, iconY] = getFirstCoordinate(feature);

      // only show rotateButton if the feature has an icon and the selected point is where the icon is placed
      allowRotation = feature?.get('sig')?.src && pointX === iconX && pointY === iconY;
    }

    this.toggleButton(show, this.removeButton?.getElement());
    this.toggleButton(allowRotation, this.rotateButton?.getElement());
    this.toggleButton(allowRotation, this.copyButton?.getElement());
  }

  /**
   * Sets the position of the editButtons around an Symbol
   * @param coordinates Coordinates of the symbol
   * @param moveDeleteButton false if it should not move the delete button
   */
  setEditButtonPosition(coordinates: number[]) {
    this.removeButton?.setPosition(coordinates);
    this.rotateButton?.setPosition(coordinates);
    this.copyButton?.setPosition(coordinates);
  }

  toggleButton(allow: boolean, el?: HTMLElement) {
    if (el) {
      // TODO: include historyMode
      el.style.display = allow ? 'block' : 'none';
    }
  }

  areFeaturesModifiable() {
    return this._modifyCache.getArray().every((feature) => feature && feature.get('sig') && !feature.get('sig').protected);
  }

  zoomIn() {
    this._state.updateMapZoom(1);
  }

  zoomOut() {
    this._state.updateMapZoom(-1);
  }

  setSidebarContext(context: SidebarContext | null) {
    this._state.toggleSidebarContext(context);
  }

  toggleShowCurrentLocation() {
    const posFlag = this._state.getCurrentPositionFlag();
    this._state.updatePositionFlag({
      ...posFlag,
      isVisible: !posFlag.isVisible,
    });

    // only track if the position flag is visible
    this._geolocation.setTracking(this.isPositionFlagVisible);

    this._geolocation.on('change:position', () => {
      const coordinates = this._geolocation.getPosition();
      if (!coordinates) return;

      this._state.updatePositionFlag({
        isVisible: this.isPositionFlagVisible,
        coordinates: coordinates,
      });

      this._positionFlagLocation = coordinates ? new Point(coordinates) : new Point([0, 0]);
      this._positionFlag.setGeometry(this._positionFlagLocation);
      this._positionFlag.changed();
    });
  }

  get isPositionFlagVisible(): boolean {
    return this._state.getCurrentPositionFlag().isVisible;
  }

  async rotateProjection() {
    const nextIndex = this.selectedProjectionIndex + 1;
    this.selectedProjectionIndex = nextIndex >= availableProjections.length ? 0 : nextIndex;
    const feature = await firstValueFrom(this.selectedFeature);
    if (feature) {
      // trigger selectedFeature to enable projection rotation while a feature is selected
      this._state.setSelectedFeature(feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID));
    }

    // After rotating the projection,
    // the coordinates component is not automatically reloaded.
    // To "force" the component to reload,
    // we push the current mouse position to the mouse coordinates.
    this.mouseCoordinates.next(this.mousePosition.value);
  }

  getFeatureCoordinates(feature: Feature | null | undefined): number[] {
    const center = getCenter(feature?.getGeometry()?.getExtent() ?? []);
    return this.transformToCurrentProjection(center) ?? [];
  }

  transformToCurrentProjection(coordinates: Coordinate) {
    const projection = availableProjections[this.selectedProjectionIndex].projection;
    if (projection && mercatorProjection && coordinates.every((c) => !isNaN(c))) {
      return transform(coordinates, mercatorProjection, projection);
    }
    return undefined;
  }
}
