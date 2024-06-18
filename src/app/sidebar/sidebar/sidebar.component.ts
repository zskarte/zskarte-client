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
import { db, LocalMapMeta, LocalMapState } from '../../db/db';
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

  mapDownloadStates: { [key: string]: LocalMapState } = {};

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

  private updateMapCallback(map: ZsMapStateSource, localMapMeta: LocalMapMeta) {
    return async (eventType: BlobEventType, infos: BlobOperation) => {
      if (eventType === 'done') {
        const mapStyleResponse = await fetch('/assets/map-style.json');
        const mapStyle = await mapStyleResponse.json();
        localMapMeta.mapStyle = mapStyle;
        localMapMeta.objectUrl = undefined;
      }
      if (localMapMeta.mapStatus !== infos.state) {
        localMapMeta.mapStatus = infos.state;
        await db.localMapMeta.put(localMapMeta);
        this.mapDownloadStates[map] = infos.state;
      }
      this.mapProgress = infos.mapProgress;
      this.cdRef.detectChanges();
    };
  }

  async downloadMap(map: ZsMapStateSource) {
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    const localMapMeta = (await db.localMapMeta.get(downloadUrl)) || {
      url: downloadUrl,
      map,
      mapStatus: 'missing',
      objectUrl: undefined,
      mapStyle: undefined,
    };
    this._blobService.downloadBlob(downloadUrl, this.updateMapCallback(map, localMapMeta));
  }

  async cancelDownloadMap(map: ZsMapStateSource) {
    const downloadUrl = zsMapStateSourceToDownloadUrl[map];
    await this._blobService.cancelDownload(downloadUrl);
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

    this._blobService.uploadBlob(event, downloadUrl, this.updateMapCallback(map, localMapMeta));
  }

  async removeLocalMap(map: ZsMapStateSource): Promise<void> {
    const blobMeta = await db.localMapMeta.where('map').equals(map).first();
    if (!blobMeta) return;
    await BlobService.removeBlob(blobMeta.url, blobMeta);
    await db.localMapMeta.delete(blobMeta.url);
    if ((await db.localMapMeta.where('map').equals(map).count()) === 0) {
      this.mapDownloadStates[map] = 'missing';
      this.mapProgress = 0;
      this.cdRef.detectChanges();
    }
  }
}
