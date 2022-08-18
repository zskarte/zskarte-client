import { Component, OnInit } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable, map } from 'rxjs';
import { IpcService } from '../ipc/ipc.service';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { ZsMapStateSource, ZsMapDrawElementStateType, IZsMapState, SidebarContext } from '../state/interfaces';
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

  constructor(public state: ZsMapStateService, public ipc: IpcService) {
    state.addDrawLayer();
    this.sidebarContext$ = state.observeSidebarContext();
    this.activeLayer$ = state.observeActiveLayer();
  }

  public defaultMap: IZsMapState = {
    version: 1,
    id: 'testid',
    center: [849861.97, 5905812.55],
    source: ZsMapStateSource.OPEN_STREET_MAP,
    name: 'test',
    layers: [],
  };

  public drawElements = [
    { text: 'Text', type: ZsMapDrawElementStateType.TEXT },
    { text: 'Symbol', type: ZsMapDrawElementStateType.SYMBOL },
    { text: 'Polygon', type: ZsMapDrawElementStateType.POLYGON },
    { text: 'Line', type: ZsMapDrawElementStateType.LINE },
  ];

  // TODO move this stuff somewhere where it belongs :)

  public async saveMapToFile(): Promise<void> {
    // TODO name
    const fileName = `Ereignis_${DateTime.now().toFormat('yyyy_LL_dd_hh_mm')}.zsmap`;
    const saveFileState = this.state.getSaveFileState();
    this.ipc.saveFile({
      data: JSON.stringify(saveFileState),
      fileName,
      filters: [
        {
          name: 'ZS-Karte',
          extensions: ['zsmap'],
        },
      ],
    });
  }

  public async openMapFromFile(): Promise<void> {
    const jsonString = await this.ipc.openFile({
      filters: [
        {
          name: 'ZS-Karte',
          extensions: ['zsmap'],
        },
      ],
    });
    try {
      const data = JSON.parse(jsonString);
      this.state.loadSaveFileState(data);
    } catch (e) {
      // TODO error handling
      console.error('TODO error handling', e);
    }
  }
}
