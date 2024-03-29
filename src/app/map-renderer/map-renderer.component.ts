import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { defaults, Draw, Modify, Select, Translate } from 'ol/interaction';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import DrawHole from 'ol-ext/interaction/DrawHole';
import { BehaviorSubject, combineLatest, filter, firstValueFrom, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { ZsMapBaseDrawElement } from './elements/base/base-draw-element';
import { areArraysEqual } from '../helper/array';
import { DrawElementHelper } from '../helper/draw-element-helper';
import { ZsMapBaseLayer } from './layers/base-layer';
import { ZsMapSources } from '../state/map-sources';
import { ZsMapStateService } from '../state/state.service';
import { debounce } from '../helper/debounce';
import { I18NService } from '../state/i18n.service';
import { ZsMapDrawElementStateType } from '../state/interfaces';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Collection, Feature, Geolocation as OlGeolocation, Overlay } from 'ol';
import { LineString, Point, Polygon, SimpleGeometry } from 'ol/geom';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';
import { GeoadminService } from '../core/geoadmin.service';
import { DrawStyle } from './draw-style';
import { formatArea, formatLength, indexOfPointInCoordinateGroup } from '../helper/coordinates';
import { FeatureLike } from 'ol/Feature';
import { availableProjections, mercatorProjection } from '../helper/projections';
import { getCenter } from 'ol/extent';
import { transform } from 'ol/proj';
import { ScaleLine } from 'ol/control';
import { Coordinate } from 'ol/coordinate';
import { Sign } from '../core/entity/sign';
import { MatButton } from '@angular/material/button';
import { ZsMapOLFeatureProps } from './elements/base/ol-feature-props';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Signs } from './signs';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from '../session/default-map-values';
import { SyncService } from '../sync/sync.service';
import { SessionService } from '../session/session.service';
import { Layer } from 'ol/layer';
import { OlTileLayer, OlTileLayerType } from './utils';

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
  @ViewChild('draw') drawElement!: MatButton;
  @ViewChild('close') closeElement!: MatButton;
  removeButton?: Overlay;
  rotateButton?: Overlay;
  copyButton?: Overlay;
  drawButton?: Overlay;
  closeButton?: Overlay;
  ROTATE_OFFSET_X = 30;
  ROTATE_OFFSET_Y = -30;

  private _ngUnsubscribe = new Subject<void>();
  private _map!: OlMap;
  private _view!: OlView;
  private _geolocation!: OlGeolocation;
  private _modify!: Modify;
  private _mapLayer: Layer = new OlTileLayer({
    zIndex: 0,
  });
  private _navigationLayer!: VectorLayer<VectorSource>;
  private _deviceTrackingLayer!: VectorLayer<VectorSource>;
  private _devicePositionFlag!: Feature;
  private _devicePositionFlagLocation!: Point;
  public isDevicePositionFlagVisible = false;
  private _positionFlag!: Feature;
  private _positionFlagLocation!: Point;
  private _layerCache: Record<string, ZsMapBaseLayer> = {};
  private _allLayers: VectorLayer<VectorSource>[] = [];
  private _drawElementCache: Record<string, { layer: string | undefined; element: ZsMapBaseDrawElement }> = {};
  private _currentDrawInteraction: Draw | undefined;
  private _featureLayerCache: Map<string, OlTileLayerType> = new Map();
  private _modifyCache = new Collection<Feature>([]);
  private _currentSketch: FeatureLike | undefined;
  private _rotating = false;
  private _initialRotation = 0;
  private _drawHole!: DrawHole;
  private _mergeMode = false;
  public currentSketchSize = new BehaviorSubject<string | null>(null);
  public mousePosition = new BehaviorSubject<number[]>([0, 0]);
  public mouseProjection: Observable<string>;
  public availableProjections = availableProjections;
  public selectedProjectionIndex = 0;
  public selectedFeature = new BehaviorSubject<Feature<SimpleGeometry> | undefined>(undefined);
  public selectedFeatureCoordinates: Observable<string>;
  public coordinates = new BehaviorSubject<number[]>([0, 0]);
  public isReadOnly = new BehaviorSubject<boolean>(false);
  public selectedVertexPoint = new BehaviorSubject<number[] | null>(null);
  private existingCurrentLocations: VectorLayer<VectorSource<Feature<Point>>> | undefined;
  public connectionCount = new BehaviorSubject<number>(0);
  public isOnline = new BehaviorSubject<boolean>(true);
  public canUndo = new BehaviorSubject<boolean>(false);
  public canRedo = new BehaviorSubject<boolean>(false);

  constructor(
    private _state: ZsMapStateService,
    private _sync: SyncService,
    private _session: SessionService,
    public i18n: I18NService,
    private geoAdminService: GeoadminService,
    private dialog: MatDialog,
  ) {
    _state
      .observeSelectedElement$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((element) => {
        if (element) {
          this.selectedFeature.next(element.getOlFeature() as Feature<SimpleGeometry>);
        } else {
          this.selectedFeature.next(undefined);
          this.toggleEditButtons(false);
        }
      });
    this.selectedFeatureCoordinates = this.selectedFeature.pipe(
      map((feature) => {
        const coords = this.getFeatureCoordinates(feature);
        return this.availableProjections[this.selectedProjectionIndex].translate(coords);
      }),
    );
    this.mouseProjection = this._state.getCoordinates().pipe(
      takeUntil(this._ngUnsubscribe),
      map((coords) => {
        const transform = this.transformToCurrentProjection(coords) ?? [];
        return this.availableProjections[this.selectedProjectionIndex].translate(transform);
      }),
    );

    this._session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline.next(isOnline);
      });

    this._state
      .observeShowCurrentLocation$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((show) => {
        this.isDevicePositionFlagVisible = show;
        if (!this._deviceTrackingLayer) return;

        if (!show) {
          this._sync.publishCurrentLocation(undefined);
        }

        // only track if the position flag is visible
        this._deviceTrackingLayer.setVisible(this.isDevicePositionFlagVisible);
        this._geolocation.setTracking(this.isDevicePositionFlagVisible);

        this._geolocation.on('change', () => {
          const coordinates = this._geolocation.getPosition();
          if (!coordinates) return;
          const longlat = transform(coordinates, this._view.getProjection(), 'EPSG:4326');
          this._sync.publishCurrentLocation({ long: longlat[0], lat: longlat[1] });
        });

        this._geolocation.once('change:position', () => {
          const coordinates = this._geolocation.getPosition();

          this._devicePositionFlagLocation = coordinates ? new Point(coordinates) : new Point([0, 0]);

          this._devicePositionFlag.setGeometry(this._devicePositionFlagLocation);
          this._devicePositionFlag.changed();
        });
      });

    this._state
      .observeCurrentMapCenter$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((coordinates) => {
        if (coordinates?.[0] && coordinates?.[1] && this._map) {
          this._map.getView().animate({
            center: transform(coordinates, 'EPSG:4326', 'EPSG:3857'),
            zoom: 14,
          });
        }
      });

    this._sync
      .observeConnections()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((connections) => {
        this.connectionCount.next(connections.length);
        if (this.existingCurrentLocations) {
          this._map.removeLayer(this.existingCurrentLocations);
        }
        const currentLocationFeatures: Feature<Point>[] = [];
        for (const connection of connections) {
          const currentLocation = connection.currentLocation;
          if (!currentLocation) continue;

          const coordinates = transform([currentLocation.long, currentLocation.lat], 'EPSG:4326', 'EPSG:3857');
          const locationFlag = new Feature({
            geometry: new Point(coordinates),
          });

          locationFlag.setStyle(
            new Style({
              image: new Icon({
                anchor: [0.5, 0.5],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: 'assets/img/person_pin.svg',
                scale: 2.5,
              }),
            }),
          );

          currentLocationFeatures.push(locationFlag);
        }

        if (currentLocationFeatures.length === 0) return;

        const navigationSource = new VectorSource({
          features: currentLocationFeatures,
        });
        this.existingCurrentLocations = new VectorLayer({
          source: navigationSource,
        });
        this.existingCurrentLocations.setZIndex(99999999999);
        this._map.addLayer(this.existingCurrentLocations);
      });
    combineLatest([
      this.selectedVertexPoint.asObservable(),
      this._state.observeSelectedElement$().pipe(
        filter(Boolean),
        // get feature each time the coordinates change
        switchMap((element) => element.observeCoordinates().pipe(map(() => element.getOlFeature()))),
        map((feature) => DrawStyle.getIconCoordinates(feature, this._view.getResolution() ?? 1)[1]),
      ),
    ])
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(([vertexPoint, featurePoint]) => {
        // prioritize vertexPoint
        const coordinates = vertexPoint ?? featurePoint;
        if (Array.isArray(coordinates)) {
          this.removeButton?.setPosition(coordinates);
          this.rotateButton?.setPosition(coordinates);
          this.copyButton?.setPosition(coordinates);
        }
      });

    this._state
      .observeMergeMode()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((mode) => {
        this._mergeMode = mode;
      });

    this._state.observeIsReadOnly().pipe(takeUntil(this._ngUnsubscribe)).subscribe(this.isReadOnly);

    this._state
      .observeHistory()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(({ canUndo, canRedo }) => {
        this.canUndo.next(canUndo);
        this.canRedo.next(canRedo);
      });
  }

  public ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public ngAfterViewInit(): void {
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
    this._state
      .observeSelectedFeature$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((element) => {
        if (!element) {
          select.getFeatures().clear();
        }
      });
    select.on('select', (event) => {
      this._modifyCache.clear();
      this.toggleEditButtons(false);
      for (const cluster of event.selected) {
        const feature = this.getFeatureInsideCluster(cluster);
        const nextElement = this._drawElementCache[feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];

        if (this._mergeMode) {
          const selectedElement = this._drawElementCache[this.selectedFeature.getValue()?.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];
          this._state.mergePolygons(selectedElement.element, nextElement.element);
        } else {
          if (feature && !feature.get('sig')?.protected) {
            this._modifyCache.push(feature);

            // Only add the cluster to the modify cache if we are in clustering mode
            if (feature !== cluster) {
              this._modifyCache.push(cluster);
            }
          }
          this._state.setSelectedFeature(feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID));
          // reset selectedVertexPoint, since we selected a whole feature.
          this.selectedVertexPoint.next(null);

          // only show buttons on select for Symbols
          if (!this.isReadOnly.getValue() && nextElement?.element?.elementState?.type === ZsMapDrawElementStateType.SYMBOL) {
            this.toggleEditButtons(true, true);
          }
        }
      }

      if (event.selected.length === 0) {
        this._state.resetSelectedFeature();
      }
    });

    this._modify = new Modify({
      features: this._modifyCache,
      condition: () => {
        if (!this.areFeaturesModifiable() || this.isReadOnly.getValue()) {
          this.toggleEditButtons(false);
          return false;
        }

        if (this._modify['vertexFeature_'] && this._modify['lastPointerEvent_']) {
          this.selectedVertexPoint.next(this._modify['vertexFeature_'].getGeometry().getCoordinates());
          this.toggleEditButtons(true);
        }
        return true;
      },
    });

    this._modify.on('modifystart', (event) => {
      this._currentSketch = this.getFeatureInsideCluster(event.features.getArray()[0]);
      this.toggleEditButtons(false);
    });

    this._modify.on('modifyend', (e) => {
      if (e.features.getLength() <= 0) {
        return;
      }

      this._currentSketch = undefined;
      // only first feature is relevant
      const feature = this.getFeatureInsideCluster(e.features.getArray()[0] as Feature<SimpleGeometry>);
      const element = this._drawElementCache[feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];
      element.element.setCoordinates(feature.getGeometry()?.getCoordinates() ?? []);
      if (this._modify['vertexFeature_']) {
        this.selectedVertexPoint.next(this._modify['vertexFeature_'].getGeometry().getCoordinates());
        this.toggleEditButtons(true);
      }
    });

    const translate = new Translate({
      features: this._modifyCache,
      condition: () => this.areFeaturesModifiable(),
    });

    translate.on('translatestart', () => {
      this.toggleEditButtons(false);
    });

    translate.on('translateend', (e) => {
      if (e.features.getLength() <= 0) {
        return;
      }
      // only the first feature is relevant
      const feature = this.getFeatureInsideCluster(e.features.getArray()[0]);
      const element = this._drawElementCache[feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID)];
      element.element.setCoordinates((feature.getGeometry() as SimpleGeometry).getCoordinates() as number[]);

      if (element.element.elementState?.type === ZsMapDrawElementStateType.SYMBOL) {
        // Hack to ensure, the buttons show up at the correct location immediately
        this.selectedVertexPoint.next(DrawStyle.getIconCoordinates(feature, this._view.getResolution() ?? 1)[1]);
        // Always allow rotation for symbols on translate end
        this.toggleEditButtons(true, true);
      } else {
        this.toggleEditButtons(true);
      }
    });

    this._view = new OlView({
      center: DEFAULT_COORDINATES, // will be overwritten once session is loaded via display state
      zoom: DEFAULT_ZOOM, // will be overwritten once session is loaded via display state
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

    this._map.on('singleclick', (event) => {
      if (this._map.hasFeatureAtPixel(event.pixel)) {
        const feature = this._map.forEachFeatureAtPixel(event.pixel, (feature) => feature, { hitTolerance: 10 });
        if (feature === this._positionFlag && !this.isReadOnly.getValue()) {
          this.setFlagButtonPosition(this._positionFlagLocation.getCoordinates());
          this.toggleFlagButtons(true);
        } else {
          this.toggleFlagButtons(false);
        }
      } else {
        this.toggleFlagButtons(false);
      }
    });

    this._devicePositionFlagLocation = _coords ? new Point(_coords) : new Point([0, 0]);
    this._devicePositionFlag = new Feature({
      geometry: this._devicePositionFlagLocation,
    });
    this._devicePositionFlag.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: '#3399CC',
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2,
          }),
        }),
      }),
    );

    const deviceTrackingSource = new VectorSource({
      features: [this._devicePositionFlag],
    });
    this._deviceTrackingLayer = new VectorLayer({
      source: deviceTrackingSource,
      visible: false,
    });
    this._deviceTrackingLayer.setZIndex(999999999999);
    this._map.addLayer(this._deviceTrackingLayer);

    this._map.on('moveend', () => {
      this._state.setMapCenter(this._view.getCenter() || [0, 0]);
    });

    this._map.on('pointermove', (event) => {
      this.mousePosition.next(event.pixel);
      this._state.setCoordinates(event.coordinate);
      let sketchSize: string | null = null;
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
      this._state.setMapZoom(this._view.getZoom() ?? 10);
    }, 500);

    this._view.on('change:resolution', () => {
      debouncedZoomSave();
    });

    this._state
      .observeMapCenter()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((center) => {
        if (!areArraysEqual(this._view.getCenter() || [0, 0], center)) {
          if (!center[0] && !center[1]) {
            center = DEFAULT_COORDINATES;
          }
          this._view.setCenter(center);
        }
      });

    this._state
      .observeMapZoom()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((zoom) => {
        if (this._view.getZoom() !== zoom) {
          if (!zoom) {
            zoom = DEFAULT_ZOOM;
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
      .subscribe(async (source) => {
        this._map.removeLayer(this._mapLayer);
        this._mapLayer = await ZsMapSources.get(source);
        this._map.addLayer(this._mapLayer);
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

    combineLatest([this._state.observeHiddenSymbols(), this._state.observeHiddenFeatureTypes(), this._state.observeHiddenCategories()])
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(([hiddenSymbols, hiddenFeatureTypes, hiddenCategories]) => {
        const hiddenSignIds = Signs.SIGNS.filter((sign) => sign.kat && hiddenCategories?.includes(sign.kat)).map((sig) => sig.id);
        for (const _el of Object.values(this._drawElementCache)) {
          if (!_el) continue;
          const feature = _el.element.getOlFeature();
          const filterType = _el.element.elementState?.type as string;
          const hidden =
            hiddenSymbols.includes(feature?.get('sig')?.id) ||
            hiddenFeatureTypes.includes(filterType) ||
            hiddenSignIds?.includes(feature?.get('sig')?.id);
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
                const newLayer = this._state.getLayer(layer ?? '');
                newLayer?.addOlFeature(feature);
              });
          }
        }

        // Removed old elements
        for (const element of Object.values(this._drawElementCache)) {
          if (elements.every((e) => e.getId() !== element.element.getId())) {
            // New elements do not contain element from cache
            this._state.getLayer(element.layer ?? '').removeOlFeature(element.element.getOlFeature());
            // skipcq: JS-0320
            delete this._drawElementCache[element.element.getId()];
          }
        }
      });

    this._state
      .observeSelectedFeatures$()
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
            // @ts-expect-error "we know the type is correct"
            this._featureLayerCache.set(feature.serverLayerName, layer);

            // observe feature changes
            this._state.observeFeature$(feature.serverLayerName).subscribe({
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
  }

  /**
   * Initializes the drawHole functionality for Polygons
   */
  initDrawHole() {
    this._drawHole = new DrawHole({
      // @ts-expect-error this is the correct type
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

    this.drawButton = new Overlay({
      element: this.drawElement._elementRef.nativeElement,
      positioning: 'center-center',
      offset: [30, 15],
    });

    this.closeButton = new Overlay({
      element: this.closeElement._elementRef.nativeElement,
      positioning: 'center-center',
      offset: [30, -45],
    });

    this.rotateButton.getElement()?.addEventListener('mousedown', () => this.startRotating());
    this.rotateButton.getElement()?.addEventListener('touchstart', () => this.startRotating());
    this.removeButton.getElement()?.addEventListener('click', () => this.removeFeature());
    this.copyButton.getElement()?.addEventListener('click', async () => {
      const coordinationGroup = await this.getCoordinationGroupOfLastPoint();
      this.toggleEditButtons(false);
      if (coordinationGroup) {
        await this.doCopySign(coordinationGroup?.feature);
      }
    });
    this.drawButton.getElement()?.addEventListener('click', () => this.toggleDrawingDialog());
    // hide position flag this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    this.closeButton.getElement()?.addEventListener('click', () => this.hidePositionFlag());

    this._map.addOverlay(this.removeButton);
    this._map.addOverlay(this.rotateButton);
    this._map.addOverlay(this.copyButton);
    this._map.addOverlay(this.drawButton);
    this._map.addOverlay(this.closeButton);
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
      } else if (coordinationGroup.otherCoordinationGroupCount === 0) {
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
        const newCoordinates: Coordinate[] = [];

        if (oldCoordinates) {
          for (let i = 0; i < oldCoordinates.length; i++) {
            if (i !== coordinationGroup.coordinateGroupIndex) {
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
            if (indexOfPointInCoordinateGroup(coordinateGroup, this.selectedVertexPoint.getValue() ?? []) !== -1) {
              return {
                feature,
                coordinateGroupIndex: i,
                otherCoordinationGroupCount: coordinates.length - 1,
                minimalAmountOfPoints: coordinateGroup.length <= 4,
              };
            }
          }
          return null;
        case 'LineString':
          return {
            feature,
            coordinateGroupIndex: null,
            otherCoordinationGroupCount: 0,
            minimalAmountOfPoints: coordinates.length <= 2,
          };
        case 'Point':
          return {
            feature,
            coordinateGroupIndex: null,
            otherCoordinationGroupCount: 0,
            minimalAmountOfPoints: true,
          };
        default:
          throw Error(`getCoordinationGroupOfLastPoint not implemented for type ${feature?.getGeometry()?.getType()}`);
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

  toggleEditButtons(show: boolean, allowRotation = false) {
    this.toggleButton(show, this.removeButton?.getElement());
    this.toggleButton(allowRotation, this.rotateButton?.getElement());
    this.toggleButton(allowRotation, this.copyButton?.getElement());
  }

  toggleFlagButtons(show: boolean) {
    this.toggleButton(show, this.drawButton?.getElement());
    this.toggleButton(show, this.closeButton?.getElement());
  }

  setFlagButtonPosition(coordinates: number[]) {
    this.drawButton?.setPosition(coordinates);
    this.closeButton?.setPosition(coordinates);
  }

  toggleButton(allow: boolean, el?: HTMLElement) {
    if (el) {
      el.style.display = allow && !this.isReadOnly.value ? 'block' : 'none';
    }
  }

  areFeaturesModifiable() {
    return (
      !this.isReadOnly.value &&
      this._modifyCache.getArray().every((clusterOrFeature) => {
        const feature = this.getFeatureInsideCluster(clusterOrFeature);

        // If the feature is a ZS DrawElement, ensure it's not protected
        // Else it's a cluster, ensure it's a cluster with a single feature
        if (clusterOrFeature.get(ZsMapOLFeatureProps.IS_DRAW_ELEMENT)) {
          return feature.get('sig') && !feature.get('sig').protected;
        } else {
          return (clusterOrFeature.get('features')?.length ?? 0) <= 1;
        }
      })
    );
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

  toggleDrawingDialog() {
    const posFlag = this._state.getCurrentPositionFlag();
    const coordinates = posFlag.coordinates;
    if (coordinates) {
      this._state.drawSignatureAtCoordinate(coordinates);
      this.toggleFlagButtons(false);
    }
  }

  hidePositionFlag() {
    this._state.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    this.toggleFlagButtons(false);
  }

  /**
   * If handed a cluster, returns the first feature inside the cluster
   * Else returns the feature itself
   */
  // skipcq:  JS-0105
  private getFeatureInsideCluster(feature?: FeatureLike) {
    if (feature?.get(ZsMapOLFeatureProps.IS_DRAW_ELEMENT)) {
      return feature;
    }

    const features = feature?.get('features');
    if (features?.length > 0) {
      return features[0];
    }
    return feature;
  }
}
