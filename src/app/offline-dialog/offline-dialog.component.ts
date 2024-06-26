import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-offline-dialog',
  templateUrl: './offline-dialog.component.html',
  styleUrl: './offline-dialog.component.scss',
})
export class OfflineDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OfflineDialogComponent>,
    public i18n: I18NService,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
