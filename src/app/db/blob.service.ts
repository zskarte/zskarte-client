import { Injectable } from '@angular/core';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { BlobMeta, LocalMapState, db } from './db';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';

export type BlobEventType = 'mapProgress' | 'done' | 'cancel' | 'error' | 'removed';
export type UpdateCallback = (eventType: BlobEventType, blobOperation: BlobOperation) => Promise<void>;
export interface BlobOperation {
  url: string;
  mapProgress: number;
  fileReader?: FileReader;
  fileReadAborted: boolean;
  state: LocalMapState;
  updateCallback?: UpdateCallback;
  subscription?: Subscription;
}

@Injectable({
  providedIn: 'root',
})
export class BlobService {
  private operations = new Map<string, BlobOperation>();

  constructor(private http: HttpClient) {}

  public async downloadBlob(url: string, updateCallback?: UpdateCallback) {
    const localMapBlob = await db.localMapBlobs.get(url);
    const operation: BlobOperation = {
      url,
      mapProgress: 0,
      fileReadAborted: false,
      state: 'missing',
      updateCallback,
    };
    if (!localMapBlob) {
      operation.state = 'loading';
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
              operation.subscription?.unsubscribe();
              const blob = event.body as Blob;
              await BlobService.blobToStorage(url, blob, operation);
            }
          },
          error: async () => {
            operation.subscription?.unsubscribe();
            operation.state = 'missing';
            operation.mapProgress = 0;
            if (operation.updateCallback) {
              await operation.updateCallback('error', operation);
            }
          },
        });

      // Store the subscription so it can be cancelled later
      operation.subscription = mapRequest;
      this.operations.set(url, operation);
    } else {
      operation.state = 'downloaded';
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
      operation.state = 'missing';
      if (operation.updateCallback) {
        await operation.updateCallback('cancel', operation);
      }
    }
  }

  public uploadBlob(event: Event, url: string, updateCallback?: UpdateCallback) {
    if (!event.target) return null;

    this.operations.get(url)?.subscription?.unsubscribe();

    const operation: BlobOperation = {
      url,
      mapProgress: 0,
      fileReadAborted: false,
      state: 'loading',
      updateCallback,
    };

    const file = event.target['files'][0] as Blob;

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
          operation.state = 'missing';
          if (operation.updateCallback) {
            await operation.updateCallback('cancel', operation);
          }
          return;
        }
        const blob = new Blob([operation.fileReader.result as ArrayBuffer]);
        await BlobService.blobToStorage(url, blob, operation);
      },
      error: async () => {
        operation.subscription?.unsubscribe();
        operation.state = 'missing';
        if (operation.updateCallback) {
          await operation.updateCallback('error', operation);
        }
      },
    });
    operation.subscription = mapRequest;
    this.operations.set(url, operation);
    return operation;
  }

  private static readFile(file: Blob, operation: BlobOperation): Observable<number> {
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

  private static async blobToStorage(url: string, blob: Blob, operation: BlobOperation) {
    try {
      await db.localMapBlobs.add({
        url,
        data: blob,
      });
      operation.state = 'downloaded';
      if (operation.updateCallback) {
        await operation.updateCallback('done', operation);
      }
    } catch (e) {
      operation.state = 'missing';
      operation.mapProgress = 0;
      if (operation.updateCallback) {
        await operation.updateCallback('error', operation);
      }
    }
  }

  public static async removeBlob(url: string, meta?: BlobMeta) {
    await db.localMapBlobs.delete(url);
    if (meta) {
      await db.localMapBlobs.delete(meta.url);
      if (meta.objectUrl) {
        URL.revokeObjectURL(meta.objectUrl);
        meta.objectUrl = undefined;
      }
    }
  }

  public static async getBlobOrRealUrl(url: string, meta?: BlobMeta) {
    if (meta) {
      if (meta.objectUrl) {
        // There is no way to check if an object url is a valid reference
        // without making a request.
        // Because revoking and creating a new one is pretty fast,
        // we revoke and create a new url every time.
        // This prevents memory leaks and makes the laptops not crash :)
        URL.revokeObjectURL(meta.objectUrl);
        meta.objectUrl = undefined;
      }
      //if there is a meta the url will be the one saved there for sure.
      url = meta.url;
    }
    const blob = await db.localMapBlobs.get(url);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob.data);
      if (meta) {
        meta.objectUrl = objectUrl;
      }
      return objectUrl;
    }
    return url;
  }
}
