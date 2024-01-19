import { ZsMapBaseLayer } from './base-layer';
import { ZsMapDrawElementStateType } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';

export class ZsMapDrawLayer extends ZsMapBaseLayer {
  constructor(
    protected override _id: string,
    protected override _state: ZsMapStateService,
  ) {
    super(_id, _state);
  }

  draw(type: ZsMapDrawElementStateType, options: { symbolId?: number; text?: string }): void {
    this._state.cancelDrawing();
    this._state.drawElement({ type, layer: this._id, ...options });
  }
}
