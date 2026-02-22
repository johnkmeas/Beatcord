import WebSocket from 'ws';
import type { ServerMessage } from '@beatcord/shared';
import { users } from '../state/users.js';

/** Send a message to all connected users, optionally excluding one. */
export function broadcast(data: ServerMessage, excludeId: string | null = null): void {
  const msg = JSON.stringify(data);
  users.forEach((user, id) => {
    if (id !== excludeId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msg);
    }
  });
}

/** Send a message to all connected users with no exclusion. */
export function broadcastAll(data: ServerMessage): void {
  broadcast(data, null);
}
