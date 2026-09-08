import { Dexie, Table } from 'dexie';
import { LOCAL_MAP_STYLE_PATH, LOCAL_MAP_STYLE_SOURCE } from '../session/default-map-values';
import {
  ZsMapStateSource,
  MapLayer,
  IZsMapOrganizationMapLayerSettings,
  IZsMapSession,
  IZsMapDisplayState,
  IZsMapOperation,
  WmsSource,
  IZsChangesetInternal,
  ResourceArticleApi,
} from '@zskarte/types';
import { JournalEntry } from '../journal/journal.types';

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
  offlineAvailable?: boolean;
};

export type LocalMapLayerMeta = {
  sourceBlobId?: number;
  styleBlobId?: number;
};
export type LocalMapLayer = MapLayer & LocalMapLayerMeta;

export type LocalMapLayerSettings = IZsMapOrganizationMapLayerSettings & {
  id: string;
};

export type PatchJournalEntry = {
  id?: number;
  entry: Partial<JournalEntry>;
  create: boolean;
  uuid: string;
  documentId?: string;
  operationId: string;
  organizationId: string;
  date: Date;
};

export type LocalJournalEntry = JournalEntry & { operationId: string; organizationId: string; fromCache: boolean };

export type LocalResourceArticle = ResourceArticleApi & { operationId: string; organizationId: string; fromCache: boolean };

export class AppDB extends Dexie {
  sessions!: Table<IZsMapSession, string>;
  displayStates!: Table<IZsMapDisplayState, string>;
  changesetOutgoingQueue!: Table<IZsChangesetInternal, string>;
  localMapInfo!: Table<LocalMapInfo, string>;
  localBlob!: Table<LocalBlob, number>;
  localBlobMeta!: Table<LocalBlobMeta, number>;
  localOperation!: Table<IZsMapOperation, number>;
  localWmsSource!: Table<WmsSource, number>;
  localMapLayer!: Table<LocalMapLayer, string>;
  localMapLayerSettings!: Table<LocalMapLayerSettings, string>;
  patchJournalEntries!: Table<PatchJournalEntry, number>;
  localJournalEntries!: Table<LocalJournalEntry, string>;
  localResourceArticles!: Table<LocalResourceArticle, string>;

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
              url: LOCAL_MAP_STYLE_PATH,
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
            styleSourceName: styleBlobId ? LOCAL_MAP_STYLE_SOURCE : undefined,
          };
          await trans.table('localMapInfo').add(localMapInfo);
        }
      });
    //new modifications can be done here with only modify version number(or adding new version block), but 'localMapBlobs: null,' and 'localMapMeta: null,' need to stay here (to remove old table).
    this.version(9).stores({
      localMapBlobs: null,
      localMapMeta: null,
      localOperation: 'id,phase',
      localWmsSource: 'id',
      localMapLayer: 'fullId,id',
      localMapLayerSettings: 'id',
      patchJournalEntries: '++id, [operationId+organizationId], organizationId, operationId, uuid, documentId',
      localJournalEntries:
        '[operationId+uuid], [organizationId+operationId+messageNumber], organizationId, operationId, uuid, documentId, messageNumber',
    });
    this.version(10).stores({
      patchSyncQueue: null,
      changesetOutgoingQueue: 'id, operationId',
    });
    this.version(11).stores({
      localResourceArticles: '[operationId+articleNumber], operationId, organizationId, importId',
    });
    //the catalogue is always read/replaced per operation+organization, so index that pair
    this.version(12).stores({
      localResourceArticles:
        '[operationId+articleNumber], [operationId+organizationId], operationId, organizationId, importId',
    });
  }
}

export const db = new AppDB('ZsKarte');
