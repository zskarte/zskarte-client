import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapTextDrawElementState } from '../interfaces';
import { ZsMapStateService } from '../state.service';
import { ZsMapBaseDrawElement } from './base-draw-element';
import GeometryType from 'ol/geom/GeometryType';
import { Point } from 'ol/geom';
import { Fill, RegularShape, Style } from 'ol/style';
import { ZsMapOLFeatureProps } from './ol-feature-props';

export class ZsMapSymbolDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  protected _olPoint: Point | undefined;
  protected _olStyles: Style | undefined;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.SYMBOL);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates().subscribe((coordinates) => {
      if (this._olPoint && coordinates && coordinates !== this._olPoint.getCoordinates()) {
        this._olPoint?.setCoordinates(coordinates);
      }
    });
  }

  protected _initialize(coordinates: number[] | number[][]): void {
    this._olPoint = new Point(coordinates as number[]);
    this._olStyles = new Style({
      image: new RegularShape({
        fill: new Fill({ color: 'red' }),
        points: 4,
        radius: 10,
        angle: Math.PI / 4,
      }),
    });
    this._olFeature.setGeometry(this._olPoint);
    this._olFeature.setStyle(this._olStyles);

    // handle changes on the map, eg. translate
    this._olFeature.on('change', () => {
      console.log('TODO update coordinates', this._olPoint?.getCoordinates());
      this.setCoordinates(this._olPoint?.getCoordinates());
    });
    this._isInitialized = true;
    return;
  }
  protected static override _getOlDrawType(): string {
    return GeometryType.POINT;
  }
  protected static override _parseFeature(feature: Feature<Point>, state: ZsMapStateService, layer: string): void {
    state.addDrawElement({
      type: ZsMapDrawElementStateType.SYMBOL,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer,
      // TODO add overwrite props
      symbol: {
        id: 'TODO',
      },
    });
  }
}
