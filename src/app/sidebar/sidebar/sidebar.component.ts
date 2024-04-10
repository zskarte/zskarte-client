import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from 'src/app/state/interfaces';
import { GeoadminService } from 'src/app/core/geoadmin.service';
import { GeoFeature } from '../../core/entity/geoFeature';
import { combineLatest, lastValueFrom, map, Observable, share, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { I18NService } from '../../state/i18n.service';
import { db, LocalMapState } from '../../db/db';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
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
  ) {
    const allFeatures$ = geoAdminService.getFeatures().pipe(
      map((features) => Object.values(features)),
      map((features) => features.filter((f) => !f['parentLayerId'])),
      share(),
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
    let localMapMeta = await db.localMapMeta.get(downloadUrl);
    if (!localMapMeta) {
      localMapMeta = {
        url: downloadUrl,
        map,
        mapStatus: this.mapDownloadStates[map],
        objectUrl: undefined,
        mapStyle: undefined,
      };
      await db.localMapMeta.put(localMapMeta);
    }
    let localMapBlob = await db.localMapBlobs.get(localMapMeta.url);
    if (!localMapBlob) {
      try {
        const [localMap, mapStyle] = await Promise.all([
          lastValueFrom(this.http.get(downloadUrl, { responseType: 'blob' })),
          fetch('/assets/map-style.json').then((res) => res.text()),
        ]);
        localMapBlob = {
          url: localMapMeta.url,
          data: localMap,
        };
        await db.localMapBlobs.add(localMapBlob);
        localMapMeta.mapStyle = mapStyle;
        localMapMeta.objectUrl = undefined;
        localMapMeta.mapStatus = 'downloaded';
      } catch (e) {
        localMapMeta.mapStatus = 'missing';
      }
    }
    this.mapDownloadStates[map] = localMapMeta.mapStatus;
    await db.localMapMeta.put(localMapMeta);
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
  }
}
