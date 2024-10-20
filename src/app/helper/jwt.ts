import { PermissionType } from '../session/session.interfaces';
import { jwtDecode } from 'jwt-decode';

export const decodeJWT = (jwt: string): { expired: boolean; operationId: number; permission: PermissionType } => {
  const token = jwtDecode<{ exp: number; operationId: number; permission: PermissionType }>(jwt);
  return { ...token, expired: token.exp < Date.now() / 1000 };
};
