import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapSymbolDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { Point } from 'ol/geom';
import { Fill, RegularShape, Style } from 'ol/style';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { Type } from 'ol/geom/Geometry';
import { checkCoordinates } from '../../helper/coordinates';
import { Sign } from 'src/app/core/entity/sign';
import { DrawStyle } from '../draw-style';

export class ZsMapSymbolDrawElement extends ZsMapBaseDrawElement<ZsMapSymbolDrawElementState> {
  protected _olPoint!: Point;
  protected _olStyles!: Style;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.SYMBOL);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates().subscribe((coordinates) => {
      if (this._olPoint && checkCoordinates(coordinates, this._olPoint.getCoordinates())) {
        // only update coordinates if they are not matching to prevent loops
        this._olPoint?.setCoordinates(coordinates as number[]);
      }
    });
  }

  protected _initialize(element: ZsMapSymbolDrawElementState): void {
    this._olPoint = new Point(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olPoint);
    this._olFeature.setStyle(this._olStyles);
    this._olFeature.set('sig', element.symbol);
    this._olStyles = DrawStyle.styleFunction(this._olFeature, 250);
    // handle changes on the map, eg. translate
    this._olFeature.on('change', () => {
      this.setCoordinates(this._olPoint?.getCoordinates());
    });
    this._isInitialized = true;
    return;
  }

  protected static override _getOlDrawType(): Type {
    return 'Point';
  }

  protected static override _parseFeature(feature: Feature<Point>, state: ZsMapStateService, layer: string, symbol: Sign): void {
    state.addDrawElement({
      type: ZsMapDrawElementStateType.SYMBOL,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer,
      symbol,
    });
  }
}
