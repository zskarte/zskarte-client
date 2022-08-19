import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionService } from '../session/session.service';

export interface IApiRequestOptions {
  headers?: { [key: string]: string };
  token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _apiUrl = environment.apiUrl;
  private _session!: SessionService;

  constructor(private _http: HttpClient) {}

  public setSessionService(sessionService: SessionService): void {
    this._session = sessionService;
  }

  public getUrl(): string {
    return this._apiUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async post<RESPONSE = any, REQUEST = any>(subUrl: string, params: REQUEST, options?: IApiRequestOptions): Promise<RESPONSE> {
    return await lastValueFrom(
      this._http.post<RESPONSE>(`${this._apiUrl}${subUrl}`, params, { headers: this._getDefaultHeaders(options) }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async put<RESPONSE = any, REQUEST = any>(subUrl: string, params: REQUEST, options?: IApiRequestOptions): Promise<RESPONSE> {
    return await lastValueFrom(this._http.put<RESPONSE>(`${this._apiUrl}${subUrl}`, params, { headers: this._getDefaultHeaders(options) }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get<RESPONSE = any>(subUrl: string, options?: IApiRequestOptions): Promise<RESPONSE> {
    return await lastValueFrom(this._http.get<RESPONSE>(`${this._apiUrl}${subUrl}`, { headers: this._getDefaultHeaders(options) }));
  }

  private _getDefaultHeaders(options?: IApiRequestOptions): { [key: string]: string } {
    const defaults: { [key: string]: string } = {};
    if (options?.token || this._session.getToken()) {
      defaults['Authorization'] = `Bearer ${options?.token || this._session.getToken()}`;
    }
    return { ...defaults, ...(options?.headers || {}) };
  }
}
