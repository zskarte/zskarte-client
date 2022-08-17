import { Component, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { DetailImageViewComponent } from '../detail-image-view/detail-image-view.component';
import { MatSliderChange } from '@angular/material/slider';
import { I18NService } from '../state/i18n.service';
import { defineDefaultValuesForSignature, getColorForCategory, Sign } from '../core/entity/sign';
import { ZsMapStateService } from '../state/state.service';
import { Signs } from '../map-renderer/signs';
import { CustomImageStoreService } from '../state/custom-image-store.service';
import { DrawStyle } from '../map-renderer/draw-style';
import { firstValueFrom, Observable } from 'rxjs';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { map } from 'rxjs/operators';
import { ZsMapDisplayMode } from '../state/interfaces';
import { ZsMapOLFeatureProps } from '../map-renderer/elements/base/ol-feature-props';
import { EditCoordinatesComponent } from '../edit-coordinates/edit-coordinates.component';

@Component({
  selector: 'app-selected-feature',
  templateUrl: './selected-feature.component.html',
  styleUrls: ['./selected-feature.component.css'],
})
export class SelectedFeatureComponent {
  groupedFeatures = null;
  editMode: Observable<boolean>;
  selectedFeature: Observable<Feature | null>;
  selectedSignature: Sign | null = null;
  drawHoleMode: Observable<boolean>;
  mergeMode: Observable<boolean>;

  quickColors = [
    {
      value: getColorForCategory('damage'), // red
      viewValue: 'damage',
    },
    {
      value: getColorForCategory('action'), // blue
      viewValue: 'resources',
    },
    {
      value: getColorForCategory('danger'), //TODO
      viewValue: 'danger',
    },
    {
      value: getColorForCategory('effect'), // yellow #948B68
      viewValue: 'effects',
    },
  ];

  constructor(public dialog: MatDialog, public i18n: I18NService, public zsMapStateService: ZsMapStateService) {
    this.selectedFeature = this.zsMapStateService.observeSelectedFeature();

    this.selectedFeature.subscribe((feature) => {
      if (feature && feature.get('features')) {
        if (feature.get('features').length === 1) {
          this.groupedFeatures = null;
          this.activeFeatureSelect(feature.get('features')[0]);
        } else {
          this.groupedFeatures = this.extractFeatureGroups(feature.get('features'));
        }
      } else {
        this.groupedFeatures = null;
        this.activeFeatureSelect(feature);
      }
    });

    this.editMode = this.zsMapStateService
      .observeDisplayState()
      .pipe(map((displayState) => displayState.displayMode === ZsMapDisplayMode.DRAW));

    this.drawHoleMode = this.zsMapStateService.observeDrawHoleMode();
    this.mergeMode = this.zsMapStateService.observeMergeMode();
  }

  get featureGroups() {
    return this.groupedFeatures ? Object.values(this.groupedFeatures).sort((a: any, b: any) => a.label.localeCompare(b.label)) : null;
  }

  async isPolygon() {
    const feature = await firstValueFrom(this.selectedFeature);
    return ['Polygon', 'MultiPolygon'].includes(feature?.getGeometry()?.getType() ?? '');
  }

  async isLine() {
    const feature = await firstValueFrom(this.selectedFeature);
    return feature?.getGeometry()?.getType() === 'LineString';
  }

  async canSplit() {
    const feature = await firstValueFrom(this.selectedFeature);
    const isPolygon = await this.isPolygon();
    const point = <Point>feature?.getGeometry();
    return isPolygon && this.selectedFeature != null && point?.getCoordinates().length > 1;
  }

  /*
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only handle global events (to prevent input elements to be considered)
    const globalEvent = event.target instanceof HTMLBodyElement;
    if (globalEvent && this.selectedFeature && this.selectedSignature) {
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          this.delete();
          break;
        case '+':
          this.selectedSignature.strokeWidth += 0.1;
          this.redraw();
          break;
        case '-':
          this.selectedSignature.strokeWidth -= 0.1;
          this.redraw();
          break;
        case 'g':
          this.merge(true);
          break;
        case 'Escape':
          if (this.mergeMode) {
            this.merge(false);
          } else {
            this.sharedState.selectFeature(null);
          }
          break;
        case 'PageUp':
          this.bringToFront();
          break;
        case 'PageDown':
          this.sendToBack();
          break;
        case 'h':
          this.drawHole();
          break;
        case 'c':
          this.editCoordinates();
          break;
      }
    }
  }*/

  private extractFeatureGroups(allFeatures: any[]): any {
    const result = {};
    allFeatures.forEach((f) => {
      const sig = f.get('sig');
      const label = this.i18n.getLabelForSign(sig);
      let group = result[label];
      if (!group) {
        group = result[label] = {
          label: label,
        };
      }
      if (!group.src && sig.src) {
        group.src = sig.src;
      }
      if (!group.features) {
        group.features = [];
      }
      group.features.push(f);
    });
    return result;
  }

  showFeature(feature: any) {
    /*
    if (feature && feature.getGeometry()) {
      this.sharedState.gotoCoordinate({
        lon: feature.getGeometry().getCoordinates()[0],
        lat: feature.getGeometry().getCoordinates()[1],
        mercator: true,
        center: false,
      });
    }*/
  }

  hideFeature() {
    // this.sharedState.gotoCoordinate(null);
  }

  private activeFeatureSelect(feature: Feature | null) {
    this.selectedSignature = feature ? feature.get('sig') : null;
    if (this.selectedSignature) {
      defineDefaultValuesForSignature(this.selectedSignature);
    }
  }

  toggleLockOfFeature() {
    /*
    // Reselect so the locking is handled appropriately
    this.sharedState.featureSource.next(this.selectedFeature);
    this.redraw();*/
  }

  redraw() {
    //this.selectedFeature.changed();
  }

  addImage() {
    /*
    const dialogRef = this.dialog.open(DrawingDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.src) {
        this.selectedSignature.images.push(result.src);
        this.redraw();
      }
    });*/
  }

  removeImage(src: string) {
    /*
    this.selectedSignature.images.splice(this.selectedSignature.images.indexOf(src), 1);
    this.redraw();
    */
  }

  chooseSymbol() {
    /*
    const dialogRef = this.dialog.open(DrawingDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.selectedSignature.src = result.src;
        this.selectedSignature.de = result.de;
        this.selectedSignature.fr = result.fr;
        this.selectedSignature.en = result.en;
        this.redraw();
      }
    });*/
  }

  async editCoordinates() {
    const selectedFeature = await firstValueFrom(this.selectedFeature);
    if (selectedFeature) {
      const geometry = <Point>selectedFeature.getGeometry();
      const editDialog = this.dialog.open(EditCoordinatesComponent, {
        data: {
          geometry: selectedFeature.getGeometry()?.getType(),
          coordinates: JSON.stringify(geometry.getCoordinates()),
        },
      });
      editDialog.afterClosed().subscribe((result) => {
        if (result) {
          //geometry.setCoordinates(result);
        }
      });
    }
  }

  delete() {
    const confirm = this.dialog.open(ConfirmationDialogComponent, {
      data: this.i18n.get('removeFeatureFromMapConfirm'),
    });
    confirm.afterClosed().subscribe(async (r) => {
      if (r) {
        const feature = await firstValueFrom(this.selectedFeature);
        this.zsMapStateService.removeDrawElement(feature?.get(ZsMapOLFeatureProps.DRAW_ELEMENT_ID));
        this.zsMapStateService.resetSelectedFeature();
      }
    });
  }

  getOriginalImageUrl(file: string) {
    return CustomImageStoreService.getOriginalImageDataUrl(file);
  }

  getImageUrl(file: string) {
    const imageFromStore = CustomImageStoreService.getImageDataUrl(file);
    if (imageFromStore) {
      return imageFromStore;
    }
    return DrawStyle.getImageUrl(file);
  }

  async drawHole() {
    const isPolygon = await this.isPolygon();
    if (isPolygon) {
      //this.sharedState.updateDrawHoleMode(!this.drawHoleMode);
    }
  }

  async merge(merge: boolean) {
    const isPolygon = await this.isPolygon();
    if (merge && this.selectedFeature && isPolygon) {
      this.zsMapStateService.setMergeMode(true);
    } else {
      this.zsMapStateService.setMergeMode(false);
    }
  }

  async split() {
    const canSplit = await this.canSplit();
    if (canSplit) {
      this.zsMapStateService.setSplitMode(true);
    }
  }

  bringToFront() {
    this.zsMapStateService.setReorderMode(true);
  }

  sendToBack() {
    this.zsMapStateService.setReorderMode(false);
  }

  findSigBySrc(src: any) {
    const fromCustomStore = CustomImageStoreService.getSign(src);
    if (fromCustomStore) {
      return fromCustomStore;
    }
    return Signs.getSignBySource(src);
  }

  openImageDetail(sig: any) {
    this.dialog.open(DetailImageViewComponent, { data: sig });
  }

  setSliderValueOnSignature(field: string, event: MatSliderChange) {
    const updateProp = (object: any, path: string[], value: any): any => {
      if (path.length === 1) object[path[0]] = value;
      else if (path.length === 0) throw new Error('path not found');
      else {
        if (object[path[0]]) return updateProp(object[path[0]], path.slice(1), value);
        else {
          object[path[0]] = {};
          return updateProp(object[path[0]], path.slice(1), value);
        }
      }
    };
    updateProp(this.selectedSignature, field.split('.'), event.value);
    //this.redraw();
  }
}
