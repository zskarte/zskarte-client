import { Component, HostListener, Input } from '@angular/core';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';
import { TextDialogComponent } from '../text-dialog/text-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ZsMapStateService } from '../state/state.service';
import { map, Observable } from 'rxjs';
import { ZsMapDisplayMode, ZsMapDrawElementStateType } from '../state/interfaces';
import { I18NService } from '../state/i18n.service';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';

@Component({
  selector: 'app-fab-menu',
  templateUrl: './fab-menu.component.html',
  styleUrls: ['./fab-menu.component.css'],
})
export class FabMenuComponent {
  @Input() layer: ZsMapBaseLayer | undefined;
  text = '';
  isOpen = false;
  historyMode$: Observable<boolean>;

  constructor(public drawDialog: MatDialog, public textDialog: MatDialog, private mapState: ZsMapStateService, public i18n: I18NService) {
    this.historyMode$ = this.mapState.observeDisplayState().pipe(map((state) => state.displayMode === ZsMapDisplayMode.HISTORY));
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only handle global events (to prevent input elements to be considered)
    const globalEvent = event.target instanceof HTMLBodyElement;
    if (globalEvent && event.altKey) {
      switch (event.code) {
        case 'KeyX':
          this.openTextDialog();
          break;
        case 'KeyS':
          this.openDrawDialog();
          break;
        case 'KeyP':
          this.polygon();
          break;
        case 'KeyL':
          this.line();
          break;
      }
    }
  }

  openDrawDialog(): void {
    // this.sharedState.disableFreeHandDraw();
    this.layer?.draw(ZsMapDrawElementStateType.SYMBOL);
  }

  openTextDialog(): void {
    const dialogRef = this.textDialog.open(TextDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '70vh',
      data: {
        layer: this.layer,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.text = result;
      this.closeBackdrop();
    });
  }

  polygon(): void {
    // this.sharedState.disableFreeHandDraw();
    // this.sharedState.selectSign({
    //   type: 'Polygon',
    //   src: null,
    //   filterValue: 'not_labeled_polygon',
    // });
    this.layer?.draw(ZsMapDrawElementStateType.POLYGON);
    this.closeBackdrop();
  }

  line(): void {
    // this.sharedState.disableFreeHandDraw();
    // this.sharedState.selectSign({
    //   type: 'LineString',
    //   src: null,
    //   filterValue: 'not_labeled_line',
    // });
    this.layer?.draw(ZsMapDrawElementStateType.LINE);
    this.closeBackdrop();
  }

  circle(): void {
    // this.sharedState.disableFreeHandDraw();
    // this.sharedState.selectSign({
    //   type: 'Circle',
    //   src: null,
    // });
    this.closeBackdrop();
  }

  toggleFreeHandDraw(): void {
    this.layer?.draw(ZsMapDrawElementStateType.FREEHAND);
    this.closeBackdrop();
  }

  closeBackdrop(): void {
    this.isOpen = false;
  }
}
