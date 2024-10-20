import { Component, OnDestroy } from '@angular/core';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { SessionService } from '../session.service';
import { IZsMapOperation } from './operation.interfaces';
import { I18NService } from '../../state/i18n.service';
import { OperationService } from './operation.service';
import { ActivatedRoute } from '@angular/router';

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
    private route: ActivatedRoute,
  ) {
    this.operationService.loadLocal();
    this._session
      .observeOrganizationId()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(async (organizationId) => {
        if (organizationId) {
          await this.operationService.reload();
        }
      });
    //select operationId if set as parameter and have access to
    firstValueFrom(route.queryParams).then((queryParams) => {
      if (queryParams['operationId']) {
        try {
          const operationId = parseInt(queryParams['operationId']);
          this.operationService.operations.pipe(takeUntil(this._ngUnsubscribe)).subscribe((operations) => {
            const operation = operations.find((o) => o.id === operationId);
            if (operation) {
              this.selectOperation(operation);
            }
          });
        } catch (ex) {
          //ignore invalid operationId param
        }
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
