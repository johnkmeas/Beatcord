import WebSocket from 'ws';
import type { ClientMessage, GlobalSettings } from '@beatcord/shared';
import { config } from '../config.js';
import { users, generateId, getPublicUsers, type ServerUser } from '../state/users.js';
import { defaultSeqState, defaultSynthState, defaultGlobalSettings } from '../state/defaults.js';
import { broadcast, broadcastAll } from './broadcast.js';

const MAX_CHAT_LENGTH = 500;

// ── Global settings (shared by all users in the session) ─────
let globalSettings: GlobalSettings = defaultGlobalSettings();

// ── Inactivity management ────────────────────────────────────

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
  broadcastAll({ type: 'user_left', userId: id });
  broadcastAll({ type: 'users_update', users: getPublicUsers() });
  console.log(`User ${user.name} (${id}) removed`);
}

// ── Message handlers ─────────────────────────────────────────

function handleJoin(ws: WebSocket, name: string): string {
  const userId = generateId();
  const user: ServerUser = {
    id: userId,
    name: name.slice(0, config.maxNameLength),
    seq: defaultSeqState(),
    synth: defaultSynthState(),
    ws,
    lastActivity: Date.now(),
    inactivityTimer: null,
  };
  users.set(userId, user);
  resetInactivityTimer(user);

  // Send welcome with full state
  ws.send(JSON.stringify({
    type: 'welcome',
    userId,
    users: getPublicUsers(),
    globalSettings,
  }));

  // Notify others
  broadcast(
    {
      type: 'user_joined',
      user: { id: userId, name: user.name, seq: user.seq, synth: user.synth },
    },
    userId,
  );

  console.log(`User ${user.name} (${userId}) joined`);
  return userId;
}

function handleSequencerUpdate(userId: string): void {
  const user = users.get(userId);
  if (!user) return;
  broadcast({ type: 'sequencer_update', userId, seq: user.seq }, userId);
}

function handleSynthUpdate(userId: string): void {
  const user = users.get(userId);
  if (!user) return;
  broadcast({ type: 'synth_update', userId, synth: user.synth }, userId);
}

function handleStepTick(userId: string, step: number, hasNotes: boolean): void {
  broadcast({ type: 'step_tick', userId, step, hasNotes }, userId);
}

function handleChat(userId: string, text: string): void {
  const user = users.get(userId);
  if (!user) return;
  const sanitised = text.trim().slice(0, MAX_CHAT_LENGTH);
  if (!sanitised) return;
  // Broadcast to ALL users (including sender) so they see confirmation
  broadcastAll({
    type: 'chat',
    userId,
    name: user.name,
    text: sanitised,
    timestamp: Date.now(),
  });
}

function handleGlobalSettingsUpdate(userId: string, partial: Partial<GlobalSettings>): void {
  // Merge partial update into current global settings
  globalSettings = { ...globalSettings, ...partial };
  // Broadcast to ALL users (including sender for confirmation)
  broadcastAll({
    type: 'global_settings_update',
    settings: globalSettings,
    changedBy: userId,
  });
  console.log(`Global settings updated by ${userId}:`, Object.keys(partial).join(', '));
}

// ── Connection handler ───────────────────────────────────────

export function handleConnection(ws: WebSocket): void {
  let userId: string | null = null;

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'join') {
      userId = handleJoin(ws, msg.name);
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
        // Keep-alive / activity update — handled by resetInactivityTimer above
        break;

      case 'chat':
        handleChat(userId, msg.text);
        break;

      case 'global_settings_update':
        handleGlobalSettingsUpdate(userId, msg.settings);
        break;
    }
  });

  ws.on('close', () => {
    if (userId) removeUser(userId);
  });

  ws.on('error', () => {
    if (userId) removeUser(userId);
  });
}
