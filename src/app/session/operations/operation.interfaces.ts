import { IZsMapState } from '../../state/interfaces';

export interface IZsMapOperation {
  id?: number;
  name: string;
  description: string;
  mapState: IZsMapState;
  status: 'active' | 'archived';
}

export interface IZsMapOrganization {
  id: number;
  name: string;
  mapLongitude: number;
  mapLatitude: number;
  mapZoomLevel: number;
  defaultLocale: string;
  url: string;
  logoUrl: string;
  mapXCoord: number;
  mapYCoord: number;
  operations: IZsMapOperation[];
  users: IZsMapUser[];
}

export interface IZsMapUser {
  id: number;
  username: string;
  email: string;
}
