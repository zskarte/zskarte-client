import {
  computed,
  effect,
  EnvironmentInjector,
  inject,
  Injectable,
  runInInjectionContext,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import {
  ChangesetInconsistentError,
  ChangesetMissingError,
  defineDefaultValuesForSignature,
  DRAW_ELEMENTS,
  INITIAL_CHANGESET_ID,
  IZsChangeInfos,
  IZsChangeset,
  IZsChangesetConfig,
  IZsChangesetConflict,
  IZsChangesetConflictDetails,
  IZsChangesetConflictValue,
  IZsChangesetInternal,
  IZsChangeValues,
  ZsMapDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapState,
} from '@zskarte/types';
import { applyPatches, Patch, produce } from 'immer';
import { ZsMapStateService } from '../state/state.service';
import { SessionService } from '../session/session.service';
import { Signs } from '../map-renderer/signs';
import { ApiService } from '../api/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { db } from '../db/db';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18NService } from '../state/i18n.service';
import {
  createNewChangeset,
  getElement,
  getModifiedDrawElements,
  isValidImmerPatch,
  updateChangesetIdsAfterApply,
  updateChangesetIdsAfterUnapply,
  updateChangesetIdsFromPatches,
  updateDescription,
  verifyChangesetCanUnapply,
  verifyChangesetConsistency,
} from '@zskarte/common';
import _ from 'lodash';
import { Md5 } from 'ts-md5';
import { SidebarService } from '../sidebar/sidebar.service';
import { SidebarContext } from '../sidebar/sidebar.interfaces';
import { DrawStyle } from '../map-renderer/draw-style';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InfoDialogComponent } from '../info-dialog/info-dialog.component';

export const NO_CONFLICT_VALUE = 'NO_CONFLICT_VALUE';
export const CONFLICT_INDEX_NAME = ['orig', 'there', 'our'];
export const ORIG_INDEX = 0;
export const THERE_INDEX = 1;
export const OUR_INDEX = 2;
export const CONFLICT_INDEX = 3;


export type UnhandledPatch =
  | { patches: Patch[]; inversePatches: Patch[]; timestamp: number }
  | { newChangeset: true; messageNumber?: number; manual?: boolean; manualDescription?: string };

@Injectable({
  providedIn: 'root',
})
export class ChangesetService {
  private _state!: ZsMapStateService;
  private _session!: SessionService;
  private _sidebar!: SidebarService;
  private _api = inject(ApiService);
  private _i18n = inject(I18NService);
  private _snackBar = inject(MatSnackBar);
  private _dialog = inject(MatDialog);
  private _domSanitizer = inject(DomSanitizer);
  protected readonly _current = signal<IZsChangesetInternal | null>(null);
  protected readonly _unhandledPatches = signal<UnhandledPatch[]>([]);
  private _handlingUnhandledPromise: Promise<void> | null = null;
  readonly unhandledPatchesCount = computed(() => this._unhandledPatches().length);
  private readonly _environmentInjector = inject(EnvironmentInjector);
  private _operationId: Signal<string | undefined> = signal<string | undefined>(undefined);
  readonly changesetConfig = signal<IZsChangesetConfig>({
    applyOnExpertViewOnly: false,
    hiddenMode: true,
    automerge: true,
    conflictTakeOur: true,
  });
  readonly isChangesetMergeMode = signal<boolean | undefined>(undefined);
  readonly incommingChangesets = signal<IZsChangeset[]>([]);
  readonly incommingCount = computed(() => {
    return this.incommingChangesets().length;
  });
  readonly outgoingCount = signal<number>(0);
  readonly timeout = signal<number | null>(null, { equal: () => false });
  readonly saving = signal<boolean>(false);
  readonly inconsistent = signal<boolean>(false);
  readonly merging = signal<{ current: number; count: number } | null>(null);
  readonly errorChangeset = signal<IZsChangesetInternal | null>(null);
  readonly conflictDetails = signal<IZsChangesetConflictDetails | null>(null);
  readonly oldConflictDetails = signal<IZsChangesetConflictDetails | null>(null);
  readonly saveError = computed(() => {
    const errorChangeset = this.errorChangeset();
    return !!errorChangeset;
  });
  readonly errorDescription = computed(() => {
    return this.errorChangeset()?.description;
  });

  readonly offlineMode = signal<boolean>(false);
  readonly hasChanges = computed(() => {
    return this._current()?.startAt !== undefined;
  });
  readonly changesStashed = computed(() => {
    return this._current()?.stashed;
  });
  readonly isManual = computed(() => {
    return this._current()?.manual === true;
  });
  readonly overlayVisible = computed(() => {
    return !this.changesetConfig().hiddenMode || this.isChangesetMergeMode();
  });
  readonly changeDescription = computed(() => {
    return this._current()?.description;
  });

  private _connectionId!: string;

  private _timeoutId: NodeJS.Timeout | undefined = undefined;
  private _createMultiElementChangesetDelta = 15000; //15sec
  protected _commitSingleTimeout = 15000; //15sec
  protected _commitMultiTimeout = 30000; //30sec
  protected _commitMessageTimeout = 120000; //2min
  protected _commitManualTimeout = 120000; //2min
  private _maxEditTimeout = 300000; //5min

  constructor() {
    effect(() => {
      const val = this.timeout();
      if (val === null) {
        clearTimeout(this._timeoutId);
      } else {
        clearTimeout(this._timeoutId);
        this._timeoutId = setTimeout(() => {
          this._state.finishCurrentChangeset();
        }, val);
      }
    });

    effect(() => {
      const changeset = this._current();
      if (changeset) {
        //save in local db to prevent data loose on page refresh...
        this.updateOutgoing(changeset);
      }
    });

    effect(() => {
      if (this._session.sessionInitialized() && this.inconsistent() && this.conflictDetails()) {
        this.openChangesetMergeView();
      }
    });

    effect(() => {
      if (!this.overlayVisible()) {
        return;
      }
      const changeset = untracked(() => this._current());
      updateDescription(changeset, changeset?.baseMapState, this._getSymbolName.bind(this));
    });
  }

  public setStateService(state: ZsMapStateService): void {
    this._state = state;

    runInInjectionContext(this._environmentInjector, () => {
      const changesetConfig = toSignal(this._state.observeChangesetConfig());
      const isChangesetMergeMode = toSignal(this._state.observeIsChangesetMergeMode());
      const isExpertView = toSignal(this._state.observeIsExpertView());
      //initialize state based signals
      effect(() => {
        const config = changesetConfig();
        if (config) {
          const expertView = isExpertView();
          const evaluatedConfig: IZsChangesetConfig = { ...config };
          if (config.applyOnExpertViewOnly && !expertView) {
            evaluatedConfig.hiddenMode = true;
            evaluatedConfig.automerge = true;
            evaluatedConfig.conflictTakeOur = true;
          }
          this.changesetConfig.set(evaluatedConfig);
        }
      });
      effect(() => {
        this.isChangesetMergeMode.set(isChangesetMergeMode());
      });
    });
  }

  public setSidebarService(sidebar: SidebarService): void {
    this._sidebar = sidebar;
  }

  public setSessionService(session: SessionService): void {
    this._session = session;

    //initialize session based signals
    runInInjectionContext(this._environmentInjector, () => {
      this._operationId = toSignal(this._session.observeOperationId());
      let oldSessionInitialized = false;
      let oldOperationId: string | undefined = undefined;
      effect(async () => {
        const operationId = this._operationId();
        const sessionInitialized = this._session.sessionInitialized();
        if (oldSessionInitialized === sessionInitialized && oldOperationId === operationId) {
          return;
        }
        oldSessionInitialized = sessionInitialized;
        oldOperationId = operationId;
        if (!sessionInitialized) return;
        this.timeout.set(null);
        this.saving.set(false);
        this._setErrorChangeset(null, false);
        if (this._state.isChangesetMergeMode()) {
          this._state.setChangesetMergeMode(false);
        }

        if (operationId) {
          const count = await this._getOutgoingChangesets(operationId).count();
          this.outgoingCount.set(count);

          const current = await db.changesetOutgoingQueue
            .where('operationId')
            .equals(operationId)
            .and((c) => !c.endAt)
            .first();
          if (current) {
            this._current.set(current);
            this._updateTimeout(current);
          } else {
            this._current.set(null);
          }
          this.submitOutgoing();
        } else {
          this.outgoingCount.set(0);
          this._current.set(null);
        }
      });
    });
  }

  public setConnectionId(connectionId: string): void {
    this._connectionId = connectionId;
  }

  private _getSymbolName(symbolId: number) {
    const sign = Signs.getSignById(symbolId);
    if (!sign) return null;
    return this._i18n.getLabelForSign(sign);
  }

  protected async _unapplyOutgoingAndApplyIncomming() {
    try {
      await this.unapplyOutgoingChangesets();
      if (this.incommingCount() > 1) {
        this.applyIncommingChangesets();
        return;
      }
    } catch (error) {
      console.warn('error on unapplyOutgoingAndApplyIncomming, refreshMapState instead.', error);
    }
    await this._state.refreshMapState(false);
    const operationId = this._operationId();
    if (operationId) {
      this._getOutgoingChangesets(operationId).modify({ applied: false });
    }
    this.incommingChangesets.set([]);
  }

  protected async _submitChangeset(changeset: IZsChangesetInternal) {
    if (this.inconsistent()) {
      this._snackBar.open('fix inconsistent changeset before try to submit', 'OK', {
        duration: 5000,
      });
      throw new ChangesetInconsistentError(this.errorChangeset()?.id || this._current()?.id || changeset.id);
    }
    if (this.offlineMode()) {
      await this.updateOutgoing(changeset);
      this._state.applyChangesets([changeset]);
      return;
    }
    this.saving.set(true);
    try {
      //remove internal values
      let changesetToSave: IZsChangeset, _unused: any;
      ({
        cleaned: _unused,
        stashed: _unused,
        baseMapState: _unused,
        currentMapState: _unused,
        origDrawElements: _unused,
        thereDrawElements: _unused,
        ourDrawElements: _unused,
        mergedDrawElements: _unused,
        ...changesetToSave
      } = changeset);

      const response = await this._api.post('/api/operations/mapstate/changeset', changesetToSave, {
        headers: {
          operationId: changeset.operationId,
          identifier: this._connectionId,
        },
      });

      const { error, result } = response;
      if (error) {
        if ((error as any).isInconsistent) {
          if (!this.changesetConfig().hiddenMode) {
            this._snackBar.open('changeset is inconsistent, you need to fix it', 'OK', {
              duration: 5000,
            });
          }
          await this._unapplyOutgoingAndApplyIncomming();
          this._setErrorChangeset(changeset, true);
          throw new ChangesetInconsistentError(changeset.id);
        }
        if ((error as any).isInvalid) {
          const message = `changeset ${changeset.id} is invalid and cannot be handled by backend: ${error.message}`;
          this._snackBar.open(message, 'OK', {
            duration: 5000,
          });
          await this._unapplyOutgoingAndApplyIncomming();
          this._setErrorChangeset(changeset, true);
          throw new Error(message);
        }
        if ((error.status ?? 0) >= 500 || error.message?.startsWith('NetworkError')) {
          if (!this.offlineMode()) {
            this._snackBar.open('Publish changes failed, you are now in offline mode!', 'OK', {
              duration: 5000,
            });
            this.offlineMode.set(true);
          }
          await this.updateOutgoing(changeset);
          await this.applyOutgoingChangesets();
        } else {
          this._setErrorChangeset(changeset, false);
          const message = `unknown error on submit changeset ${changeset.id}: ${error.message}`;
          this._snackBar.open(message, 'OK', {
            duration: 5000,
          });
          await this.applyOutgoingChangesets();
          throw new Error(message);
        }
      } else {
        changesetToSave.saved = true;
        if (result.data) {
          const { sign, ...updatedFields } = result.data;
          Object.assign(changesetToSave, updatedFields);
          const operation = this._session.getOperation();
          if (operation) {
            if (!operation.changesetSigns) {
              operation.changesetSigns = {};
            }
            operation.changesetSigns[changesetToSave.id] = sign;
          }
        } else {
          console.warn(`no signature infos returned on submit changeset ${changesetToSave.id} response was:`, result);
        }
        await this.updateOutgoing(changeset, true);
        this._setErrorChangeset(null, false);
        this._state.applyChangesets([changesetToSave]);
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected _getOutgoingChangesets(operationId: string) {
    return db.changesetOutgoingQueue
      .where('operationId')
      .equals(operationId)
      .and((c) => !!c.endAt);
  }

  public async submitOutgoing() {
    const operationId = this._operationId();
    if (operationId) {
      //only submit if there is no currently open changeset
      if (this._current()) return;
      this.offlineMode.set(false);
      const changesets = await this._getOutgoingChangesets(operationId).sortBy('endAt');
      for (const c of changesets) {
        await this._submitChangeset(c);
      }
    }
  }

  public async updateOutgoing(changeset: IZsChangeset, remove = false) {
    if (remove) {
      await db.changesetOutgoingQueue.delete(changeset.id);
    } else {
      await db.changesetOutgoingQueue.put(changeset);
    }

    const count = await this._getOutgoingChangesets(changeset.operationId).count();
    this.outgoingCount.set(count);
  }

  cloneElements(mapState: ZsMapState, elementIds: string[]): Record<string, ZsMapDrawElementState | null> {
    return elementIds.reduce(
      (acc, elemId) => {
        const element = mapState.drawElements[elemId];
        if (element) {
          acc[elemId] = _.cloneDeep(element);
        } else {
          acc[elemId] = null;
        }
        return acc;
      },
      {} as Record<string, ZsMapDrawElementState | null>,
    );
  }

  protected _cleanupChangeset(changeset: IZsChangesetInternal) {
    if (!changeset.baseMapState){
      throw new Error('changeset.baseMapState is required')
    }

    //merge changes from patches so add+remove is eliminated, add+replace+replace+replace is only add,...
    const mergedMapState = produce<ZsMapState>(
      changeset.baseMapState,
      (draft) => {
        applyPatches(draft, changeset.patches);
      },
      (patches, inversePatches) => {
        changeset.patches = patches;
        changeset.inversePatches = inversePatches;
      },
    );
    //clean drawElementsLastChangeset/changedDrawElements/deletedDrawElements by remove unchanged elements after clean patch list
    const modifiedDrawElements = getModifiedDrawElements(changeset.patches);
    Object.keys(changeset.drawElementsLastChangeset).forEach((elemId) => {
      if (!modifiedDrawElements.has(elemId)) {
        delete changeset.drawElementsLastChangeset[elemId];
      }
    });
    changeset.changedDrawElements = changeset.changedDrawElements.filter((elemId) => modifiedDrawElements.has(elemId));
    if (changeset.changedDrawElements.length !== modifiedDrawElements.size) {
      changeset.changedDrawElements = Array.from(modifiedDrawElements);
    }

    changeset.deletedDrawElements = changeset.deletedDrawElements.filter((elemId) => modifiedDrawElements.has(elemId));
    changeset.cleaned = true;
    return mergedMapState;
  }

  protected async _unstashAndApplyIncomming() {
    try {
      this._state.stashCurrentChangeset();
      this.applyIncommingChangesets();
    } catch (error) {
      await this._state.refreshMapState(false);
      this.upateCurrent({ stashed: true });
      this.incommingChangesets.set([]);
    }
  }

  public async finishChangeset(mapState: ZsMapState, applyUnhandledPatchesAfterwards = true) {
    this.timeout.set(null);
    const changeset: IZsChangesetInternal | null = this._current();
    if (changeset === null) return;
    if (!changeset.firstChangeAt) {
      //ignore empty / not started changeset
      await this.updateOutgoing(changeset, true);
      this._current.set(null);
      return;
    }
    //clean changeset from not needed edit steps
    if (!changeset.cleaned && changeset.baseMapState) {
      this._cleanupChangeset(changeset);
      if (changeset.patches.length === 0) {
        await this.updateOutgoing(changeset, true);
        this._current.set(null);
        return;
      }
      this._current.set(changeset);
    }

    //save changeset element state for conflict handling
    if (!changeset.stashed && !changeset.ourDrawElements) {
      //on hiddenMode incomming changes are auto applied, and here perhaps changed element are deleted from other already
      changeset.ourDrawElements = this.cloneElements(mapState, changeset.changedDrawElements);
      this._current.set(changeset);
    }

    //for continue we need to remove/stash current changeset and if there are any incomming, apply them
    if (!changeset.stashed || this.incommingCount() > 0) {
      await this._unstashAndApplyIncomming();
      //restart with new mapState
      await this._state.finishCurrentChangeset(applyUnhandledPatchesAfterwards);
      return;
    }

    if (!changeset.endAt) {
      changeset.endAt = new Date().getTime();
    }
    updateDescription(changeset, changeset.baseMapState, this._getSymbolName.bind(this));

    //save now in outgoing phase / endAt set
    await this.updateOutgoing(changeset);
    this._current.set(null);

    //if in offline mode apply to allow work
    if (this.offlineMode()) {
      this._state.applyChangesets([changeset]);
      return;
    }

    //verify and submit all outgoing
    const error = verifyChangesetConsistency(mapState, changeset);
    if (error) {
      this._setErrorChangeset(changeset, true);
      throw new ChangesetInconsistentError(changeset.id);
    }

    await this.submitOutgoing();

    if (applyUnhandledPatchesAfterwards) {
      await this._state.handleUnhandledPatches();
    }
  }

  public async newChangeset(messageNumber?: number, manual = false, queueOnFail = false, manualDescription?: string) {
    try {
      await this._state.finishCurrentChangeset(false);

      const organisationId = this._session.isWorkLocal() ? 'local' : this._session.getOrganization()?.documentId;
      const operationId = this._session.getOperationId();
      const author = this._session.getLabel();

      if (organisationId && operationId && author) {
        const newChangeset = createNewChangeset(
          organisationId,
          operationId,
          author,
          messageNumber,
          manual,
          manualDescription,
        );
        if (this._session.getOperation()?.changesets?.[newChangeset.id]) {
          throw new Error('uuid collision, try again...');
        }
        this._current.set(newChangeset);
        return newChangeset;
      } else {
        throw new Error('cannot create changeset as organisationId or operationId or author not defined.');
      }
    } catch (error) {
      if (queueOnFail) {
        this._unhandledPatches.update((currentItems) => [
          ...currentItems,
          { newChangeset: true, messageNumber, manual, manualDescription },
        ]);
      }
      throw error;
    }
  }

  public upateCurrent(changes: Partial<IZsChangesetInternal>) {
    this._current.update((changeset) => {
      if (changeset) {
        return { ...changeset, ...changes };
      } else {
        return null;
      }
    });
  }

  public markManual() {
    this.upateCurrent({ manual: true });
    this._updateTimeout(this._current());
  }

  public setManualDescription(description: string) {
    this.upateCurrent({ manualDescription: description });
  }

  protected async _verifyUsableChangesetActive(
    mapState: ZsMapState,
    patches: Patch[],
    modifiedDrawElements: Set<string>,
  ) {
    const changeset = this._current();
    if (changeset === null) {
      //handle: no changeset
      return this.newChangeset();
    } else if (changeset.endAt) {
      return this.newChangeset();
    } else if (changeset.firstChangeAt) {
      if (changeset.messageNumber || changeset.manual) {
        //for message and manual changeset all changes are allowed
        return changeset;
      }
      if (changeset.layer) {
        if (
          Array.from(modifiedDrawElements).some(
            (elemId) => getElement(mapState, patches, [], elemId)?.layer !== changeset.layer,
          )
        ) {
          //only changes for one layer per changeset is allowed
          return this.newChangeset();
        }
      }

      if (changeset.changedDrawElements.some((elemId) => !modifiedDrawElements.has(elemId))) {
        //new drawElement is changed
        const timestamp = new Date().getTime();
        if (
          this.changesetConfig().hiddenMode ||
          changeset.firstChangeAt + this._createMultiElementChangesetDelta < timestamp
        ) {
          //Multi element changeset creation time over
          return this.newChangeset();
        }
      }
    }
    //unused changesets are also valid
    return changeset;
  }

  public handleUnhandledPatches(): Promise<void> {
    if (this._handlingUnhandledPromise) return this._handlingUnhandledPromise;

    this._handlingUnhandledPromise = this._handleUnhandledPatchesInternal().finally(() => {
      this._handlingUnhandledPromise = null;
    });

    return this._handlingUnhandledPromise;
  }

  private async _handleUnhandledPatchesInternal() {
    if (this._unhandledPatches().length === 0) return;
    const patches = [...this._unhandledPatches()];
    this._unhandledPatches.set([]);
    let patch: UnhandledPatch | undefined;
    try {
      patch = patches.shift();
      while (patch) {
        if ('newChangeset' in patch) {
          await this.newChangeset(patch.messageNumber, patch.manual, false, patch.manualDescription);
        } else {
          //on handling unhandled patches the changes initially done may be reverted by save changeset function, so they need to be reapplied
          const mapState = this._state.updateMapState((draft) => {
            if (patch && !('newChangeset' in patch)){
              applyPatches(draft, patch.patches);
            }
          }, true);
          await this.addChange(mapState, patch.patches, patch.inversePatches, true);
        }
        patch = patches.shift();
      }
    } catch (error) {
      if (patch) {
        patches.unshift(patch);
      }
      this._unhandledPatches.update((newPatches) => [...patches, ...newPatches]);
      throw error;
    } finally {
      this._handlingUnhandledPromise = null;
    }
  }

  public async addChange(mapState: ZsMapState, patches: Patch[], inversePatches: Patch[], applyingUnhandledPatches = false) {
    if (patches.length === 0) return;
    const modifiedDrawElements = getModifiedDrawElements(patches);

    //make sure timeout is not handled while update
    this.timeout.set(null);
    const timestamp = new Date().getTime();

    if (!applyingUnhandledPatches) {
      if (this.saving()){
        //on saving no changes are allowed, save it
        this._unhandledPatches.update((currentItems) => [...currentItems, { patches, inversePatches, timestamp }]);
        return;
      }
      if (this._handlingUnhandledPromise) {
        //if there is already one running, finish it first.
        await this._handlingUnhandledPromise.catch((err) => {
          /* ignore */
        });
      }
      if (this.unhandledPatchesCount() > 0){
        //if there are already/still incommings, add and start new run
        this._unhandledPatches.update((currentItems) => [...currentItems, { patches, inversePatches, timestamp }]);
        await this._state.handleUnhandledPatches();
        return;
      }
    }

    let changeset: IZsChangesetInternal;
    try {
      changeset = await this._verifyUsableChangesetActive(mapState, patches, modifiedDrawElements);
      //copy to make later `_current.set` triggers signal
      changeset = { ...changeset };
    } catch (error) {
      this._unhandledPatches.update((currentItems) => [...currentItems, { patches, inversePatches, timestamp }]);
      if (error instanceof ChangesetInconsistentError) {
        this._snackBar.open('You need to first solve the conflicts before update new fields!', 'OK', {
          duration: 2000,
        });
      }
      return;
    }

    //add/update default fields
    if (!changeset.firstChangeAt) {
      const changesetIds = mapState.changesetIds;
      changeset.parentChangesetId = changesetIds ? changesetIds[changesetIds.length - 1] : INITIAL_CHANGESET_ID;
      changeset.baseMapState = mapState;
      changeset.origDrawElements = {};
      changeset.firstChangeAt = timestamp;
    }
    if (!changeset.layer) {
      const layers = Array.from(modifiedDrawElements).map((elemId) => getElement(mapState, patches, [], elemId)?.layer);
      changeset.layer = layers.length > 0 ? layers[0] : undefined;
    }
    changeset.lastChangeAt = timestamp;
    changeset.patches.push(...patches);
    changeset.inversePatches.unshift(...inversePatches);

    //handle change metadata
    patches.forEach((patch) => {
      if (patch.path[0] === DRAW_ELEMENTS) {
        const elemId = patch.path[1] as string;
        const element = getElement(mapState, patches, inversePatches, elemId);
        //update changedDrawElements list
        if (!changeset.changedDrawElements.includes(elemId)) {
          changeset.changedDrawElements.push(elemId);
          changeset.drawElementsLastChangeset[elemId] =
            mapState.drawElementChangesetIds[elemId]?.[mapState.drawElementChangesetIds[elemId].length - 1] ||
            INITIAL_CHANGESET_ID;
          if (changeset.origDrawElements) {
            if (element) {
              changeset.origDrawElements[elemId] = _.cloneDeep(element);
            } else {
              changeset.origDrawElements[elemId] = null;
            }
          }
        }
        //update deletedDrawElements list
        if (patch.path.length === 2) {
          if (patch.op === 'remove') {
            if (!changeset.deletedDrawElements.includes(elemId)) {
              changeset.deletedDrawElements.push(elemId);
            }
          } else {
            if (changeset.deletedDrawElements.includes(elemId)) {
              changeset.deletedDrawElements.splice(changeset.deletedDrawElements.indexOf(elemId));
            }
          }
        }
      }
    });
    if (this.overlayVisible()) {
      updateDescription(changeset, changeset.baseMapState, this._getSymbolName.bind(this));
    }
    this._updateTimeout(changeset);
    this._current.set(changeset);
  }

  protected _updateTimeout(changeset: IZsChangeset | null) {
    if (!changeset?.firstChangeAt) return;
    const timeSinceFirstChange = new Date().getTime() - changeset?.firstChangeAt;
    const maxTimeout = timeSinceFirstChange > this._maxEditTimeout ? 0 : this._maxEditTimeout - timeSinceFirstChange;
    if (changeset.messageNumber) {
      this.timeout.set(Math.min(maxTimeout, this._commitMessageTimeout));
    } else if (changeset.manual) {
      this.timeout.set(Math.min(maxTimeout, this._commitManualTimeout));
    } else if (changeset.changedDrawElements.length === 1) {
      this.timeout.set(Math.min(maxTimeout, this._commitSingleTimeout));
    } else {
      this.timeout.set(Math.min(maxTimeout, this._commitMultiTimeout));
    }
  }

  public addIncomming(changeset: IZsChangeset) {
    //not required to cache/permanent save the incomming, on relaod: new operation + mapstate with all applied changesets is loaded
    this.incommingChangesets.update((incomming) => [...incomming, changeset]);
  }

  public applyChangeset(mapState: ZsMapState, changeset: IZsChangeset) {
    //verify changeset not yet applied
    if (!mapState.changesetIds?.includes(changeset.id)) {
      //only apply if consistent
      const error = verifyChangesetConsistency(mapState, changeset);
      if (error) {
        throw new ChangesetInconsistentError(changeset.id);
      }
      mapState = applyPatches(mapState, changeset.patches);

      //update changesetIds on mapstate and drawElements
      mapState = updateChangesetIdsAfterApply(mapState, changeset);
      changeset.applied = true;
      const operation = this._session.getOperation();
      if (operation) {
        if (!operation.changesets) {
          operation.changesets = {};
        }
        operation.changesets[changeset.id] = changeset;
      }

      //update current changest if in hiddenMode (remove patches for things overridden by applied changeset)
      if (this.changesetConfig().hiddenMode && this.hasChanges()) {
        const currentChangeset = this._current();
        if (currentChangeset) {
          const conflictPatches = changeset.patches.filter(
            (p) => p.path.length >= 2 && currentChangeset.changedDrawElements.includes(p.path[1] as string),
          );
          const conflictInversePatches = changeset.inversePatches.filter(
            (p) => p.path.length >= 2 && currentChangeset.changedDrawElements.includes(p.path[1] as string),
          );
          if (conflictPatches.length > 0 || conflictInversePatches.length > 0) {
            const patchesPaths = conflictPatches.map((p) => p.path.join('.'));
            if (!currentChangeset.patchesRevertedForMerge) {
              currentChangeset.patchesRevertedForMerge = [];
            }
            const filteredPatches: Patch[] = [];
            currentChangeset.patches.forEach((p) => {
              if (patchesPaths.includes(p.path.join('.'))) {
                currentChangeset.patchesRevertedForMerge?.push(p);
              } else {
                filteredPatches.push(p);
              }
            });
            const inversePatchesPaths = conflictInversePatches.map((p) => p.path.join('.'));
            if (!currentChangeset.inversePatchesRevertedForMerge) {
              currentChangeset.inversePatchesRevertedForMerge = [];
            }
            const filteredInversePatches: Patch[] = [];
            currentChangeset.inversePatches.forEach((p) => {
              if (inversePatchesPaths.includes(p.path.join('.'))) {
                currentChangeset.inversePatchesRevertedForMerge?.push(p);
              } else {
                filteredInversePatches.push(p);
              }
            });
            currentChangeset.patches = filteredPatches;
            currentChangeset.inversePatches = filteredInversePatches;
            this._current.set(currentChangeset);
          }
        }
      }
    } else {
      changeset.applied = true;
    }
    return mapState;
  }

  public applyIncommingChangesets() {
    if (this.incommingCount() > 0) {
      try {
        this._state.applyChangesets(this.incommingChangesets());
      } finally {
        this.incommingChangesets.update((incomming) => incomming.filter((c) => !c.applied));
      }
    }
  }

  public unapplyChangeset(mapState: ZsMapState, changeset: IZsChangeset) {
    //verify changeset is applied
    if (mapState.changesetIds?.includes(changeset.id)) {
      //only unapply if latest change for all effected elements
      const error = verifyChangesetCanUnapply(mapState, changeset);
      if (error) {
        throw new ChangesetInconsistentError(changeset.id);
      }
      mapState = applyPatches(mapState, changeset.inversePatches);

      //update changesetIds on mapstate and drawElements
      mapState = updateChangesetIdsAfterUnapply(mapState, changeset);
      changeset.applied = false;
      //also if unapplied verify it's part of changeset list
      const operation = this._session.getOperation();
      if (operation) {
        if (!operation.changesets) {
          operation.changesets = {};
        }
        operation.changesets[changeset.id] = changeset;
      }
    } else {
      changeset.applied = false;
    }
    return mapState;
  }

  public async unapplyOutgoingChangesets() {
    const operationId = this._operationId();
    if (operationId && this.outgoingCount() > 0) {
      const changesets = await this._getOutgoingChangesets(operationId).sortBy('endAt');
      try {
        this._state.unapplyChangesets(changesets);
      } finally {
        for (const changeset of changesets) {
          if (!changeset.applied) {
            await db.changesetOutgoingQueue.put(changeset);
          }
        }
      }
    }
  }

  public async applyOutgoingChangesets() {
    const operationId = this._operationId();
    if (operationId && this.outgoingCount() > 0) {
      const changesets = await this._getOutgoingChangesets(operationId).sortBy('endAt');
      try {
        this._state.applyChangesets(changesets);
      } finally {
        for (const changeset of changesets) {
          if (changeset.applied) {
            await db.changesetOutgoingQueue.put(changeset);
          }
        }
      }
    }
  }

  public stashChangeset(
    mapState: ZsMapState,
    changeset: IZsChangesetInternal | null,
    stash = true,
    catchErrors = false,
  ) {
    let useCurrent = false;
    if (!changeset) {
      changeset = this._current();
      useCurrent = true;
    }
    if (changeset === null) return mapState;
    if (changeset.stashed === stash) return mapState;
    let patches: Patch[];
    if (stash) {
      if (mapState.changesetIds?.[mapState.changesetIds?.length - 1] !== changeset.parentChangesetId) {
        throw new Error('cannot stash changeset if mapState is not on corresponding parentChangesetId');
      }
      patches = changeset.inversePatches;
    } else {
      patches = changeset.patches;
    }
    if (catchErrors) {
      for (const patch of patches) {
        try {
          mapState = applyPatches(mapState, [patch]);
        } catch (ignoreMe) {}
      }
    } else {
      mapState = applyPatches(mapState, patches);
    }
    if (useCurrent) {
      this.upateCurrent({ stashed: stash });
    } else {
      changeset.stashed = stash;
    }
    return mapState;
  }

  //remove it from mapState for internal handling without UI update
  public stashCurrentChangesetTemporary(mapState: ZsMapState) {
    const changeset = this._current();
    if (changeset && !changeset.stashed) {
      mapState = this.stashChangeset(mapState, changeset);
      changeset.stashed = true;
    }
    return mapState;
  }

  protected _setErrorChangeset(errorChangeset: IZsChangeset | null, inconsistent: boolean) {
    const oldConflictDetails = this.oldConflictDetails();
    this.conflictDetails.set(null);
    this.inconsistent.set(inconsistent);
    this.errorChangeset.set(errorChangeset);
    const count = this.outgoingCount();
    if (count === 0) {
      this.merging.set(null);
    }
    if (!inconsistent || !errorChangeset) {
      return;
    }
    const conflictDetails = this._state.getErrorChangesetConflicts();

    const oldMerging = this.merging();
    if (oldMerging && count <= oldMerging.count) {
      const current = oldMerging.count - count + 1;
      this.merging.set({ current, count: oldMerging.count });
    } else {
      this.merging.set({ current: 1, count });
    }

    if (conflictDetails) {
      const changesetConfig = this.changesetConfig();
      const automerge = changesetConfig.automerge && (!conflictDetails.hasConflicts || changesetConfig.conflictTakeOur);
      if (automerge && oldConflictDetails?.changeset.id !== conflictDetails.changeset.id) {
        console.info(`try automerge and (re-)submit changeset ${conflictDetails.changeset.id} asynchronous`);
        this.replaceErrorChangesetByMerge(conflictDetails, changesetConfig.conflictTakeOur);
      } else {
        this.conflictDetails.set(conflictDetails);
      }
      this.oldConflictDetails.set(conflictDetails);
    }
  }

  //update thereDrawElements/origDrawElements in changeset and return totalAdditionalChangesets
  protected _saveThereElements(mapState: ZsMapState, changeset: IZsChangesetInternal) {
    const allChangesets = this._session.getOperation()?.changesets;
    if (!allChangesets) {
      throw new ChangesetMissingError('<any>');
    }
    //loop over all changedElements to get other changesetId applied to them
    const totalAdditionalChangesets = new Set<string>();
    for (const [elemId, changeId] of Object.entries(changeset.drawElementsLastChangeset)) {
      const changesetIds = mapState.drawElementChangesetIds[elemId];
      if (changesetIds && changesetIds[changesetIds.length - 1] !== changeId) {
        if (changesetIds.includes(changeId)) {
          const additionalChangesets = changesetIds.slice(changesetIds.indexOf(changeId) + 1);
          additionalChangesets.forEach((changeId) => {
            totalAdditionalChangesets.add(changeId);
          });
        } else {
          console.warn(`saveThereElements, not found prev changeset(${changeId}) for elem ${elemId}`);
        }
      }
    }
    changeset.mergeConflictChangesetIds = Array.from(totalAdditionalChangesets);

    //get all elementId changed in these changesets
    const totalThereChangedElements = new Set<string>();
    totalAdditionalChangesets.forEach((changeId) => {
      const additionalChangeset = allChangesets[changeId];

      if (!additionalChangeset) {
        throw new ChangesetMissingError(changeId);
      }

      additionalChangeset.changedDrawElements.forEach((elemId) => {
        totalThereChangedElements.add(elemId);
      });
    });

    //extract current(=there) and orig element for all of them
    changeset.thereDrawElements = {};
    if (!changeset.origDrawElements) {
      changeset.origDrawElements = {};
    }
    totalThereChangedElements.forEach((elemId) => {
      const thereElement = mapState.drawElements[elemId];
      if (thereElement) {
        changeset.thereDrawElements![elemId] = _.cloneDeep(thereElement);
      }
      const origElement = changeset.baseMapState?.drawElements[elemId];
      if (origElement && !changeset.origDrawElements![elemId]) {
        changeset.origDrawElements![elemId] = _.cloneDeep(origElement);
      }
    });
    //for all our element changed also add thereElement cloned from orig if no own change
    changeset.changedDrawElements.forEach((elemId) => {
      const origElement = changeset.baseMapState?.drawElements[elemId];
      if (origElement && !changeset.thereDrawElements![elemId]) {
        changeset.thereDrawElements![elemId] = _.cloneDeep(origElement);
      }
    });
    return { totalAdditionalChangesets, totalThereChangedElements };
  }

  protected _getChangedValuesForElem(patches: Patch[], elemId: string) {
    const changes: Record<string, any> = {};
    const updateValue = (changes: Record<string, any>, op: string, path: string, value: any) => {
      if (op === 'remove') {
        Object.keys(changes)
          .filter((k) => k.startsWith(path))
          .forEach((k) => delete changes[k]);
        changes[path] = null;
      } else if (
        typeof value === 'object' &&
        !path.endsWith('coordinates') &&
        !path.endsWith('reportNumber') &&
        !path.endsWith('resourceItems')
      ) {
        Object.entries(value).forEach(([key, val]) => {
          updateValue(changes, op, path ? `${path}.${key}` : key, val);
        });
      } else {
        changes[path] = value;
      }
    };
    patches
      .filter((p) => p.path[0] === DRAW_ELEMENTS && p.path[1] === elemId)
      .forEach((patch) => {
        const path = patch.path.slice(2).join('.');
        updateValue(changes, patch.op, path, patch.value);
      });
    return changes;
  }

  protected _getOrigValues(element: ZsMapDrawElementState | ZsMapState, paths: Set<string>) {
    const changes: Record<string, any> = {};
    const getValue = (valueElement: ZsMapDrawElementState | ZsMapState, path: string[]) => {
      const key = path[0];
      const remainingPath = path.slice(1);
      if (remainingPath.length === 0) {
        if (key in valueElement) {
          return valueElement[key];
        } else {
          throw 'notDefined';
        }
      }
      return getValue(valueElement[key], remainingPath);
    };
    paths.forEach((path) => {
      try {
        changes[path] = getValue(element, path.split('.'));
      } catch (ignoreMe) {}
    });
    return changes;
  }

  protected _mergeConflictValues(
    origValues: Record<string, any>,
    ourValues: Record<string, any>,
    thereValues: Record<string, any>,
  ) {
    //combine value lists
    const merged: IZsChangesetConflictValue[] = Object.entries(origValues).map(([path, value]) => {
      const orig = value;
      const hasThere = path in thereValues;
      const hasOur = path in ourValues;
      const there = hasThere ? thereValues[path] : NO_CONFLICT_VALUE;
      const our = hasOur ? ourValues[path] : NO_CONFLICT_VALUE;

      //in our and there only values are returned (by _getChangedValuesForElem) if they differs form orig

      let selected: number;
      let conflict = false;
      if (!hasOur && hasThere) {
        selected = THERE_INDEX;
      } else if (hasOur && !hasThere) {
        selected = OUR_INDEX;
      } else if (!hasOur && !hasThere) {
        //should never happen, as if there are no change it's not part of valuePaths read from orig element
        selected = ORIG_INDEX;
      } else if (our === orig && there !== orig) {
        //should never happen, as 'our' would not be set in _getChangedValuesForElem
        selected = THERE_INDEX;
      } else if (our !== orig && there === orig) {
        //should never happen, as 'there' would not be set in _getChangedValuesForElem
        selected = OUR_INDEX;
      } else if (our === there) {
        selected = OUR_INDEX;
      } else {
        selected = CONFLICT_INDEX;
        conflict = true;
      }

      return { path, orig, there, our, conflict, selected, resolved: false } as IZsChangesetConflictValue;
    });
    Object.entries(ourValues).forEach(([path, value]) => {
      if (!(path in origValues)) {
        const orig = NO_CONFLICT_VALUE;
        const hasThere = path in thereValues;
        const there = hasThere ? thereValues[path] : NO_CONFLICT_VALUE;
        const our = value;
        const conflict = hasThere && there !== our;
        const selected = conflict ? CONFLICT_INDEX : OUR_INDEX;
        merged.push({ path, orig, there, our, conflict, selected, resolved: false });
      }
    });
    Object.entries(thereValues).forEach(([path, value]) => {
      if (!(path in origValues) && !(path in ourValues)) {
        merged.push({
          path,
          orig: NO_CONFLICT_VALUE,
          there: value,
          our: NO_CONFLICT_VALUE,
          conflict: false,
          selected: THERE_INDEX,
          resolved: false,
        });
      }
    });
    merged.sort((a, b) => a.path.localeCompare(b.path));
    return merged;
  }

  protected _getChangedMetaValues(patches: Patch[]) {
    const changes: Record<string, any> = {};
    const updateValue = (changes: Record<string, any>, op: string, path: string, value: any) => {
      if (op === 'remove') {
        Object.keys(changes)
          .filter((k) => k.startsWith(path))
          .forEach((k) => delete changes[k]);
        changes[path] = null;
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) => {
          updateValue(changes, op, `${path}.${key}`, val);
        });
      } else {
        changes[path] = value;
      }
    };
    patches
      .filter((p) => p.path[0] !== DRAW_ELEMENTS)
      .forEach((patch) => {
        const path = patch.path.join('.');
        updateValue(changes, patch.op, path, patch.value);
      });
    return changes;
  }

  public getErrorChangesetConflicts(mapState: ZsMapState): IZsChangesetConflictDetails | null {
    const changeset = this.errorChangeset();
    if (!changeset) return null;
    const allChangesets = this._session.getOperation()?.changesets;
    if (!allChangesets) {
      throw new ChangesetMissingError('<any>');
    }

    if (!changeset.stashed && changeset.applied === true) {
      throw new Error('changeset need to be stashed for logik to work.');
    }

    //update there/orig/merged elements for merge view and mapState for delta patch creation
    const { totalAdditionalChangesets, totalThereChangedElements: totalChangedElements } = this._saveThereElements(
      mapState,
      changeset,
    );
    const mergedMapState = this.stashChangeset(mapState, changeset, false, true);
    changeset.changedDrawElements.forEach((elemId) => {
      totalChangedElements.add(elemId);
    });
    changeset.mergedDrawElements = this.cloneElements(mergedMapState, Array.from(totalChangedElements));
    changeset.currentMapState = mapState;
    this.errorChangeset.set(changeset);

    //get meta changes
    const ourMetaValues = this._getChangedMetaValues(changeset.patches);
    const thereMetaPatches = Array.from(totalAdditionalChangesets).reduce<Patch[]>((acc, changesetId) => {
      const thereChangesset = allChangesets[changesetId];
      if (thereChangesset) {
        acc.push(...thereChangesset.patches);
      } else {
        throw new ChangesetMissingError(changesetId);
      }
      return acc;
    }, []);
    const thereMetaValues = this._getChangedMetaValues(thereMetaPatches);
    let origMetaValues: Record<string, any>;
    if (changeset.baseMapState) {
      const metaValuePaths = new Set<string>();
      Object.keys(ourMetaValues).forEach((path) => {
        metaValuePaths.add(path);
      });
      Object.keys(thereMetaValues).forEach((path) => {
        metaValuePaths.add(path);
      });

      origMetaValues = this._getOrigValues(changeset.baseMapState, metaValuePaths);
    } else {
      origMetaValues = {};
    }
    const meta = this._mergeConflictValues(origMetaValues, ourMetaValues, thereMetaValues);
    const metaConflict = meta.some((v) => v.conflict);

    //add all elements to conflicts that have any changes in our.
    //changes only in there are ignored here(as already applied to changeset.currentMapState), in opposit to "elements on corresponding state" where all changed elements are shown.
    //to add there only changes also, need to loop over totalChangedElements
    const conflicts: IZsChangesetConflict[] = [];
    for (let [elemId, changeId] of Object.entries(changeset.drawElementsLastChangeset)) {
      const ourValues = this._getChangedValuesForElem(changeset.patches, elemId);
      const ourMissing = ourValues[''] === null;
      delete ourValues[''];
      let changesetIds: string[] | undefined = mapState.drawElementChangesetIds[elemId];
      const origElem = changeset.origDrawElements?.[elemId];
      let origValues: Record<string, any>;
      let thereValues: Record<string, any>;
      let thereMissing: boolean;
      let additionalChangesets: string[];
      if (changesetIds && !changesetIds?.includes(changeId)) {
        //this block handle the case if any outgoing change was empty after merge and therefore removed from changeset stack
        console.info(
          `on get conflict changes the drawElementsLastChangeset ${changeId} for element ${elemId} did not exist, try to use last from baseMapState`,
        );
        const baseDrawElementChangesetIds = changeset.baseMapState?.drawElementChangesetIds[elemId];
        if (baseDrawElementChangesetIds) {
          const lastBaseDrawElementChangesetId = baseDrawElementChangesetIds[baseDrawElementChangesetIds?.length - 1];
          if (changesetIds?.includes(lastBaseDrawElementChangesetId)) {
            changeId = lastBaseDrawElementChangesetId;
          } else {
            changesetIds = undefined;
          }
        } else {
          changesetIds = undefined;
        }
      }
      if (!changesetIds) {
        Object.entries(ourValues).forEach(([key, val]) => {
          if (val === null) {
            delete ourValues[key];
          }
        });
        if (Object.keys(ourValues).length === 0) {
          continue;
        }
        additionalChangesets = [];
        thereValues = {};
        thereMissing = true;
        const valuePaths = new Set<string>();
        Object.keys(ourValues).forEach((path) => {
          valuePaths.add(path);
        });
        if (origElem) {
          origValues = this._getOrigValues(origElem, valuePaths);
        } else {
          origValues = this._getChangedValuesForElem(changeset.inversePatches, elemId);
        }
      } else {
        if (changesetIds?.[changesetIds.length - 1] !== changeId) {
          additionalChangesets = changesetIds.slice(changesetIds.indexOf(changeId) + 1);
          const therePatches = additionalChangesets.reduce<Patch[]>((acc, changesetId) => {
            const thereChangesset = allChangesets[changesetId];
            if (thereChangesset) {
              acc.push(...thereChangesset.patches);
            } else {
              throw new ChangesetMissingError(changesetId);
            }
            return acc;
          }, []);
          thereValues = this._getChangedValuesForElem(therePatches, elemId);
        } else {
          //if there is no conflict / other change: still add infos of changes to conflict array -> to handle all changes in replaceErrorChangesetByMerge
          additionalChangesets = [];
          thereValues = {};
        }
        thereMissing = thereValues[''] === null;
        delete thereValues[''];

        const valuePaths = new Set<string>();
        Object.keys(ourValues).forEach((path) => {
          valuePaths.add(path);
        });
        Object.keys(thereValues).forEach((path) => {
          valuePaths.add(path);
        });
        if (origElem) {
          origValues = this._getOrigValues(origElem, valuePaths);
        } else {
          const thereInversePatches = [...additionalChangesets].reverse().reduce<Patch[]>((acc, changesetId) => {
            const thereChangesset = allChangesets[changesetId];
            if (thereChangesset) {
              acc.push(...thereChangesset.inversePatches);
            } else {
              throw new ChangesetMissingError(changesetId);
            }
            return acc;
          }, []);
          origValues = this._getChangedValuesForElem([...thereInversePatches, ...changeset.inversePatches], elemId);
        }
      }
      const origMissing = origValues[''] === null;
      delete origValues[''];
      const missing = { orig: origMissing, there: thereMissing, our: ourMissing };
      const values = this._mergeConflictValues(origValues, ourValues, thereValues);

      const imageSrc = Signs.getSignById(origElem?.symbolId)?.src;
      conflicts.push({
        drawElementId: elemId,
        elementName: origElem?.name,
        symbolImageUrl: imageSrc ? DrawStyle.getImageUrl(imageSrc) : undefined,
        missing,
        requiredPrefChangesetId: changeId,
        additionalChangesets,
        values,
        conflict: values.some((v) => v.conflict),
      });
    }
    const hasConflicts = metaConflict || conflicts.some((c) => c.conflict);
    return { changeset, conflicts, meta, metaConflict, hasConflicts };
  }

  public getChanges(changeset: IZsChangeset, mapState: ZsMapState) {
    const changes: IZsChangeInfos[] = [];
    for (const elemId of changeset.changedDrawElements) {
      let origName = 'before';
      const ourValues = this._getChangedValuesForElem(changeset.patches, elemId);
      delete ourValues[''];
      let origValues: Record<string, any>;
      const origElem = mapState.drawElements?.[elemId];
      let symbolId: number | undefined;
      let name: string | undefined;
      if (origElem) {
        symbolId = origElem.symbolId;
        name = origElem.name;
        const valuePaths = new Set<string>();
        Object.keys(ourValues).forEach((path) => {
          valuePaths.add(path);
        });
        origValues = this._getOrigValues(origElem, valuePaths);
      } else {
        symbolId = ourValues['symbolId'];
        name = ourValues['name'];
        const changesetIds = mapState.drawElementChangesetIds[elemId];
        if (!changesetIds) {
          Object.entries(ourValues).forEach(([key, val]) => {
            if (val === null) {
              delete ourValues[key];
            }
          });
        }
        if (Object.keys(ourValues).length > 0) {
          origValues = this._getChangedValuesForElem(changeset.inversePatches, elemId);
          delete origValues[''];
          if (Object.keys(origValues).length === 0 && ourValues['symbolId']) {
            //for add/create compare with default values
            let sign: any = Signs.getSignById(ourValues['symbolId']);
            if (sign) {
              origName = 'default';
              sign = {
                ...sign,
                type: ZsMapDrawElementStateType.SYMBOL,
                symbolId: sign.id,
                coordinates: NO_CONFLICT_VALUE,
              };
              delete sign['id'];
              defineDefaultValuesForSignature(sign);

              const valuePaths = new Set<string>();
              Object.keys(ourValues).forEach((path) => {
                valuePaths.add(path);
              });
              origValues = this._getOrigValues(sign as ZsMapDrawElementState, valuePaths);
            }
          }
        } else {
          continue;
        }
      }

      //combine value lists
      const values: IZsChangeValues[] = Object.entries(origValues)
        .map(([path, value]) => {
          const orig = value;
          const our = path in ourValues ? ourValues[path] : NO_CONFLICT_VALUE;
          if (orig === our) return null;
          return { path, orig, our };
        })
        .filter((v) => v != null);
      Object.entries(ourValues).map(([path, value]) => {
        if (!(path in origValues)) {
          const orig = NO_CONFLICT_VALUE;
          const our = value;
          values.push({ path, orig, our });
        }
      });

      const imageSrc = Signs.getSignById(symbolId)?.src;
      changes.push({
        elementName: name,
        drawElementId: elemId,
        symbolImageUrl: imageSrc ? DrawStyle.getImageUrl(imageSrc) : undefined,
        values,
        origName,
      });
    }
    return changes;
  }

  public showChangesetJSON(changeset: IZsChangeset) {
    InfoDialogComponent.showJSONDialog(this._dialog, this._domSanitizer, this._i18n.get('changeset'), changeset);
  }

  public openChangesetMergeView() {
    this._state.setChangesetMergeMode();
    this._addAllConflictElements();
    this._sidebar.open(SidebarContext.Changeset);
  }

  protected _addAllConflictElements() {
    const changeset = this.errorChangeset();
    if (!changeset) return;
    const activeLayer = this._state.getActiveLayer()?.getId();
    const hideLayer = 'conflict-4-';

    const addElements = (
      mapState: ZsMapState,
      variationIndex: number,
      drawElements?: Record<string, ZsMapDrawElementState | null>,
      layerOverride?: string,
    ) => {
      if (!drawElements) return;
      const layer = layerOverride || `conflict-${variationIndex}`;
      Object.values(drawElements).forEach((element) => {
        if (element?.id) {
          //hide real elements
          if (
            mapState.drawElements[element.id] &&
            mapState.drawElements[element.id].layer &&
            !mapState.drawElements[element.id].layer?.startsWith(hideLayer)
          ) {
            mapState.drawElements[element.id].layer = hideLayer + mapState.drawElements[element.id].layer;
          }
          //create adjusted clone
          const id = `conflict-${variationIndex}-${element.id}`;
          element = { ...element, id: id, protected: true, layer: layer };
          mapState.drawElements[id] = element;
        }
      });
    };

    this._state.updateMapState((draft) => {
      addElements(draft, 0, changeset.origDrawElements);
      addElements(draft, 1, changeset.thereDrawElements);
      addElements(draft, 2, changeset.ourDrawElements);
      addElements(draft, 3, changeset.mergedDrawElements, activeLayer);

      //add also elements changed in there but not our as our preview
      if (changeset.origDrawElements && changeset.ourDrawElements && changeset.deletedDrawElements) {
        const missingOurElements = Object.values(changeset.origDrawElements).filter(
          (elem) => elem?.id && !(elem.id in changeset.ourDrawElements!) && !(elem.id in changeset.deletedDrawElements),
        );
        const missingOur = missingOurElements.reduce(
          (acc, elem) => {
            if (elem?.id) {
              acc[elem.id] = elem;
            }

            return acc;
          },
          {} as Record<string, ZsMapDrawElementState>,
        );
        addElements(draft, 2, missingOur);
      }
    }, true);
  }

  protected _removeAllConflictElements() {
    this._state.updateMapState((draft) => {
      const normalElementIds = new Set<string>();
      Object.keys(draft.drawElements)
        .filter((elemId) => elemId.startsWith('conflict-'))
        .forEach((elemId) => {
          normalElementIds.add(elemId.substring(11));
          delete draft.drawElements[elemId];
        });

      const hideLayer = 'conflict-4-';
      normalElementIds.forEach((elemId) => {
        if (draft.drawElements[elemId]?.layer?.startsWith(hideLayer)) {
          draft.drawElements[elemId].layer = draft.drawElements[elemId].layer.substring(11);
        }
      });
    }, true);
  }

  protected _isArrayKey(key: string): boolean {
    return !isNaN(key as any) && key.trim() !== '';
  }

  public updateConflictValue(
    elementDraft: ZsMapDrawElementState | ZsMapState,
    path: string[],
    value: IZsChangesetConflictValue,
    index: number,
  ) {
    const key = path[0];
    const remainingPath = path.slice(1);
    if (remainingPath.length === 0) {
      elementDraft[key] = value[CONFLICT_INDEX_NAME[index]];
      return;
    }

    if (!elementDraft[key]) {
      const nextKey = remainingPath[0];
      elementDraft[key] = this._isArrayKey(nextKey) ? [] : {};
    }

    this.updateConflictValue(elementDraft[key], remainingPath, value, index);
  }

  public removeConflictValue(elementDraft: ZsMapDrawElementState | ZsMapState, path: string[]) {
    const key = path[0];
    const remainingPath = path.slice(1);
    if (remainingPath.length === 0) {
      delete elementDraft[key];
      return;
    }

    if (!elementDraft[key]) {
      return;
    }

    this.removeConflictValue(elementDraft[key], remainingPath);
  }

  protected _getElementFromCachedElements(changeset: IZsChangesetInternal, elemId: string, index: number) {
    switch (index) {
      case 0: {
        if (changeset.origDrawElements?.[elemId]) {
          return _.cloneDeep(changeset.origDrawElements?.[elemId]);
        }
        break;
      }
      case 1: {
        if (changeset.thereDrawElements?.[elemId]) {
          return _.cloneDeep(changeset.thereDrawElements?.[elemId]);
        }
        break;
      }
      case 2: {
        if (changeset.ourDrawElements?.[elemId]) {
          return _.cloneDeep(changeset.ourDrawElements?.[elemId]);
        }
        break;
      }
      case 3: {
        if (changeset.mergedDrawElements?.[elemId]) {
          return _.cloneDeep(changeset.mergedDrawElements?.[elemId]);
        }
        break;
      }
    }
    return null;
  }

  public async replaceErrorChangesetByMerge(conflictDetails: IZsChangesetConflictDetails, conflictTakeOur: boolean) {
    const changeset = this.errorChangeset();
    if (!conflictDetails || !changeset || !changeset.currentMapState) return;
    const incommingAppliedMapState = changeset.currentMapState;

    //remember old values
    const oldPatches = [...changeset.patches];
    const oldInversePatches = [...changeset.inversePatches];
    if (!changeset.parentChangesetIdBeforeMerge) {
      changeset.parentChangesetIdBeforeMerge = changeset.parentChangesetId;
    }
    if (!changeset.drawElementsLastChangesetBeforeMerge) {
      changeset.drawElementsLastChangesetBeforeMerge = { ...changeset.drawElementsLastChangeset };
    }

    //replace changeset patches with merged changes
    produce<ZsMapState>(
      incommingAppliedMapState,
      (draft) => {
        //apply meta changes
        for (const value of conflictDetails.meta) {
          let selected = value.selected;
          if (selected === CONFLICT_INDEX) {
            selected = conflictTakeOur ? OUR_INDEX : THERE_INDEX;
          }
          if (value.resolved || selected !== THERE_INDEX) {
            if (
              value[CONFLICT_INDEX_NAME[selected]] !== NO_CONFLICT_VALUE &&
              value[CONFLICT_INDEX_NAME[selected]] !== null
            ) {
              this.updateConflictValue(draft, value.path.split('.'), value, selected);
            } else {
              this.removeConflictValue(draft, value.path.split('.'));
            }
          }
        }
        //apply element changes
        for (const conflict of conflictDetails.conflicts) {
          if (conflict.values.length === 0) continue;
          const elemId = conflict.drawElementId;
          let element = draft.drawElements[elemId];
          if (!element) {
            //restore if want to keep but was deleted
            let selected = conflict.values[0].selected;
            if (selected === CONFLICT_INDEX) {
              selected = conflictTakeOur ? OUR_INDEX : THERE_INDEX;
            }
            const clonedElement = this._getElementFromCachedElements(changeset, elemId, selected);
            if (!clonedElement) {
              if (!this.changesetConfig().hiddenMode) {
                throw new Error(`unable to restore deleted element: ${elemId}`);
              } else {
                console.warn(
                  `element ${elemId} is deleted (remotely) and cannot be restored in hiddenMode, therefore changes on it are reverted.`,
                );
                continue;
              }
            }
            element = clonedElement;
            draft.drawElements[elemId] = element;
          }

          for (const value of conflict.values) {
            let selected = value.selected;
            if (selected === CONFLICT_INDEX) {
              selected = conflictTakeOur ? OUR_INDEX : THERE_INDEX;
            }
            if (value.resolved || selected !== THERE_INDEX) {
              if (
                value[CONFLICT_INDEX_NAME[selected]] !== NO_CONFLICT_VALUE &&
                value[CONFLICT_INDEX_NAME[selected]] !== null
              ) {
                this.updateConflictValue(element, value.path.split('.'), value, selected);
              } else {
                this.removeConflictValue(element, value.path.split('.'));
              }
            }
          }
        }
      },
      (patches, inversePatches) => {
        changeset.patches = patches;
        changeset.inversePatches = inversePatches;
      },
    );

    //make sure no invalid patches are submitted
    const patches = changeset.patches.filter((p) => isValidImmerPatch(p));
    if (patches.length !== changeset.patches.length) {
      console.warn(
        `merge of ${changeset.id} generated invalid patches, they are removed:`,
        changeset.patches.filter((p) => !isValidImmerPatch(p)),
      );
    }
    changeset.patches = patches;
    changeset.inversePatches = changeset.inversePatches.filter((p) => isValidImmerPatch(p));

    //cancel changeset if empty
    if (changeset.patches.length === 0) {
      await this.updateOutgoing(changeset, true);
      this._setErrorChangeset(null, false);
      const current = this._current();
      if (current?.id === changeset.id) {
        this._current.set(null);
      }
      return;
    }

    //recreate changeset meta informations
    updateChangesetIdsFromPatches(changeset, incommingAppliedMapState);

    //extract changes not longer contained
    const patchesHash = changeset.patches.map((patch) => Md5.hashStr(JSON.stringify(patch)));
    const inversePatchesHash = changeset.inversePatches.map((patch) => Md5.hashStr(patch.op + patch.path.join('.')));
    changeset.patchesRevertedForMerge = [
      ...(changeset.patchesRevertedForMerge ?? []),
      ...oldPatches.filter((patch) => !patchesHash.includes(Md5.hashStr(JSON.stringify(patch)))),
    ];
    changeset.inversePatchesRevertedForMerge = [
      ...oldInversePatches.filter(
        (patch) => !inversePatchesHash.includes(Md5.hashStr(patch.op + patch.path.join('.'))),
      ),
      ...(changeset.inversePatchesRevertedForMerge ?? []),
    ];

    changeset.mergedAt = new Date().getTime();
    this.updateOutgoing(changeset);

    this._removeAllConflictElements();

    this.inconsistent.set(false);
    this._setErrorChangeset(null, false);
    this._state.setChangesetMergeMode(false);

    await this.submitOutgoing();

    //start handleUnhandledPatches here but not await, to prevent potential deadlock
    this._state.handleUnhandledPatches();
  }
}
