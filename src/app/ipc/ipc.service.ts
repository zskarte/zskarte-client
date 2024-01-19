/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NgZone } from '@angular/core';
import type { FileFilter } from 'electron';
import FileSaver from 'file-saver';
import { isElectron } from '../helper/os';

@Injectable({
  providedIn: 'root',
})
export class IpcService {
  constructor(private _zone: NgZone) {}

  // skipcq: JS-0105
  private async _invoke<PARAMS = any, RESULT = any>(channel: string, params: PARAMS): Promise<RESULT> {
    return await (window as any).zskarte.ipcInvoke(channel, params);
  }

  public async saveFile(params: { data: string; fileName: string; mimeType: string; filters?: FileFilter[] }): Promise<void> {
    if (isElectron()) {
      await this._invoke('fs:saveFile', params);
      return;
    }

    const blob = new Blob([params.data], { type: params.mimeType });
    FileSaver.saveAs(blob, params.fileName);
  }

  public async openFile(params: { filters: FileFilter[] }): Promise<string> {
    return await this._invoke('fs:openFile', params);
  }
}
