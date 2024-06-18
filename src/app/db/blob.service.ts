import { Injectable } from '@angular/core';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { LocalBlob, LocalBlobMeta, db } from './db';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';

export type BlobEventType = 'mapProgress' | 'done' | 'cancel' | 'error' | 'removed';
export type UpdateCallback = (eventType: BlobEventType, blobOperation: BlobOperation) => Promise<void>;
export interface BlobOperation {
  localBlobMeta: LocalBlobMeta;
  mapProgress: number;
  fileReader?: FileReader;
  fileReadAborted: boolean;
  updateCallback?: UpdateCallback;
  subscription?: Subscription;
}

@Injectable({
  providedIn: 'root',
})
export class BlobService {
  private operations = new Map<string, BlobOperation>();

  constructor(private http: HttpClient) {}

  public async downloadBlob(url: string, blobId?: number, updateCallback?: UpdateCallback) {
    let localBlobMeta: LocalBlobMeta | undefined;
    if (blobId) {
      localBlobMeta = await db.localBlobMeta.get(blobId);
    }
    if (!localBlobMeta) {
      localBlobMeta = await db.localBlobMeta.where('url').equals(url).first();
    }
    let localBlob: LocalBlob | undefined;
    if (!localBlobMeta) {
      localBlobMeta = {
        url,
        blobState: 'missing',
        objectUrl: undefined,
        lastModified: undefined,
      } as LocalBlobMeta;
      await db.localBlobMeta.add(localBlobMeta).then((id) => {
        if (localBlobMeta) {
          localBlobMeta.id = id;
        }
      });
    } else {
      localBlob = await db.localBlob.get(localBlobMeta.id);
    }

    const operation: BlobOperation = {
      localBlobMeta,
      mapProgress: 0,
      fileReadAborted: false,
      updateCallback,
    };
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
              await BlobService.blobToStorage(blob, operation);
            }
          },
          error: async () => {
            operation.subscription?.unsubscribe();
            operation.localBlobMeta.blobState = 'missing';
            operation.localBlobMeta.lastModified = undefined;
            operation.mapProgress = 0;
            await db.localBlobMeta.put(operation.localBlobMeta);
            if (operation.updateCallback) {
              await operation.updateCallback('error', operation);
            }
          },
        });

      // Store the subscription so it can be cancelled later
      operation.subscription = mapRequest;
      this.operations.set(url, operation);
    } else {
      operation.localBlobMeta.blobState = 'downloaded';
      await db.localBlobMeta.put(operation.localBlobMeta);
      if (operation.updateCallback) {
        await operation.updateCallback('done', operation);
      }
    }
    return operation;
  }

  public async cancelDownload(url: string) {
    const operation = this.operations.get(url);
    if (operation) {
      operation.subscription?.unsubscribe();
      operation.mapProgress = 0;
      operation.localBlobMeta.blobState = 'missing';
      operation.localBlobMeta.lastModified = undefined;
      await db.localBlobMeta.put(operation.localBlobMeta);
      if (operation.updateCallback) {
        await operation.updateCallback('cancel', operation);
      }
    }
  }

  public async uploadBlob(event: Event, origUrl: string, updateCallback?: UpdateCallback) {
    if (!event.target) return null;

    this.operations.get(origUrl)?.subscription?.unsubscribe();

    const file = event.target['files'][0] as File;

    const localBlobMeta: LocalBlobMeta = {
      url: file.path ?? file.name,
      blobState: 'missing',
      objectUrl: undefined,
      lastModified: file.lastModified,
    } as LocalBlobMeta;
    await db.localBlobMeta.add(localBlobMeta).then((id) => {
      localBlobMeta.id = id;
    });

    const operation: BlobOperation = {
      localBlobMeta,
      mapProgress: 0,
      fileReadAborted: false,
      updateCallback,
    };
    operation.localBlobMeta.blobState = 'loading';
    await db.localBlobMeta.put(operation.localBlobMeta);

    const mapRequest = BlobService.readFile(file, operation).subscribe({
      next: async (percentDone) => {
        operation.mapProgress = percentDone;
        if (operation.updateCallback) {
          await operation.updateCallback('mapProgress', operation);
        }
      },
      complete: async () => {
        operation.subscription?.unsubscribe();
        if (operation.fileReadAborted || !operation.fileReader) {
          operation.mapProgress = 0;
          operation.localBlobMeta.blobState = 'missing';
          operation.localBlobMeta.lastModified = undefined;
          await db.localBlobMeta.put(operation.localBlobMeta);
          if (operation.updateCallback) {
            await operation.updateCallback('cancel', operation);
          }
          return;
        }
        const blob = new Blob([operation.fileReader.result as ArrayBuffer], { type: file.type });
        await BlobService.blobToStorage(blob, operation);
      },
      error: async () => {
        operation.subscription?.unsubscribe();
        operation.localBlobMeta.blobState = 'missing';
        operation.localBlobMeta.lastModified = undefined;
        await db.localBlobMeta.put(operation.localBlobMeta);
        if (operation.updateCallback) {
          await operation.updateCallback('error', operation);
        }
      },
    });
    operation.subscription = mapRequest;
    this.operations.set(origUrl, operation);
    return operation;
  }

  private static readFile(file: File, operation: BlobOperation): Observable<number> {
    return new Observable((subscriber: Subscriber<number>) => {
      operation.fileReader = new FileReader();
      operation.fileReadAborted = false;

      operation.fileReader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          subscriber.next(progress);
        }
      };

      operation.fileReader.onloadend = () => {
        subscriber.complete();
      };

      operation.fileReader.onerror = () => {
        subscriber.error('Failed to read file.');
      };

      operation.fileReader.readAsArrayBuffer(file);

      // Return cleanup function
      return () => {
        if (operation.fileReader && operation.fileReader.readyState === FileReader.LOADING) {
          operation.fileReadAborted = true;
          operation.fileReader.abort();
        }
      };
    });
  }

  private static async blobToStorage(blob: Blob, operation: BlobOperation) {
    try {
      await db.localBlob.add({
        id: operation.localBlobMeta.id,
        data: blob,
      });
      operation.localBlobMeta.blobState = 'downloaded';
      await db.localBlobMeta.put(operation.localBlobMeta);
      if (operation.updateCallback) {
        await operation.updateCallback('done', operation);
      }
    } catch (e) {
      operation.localBlobMeta.blobState = 'missing';
      await db.localBlobMeta.put(operation.localBlobMeta);
      operation.mapProgress = 0;
      if (operation.updateCallback) {
        await operation.updateCallback('error', operation);
      }
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
}
