import type { SeqState, StepData, SynthState, GlobalSettings } from '@beatcord/shared';

const USER_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff6bff', '#ff9f43', '#00d2d3', '#ee5a24',
] as const;

export function randomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export function makeSteps(count: number): StepData[] {
  return Array.from({ length: count }, () => ({ notes: [] }));
}

export function defaultSeqState(): SeqState {
  return {
    steps: makeSteps(16),
    stepCount: 16,
    bpm: 120,
    subdiv: 4,
    playing: false,
  };
}

export function defaultSynthState(): SynthState {
  return {
    waveform: 'sawtooth',
    attack: 0.005,
    decay: 0.12,
    sustain: 0.5,
    release: 0.4,
    filterFreq: 3000,
    filterQ: 1.5,
    volume: 0.7,
    color: randomColor(),
  };
}

export function defaultGlobalSettings(): GlobalSettings {
  return {
    playing: false,
    bpm: 120,
    stepCount: 16,
    rootNote: 0,
    scaleType: 'chromatic',
    masterVolume: 0.8,
  };
}
