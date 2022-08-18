import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import { ZsMapStateService } from '../state/state.service';
import { IZsMapOperation } from './operation.interfaces';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss'],
})
export class OperationsComponent implements OnInit {
  public operations = new BehaviorSubject<IZsMapOperation[]>([]);
  constructor(private _api: ApiService, private _state: ZsMapStateService, private _session: SessionService, private _router: Router) {}

  async ngOnInit(): Promise<void> {
    const result = await this._api.get('/api/operations');
    const operations: IZsMapOperation[] = [];
    for (const o of result?.data) {
      operations.push({
        id: o.id,
        name: o.attributes.name,
        description: o.attributes.description,
        mapState: o.attributes.mapState,
      });
    }
    this.operations.next(operations);
  }

  public selectOperation(operation: IZsMapOperation): void {
    this._session.setOperationId(operation.id);
    this._router.navigateByUrl('/map');
  }
}
