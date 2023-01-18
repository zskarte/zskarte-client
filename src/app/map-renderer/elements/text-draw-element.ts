import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapElementToDraw, ZsMapTextDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString, SimpleGeometry } from 'ol/geom';
import { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { takeUntil } from 'rxjs';

export class ZsMapTextDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  protected _olGeometryItem!: SimpleGeometry;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.TEXT);
    this.observeCoordinates()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((coordinates) => {
        this._olGeometryItem?.setCoordinates(coordinates as number[]);
      });
  }
  protected _initialize(element: ZsMapTextDrawElementState): void {
    this._olGeometryItem = new LineString(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olGeometryItem);
  }
  protected static override _getOlDrawType(): Type {
    return 'LineString';
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    const drawElement = state.addDrawElement({
      type: ZsMapDrawElementStateType.TEXT,
      layer: element.layer,
      text: element.text,
      coordinates: feature.getGeometry()?.getCoordinates(),
    });
    state.setSelectedFeature(drawElement?.id);
  }
}
