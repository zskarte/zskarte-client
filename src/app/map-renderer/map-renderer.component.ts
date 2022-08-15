import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Draw, Select, Translate, defaults } from 'ol/interaction';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlTileLayer from 'ol/layer/Tile';
import { Subject, takeUntil } from 'rxjs';
import { ZsMapBaseDrawElement } from './elements/base/base-draw-element';
import { ZsMapOLFeatureProps } from './elements/base/ol-feature-props';
import { areArraysEqual } from '../helper/array';
import { DrawElementHelper } from '../helper/draw-element-helper';
import { ZsMapBaseLayer } from './layers/base-layer';
import { ZsMapSources } from '../state/map-sources';
import { ZsMapStateService } from '../state/state.service';
import { debounce } from '../helper/debounce';
import { I18NService } from '../core/i18n.service';
import { SidebarContext } from '../state/interfaces';
import { GeoFeature } from '../core/entity/geoFeature';

@Component({
  selector: 'app-map-renderer',
  templateUrl: './map-renderer.component.html',
  styleUrls: ['./map-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapRendererComponent implements AfterViewInit {
  @ViewChild('mapElement') mapElement!: ElementRef;

  sidebarContext = SidebarContext;

  private _ngUnsubscribe = new Subject<void>();
  private _map!: OlMap;
  private _view!: OlView;
  private _mapLayer = new OlTileLayer({
    zIndex: 0,
  });
  private _layerCache: Record<string, ZsMapBaseLayer> = {};
  private _drawElementCache: Record<string, { layer: string | undefined; element: ZsMapBaseDrawElement }> = {};
  private _currentDrawInteraction: Draw | undefined;
  private _featureLayerCache: GeoFeature[] = [];

  constructor(private _state: ZsMapStateService, public i18n: I18NService) {}

  public ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public ngAfterViewInit(): void {
    // TODO
    const select = new Select({
      style: null,
      hitTolerance: 10,
    });
    select.on('select', (event) => {
      for (const feature of event.selected) {
        console.log('selected element', {
          isDrawElement: feature.get(ZsMapOLFeatureProps.IS_DRAW_ELEMENT),
          type: feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE),
          id: feature.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID),
        });
        // TODO write to display state selectedDrawElements
      }
    });

    // TODO
    const translate = new Translate({
      features: select.getFeatures(),
    });

    this._view = new OlView({
      center: [849861.97, 5905812.55], // TODO get from newly implemented session
      zoom: 16, // TODO get from newly implemented session
    });

    this._map = new OlMap({
      target: this.mapElement.nativeElement,
      view: this._view,
      controls: [],
      interactions: defaults({
        doubleClickZoom: false,
        pinchRotate: false,
        shiftDragZoom: false,
      }).extend([select, translate]),
    });

    this._map.on('moveend', () => {
      this._state.setMapCenter(this._view.getCenter() || [0, 0]);
    });

    const debouncedZoomSave = debounce(() => {
      this._state.setMapZoom(this._view.getZoom() || 10);
    }, 1000);

    this._view.on('change:resolution', () => {
      debouncedZoomSave();
    });

    this._state.observeMapCenter().subscribe((center) => {
      if (!areArraysEqual(this._view.getCenter() || [0, 0], center)) {
        // TODO implement proper fallback center
        if (!center[0] && !center[1]) {
          center = [849861.97, 5905812.55];
        }
        this._view.setCenter(center);
      }
    });

    this._state.observeMapZoom().subscribe((zoom) => {
      if (this._view.getZoom() !== zoom) {
        // TODO implement proper fallback zoom
        if (!zoom) {
          zoom = 16;
        }
        this._view.setZoom(zoom);
      }
    });

    this._map.addLayer(this._mapLayer);

    this._state.observeElementToDraw().subscribe((element) => {
      if (element) {
        const interaction = DrawElementHelper.createDrawHandlerForType(element.type, this._state, element.layer);
        interaction.on('drawend', () => {
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
            this._map.addLayer(layer.getOlLayer());
          }
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
            // TODO unsubscribing
            element.observeLayer().subscribe((layer) => {
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
      });

    this._state
      .observeSelectedFeatures()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((features) => {
        // removed features
        this._featureLayerCache
          .filter((feature) => !features.includes(feature))
          .forEach((feature) => {
            this._map.removeLayer(feature.layer);
          });

        // added features
        features
          .filter((el) => !this._featureLayerCache.includes(el))
          .forEach((feature) => {
            this._map.addLayer(feature.layer);
          });

        this._featureLayerCache = features;
      });
  }

  zoomIn() {
    this._state.updateMapZoom(1);
  }

  zoomOut() {
    this._state.updateMapZoom(-1);
  }

  setSidebarContext(context: SidebarContext) {
    this._state.toggleSidebarContext(context);
  }
}
