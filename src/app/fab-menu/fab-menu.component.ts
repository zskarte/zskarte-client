import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ZsMapDrawElementStateType } from '../state/interfaces';
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

  constructor(
    public drawDialog: MatDialog,
    public textDialog: MatDialog,
    public i18n: I18NService,
  ) {}

  openDrawDialog(): void {
    console.log(this.layer)
    this.layer?.draw(ZsMapDrawElementStateType.SYMBOL);
    this.closeBackdrop();
  }

  openTextDialog(): void {
    this.layer?.draw(ZsMapDrawElementStateType.TEXT);
    this.closeBackdrop();
  }

  polygon(): void {
    this.layer?.draw(ZsMapDrawElementStateType.POLYGON);
    this.closeBackdrop();
  }

  line(): void {
    this.layer?.draw(ZsMapDrawElementStateType.LINE);
    this.closeBackdrop();
  }

  circle(): void {
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
