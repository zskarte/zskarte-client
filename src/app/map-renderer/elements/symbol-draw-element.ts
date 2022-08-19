import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapElementToDraw, ZsMapSymbolDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString, Point, Polygon, SimpleGeometry } from 'ol/geom';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { Type } from 'ol/geom/Geometry';
import { areCoordinatesEqual } from '../../helper/coordinates';
import { StyleLike } from 'ol/style/Style';
import { Signs } from '../signs';
import { takeUntil } from 'rxjs';

export class ZsMapSymbolDrawElement extends ZsMapBaseDrawElement<ZsMapSymbolDrawElementState> {
  protected _olGeometryItem!: SimpleGeometry;
  protected _olStyles!: StyleLike;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.SYMBOL);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((coordinates) => {
        this._olGeometryItem?.setCoordinates(coordinates as number[]);
      });
  }

  protected _initialize(element: ZsMapSymbolDrawElementState): void {
    const symbol = Signs.getSignById(element.symbolId);

    switch (symbol?.type) {
      case 'LineString':
        this._olGeometryItem = new LineString(element.coordinates);
        break;
      case 'Polygon':
        this._olGeometryItem = new Polygon(element.coordinates as number[]);
        break;
      default:
        this._olGeometryItem = new Point(element.coordinates as number[]);
        break;
    }

    this._olFeature.setGeometry(this._olGeometryItem);
    this._olFeature.set('sig', Signs.getSignById(element.symbolId));
    // handle changes on the map, eg. translate
    this._olFeature.on('change', () => {
      this.setCoordinates(this._olGeometryItem?.getCoordinates() ?? []);
    });
    this._isInitialized = true;
    return;
  }

  protected static override _getOlDrawType(symbolId?: number): Type {
    const symbol = Signs.getSignById(symbolId);
    return (symbol?.type as Type) ?? 'Point';
  }

  protected static override _parseFeature(feature: Feature<Point>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    state.addDrawElement({
      type: ZsMapDrawElementStateType.SYMBOL,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer: element.layer,
      symbolId: element.symbolId,
    });
  }
}
