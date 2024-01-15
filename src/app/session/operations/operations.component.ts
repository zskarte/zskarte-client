import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { SessionService } from '../session.service';
import { ZsMapStateService } from '../../state/state.service';
import { IZsMapOperation } from './operation.interfaces';
import { ZsMapLayerStateType } from '../../state/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { I18NService } from '../../state/i18n.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DateTime } from 'luxon';
import { IpcService } from '../../ipc/ipc.service';
import { MatDialog } from '@angular/material/dialog';
import { ImportDialogComponent } from '../../import-dialog/import-dialog.component';
import { OperationExportFileVersion } from '../../core/entity/operationExportFile';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss'],
})
export class OperationsComponent implements OnDestroy {
  public operations = new BehaviorSubject<IZsMapOperation[]>([]);
  public operationToEdit = new BehaviorSubject<IZsMapOperation | undefined>(undefined);
  public downloadData: SafeUrl | null = null;
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    private _api: ApiService,
    private _state: ZsMapStateService,
    private _session: SessionService,
    public i18n: I18NService,
    private _router: Router,
    public ipc: IpcService,
    private _sanitizer: DomSanitizer,
    private _dialog: MatDialog,
  ) {
    this._session
      .observeOrganizationId()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(async (organizationId) => {
        if (organizationId) {
          await this._reload();
        }
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  private async _reload(): Promise<void> {
    const { error, result: operations } = await this._api.get<IZsMapOperation[]>(
      '/api/operations?filters[organization][id][$eq]=' + this._session.getOrganizationId() + '&filters[status][$eq]=active',
    );
    if (error || !operations) return;
    this.operations.next(operations);
  }

  public async selectOperation(operation: IZsMapOperation): Promise<void> {
    if (operation.id) {
      this._session.setOperation(operation);
    }
  }

  public createOperation(): void {
    this.operationToEdit.next({
      name: '',
      description: '',
      status: 'active',
      mapState: {
        version: 1,
        id: uuidv4(),
        // TODO get map center from organization
        center: [0, 0],
        name: '',
        layers: [{ id: uuidv4(), type: ZsMapLayerStateType.DRAW, name: 'Layer 1' }],
      },
    });
  }

  public async importOperation(): Promise<void> {
    const importDialog = this._dialog.open(ImportDialogComponent);
    importDialog.afterClosed().subscribe((result) => {
      if (result) {
        const operation: IZsMapOperation = {
          name: result.name,
          description: result.description,
          status: 'active',
          mapState: result.map,
        };
        this.saveOperation(operation);
      }
    });
  }

  public async deleteOperation(operation: IZsMapOperation): Promise<void> {
    if (!operation) {
      return;
    }

    operation.status = 'archived';
    await this._api.put('/api/operations/' + operation.id, {
      data: { ...operation, organization: this._session.getOrganizationId() },
    });
    await this._reload();
  }

  public async saveOperation(operation: IZsMapOperation): Promise<void> {
    if (!operation.mapState) {
      // TODO encapsulate this
      operation.mapState = {
        version: 1,
        id: uuidv4(),
        // TODO get map center from organization
        center: [0, 0],
        name: operation.name,
        layers: [{ id: uuidv4(), type: ZsMapLayerStateType.DRAW, name: 'Layer 1' }],
      };
    }
    if (!operation.status) {
      operation.status = 'active';
    }

    if (operation.id) {
      await this._api.put('/api/operations/' + operation.id, { data: { ...operation, organization: this._session.getOrganizationId() } });
    } else {
      await this._api.post('/api/operations', { data: { ...operation, organization: this._session.getOrganizationId() } });
    }

    await this._reload();
    this.operationToEdit.next(undefined);
  }

  public async exportOperation(operationId: number | undefined): Promise<void> {
    if (!operationId) {
      return;
    }
    const fileName = `Ereignis_${DateTime.now().toFormat('yyyy_LL_dd_hh_mm')}.zsjson`;
    const { result: operation } = await this._api.get<IZsMapOperation>('/api/operations/' + operationId);
    const saveFile = {
      name: operation?.name,
      description: operation?.description,
      version: OperationExportFileVersion.V1,
      map: operation?.mapState,
    };
    await this.ipc.saveFile({
      data: JSON.stringify(saveFile),
      fileName,
      mimeType: 'application/json',
      filters: [
        {
          name: 'ZS-Karte',
          extensions: ['zsjson'],
        },
      ],
    });
  }

  public async logout(): Promise<void> {
    await this._session.logout();
  }
}
