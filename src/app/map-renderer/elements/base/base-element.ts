import { Feature } from 'ol';
import { Observable } from 'rxjs';
import { IZsMapBaseDrawElementState } from 'src/app/state/interfaces';
import { ZsMapStateService } from '../../../state/state.service';
import { ZsMapOLFeatureProps } from './ol-feature-props';

export abstract class ZsMapBaseElement<T> {
  private _layer!: string;
  protected _element!: Observable<T | undefined>;
  protected _olFeature: Feature = new Feature();
  protected _isInitialized = false;

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
}
