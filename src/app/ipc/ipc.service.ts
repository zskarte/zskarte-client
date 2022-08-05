/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import type { FileFilter } from 'electron';

@Injectable({
  providedIn: 'root',
})
export class IpcService {
  constructor(private _zone: NgZone) {}

  private async _invoke<PARAMS = any, RESULT = any>(channel: string, params: PARAMS): Promise<RESULT> {
    return (window as any).zskarte.ipcInvoke(channel, params);
  }

  private _on<RESULT = any>(channel: string): Observable<RESULT> {
    return new Observable((observer) => {
      (window as any).zskarte.ipcOn(channel, (_event: any, result: any) => {
        this._zone.run(() => {
          observer.next(result);
        });
      });
    });
  }

  public async saveFile(params: { data: string; fileName: string; filters?: FileFilter[] }): Promise<void> {
    return this._invoke('fs:saveFile', params);
  }

  public async openFile(params: { filters: FileFilter[] }): Promise<string> {
    return this._invoke('fs:openFile', params);
  }
}
