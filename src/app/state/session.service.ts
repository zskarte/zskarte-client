import { Injectable } from '@angular/core';
import { IZsSession } from '../core/entity/session';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsSession>(this._getDefaultSession());

  public saveSession(session: IZsSession) {
    localStorage.setItem('session_' + session.uuid, JSON.stringify(session));
  }

  public getSession(sessionId: string) {
    return localStorage.getItem('session_' + sessionId);
  }

  public removeSession(sessionId: string) {
    localStorage.removeItem('session_' + sessionId);
  }

  public observeIsGuest(): Observable<boolean> {
    return this._session.pipe(map((session) => session.isGuest));
  }

  public getAllSessions() {
    const result: IZsSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith('session_')) {
        result.push(JSON.parse(localStorage.getItem(key) || '{}'));
      }
    }
    return result;
  }

  private _getDefaultSession(): IZsSession {
    return {
      title: '',
      isGuest: true,
      uuid: '',
      zsoId: '',
      startDateTime: new Date(),
    };
  }
}
