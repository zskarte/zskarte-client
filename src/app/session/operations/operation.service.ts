import { Injectable } from '@angular/core';
import { ZsMapLayerStateType } from '../../state/interfaces';
import { IZsMapOperation } from './operation.interfaces';
import { ApiService } from '../../api/api.service';
import { SessionService } from '../session.service';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import { OperationExportFileVersion } from '../../core/entity/operationExportFile';
import { ImportDialogComponent } from '../../import-dialog/import-dialog.component';
import { SafeUrl } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { IpcService } from '../../ipc/ipc.service';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  public operations = new BehaviorSubject<IZsMapOperation[]>([]);
  public operationToEdit = new BehaviorSubject<IZsMapOperation | undefined>(undefined);
  public downloadData: SafeUrl | null = null;

  constructor(
    private _api: ApiService,
    private _session: SessionService,
    public _ipc: IpcService,
    private _dialog: MatDialog,
  ) {}

  public async deleteOperation(operation: IZsMapOperation): Promise<void> {
    if (!operation) {
      return;
    }

    operation.status = 'archived';
    await this._api.put(`/api/operations/${operation.id}`, {
      data: { ...operation, organization: this._session.getOrganizationId() },
    });
    await this.reload();
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
      await this._api.put(`/api/operations/${operation.id}`, { data: { ...operation, organization: this._session.getOrganizationId() } });
    } else {
      await this._api.post('/api/operations', { data: { ...operation, organization: this._session.getOrganizationId() } });
    }

    await this.reload();
    this.operationToEdit.next(undefined);
  }

  public async reload(): Promise<void> {
    const { error, result: operations } = await this._api.get<IZsMapOperation[]>(
      `/api/operations?filters[organization][id][$eq]=${this._session.getOrganizationId()}&filters[status][$eq]=active`,
    );
    if (error || !operations) return;
    this.operations.next(operations);
  }

  public importOperation(): void {
    const importDialog = this._dialog.open(ImportDialogComponent);
    importDialog.afterClosed().subscribe((result) => {
      if (result) {
        // Prior to V2 the "map" key was used to store the map state.
        // To keep consistent with our internal naming, use "mapState" from V2 on
        const mapState = result.version === OperationExportFileVersion.V2 ? result.mapState : result.map;
        const operation: IZsMapOperation = {
          name: result.name,
          description: result.description,
          status: 'active',
          eventStates: result.eventStates,
          mapState,
        };
        this.saveOperation(operation);
      }
    });
  }

  public async exportOperation(operationId: number | undefined): Promise<void> {
    if (!operationId) {
      return;
    }
    const fileName = `Ereignis_${DateTime.now().toFormat('yyyy_LL_dd_hh_mm')}.zsjson`;
    const { result: operation } = await this._api.get<IZsMapOperation>(`/api/operations/${operationId}`);
    const saveFile = {
      name: operation?.name,
      description: operation?.description,
      version: OperationExportFileVersion.V2,
      mapState: operation?.mapState,
      eventStates: operation?.eventStates,
    };
    await this._ipc.saveFile({
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

  public createOperation(): void {
    this.operationToEdit.next({
      name: '',
      description: '',
      status: 'active',
      eventStates: [],
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
}
