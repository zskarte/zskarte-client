import { Feature } from 'ol';
import { ZsMapTextDrawElementState } from '../interfaces';
import { ZsMapStateService } from '../state.service';
import { ZsMapBaseDrawElement } from './base-draw-element';
import GeometryType from 'ol/geom/GeometryType';
import { Polygon } from 'ol/geom';

export class ZsMapPolygonDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
  }
  protected _initialize(): void {
    return;
  }
  protected static override _getOlDrawType(): string {
    return GeometryType.POLYGON;
  }
  protected static override _parseFeature(feature: Feature<Polygon>, state: ZsMapStateService, layer: string): void {
    console.log('polygon drawn', feature.getGeometry()?.getCoordinates(), state, layer);
  }
}
