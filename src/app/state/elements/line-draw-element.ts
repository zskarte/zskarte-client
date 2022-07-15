import { Feature } from 'ol';
import { ZsMapTextDrawElementState } from '../interfaces';
import { ZsMapStateService } from '../state.service';
import { ZsMapBaseDrawElement } from './base-draw-element';
import GeometryType from 'ol/geom/GeometryType';
import { LineString } from 'ol/geom';

export class ZsMapLineDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
  }
  protected _initialize(): void {
    return;
  }
  protected static override _getOlDrawType(): string {
    return GeometryType.LINE_STRING;
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, layer: string): void {
    console.log('line drawn', feature, feature.getGeometry(), state, layer);
  }
}
