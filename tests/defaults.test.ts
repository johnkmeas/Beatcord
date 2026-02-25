import { describe, it, expect } from 'vitest';
import {
  makeSteps,
  defaultSeqState,
  defaultSynthState,
  defaultGlobalSettings,
  randomColor,
} from '../packages/server/src/state/defaults';

describe('makeSteps', () => {
  it('creates the correct number of steps', () => {
    expect(makeSteps(16)).toHaveLength(16);
    expect(makeSteps(8)).toHaveLength(8);
    expect(makeSteps(32)).toHaveLength(32);
  });

  it('each step has an empty notes array', () => {
    const steps = makeSteps(4);
    for (const step of steps) {
      expect(step.notes).toEqual([]);
    }
  });

  it('steps are independent objects (not shared references)', () => {
    const steps = makeSteps(4);
    steps[0].notes.push({ midi: 60, velocity: 100, length: 0.8 });
    expect(steps[1].notes).toEqual([]);
  });

  it('handles zero steps', () => {
    expect(makeSteps(0)).toEqual([]);
  });
});

describe('defaultSeqState', () => {
  it('returns correct default values', () => {
    const seq = defaultSeqState();
    expect(seq.stepCount).toBe(16);
    expect(seq.bpm).toBe(120);
    expect(seq.subdiv).toBe(4);
    expect(seq.playing).toBe(false);
    expect(seq.steps).toHaveLength(16);
  });

  it('returns a new object each time', () => {
    const a = defaultSeqState();
    const b = defaultSeqState();
    expect(a).not.toBe(b);
    expect(a.steps).not.toBe(b.steps);
  });
});

describe('defaultSynthState', () => {
  it('returns correct default values', () => {
    const synth = defaultSynthState();
    expect(synth.waveform).toBe('sawtooth');
    expect(synth.attack).toBe(0.005);
    expect(synth.decay).toBe(0.12);
    expect(synth.sustain).toBe(0.5);
    expect(synth.release).toBe(0.4);
    expect(synth.filterFreq).toBe(3000);
    expect(synth.filterQ).toBe(1.5);
    expect(synth.volume).toBe(0.7);
    expect(typeof synth.color).toBe('string');
    expect(synth.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a new object each time', () => {
    const a = defaultSynthState();
    const b = defaultSynthState();
    expect(a).not.toBe(b);
  });
});

describe('defaultGlobalSettings', () => {
  it('returns correct default values', () => {
    const gs = defaultGlobalSettings();
    expect(gs.playing).toBe(false);
    expect(gs.bpm).toBe(120);
    expect(gs.stepCount).toBe(16);
    expect(gs.rootNote).toBe(0);
    expect(gs.scaleType).toBe('chromatic');
    expect(gs.masterVolume).toBe(0.8);
  });

  it('returns a new object each time', () => {
    const a = defaultGlobalSettings();
    const b = defaultGlobalSettings();
    expect(a).not.toBe(b);
  });
});

describe('randomColor', () => {
  it('returns a valid hex color', () => {
    for (let i = 0; i < 20; i++) {
      const color = randomColor();
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
