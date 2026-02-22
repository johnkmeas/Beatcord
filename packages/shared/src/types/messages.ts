import type { SeqState } from './sequencer.js';
import type { SynthState } from './synth.js';
import type { PublicUser } from './user.js';

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

export type ClientMessage =
  | JoinMessage
  | SequencerUpdateMessage
  | SynthUpdateMessage
  | StepTickMessage
  | PingMessage;

// ── Server → Client ─────────────────────────────────────────

export interface WelcomeMessage {
  type: 'welcome';
  userId: string;
  users: PublicUser[];
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

export type ServerMessage =
  | WelcomeMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ServerSequencerUpdateMessage
  | ServerSynthUpdateMessage
  | ServerStepTickMessage
  | KickedMessage
  | UsersUpdateMessage;
