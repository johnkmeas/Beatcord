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
  /** Delay time in seconds (0–1). */
  delayTime: number;
  /** Delay feedback amount (0–0.9). */
  delayFeedback: number;
  /** Delay wet/dry mix (0 = dry, 1 = wet). */
  delayMix: number;
  /** Reverb wet/dry mix (0 = dry, 1 = wet). */
  reverbMix: number;
  /** Reverb impulse-response decay in seconds (0.1–5). */
  reverbDecay: number;
}
