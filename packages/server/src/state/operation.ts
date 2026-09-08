import { applyPatches, enablePatches } from 'immer';
import { Core } from '@strapi/types';
import _ from 'lodash';
import type { Context } from 'koa';
import { IZsChangeset } from '@zskarte/types';
import { updateChangesetIdsAfterApply, verifyChangesetConsistency } from '@zskarte/common';

import {
  Operation,
  OperationCache,
  OperationPhases,
  StrapiLifecycleHook,
  StrapiLifecycleHooks,
  User,
} from '../definitions';
import { broadcastChangeset, broadcastConnections } from './socketio';
import { QueueMutex, QueueTask } from '../utils/queue-mutex';
import { getOrCreateSigningKeyPair, getServerId, signData, SigningKeyConfig } from '../utils/signing';

const WEEK = 1000 * 60 * 60 * 24 * 7;
const MIN = 1000 * 60;

const MAX_WAIT_MS = 15_000;

enablePatches();

let signingKeyConfig: SigningKeyConfig | undefined;

const initializeSigning = async (strapi: Core.Strapi) => {
  let passphrase: Buffer;
  if (process.env.SIGN_PRIVATE_KEY_PASSPHRASE) {
    passphrase = Buffer.from(process.env.SIGN_PRIVATE_KEY_PASSPHRASE, 'base64');
    if (passphrase.length < 32) {
      throw new Error(
        `SIGN_PRIVATE_KEY_PASSPHRASE: Invalid key length: ${passphrase.length}, expected >= 32 (after base64 decode)`,
      );
    }
  }
  const serverId = await getServerId();
  signingKeyConfig = await getOrCreateSigningKeyPair(serverId, passphrase, strapi);
  strapi.log.info(
    `signing serverId: ${serverId}, keyId: ${signingKeyConfig.keyId}, keyType: ${signingKeyConfig.keyType}`,
  );
};

const signChangeset = (changeset: IZsChangeset) => {
  changeset.serverId = signingKeyConfig.serverId;
  changeset.signKeyId = signingKeyConfig.keyId;
  return signData(changeset, signingKeyConfig.privateKeyObject, signingKeyConfig.keyType);
};

const operationCaches: { [key: string]: OperationCache } = {};

/** Loads all active operations initially and generates the in-memory cache */
const loadOperations = async (strapi: Core.Strapi) => {
  try {
    const activeOperations = (await strapi.documents('api::operation.operation').findMany({
      filters: { phase: OperationPhases.ACTIVE },
      populate: ['organization'],
      limit: -1,
    })) as Operation[];
    for (const operation of activeOperations) {
      await lifecycleOperation(StrapiLifecycleHooks.AFTER_CREATE, operation);
    }
  } catch (error) {
    strapi.log.error(error);
    strapi.log.info('Error while loading the active operations, shutdown the strapi server.');
    process.exit(1);
  }
};

const addToCache = (operation: Operation) => {
  const mapState = operation.mapState || ({} as any);
  const changesets = operation.changesets || ({} as any);
  const changesetSigns = operation.changesetSigns || ({} as any);
  const signingKeyIds: Set<string> = new Set(operation.signingKeyIds || ([] as any));

  const changesetEndpointMutex = new QueueMutex();
  operationCaches[operation.documentId] = {
    operation,
    connections: [],
    users: [],
    changesetEndpointMutex,
    mapState,
    changesets,
    changesetSigns,
    signingKeyIds,
    changed: false,
  };
  if (!operation.organization) return;
  operationCaches[operation.documentId].users.push(...(operation.organization.users || []));
};

/** The implementation of the Strapi Lifecylce hooks of the operation collection type */
const lifecycleOperation = async (lifecycleHook: StrapiLifecycleHook, operation: Operation) => {
  operation =
    ((await strapi.documents('api::operation.operation').findOne({
      documentId: operation.documentId,
      populate: ['organization.users'],
    })) as Operation) || operation;
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_CREATE) {
    addToCache(operation);
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_UPDATE) {
    if (operation.phase === OperationPhases.ARCHIVED) {
      const operationCache: OperationCache = operationCaches[operation.documentId];
      delete operationCaches[operation.documentId];
      if (!operationCache) return;
      if (operationCache.changesetEndpointMutex) {
        operationCache.changesetEndpointMutex.abortAll('operation is archived, changes no longer possible');
      }
      //persist last changes before archive
      await persistOperation(operation.documentId, operationCache);
      return;
    } else if (!(operation.documentId in operationCaches)) {
      //maybe an "unarchive" operation
      addToCache(operation);
    } else {
      operationCaches[operation.documentId].operation = operation;
    }
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_DELETE) {
    const operationCache: OperationCache = operationCaches[operation.documentId];
    delete operationCaches[operation.documentId];
    if (!operationCache) return;
    if (operationCache.changesetEndpointMutex) {
      operationCache.changesetEndpointMutex.abortAll('operation is deleted');
    }
  }
};

const changesetAlreadyExist = (operationCache: OperationCache, changeset: IZsChangeset) => {
  const savedChangeset = operationCache.changesets[changeset.id];
  if (savedChangeset) {
    let savedChangesetToCompare: Partial<IZsChangeset>,
      incommingChangesetToCompare: Partial<IZsChangeset>,
      _unused: any;
    ({
      applied: _unused,
      saved: _unused,
      serverSavedAt: _unused,
      authorIp: _unused,
      serverId: _unused,
      signKeyId: _unused,
      ...savedChangesetToCompare
    } = savedChangeset);
    ({
      applied: _unused,
      saved: _unused,
      serverSavedAt: _unused,
      authorIp: _unused,
      serverId: _unused,
      signKeyId: _unused,
      ...incommingChangesetToCompare
    } = changeset);

    if (_.isEqual(savedChangesetToCompare, incommingChangesetToCompare)) {
      return true;
    }

    throw new Error('re-submit changeset with other content');
  }
  return false;
};

const addChangeset = async (
  operationId: string,
  identifier: string,
  changeset: IZsChangeset,
  ctx: Context,
  onTimeout?: () => void,
) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache)
    return { error: { message: 'operation is not in operationCache, is it archived?' }, result: undefined };

  if (changesetAlreadyExist(operationCache, changeset)) {
    return { error: undefined, result: { success: true, alreadySubmitted: true } };
  }

  const task = operationCache.changesetEndpointMutex.enqueueWithTimeout(ctx, {
    maxWaitMs: MAX_WAIT_MS,
    fn: async (task: QueueTask) => {
      if (changesetAlreadyExist(operationCache, changeset)) {
        return { error: undefined, result: { success: true, alreadySubmitted: true } };
      }
      let mapState = operationCache.mapState;
      const error = verifyChangesetConsistency(mapState, changeset);
      if (error) {
        strapi.log.error(error.message);
        return { error, result: undefined };
      }
      const oldMapState = mapState;
      let revertedMapState: typeof mapState;
      try {
        mapState = applyPatches(mapState, changeset.patches);

        if (task.aborted || task.clientAborted) {
          return { error: { message: 'aborted' }, result: undefined };
        }

        //verify clean reverse possible
        revertedMapState = applyPatches(mapState, changeset.inversePatches);
      } catch (e) {
        // A patch whose path cannot be resolved (e.g. it targets a draw element this server
        // never received) is not a server fault: throwing here turned into a 500, which the
        // client treats as "retry later", so the very same broken changeset was resubmitted
        // forever. Report it as invalid instead - the client already has a path for that and
        // drops the changeset.
        const message = e instanceof Error ? e.message : String(e);
        strapi.log.error(`changeset ${changeset.id} cannot be applied: ${message}`);
        return { error: { message, isInvalid: true }, result: undefined };
      }
      if (!_.isEqual(oldMapState, revertedMapState)) {
        const elemId = changeset.patches[0].path[1];
        console.error(
          changeset.patches,
          changeset.inversePatches,
          'inverse invalid',
          oldMapState.drawElements[elemId],
          revertedMapState.drawElements[elemId],
        );

        return { error: { message: 'inverse patches do not reset cleanly', isInvalid: true }, result: undefined };
      }
      mapState = updateChangesetIdsAfterApply(mapState, changeset);
      changeset.applied = true;
      changeset.saved = true;
      changeset.serverSavedAt = new Date().getTime();
      changeset.authorIp = ctx.request.ips?.length > 0 ? ctx.request.ips.join(' ') : ctx.request.ip;
      const sign = signChangeset(changeset);

      if (operationCache.mapState !== oldMapState) {
        return { error: { message: 'concurrent modification error' }, result: undefined };
      }
      if (task.aborted || task.clientAborted) {
        return { error: { message: 'aborted' }, result: undefined };
      }
      operationCache.changesets[changeset.id] = changeset;
      operationCache.changesetSigns[changeset.id] = sign;
      operationCache.signingKeyIds.add(changeset.signKeyId);
      operationCache.mapState = mapState;
      operationCache.changed = true;
      broadcastChangeset(operationCache, identifier, changeset, sign);

      return {
        error: undefined,
        result: {
          success: true,
          data: {
            serverSavedAt: changeset.serverSavedAt,
            authorIp: changeset.authorIp,
            serverId: changeset.serverId,
            signKeyId: changeset.signKeyId,
            sign,
          },
        },
      };
    },
    onTimeout,
  });
  return await task.result;
};

/** Updates the current location of a connection */
const updateCurrentLocation = async (
  operationId: string,
  identifier: string,
  longLat: { long: number; lat: number },
) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache) return;
  for (const connection of operationCache.connections) {
    try {
      if (connection.identifier !== identifier) continue;
      connection.currentLocation = longLat;
      broadcastConnections(operationCache);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

const persistOperation = async (operationId: string, operationCache: OperationCache) => {
  await strapi.documents('api::operation.operation').update({
    documentId: operationId,
    data: {
      mapState: operationCache.mapState as any,
      changesets: operationCache.changesets as any,
      changesetSigns: operationCache.changesetSigns as any,
      signingKeyIds: [...operationCache.signingKeyIds],
    },
  });
};

/** Persist the map state to the database if something has changed */
const persistOperationCache = async (strapi: Core.Strapi) => {
  try {
    for (const [operationId, operationCache] of Object.entries(operationCaches)) {
      if (!operationCache.changed) continue;
      await persistOperation(operationId, operationCache);
      operationCache.changed = false;
      strapi.log.info(`MapState/changesets of operation ${operationId} Persisted`);
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const abortAllQueuedUpdates = async (strapi: Core.Strapi) => {
  try {
    for (const operationCache of Object.values(operationCaches)) {
      if (operationCache.changesetEndpointMutex) {
        operationCache.changesetEndpointMutex.abortAll('server shutdown');
      }
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

/** Archive operations who are active and are not updated since 7 days */
const archiveOperations = async (strapi: Core.Strapi) => {
  try {
    const activeOperations = (await strapi.documents('api::operation.operation').findMany({
      filters: { phase: OperationPhases.ACTIVE },
      limit: -1,
    })) as Operation[];
    for (const operation of activeOperations) {
      if (new Date(operation.updatedAt).getTime() + WEEK > new Date().getTime()) continue;
      await strapi.documents('api::operation.operation').update({
        documentId: operation.documentId,
        data: {
          phase: OperationPhases.ARCHIVED,
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const deleteGuestOperations = async (strapi: Core.Strapi) => {
  try {
    const guestUsers = (await strapi.documents('plugin::users-permissions.user').findMany({
      fields: ['documentId', 'username', 'email'],
      filters: { username: 'zso_guest' },
      populate: ['organization.operations'],
      limit: 1,
    })) as User[];
    const guestUser = _.first(guestUsers);
    if (!guestUser?.organization?.operations) return;
    const { operations } = guestUser.organization;
    for (const operation of operations) {
      strapi.log.info(`Deleting operation ${operation.name} of guest user`);
      await strapi.db
        .query('api::map-snapshot.map-snapshot')
        .deleteMany({ filters: { operation: { documentId: operation.documentId } } });
      await strapi.db
        .query('api::access.access')
        .deleteMany({ filters: { operation: { documentId: operation.documentId } } });
      await strapi.documents('api::operation.operation').delete({
        documentId: operation.documentId,
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const createMapStateSnapshots = async (strapi: Core.Strapi) => {
  try {
    const activeOperations = (await strapi.documents('api::operation.operation').findMany({
      filters: { phase: OperationPhases.ACTIVE },
      limit: -1,
    })) as Operation[];

    strapi.log.debug(`Found ${activeOperations.length} operations to create snapshots from`);

    for (const operation of activeOperations) {
      const fiveMins = MIN * 5;
      // If the operation has not been updated in the last 5mins don't create a snapshot
      if (new Date(operation.updatedAt).getTime() + fiveMins < new Date().getTime()) continue;

      strapi.log.debug(`Creating snapshot for operation [${operation.documentId}] ${operation.name}`);

      const lastSnapshot = await strapi.documents('api::map-snapshot.map-snapshot').findFirst({
        filters: { operation: { documentId: operation.documentId } },
        sort: { createdAt: 'desc' },
      });
      let changesetIds: string[] = operation.mapState['changesetIds'];
      if (lastSnapshot) {
        const lastChangesetIds: string[] = lastSnapshot.mapState['changesetIds'];
        if (lastChangesetIds) {
          changesetIds = changesetIds.filter((c) => !lastChangesetIds.includes(c));
        }
      }

      await strapi.documents('api::map-snapshot.map-snapshot').create({
        data: {
          operation,
          mapState: operation.mapState as any,
          changesetIds,
          publishedAt: Date.now(),
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

export {
  initializeSigning,
  signChangeset,
  operationCaches,
  loadOperations,
  lifecycleOperation,
  addChangeset,
  updateCurrentLocation,
  abortAllQueuedUpdates,
  persistOperationCache,
  archiveOperations,
  deleteGuestOperations,
  createMapStateSnapshots,
};
