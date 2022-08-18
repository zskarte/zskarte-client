import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { db } from '../db/db';
import { IAuthResult, IZsMapSession } from './session.interfaces';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import jwtDecode from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsMapSession | undefined>(undefined);

  constructor(private _http: HttpClient, private _router: Router, private _api: ApiService) {}

  public async loadSavedSession(): Promise<void> {
    const sessions = await db.table('session').toArray();
    if (sessions.length === 1) {
      this._session.next(sessions[0]);
      return;
    }
    if (sessions.length > 1) {
      await db.table('session').clear();
    }
    this._session.next(undefined);
  }

  public async login(params: { identifier: string; password: string }): Promise<void> {
    const result = await this._api.post<IAuthResult>('/api/auth/local', params);
    const session: IZsMapSession = { id: uuidv4(), auth: result };
    this._session.next(session);
    await db.table('session').put(session);
    this._router.navigateByUrl('/map');
  }

  public async logout(): Promise<void> {
    await db.table('session').clear();
    this._router.navigateByUrl('/login');
  }

  public observeAuthenticated(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        if (!session?.auth?.jwt) {
          return false;
        }
        const token = jwtDecode<{ exp: number }>(session.auth.jwt);
        if (token.exp < Date.now() / 1000) {
          return false;
        }
        return true;
      }),
    );
  }

  public observeIsGuest(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        // TODO handle this once we decided how it should work
        return true;
      }),
    );
  }

  public getLanguage(): string {
    return 'de-CH';
  }
}
