import { Locale } from '../state/i18n.service';

export interface IZsMapSession {
  id: string;
  operationId?: number;
  operationName?: string;
  operationDescription?: string;
  organizationLogo?: string;
  organizationId?: number;
  jwt?: string;
  locale: Locale;
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
