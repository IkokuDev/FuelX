import type { Server as SocketServer } from 'socket.io';
import type { ServerToClientEvents } from './events';
import { logger } from '../lib/logger';

let io: SocketServer | null = null;

/** Called once by realtime/socket.ts when the Socket.IO server is created. */
export function setSocketServer(server: SocketServer | null): void {
  io = server;
}

/**
 * Publish an event to a room. Services never import the socket server; they call
 * this, which is a silent no-op in tests and before the socket layer starts.
 */
export function publish<K extends keyof ServerToClientEvents>(
  room: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0],
): void {
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch (err) {
    logger.warn({ err, event, room }, 'Failed to publish realtime event');
  }
}

export function hasSocketServer(): boolean {
  return io !== null;
}
