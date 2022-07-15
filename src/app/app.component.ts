import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { IZsMapState, ZsMapDrawElementStateType, ZsMapStateSource } from './state/interfaces';
import { ZsMapStateService } from './state/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  ZsMapStateSource = ZsMapStateSource;
  ZsMapDrawElementStateType = ZsMapDrawElementStateType;

  constructor(public state: ZsMapStateService) {}

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
}
