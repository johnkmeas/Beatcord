import type { StepCountOption } from './sequencer.js';

/** Global settings synced across all users in a session. */
export interface GlobalSettings {
  playing: boolean;
  bpm: number;
  stepCount: StepCountOption;
  rootNote: number;      // 0–11, index into note names
  scaleType: string;
  masterVolume: number;  // 0–1
}
