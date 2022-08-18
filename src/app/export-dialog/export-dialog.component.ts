import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import GeoJSON from 'ol/format/GeoJSON';
import { ZsMapStateService } from '../state/state.service';
import { I18NService } from '../state/i18n.service';
import { CustomImageStoreService } from '../state/custom-image-store.service';

@Component({
  selector: 'app-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.css'],
})
export class ExportDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GeoJSON,
    public dialogRef: MatDialogRef<ExportDialogComponent>,
    public i18n: I18NService,
    private sanitizer: DomSanitizer,
    private imageStore: CustomImageStoreService,
    public zsMapStateService: ZsMapStateService,
  ) {}

  withHistory = 'withHistory';
  history = null;
  images = null;
  errorMessage = '';
  downloadData: SafeUrl | null = null;

  ngOnInit(): void {
    /*
    if (this.data) {
      if (this.sharedState.getCurrentSession()) {
        this.mapStore
          .getHistory(this.sharedState.getCurrentSession().uuid)
          .then((history) => {
            this.history = history;
          });
      } else {
        this.errorMessage = 'Was not able to find a valid session';
      }
    } else {
      this.errorMessage = 'Was not able to serialize current map';
    }*/
  }

  getDownloadFileName() {
    return 'zskarte_' + new Date().toISOString() + '.zsjson';
  }

  exportSession(): void {
    /*
    const result = this.data;
    result.session = this.sharedState.getCurrentSession();
    result.images = this.imageStore.getAllEntriesForCurrentSession();
    if (this.withHistory === 'withHistory') {
      result.history = this.history;
    }
    const dataUrl = 'data:text/json;charset=UTF-8,' + encodeURIComponent(JSON.stringify(result));
    this.downloadData = this.sanitizer.bypassSecurityTrustUrl(dataUrl);
    if (this.withHistory === 'withHistory') {
      delete result['history'];
    }
    delete result['session'];*/
  }
}
