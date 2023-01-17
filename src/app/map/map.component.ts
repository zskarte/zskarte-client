import { Component, HostListener, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IpcService } from '../ipc/ipc.service';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { ZsMapStateSource, ZsMapDrawElementStateType, SidebarContext } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  ZsMapStateSource = ZsMapStateSource;
  ZsMapDrawElementStateType = ZsMapDrawElementStateType;
  sidebarContext = SidebarContext;
  sidebarContext$: Observable<SidebarContext | null>;
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;
  width = window.innerWidth;

  constructor(public state: ZsMapStateService, public ipc: IpcService) {
    this.sidebarContext$ = state.observeSidebarContext();
    this.activeLayer$ = state.observeActiveLayer();
  }

  ngOnInit(): void {
    this.setWidth();
  }

  @HostListener('window:resize', ['$event'])
  setWidth(): void {
    this.width = window.innerWidth;
  }

  public drawElements = [
    { text: 'Text', type: ZsMapDrawElementStateType.TEXT },
    { text: 'Symbol', type: ZsMapDrawElementStateType.SYMBOL },
    { text: 'Polygon', type: ZsMapDrawElementStateType.POLYGON },
    { text: 'Line', type: ZsMapDrawElementStateType.LINE },
  ];
}
