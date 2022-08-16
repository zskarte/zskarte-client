import { BehaviorSubject } from 'rxjs';

export interface IZsSession {
  title: string;
  uuid: string;
  zsoId: string;
  startDateTime: Date;
}

export interface IZsSessionState {
  session: BehaviorSubject<IZsSession>;
  isOutdated(): boolean;
}
