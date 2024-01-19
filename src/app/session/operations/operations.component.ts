import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { SessionService } from '../session.service';
import { ZsMapStateService } from '../../state/state.service';
import { IZsMapOperation } from './operation.interfaces';
import { I18NService } from '../../state/i18n.service';
import { DomSanitizer } from '@angular/platform-browser';
import { IpcService } from '../../ipc/ipc.service';
import { MatDialog } from '@angular/material/dialog';
import { OperationService } from './operation.service';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss'],
})
export class OperationsComponent implements OnDestroy {
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    private _api: ApiService,
    private _state: ZsMapStateService,
    private _session: SessionService,
    public i18n: I18NService,
    private _router: Router,
    public ipc: IpcService,
    private _dialog: MatDialog,
    private _sanitizer: DomSanitizer,
    public operationService: OperationService,
  ) {
    this._session
      .observeOrganizationId()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(async (organizationId) => {
        if (organizationId) {
          await this.operationService.reload();
        }
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public selectOperation(operation: IZsMapOperation) {
    if (operation.id) {
      this._session.setOperation(operation);
    }
  }

  public async logout(): Promise<void> {
    await this._session.logout();
  }
}
