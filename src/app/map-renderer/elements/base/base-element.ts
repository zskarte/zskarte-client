import { Feature } from 'ol';
import { from, Observable, Subject } from 'rxjs';
import { IZsMapBaseDrawElementState } from 'src/app/state/interfaces';
import { ZsMapStateService } from '../../../state/state.service';
import { ZsMapOLFeatureProps } from './ol-feature-props';

export abstract class ZsMapBaseElement<T> {
  private _layer!: string;
  protected _element!: Observable<T | undefined>;
  protected _olFeature: Feature = new Feature();
  protected _isInitialized = false;
  protected _unsubscribe = new Subject<void>();

  constructor(protected _id: string, protected _state: ZsMapStateService) {
    this._olFeature.set(ZsMapOLFeatureProps.DRAW_ELEMENT_ID, _id);
  }

  public getOlFeature(): Feature {
    return this._olFeature;
  }

  public getId(): string {
    return this._id;
  }

  protected abstract _initialize(element: IZsMapBaseDrawElementState): void;

  public observeElement(): Observable<T | undefined> {
    return from(this._element);
  }

  public unsubscribe(): void {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }
}
