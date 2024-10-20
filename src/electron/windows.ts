/* eslint-disable @typescript-eslint/no-explicit-any */

import { ArgsHandler } from './args';
import { BrowserWindow } from 'electron';
import * as path from 'path';

export class AppWindowHandler {
  // public static win: BrowserWindow;
  private static _windows: BrowserWindow[] = [];

  public static async loadUrl(window: BrowserWindow): Promise<void> {
    if (ArgsHandler.serve) {
      await window.loadURL('http://localhost:4300');
    } else {
      await window.loadURL(`file://${path.resolve(__dirname, '../../../zskarte-v3/browser/index.html')}`);
    }
  }

  public static async createAppWindow(): Promise<void> {
    // Define appWindow
    const window = new BrowserWindow({
      height: 800,
      minHeight: 700,
      width: 1200,
      minWidth: 700,
      show: false,
      frame: true,
      fullscreenable: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        allowRunningInsecureContent: false,
        nodeIntegration: false,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    window.webContents.on('dom-ready', (): void => {
      if (!window.isVisible()) {
        window.show();
      }
    });

    window.webContents.on('did-fail-load', (event): void => {
      console.error('did-fail-load', event);
      // dialog.showErrorBox('did-fail-load', JSON.stringify(event, null, 3));
    });

    window.on('close', (): void => {
      const index = AppWindowHandler._windows.indexOf(window);
      if (index > -1) {
        AppWindowHandler._windows.splice(index, 1);
      }
    });

    await AppWindowHandler.loadUrl(window);

    AppWindowHandler._windows.push(window);
  }

  public static close(window: BrowserWindow): void {
    if (window) {
      window.close();
      // _.remove(AppWindowHandler._windows, window);
    }
  }

  public static getMainWindow(): BrowserWindow {
    return AppWindowHandler._windows[0];
  }
}
