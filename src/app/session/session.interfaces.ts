export interface IZsMapSession {
  id: string;
  auth: IAuthResult;
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
