import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import QRCode from 'qrcode';

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent {
  public qrCodeDataUrl!: Promise<string>;
  public get joinLink(): string {
    return `${window.location.origin}/share/${this.joinCode}`;
  }

  constructor(@Inject(MAT_DIALOG_DATA) public joinCode: string) {
    this.qrCodeDataUrl = this.generateQrCodeDataUrl();
  }

  private generateQrCodeDataUrl(): Promise<string> {
    const joinLink = `${window.location.origin}/share/${this.joinCode}`;
    return QRCode.toDataURL(joinLink, {
      width: 420,
    }).catch((err) => {
      console.error(`Error generating QR Code for ${joinLink}:`, err);
      return '';
    });
  }
}
