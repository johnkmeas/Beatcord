import type WebSocket from 'ws';
import type { SeqState, SynthState, PublicUser } from '@beatcord/shared';

export interface ServerUser {
  id: string;
  clientId: string;
  name: string;
  seq: SeqState;
  synth: SynthState;
  ws: WebSocket;
  roomId: string;
  lastActivity: number;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
}

/** All connected users, keyed by their ID. */
export const users = new Map<string, ServerUser>();

/** Generate a short random ID. */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/** Get public-facing user data for all connected users. */
export function getPublicUsers(roomId?: string): PublicUser[] {
  const source = roomId
    ? Array.from(users.values()).filter((u) => u.roomId === roomId)
    : Array.from(users.values());

  return source.map((u) => ({
    id: u.id,
    name: u.name,
    seq: u.seq,
    synth: u.synth,
  }));
}
