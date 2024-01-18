import { Dexie, Table } from 'dexie';
import { IZsMapSession } from '../session/session.interfaces';
import { IZsMapDisplayState, ZsMapStateSource } from '../state/interfaces';
import { Patch } from 'immer';

export type LocalMapState = 'loading' | 'downloaded' | 'missing';

export type LocalMapMeta = {
  url: string;
  mapStatus: LocalMapState;
  objectUrl: string | undefined;
  map: ZsMapStateSource;
  mapStyle: string | undefined;
  blobStorageId: number | undefined;
};

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;
  patchSyncQueue!: Table<Patch, number>;
  blobMeta!: Table<LocalMapMeta, string>;
  blobs!: Table<Blob, number>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(4).stores({
      sessions: 'id',
      displayStates: 'id',
      patchSyncQueue: '++id',
      blobMeta: 'url,objectUrl,map',
      blobs: '++id',
    });
  }
}

export const db = new AppDB('ZsKarte');
