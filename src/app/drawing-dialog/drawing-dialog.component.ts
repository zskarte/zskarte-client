import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Sign, signCategories } from '../core/entity/sign';
import capitalizeFirstLetter from '../helper/capitalizeFirstLetter';
import { DrawStyle } from '../map-renderer/draw-style';
// import { DrawStyle } from '../map-renderer/draw-style';
import { Signs } from '../map-renderer/signs';
import { SessionService } from '../session/session.service';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-drawing-dialog',
  templateUrl: './drawing-dialog.component.html',
  styleUrls: ['./drawing-dialog.component.css'],
})
export class DrawingDialogComponent implements OnInit {
  filter = '';
  allSigns: Sign[] = [];
  filteredSigns: Sign[] = [];
  selected = '';
  signCategories = Array.from(signCategories.values());

  capitalizeFirstLetter = capitalizeFirstLetter;

  constructor(
    public dialogRef: MatDialogRef<DrawingDialogComponent>,
    public i18n: I18NService,
    public dialog: MatDialog,
    private _session: SessionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isCustomImage(sign: Sign) {
    return false;
    // return CustomImageStoreService.isCustomImage(sign.src);
  }

  loadSigns() {
    // todo: add custom images
    // .concat(
    //   CustomImageStoreService.getAllSigns()
    // )

    this.allSigns = Signs.SIGNS.sort((a, b) => {
      let aValue = a[this._session.getLocale()];
      let bValue = b[this._session.getLocale()];
      aValue = aValue ? aValue.toLowerCase() : '';
      bValue = bValue ? bValue.toLowerCase() : '';
      return aValue.localeCompare(bValue);
    });
    this.updateAvailableSigns();
  }

  updateAvailableSigns() {
    this.filteredSigns = this.allSigns.filter(
      (s) =>
        (!this.filter || this.i18n.getLabelForSign(s).toLowerCase().includes(this.filter)) && (!this.selected || this.selected === s.kat),
    );
  }

  getImageUrl(file: string) {
    if (file) {
      // const customImageDataUrl = CustomImageStoreService.getImageDataUrl(file);
      // if (customImageDataUrl) {
      //   return customImageDataUrl;
      // }
      // return DrawStyle.getImageUrl(file);
      return DrawStyle.getImageUrl(file);
    }
    return null;
  }

  ngOnInit(): void {
    this.loadSigns();
  }

  select(sign: Sign) {
    // We need to pass a deep copy of the object
    this.dialogRef.close(JSON.parse(JSON.stringify(sign)));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editSymbol(sign: Sign) {
    // const symbolEdit = this.dialog.open(CustomImagesComponent, {
    //   data: sign,
    //   disableClose: true,
    // });
    // symbolEdit.afterClosed().subscribe((r) => {
    //   if (r) {
    //     this.loadSigns();
    //   }
    // });
  }

  addSymbol() {
    // const symbolAdd = this.dialog.open(CustomImagesComponent, {
    //   disableClose: true,
    // });
    // symbolAdd.afterClosed().subscribe((r) => {
    //   if (r) {
    //     const label = this.i18n.getLabelForSign(r);
    //     if (label) {
    //       this.filter = label;
    //     }
    //     this.loadSigns();
    //   }
    // });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteSymbol(sign: Sign) {
    // const confirm = this.dialog.open(ConfirmationDialogComponent, {
    //   data: this.i18n.get('deleteSymbolConfirm'),
    // });
    // confirm.afterClosed().subscribe((r) => {
    //   if (r) {
    //     this.customImage.deleteSign(sign.src).then(() => {
    //       this.loadSigns();
    //     });
    //   }
    // });
  }

  getIconFromType(type: string) {
    switch (type) {
      case 'Polygon':
        return 'widgets';
      case 'LineString':
        return 'show_chart';
      case 'Point':
        return 'stars';
      default:
        return 'block';
    }
  }
}
