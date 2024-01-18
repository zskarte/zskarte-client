import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import QRCode from 'qrcode';
import { I18NService } from 'src/app/state/i18n.service';

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
  public showJoinCode: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public joinCode: string,
    private _snackBar: MatSnackBar,
    public i18n: I18NService,
  ) {
    this.qrCodeDataUrl = this.generateQrCodeDataUrl();
    this.copyJoinLink();
    this.showJoinCode = joinCode.length === 6;
  }

  async copyJoinLink() {
    await navigator.clipboard.writeText(this.joinLink);
    this._snackBar.open(this.i18n.get('copiedToClipboard'), this.i18n.get('ok'), { duration: 2000 });
  }

  private generateQrCodeDataUrl(): Promise<string> {
    return QRCode.toDataURL(this.joinLink, {
      width: 420,
    }).catch((err) => {
      console.error(`Error generating QR Code for ${this.joinLink}:`, err);
      return '';
    });
  }
}
