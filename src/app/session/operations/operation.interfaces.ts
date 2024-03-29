import { IZsMapState } from '../../state/interfaces';

export interface IZsMapOperation {
  id?: number;
  name: string;
  description: string;
  mapState: IZsMapState;
  eventStates: number[];
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
  logo: IZsStrapiAsset;
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

export interface UZsStrapiAssetFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export interface IZsStrapiAsset extends UZsStrapiAssetFormat {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width: number;
  formats?: {
    large?: UZsStrapiAssetFormat;
    medium?: UZsStrapiAssetFormat;
    small?: UZsStrapiAssetFormat;
    thumbnail?: UZsStrapiAssetFormat;
  };
  height: number;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}
