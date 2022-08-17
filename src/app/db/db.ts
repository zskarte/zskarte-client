import { Dexie } from 'dexie';

export const db = new Dexie('ZsKarte');

export const initDb = () => {
  // Declare tables, IDs and indexes
  db.version(1).stores({
    session: 'id, name, token',
  });
};
