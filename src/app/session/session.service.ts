import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, filter, map, Observable, of, retry, skip, Subject, switchMap, takeUntil } from 'rxjs';
import { db } from '../db/db';
import { AccessTokenType, IAuthResult, IZsMapSession, PermissionType } from './session.interfaces';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import jwtDecode from 'jwt-decode';
import { ZsMapStateService } from '../state/state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DEFAULT_LOCALE, Locale } from '../state/i18n.service';
import { IZsMapOperation, IZsMapOrganization } from './operations/operation.interfaces';
import { transform } from 'ol/proj';
import { coordinatesProjection, mercatorProjection } from '../helper/projections';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from './default-map-values';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _session = new BehaviorSubject<IZsMapSession | undefined>(undefined);
  private _clearOperation = new Subject<void>();
  private _state!: ZsMapStateService;
  private _authError = new BehaviorSubject<HttpErrorResponse | undefined>(undefined);
  private _isOnline = new BehaviorSubject<boolean>(true);

  constructor(
    private _router: Router,
    private _api: ApiService,
  ) {
    this._session.pipe(skip(1)).subscribe(async (session) => {
      this._clearOperation.next();
      if (session?.jwt) {
        await db.sessions.put(session);
        if (session.operationId) {
          await this._state?.refreshMapState();
          const displayState = await db.displayStates.get({ id: session.operationId });
          this._state.setDisplayState(displayState);

          this._state
            .observeDisplayState()
            .pipe(skip(1), takeUntil(this._clearOperation))
            .subscribe(async (displayState) => {
              if (this._session.value?.operationId) {
                db.displayStates.put({ ...displayState, id: this._session.value.operationId });
              }
            });

          await this._router.navigateByUrl('/map');
        } else {
          await this._router.navigateByUrl('/operations');
          this._state.setMapState(undefined);
          this._state.setDisplayState(undefined);
        }
        return;
      }

      await db.displayStates.clear();
      await db.sessions.clear();
      return;
    });

    // online/offline checks
    window.addEventListener('online', () => {
      this._isOnline.next(true);
    });
    window.addEventListener('offline', () => {
      this._isOnline.next(false);
    });
    this._isOnline
      .asObservable()
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(async (isOnline) => {
        if (isOnline) {
          of([])
            .pipe(
              switchMap(async () => {
                await this.refreshToken();
              }),
              retry({ count: 5, delay: 1000 }),
              takeUntil(this._isOnline.asObservable().pipe(filter((isOnline) => !isOnline))),
            )
            .subscribe({
              complete: () => {
                // feature: show notification that connection was restored
              },
            });
        } else {
          // feature: show notification that connection was lost
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

  public setOperation(operation?: IZsMapOperation): void {
    if (this._session?.value) {
      this._session.value.operationId = operation?.id;
      this._session.value.operationName = operation?.name;
      this._session.value.operationDescription = operation?.description;
    }
    this._session.next(this._session.value);
  }

  public observeOperationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.operationId));
  }

  public getOperationId(): number | undefined {
    return this._session?.value?.operationId;
  }

  public getOperationName(): string | undefined {
    return this._session?.value?.operationName;
  }

  public getOperationDescription(): string | undefined {
    return this._session?.value?.operationDescription;
  }

  public getLogo(): string | undefined {
    return this._session?.value?.organizationLogo;
  }

  public async getSavedSession(): Promise<IZsMapSession | undefined> {
    const sessions = await db.sessions.toArray();
    if (sessions.length === 1) {
      const session: IZsMapSession = sessions[0];
      return session;
    }
    if (sessions.length > 1) {
      await db.sessions.clear();
    }
    return undefined;
  }

  public async loadSavedSession(): Promise<void> {
    const session = await this.getSavedSession();
    if (session?.jwt) {
      return await this.updateJWT(session?.jwt);
    }
    this._session.next(undefined);
  }

  public async login(params: { identifier: string; password: string }): Promise<void> {
    const { result, error: authError } = await this._api.post<IAuthResult>('/api/auth/local', params);
    this._authError.next(authError);
    if (authError || !result) {
      this._router.navigateByUrl('/login');
      return;
    }
    await this.updateJWT(result.jwt);
  }

  public async updateJWT(jwt: string) {
    const decoded = this._decodeJWT(jwt);
    if (decoded.expired) {
      await this.logout();
      return;
    }

    const { error, result: meResult } = await this._api.get<{ organization: IZsMapOrganization }>(
      '/api/users/me?populate[0]=organization.logo',
      {
        token: jwt,
      },
    );
    if (error || !meResult) {
      await this.logout();
      return;
    }

    const currentSession = await this.getSavedSession();
    let newSession: IZsMapSession;

    if (currentSession) {
      newSession = currentSession;
    } else {
      newSession = {
        id: 'current',
        locale: DEFAULT_LOCALE,
      };
    }

    newSession.permission = decoded.permission || PermissionType.ALL;

    // update organization values
    newSession.jwt = jwt;
    newSession.organizationLogo = meResult.organization?.logo?.url;
    newSession.organizationId = meResult.organization?.id;

    // update operation values
    const operationId = decoded.operationId || currentSession?.operationId;
    if (operationId) {
      const { result: operation } = await this._api.get<IZsMapOperation>('/api/operations/' + operationId, { token: jwt });
      if (operation) {
        newSession.operationId = operation?.id;
        newSession.operationName = operation?.name;
        newSession.operationDescription = operation?.description;
      }
    }

    if (decoded.operationId) {
      newSession.operationId = decoded.operationId;
    }

    if (meResult.organization) {
      newSession.organizationId = meResult.organization.id;
      newSession.defaultLatitude = meResult.organization.mapLatitude;
      newSession.defaultLongitude = meResult.organization.mapLongitude;
      newSession.defaultZoomLevel = meResult.organization.mapZoomLevel;
    }

    this._session.next(newSession);
  }

  public async logout(): Promise<void> {
    this._session.next(undefined);
    this._router.navigateByUrl('/login');
  }

  public async refreshToken(): Promise<void> {
    const currentToken = this._session.value?.jwt;
    if (!currentToken) {
      return await this.logout();
    }

    const { result, error: authError } = await this._api.get<IAuthResult>('/api/accesses/auth/refresh', {
      token: currentToken,
    });

    if (authError || !result?.jwt) {
      return await this.logout();
    }

    await this.updateJWT(result.jwt);

    return;
  }

  public getToken(): string | undefined {
    return this._session.value?.jwt;
  }

  public observeAuthenticated(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        if (!session?.jwt) {
          return false;
        }
        if (this._decodeJWT(session.jwt).expired) {
          this.logout();
          return false;
        }
        return true;
      }),
    );
  }

  public setLocale(locale: Locale): void {
    const currentSession = this._session.value;
    if (currentSession) {
      currentSession.locale = locale;
      this._session.next(currentSession);
    }
  }

  public getLocale(): Locale {
    return this._session.value?.locale ?? DEFAULT_LOCALE;
  }

  public observeIsOnline(): Observable<boolean> {
    return this._isOnline.pipe(skip(1), distinctUntilChanged());
  }

  public isOnline(): boolean {
    return this._isOnline.value;
  }

  private _decodeJWT(jwt: string): { expired: boolean; operationId: number; permission: PermissionType } {
    const token = jwtDecode<{ exp: number; operationId: number; permission: PermissionType }>(jwt);
    return { ...token, expired: token.exp < Date.now() / 1000 };
  }

  public async generateShareLink(permission: PermissionType, tokenType: AccessTokenType) {
    if (!this.getOperationId()) {
      throw new Error('OperationId is not defined');
    }
    const response = await this._api.post<{ accessToken: string }>('/api/accesses/auth/token/generate', {
      type: permission,
      operationId: this.getOperationId(),
      tokenType: tokenType,
    });
    if (!response.result?.accessToken) {
      throw new Error('Unable to generate share url');
    }
    return response.result.accessToken;
  }

  public observeHasWritePermission(): Observable<boolean> {
    return this._session.pipe(
      map((session) => {
        return !(session?.permission === PermissionType.READ);
      }),
    );
  }

  public hasWritePermission(): boolean {
    return !(this._session.value?.permission === PermissionType.READ);
  }

  public getDefaultMapCenter(): number[] {
    if (coordinatesProjection && mercatorProjection && this._session.value?.defaultLatitude && this._session.value?.defaultLongitude) {
      return transform(
        [this._session.value?.defaultLongitude, this._session.value?.defaultLatitude],
        coordinatesProjection,
        mercatorProjection,
      );
    }
    return DEFAULT_COORDINATES;
  }

  public getDefaultMapZoom(): number {
    return this._session.value?.defaultZoomLevel || DEFAULT_ZOOM;
  }
}
