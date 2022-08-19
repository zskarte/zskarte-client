import { Feature } from 'ol';
import {
  IZsMapBaseDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapElementToDraw,
  ZsMapFreehandDrawElementState,
} from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString } from 'ol/geom';
import Geometry, { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import VectorSource from 'ol/source/Vector';
import { Draw } from 'ol/interaction';

export class ZsMapFreehandDrawElement extends ZsMapBaseDrawElement<ZsMapFreehandDrawElementState> {
  protected _olLine!: LineString;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.LINE);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates().subscribe((coordinates) => {
      this._olLine?.setCoordinates(coordinates as number[][]);
    });
  }
  protected _initialize(element: IZsMapBaseDrawElementState): void {
    this._olLine = new LineString(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olLine);
    this._olFeature.set('sig', {
      type: 'LineString',
      src: null,
      freehand: true,
      filterValue: 'free_hand_element',
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
    state.addDrawElement({
      type: ZsMapDrawElementStateType.LINE,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer: element.layer,
    });
  }

  public static override getOlDrawHandler(state: ZsMapStateService, element: ZsMapElementToDraw): Draw {
    const draw = new Draw(
      this._enhanceOlDrawOptions({
        source: new VectorSource({ wrapX: false }),
        type: 'LineString',
        freehand: true,
      }),
    );
    draw.on('drawend', (event) => {
      this._parseFeature(event.feature as Feature<LineString>, state, element);
    });
    return draw;
  }
}
