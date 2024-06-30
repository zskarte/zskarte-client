import { Locale } from '../state/i18n.service';
import { IZsMapOperation, IZsMapOrganization } from './operations/operation.interfaces';

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  ALL = 'all',
}

export enum AccessTokenType {
  LONG = 'long',
  SHORT = 'short',
}
export interface IZsAccess {
  id: string;
  accessToken: string;
  type: PermissionType;
}

export interface IZsMapSession {
  id: string;
  permission?: PermissionType;
  operation?: IZsMapOperation;
  organization?: IZsMapOrganization;
  organizationLogo?: string;
  label?: string;
  jwt?: string;
  locale: Locale;
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultZoomLevel?: number;
  workLocal?: boolean;
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
