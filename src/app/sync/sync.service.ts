import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Patch } from 'immer';
import { debounce } from '../helper/debounce';
import { ZsMapStateService } from '../state/state.service';
import { debounceTime, merge } from 'rxjs';

interface PatchExtended extends Patch {
  timestamp: Date;
  identifier: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private _connectionId = uuidv4();
  private _socket: Socket | undefined;
  private _mapStatePatchQueue: Patch[] = [];
  private _state!: ZsMapStateService;
  private _connectingPromise: Promise<void> | undefined;

  constructor(
    private _api: ApiService,
    private _session: SessionService,
  ) {
    merge(this._session.observeOperationId(), this._session.observeIsOnline())
      .pipe(debounceTime(250))
      .subscribe(async () => {
        const operationId = this._session.getOperationId();
        const isOnline = this._session.isOnline();
        if (isOnline) {
          if (operationId) {
            await this._reconnect();
          } else {
            await this._disconnect();
          }
        } else {
          await this._disconnect();
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
    if (this._socket?.connected) {
      return;
    }

    if (this._connectingPromise) {
      return await this._connectingPromise;
    }

    this._connectingPromise = new Promise<void>((resolve, reject) => {
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
        resolve();
      });
      this._socket.on('disconnect', () => {
        console.warn('Disconnected from websocket');
        this._disconnect();
      });
      this._socket.on('state:patches', (patches: PatchExtended[]) => {
        const otherPatches = patches.filter((p) => p.identifier !== this._connectionId);
        if (otherPatches.length === 0) return;
        this._state.applyMapStatePatches(otherPatches);
      });
      this._socket.connect();
    }).finally(() => {
      this._connectingPromise = undefined;
    });

    return await this._connectingPromise;
  }

  private async _disconnect(): Promise<void> {
    if (!this._socket) {
      return;
    }
    this._socket.removeAllListeners();
    try {
      this._socket.disconnect();
    } catch {
      // do nothing here
    }
    this._socket = undefined;
  }

  public publishMapStatePatches(patches: Patch[]): void {
    this._mapStatePatchQueue.push(...patches);
    this._publishMapStatePatchesDebounced();
  }

  public async sendCachedMapStatePatches(): Promise<void> {
    return await this._publishMapStatePatches();
  }

  private async _publishMapStatePatches(): Promise<void> {
    if (this._mapStatePatchQueue.length > 0 && this._session.getToken() && this._session.isOnline()) {
      const patches = this._mapStatePatchQueue.map((p) => ({ ...p, timestamp: new Date(), identifier: this._connectionId }));
      const { error } = await this._api.post('/api/operations/mapstate/patch', patches, {
        headers: {
          operationId: String(this._session.getOperationId()),
          identifier: this._connectionId,
        },
      });
      if (error) {
        return;
      }
      this._mapStatePatchQueue = [];
    }
  }

  private _publishMapStatePatchesDebounced = debounce(async () => {
    this._publishMapStatePatches();
  }, 250);
}
