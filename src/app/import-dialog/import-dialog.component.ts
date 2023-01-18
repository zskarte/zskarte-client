import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';
import { GeoadminService } from '../core/geoadmin.service';
import { OperationExportFile } from '../core/entity/operationExportFile';

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.css'],
})
export class ImportDialogComponent {
  @ViewChild('fileInput', { static: false }) el!: ElementRef;

  constructor(public dialogRef: MatDialogRef<ImportDialogComponent, OperationExportFile | null>, public i18n: I18NService) {}

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  readFromFile() {
    const reader = new FileReader();
    for (let index = 0; index < this.el.nativeElement.files.length; index++) {
      reader.onload = () => {
        // this 'text' is the content of the file
        const text = reader.result as string;
        if (text) {
          this.dialogRef.close(JSON.parse(text));
        }
      };
      reader.readAsText(this.el.nativeElement.files[index], 'UTF-8');
    }
  }
}
