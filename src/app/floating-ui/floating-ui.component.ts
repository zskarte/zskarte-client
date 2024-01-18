import { Component } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable, Subject, takeUntil } from 'rxjs';
import { SidebarContext } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';
import { I18NService } from '../state/i18n.service';
import { SyncService } from '../sync/sync.service';
import { SessionService } from '../session/session.service';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';
import { DrawDialogComponent } from '../draw-dialog/draw-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {HelpComponent} from "../help/help.component";

@Component({
  selector: 'app-floating-ui',
  templateUrl: './floating-ui.component.html',
  styleUrl: './floating-ui.component.scss',
})
export class FloatingUIComponent {
  static ONBOARDING_VERSION = '1.0';

  sidebarContext = SidebarContext;
  sidebarContext$: Observable<SidebarContext | null>;
  private _ngUnsubscribe = new Subject<void>();
  public connectionCount = new BehaviorSubject<number>(0);
  public isOnline = new BehaviorSubject<boolean>(true);
  public isReadOnly = new BehaviorSubject<boolean>(false);
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;
  public canUndo = new BehaviorSubject<boolean>(false);
  public canRedo = new BehaviorSubject<boolean>(false);

  constructor(
    public i18n: I18NService,
    public _state: ZsMapStateService,
    private _sync: SyncService,
    private _session: SessionService,
    private _dialog: MatDialog,
  ) {
    if (this.isInitialLaunch()) {
      this._dialog.open(HelpComponent, {
        data: true,
      });
    }

    this.sidebarContext$ = this._state.observeSidebarContext();
    this._state.observeIsReadOnly().pipe(takeUntil(this._ngUnsubscribe)).subscribe(this.isReadOnly);

    this._state
      .observeHistory()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(({ canUndo, canRedo }) => {
        this.canUndo.next(canUndo);
        this.canRedo.next(canRedo);
      });

    this._session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline.next(isOnline);
      });

    this._sync
      .observeConnections()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((connections) => {
        this.connectionCount.next(connections.length);
      });

    this.activeLayer$ = _state.observeActiveLayer();
  }

  // skipcq:  JS-0105
  isInitialLaunch(): boolean {
    const currentOnboardingVersion = localStorage.getItem('onboardingVersion');
    if (currentOnboardingVersion !== FloatingUIComponent.ONBOARDING_VERSION) {
      localStorage.setItem('onboardingVersion', FloatingUIComponent.ONBOARDING_VERSION);
      return true;
    }
    return false;
  }

  zoomIn() {
    this._state.updateMapZoom(1);
  }

  zoomOut() {
    this._state.updateMapZoom(-1);
  }
  setSidebarContext(context: SidebarContext | null) {
    this._state.toggleSidebarContext(context);
  }

  undo() {
    this._state.undoMapStateChange();
  }

  redo() {
    this._state.redoMapStateChange();
  }

  public async openDrawDialog(): Promise<void> {
    const layer = await firstValueFrom(this._state.observeActiveLayer());
    const ref = this._dialog.open(DrawDialogComponent);
    ref.componentRef?.instance.setLayer(layer);
  }
}
