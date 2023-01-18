import { Component, Input } from '@angular/core';
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

  openDrawDialog(): void {
    // this.sharedState.disableFreeHandDraw();
    this.layer?.draw(ZsMapDrawElementStateType.SYMBOL);
    this.closeBackdrop();
  }

  openTextDialog(): void {
    this.layer?.draw(ZsMapDrawElementStateType.TEXT);
    this.closeBackdrop();
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
