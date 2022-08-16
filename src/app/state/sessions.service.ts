import { Injectable } from '@angular/core';
import { IZsSession, IZsSessionState } from '../core/entity/session';
import {BehaviorSubject, Observable} from 'rxjs';
import produce from 'immer';

@Injectable({
  providedIn: 'root',
})
export class SessionsService {
  private _session = new BehaviorSubject<IZsSessionState>(produce<IZsSessionState>(this._getDefaultSessionState(), (draft) => draft));

  public saveSession(session: IZsSession) {
    localStorage.setItem('session_' + session.uuid, JSON.stringify(session));
  }

  public getSession(sessionId: string) {
    return localStorage.getItem('session_' + sessionId);
  }

  public removeSession(sessionId: string) {
    localStorage.removeItem('session_' + sessionId);
  }

  public getAllSessions() {
    const result: IZsSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // @ts-ignore
      if (key.startsWith('session_')) {
        // @ts-ignore
        result.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return result;
  }

  private _getDefaultSessionState(): IZsSessionState {
    return {
      session: new BehaviorSubject<IZsSession>({
        title: '',
        uuid: '',
        zsoId: '',
        startDateTime: new Date(),
      }),
      isOutdated(): boolean {
        return false;
        //return Math.abs(this.session.start - new Date()) > 0;
      },
    };
  }
}
