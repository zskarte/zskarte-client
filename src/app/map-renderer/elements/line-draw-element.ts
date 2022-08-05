import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapTextDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString } from 'ol/geom';
import { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { checkCoordinates } from '../../helper/coordinates';

export class ZsMapLineDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  protected _olLine!: LineString;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.LINE);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates().subscribe((coordinates) => {
      if (this._olLine && checkCoordinates(coordinates, this._olLine.getCoordinates())) {
        // only update coordinates if they are not matching to prevent loops
        this._olLine?.setCoordinates(coordinates as number[][]);
      }
    });
  }
  protected _initialize(coordinates: number[] | number[][]): void {
    this._olLine = new LineString(coordinates);
    this._olFeature.setGeometry(this._olLine);
    this._olFeature.on('change', () => {
      this.setCoordinates(this._olLine.getCoordinates());
    });
    this._isInitialized = true;
    return;
  }
  protected static override _getOlDrawType(): Type {
    return 'LineString';
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, layer: string): void {
    state.addDrawElement({
      type: ZsMapDrawElementStateType.LINE,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer,
    });
  }
}
