import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../state/i18n.service';
import { GeoadminService } from '../core/geoadmin.service';

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.css'],
})
export class ImportDialogComponent {
  @ViewChild('fileInput', { static: false }) el!: ElementRef;

  geoadminLayer = '';
  geoadminKey = '';
  geoadminValue = '';
  replace = true;

  constructor(public dialogRef: MatDialogRef<ImportDialogComponent>, public i18n: I18NService, private geoadminService: GeoadminService) {}

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  readFromFile() {
    const reader = new FileReader();
    for (let index = 0; index < this.el.nativeElement.files.length; index++) {
      reader.onload = () => {
        // this 'text' is the content of the file
        const text = reader.result;
        this.dialogRef.close({ replace: this.replace, value: text });
      };
      reader.readAsText(this.el.nativeElement.files[index], 'UTF-8');
    }
  }

  importFromGeoadmin() {
    this.geoadminService.queryPolygons(this.geoadminLayer, this.geoadminKey, this.geoadminValue).then((features: any) => {
      const featureWrapper = {
        type: 'FeatureCollection',
        features: features,
      };
      this.dialogRef.close({
        replace: this.replace,
        value: JSON.stringify(featureWrapper),
      });
    });
  }
}
