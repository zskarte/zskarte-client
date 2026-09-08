import { OperationCache } from '../definitions';
import { operationCaches } from './operation';
import { broadcastResources } from './socketio';

const broadcastResourcesUpdate = (identifier: string, operationId: string, data: any) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache) return;

  broadcastResources(operationCache, identifier, data);
};

export { broadcastResourcesUpdate };
