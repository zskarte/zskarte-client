import { Observable } from 'rxjs';

export enum ZsMapInputType {
  TEXT = 'text',
  RANGE = 'range',
  CHECKBOX = 'checkbox',
  COLOR = 'color',
}

// TODO generics
export interface ZsMapInput<T = any> {
  label: string;
  observer: Observable<T>;
  setter: (name: string) => void;
}

export interface IZsMapDrawElementUi {
  symbol?: ZsMapInput;
  name?: ZsMapInput;
  fixedPosition?: ZsMapInput;
  groups: [{ name: string; inputs: ZsMapInput[] }];
}
