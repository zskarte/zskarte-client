export interface IZsMapSession {
  id: string;
  operationId: number | undefined;
  auth: IAuthResult;
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
