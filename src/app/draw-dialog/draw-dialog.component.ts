import { Component } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';
import { Sign } from '../core/entity/sign';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { ZsMapDrawElementStateType } from '../state/interfaces';

@Component({
  selector: 'app-draw-dialog',
  templateUrl: './draw-dialog.component.html',
  styleUrl: './draw-dialog.component.scss',
})
export class DrawDialogComponent {
  public layer: ZsMapBaseLayer | undefined;
  constructor(
    public dialogRef: MatDialogRef<DrawDialogComponent>,
    public i18n: I18NService,
    public dialog: MatDialog,
  ) {}

  public setLayer(layer: ZsMapBaseLayer | undefined): void {
    this.layer = layer;
  }

  public addLine(): void {
    this.dialogRef.close();
    this.layer?.draw(ZsMapDrawElementStateType.LINE);
  }

  public addText(): void {
    this.dialogRef.close();
    this.layer?.draw(ZsMapDrawElementStateType.TEXT);
  }

  public addPolygon(): void {
    this.dialogRef.close();
    this.layer?.draw(ZsMapDrawElementStateType.POLYGON);
  }

  public startFreehand(): void {
    this.dialogRef.close();
    this.layer?.draw(ZsMapDrawElementStateType.FREEHAND);
  }

  public signSelected(sign: Sign): void {
    this.dialogRef.close();
    this.layer?.draw(ZsMapDrawElementStateType.SYMBOL, { symbolId: sign.id });
  }
}
