import type { SeqState } from './sequencer.js';
import type { SynthState } from './synth.js';
import type { PublicUser } from './user.js';
import type { GlobalSettings } from './global.js';

// ── Client → Server ─────────────────────────────────────────

export interface JoinMessage {
  type: 'join';
  name: string;
}

export interface SequencerUpdateMessage {
  type: 'sequencer_update';
  seq: SeqState;
}

export interface SynthUpdateMessage {
  type: 'synth_update';
  synth: SynthState;
}

export interface StepTickMessage {
  type: 'step_tick';
  step: number;
  hasNotes: boolean;
}

export interface PingMessage {
  type: 'ping';
}

export interface ChatMessage {
  type: 'chat';
  text: string;
}

export interface GlobalSettingsUpdateMessage {
  type: 'global_settings_update';
  settings: Partial<GlobalSettings>;
}

export type ClientMessage =
  | JoinMessage
  | SequencerUpdateMessage
  | SynthUpdateMessage
  | StepTickMessage
  | PingMessage
  | ChatMessage
  | GlobalSettingsUpdateMessage;

// ── Server → Client ─────────────────────────────────────────

export interface WelcomeMessage {
  type: 'welcome';
  userId: string;
  users: PublicUser[];
  globalSettings: GlobalSettings;
}

export interface UserJoinedMessage {
  type: 'user_joined';
  user: PublicUser;
}

export interface UserLeftMessage {
  type: 'user_left';
  userId: string;
}

export interface ServerSequencerUpdateMessage {
  type: 'sequencer_update';
  userId: string;
  seq: SeqState;
}

export interface ServerSynthUpdateMessage {
  type: 'synth_update';
  userId: string;
  synth: SynthState;
}

export interface ServerStepTickMessage {
  type: 'step_tick';
  userId: string;
  step: number;
  hasNotes: boolean;
}

export interface KickedMessage {
  type: 'kicked';
  reason: string;
}

export interface UsersUpdateMessage {
  type: 'users_update';
  users: PublicUser[];
}

export interface ServerChatMessage {
  type: 'chat';
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

export interface ServerGlobalSettingsUpdateMessage {
  type: 'global_settings_update';
  settings: GlobalSettings;
  changedBy: string;
}

export type ServerMessage =
  | WelcomeMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ServerSequencerUpdateMessage
  | ServerSynthUpdateMessage
  | ServerStepTickMessage
  | KickedMessage
  | UsersUpdateMessage
  | ServerChatMessage
  | ServerGlobalSettingsUpdateMessage;
