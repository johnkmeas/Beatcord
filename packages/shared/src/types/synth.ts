/** Supported oscillator waveforms. */
export type Waveform = 'sawtooth' | 'square' | 'sine' | 'triangle';

/** Full synth state for one user. */
export interface SynthState {
  waveform: Waveform;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq: number;
  filterQ: number;
  volume: number;
  color: string;
}
