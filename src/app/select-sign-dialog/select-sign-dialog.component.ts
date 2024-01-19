import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Sign, signCategories } from '../core/entity/sign';
import capitalizeFirstLetter from '../helper/capitalizeFirstLetter';
import { DrawStyle } from '../map-renderer/draw-style';
import { Signs } from '../map-renderer/signs';
import { SessionService } from '../session/session.service';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-select-sign-dialog',
  templateUrl: './select-sign-dialog.component.html',
  styleUrls: ['./select-sign-dialog.component.css'],
})
export class SelectSignDialog implements OnInit {
  filter = '';
  allSigns: Sign[] = [];
  filteredSigns: Sign[] = [];
  selected = '';
  signCategories = Array.from(signCategories.values());

  capitalizeFirstLetter = capitalizeFirstLetter;
  @Output() readonly signSelected = new EventEmitter<Sign>();

  constructor(
    public dialogRef: MatDialogRef<SelectSignDialog>,
    public i18n: I18NService,
    public dialog: MatDialog,
    private _session: SessionService,
  ) {}

  loadSigns() {
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

  // skipcq: JS-0105
  getImageUrl(file: string) {
    if (file) {
      return DrawStyle.getImageUrl(file);
    }
    return null;
  }

  ngOnInit(): void {
    this.loadSigns();
  }

  select(sign: Sign) {
    // We need to pass a deep copy of the object
    const toEmit = JSON.parse(JSON.stringify(sign));

    // If this was directly called as a dialog, close it
    // Else emit an event
    if (this.dialogRef.componentInstance?.constructor?.name === 'SelectSignDialog') {
      this.dialogRef.close(toEmit);
    } else {
      this.signSelected.emit(toEmit);
    }
  }

  // skipcq: JS-0105
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
