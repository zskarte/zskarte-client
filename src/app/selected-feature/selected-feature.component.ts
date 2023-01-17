import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { DetailImageViewComponent } from '../detail-image-view/detail-image-view.component';
import { MatSliderChange } from '@angular/material/slider';
import { I18NService } from '../state/i18n.service';
import { FillStyle, getColorForCategory, Sign } from '../core/entity/sign';
import { ZsMapStateService } from '../state/state.service';
import { Signs } from '../map-renderer/signs';
import { CustomImageStoreService } from '../state/custom-image-store.service';
import { DrawStyle } from '../map-renderer/draw-style';
import { EMPTY, firstValueFrom, Observable, Subject } from 'rxjs';
import { Feature } from 'ol';
import { Point, SimpleGeometry } from 'ol/geom';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { ZsMapDisplayMode, ZsMapDrawElementState, ZsMapDrawElementStateType } from '../state/interfaces';
import { EditCoordinatesComponent } from '../edit-coordinates/edit-coordinates.component';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';

@Component({
  selector: 'app-selected-feature',
  templateUrl: './selected-feature.component.html',
  styleUrls: ['./selected-feature.component.css'],
})
export class SelectedFeatureComponent implements OnDestroy {
  groupedFeatures = null;
  editMode: Observable<boolean>;
  selectedFeature: Observable<Feature<SimpleGeometry> | undefined>;
  selectedSignature: Observable<Sign | undefined>;
  selectedDrawElement: Observable<ZsMapDrawElementState | undefined>;
  drawHoleMode: Observable<boolean>;
  mergeMode: Observable<boolean>;
  featureType?: string;
  useColorPicker = false;
  private _drawElementCache: Record<string, ZsMapBaseDrawElement> = {};
  private _ngUnsubscribe = new Subject<void>();

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
    this.selectedFeature = this.zsMapStateService.observeSelectedElement().pipe(
      takeUntil(this._ngUnsubscribe),
      map((element) => element?.getOlFeature() as Feature<SimpleGeometry> | undefined),
    );
    this.selectedDrawElement = this.zsMapStateService.observeSelectedElement().pipe(
      takeUntil(this._ngUnsubscribe),
      switchMap((element) => element?.observeElement() ?? EMPTY),
    );
    this.selectedSignature = this.zsMapStateService.observeSelectedElement().pipe(
      takeUntil(this._ngUnsubscribe),
      map((element) => {
        const sig = element?.getOlFeature()?.get('sig');
        if (sig) {
          return sig.id ? Signs.getSignById(sig.id) : { ...sig };
        }
      }),
    );

    this.selectedFeature.pipe(takeUntil(this._ngUnsubscribe)).subscribe((feature) => {
      if (feature && feature.get('features')) {
        if (feature.get('features').length === 1) {
          this.groupedFeatures = null;
          this.featureType = feature.get('features')[0].getGeometry()?.getType();
        } else {
          this.groupedFeatures = this.extractFeatureGroups(feature.get('features'));
        }
      } else {
        this.groupedFeatures = null;
        this.featureType = feature?.getGeometry()?.getType();
      }
    });

    this.editMode = this.zsMapStateService.observeDisplayState().pipe(
      takeUntil(this._ngUnsubscribe),
      map((displayState) => displayState.displayMode === ZsMapDisplayMode.DRAW),
    );

    this.zsMapStateService
      .observeDrawElements()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((drawElements) => {
        for (const element of drawElements) {
          if (!this._drawElementCache[element.getId()]) {
            this._drawElementCache[element.getId()] = element;
          }
        }
      });

    this.drawHoleMode = this.zsMapStateService.observeDrawHoleMode().pipe(takeUntil(this._ngUnsubscribe));
    this.mergeMode = this.zsMapStateService.observeMergeMode().pipe(takeUntil(this._ngUnsubscribe));
  }

  public ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  get featureGroups() {
    return this.groupedFeatures ? Object.values(this.groupedFeatures).sort((a: any, b: any) => a.label.localeCompare(b.label)) : null;
  }

  isPolygon() {
    return ['Polygon', 'MultiPolygon'].includes(this.featureType ?? '');
  }

  isLine() {
    return this.featureType === 'LineString';
  }

  isText(element: ZsMapDrawElementState) {
    return element.type === ZsMapDrawElementStateType.TEXT;
  }

  async canSplit() {
    const feature = await firstValueFrom(this.selectedFeature);
    const point = <Point>feature?.getGeometry();
    return this.isPolygon() && this.selectedFeature != null && point?.getCoordinates().length > 1;
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

  updateProperty<T extends keyof ZsMapDrawElementState>(
    element: ZsMapDrawElementState,
    field: T | string,
    value: ZsMapDrawElementState[T],
  ) {
    const el = this._drawElementCache[element?.id ?? ''];
    if (el) {
      // Update the signature in the UI separately from the state, to provide a smooth update of all properties
      el.getOlFeature().get('sig')[field] = value;
      el.getOlFeature().changed();
      el.updateElementState((draft) => {
        draft[field as T] = value;
      });
    }
  }

  updateFillStyle<T extends keyof FillStyle>(element: ZsMapDrawElementState, field: T, value: FillStyle[T]) {
    if (element.id) {
      const fillStyle = { ...element.fillStyle, [field]: value } as FillStyle;
      this.zsMapStateService.updateDrawElementState(element.id, 'fillStyle', fillStyle);
    }
  }

  chooseSymbol(drawElement: ZsMapDrawElementState) {
    const dialogRef = this.dialog.open(DrawingDialogComponent);
    dialogRef.afterClosed().subscribe((result: Sign) => {
      if (result) {
        this.updateProperty(drawElement, 'symbolId', result.id);

        this.zsMapStateService.setSelectedFeature(drawElement.id);
      }
    });
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

  copy(drawElement: ZsMapDrawElementState) {
    if (!drawElement.symbolId) {
      return;
    }
    const layer = this.zsMapStateService.getActiveLayer();
    if (layer) {
      this.zsMapStateService.copySymbol(drawElement.symbolId, layer.getId());
      this.zsMapStateService.resetSelectedFeature();
    }
  }

  delete(drawElement: ZsMapDrawElementState) {
    if (!drawElement.id) {
      return;
    }

    const confirm = this.dialog.open(ConfirmationDialogComponent, {
      data: this.i18n.get('removeFeatureFromMapConfirm'),
    });
    confirm.afterClosed().subscribe(async (r) => {
      if (r && drawElement.id) {
        this.zsMapStateService.removeDrawElement(drawElement.id);
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

  drawHole() {
    this.zsMapStateService.toggleDrawHoleMode();
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
