import { describe, it, expect } from 'vitest';
import type { GlobalSettings } from '@beatcord/shared';
import { defaultGlobalSettings } from '../packages/server/src/state/defaults';

// ── Server-side merge logic ──────────────────────────────────
// Mirrors the merge in handler.ts: handleGlobalSettingsUpdate

function mergeSettings(
  current: GlobalSettings,
  partial: Partial<GlobalSettings>,
): GlobalSettings {
  return { ...current, ...partial };
}

describe('global settings merge (server-side)', () => {
  it('merges a single field update', () => {
    const base = defaultGlobalSettings();
    const updated = mergeSettings(base, { bpm: 140 });
    expect(updated.bpm).toBe(140);
    expect(updated.playing).toBe(false);
    expect(updated.stepCount).toBe(16);
    expect(updated.masterVolume).toBe(0.8);
  });

  it('merges multiple fields at once', () => {
    const base = defaultGlobalSettings();
    const updated = mergeSettings(base, { bpm: 90, playing: true, masterVolume: 0.5 });
    expect(updated.bpm).toBe(90);
    expect(updated.playing).toBe(true);
    expect(updated.masterVolume).toBe(0.5);
    // Unchanged fields
    expect(updated.stepCount).toBe(16);
    expect(updated.rootNote).toBe(0);
    expect(updated.scaleType).toBe('chromatic');
  });

  it('playing toggle: false → true', () => {
    const base = defaultGlobalSettings();
    expect(base.playing).toBe(false);
    const updated = mergeSettings(base, { playing: true });
    expect(updated.playing).toBe(true);
  });

  it('playing toggle: true → false', () => {
    const base = { ...defaultGlobalSettings(), playing: true };
    const updated = mergeSettings(base, { playing: false });
    expect(updated.playing).toBe(false);
  });

  it('stepCount change preserves other settings', () => {
    const base = { ...defaultGlobalSettings(), bpm: 140, playing: true };
    const updated = mergeSettings(base, { stepCount: 32 });
    expect(updated.stepCount).toBe(32);
    expect(updated.bpm).toBe(140);
    expect(updated.playing).toBe(true);
  });

  it('empty partial produces identical settings', () => {
    const base = defaultGlobalSettings();
    const updated = mergeSettings(base, {});
    expect(updated).toEqual(base);
  });

  it('does not mutate the original', () => {
    const base = defaultGlobalSettings();
    const baseCopy = { ...base };
    mergeSettings(base, { bpm: 200 });
    expect(base).toEqual(baseCopy);
  });

  it('scale settings merge correctly', () => {
    const base = defaultGlobalSettings();
    const updated = mergeSettings(base, { rootNote: 7, scaleType: 'minor' });
    expect(updated.rootNote).toBe(7);
    expect(updated.scaleType).toBe('minor');
  });

  it('masterVolume clamped values pass through', () => {
    const base = defaultGlobalSettings();
    const updated = mergeSettings(base, { masterVolume: 0 });
    expect(updated.masterVolume).toBe(0);
    const updated2 = mergeSettings(base, { masterVolume: 1 });
    expect(updated2.masterVolume).toBe(1);
  });
});

// ── Settings snapshot roundtrip ──────────────────────────────

describe('global settings snapshot roundtrip', () => {
  it('getSnapshot → applyFromServer should be identity', () => {
    // Simulates client-side getSnapshot and applyFromServer
    const original: GlobalSettings = {
      playing: true,
      bpm: 140,
      stepCount: 32,
      rootNote: 5,
      scaleType: 'dorian',
      masterVolume: 0.6,
    };

    // Simulate serialization (as happens over WebSocket)
    const json = JSON.stringify(original);
    const deserialized = JSON.parse(json) as GlobalSettings;

    expect(deserialized).toEqual(original);
    expect(deserialized.playing).toBe(true);
    expect(deserialized.bpm).toBe(140);
    expect(deserialized.stepCount).toBe(32);
    expect(deserialized.rootNote).toBe(5);
    expect(deserialized.scaleType).toBe('dorian');
    expect(deserialized.masterVolume).toBe(0.6);
  });
});
