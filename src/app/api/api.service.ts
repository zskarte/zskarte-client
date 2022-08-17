import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _apiUrl = environment.apiUrl;

  constructor(private _http: HttpClient) {}

  public async post<RESPONSE = any, REQUEST = any>(subUrl: string, params: REQUEST): Promise<RESPONSE> {
    return await lastValueFrom(this._http.post<RESPONSE>(`${this._apiUrl}${subUrl}`, params));
  }

  public async get<RESPONSE = any>(subUrl: string): Promise<RESPONSE> {
    return await lastValueFrom(this._http.get<RESPONSE>(`${this._apiUrl}${subUrl}`));
  }
}
