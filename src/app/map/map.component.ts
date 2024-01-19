import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { SidebarContext, ZsMapDrawElementStateType } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent {
  ZsMapDrawElementStateType = ZsMapDrawElementStateType;

  sidebarContext$: Observable<SidebarContext | null>;
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;

  constructor(public state: ZsMapStateService) {
    this.sidebarContext$ = state.observeSidebarContext();
    this.activeLayer$ = state.observeActiveLayer();
  }
}
