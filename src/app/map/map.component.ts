import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { ZsMapStateSource, ZsMapDrawElementStateType, SidebarContext } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';

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

  constructor(public state: ZsMapStateService) {
    this.sidebarContext$ = state.observeSidebarContext();
    this.activeLayer$ = state.observeActiveLayer();
  }

  public drawElements = [
    { text: 'Text', type: ZsMapDrawElementStateType.TEXT },
    { text: 'Symbol', type: ZsMapDrawElementStateType.SYMBOL },
    { text: 'Polygon', type: ZsMapDrawElementStateType.POLYGON },
    { text: 'Line', type: ZsMapDrawElementStateType.LINE },
  ];
}
