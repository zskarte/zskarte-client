import { Dexie, Table } from 'dexie';
import { IZsMapSession } from '../session/session.interfaces';
import { IZsMapDisplayState, ZsMapStateSource } from '../state/interfaces';
import { Patch } from 'immer';

export type LocalBlobState = 'loading' | 'downloaded' | 'missing';

export type LocalBlob = {
  id: number;
  data: Blob;
};

export type LocalBlobMeta = {
  id: number;
  url: string;
  blobState: LocalBlobState;
  objectUrl: string | undefined;
  lastModified: number | undefined;
  source: 'download' | 'upload' | 'text';
};

export type LocalMapInfo = {
  map: ZsMapStateSource;
  mapBlobId?: number;
  styleBlobId?: number;
  styleSourceName?: string;
};

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;
  patchSyncQueue!: Table<Patch, number>;
  localMapInfo!: Table<LocalMapInfo, string>;
  localBlob!: Table<LocalBlob, number>;
  localBlobMeta!: Table<LocalBlobMeta, number>;

  constructor(databaseName: string) {
    super(databaseName);

    //for upgrade logic to work need to keep old versions (as long as anyone have old versions in use)
    this.version(5).stores({
      sessions: 'id',
      displayStates: 'id',
      patchSyncQueue: '++id',
      localMapMeta: 'url,objectUrl,map',
      localMapBlobs: 'url',
    });
    //omitted stores still exist, no need to repeat if no change on key/index (but you can repeate them)
    this.version(5.5)
      .stores({
        localBlobMeta: 'id++,url',
        localBlob: 'id',
        localMapInfo: 'map',
      })
      .upgrade(async (trans) => {
        const mapping = new Map<string, number>();
        const localBlobs = await trans.table('localMapBlobs').toArray();
        for (const localBlob of localBlobs) {
          const url = localBlob.url;
          delete localBlob.url;
          const meta = await trans.table('localMapMeta').get(url);
          const blobMeta: LocalBlobMeta = {
            url,
            blobState: meta?.mapStatus ?? 'missing',
            objectUrl: meta?.objectUrl,
            lastModified: meta?.mapStatus === 'downloaded' ? new Date().valueOf() : undefined,
            source: 'download',
          } as LocalBlobMeta;
          await trans
            .table('localBlobMeta')
            .add(blobMeta)
            .then((id) => {
              mapping.set(url, id);
              localBlob.id = id;
              return trans.table('localBlob').add(localBlob);
            });
        }
        const localMapMetas = await trans.table('localMapMeta').toArray();
        await trans.table('localMapMeta').clear();
        for (const localMapMeta of localMapMetas) {
          let styleBlobId: number | undefined;
          if (localMapMeta.mapStyle) {
            const styleMeta: LocalBlobMeta = {
              url: '/assets/map-style.json',
              blobState: 'downloaded',
              objectUrl: undefined,
              lastModified: new Date().valueOf(),
              source: 'download',
            } as LocalBlobMeta;
            const blob = new Blob([JSON.stringify(localMapMeta.mapStyle)], { type: 'application/json' });
            await trans
              .table('localBlobMeta')
              .add(styleMeta)
              .then((id) => {
                styleBlobId = id;
                const localBlob: LocalBlob = { id, data: blob };
                return trans.table('localBlob').add(localBlob);
              });
          }
          const localMapInfo = {
            map: localMapMeta.map,
            mapBlobId: mapping.get(localMapMeta.url),
            styleBlobId,
            styleSourceName: styleBlobId ? 'protomaps' : undefined,
          };
          await trans.table('localMapInfo').add(localMapInfo);
        }
      });
    //new modifications can be done here with only modify version number(or adding new version block), but 'localMapBlobs: null,' and 'localMapMeta: null,' need to stay here (to remove old table).
    this.version(6).stores({
      localMapBlobs: null,
      localMapMeta: null,
    });
  }
}

export const db = new AppDB('ZsKarte');
