/** A single note placed on a step. */
export interface NoteData {
  /** MIDI note number (24 = C1, 108 = C8) */
  midi: number;
  /** Velocity 1–127 */
  velocity: number;
  /** Note length as fraction of beat (0.05–1.0) */
  length: number;
}

/** A single step in the sequencer. */
export interface StepData {
  notes: NoteData[];
}

/** Full sequencer state for one user. */
export interface SeqState {
  steps: StepData[];
  stepCount: number;
  bpm: number;
  /** Subdivision: 1 = 1/4, 2 = 1/8, 4 = 1/16 */
  subdiv: number;
  playing: boolean;
}

/** Valid step count options. */
export type StepCountOption = 8 | 16 | 32;

/** Valid subdivision options. */
export type SubdivOption = 1 | 2 | 4;
