import { Draw } from 'ol/interaction';
import { ZsMapBaseDrawElement } from '../state/elements/base-draw-element';
import { ZsMapBaseElement } from '../state/elements/base-element';
import { ZsMapLineDrawElement } from '../state/elements/line-draw-element';
import { ZsMapPolygonDrawElement } from '../state/elements/polygon-draw-element copy';
import { ZsMapSymbolDrawElement } from '../state/elements/symbol-draw-element';
import { ZsMapTextDrawElement } from '../state/elements/text-draw-element';
import { ZsMapDrawElementStateType } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';

export class DrawElementHelper {
  public static createDrawHandlerForType(
    type: ZsMapDrawElementStateType,
    state: ZsMapStateService,
    layer: string
  ): Draw {
    switch (type) {
      case ZsMapDrawElementStateType.TEXT:
        return ZsMapTextDrawElement.getOlDrawHandler(state, layer);
      case ZsMapDrawElementStateType.POLYGON:
        return ZsMapPolygonDrawElement.getOlDrawHandler(state, layer);
      case ZsMapDrawElementStateType.LINE:
        return ZsMapLineDrawElement.getOlDrawHandler(state, layer);
      case ZsMapDrawElementStateType.SYMBOL:
        return ZsMapSymbolDrawElement.getOlDrawHandler(state, layer);
    }
    throw new Error(`Could not create draw handler for type ${type}`);
  }

  public static createInstance(
    id: string,
    state: ZsMapStateService
  ): ZsMapBaseDrawElement {
    const element = state.getDrawElementState(id);
    if (element && element.type && element.id) {
      switch (element?.type) {
        case ZsMapDrawElementStateType.TEXT:
          return new ZsMapTextDrawElement(element.id, state);
        case ZsMapDrawElementStateType.POLYGON:
          return new ZsMapPolygonDrawElement(element.id, state);
        case ZsMapDrawElementStateType.LINE:
          return new ZsMapLineDrawElement(element.id, state);
        case ZsMapDrawElementStateType.SYMBOL:
          return new ZsMapSymbolDrawElement(element.id, state);
      }
    }

    throw new Error(
      `Could not create instance handler for draw element ${JSON.stringify(
        element
      )}`
    );
  }
}
