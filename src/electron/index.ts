/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, BrowserWindow, Menu, protocol } from 'electron';
import * as path from 'path';

// import pkgJson from '../../package.json';
import { ArgsHandler } from './args';
import { AppWindowHandler } from './windows';

// AutoUpdateHandler.initialize();

app.whenReady().then((): void => {
  // // this is might be required for some external libs ind the future
  // if (!protocol.isProtocolRegistered('file')) {
  //   protocol.registerFileProtocol('file', (request, callback) => {
  //     const pathname = request.url.replace('file:///', '');
  //     callback(pathname);
  //   });
  // }

  AppWindowHandler.createAppWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', (): void => {
  const currentWindow = AppWindowHandler.getMainWindow();
  if (!currentWindow) {
    AppWindowHandler.createAppWindow();
  } else {
    currentWindow.focus();
  }
});
