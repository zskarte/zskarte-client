import { Feature } from 'ol';
import { ZsMapDrawElementStateType, ZsMapElementToDraw, ZsMapTextDrawElementState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapBaseDrawElement } from './base/base-draw-element';
import { LineString, SimpleGeometry } from 'ol/geom';
import { Type } from 'ol/geom/Geometry';
import { ZsMapOLFeatureProps } from './base/ol-feature-props';
import { checkCoordinates } from 'src/app/helper/coordinates';

export class ZsMapTextDrawElement extends ZsMapBaseDrawElement<ZsMapTextDrawElementState> {
  protected _olGeometryItem!: SimpleGeometry;
  constructor(protected override _id: string, protected override _state: ZsMapStateService) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_TYPE, ZsMapDrawElementStateType.TEXT);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, this._id);
    this.observeCoordinates().subscribe((coordinates) => {
      if (this._olGeometryItem && checkCoordinates(coordinates, this._olGeometryItem.getCoordinates())) {
        // only update coordinates if they are not matching to prevent loops
        this._olGeometryItem?.setCoordinates(coordinates as number[]);
      }
    });
  }
  protected _initialize(element: ZsMapTextDrawElementState): void {
    this._olGeometryItem = new LineString(element.coordinates as number[]);
    this._olFeature.setGeometry(this._olGeometryItem);
    const textSign = {
      type: 'LineString',
      text: element.text,
      filterValue: 'text_element',
      src: null,
    };
    this._olFeature.set('sig', textSign);
    this._olFeature.on('change', () => {
      this.setCoordinates(this._olGeometryItem?.getCoordinates() ?? []);
    });
    this._isInitialized = true;
  }
  protected static override _getOlDrawType(): Type {
    return 'LineString';
  }
  protected static override _parseFeature(feature: Feature<LineString>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    state.addDrawElement({
      type: ZsMapDrawElementStateType.TEXT,
      layer: element.layer,
      text: element.text,
      coordinates: feature.getGeometry()?.getCoordinates(),
    });
  }
}
