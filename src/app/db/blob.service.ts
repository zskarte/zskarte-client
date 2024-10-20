import { Injectable } from '@angular/core';
import { Subject, Subscription, lastValueFrom } from 'rxjs';
import { LocalBlob, LocalBlobMeta, LocalBlobState, db } from './db';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';

export type BlobEventType = 'mapProgress' | 'done' | 'cancel' | 'error' | 'removed';
export type UpdateCallback = (eventType: BlobEventType, blobOperation: BlobOperation) => Promise<void>;
export interface BlobOperation {
  localBlobMeta: LocalBlobMeta;
  mapProgress: number;
  updateCallback?: UpdateCallback;
  subscription?: Subscription;
  finished: Subject<LocalBlobMeta>;
}

@Injectable({
  providedIn: 'root',
})
export class BlobService {
  private operations = new Map<string, BlobOperation>();

  constructor(private http: HttpClient) {}

  private static async _newBloblMeta(url: string, lastModified?: number) {
    const localBlobMeta = {
      url,
      blobState: 'missing',
      objectUrl: undefined,
      lastModified,
    } as LocalBlobMeta;
    await db.localBlobMeta.add(localBlobMeta).then((id) => {
      localBlobMeta.id = id;
    });
    return localBlobMeta;
  }

  public async downloadBlob(url: string, blobId?: number, updateCallback?: UpdateCallback) {
    let localBlobMeta: LocalBlobMeta | undefined;
    if (blobId) {
      localBlobMeta = await db.localBlobMeta.get(blobId);
      if (localBlobMeta) {
        localBlobMeta.url = url;
      }
    }
    if (!localBlobMeta) {
      localBlobMeta = await db.localBlobMeta.where('url').equals(url).first();
    }
    let localBlob: LocalBlob | undefined;
    if (!localBlobMeta) {
      localBlobMeta = await BlobService._newBloblMeta(url);
    } else {
      localBlob = await db.localBlob.get(localBlobMeta.id);
    }
    localBlobMeta.source = 'download';

    const operation: BlobOperation = {
      localBlobMeta,
      mapProgress: 0,
      updateCallback,
      finished: new Subject<LocalBlobMeta>(),
    };
    const finishedPromise = lastValueFrom(operation.finished.asObservable());
    if (!localBlob) {
      operation.localBlobMeta.blobState = 'loading';
      const mapRequest = this.http
        .get(url, {
          responseType: 'blob',
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: async (event) => {
            if (event.type === HttpEventType.DownloadProgress) {
              operation.mapProgress = Math.round((100 * event.loaded) / (event.total ?? 1));
              if (operation.updateCallback) {
                await operation.updateCallback('mapProgress', operation);
              }
            } else if (event instanceof HttpResponse) {
              const response: HttpResponse<Blob> = event;
              const header = response.headers.get('last-modified');
              if (header) {
                operation.localBlobMeta.lastModified = Date.parse(header).valueOf();
              } else {
                operation.localBlobMeta.lastModified = new Date().valueOf();
              }
              operation.subscription?.unsubscribe();
              const blob = event.body as Blob;
              await BlobService._blobToStorage(blob, operation);
            }
          },
          error: async () => {
            await BlobService._cancelOrError('error', operation);
          },
        });

      // Store the subscription so it can be cancelled later
      operation.subscription = mapRequest;
      this.operations.set(url, operation);
    } else {
      await BlobService._finish('downloaded', 'done', operation);
    }
    return await finishedPromise;
  }

  public async cancelDownload(url: string) {
    const operation = this.operations.get(url);
    if (operation) {
      await BlobService._cancelOrError('cancel', operation);
    }
  }

  private static async _cancelOrError(eventType: BlobEventType, operation: BlobOperation) {
    operation.subscription?.unsubscribe();
    operation.mapProgress = 0;
    operation.localBlobMeta.lastModified = undefined;
    await BlobService._finish('missing', eventType, operation);
  }

  private static async _finish(state: LocalBlobState, eventType: BlobEventType, operation: BlobOperation) {
    operation.localBlobMeta.blobState = state;
    await db.localBlobMeta.put(operation.localBlobMeta);
    if (operation.updateCallback) {
      await operation.updateCallback(eventType, operation);
    }
    operation.finished.next(operation.localBlobMeta);
    operation.finished.complete();
  }

  public async uploadBlob(event: Event, origUrl?: string, updateCallback?: UpdateCallback) {
    if (!event.target) return null;

    if (origUrl) {
      this.operations.get(origUrl)?.subscription?.unsubscribe();
    }

    const file = event.target['files'][0] as File;

    const url = file.path ?? file.name;
    let localBlobMeta: LocalBlobMeta | undefined;
    //check if an entry with same name and modify timestamp already exist.
    localBlobMeta = (await db.localBlobMeta.where('url').equals(url).toArray()).find((meta) => meta.lastModified === file.lastModified);
    if (!localBlobMeta) {
      localBlobMeta = await BlobService._newBloblMeta(url, file.lastModified);
    }
    localBlobMeta.source = 'upload';

    const operation: BlobOperation = {
      localBlobMeta,
      mapProgress: 0,
      updateCallback,
      finished: new Subject<LocalBlobMeta>(),
    };
    const finishedPromise = lastValueFrom(operation.finished.asObservable());
    if (localBlobMeta.blobState === 'downloaded') {
      //same saved file, no need to update
      await BlobService._finish('downloaded', 'done', operation);
    } else {
      //it is already an File/Blob object, so directly save it to DB
      await BlobService._blobToStorage(file, operation);
    }
    return await finishedPromise;
  }

  private static async _blobToStorage(blob: Blob, operation: BlobOperation) {
    try {
      await db.localBlob.put({
        id: operation.localBlobMeta.id,
        data: blob,
      });
      await BlobService._finish('downloaded', 'done', operation);
    } catch {
      operation.mapProgress = 0;
      await BlobService._finish('missing', 'error', operation);
    }
  }

  public static async removeBlob(blobId: number) {
    await db.localBlob.delete(blobId);
    const meta = await db.localBlobMeta.get(blobId);
    if (meta) {
      if (meta.objectUrl) {
        URL.revokeObjectURL(meta.objectUrl);
        meta.objectUrl = undefined;
      }
      meta.blobState = 'missing';
      await db.localBlobMeta.put(meta);
    }
    return meta;
  }

  public static async isDownloaded(blobId?: number) {
    if (blobId) {
      const meta = await db.localBlobMeta.get(blobId);
      return meta?.blobState === 'downloaded';
    }
    return false;
  }

  public static async getBlobOrRealUrl(url: string, blobId?: number) {
    if (blobId) {
      const meta = await db.localBlobMeta.get(blobId);
      if (meta) {
        if (meta.objectUrl) {
          // There is no way to check if an object url is a valid reference
          // without making a request.
          // Because revoking and creating a new one is pretty fast,
          // we revoke and create a new url every time.
          // This prevents memory leaks and makes the laptops not crash :)
          URL.revokeObjectURL(meta.objectUrl);
          meta.objectUrl = undefined;
          await db.localBlobMeta.put(meta);
        }
        //if there is a meta the url will be the one saved there.
        if (url.startsWith('http')) {
          url = meta.url;
        }
      }
      const blob = await db.localBlob.get(blobId);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob.data);
        if (meta) {
          meta.objectUrl = objectUrl;
          await db.localBlobMeta.put(meta);
        }
        return objectUrl;
      }
    }
    return url;
  }

  public static async getBlobContentAsText(bloblId?: number) {
    if (!bloblId) {
      return null;
    }
    const blob = await db.localBlob.get(bloblId);
    if (!blob) {
      return null;
    }
    return await blob.data.text();
  }

  public static async saveTextAsBlobContent(text: string, type: string, bloblId?: number, url?: string) {
    let localBlobMeta: LocalBlobMeta | undefined;
    if (bloblId) {
      localBlobMeta = await db.localBlobMeta.get(bloblId);
      if (localBlobMeta?.objectUrl) {
        URL.revokeObjectURL(localBlobMeta.objectUrl);
      }
    }
    if (!localBlobMeta) {
      localBlobMeta = await BlobService._newBloblMeta(url ?? '', new Date().valueOf());
    } else {
      if (url) {
        localBlobMeta.url = url;
      }
      localBlobMeta.lastModified = new Date().valueOf();
    }
    localBlobMeta.source = 'text';
    const blob = new Blob([text], { type });

    const operation: BlobOperation = {
      localBlobMeta,
      mapProgress: 0,
      finished: new Subject<LocalBlobMeta>(),
    };
    const finishedPromise = lastValueFrom(operation.finished.asObservable());
    await BlobService._blobToStorage(blob, operation);
    return await finishedPromise;
  }
}
