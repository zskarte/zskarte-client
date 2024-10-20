/* eslint-disable @typescript-eslint/no-explicit-any */

// This file is loaded whenever a javascript context is created. It runs in a
// private scope that can access a subset of electron renderer APIs. We must be
// careful to not leak any objects into the global scope!
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ipcRenderer, contextBridge } = require('electron');

const allowedChannels = ['fs:saveFile', 'fs:openFile'];

const checkChannel = (channel: string): void => {
  if (!allowedChannels.includes(channel)) {
    throw new Error(`Calling IPC channel ${channel} is not allowed`);
  }
};

contextBridge.exposeInMainWorld('zskarte', {
  ipcInvoke: (channel: string, params: any): Promise<any> => {
    checkChannel(channel);
    return ipcRenderer.invoke(channel, params);
  },
  ipcOn: (channel: string, callback: any): void => {
    checkChannel(channel);
    ipcRenderer.on(channel, callback);
  },
});
