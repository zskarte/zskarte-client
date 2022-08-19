import { IZsMapState } from '../../state/interfaces';

export interface IZsMapOperation {
  id: number;
  name: string;
  description: string;
  mapState: IZsMapState;
  status: 'active' | 'archived';
}
