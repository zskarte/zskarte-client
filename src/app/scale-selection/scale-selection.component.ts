import { Component, Inject, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';
import { DEFAULT_DPI } from '../session/default-map-values';

export type ScaleType = { scale?: number; dpi?: number };

@Component({
  selector: 'app-scale-selection',
  templateUrl: './scale-selection.component.html',
  styleUrl: './scale-selection.component.scss',
})
export class ScaleSelectionComponent {
  scale?: number;
  dpi: number;
  screenDimension: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ScaleType,
    public i18n: I18NService,
    public dialogRef: MatDialogRef<ScaleSelectionComponent, ScaleType | undefined>,
  ) {
    this.scale = data.scale;
    if (data.dpi && data.dpi !== DEFAULT_DPI) {
      this.dpi = data.dpi;
      this.screenDimension = ScaleSelectionComponent.calcScreenDimension(this.dpi);
    } else {
      this.screenDimension = 16;
      this.dpi = ScaleSelectionComponent.calcDpi(this.screenDimension);
    }
    this.devicePixelRatio = window.devicePixelRatio;
    this.screenWidth = screen.width * window.devicePixelRatio;
    this.screenHeight = screen.height * window.devicePixelRatio;
  }

  updateDpi() {
    this.dpi = ScaleSelectionComponent.calcDpi(this.screenDimension);
  }

  static calcDpi(screenDimension: number) {
    //as on the web the window.devicePixelRatio is not used for size calculation don't use it for calc
    return Math.round(Math.sqrt(Math.pow(screen.width, 2) + Math.pow(screen.height, 2)) / screenDimension);
  }

  static calcScreenDimension(dpi: number) {
    //as on the web the window.devicePixelRatio is not used for size calculation don't use it for calc
    return Math.round(Math.sqrt(Math.pow(screen.width, 2) + Math.pow(screen.height, 2)) / dpi);
  }

  cancel() {
    this.dialogRef.close(undefined);
  }

  ok(): void {
    this.dialogRef.close({ scale: this.scale, dpi: this.dpi });
  }

  @HostListener('window:keyup.Enter', ['$event'])
  onDialogClick(): void {
    this.ok();
  }
}
