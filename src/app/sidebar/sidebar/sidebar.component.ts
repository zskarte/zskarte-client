import { Component, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { ZsMapStateService } from '../../state/state.service';
import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from '../../state/interfaces';
import { GeoadminService } from '../../map-layer/geoadmin/geoadmin.service';
import { GeoJSONMapLayer, MapLayer, WMSMapLayer, WmsSource } from '../../map-layer/map-layer-interface';
import { combineLatest, firstValueFrom, map, mergeMap, Observable, of, share, startWith, catchError, tap } from 'rxjs';
import { FormControl } from '@angular/forms';
import { I18NService } from '../../state/i18n.service';
import { db, LocalBlobMeta, LocalBlobState, LocalMapInfo } from '../../db/db';
import { BlobEventType, BlobOperation, BlobService } from 'src/app/db/blob.service';
import { WmsService } from '../../map-layer/wms/wms.service';
import { WmsSourceComponent } from '../../map-layer/wms/wms-source/wms-source.component';
import { WmsLayerOptionsComponent } from '../../map-layer/wms/wms-layer-options/wms-layer-options.component';
import { GeoJSONLayerOptionsComponent } from '../../map-layer/geojson/geojson-layer-options/geojson-layer-options.component';
import { SessionService } from '../../session/session.service';
import { isEqual } from 'lodash';
import { OperationService } from '../../session/operations/operation.service';
import { OrganisationLayerSettingsComponent } from '../../map-layer/organisation-layer-settings/organisation-layer-settings.component';
import { IZsMapOrganizationMapLayerSettings } from '../../session/operations/operation.interfaces';
import { MapLayerService } from 'src/app/map-layer/map-layer.service';
import { BlobMetaOptionsComponent } from 'src/app/map-layer/blob-meta-options/blob-meta-options.component';
import { LOCAL_MAP_STYLE_PATH } from 'src/app/session/default-map-values';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @ViewChild('newLayerTypeTemplate') newLayerTypeTemplate!: TemplateRef<HTMLElement>;
  newLayerType?: string;
  mapProgress = 0;

  mapSources = Object.values(ZsMapStateSource)
    .map((key) => ({
      key,
      translation: this.i18n.get(key),
      selected: false,
      downloadable: this.isDownloadableMap(key),
      offlineAvailable: false,
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

  mapDownloadStates: { [key: string]: LocalBlobState } = {};
  wmsSourceLoadErrors: { [key: string]: string } = {};
  availableWmsService: WmsSource[] = [];
  geoAdminLayerError: string | undefined;
  workLocal: boolean;

  constructor(
    public mapState: ZsMapStateService,
    geoAdminService: GeoadminService,
    public wmsService: WmsService,
    private operationService: OperationService,
    private _session: SessionService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private _blobService: BlobService,
    private cdRef: ChangeDetectorRef,
    private _mapLayerService: MapLayerService,
  ) {
    this.workLocal = _session.isWorkLocal();
    const geoAdminLayers$ = geoAdminService.getLayers().pipe(
      map((layers) => Object.values(layers)),
      map((layers) => layers.filter((f) => !f['parentLayerId'] && f['type'] !== 'geojson')),
      tap(() => {
        delete this.geoAdminLayerError;
      }),
      catchError((err) => {
        console.error('get geoAdminLayers failed with error', err);
        this.geoAdminLayerError = err.message;
        return of([]);
      }),
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

    const globalMapLayers$ = mapState.observeGlobalMapLayers$();

    this.allLayers$ = combineLatest([geoAdminLayers$, wmsLayers$, globalMapLayers$]).pipe(
      map(([geo, wms, globalMapLayers]) => {
        return [...geo, ...wms, ...globalMapLayers];
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
          if (source === '_GlobalMapLayers_') {
            layers = layers.filter((f) => f.id !== undefined);
          } else {
            const sourceFilter = source === '_GeoAdmin_' ? undefined : source;
            layers = layers.filter((f) => f.source?.url === sourceFilter);
          }
        }
        return filter === '' ? layers : layers.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? ''));
      }),
    );

    this.favouriteLayers$ = combineLatest([_session.observeFavoriteLayers$(), mapState.observeSelectedMapLayers$(), availableLayers$]).pipe(
      map(([favoriteLayers, selectedLayers, availableLayers]) => {
        if (favoriteLayers?.length) {
          const selectedIds = selectedLayers.map((l: MapLayer) => l.id);
          return mapState
            .getGlobalMapLayers()
            .filter((l) => l.id && favoriteLayers.includes(l.id))
            .filter((l) => !l.id || !selectedIds.includes(l.id))
            .sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label));
        } else {
          return availableLayers
            .filter((layer: MapLayer) => this.favouriteLayerList.includes(layer.fullId))
            .sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label));
        }
      }),
    );

    db.localMapInfo.toArray().then(async (downloadedMaps) => {
      this.mapDownloadStates = {};
      for (const val of downloadedMaps) {
        const mapSourceInfos = this.mapSources.find((m) => m.key === val.map);
        if (mapSourceInfos) {
          mapSourceInfos.offlineAvailable = val.offlineAvailable ?? false;
        }
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

  async editLayerSettings() {
    const wmsSources = this.mapState.getGlobalWmsSources();
    const globalMapLayers = this.mapState.getGlobalMapLayers();
    const allLayers = await firstValueFrom(this.allLayers$);
    const selectedLayers = [...(await firstValueFrom(this.mapState.observeSelectedMapLayers$()))];
    const selectedSources = (await firstValueFrom(this.mapState.observeWmsSources$())) || [];
    const organization = this._session.getOrganization();
    const localMapLayerSettings = await MapLayerService.loadLocalMapLayerSettings();
    const settingsDialog = this.dialog.open(OrganisationLayerSettingsComponent, {
      data: { wmsSources, globalMapLayers, allLayers, selectedLayers, selectedSources, organization, localMapLayerSettings },
    });
    settingsDialog.afterClosed().subscribe((result: IZsMapOrganizationMapLayerSettings) => {
      if (result) {
        //set selectedLayers on state, to make sure now saved layers have the new id information available.
        this.mapState.updateDisplayState((draft) => {
          draft.layers = selectedLayers;
        });
        //persist organisation settings
        this._session.saveOrganizationMapLayerSettings(result);
      }
    });
  }

  async editWmsSources() {
    const sources = (await firstValueFrom(this.mapState.observeWmsSources$())) || [];
    const sourceDialog = this.dialog.open(WmsSourceComponent, {
      data: sources,
    });
    sourceDialog.afterClosed().subscribe(async (changedSources: WmsSource[]) => {
      if (changedSources) {
        const ownSources = changedSources.filter((s) => s.owner);
        const changedOwnSources = ownSources.filter((ownSource) => {
          let source = sources.find((s) => s.owner && s.id === ownSource.id);
          if (!source) {
            source = sources.find((s) => s.owner && s.url === ownSource.url);
          }
          return !source || !isEqual(ownSource, source);
        });
        const organizationId = this._session.getOrganizationId();
        if (organizationId) {
          for (const changedOwnSource of changedOwnSources) {
            const updatedSource = await this.wmsService.saveGlobalWMSSource(changedOwnSource, organizationId);
            if (updatedSource) {
              const index = changedSources.indexOf(changedOwnSource);
              if (index !== -1) {
                changedSources[index] = updatedSource;
              }
            }
          }
        }
        this.mapState.setWmsSources(changedSources);
        this.mapState.reloadAllMapLayers();
      }
    });
  }

  showWmsLayerOptions(item: MapLayer, index: number) {
    const optionsDialog = this.dialog.open(WmsLayerOptionsComponent, {
      data: item as WMSMapLayer,
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

  showGeoJSONLayerOptions(item: MapLayer, index: number) {
    const optionsDialog = this.dialog.open(GeoJSONLayerOptionsComponent, {
      data: item,
    });
    optionsDialog.afterClosed().subscribe((layer: GeoJSONMapLayer) => {
      if (layer) {
        if (index === -1) {
          this.mapState.addMapLayer(layer);
        } else {
          this.mapState.replaceMapLayer(layer, index);
        }
      }
    });
  }

  showLocalInfo(item: MapLayer, index: number) {
    const localDialog = this.dialog.open(BlobMetaOptionsComponent, {
      data: { mapLayer: item },
      disableClose: true,
    });
    localDialog.afterClosed().subscribe(async (layer: MapLayer | undefined) => {
      if (layer) {
        await this._mapLayerService.saveLocalMapLayer(layer, false);
        this.mapState.replaceMapLayer(layer, index);
      }
    });
  }

  async showLocalInfoMap(map: ZsMapStateSource, index: number) {
    const localMapInfo = await db.localMapInfo.get(map);
    const localDialog = this.dialog.open(BlobMetaOptionsComponent, {
      data: { localMap: localMapInfo || { map } },
      disableClose: true,
    });
    localDialog.afterClosed().subscribe(async (localMapInfo: LocalMapInfo | undefined) => {
      if (localMapInfo) {
        await db.localMapInfo.put(localMapInfo);
        this.mapSources[index].offlineAvailable = localMapInfo.offlineAvailable ?? false;
        this.reloadSourceIfLocal();
      }
    });
  }

  addNewLayer() {
    const optionsDialog = this.dialog.open(this.newLayerTypeTemplate);
    optionsDialog.afterClosed().subscribe((type: string) => {
      if (type === 'wms_custom') {
        this.showWmsLayerOptions({ type, serverLayerName: '' } as WMSMapLayer, -1);
      } else if (type === 'geojson' || type === 'csv') {
        this.showGeoJSONLayerOptions({ type, opacity: 1.0, serverLayerName: null } as GeoJSONMapLayer, -1);
      }
    });
  }

  async persistLayers() {
    const operationId = this._session.getOperationId();
    if (operationId) {
      const mapSource = await firstValueFrom(this.mapState.observeMapSource());
      const selectedLayers = await firstValueFrom(this.mapState.observeSelectedMapLayers$());

      //only save difference to globalMapLayer informations
      //if this is saved like that it's clean but complicated to rehydrate the required informations on loading...
      //const allLayers = await firstValueFrom(this.allLayers$);
      //const layerConfigs = selectedLayers.map((layer) => MapLayerService.extractMapLayerDiffs(layer, allLayers));
      const layerConfigs = selectedLayers;
      const mapLayers = { baseLayer: mapSource, layerConfigs };
      const operation = this._session.getOperation();
      if (operation) {
        operation.mapLayers = mapLayers;
      }
      this.operationService.updateMapLayers(operationId, mapLayers);
    }
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
    localMapInfo.offlineAvailable = localBlobMeta.blobState === 'downloaded';
    await db.localMapInfo.put(localMapInfo);

    if (localMapInfo.offlineAvailable) {
      localBlobMeta = await this._blobService.downloadBlob(LOCAL_MAP_STYLE_PATH, localMapInfo.styleBlobId);
      localMapInfo.styleBlobId = localBlobMeta.id;
      localMapInfo.offlineAvailable = localBlobMeta.blobState === 'downloaded';
      await db.localMapInfo.put(localMapInfo);

      if (localMapInfo.offlineAvailable) {
        this.reloadSourceIfLocal();
      }
    }
    const mapSource = this.mapSources.find((m) => m.key === localMapInfo.map);
    if (mapSource) {
      mapSource.offlineAvailable = localMapInfo.offlineAvailable;
    }
  }

  async removeLocalMap(map: ZsMapStateSource): Promise<void> {
    const blobMeta = await db.localMapInfo.get(map);
    if (!blobMeta || (!blobMeta.mapBlobId && !blobMeta.styleBlobId)) return;
    blobMeta.offlineAvailable = false;
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
    const mapSource = this.mapSources.find((m) => m.key === map);
    if (mapSource) {
      mapSource.offlineAvailable = false;
    }
    this.mapProgress = 0;
    this.cdRef.detectChanges();
    this.reloadSourceIfLocal();
  }
}
