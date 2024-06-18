import { Dexie, Table } from 'dexie';
import { IZsMapSession } from '../session/session.interfaces';
import { IZsMapDisplayState, ZsMapStateSource } from '../state/interfaces';
import { Patch } from 'immer';

export type LocalMapState = 'loading' | 'downloaded' | 'missing';

export type BlobMeta = {
  url: string;
  mapStatus: LocalMapState;
  objectUrl: string | undefined;
};

export type LocalMapMeta = BlobMeta & {
  map: ZsMapStateSource;
  mapStyle: string | undefined;
};

export type LocalMapBlob = {
  url: string;
  data: Blob;
};

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;
  patchSyncQueue!: Table<Patch, number>;
  localMapMeta!: Table<LocalMapMeta, string>;
  localMapBlobs!: Table<LocalMapBlob, string>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(5).stores({
      sessions: 'id',
      displayStates: 'id',
      patchSyncQueue: '++id',
      localMapMeta: 'url,objectUrl,map',
      localMapBlobs: 'url',
    });
  }
}

export const db = new AppDB('ZsKarte');
