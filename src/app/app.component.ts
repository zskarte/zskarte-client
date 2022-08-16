import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DateTime } from 'luxon';
import { map, Observable } from 'rxjs';
import { IpcService } from './ipc/ipc.service';
import { ZsMapBaseLayer } from './map-renderer/layers/base-layer';
import { IZsMapState, ZsMapDrawElementStateType, ZsMapStateSource } from './state/interfaces';
import { ZsMapStateService } from './state/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  ZsMapStateSource = ZsMapStateSource;
  ZsMapDrawElementStateType = ZsMapDrawElementStateType;
  sidebarOpen$: Observable<boolean>;
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;

  constructor(public state: ZsMapStateService, public ipc: IpcService) {
    state.addDrawLayer();
    this.sidebarOpen$ = state.observeSidebarContext().pipe(map((context) => (context === null ? false : true)));
    this.activeLayer$ = state.observeActiveLayer();
  }

  public defaultMap: IZsMapState = {
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
