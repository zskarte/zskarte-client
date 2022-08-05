import { Feature } from 'ol';
import { Observable } from 'rxjs';
import { ZsMapStateService } from '../../../state/state.service';

export abstract class ZsMapBaseElement<T> {
  private _layer!: string;
  protected _element!: Observable<T | undefined>;
  protected _olFeature: Feature = new Feature();
  protected _isInitialized = false;
  constructor(protected _id: string, protected _state: ZsMapStateService) {}

  public getOlFeature(): Feature {
    return this._olFeature;
  }

  public getId(): string {
    return this._id;
  }

  protected abstract _initialize(coordinates: number[] | number[][] | undefined): void;
}
