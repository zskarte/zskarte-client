import { Component, EventEmitter, OnInit } from '@angular/core';
import { I18NService } from '../../core/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import findOfflineHost from '../../helper/findOfflineHost';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapStateSource } from 'src/app/state/interfaces';
import { GeoadminService } from 'src/app/core/geoadmin.service';
import { GeoFeature } from '../../core/entity/geoFeature';
import { map, Observable, tap, share, combineLatest, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  currentMapOpenState = false;
  selectedLayersOpenState = false;
  favoriteLayersOpenState = false;
  availableLayersOpenState = false;
  mapSources = Object.values(ZsMapStateSource);
  filteredAvailableFeatures$: Observable<GeoFeature[]>;
  favouriteFeatures$: Observable<GeoFeature[]>;
  favouriteFeaturesList = ['auengebiete', 'gemeindegrenzen', 'gewässer swisstlm3d', 'hangneigung ab 30°', 'strassen und wege swisstlm3d'];

  layerFilter = new FormControl('');

  constructor(
    public mapState: ZsMapStateService,
    private geoAdminService: GeoadminService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
  ) {
    const allFeatures$ = geoAdminService.getFeatures().pipe(
      share(),
      map((features) => Object.values(features)),
    );
    const availableFeatures$: Observable<GeoFeature[]> = combineLatest([allFeatures$, mapState.observeSelectedFeatures()]).pipe(
      map(([source, selected]) => {
        const selectedNames = selected.map((f) => f.serverLayerName);
        return source.filter((s) => !selectedNames.includes(s.serverLayerName));
      }),
    );
    const filter$ = this.layerFilter.valueChanges.pipe(startWith(''));

    this.filteredAvailableFeatures$ = combineLatest([availableFeatures$, filter$]).pipe(
      map(([features, filter]) =>
        filter === '' ? features : features.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? '')),
      ),
    );
    this.favouriteFeatures$ = availableFeatures$.pipe(
      map((features) => features.filter((feature: GeoFeature) => this.favouriteFeaturesList.includes(feature.label.toLowerCase()))),
    );
  }

  ngOnInit(): void {
    // this.sharedState.availableFeatures.subscribe((features) => {
    //   this.updateFilteredFeatures();
    // });
  }

  switchLayer(layer: ZsMapStateSource) {
    if (layer === ZsMapStateSource.OFFLINE) {
      const offlineHost = findOfflineHost();
      this.http.get(offlineHost).subscribe(
        () => this.mapState.setMapSource(layer),
        (error) => {
          if (error.status === 200) {
            this.mapState.setMapSource(layer);
          } else {
            console.log(error);
            this.snackBar.open(this.i18n.get('docOfflineMap').replace('${offlineHost}', offlineHost), this.i18n.get('close'), {
              duration: 6000,
            });
          }
        },
      );
    } else {
      this.mapState.setMapSource(layer);
    }
  }

  showLegend(item: GeoFeature) {
    this.dialog.open(MapLegendDisplayComponent, {
      data: item.serverLayerName,
    });
  }

  selectFeature(feature: GeoFeature) {
    this.mapState.addFeature(feature);
  }
}
