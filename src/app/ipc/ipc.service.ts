/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import type { FileFilter } from 'electron';
import FileSaver from 'file-saver';
import { isElectron } from '../helper/os';

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

  public async saveFile(params: { data: string; fileName: string; mimeType: string; filters?: FileFilter[] }): Promise<void> {
    if (isElectron()) {
      return this._invoke('fs:saveFile', params);
    }

    const blob = new Blob([params.data], { type: params.mimeType });
    FileSaver.saveAs(blob, params.fileName);
    return;
  }

  public async openFile(params: { filters: FileFilter[] }): Promise<string> {
    return this._invoke('fs:openFile', params);
  }
}
