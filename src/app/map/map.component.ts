import { Component } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { ZsMapStateSource, ZsMapDrawElementStateType, SidebarContext } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';
import { MatDialog } from '@angular/material/dialog';
import { DrawDialogComponent } from '../draw-dialog/draw-dialog.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent {
  ZsMapStateSource = ZsMapStateSource;
  ZsMapDrawElementStateType = ZsMapDrawElementStateType;
  sidebarContext = SidebarContext;
  sidebarContext$: Observable<SidebarContext | null>;
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;

  constructor(
    public state: ZsMapStateService,
    private _dialog: MatDialog,
  ) {
    this.sidebarContext$ = state.observeSidebarContext();
    this.activeLayer$ = state.observeActiveLayer();
  }

  public drawElements = [
    { text: 'Text', type: ZsMapDrawElementStateType.TEXT },
    { text: 'Symbol', type: ZsMapDrawElementStateType.SYMBOL },
    { text: 'Polygon', type: ZsMapDrawElementStateType.POLYGON },
    { text: 'Line', type: ZsMapDrawElementStateType.LINE },
  ];

  public async openDrawDialog(): Promise<void> {
    const layer = await firstValueFrom(this.state.observeActiveLayer());
    const ref = this._dialog.open(DrawDialogComponent);
    ref.componentRef?.instance.setLayer(layer);
  }
}
