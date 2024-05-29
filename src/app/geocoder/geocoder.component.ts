import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { transform } from 'ol/proj';
import { SessionService } from '../session/session.service';
import { Subject, takeUntil } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { IZsMapSearchConfig, IZsMapSearchResult } from '../state/interfaces';

interface IFoundLocation {
  attrs: IFoundLocationAttrs;
}

interface IFoundLocationAttrs {
  label: string;
  lon: number;
  lat: number;
}

interface IResultSet {
  config: IZsMapSearchConfig;
  results: IZsMapSearchResult[];
  collapsed: boolean | 'peek';
}

@Component({
  selector: 'app-geocoder',
  templateUrl: './geocoder.component.html',
  styleUrls: ['./geocoder.component.css'],
})
export class GeocoderComponent implements OnDestroy {
  @ViewChild('searchField', { static: false }) el!: ElementRef;
  geocoderUrl = 'https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&searchText=';
  foundLocations: IResultSet[] = [];
  inputText = '';
  selected: IZsMapSearchResult | null = null;
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    public i18n: I18NService,
    public zsMapStateService: ZsMapStateService,
    private _session: SessionService,
    private ref: ChangeDetectorRef,
  ) {
    this._session
      .observeAuthenticated()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(() => {
        this.selected = null;
      });
    zsMapStateService.addSearch(this.geoAdminLocationSearch.bind(this), 'Geo Admin', undefined, 100);
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  async geoAdminLocationSearch(text: string, maxResultCount?: number) {
    let url = this.geocoderUrl + encodeURIComponent(text);
    if (maxResultCount !== undefined) {
      url = `${url}&limit=${maxResultCount}`;
    }
    const result: { results: IFoundLocation[] } = await fetch(url).then((response) => response.json());
    if (this.inputText !== text) {
      // if there is already a new search query skip map results as they are not displayed.
      return [];
    }
    const foundLocations: IZsMapSearchResult[] = [];
    result.results
      .filter((r) => r?.attrs?.label)
      .forEach((r) => foundLocations.push({ label: r.attrs.label, lonLat: [r.attrs.lon, r.attrs.lat], internal: r }));
    return foundLocations;
  }

  async geoCodeLoad() {
    if (this.inputText.length > 1) {
      const originalInput = this.inputText;
      const configs = this.zsMapStateService.getSearchConfigs().sort((a, b) => a.resultOrder - b.resultOrder);
      const newResultSets: IResultSet[] = [];
      for (const config of configs) {
        if (this.inputText !== originalInput) {
          // break handling if input changes
          return;
        }
        const results = await config.func(originalInput, config.maxResultCount);
        if (results.length > 0) {
          newResultSets.push({ config, results, collapsed: 'peek' });
        }
      }
      if (this.inputText === originalInput) {
        // only continue update if no new search is started
        this.foundLocations.forEach((s) => s.results.forEach((x) => x.feature?.unset('ZsMapSearchResult')));
        newResultSets.forEach((s) => s.results.forEach((x) => x.feature?.set('ZsMapSearchResult', true)));
        if (newResultSets.length > 3) {
          newResultSets.forEach((s) => (s.collapsed = true));
        }
        this.foundLocations = newResultSets;
      }
    } else {
      this.foundLocations.forEach((s) => s.results.forEach((x) => x.feature?.unset('ZsMapSearchResult')));
      this.foundLocations = [];
      this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    }
    // need to do this explicit, it seams to have problem with this async approach
    this.ref.detectChanges();
  }

  // skipcq: JS-0105
  expandGroup(group: IResultSet, $event: MouseEvent) {
    if (!($event.target as Element).closest('mat-option')) {
      group.collapsed = !group.collapsed;
      $event.preventDefault();
    }
  }

  // skipcq: JS-0105
  getLabel(selected: IZsMapSearchResult): string {
    return selected ? selected.label.replace(/<[^>]*>/g, '') : '';
  }

  geoCodeSelected(event: MatAutocompleteSelectedEvent) {
    this.selected = event.option.value;
    this.goToCoordinate(true);
    this.inputText = '';
  }

  previewCoordinate(element: IZsMapSearchResult) {
    this.doGoToCoordinate(element, false);
  }

  private doGoToCoordinate(element: IZsMapSearchResult | null, center: boolean) {
    if (element) {
      let coordinates;
      if (element.mercatorCoordinates) {
        coordinates = element.mercatorCoordinates;
      } else if (element.lonLat) {
        coordinates = transform(element.lonLat, 'EPSG:4326', 'EPSG:3857');
      }
      if (coordinates) {
        this.zsMapStateService.updatePositionFlag({ isVisible: true, coordinates });
        if (center) {
          this.zsMapStateService.setMapCenter(coordinates);
        }
        return;
      }
    }
    this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
  }

  goToCoordinate(center: boolean) {
    this.doGoToCoordinate(this.selected, center);
  }
}
