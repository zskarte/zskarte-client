import { Draw } from 'ol/interaction';
import { Sign } from '../core/entity/sign';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { ZsMapLineDrawElement } from '../map-renderer/elements/line-draw-element';
import { ZsMapPolygonDrawElement } from '../map-renderer/elements/polygon-draw-element';
import { ZsMapSymbolDrawElement } from '../map-renderer/elements/symbol-draw-element';
import { ZsMapTextDrawElement } from '../map-renderer/elements/text-draw-element';
import { ZsMapDrawElementStateType } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';

export class DrawElementHelper {
  public static createDrawHandlerForType(type: ZsMapDrawElementStateType, state: ZsMapStateService, layer: string, symbol?: Sign): Draw {
    switch (type) {
      case ZsMapDrawElementStateType.TEXT:
        return ZsMapTextDrawElement.getOlDrawHandler(state, layer, symbol);
      case ZsMapDrawElementStateType.POLYGON:
        return ZsMapPolygonDrawElement.getOlDrawHandler(state, layer, symbol);
      case ZsMapDrawElementStateType.LINE:
        return ZsMapLineDrawElement.getOlDrawHandler(state, layer, symbol);
      case ZsMapDrawElementStateType.SYMBOL:
        return ZsMapSymbolDrawElement.getOlDrawHandler(state, layer, symbol);
    }
    throw new Error(`Could not create draw handler for type ${type}`);
  }

  public static createInstance(id: string, state: ZsMapStateService): ZsMapBaseDrawElement {
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

    throw new Error(`Could not create instance handler for draw element ${JSON.stringify(element)}`);
  }
}
