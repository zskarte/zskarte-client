import { Component, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from 'src/app/state/interfaces';
import { GeoadminService } from 'src/app/core/geoadmin.service';
import { GeoFeature } from '../../core/entity/geoFeature';
import { combineLatest, map, Observable, share, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { I18NService } from '../../state/i18n.service';
import { db, LocalBlobMeta, LocalBlobState, LocalMapInfo } from '../../db/db';
import { BlobEventType, BlobOperation, BlobService } from 'src/app/db/blob.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  mapProgress = 0;

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

  mapDownloadStates: { [key: string]: LocalBlobState } = {};

  constructor(
    public mapState: ZsMapStateService,
    geoAdminService: GeoadminService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private _blobService: BlobService,
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

    db.localMapInfo.toArray().then(async (downloadedMaps) => {
      this.mapDownloadStates = {};
      for (const val of downloadedMaps) {
        if (val.mapBlobId) {
          const meta = await db.localBlobMeta.get(val.mapBlobId);
          if (meta) {
            this.mapDownloadStates[val.map] = meta?.blobState;
            continue;
          }
        }
        this.mapDownloadStates[val.map] = 'missing';
      }
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

  private updateMapCallback(map: ZsMapStateSource) {
    // skipcq: JS-0116
    return async (eventType: BlobEventType, infos: BlobOperation) => {
      this.mapDownloadStates[map] = infos.localBlobMeta.blobState;
      this.mapProgress = infos.mapProgress;
      this.cdRef.detectChanges();
    };
  }

  private reloadSourceIfLocal() {
    if (this.mapSources.find((m) => m.selected && m.key === ZsMapStateSource.LOCAL)) {
      //it's the active one reload it to use new location
      this.mapState.setMapSource(ZsMapStateSource.OPEN_STREET_MAP);
      this.mapState.setMapSource(ZsMapStateSource.LOCAL);
    }
  }

  async downloadMap(map: ZsMapStateSource) {
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const localMapInfo = (await db.localMapInfo.get(map)) || { map };

    const localBlobMeta = await this._blobService.downloadBlob(downloadUrl, localMapInfo.mapBlobId, this.updateMapCallback(map));
    this.handleBlobOperationResult(localBlobMeta, localMapInfo);
  }

  async cancelDownloadMap(map: ZsMapStateSource) {
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    await this._blobService.cancelDownload(downloadUrl);
  }

  async uploadMap(event: Event, map: ZsMapStateSource) {
    if (!event.target) return;

    this.mapDownloadStates[map] = 'loading';
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const localMapInfo = (await db.localMapInfo.get(map)) || { map };

    const localBlobMeta = await this._blobService.uploadBlob(event, downloadUrl, this.updateMapCallback(map));
    if (localBlobMeta) {
      this.handleBlobOperationResult(localBlobMeta, localMapInfo);
    }
  }

  async handleBlobOperationResult(localBlobMeta: LocalBlobMeta, localMapInfo: LocalMapInfo) {
    localMapInfo.mapBlobId = localBlobMeta.id;
    await db.localMapInfo.put(localMapInfo);

    if (localBlobMeta.blobState === 'downloaded') {
      localBlobMeta = await this._blobService.downloadBlob('/assets/map-style.json', localMapInfo.styleBlobId);
      localMapInfo.styleBlobId = localBlobMeta.id;
      await db.localMapInfo.put(localMapInfo);

      this.reloadSourceIfLocal();
    }
  }

  async removeLocalMap(map: ZsMapStateSource): Promise<void> {
    const blobMeta = await db.localMapInfo.get(map);
    if (!blobMeta || (!blobMeta.mapBlobId && !blobMeta.styleBlobId)) return;
    if (blobMeta.mapBlobId) {
      await BlobService.removeBlob(blobMeta.mapBlobId);
      blobMeta.mapBlobId = undefined;
      await db.localMapInfo.put(blobMeta);
    }
    if (blobMeta.styleBlobId) {
      await BlobService.removeBlob(blobMeta.styleBlobId);
      blobMeta.styleBlobId = undefined;
      await db.localMapInfo.put(blobMeta);
    }
    this.mapDownloadStates[map] = 'missing';
    this.mapProgress = 0;
    this.cdRef.detectChanges();
    this.reloadSourceIfLocal();
  }
}
