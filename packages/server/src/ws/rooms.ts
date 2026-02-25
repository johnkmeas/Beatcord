import type { GlobalSettings } from '@beatcord/shared';
import { defaultGlobalSettings } from '../state/defaults.js';

export const DEFAULT_ROOM = 'global';

export interface Room {
  id: string;
  userIds: Set<string>;
  createdAt: number;
  globalSettings: GlobalSettings;
}

const rooms = new Map<string, Room>();

export function sanitiseRoomId(roomId: string): string {
  const trimmed = roomId.trim().toLowerCase();
  const safe = trimmed.replace(/[^a-z0-9-_]/g, '').slice(0, 48);
  return safe || DEFAULT_ROOM;
}

export function getOrCreateRoom(roomId: string): Room {
  const id = sanitiseRoomId(roomId);
  let room = rooms.get(id);
  if (!room) {
    room = { id, userIds: new Set(), createdAt: Date.now(), globalSettings: defaultGlobalSettings() };
    rooms.set(id, room);
  }
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(sanitiseRoomId(roomId));
}

export function removeUserFromRoom(roomId: string, userId: string): void {
  const room = getRoom(roomId);
  if (!room) return;
  room.userIds.delete(userId);
  if (room.userIds.size === 0) {
    rooms.delete(room.id);
  }
}
