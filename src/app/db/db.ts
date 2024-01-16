import { Dexie, Table } from 'dexie';
import { IZsMapSession } from '../session/session.interfaces';
import { IZsMapDisplayState } from '../state/interfaces';
import { Patch } from 'immer';

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;
  patchSyncQueue!: Table<Patch, number>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(3).stores({
      sessions: 'id',
      displayStates: 'id',
      patchSyncQueue: '++id',
    });
  }
}

export const db = new AppDB('ZsKarte');
