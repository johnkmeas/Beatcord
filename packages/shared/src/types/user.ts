import type { SeqState } from './sequencer.js';
import type { SynthState } from './synth.js';

/** Public user info broadcast to all clients. */
export interface PublicUser {
  id: string;
  name: string;
  seq: SeqState | null;
  synth: SynthState;
}
