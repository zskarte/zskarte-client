import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SessionService } from '../session.service';
import { IZsMapOperation } from './operation.interfaces';
import { I18NService } from '../../state/i18n.service';
import { OperationService } from './operation.service';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss'],
})
export class OperationsComponent implements OnDestroy {
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    private _session: SessionService,
    public i18n: I18NService,
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

  public async selectOperation(operation: IZsMapOperation): Promise<void> {
    if (operation.id) {
      this._session.setOperation(operation);
    }
  }

  public async logout(): Promise<void> {
    await this._session.logout();
  }
}
