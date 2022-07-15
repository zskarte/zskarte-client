import { Feature } from 'ol';
import { Observable } from 'rxjs';
import {
  ZsMapDrawElementStateType,
  ZsMapTextDrawElementState,
} from '../interfaces';
import { ZsMapStateService } from '../state.service';
import { ZsMapBaseDrawElement } from './base-draw-element';
import GeometryType from 'ol/geom/GeometryType';
import { Point } from 'ol/geom';

export class ZsMapTextDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  constructor(
    protected override _id: string,
    protected override _state: ZsMapStateService
  ) {
    super(_id, _state);
  }
  protected _initialize(): void {
    return;
  }
  protected static override _getOlDrawType(): string {
    return GeometryType.POINT;
  }
  protected static override _parseFeature(
    feature: Feature<Point>,
    state: ZsMapStateService,
    layer: string
  ): void {
    state.addDrawElement({
      id: undefined,
      type: ZsMapDrawElementStateType.TEXT,
      layer,
      coordinates: feature.getGeometry()?.getCoordinates(),
    });
  }
}
