import { Component, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from 'src/app/state/interfaces';
import { GeoadminService } from 'src/app/core/geoadmin.service';
import { GeoFeature } from '../../core/entity/geoFeature';
import { combineLatest, Subscription, Subscriber, map, Observable, share, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { I18NService } from '../../state/i18n.service';
import { db, LocalMapMeta, LocalMapState } from '../../db/db';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  mapProgress: number = 0;
  private fileReader: FileReader = new FileReader();
  private fileReadAborted: boolean = false;
  private subscriptions = new Map<ZsMapStateSource, Subscription>();

  mapSources = Object.values(ZsMapStateSource)
    .map((key) => ({
      key,
      translation: this.i18n.get(key),
      selected: false,
      downloadable: this.isDownloadableMap(key),
    }))
    .sort((a, b) => a.translation.localeCompare(b.translation));
  filteredAvailableFeatures$: Observable<GeoFeature[]>;
  favouriteFeatures$: Observable<GeoFeature[]>;
  favouriteFeaturesList = [
    'auengebiete',
    'gemeindegrenzen',
    'gewässer swisstlm3d',
    'hangneigung ab 30°',
    'strassen und wege swisstlm3d',
    'kgs inventar',
  ];

  layerFilter = new FormControl('');

  mapDownloadStates: { [key: string]: LocalMapState } = {};

  constructor(
    public mapState: ZsMapStateService,
    geoAdminService: GeoadminService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
  ) {
    const allFeatures$ = geoAdminService.getFeatures().pipe(
      share(),
      map((features) => Object.values(features)),
    );
    const availableFeatures$: Observable<GeoFeature[]> = combineLatest([allFeatures$, mapState.observeSelectedFeatures$()]).pipe(
      map(([source, selected]) => {
        const selectedNames = selected.map((f) => f.serverLayerName);
        return source.filter((s) => !selectedNames.includes(s.serverLayerName));
      }),
    );
    const filter$ = this.layerFilter.valueChanges.pipe(startWith(''));

    this.filteredAvailableFeatures$ = combineLatest([availableFeatures$, filter$]).pipe(
      map(([features, filter]) => {
        features = features.sort((a: GeoFeature, b: GeoFeature) => a.label.localeCompare(b.label));
        return filter === '' ? features : features.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? ''));
      }),
    );
    this.favouriteFeatures$ = availableFeatures$.pipe(
      map((features) =>
        features
          .filter((feature: GeoFeature) => this.favouriteFeaturesList.includes(feature.label.toLowerCase()))
          .sort((a: GeoFeature, b: GeoFeature) => a.label.localeCompare(b.label)),
      ),
    );

    db.localMapMeta.toArray().then((downloadedMaps) => {
      this.mapDownloadStates = downloadedMaps.reduce((acc, val) => {
        acc[val.map] = val.mapStatus;
        return acc;
      }, {});
    });

    mapState
      .observeMapSource()
      .pipe(
        map((currentMapSource) => {
          this.mapSources.forEach((mapSource) => {
            mapSource.selected = currentMapSource === mapSource.key;
          });
        }),
      )
      .subscribe();
  }

  switchLayer(layer: ZsMapStateSource) {
    this.mapState.setMapSource(layer);
  }

  showLegend(item: GeoFeature) {
    this.dialog.open(MapLegendDisplayComponent, {
      data: item.serverLayerName,
    });
  }

  selectFeature(feature: GeoFeature) {
    this.mapState.addFeature(feature);
  }

  // skipcq: JS-0105
  isDownloadableMap(map: ZsMapStateSource) {
    return map in zsMapStateSourceToDownloadUrl;
  }

  async downloadMap(map: ZsMapStateSource) {
    this.mapDownloadStates[map] = 'loading';
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const localMapMeta = (await db.localMapMeta.get(downloadUrl)) || {
      url: downloadUrl,
      map,
      mapStatus: 'missing',
      objectUrl: undefined,
      mapStyle: undefined,
    };

    await db.localMapMeta.put(localMapMeta);

    const localMapBlob = await db.localMapBlobs.get(localMapMeta.url);
    if (!localMapBlob) {
      const mapRequest = this.http
        .get(downloadUrl, {
          responseType: 'blob',
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: async (event) => {
            if (event.type === HttpEventType.DownloadProgress) {
              this.mapProgress = Math.round((100 * event.loaded) / (event.total ?? 1));
              this.cdRef.detectChanges();
            } else if (event instanceof HttpResponse) {
              this.subscriptions.get(map)?.unsubscribe();
              const localMap = event.body as Blob;
              await this.blobToStorage(map, localMap, localMapMeta);
            }
          },
          error: async () => {
            this.subscriptions.get(map)?.unsubscribe();
            localMapMeta.mapStatus = 'missing';
            this.mapProgress = 0;
            this.mapDownloadStates[map] = localMapMeta.mapStatus;
            await db.localMapMeta.put(localMapMeta);
          },
        });

      // Store the subscription so it can be cancelled later
      this.subscriptions.set(map, mapRequest);
    }
  }

  async cancelDownloadMap(map: ZsMapStateSource) {
    this.mapDownloadStates[map] = 'missing';
    if (this.subscriptions.has(map)) {
      this.subscriptions.get(map)?.unsubscribe();
      this.subscriptions.delete(map);
      this.mapProgress = 0;
      const downloadUrl = zsMapStateSourceToDownloadUrl[map];
      const localMapMeta = await db.localMapMeta.get(downloadUrl);
      if (localMapMeta) {
        localMapMeta.mapStatus = 'missing';
        await db.localMapMeta.put(localMapMeta);
      }
    }
  }

  async uploadMap(event: Event, map: ZsMapStateSource) {
    if (!event.target) return;

    this.mapDownloadStates[map] = 'loading';
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const localMapMeta = (await db.localMapMeta.get(downloadUrl)) || {
      url: downloadUrl,
      map,
      mapStatus: 'missing',
      objectUrl: undefined,
      mapStyle: undefined,
    };

    await db.localMapMeta.put(localMapMeta);

    const file = event.target['files'][0] as Blob;
    this.subscriptions.get(map)?.unsubscribe();

    const mapRequest = this.readFile(file).subscribe({
      next: (percentDone) => {
        this.mapProgress = percentDone;
        this.cdRef.detectChanges();
      },
      complete: async () => {
        this.subscriptions.get(map)?.unsubscribe();
        if (this.fileReadAborted) {
          this.mapProgress = 0;
          return;
        }
        const blob = new Blob([this.fileReader.result as ArrayBuffer]);
        await this.blobToStorage(map, blob, localMapMeta);
      },
      error: async () => {
        this.subscriptions.get(map)?.unsubscribe();
        localMapMeta.mapStatus = 'missing';
        this.mapDownloadStates[map] = localMapMeta.mapStatus;
        await db.localMapMeta.put(localMapMeta);
      },
    });
    this.subscriptions.set(map, mapRequest);
  }

  readFile(file: Blob): Observable<number> {
    return new Observable((subscriber: Subscriber<number>) => {
      this.fileReader = new FileReader();
      this.fileReadAborted = false;

      this.fileReader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          subscriber.next(progress);
        }
      };

      this.fileReader.onloadend = () => {
        subscriber.complete();
      };

      this.fileReader.onerror = () => {
        subscriber.error('Failed to read file.');
      };

      this.fileReader.readAsArrayBuffer(file);

      // Return cleanup function
      return () => {
        if (this.fileReader.readyState === FileReader.LOADING) {
          this.fileReader.abort();
          this.fileReadAborted = true;
        }
      };
    });
  }

  private async blobToStorage(map: ZsMapStateSource, blob: Blob, localMapMeta: LocalMapMeta) {
    try {
      const mapStyleResponse = await fetch('/assets/map-style.json');
      const mapStyle = await mapStyleResponse.json();
      await db.localMapBlobs.add({
        url: localMapMeta.url,
        data: blob,
      });
      localMapMeta.mapStatus = 'downloaded';
      localMapMeta.mapStyle = mapStyle;
      localMapMeta.objectUrl = undefined;
    } catch (e) {
      localMapMeta.mapStatus = 'missing';
      this.mapProgress = 0;
    }
    this.mapDownloadStates[map] = localMapMeta.mapStatus;
    await db.localMapMeta.put(localMapMeta);
    this.cdRef.detectChanges();
  }

  async removeLocalMap(map: ZsMapStateSource): Promise<void> {
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const blobMeta = await db.localMapMeta.get(downloadUrl);
    if (!blobMeta) return;
    const objectUrl = blobMeta.objectUrl;
    await db.localMapBlobs.delete(downloadUrl);
    await db.localMapMeta.delete(downloadUrl);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    this.mapDownloadStates[map] = 'missing';
    this.mapProgress = 0;
    this.cdRef.detectChanges();
  }
}
