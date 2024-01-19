import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { transform } from 'ol/proj';
import { SessionService } from '../session/session.service';
import { Subject, takeUntil } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

interface IFoundLocation {
  attrs: IFoundLocationAttrs;
}

interface IFoundLocationAttrs {
  label: string;
  mercatorCoordinates: boolean;
  lon: number;
  lat: number;
}

@Component({
  selector: 'app-geocoder',
  templateUrl: './geocoder.component.html',
  styleUrls: ['./geocoder.component.css'],
})
export class GeocoderComponent implements OnDestroy {
  @ViewChild('searchField', { static: false }) el!: ElementRef;
  geocoderUrl = 'https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&searchText=';
  foundLocations: IFoundLocation[] = [];
  inputText = '';
  selected: IFoundLocationAttrs | null = null;
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    private http: HttpClient,
    public i18n: I18NService,
    public zsMapStateService: ZsMapStateService,
    private _session: SessionService,
  ) {
    this._session
      .observeAuthenticated()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(() => {
        this.selected = null;
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  geoCodeLoad() {
    if (this.inputText.length > 1) {
      const originalInput = this.inputText;
      this.http.get(this.geocoderUrl + this.inputText).subscribe((result) => {
        if (this.inputText === originalInput) {
          this.foundLocations = [];
          result['results'].forEach((r: IFoundLocation) => this.foundLocations.push(r));
        }
      });
    } else {
      this.foundLocations = [];
      this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    }
  }

  // skipcq: JS-0105
  getLabel(selected: IFoundLocationAttrs): string {
    return selected ? selected.label.replace(/<[^>]*>/g, '') : '';
  }

  geoCodeSelected(event: MatAutocompleteSelectedEvent) {
    this.selected = event.option.value;
    this.goToCoordinate(true);
    this.inputText = '';
  }

  previewCoordinate(element: IFoundLocationAttrs) {
    this.doGoToCoordinate(element, false);
  }

  private doGoToCoordinate(element: IFoundLocationAttrs | null, center: boolean) {
    if (element) {
      let coordinates;
      if (element.mercatorCoordinates) {
        coordinates = [element.mercatorCoordinates[1], element.mercatorCoordinates[0]];
        this.zsMapStateService.updatePositionFlag({
          isVisible: true,
          coordinates,
        });
        if (center) {
          this.zsMapStateService.setMapCenter(coordinates);
        }
      } else {
        coordinates = transform([element.lon, element.lat], 'EPSG:4326', 'EPSG:3857');
        this.zsMapStateService.updatePositionFlag({
          isVisible: true,
          coordinates,
        });

        if (center) {
          this.zsMapStateService.setMapCenter(coordinates);
        }
      }
    } else {
      this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    }
  }

  goToCoordinate(center: boolean) {
    this.doGoToCoordinate(this.selected, center);
  }
}
