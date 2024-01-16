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
import { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import VectorSource from 'ol/source/Vector';
import { Draw } from 'ol/interaction';
import { takeUntil } from 'rxjs';

export class ZsMapFreehandDrawElement extends ZsMapBaseDrawElement<ZsMapFreehandDrawElementState> {
  protected _olLine!: LineString;
  constructor(
    protected override _id: string,
    protected override _state: ZsMapStateService,
  ) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.LINE);
    this.observeCoordinates()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((coordinates) => {
        this._olLine?.setCoordinates(coordinates as number[][]);
      });
  }
  protected _initialize(element: IZsMapBaseDrawElementState): void {
    this._olLine = new LineString(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olLine);
    return;
  }
  protected static override _getOlDrawType(): Type {
    return 'LineString';
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    const drawElement = state.addDrawElement({
      type: ZsMapDrawElementStateType.LINE,
      coordinates: feature.getGeometry()?.getCoordinates() || [],
      layer: element.layer,
    });
    state.setSelectedFeature(drawElement?.id);
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
