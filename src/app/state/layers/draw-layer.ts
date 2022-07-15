import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZsMapBaseLayer } from './base-layer';
import { ZsMapTextDrawElement } from '../elements/text-draw-element';
import { ZsMapDrawElementStateType, ZsMapLayerState } from '../interfaces';
import { ZsMapStateService } from '../state.service';
import { v4 as uuidv4 } from 'uuid';
import { ZsMapLineDrawElement } from '../elements/line-draw-element';
import { ZsMapPolygonDrawElement } from '../elements/polygon-draw-element copy';
import { ZsMapSymbolDrawElement } from '../elements/symbol-draw-element';

export class ZsMapDrawLayer extends ZsMapBaseLayer {
  constructor(
    protected override _id: string,
    protected override _state: ZsMapStateService
  ) {
    super(_id, _state);
  }

  draw(type: ZsMapDrawElementStateType): void {
    this._state.cancelDrawing();
    this._state.drawElement(type, this._id);
  }
}
