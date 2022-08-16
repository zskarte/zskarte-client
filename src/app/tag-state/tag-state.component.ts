import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-tag-state',
  templateUrl: './tag-state.component.html',
  styleUrls: ['./tag-state.component.css'],
})
export class TagStateComponent {
  constructor(public dialogRef: MatDialogRef<TagStateComponent>, public i18n: I18NService) {}

  tag = '';

  cancel(): void {
    this.dialogRef.close(null);
  }

  submit(): void {
    this.dialogRef.close(this.tag);
  }
}
