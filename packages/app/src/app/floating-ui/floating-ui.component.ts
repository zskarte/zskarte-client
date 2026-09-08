import { Component, HostListener, inject, computed, ViewChild } from '@angular/core';
import { BehaviorSubject, debounceTime, firstValueFrom, Subject, takeUntil } from 'rxjs';

import { ZsMapStateService } from '../state/state.service';
import { I18NService } from '../state/i18n.service';
import { SyncService } from '../sync/sync.service';
import { SessionService } from '../session/session.service';
import { DrawDialogComponent } from '../draw-dialog/draw-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { SidebarContext } from '../sidebar/sidebar.interfaces';
import { SidebarService } from '../sidebar/sidebar.service';
import { ScaleSelectionComponent } from '../scale-selection/scale-selection.component';
import { db } from '../db/db';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatBadge } from '@angular/material/badge';
import { GeocoderComponent } from '../geocoder/geocoder.component';
import { CoordinatesComponent } from '../coordinates/coordinates.component';
import { ZsMapStateSource } from '@zskarte/types';
import { MAX_DRAW_ELEMENTS_GUEST } from '../session/default-map-values';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GuestLimitDialogComponent } from '../guest-limit-dialog/guest-limit-dialog.component';
import { JournalDrawOverlayComponent } from '../journal-draw-overlay/journal-draw-overlay.component';
import { ResourcePlacementOverlayComponent } from '../resource/placement/resource-placement-overlay.component';
import { SearchService } from '../search/search.service';
import { CompassButtonComponent } from '../compass-button/compass-button.component';
import { JournalService } from '../journal/journal.service';
import { ChangesetOverlayComponent } from '../changeset/changeset-overlay/changeset-overlay.component';

@Component({
  selector: 'app-floating-ui',
  templateUrl: './floating-ui.component.html',
  styleUrl: './floating-ui.component.scss',
  imports: [
    MatIconModule,
    AsyncPipe,
    MatButtonModule,
    MatDivider,
    MatBadge,
    GeocoderComponent,
    CoordinatesComponent,
    JournalDrawOverlayComponent,
    ResourcePlacementOverlayComponent,
    ChangesetOverlayComponent,
    CommonModule,
    CompassButtonComponent,
  ],
})
export class FloatingUIComponent {
  @ViewChild(GeocoderComponent) geocoder!: GeocoderComponent;
  MAX_DRAW_ELEMENTS_GUEST = MAX_DRAW_ELEMENTS_GUEST;
  i18n = inject(I18NService);
  state = inject(ZsMapStateService);
  private _sync = inject(SyncService);
  private _session = inject(SessionService);
  private _dialog = inject(MatDialog);
  private _search = inject(SearchService);
  private _journal = inject(JournalService);
  session = inject(SessionService);
  sidebar = inject(SidebarService);
  snackbar = inject(MatSnackBar);
  mapState = inject(ZsMapStateService);

  SidebarContext = SidebarContext;

  private _ngUnsubscribe = new Subject<void>();
  public connectionCount = new BehaviorSubject<number>(0);
  public isOnline = new BehaviorSubject<boolean>(true);
  public isReadOnly = this.state.observeIsReadOnly();
  public isHistoryMode = this.state.observeIsHistoryMode();
  public canUndo = new BehaviorSubject<boolean>(false);
  public canRedo = new BehaviorSubject<boolean>(false);
  public printView = false;
  public canWorkOffline = new BehaviorSubject<boolean>(false);
  public localOperation = false;
  public todoCount = computed(() => {
    const journalList = this._journal.data();
    return (journalList || []).filter((entry) => !entry.isDrawnOnMap).length;
  });

  constructor() {
    this.localOperation = this.session.getOperationId()?.startsWith('local-') ?? false;

    this.state
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

    if (this.localOperation) {
      this.state
        .observeDisplayState()
        .pipe(takeUntil(this._ngUnsubscribe),debounceTime(250))
        .subscribe(async (displayState) => {
          if (displayState.source === ZsMapStateSource.LOCAL || displayState.source === ZsMapStateSource.NONE) {
            //using local map
            if (displayState.layers.filter((l) => (l.type !== 'geojson' && l.type !== 'shape' && l.type !== 'csv') ? !l.hidden : !l.offlineAvailable).length === 0) {
              //all used layer are offlineAvailable
              if (displayState.source === ZsMapStateSource.LOCAL) {
                const localMapInfo = await db.localMapInfo.get(displayState.source);
                if (localMapInfo?.offlineAvailable) {
                  //and it's saved on DB
                  if (!this.canWorkOffline.value) {
                    this.canWorkOffline.next(true);
                  }
                  return;
                }
              } else {
                if (!this.canWorkOffline.value) {
                  this.canWorkOffline.next(true);
                }
                return;
              }
            }
          }
          if (this.canWorkOffline.value) {
            this.canWorkOffline.next(false);
          }
        });
    }

    this.state
      .observePrintState()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((printState) => {
        this.printView = printState.printView;
      });
  }

  zoomIn() {
    this.state.updateMapZoom(1);
  }

  zoomToScale() {
    const projectionDialog = this._dialog.open(ScaleSelectionComponent, {
      width: '500px',
      data: {
        scale: undefined,
        dpi: this.state.getDPI(),
      },
    });
    projectionDialog.afterClosed().subscribe((result) => {
      if (result) {
        this.state.setMapZoomScale(result.scale, result.dpi);
      }
    });
  }

  zoomOut() {
    this.state.updateMapZoom(-1);
  }

  undo() {
    this.state.undoMapStateChange();
  }

  redo() {
    this.state.redoMapStateChange();
  }

  public async openDrawDialog(): Promise<void> {
    const layer = await firstValueFrom(this.state.observeActiveLayer());
    const ref = this._dialog.open(DrawDialogComponent);
    ref.componentRef?.instance.setLayer(layer);
  }

  public openLimitDialog(limitReached: boolean | null) {
    if (limitReached) {
      this._dialog.open(GuestLimitDialogComponent);
    }
  }

  @HostListener('window:keydown.Control.p', ['$event'])
  @HostListener('window:keydown.Meta.p', ['$event'])
  @HostListener('window:beforeprint', ['$event'])
  onStartPrint(event: Event): void {
    if (this.state.getActiveView() !== 'map') {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.sidebar.open(SidebarContext.Print);
  }

  @HostListener('window:keydown.Escape', ['$event'])
  closeSidebareOnEsc(event: Event): void {
    if (this.state.getActiveView() !== 'map') {
      return;
    }
    if (this._dialog.openDialogs.length === 0) {
      if (!this.geocoder.stopDefineArea()) {
        if (!this._search.handleEsc(event)) {
          this.sidebar.close();
        }
      }
    }
  }
}
