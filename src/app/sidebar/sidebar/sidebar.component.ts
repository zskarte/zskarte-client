import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from '../../state/interfaces';
import { GeoadminService } from '../../core/geoadmin.service';
import { MapLayer } from '../../core/entity/map-layer-interface';
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
  filteredAvailableLayers$: Observable<MapLayer[]>;
  allLayers$: Observable<MapLayer[]>;
  favouriteLayers$: Observable<MapLayer[]>;
  favouriteLayerList = [
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
    const geoAdminLayers$ = geoAdminService.getLayers().pipe(
      map((layers) => Object.values(layers)),
      map((layers) => layers.filter((f) => !f['parentLayerId'] && f['type'] !== 'geojson')),
      share(),
    );
    this.allLayers$ = geoAdminLayers$;
    const availableLayers$: Observable<MapLayer[]> = combineLatest([this.allLayers$, mapState.observeSelectedMapLayers$()]).pipe(
      map(([source, selected]) => {
        const selectedNames = selected.map((f) => f.serverLayerName);
        return source.filter((s) => !selectedNames.includes(s.serverLayerName));
      }),
    );
    const filter$ = this.layerFilter.valueChanges.pipe(startWith(''));

    this.filteredAvailableLayers$ = combineLatest([availableLayers$, filter$]).pipe(
      map(([layers, filter]) => {
        layers = layers.sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label));
        return filter === '' ? layers : layers.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? ''));
      }),
    );

    this.favouriteLayers$ = availableLayers$.pipe(
      map((layers) =>
        layers
          .filter((layer: MapLayer) => this.favouriteLayerList.includes(layer.label.toLowerCase()))
          .sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label)),
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

  switchMapSource(layer: ZsMapStateSource) {
    this.mapState.setMapSource(layer);
  }

  showLegend(item: MapLayer) {
    this.dialog.open(MapLegendDisplayComponent, {
      data: item.serverLayerName,
    });
  }

  selectLayer(layer: MapLayer) {
    this.mapState.addMapLayer(layer);
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
