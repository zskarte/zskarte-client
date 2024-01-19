import { Component, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SelectSignDialog } from '../select-sign-dialog/select-sign-dialog.component';
import { ZsMapDrawLayer } from '../map-renderer/layers/draw-layer';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-text-dialog',
  templateUrl: './text-dialog.component.html',
  styleUrls: ['./text-dialog.component.css'],
})
export class TextDialogComponent {
  @Input() layer?: ZsMapDrawLayer;
  text = '';

  constructor(
    public dialogRef: MatDialogRef<SelectSignDialog>,
    public i18n: I18NService,
  ) {}

  cancel(): void {
    this.dialogRef.close(null);
  }

  submit(): void {
    this.dialogRef.close(this.text);
  }
}
