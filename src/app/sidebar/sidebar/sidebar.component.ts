import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from '../../state/interfaces';
import { GeoadminService } from '../../map-layer/geoadmin/geoadmin.service';
import { MapLayer, WMSMapLayer, WmsSource } from '../../map-layer/map-layer-interface';
import { combineLatest, firstValueFrom, lastValueFrom, map, mergeMap, Observable, of, share, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { I18NService } from '../../state/i18n.service';
import { db, LocalMapState } from '../../db/db';
import { HttpClient } from '@angular/common/http';
import { WmsService } from '../../map-layer/wms/wms.service';
import { WmsSourceComponent } from '../../map-layer/wms/wms-source/wms-source.component';
import { WmsLayerOptionsComponent } from '../../map-layer/wms/wms-layer-options/wms-layer-options.component';
import { SessionService } from '../../session/session.service';
import { OperationService } from '../../session/operations/operation.service';

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
    'undefined|ch.bafu.bundesinventare-auen',
    'undefined|ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill',
    'undefined|ch.swisstopo.swisstlm3d-gewaessernetz',
    'undefined|ch.swisstopo-karto.hangneigung',
    'undefined|ch.swisstopo.swisstlm3d-strassen',
    'undefined|ch.babs.kulturgueter',
    'undefined|ch.kantone.cadastralwebmap-farbe',
  ];

  layerFilter = new FormControl('');
  sourceFilter = new FormControl('ALL');

  mapDownloadStates: { [key: string]: LocalMapState } = {};
  wmsSourceLoadErrors: { [key: string]: string } = {};
  availableWmsService: WmsSource[] = [];

  constructor(
    public mapState: ZsMapStateService,
    geoAdminService: GeoadminService,
    public wmsService: WmsService,
    private operationService: OperationService,
    private _session: SessionService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private http: HttpClient,
  ) {
    const geoAdminLayers$ = geoAdminService.getLayers().pipe(
      map((layers) => Object.values(layers)),
      map((layers) => layers.filter((f) => !f['parentLayerId'] && f['type'] !== 'geojson')),
      share(),
    );

    function flatten<T>(arr: T[][]): T[] {
      return ([] as T[]).concat(...arr);
    }
    const wmsLayers$ = mapState.observeWmsSources$().pipe(
      mergeMap((sources) => {
        if (!sources) {
          return of([] as MapLayer[]);
        }
        this.wmsSourceLoadErrors = {};
        const promises = sources.map((wms) =>
          (wms.type === 'wmts' ? wmsService.getWMTSCapaLayers(wms) : wmsService.getWMSCapaLayers(wms)).catch((err) => {
            console.error('get WMS Layers failed for', wms, 'with error', err);
            this.wmsSourceLoadErrors[wms.url] = err.toString();
            return [] as MapLayer[];
          }),
        );
        return Promise.all(promises).then((lists) => {
          return flatten(lists);
        });
      }),
    );

    this.allLayers$ = combineLatest([geoAdminLayers$, wmsLayers$]).pipe(
      map(([geo, wms]) => {
        return [...geo, ...wms];
      }),
    );

    const availableLayers$: Observable<MapLayer[]> = combineLatest([this.allLayers$, mapState.observeSelectedMapLayers$()]).pipe(
      map(([source, selected]) => {
        const selectedNames = selected.map((f) => f.fullId);
        return source.filter((s) => !selectedNames.includes(s.fullId));
      }),
    );
    const filter$ = this.layerFilter.valueChanges.pipe(startWith(''));
    const selectedSource$ = this.sourceFilter.valueChanges.pipe(startWith('ALL'));

    this.filteredAvailableLayers$ = combineLatest([availableLayers$, filter$, selectedSource$]).pipe(
      map(([layers, filter, source]) => {
        layers = layers.sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label));
        if (source !== 'ALL') {
          const sourceFilter = source === '_GeoAdmin_' ? undefined : source;
          layers = layers.filter((f) => f.source?.url === sourceFilter);
        }
        return filter === '' ? layers : layers.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? ''));
      }),
    );

    this.favouriteLayers$ = availableLayers$.pipe(
      map((layers) =>
        layers
          .filter((layer: MapLayer) => this.favouriteLayerList.includes(layer.fullId))
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
      data: item,
    });
  }

  selectLayer(layer: MapLayer) {
    this.mapState.addMapLayer(layer);
  }

  async editWmsSources() {
    const sources = (await firstValueFrom(this.mapState.observeWmsSources$())) || [];
    const sourceDialog = this.dialog.open(WmsSourceComponent, {
      data: sources,
    });
    sourceDialog.afterClosed().subscribe((changedSources: WmsSource[]) => {
      if (changedSources) {
        this.mapState.setWmsSources(changedSources);
        this.mapState.reloadAllMapLayers();
      }
    });
  }

  showWmsLayerOptions(item: WMSMapLayer, index: number) {
    const optionsDialog = this.dialog.open(WmsLayerOptionsComponent, {
      data: item,
    });
    optionsDialog.afterClosed().subscribe((layer: WMSMapLayer) => {
      if (layer) {
        if (index === -1) {
          this.mapState.addMapLayer(layer);
        } else {
          this.mapState.replaceMapLayer(layer, index);
        }
      }
    });
  }

  addNewLayer() {
    this.showWmsLayerOptions({ type: 'wms_custom', serverLayerName: '' } as WMSMapLayer, -1);
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
