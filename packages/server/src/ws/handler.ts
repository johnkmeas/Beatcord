import WebSocket from 'ws';
import type { ClientMessage, GlobalSettings } from '@beatcord/shared';
import { config } from '../config.js';
import { users, generateId, getPublicUsers, type ServerUser } from '../state/users.js';
import { defaultSeqState, defaultSynthState } from '../state/defaults.js';
import { broadcastToRoom, broadcastAllToRoom } from './broadcast.js';
import { getOrCreateRoom, removeUserFromRoom, sanitiseRoomId } from './rooms.js';

const MAX_CHAT_LENGTH = 500;

function resetInactivityTimer(user: ServerUser): void {
  if (user.inactivityTimer) clearTimeout(user.inactivityTimer);
  user.lastActivity = Date.now();
  user.inactivityTimer = setTimeout(() => {
    console.log(`Removing inactive user ${user.name}`);
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify({ type: 'kicked', reason: 'inactivity' }));
    }
    removeUser(user.id);
  }, config.inactivityTimeout);
}

function removeUser(id: string): void {
  const user = users.get(id);
  if (!user) return;

  if (user.inactivityTimer) clearTimeout(user.inactivityTimer);
  users.delete(id);
  removeUserFromRoom(user.roomId, id);

  broadcastAllToRoom(user.roomId, { type: 'user_left', userId: id });
  broadcastAllToRoom(user.roomId, { type: 'users_update', users: getPublicUsers(user.roomId) });
  console.log(`User ${user.name} (${id}) removed from room ${user.roomId}`);
}

function evictStaleClient(clientId: string): void {
  for (const [id, existing] of users) {
    if (existing.clientId === clientId) {
      console.log(`Evicting stale session ${existing.name} (${id}) for clientId ${clientId}`);
      removeUser(id);
      if (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING) {
        existing.ws.close();
      }
      break; // clientId is unique per tab
    }
  }
}

function handleJoin(ws: WebSocket, name: string, requestedRoomId: string, clientId: string): string {
  // Remove any lingering session for this clientId (reconnect race)
  evictStaleClient(clientId);

  const room = getOrCreateRoom(requestedRoomId);
  const userId = generateId();

  const user: ServerUser = {
    id: userId,
    clientId,
    name: name.slice(0, config.maxNameLength),
    seq: defaultSeqState(),
    synth: defaultSynthState(),
    ws,
    roomId: room.id,
    lastActivity: Date.now(),
    inactivityTimer: null,
  };

  users.set(userId, user);
  room.userIds.add(userId);
  resetInactivityTimer(user);

  ws.send(JSON.stringify({
    type: 'welcome',
    userId,
    roomId: room.id,
    users: getPublicUsers(room.id),
    globalSettings: room.globalSettings,
  }));

  broadcastToRoom(
    room.id,
    {
      type: 'user_joined',
      user: { id: userId, name: user.name, seq: user.seq, synth: user.synth },
    },
    userId,
  );

  console.log(`User ${user.name} (${userId}) joined room ${room.id}`);
  return userId;
}

function handleSequencerUpdate(userId: string): void {
  const user = users.get(userId);
  if (!user) return;
  broadcastToRoom(user.roomId, { type: 'sequencer_update', userId, seq: user.seq }, userId);
}

function handleSynthUpdate(userId: string): void {
  const user = users.get(userId);
  if (!user) return;
  broadcastToRoom(user.roomId, { type: 'synth_update', userId, synth: user.synth }, userId);
}

function handleStepTick(userId: string, step: number, hasNotes: boolean): void {
  const user = users.get(userId);
  if (!user) return;
  broadcastToRoom(user.roomId, { type: 'step_tick', userId, step, hasNotes }, userId);
}

function handleChat(userId: string, text: string): void {
  const user = users.get(userId);
  if (!user) return;

  const sanitised = text.trim().slice(0, MAX_CHAT_LENGTH);
  if (!sanitised) return;

  broadcastAllToRoom(user.roomId, {
    type: 'chat',
    userId,
    name: user.name,
    text: sanitised,
    timestamp: Date.now(),
  });
}

function handleGlobalSettingsUpdate(userId: string, partial: Partial<GlobalSettings>): void {
  const user = users.get(userId);
  if (!user) return;

  const room = getOrCreateRoom(user.roomId);
  room.globalSettings = { ...room.globalSettings, ...partial };

  broadcastAllToRoom(room.id, {
    type: 'global_settings_update',
    settings: room.globalSettings,
    changedBy: userId,
  });
  console.log(`Global settings updated by ${userId} in room ${room.id}:`, Object.keys(partial).join(', '));
}

export function handleConnection(ws: WebSocket): void {
  let userId: string | null = null;
  let removed = false;

  function cleanUp() {
    if (userId && !removed) {
      removed = true;
      removeUser(userId);
    }
  }

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'join') {
      // Guard against duplicate join on the same connection
      if (userId) return;
      userId = handleJoin(ws, msg.name, sanitiseRoomId(msg.roomId), msg.clientId);
      return;
    }

    if (!userId || !users.has(userId)) return;
    const user = users.get(userId)!;
    resetInactivityTimer(user);

    switch (msg.type) {
      case 'sequencer_update':
        if (msg.seq) {
          user.seq = msg.seq;
          handleSequencerUpdate(userId);
        }
        break;

      case 'synth_update':
        Object.assign(user.synth, msg.synth);
        handleSynthUpdate(userId);
        break;

      case 'step_tick':
        handleStepTick(userId, msg.step, msg.hasNotes);
        break;

      case 'ping':
        break;

      case 'chat':
        handleChat(userId, msg.text);
        break;

      case 'global_settings_update':
        handleGlobalSettingsUpdate(userId, msg.settings);
        break;
    }
  });

  ws.on('close', cleanUp);
  ws.on('error', cleanUp);
}
