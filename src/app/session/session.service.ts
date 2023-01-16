import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, skip } from 'rxjs';
import { db } from '../db/db';
import { IAuthResult, IZsMapSession } from './session.interfaces';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import jwtDecode from 'jwt-decode';
import { ZsMapStateService } from '../state/state.service';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsMapSession | undefined>(undefined);
  private _state!: ZsMapStateService;

  constructor(private _router: Router, private _api: ApiService) {
    // prevents circular deps between session and api
    this._api.setSessionService(this);

    // save handler
    this._session.pipe(skip(1)).subscribe(async (session) => {
      if (session) {
        await db.table('session').put(session);

        if (session?.operationId) {
          const result = await this._api.get('/api/operations/' + session.operationId);
          const mapState = result.data?.attributes?.mapState;
          if (mapState) {
            this._state.reset(mapState);
          }
        }
      } else {
        await db.table('session').clear();
        this._state.reset();
      }
    });
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
  }

  public getOrganizationId(): number | undefined {
    return this._session.value?.organizationId;
  }

  public observeOrganizationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.organizationId));
  }

  public setOperationId(id: number): void {
    if (this._session?.value) {
      this._session.value.operationId = id;
    }
    this._session.next(this._session.value);
  }

  public observeOperationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.operationId));
  }

  public getOperationId(): number | undefined {
    return this._session?.value?.operationId;
  }

  public async loadSavedSession(): Promise<void> {
    const sessions = await db.table('session').toArray();
    if (sessions.length === 1) {
      const session: IZsMapSession = sessions[0];
      this._session.next(session);
      return;
    }
    if (sessions.length > 1) {
      await db.table('session').clear();
    }
    this._session.next(undefined);
  }

  public async login(params: { identifier: string; password: string }): Promise<void> {
    const result = await this._api.post<IAuthResult>('/api/auth/local', params);
    const meResult = await this._api.get<{ organization: { id: number } }>('/api/users/me?populate[0]=organization', { token: result.jwt });
    const session: IZsMapSession = { id: uuidv4(), auth: result, operationId: undefined, organizationId: meResult.organization.id };
    this._session.next(session);
    this._router.navigateByUrl('/map');
  }

  public async logout(): Promise<void> {
    this._session.next(undefined);
    this._router.navigateByUrl('/login');
  }

  public getToken(): string | undefined {
    return this._session.value?.auth?.jwt;
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
        if (!session?.auth?.user?.username) return false;
        return session.auth.user.username === 'zso_guest';
      }),
    );
  }

  public getLanguage(): string {
    return 'de-CH';
  }
}
