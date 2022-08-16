import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { transform } from 'ol/proj';

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
export class GeocoderComponent {
  @ViewChild('searchField', { static: false }) el!: ElementRef;
  geocoderUrl = 'https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&searchText=';
  foundLocations: IFoundLocation[] = [];
  inputText = '';
  selected: IFoundLocationAttrs | null = null;

  /*
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only handle global events (to prevent input elements to be considered)
    const globalEvent = event.target instanceof HTMLBodyElement;
    if (
      globalEvent &&
      !this.sharedState.featureSource.getValue() &&
      !event.altKey &&
      event.code != 'Escape'
    ) {
      this.el.nativeElement.focus();
      this.el.nativeElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: event.key })
      );
    }
  }*/

  constructor(private http: HttpClient, public i18n: I18NService, public zsMapStateService: ZsMapStateService) {
    this.zsMapStateService.observeSession().subscribe((s) => {
      this.selected = null;
    });
  }

  private getCoordinate(geometry: any) {
    switch (geometry.getType()) {
      case 'Point':
        return geometry.getCoordinates();
      case 'LineString':
        return geometry.getCoordinates()[0];
      case 'Polygon':
        return geometry.getCoordinates()[0][0];
    }
    return null;
  }

  private mapFeatureForSearch(f: any) {
    const sig = f.get('sig');
    const sign = this.i18n.getLabelForSign(sig);
    let label = '';
    if (sign) {
      label += '<i>' + sign + '</i> ';
    }
    if (sig.label) {
      label += sig.label;
    }
    const normalizedLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = this.inputText.toLowerCase().split(' ');
    let allHits = true;

    words.forEach((word) => {
      if (!normalizedLabel.toLowerCase().includes(word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        allHits = false;
      }
    });
    const coordinates = this.getCoordinate(f.getGeometry());
    return {
      attrs: {
        label: label,
        normalizedLabel: normalizedLabel,
        mercatorCoordinates: coordinates,
        hit: coordinates ? allHits : false,
        feature: f,
      },
      uuid: f.getId(),
    };
  }

  geoCodeLoad() {
    if (this.inputText.length > 1) {
      const originalInput = this.inputText;
      this.http.get(this.geocoderUrl + this.inputText).subscribe((result) => {
        if (this.inputText === originalInput) {
          this.foundLocations = [];
          // TODO: Why is this code needed?
          /*
          this.drawLayer.source
            .getFeatures()
            .map((f) => this.mapFeatureForSearch(f))
            .filter((f) => {
              return f.attrs.hit;
            })
            .forEach((f) => {
              this.foundLocations.push(f);
            });
          this.drawLayer.clusterSource
            .getFeatures()
            .map((f) => this.mapFeatureForSearch(f))
            .filter((f) => {
              return f.attrs.hit;
            })
            .forEach((f) => {
              this.foundLocations.push(f);
            });*/

          result['results'].forEach((r: IFoundLocation) => this.foundLocations.push(r));
        }
      });
    } else {
      this.foundLocations = [];
      this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
    }
  }

  getLabel(selected: IFoundLocationAttrs): string {
    return selected ? selected.label.replace(/<[^>]*>/g, '') : "";
  }

  geoCodeSelected(event: any) {
    this.selected = event.option.value;
    this.goToCoordinate(true);
    this.inputText = '';
  }

  previewCoordinate(element: any) {
    this.doGoToCoordinate(element, false, false);
  }

  private doGoToCoordinate(element: IFoundLocationAttrs | null, center: boolean, select: boolean) {
    if (element) {
      let coordinates;
      if (element.mercatorCoordinates) {
        coordinates = [element.mercatorCoordinates[1], element.mercatorCoordinates[0]];
        if (select) {
          //this.sharedState.selectFeature(element.feature);
        }
        this.zsMapStateService.updatePositionFlag({
          isVisible: true,
          coordinates: coordinates,
        });
        if (center) {
          this.zsMapStateService.setMapCenter(coordinates);
        }
      } else {
        coordinates = transform([element.lon, element.lat], 'EPSG:4326', 'EPSG:3857');
        this.zsMapStateService.updatePositionFlag({
          isVisible: true,
          coordinates: coordinates,
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
    this.doGoToCoordinate(this.selected, center, true);
  }

  removeSelectedLocation() {
    this.selected = null;
    this.zsMapStateService.updatePositionFlag({ isVisible: false, coordinates: [0, 0] });
  }
}
