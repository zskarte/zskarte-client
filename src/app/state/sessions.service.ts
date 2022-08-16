import { Injectable } from '@angular/core';
import {IZsSession} from "../core/entity/session";

@Injectable({
  providedIn: 'root',
})
export class SessionsService {
  constructor() {}

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
}
