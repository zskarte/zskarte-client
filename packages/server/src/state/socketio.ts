import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { operationCaches } from './operation';
import { OperationCache, User, WebsocketEvent } from '../definitions';
import { Server } from 'socket.io';
import { Core } from '@strapi/strapi';
import { serialize as superjsonSerialize } from '../middlewares/superjson';
import { IZsChangeset } from '@zskarte/types';

const sanitizeUser = (user) => {
  delete user.password;
  delete user.resetPasswordToken;
  delete user.confirmationToken;
  return user;
};

let socketIo: Server;

const connectSocketIo = (strapi: Core.Strapi) => {
  socketIo = new Server(strapi.server.httpServer, {
    transports: ['websocket'],
    cors: {
      origin: '*',
    },
  });
  socketIo.on('connection', (socket) => socketConnection({ strapi }, socket));
};

/** Handles new socket connections, checks the token and the needed query parameters. */
const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    strapi.log.info(`Socket Connecting: ${socket.id}`);
    const { token } = socket.handshake.auth;
    const operationId = socket.handshake.query.operationId as string;
    const identifier = socket.handshake.query.identifier as string;
    const label = socket.handshake.query.label as string;
    if (!operationId || !token || !identifier || !label) {
      strapi.log.warn(`Socket: ${socket.id} - Empty token, operationId, label or identifier in handshake`);
      socket.disconnect();
      return;
    }
    const { jwt, user: userService } = strapi.plugins['users-permissions'].services;
    const { id: userId, operationId: tokenOperationId }: { id: number; operationId: string } = await jwt.verify(token);
    // Check if the token operationId matches the query operationId
    if (tokenOperationId && operationId !== tokenOperationId) {
      strapi.log.warn(
        `Socket: ${socket.id} - OperationId: ${operationId} does not match provided access token OperationId: ${tokenOperationId}`,
      );
      socket.disconnect();
      return;
    }
    const user = (await userService.fetch(userId)) as User;
    const operationCache = operationCaches[operationId];
    // Check if the operationCache exists
    if (!operationCache) {
      strapi.log.warn(`Socket: ${socket.id} - No operationCache for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    // Check if the user is allowed to connect to the operation or if it is a token connection then pass the check
    if (!tokenOperationId && !_.find(operationCache.users, (u) => u.id === user.id)) {
      strapi.log.warn(`Socket: ${socket.id} - User: ${user.email} not allowed for operationId: ${operationId}`);
      strapi.log.info(`Allowed users for operationId: ${operationId}`);
      for (const user of operationCache.users) {
        strapi.log.info(`   ${user.username}`);
      }
      socket.disconnect();
      return;
    }
    const sanitizedUser = sanitizeUser(user);
    operationCache.connections.push({ user: sanitizedUser, socket, identifier, label });
    strapi.log.info(`Socket Connected: ${socket.id}, ${user.email}, OperationId: ${operationId}`);
    broadcastConnections(operationCache);
    socket.on('disconnect', () => socketDisconnect(operationCache, socket));
  } catch (error) {
    socket.disconnect();
    strapi.log.error(error);
  }
};

/** Removes disconnected socket connections from the connection stack. */
const socketDisconnect = async (operationCache: OperationCache, socket: Socket) => {
  operationCache.connections = _.filter(operationCache.connections, (c) => c.socket.id !== socket.id);
  strapi.log.info(`Socket Disconnected: ${socket.id}`);
  await broadcastConnections(operationCache);
};

/** Broadcasts the current connections to all currently connected sockets of an operation */
const broadcastConnections = (operationCache: OperationCache) => {
  const connections = operationCache.connections.map((c) => {
    return {
      user: c.user,
      identifier: c.identifier,
      label: c.label,
      currentLocation: c.currentLocation,
    };
  });
  for (const connection of operationCache.connections) {
    try {
      connection.socket.emit(WebsocketEvent.CONNECTIONS, connections);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Broadcast received changeset to all currently connected sockets of an operation */
const broadcastChangeset = (operationCache: OperationCache, identifier: string, changeset: IZsChangeset, sign: string) => {
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WebsocketEvent.STATE_CHANGESET, {changeset, sign});
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Broadcast received journal change to all currently connected sockets of an operation */
const broadcastJournal = (operationCache: OperationCache, identifier: string, data: any) => {
  data = superjsonSerialize(data);
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WebsocketEvent.STATE_JOURNAL, data);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Broadcast received resource catalogue change to all currently connected sockets of an operation */
const broadcastResources = (operationCache: OperationCache, identifier: string, data: any) => {
  data = superjsonSerialize(data);
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WebsocketEvent.STATE_RESOURCES, data);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

export { connectSocketIo, socketConnection, broadcastConnections, broadcastChangeset, broadcastJournal, broadcastResources };
