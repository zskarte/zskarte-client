import { Component, OnInit } from '@angular/core';
import { I18NService } from '../../state/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { MapLegendDisplayComponent } from '../map-legend-display/map-legend-display.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import findOfflineHost from '../../helper/findOfflineHost';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapStateSource } from 'src/app/state/interfaces';
import { GeoadminService } from 'src/app/core/geoadmin.service';
import { GeoFeature } from '../../core/entity/geoFeature';

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
  availableFeatures: GeoFeature[] = [];
  filteredAvailableFeatures: GeoFeature[] = [];

  layerFilter = '';

  constructor(
    public mapState: ZsMapStateService,
    private geoAdminService: GeoadminService,
    public i18n: I18NService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // this.sharedState.availableFeatures.subscribe((features) => {
    //   this.updateFilteredFeatures();
    // });

    this.geoAdminService.getFeatures().subscribe((features) => {
      this.availableFeatures = Object.values(features);
      this.updateFilteredFeatures();
    });
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

  updateFilteredFeatures() {
    this.filteredAvailableFeatures =
      this.layerFilter === ''
        ? this.availableFeatures
        : this.availableFeatures.filter((f) => f.label.toLowerCase().includes(this.layerFilter.toLowerCase()));
  }

  showLegend(item: GeoFeature) {
    this.dialog.open(MapLegendDisplayComponent, {
      data: item.serverLayerName,
    });
  }
}
