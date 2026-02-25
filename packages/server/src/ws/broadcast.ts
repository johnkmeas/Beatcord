import WebSocket from 'ws';
import type { ServerMessage } from '@beatcord/shared';
import { users } from '../state/users.js';

/** Send a message to all connected users in a room, optionally excluding one. */
export function broadcastToRoom(roomId: string, data: ServerMessage, excludeId: string | null = null): void {
  const msg = JSON.stringify(data);
  users.forEach((user, id) => {
    if (user.roomId !== roomId) return;
    if (id !== excludeId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msg);
    }
  });
}

/** Send a message to all connected users in a room with no exclusion. */
export function broadcastAllToRoom(roomId: string, data: ServerMessage): void {
  broadcastToRoom(roomId, data, null);
}
