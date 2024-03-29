/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { I18NService } from 'src/app/state/i18n.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { SyncService } from '../../sync/sync.service';
import { SessionService } from '../../session/session.service';
import { ZsMapStateService } from '../../state/state.service';

@Component({
  selector: 'app-sidebar-connections',
  templateUrl: './sidebar-connections.component.html',
  styleUrls: ['./sidebar-connections.component.css'],
})
export class SidebarConnectionsComponent implements OnDestroy {
  connections$: Observable<{ label?: string; currentLocation?: { long: number; lat: number } }[]> | undefined;
  label$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  showCurrentLocation$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  labelEdit$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isOnline = new BehaviorSubject<boolean>(true);
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    public i18n: I18NService,
    private syncService: SyncService,
    public session: SessionService,
    public state: ZsMapStateService,
  ) {
    this.connections$ = this.syncService.observeConnections().pipe(takeUntil(this._ngUnsubscribe));
    this.label$?.next(this.session.getLabel() ?? '');
    this.state
      .observeShowCurrentLocation$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((showCurrentLocation) => {
        this.showCurrentLocation$.next(showCurrentLocation);
      });
    this.session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline.next(isOnline);
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public toggleEditLabel(): void {
    this.labelEdit$?.next(!this.labelEdit$.value);
    if (this.labelEdit$.value) return;
    this.session.setLabel(this.label$.value);
  }

  public centerMap(location: { long: number; lat: number }): void {
    this.state.updateCurrentMapCenter$([location.long, location.lat]);
  }
}
