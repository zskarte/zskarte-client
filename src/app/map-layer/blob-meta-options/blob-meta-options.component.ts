import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BlobService } from 'src/app/db/blob.service';
import { LocalBlobMeta, LocalMapInfo, LocalMapLayer, db } from 'src/app/db/db';
import { I18NService } from 'src/app/state/i18n.service';
import { GeoJSONMapLayer } from '../map-layer-interface';
import { LOCAL_MAP_STYLE_PATH } from 'src/app/session/default-map-values';
import { zsMapStateSourceToDownloadUrl } from 'src/app/state/interfaces';

@Component({
  selector: 'app-blob-meta-options',
  templateUrl: './blob-meta-options.component.html',
  styleUrl: './blob-meta-options.component.scss',
})
export class BlobMetaOptionsComponent {
  public dataBlobMeta: LocalBlobMeta | undefined;
  public styleBlobMeta: LocalBlobMeta | undefined;
  public label: string | undefined;
  public dataUrlDefault: string | undefined;
  public styleUrlDefault: string | undefined;
  public dataUrl: string | undefined;
  public styleUrl: string | undefined;
  public dataProgress = 0;
  public styleProgress = 0;
  public styleText: string | null = null;
  public styleSourceName: string | undefined;
  public layerConfigStyle = false;
  public noOfflineText: string | undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { mapLayer?: LocalMapLayer & GeoJSONMapLayer; localMap?: LocalMapInfo },
    private dialogRef: MatDialogRef<BlobMetaOptionsComponent>,
    private _blobService: BlobService,
    public i18n: I18NService,
  ) {
    this.loadBlobMeta();
  }

  async loadBlobMeta() {
    if (this.data.mapLayer) {
      this.label = this.data.mapLayer.label;
      if (this.data.mapLayer.type === 'geojson' || this.data.mapLayer.type === 'csv') {
        this.data.mapLayer = { ...this.data.mapLayer };
        this.dataBlobMeta = this.data.mapLayer.sourceBlobId ? await db.localBlobMeta.get(this.data.mapLayer.sourceBlobId) : undefined;
        this.styleBlobMeta = this.data.mapLayer.styleBlobId ? await db.localBlobMeta.get(this.data.mapLayer.styleBlobId) : undefined;
        this.layerConfigStyle = this.data.mapLayer.styleSourceType === 'text';
        this.dataUrlDefault = this.data.mapLayer.source?.url;
        this.styleUrlDefault = this.data.mapLayer.styleUrl;
        this.dataUrl = this.dataBlobMeta?.url ?? this.dataUrlDefault;
        this.styleUrl = this.styleBlobMeta?.url ?? this.styleUrlDefault;
      } else {
        this.noOfflineText = this.i18n.get('blobMetaNotOfflineLayer');
      }
    } else if (this.data.localMap) {
      this.label = this.i18n.get(this.data.localMap.map);
      if (this.data.localMap.map in zsMapStateSourceToDownloadUrl) {
        this.dataBlobMeta = this.data.localMap.mapBlobId ? await db.localBlobMeta.get(this.data.localMap.mapBlobId) : undefined;
        this.styleBlobMeta = this.data.localMap.styleBlobId ? await db.localBlobMeta.get(this.data.localMap.styleBlobId) : undefined;
        this.dataUrlDefault = zsMapStateSourceToDownloadUrl[this.data.localMap.map];
        this.styleUrlDefault = LOCAL_MAP_STYLE_PATH;
        this.dataUrl = this.dataBlobMeta?.url ?? this.dataUrlDefault;
        this.styleUrl = this.styleBlobMeta?.url ?? this.styleUrlDefault;
        this.styleSourceName = this.data.localMap.styleSourceName;
      } else {
        this.noOfflineText = this.i18n.get('blobMetaNotOfflineMap');
      }
    } else {
      throw 'Missing data option';
    }
  }

  async removeData() {
    if (this.dataBlobMeta?.id) {
      this.dataBlobMeta = await BlobService.removeBlob(this.dataBlobMeta?.id);
    }
  }
  async downloadData() {
    if (this.dataUrl) {
      this.dataBlobMeta = await this._blobService.downloadBlob(this.dataUrl, this.dataBlobMeta?.id);
    }
  }
  async uploadData(event: Event) {
    if (!event.target) return;
    const localBlobMeta = await this._blobService.uploadBlob(event, this.dataUrl);
    if (localBlobMeta) {
      this.dataBlobMeta = localBlobMeta;
    }
  }
  async cancelDownloadData() {
    if (this.dataUrl) {
      await this._blobService.cancelDownload(this.dataUrl);
    }
  }

  async removeStyle() {
    if (this.styleBlobMeta?.id) {
      this.styleBlobMeta = await BlobService.removeBlob(this.styleBlobMeta?.id);
    }
  }
  async downloadStyle() {
    if (this.styleUrl) {
      this.styleBlobMeta = await this._blobService.downloadBlob(this.styleUrl, this.styleBlobMeta?.id);
    }
  }
  async uploadStyle(event: Event) {
    if (!event.target) return;
    const localBlobMeta = await this._blobService.uploadBlob(event, this.styleUrl);
    if (localBlobMeta) {
      this.styleBlobMeta = localBlobMeta;
    }
  }
  async cancelDownloadStyle() {
    if (this.styleUrl) {
      await this._blobService.cancelDownload(this.styleUrl);
    }
  }

  async startEditStyle() {
    this.styleText = await BlobService.getBlobContentAsText(this.styleBlobMeta?.id);
  }
  async endEditStyle() {
    if (this.styleText != null) {
      this.styleBlobMeta = await BlobService.saveTextAsBlobContent(
        this.styleText,
        'application/json',
        this.styleBlobMeta?.id,
        this.styleUrl,
      );
      this.styleUrl = this.styleBlobMeta.url;
      this.styleText = null;
    }
  }
  cancelEditStyle() {
    this.styleText = null;
  }

  ok() {
    if (this.noOfflineText) {
      this.dialogRef.close();
    } else if (this.data.mapLayer) {
      this.data.mapLayer.sourceBlobId = this.dataBlobMeta?.id;
      this.data.mapLayer.styleBlobId = this.styleBlobMeta?.id;
      this.data.mapLayer.offlineAvailable =
        this.dataBlobMeta?.blobState === 'downloaded' && (this.layerConfigStyle || this.styleBlobMeta?.blobState === 'downloaded');
      this.dialogRef.close(this.data.mapLayer);
    } else if (this.data.localMap) {
      this.data.localMap.mapBlobId = this.dataBlobMeta?.id;
      this.data.localMap.styleBlobId = this.styleBlobMeta?.id;
      this.data.localMap.offlineAvailable = this.dataBlobMeta?.blobState === 'downloaded' && this.styleBlobMeta?.blobState === 'downloaded';
      this.data.localMap.styleSourceName = this.styleSourceName;
      this.dialogRef.close(this.data.localMap);
    }
  }
}
