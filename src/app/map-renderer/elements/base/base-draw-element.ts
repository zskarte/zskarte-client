import { Feature } from 'ol';
import { Observable } from 'rxjs';
import { IZsMapBaseDrawElementState, ZsMapDrawElementState, ZsMapElementToDraw } from '../../../state/interfaces';
import { ZsMapStateService } from '../../../state/state.service';
import { ZsMapBaseElement } from './base-element';
import { Draw } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import { Options } from 'ol/interaction/Draw';
import { Geometry } from 'ol/geom';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ZsMapOLFeatureProps } from './ol-feature-props';
import { Type } from 'ol/geom/Geometry';
import { areCoordinatesEqual } from '../../../helper/coordinates';
import { debounce } from '../../../helper/debounce';
import { Signs } from '../../signs';

export abstract class ZsMapBaseDrawElement<T extends ZsMapDrawElementState = ZsMapDrawElementState> extends ZsMapBaseElement<T> {
  public elementState?: T;

  constructor(
    protected override _id: string,
    protected override _state: ZsMapStateService,
  ) {
    super(_id, _state);
    this._olFeature.set(ZsMapOLFeatureProps.IS_DRAW_ELEMENT, true);
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, _id);
    this._element = this._state.observeMapState().pipe(
      map((o) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return o.drawElements?.find((o) => o.id === this._id) as any;
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
    this._element.pipe(takeUntil(this._unsubscribe)).subscribe((element) => {
      if (!element) {
        this.unsubscribe();
        return;
      }
      this._setSignatureState(element);
    });
  }

  private _setSignatureState(state: T | undefined) {
    this.elementState = state;
    if (!state) return;
    const symbol = Signs.getSignById(state.symbolId) ?? {};
    const sig = this._olFeature.get('sig');
    this._olFeature.set('sig', {
      ...sig,
      ...symbol,
      label: state.name,
      labelShow: state.nameShow,
      color: state.color,
      createdBy: state.createdBy,
      protected: state.protected,
      iconSize: state.iconSize,
      hideIcon: state.hideIcon,
      iconOffset: state.iconOffset,
      flipIcon: state.flipIcon,
      rotation: state.rotation,
      iconOpacity: state.iconOpacity,
      style: state.style,
      arrow: state.arrow,
      strokeWidth: state.strokeWidth,
      fillStyle: { ...state.fillStyle },
      fillOpacity: state.fillOpacity,
      fontSize: state.fontSize,
      text: state['text'],
      zindex: state.zindex,
      reportNumber: state.reportNumber,
      affectedPersons: state.affectedPersons,
    });
  }

  private _doInitialize(element: IZsMapBaseDrawElementState): void {
    if (!this._isInitialized) {
      this._initialize(element);
      this._setSignatureState(element as T);
    }

    this._isInitialized = true;
  }

  public observeCoordinates(): Observable<number[] | number[][] | undefined> {
    return this._element.pipe(
      map((o) => {
        if (o?.coordinates) {
          this._doInitialize(o);
        }
        return o?.coordinates;
      }),
      distinctUntilChanged((x, y) => areCoordinatesEqual(x, y)),
      takeUntil(this._unsubscribe),
    );
  }

  private _debouncedUpdateElementState = debounce((updateFn: (draft: ZsMapDrawElementState) => void) => {
    this._state.updateMapState((draft) => {
      const element = draft.drawElements?.find((o) => o.id === this._id);
      if (element) {
        updateFn(element);
      }
    });
  }, 250);

  public updateElementState(updateFn: (draft: ZsMapDrawElementState) => void) {
    this._debouncedUpdateElementState(updateFn);
  }

  public setCoordinates(coordinates: number[] | number[][] | undefined): void {
    this._debouncedUpdateElementState((draft: ZsMapDrawElementState) => {
      draft.coordinates = coordinates;
    });
  }

  public observeLayer(): Observable<string | undefined> {
    return this._element.pipe(
      map((o) => {
        return o?.layer;
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
  }

  // static handlers for drawing
  public static getOlDrawHandler(state: ZsMapStateService, element: ZsMapElementToDraw): Draw {
    const draw = new Draw(
      this._enhanceOlDrawOptions({
        source: new VectorSource({ wrapX: false }),
        type: this._getOlDrawType(element.symbolId),
      }),
    );
    draw.on('drawend', (event) => {
      this._parseFeature(event.feature, state, element);
    });
    return draw;
  }
  protected static _getOlDrawType(symbolId?: number): Type {
    throw new Error(`static fn _getOlDrawType is not implemented ${symbolId}`);
  }
  protected static _enhanceOlDrawOptions(options: Options) {
    return options;
  }
  protected static _parseFeature(event: Feature<Geometry>, state: ZsMapStateService, element: ZsMapElementToDraw): void {
    console.error('static fn _parseFeature is not implemented', { event, state, element });
    throw new Error('static fn _parseFeature is not implemented');
  }
}
