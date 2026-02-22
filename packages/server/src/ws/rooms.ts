/**
 * Room management — placeholder for future multi-room support.
 *
 * Currently Beatcord uses a single global session. All connected users
 * share one room. This module will be expanded when room/session support
 * is added (migration priority #7).
 */

export const DEFAULT_ROOM = 'global';

export interface Room {
  id: string;
  userIds: Set<string>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

export function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = { id: roomId, userIds: new Set(), createdAt: Date.now() };
    rooms.set(roomId, room);
  }
  return room;
}

export function removeUserFromRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.userIds.delete(userId);
    if (room.userIds.size === 0) {
      rooms.delete(roomId);
    }
  }
}
