import { describe, it, expect } from 'vitest';
import { SCALES } from '../packages/client/src/stores/scale';

// Pure test of the scale interval data and isInScale logic
// (extracted from the store to avoid Pinia dependency in tests)

function isInScale(midi: number, rootNote: number, scaleType: string): boolean {
  if (scaleType === 'chromatic') return true;
  const intervals = SCALES[scaleType] ?? SCALES.chromatic;
  const scaleNotes = new Set(intervals.map((i) => (rootNote + i) % 12));
  return scaleNotes.has(midi % 12);
}

describe('SCALES data', () => {
  it('has a chromatic scale with all 12 notes', () => {
    expect(SCALES.chromatic).toHaveLength(12);
    expect(SCALES.chromatic).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('major scale has 7 notes with correct intervals', () => {
    expect(SCALES.major).toHaveLength(7);
    expect(SCALES.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('minor scale has 7 notes with correct intervals', () => {
    expect(SCALES.minor).toHaveLength(7);
    expect(SCALES.minor).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it('pentatonic major has 5 notes', () => {
    expect(SCALES.pentatonicMajor).toHaveLength(5);
  });

  it('pentatonic minor has 5 notes', () => {
    expect(SCALES.pentatonicMinor).toHaveLength(5);
  });

  it('blues has 6 notes', () => {
    expect(SCALES.blues).toHaveLength(6);
  });

  it('all scales have intervals in range 0–11', () => {
    for (const [name, intervals] of Object.entries(SCALES)) {
      for (const i of intervals) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(12);
      }
    }
  });

  it('all scales start with 0 (root)', () => {
    for (const [name, intervals] of Object.entries(SCALES)) {
      expect(intervals[0]).toBe(0);
    }
  });

  it('all scale intervals are sorted ascending', () => {
    for (const [name, intervals] of Object.entries(SCALES)) {
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
      }
    }
  });
});

describe('isInScale', () => {
  it('chromatic always returns true', () => {
    for (let midi = 0; midi <= 127; midi++) {
      expect(isInScale(midi, 0, 'chromatic')).toBe(true);
    }
  });

  it('C major contains C D E F G A B', () => {
    // C=0, D=2, E=4, F=5, G=7, A=9, B=11
    const cMajor = [0, 2, 4, 5, 7, 9, 11];
    for (let pc = 0; pc < 12; pc++) {
      expect(isInScale(60 + pc, 0, 'major')).toBe(cMajor.includes(pc));
    }
  });

  it('C major does not contain C# D# F# G# A#', () => {
    expect(isInScale(61, 0, 'major')).toBe(false); // C#
    expect(isInScale(63, 0, 'major')).toBe(false); // D#
    expect(isInScale(66, 0, 'major')).toBe(false); // F#
    expect(isInScale(68, 0, 'major')).toBe(false); // G#
    expect(isInScale(70, 0, 'major')).toBe(false); // A#
  });

  it('works with non-zero root note (D major)', () => {
    // D=2, E=4, F#=6, G=7, A=9, B=11, C#=1
    const dMajorPCs = [2, 4, 6, 7, 9, 11, 1];
    for (let pc = 0; pc < 12; pc++) {
      expect(isInScale(60 + pc, 2, 'major')).toBe(dMajorPCs.includes(pc));
    }
  });

  it('A minor contains A B C D E F G', () => {
    // A=9, B=11, C=0, D=2, E=4, F=5, G=7
    const aMinorPCs = [9, 11, 0, 2, 4, 5, 7];
    for (let pc = 0; pc < 12; pc++) {
      expect(isInScale(pc, 9, 'minor')).toBe(aMinorPCs.includes(pc));
    }
  });

  it('works across octaves — same pitch class matches', () => {
    // C (pitch class 0) in C major should be true at every octave
    expect(isInScale(24, 0, 'major')).toBe(true); // C1
    expect(isInScale(36, 0, 'major')).toBe(true); // C2
    expect(isInScale(48, 0, 'major')).toBe(true); // C3
    expect(isInScale(60, 0, 'major')).toBe(true); // C4
    expect(isInScale(72, 0, 'major')).toBe(true); // C5
    expect(isInScale(84, 0, 'major')).toBe(true); // C6
    expect(isInScale(96, 0, 'major')).toBe(true); // C7
  });

  it('unknown scale type falls back to chromatic', () => {
    expect(isInScale(61, 0, 'nonexistent_scale')).toBe(true);
  });
});
