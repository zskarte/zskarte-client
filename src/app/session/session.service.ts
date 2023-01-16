import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, skip } from 'rxjs';
import { db } from '../db/db';
import { IAuthResult, IZsMapSession } from './session.interfaces';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import jwtDecode from 'jwt-decode';
import { ZsMapStateService } from '../state/state.service';
import { GUEST_USER_IDENTIFIER } from './userLogic';
import { IZsMapOperation } from './operations/operation.interfaces';
import { HttpErrorResponse } from '@angular/common/http';
import {DEFAULT_LOCALE} from "../state/i18n.service";

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsMapSession | undefined>(undefined);
  private _state!: ZsMapStateService;
  private _authError = new BehaviorSubject<HttpErrorResponse | undefined>(undefined);

  constructor(private _router: Router, private _api: ApiService) {
    // prevents circular deps between session and api
    this._api.setSessionService(this);

    // save handler
    this._session.pipe(skip(1)).subscribe(async (session) => {
      if (session) {
        await db.table('session').put(session);

        if (session?.operationId) {
          const { error, result } = await this._api.get<IZsMapOperation>('/api/operations/' + session.operationId);
          if (error || !result) return;
          const mapState = result.mapState;
          if (mapState) {
            this._state.reset(mapState);
          }
        }
      } else {
        await db.table('session').clear();
        this._state?.reset();
      }
    });
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
  }

  public getOrganizationId(): number | undefined {
    return this._session.value?.organizationId;
  }

  public getAuthError(): HttpErrorResponse | undefined {
    return this._authError.value;
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
    const { result, error: authError } = await this._api.post<IAuthResult>('/api/auth/local', params);
    this._authError.next(authError);
    if (authError || !result) return;
    const { error, result: meResult } = await this._api.get<{ organization: { id: number } }>('/api/users/me?populate[0]=organization', {
      token: result.jwt,
    });
    if (error || !meResult) return;

    const session: IZsMapSession = { id: uuidv4(), auth: result, operationId: undefined, organizationId: meResult.organization.id, locale: DEFAULT_LOCALE };
    if (params.identifier === GUEST_USER_IDENTIFIER) {
      session.guestLoginDateTime = new Date();
    }

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
        // TODO handle this once we decided how it should work
        return true;
      }),
    );
  }

  public setLocale(locale: string): void {
    const currentSession = this._session.value;
    if (currentSession) {
      currentSession.locale = locale;
      this._session.next(currentSession);
    }
  }

  public getLocale(): string {
    return this._session.value?.locale ?? DEFAULT_LOCALE;
  }

  public getGuestLoginDateTime() {
    return this._session.value?.guestLoginDateTime;
  }
}
