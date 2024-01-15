/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnDestroy } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { I18NService } from 'src/app/state/i18n.service';
import { Subject } from 'rxjs';
import { SyncService } from '../../sync/sync.service';
import { SessionService } from '../../session/session.service';

@Component({
  selector: 'app-sidebar-connections',
  templateUrl: './sidebar-connections.component.html',
  styleUrls: ['./sidebar-connections.component.css'],
})
export class SidebarConnectionsComponent implements OnDestroy {
  connections$: Observable<{ label?: string; currentLocation?: { long: number; lat: number } }[]> | undefined;
  label$: Observable<string> | undefined;
  private _ngUnsubscribe = new Subject<void>();

  constructor(public i18n: I18NService, private syncService: SyncService, public session: SessionService) {
    this.connections$ = this.syncService.observeConnections().pipe(takeUntil(this._ngUnsubscribe));
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }
}
