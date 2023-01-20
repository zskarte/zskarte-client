import { Locale } from '../state/i18n.service';

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  ALL = 'all',
}

export interface IZsMapSession {
  id: string;
  permission?: PermissionType;
  operationId?: number;
  operationName?: string;
  operationDescription?: string;
  organizationLogo?: string;
  organizationId?: number;
  jwt?: string;
  locale: Locale;
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultZoomLevel?: number;
}

export interface IZso {
  name: string;
  identifier: string;
  logoSrc?: string;
  logoSrcSet?: string;
}

export interface IAuthResult {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    provider: string;
    confirmed: boolean;
    blocked: boolean;
    createdAt: string;
  };
}
