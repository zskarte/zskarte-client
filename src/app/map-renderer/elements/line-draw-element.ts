import { Feature } from 'ol';
import {
  IZsMapBaseDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapElementToDraw,
  ZsMapTextDrawElementState,
} from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString } from 'ol/geom';
import { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { takeUntil } from 'rxjs';

export class ZsMapLineDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  protected _olLine!: LineString;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.LINE);
    this.observeCoordinates()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((coordinates) => {
        this._olLine?.setCoordinates(coordinates as number[][]);
      });
  }
  protected _initialize(element: IZsMapBaseDrawElementState): void {
    this._olLine = new LineString(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olLine);
    this._olFeature.set('sig', {
      type: 'LineString',
      src: null,
      filterValue: 'not_labeled_line',
    });
    this._olFeature.on('change', () => {
      this.setCoordinates(this._olLine.getCoordinates());
    });
    this._isInitialized = true;
    return;
  }
  protected static override _getOlDrawType(): Type {
    return 'LineString';
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    const drawElement = state.addDrawElement({
      type: ZsMapDrawElementStateType.LINE,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer: element.layer,
    });
    state.setSelectedFeature(drawElement?.id);
  }
}
