import { app, dialog, FileFilter, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs';

export class IpcHandler {
  public static initialize(): void {
    ipcMain.handle(
      'fs:saveFile',
      async (_event: IpcMainInvokeEvent, params: { data: string; fileName: string; filters?: FileFilter[] }): Promise<void> => {
        const result = await dialog.showSaveDialog({
          defaultPath: path.join(app.getPath('desktop'), params.fileName),
          filters: params.filters,
        });

        if (result && !result.canceled && result.filePath) {
          return await fs.promises.writeFile(result?.filePath?.toString(), params.data, { encoding: 'utf8' });
        }
        return;
      },
    );

    ipcMain.handle(
      'fs:openFile',
      async (
        _event: IpcMainInvokeEvent,
        params: {
          filters?: FileFilter[];
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ): Promise<any> => {
        const result = await dialog.showOpenDialog({
          defaultPath: path.join(app.getPath('desktop')),
          filters: params.filters,
          properties: ['openFile'],
        });

        if (result && !result.canceled && result.filePaths?.length > 0) {
          const data = await fs.promises.readFile(result?.filePaths?.[0].toString(), 'utf8');
          return data;
        }
        return undefined;
      },
    );
  }
}
