import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { SessionService } from '../session.service';
import { ZsMapStateService } from '../../state/state.service';
import { IZsMapOperation } from './operation.interfaces';
import { ZsMapLayerStateType } from '../../state/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss'],
})
export class OperationsComponent {
  public operations = new BehaviorSubject<IZsMapOperation[]>([]);
  public operationToEdit = new BehaviorSubject<IZsMapOperation | undefined>(undefined);
  constructor(private _api: ApiService, private _state: ZsMapStateService, private _session: SessionService, private _router: Router) {
    this._session.observeOrganizationId().subscribe(async (organizationId) => {
      if (organizationId) {
        this._reload();
      }
    });
  }

  private async _reload(): Promise<void> {
    const { error, result: operations } = await this._api.get<IZsMapOperation[]>(
      '/api/operations?filters[organization][id][$eq]=' + this._session.getOrganizationId() + '&filters[status][$eq]=active',
    );
    if (error || !operations) return;
    this.operations.next(operations);
    this.operationToEdit.next(undefined);
  }

  public selectOperation(operation: IZsMapOperation): void {
    this._session.setOperationId(operation.id);
    this._router.navigateByUrl('/map');
  }

  public newOperation(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.operationToEdit.next({ id: undefined } as any);
  }

  public async deleteOperation(): Promise<void> {
    if (!this.operationToEdit.value) {
      return;
    }
    if (this.operationToEdit.value) {
      this.operationToEdit.value.status = 'archived';
    }
    await this._api.put('/api/operations/' + this.operationToEdit.value.id, {
      data: { ...this.operationToEdit.value, organization: this._session.getOrganizationId() },
    });
    this._reload();
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

    if (!operation.id) {
      await this._api.post('/api/operations', { data: { ...operation, organization: this._session.getOrganizationId() } });
    } else {
      await this._api.put('/api/operations/' + operation.id, { data: { ...operation, organization: this._session.getOrganizationId() } });
    }
    this._reload();
  }

  public logout(): void {
    this._session.logout();
  }
}
