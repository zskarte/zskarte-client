import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  Observable,
  of,
  retry,
  skip,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { db } from '../db/db';
import { AccessTokenType, IAuthResult, IZsMapSession, PermissionType } from './session.interfaces';
import { Params, Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import { ZsMapStateService } from '../state/state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DEFAULT_LOCALE, Locale } from '../state/i18n.service';
import { IZsMapOperation, IZsMapOrganization } from './operations/operation.interfaces';
import { transform } from 'ol/proj';
import { coordinatesProjection, mercatorProjection } from '../helper/projections';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM, LOG2_ZOOM_0_RESOLUTION } from './default-map-values';
import { decodeJWT } from '../helper/jwt';
import { IZsMapDisplayState } from '../state/interfaces';

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
        if (session.operation?.id) {
          await this._state?.refreshMapState();
          const displayState = await db.displayStates.get({ id: session.operation?.id });
          const queryParams = await firstValueFrom(this._router.routerState.root.queryParams);
          this._state.setDisplayState(displayState);
          if (queryParams) {
            this._state.updateDisplayState((draft) => SessionService.overrideDisplayStateFromQueryParams(draft, queryParams));
          }

          this._state
            .observeDisplayState()
            .pipe(skip(1), takeUntil(this._clearOperation))
            .subscribe(async (displayState) => {
              if (this._session.value?.operation?.id) {
                await db.displayStates.put({ ...displayState, id: this._session.value.operation?.id });
              }
            });

          await this._router.navigate(['map'], {
            queryParams: {
              center: null, //handled in overrideDisplayStateFromQueryParams
              size: null, //handled in overrideDisplayStateFromQueryParams
              operationId: null, //handled in updateJWT / OperationsComponent
            },
            queryParamsHandling: 'merge',
          });
        } else {
          await this._router.navigate(['operations'], { queryParamsHandling: 'preserve' });
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
      .subscribe((isOnline) => {
        // feature: show notification that connection was lost
        if (!isOnline) return;
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
      });
  }

  private static overrideDisplayStateFromQueryParams(displayState: IZsMapDisplayState, queryParams: Params) {
    if (queryParams['center']) {
      try {
        const mapCenter = queryParams['center'].split(',').map(parseFloat);
        displayState.mapCenter = mapCenter;
      } catch (ex) {
        //ignoring invalid center infos
      }
    }
    if (queryParams['size']) {
      try {
        const size = queryParams['size'].split(',').map(parseFloat);
        //use window.inner.. as have no access to map.getSize()
        const xResolution = size[0] / window.innerWidth;
        const yResolution = size[1] / window.innerHeight;
        displayState.mapZoom = LOG2_ZOOM_0_RESOLUTION - Math.log2(Math.max(xResolution, yResolution));
      } catch (ex) {
        //ignoring invalid size infos
      }
    }
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
  }

  public getOrganizationId(): number | undefined {
    return this._session.value?.organization?.id;
  }

  public getLabel(): string | undefined {
    return this._session.value?.label;
  }

  public observeLabel(): Observable<string | undefined> {
    return this._session.pipe(map((session) => session?.label));
  }

  public setLabel(label: string): void {
    const currentSession = this._session.value;
    if (currentSession) {
      currentSession.label = label;
      this._session.next(currentSession);
    }
  }

  public getAuthError(): HttpErrorResponse | undefined {
    return this._authError.value;
  }

  public observeOrganizationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.organization?.id));
  }

  public setOperation(operation?: IZsMapOperation): void {
    if (this._session?.value) {
      this._session.value.operation = operation;
    }
    this._session.next(this._session.value);
  }

  public observeOperationId(): Observable<number | undefined> {
    return this._session.pipe(map((session) => session?.operation?.id));
  }

  public getOperation(): IZsMapOperation | undefined {
    return this._session?.value?.operation;
  }

  public getOperationId(): number | undefined {
    return this._session?.value?.operation?.id;
  }

  public getOperationName(): string | undefined {
    return this._session?.value?.operation?.name;
  }

  public getOperationEventStates(): number[] | undefined {
    return this._session?.value?.operation?.eventStates;
  }

  public getLogo(): string | undefined {
    return this._session?.value?.organizationLogo;
  }

  // skipcq: JS-0105
  public async getSavedSession(): Promise<IZsMapSession | undefined> {
    const sessions = await db.sessions.toArray();
    if (sessions.length === 1) {
      return sessions[0];
    }
    if (sessions.length > 1) {
      await db.sessions.clear();
    }
    return undefined;
  }

  public async loadSavedSession(): Promise<void> {
    const session = await this.getSavedSession();
    if (session?.jwt) {
      await this.updateJWT(session?.jwt);
      return;
    }
    this._session.next(undefined);
  }

  public async login(params: { identifier: string; password: string }): Promise<void> {
    const { result, error: authError } = await this._api.post<IAuthResult>('/api/auth/local', params);
    this._authError.next(authError);
    if (authError || !result) {
      await this._router.navigate(['login'], { queryParamsHandling: 'preserve' });
      return;
    }
    await this.updateJWT(result.jwt);
  }

  public async updateJWT(jwt: string) {
    const decoded = decodeJWT(jwt);
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

    newSession.label = newSession.label || meResult.organization?.name || meResult.organization?.id.toString();

    // update organization values
    newSession.jwt = jwt;
    newSession.organizationLogo = meResult.organization?.logo?.url;
    newSession.organization = meResult.organization;

    // update operation values
    const queryParams = await firstValueFrom(this._router.routerState.root.queryParams);
    let queryOperationId;
    if (queryParams['operationId']) {
      try {
        queryOperationId = parseInt(queryParams['operationId']);
      } catch (ex) {
        //ignore invalid operationId param
      }
    }
    const operationId = decoded.operationId || queryOperationId || currentSession?.operation?.id;
    if (operationId) {
      const { result: operation } = await this._api.get<IZsMapOperation>(`/api/operations/${operationId}`, { token: jwt });
      if (operation) {
        newSession.operation = operation;
      }
    }

    this._session.next(newSession);
  }

  public async logout(): Promise<void> {
    this._session.next(undefined);
    await this._router.navigateByUrl('/login');
  }

  public async refreshToken(): Promise<void> {
    const currentToken = this._session.value?.jwt;
    if (!currentToken) {
      await this.logout();
      return;
    }

    const { result, error: authError } = await this._api.get<IAuthResult>('/api/accesses/auth/refresh', {
      token: currentToken,
    });

    if (authError || !result?.jwt) {
      await this.logout();
      return;
    }

    await this.updateJWT(result.jwt);
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
        if (decodeJWT(session.jwt).expired) {
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

  public async generateShareLink(permission: PermissionType, tokenType: AccessTokenType) {
    if (!this.getOperationId()) {
      throw new Error('OperationId is not defined');
    }
    const response = await this._api.post<{ accessToken: string }>('/api/accesses/auth/token/generate', {
      type: permission,
      operationId: this.getOperationId(),
      tokenType,
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
