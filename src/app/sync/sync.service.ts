import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import io, { Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Patch } from 'immer';
import { debounce } from '../helper/debounce';
import { ZsMapStateService } from '../state/state.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private _connectionId = '';
  private _isConnected = new BehaviorSubject(false);
  private _socket: Socket | undefined;
  private _mapStatePatchQueue: Patch[] = [];
  private _state!: ZsMapStateService;
  constructor(private _api: ApiService, private _session: SessionService) {
    this._session.observeOperationId().subscribe((operationId) => {
      if (operationId) {
        this._reconnect();
      } else {
        this._disconnect();
      }
    });
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;
  }

  private async _reconnect(): Promise<void> {
    await this._disconnect();
    await this._connect();
  }

  private async _connect(): Promise<void> {
    if (this._isConnected.value) {
      return;
    }

    return await new Promise((resolve, reject) => {
      this._connectionId = uuidv4();
      const token = this._session.getToken();
      const url = this._api.getUrl();
      this._socket = io(url, {
        auth: {
          token: token,
        },
        transports: ['websocket'],
        query: { identifier: this._connectionId, operationId: this._session.getOperationId() },
        forceNew: true,
      });

      this._socket.on('connect_error', (err) => {
        console.error('Error while connecting to websocket');
        this._disconnect();
        reject(err);
      });
      this._socket.on('connect', () => {
        this._isConnected.next(true);
        resolve();
      });
      this._socket.on('disconnect', () => {
        this._disconnect();
      });
      this._socket.on('state:patches', (patches) => {
        this._state.applyMapStatePatches(patches);
      });
      this._socket.connect();
    });
  }

  private async _disconnect(): Promise<void> {
    if (!this._isConnected.value) {
      return;
    }
    if (this._socket) {
      this._socket.removeAllListeners();
      if (this._socket.connected) {
        this._socket.disconnect();
      }
    }
    this._socket = undefined;
    this._isConnected.next(false);
  }

  public observeIsConnected(): Observable<boolean> {
    return this._isConnected.asObservable();
  }

  public publishMapStatePatches(patches: Patch[]): void {
    this._mapStatePatchQueue.push(...patches);
    this._publishPatches();
  }

  private _publishPatches = debounce(async () => {
    if (this._isConnected.value) {
      if (this._mapStatePatchQueue.length > 0) {
        const patches = [...this._mapStatePatchQueue];
        this._mapStatePatchQueue = [];
        try {
          // TODO implement retry logic
          await this._api.post('/api/operations/mapstate/patch', patches, {
            headers: {
              operationId: this._session.getOperationId() + '',
              identifier: this._connectionId,
            },
          });
        } catch (err) {
          console.error('Error while publishing patches', err);
        }
      }
    }
  }, 500);
}
