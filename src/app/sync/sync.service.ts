import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Patch } from 'immer';
import { debounce } from '../helper/debounce';
import { ZsMapStateService } from '../state/state.service';
import { BehaviorSubject, debounceTime, merge } from 'rxjs';
import { db } from '../db/db';

interface PatchExtended extends Patch {
  timestamp: Date;
  identifier: string;
}

export interface User {
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
}

interface Connection {
  user: User;
  identifier: string;
  label?: string;
  currentLocation?: { long: number; lat: number };
}

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private _connectionId = uuidv4();
  private _socket: Socket | undefined;
  private _state!: ZsMapStateService;
  private _connectingPromise: Promise<void> | undefined;
  private _connections = new BehaviorSubject<Connection[]>([]);

  constructor(
    private _api: ApiService,
    private _session: SessionService,
  ) {
    merge(this._session.observeOperationId(), this._session.observeIsOnline(), this._session.observeLabel())
      .pipe(debounceTime(250))
      .subscribe(async () => {
        const operationId = this._session.getOperationId();
        const isOnline = this._session.isOnline();
        const label = this._session.getLabel();
        if (!isOnline || !operationId || !label) {
          await this._disconnect();
          return;
        }
        await this._reconnect();
        await this._publishMapStatePatches();
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
        query: { identifier: this._connectionId, operationId: this._session.getOperationId(), label: this._session.getLabel() },
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
      this._socket.on('state:connections', (connections: Connection[]) => {
        this._connections.next(connections);
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
    db.patchSyncQueue.bulkPut(patches).then(() => this._publishMapStatePatchesDebounced());
  }

  public async sendCachedMapStatePatches(): Promise<void> {
    return await this._publishMapStatePatches();
  }

  private async _publishMapStatePatches(): Promise<void> {
    const patchQueue = await db.patchSyncQueue.toArray();
    if (!patchQueue.length || !this._session.getToken() || !this._session.isOnline()) {
      return;
    }

    const patches = patchQueue.map((p) => ({
      ...p,
      timestamp: new Date(),
      identifier: this._connectionId,
    }));
    const { error } = await this._api.post('/api/operations/mapstate/patch', patches, {
      headers: {
        operationId: String(this._session.getOperationId()),
        identifier: this._connectionId,
      },
    });
    if (error) {
      return;
    }
    await db.patchSyncQueue.clear();
  }

  private _publishMapStatePatchesDebounced = debounce(async () => {
    await this._publishMapStatePatches();
  }, 250);

  public async publishCurrentLocation(longLat: { long: number; lat: number }): Promise<void> {
    const { error } = await this._api.post('/api/operations/mapstate/currentlocation', longLat, {
      headers: {
        operationId: this._session.getOperationId() + '',
        identifier: this._connectionId,
      },
    });
    if (error) {
      return;
    }
  }

  public observeConnections() {
    return this._connections.asObservable();
  }
}
