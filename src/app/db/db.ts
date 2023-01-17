import {Dexie, Table} from 'dexie';
import {IZsMapSession} from "../session/session.interfaces";
import {IZsMapDisplayState} from "../state/interfaces";

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(2).stores({
      sessions: 'id, name, token',
      displayStates: 'id, displayMode'
    });
  }
}

export const db = new AppDB('ZsKarte');
