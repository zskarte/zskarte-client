import { Observable } from 'rxjs';

export enum ZsMapInputType {
  TEXT = 'text',
  RANGE = 'range',
  CHECKBOX = 'checkbox',
  COLOR = 'color',
}

// TODO types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
