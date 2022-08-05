import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapTextDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { Point } from 'ol/geom';
import { Type } from 'ol/geom/Geometry';

export class ZsMapTextDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
  }
  protected _initialize(): void {
    return;
  }
  protected static override _getOlDrawType(): Type {
    return 'Point';
  }
  protected static override _parseFeature(feature: Feature<Point>, state: ZsMapStateService, layer: string): void {
    state.addDrawElement({
      id: undefined,
      type: ZsMapDrawElementStateType.TEXT,
      layer,
      coordinates: feature.getGeometry()?.getCoordinates(),
    });
  }
}
