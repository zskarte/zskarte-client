import { Injectable } from '@angular/core';
import { Md5 } from 'ts-md5';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Sign } from '../core/entity/sign';
import { ZsMapStateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class CustomImageStoreService {
  constructor(private dbService: NgxIndexedDBService, private zsMapStateService: ZsMapStateService) {}

  private static inMemoryCache = {};

  public static STORE_IMAGES = 'images';

  public static getAllSigns(): Sign[] {
    return Object.values(CustomImageStoreService.inMemoryCache).map((i: any) => <Sign>i.sign);
  }

  public static isCustomImage(hash: string) {
    return hash in this.inMemoryCache;
  }

  public static getSign(hash: string): Sign | null {
    const fromMemory = CustomImageStoreService.inMemoryCache[hash];
    if (fromMemory) {
      return fromMemory.sign;
    }
    return null;
  }

  public static getDimensions(hash: string): number[] {
    const fromMemory = CustomImageStoreService.inMemoryCache[hash];
    if (fromMemory) {
      return fromMemory.nativeDimensions;
    }
    return [];
  }

  public static getImageDataUrl(hash: string) {
    const fromMemory = CustomImageStoreService.inMemoryCache[hash];
    if (fromMemory) {
      return fromMemory.image;
    }
    return null;
  }

  public static getOriginalImageDataUrl(hash: string) {
    const fromMemory = CustomImageStoreService.inMemoryCache[hash];
    if (fromMemory) {
      return fromMemory.originalImage;
    }
    return null;
  }

  public getAllEntriesForCurrentSession() {
    return Object.values(CustomImageStoreService.inMemoryCache).filter((i) => this.isValidForCurrentSession(i));
  }

  public importImages(images: any[]): Promise<any> {
    return new Promise<any>((resolve) => {
      if (!images) {
        resolve(null);
      }
      const promises: Promise<any>[] = [];
      images.forEach((i) => {
        const hash = i.sign.src;
        if (!CustomImageStoreService.isCustomImage(hash)) {
          CustomImageStoreService.inMemoryCache[hash] = i;
          promises.push(this.dbService.update(CustomImageStoreService.STORE_IMAGES, i).toPromise());
        }
      });
      if (promises.length > 0) {
        Promise.all(promises).then(() => resolve(null));
      } else {
        resolve(null);
      }
    });
  }

  private isValidForCurrentSession(image: any) {
    return !image.sign.onlyForSessionId || image.sign.onlyForSessionId === this.zsMapStateService.getCurrentSession()?.uuid;
  }

  public loadSignsInMemory(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.dbService
        .getAll(CustomImageStoreService.STORE_IMAGES)
        .toPromise()
        .then((images: any) => {
          CustomImageStoreService.inMemoryCache = {};
          images.forEach((image: any) => {
            if (this.isValidForCurrentSession(image)) {
              // @ts-ignore
              CustomImageStoreService.inMemoryCache[image.sign.src] = image;
            }
          });
          resolve(null);
        });
    });
  }

  public deleteSign(hash: string): Promise<any> {
    delete CustomImageStoreService.inMemoryCache[hash];
    return this.dbService.delete(CustomImageStoreService.STORE_IMAGES, hash).toPromise();
  }

  public saveSign(sign: Sign, payload: any, originalPayload: any, nativeDimensions: number[]): Promise<any> {
    sign.src = Md5.hashStr(payload).toString();
    const newSign = {
      sign: sign,
      image: payload,
      originalImage: originalPayload,
      nativeDimensions: nativeDimensions,
    };
    return new Promise<any>((resolve) => {
      this.dbService
        .update(CustomImageStoreService.STORE_IMAGES, newSign)
        .toPromise()
        .then(() => {
          CustomImageStoreService.inMemoryCache[sign.src] = newSign;
          resolve(sign);
        });
    });
  }
}
