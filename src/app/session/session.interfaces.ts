export interface IZsMapSession {
  id: string;
  operationId: number | undefined;
  organizationId: number | undefined;
  auth: IAuthResult;
  guestLoginDateTime?: Date | undefined;
  locale: string;
}

export interface IZso {
  name: string;
  identifier: string;
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
