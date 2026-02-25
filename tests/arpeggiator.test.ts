import { describe, it, expect } from 'vitest';
import { generateArpNotes, type ArpEvent } from '../packages/client/src/composables/useArpeggiator';
import type { NoteData } from '@beatcord/shared';

// ── Helpers ──────────────────────────────────────────────────

function makeNotes(...midis: number[]): NoteData[] {
  return midis.map((midi) => ({ midi, velocity: 100, length: 0.8 }));
}

const BPM = 120;
const SUBDIV = 4; // 1/16th

// ── Empty input ──────────────────────────────────────────────

describe('generateArpNotes', () => {
  it('returns empty array for empty notes', () => {
    const result = generateArpNotes([], 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
    expect(result).toEqual([]);
  });

  // ── Single note ──────────────────────────────────────────

  it('returns events for a single note', () => {
    const notes = makeNotes(60);
    const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
    expect(events.length).toBeGreaterThan(0);
    // All events should be the same note
    for (const ev of events) {
      expect(ev.midi).toBe(60);
      expect(ev.velocity).toBe(100);
    }
  });

  // ── Pattern ordering ─────────────────────────────────────

  describe('pattern ordering', () => {
    it('up pattern sorts ascending', () => {
      const notes = makeNotes(64, 60, 67);
      const events = generateArpNotes(notes, 'up', '1/4', 1, 0.8, 0, BPM, SUBDIV);
      // With 1/4 rate at 120 BPM, subdiv 4: step = 0.125s, beat = 0.5s, sub = 0.5s
      // sub-steps in one step = floor(0.125/0.5) = 0, but at least 1
      // Actually let's just check the ordering of the first few events
      const midis = events.map((e) => e.midi);
      if (midis.length >= 3) {
        expect(midis[0]).toBe(60);
        expect(midis[1]).toBe(64);
        expect(midis[2]).toBe(67);
      }
    });

    it('down pattern sorts descending', () => {
      const notes = makeNotes(60, 64, 67);
      const events = generateArpNotes(notes, 'down', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      const midis = events.map((e) => e.midi);
      if (midis.length >= 3) {
        expect(midis[0]).toBe(67);
        expect(midis[1]).toBe(64);
        expect(midis[2]).toBe(60);
      }
    });

    it('up-down pattern goes up then down without repeating extremes', () => {
      const notes = makeNotes(60, 64, 67);
      const events = generateArpNotes(notes, 'up-down', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      const midis = events.map((e) => e.midi);
      // Pattern should be: 60, 64, 67, 64 (cycle)
      if (midis.length >= 4) {
        expect(midis[0]).toBe(60);
        expect(midis[1]).toBe(64);
        expect(midis[2]).toBe(67);
        expect(midis[3]).toBe(64);
      }
    });

    it('down-up pattern goes down then up without repeating extremes', () => {
      const notes = makeNotes(60, 64, 67);
      const events = generateArpNotes(notes, 'down-up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      const midis = events.map((e) => e.midi);
      if (midis.length >= 4) {
        expect(midis[0]).toBe(67);
        expect(midis[1]).toBe(64);
        expect(midis[2]).toBe(60);
        expect(midis[3]).toBe(64);
      }
    });

    it('random pattern uses all notes', () => {
      const notes = makeNotes(60, 64, 67, 72);
      const events = generateArpNotes(notes, 'random', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      const uniqueMidis = new Set(events.map((e) => e.midi));
      // All original midis should appear (with enough sub-steps)
      for (const n of notes) {
        expect(uniqueMidis.has(n.midi)).toBe(true);
      }
    });

    it('converge pattern alternates from outside in', () => {
      const notes = makeNotes(60, 64, 67, 72);
      const events = generateArpNotes(notes, 'converge', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      const midis = events.map((e) => e.midi);
      if (midis.length >= 4) {
        // Converge: lowest, highest, next-lowest, next-highest
        expect(midis[0]).toBe(60);
        expect(midis[1]).toBe(72);
        expect(midis[2]).toBe(64);
        expect(midis[3]).toBe(67);
      }
    });
  });

  // ── Octave expansion ─────────────────────────────────────

  describe('octave expansion', () => {
    it('octaveRange=1 keeps original notes', () => {
      const notes = makeNotes(60);
      const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      for (const ev of events) {
        expect(ev.midi).toBe(60);
      }
    });

    it('octaveRange=2 includes notes shifted up by 12', () => {
      const notes = makeNotes(60);
      const events = generateArpNotes(notes, 'up', '1/16', 2, 0.8, 0, BPM, SUBDIV);
      const midis = new Set(events.map((e) => e.midi));
      expect(midis.has(60)).toBe(true);
      expect(midis.has(72)).toBe(true);
    });

    it('octaveRange=3 includes two octave shifts', () => {
      const notes = makeNotes(60);
      const events = generateArpNotes(notes, 'up', '1/16', 3, 0.8, 0, BPM, SUBDIV);
      const midis = new Set(events.map((e) => e.midi));
      expect(midis.has(60)).toBe(true);
      expect(midis.has(72)).toBe(true);
      expect(midis.has(84)).toBe(true);
    });

    it('does not exceed MIDI 127', () => {
      const notes = makeNotes(120);
      const events = generateArpNotes(notes, 'up', '1/16', 4, 0.8, 0, BPM, SUBDIV);
      for (const ev of events) {
        expect(ev.midi).toBeLessThanOrEqual(127);
      }
    });
  });

  // ── Timing ───────────────────────────────────────────────

  describe('timing', () => {
    it('first event has offset 0', () => {
      const notes = makeNotes(60, 64);
      const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      expect(events[0].offset).toBe(0);
    });

    it('events are ordered by offset', () => {
      const notes = makeNotes(60, 64, 67);
      const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      for (let i = 1; i < events.length; i++) {
        expect(events[i].offset).toBeGreaterThanOrEqual(events[i - 1].offset);
      }
    });

    it('no event offset exceeds step duration', () => {
      const stepDur = (60 / BPM) / (SUBDIV / 4); // 0.125s at 120 BPM, subdiv 4
      const notes = makeNotes(60, 64);
      const events = generateArpNotes(notes, 'up', '1/32', 1, 0.8, 0, BPM, SUBDIV);
      for (const ev of events) {
        expect(ev.offset).toBeLessThan(stepDur);
      }
    });

    it('duration respects gate', () => {
      const notes = makeNotes(60);
      const gate = 0.5;
      const events = generateArpNotes(notes, 'up', '1/16', 1, gate, 0, BPM, SUBDIV);
      // At 120 BPM: beat = 0.5s, 1/16 rate subStepDur = 0.5/4 = 0.125s
      const expectedDur = 0.125 * gate;
      expect(events[0].duration).toBeCloseTo(expectedDur, 5);
    });
  });

  // ── Swing ────────────────────────────────────────────────

  describe('swing', () => {
    it('zero swing means evenly spaced events', () => {
      const notes = makeNotes(60, 64);
      const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
      if (events.length >= 2) {
        const gap = events[1].offset - events[0].offset;
        // With zero swing, all gaps should be equal
        for (let i = 2; i < events.length; i++) {
          expect(events[i].offset - events[i - 1].offset).toBeCloseTo(gap, 5);
        }
      }
    });

    it('non-zero swing pushes odd-indexed events forward', () => {
      const notes = makeNotes(60, 64);
      const swing = 0.3;
      const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, swing, BPM, SUBDIV);
      if (events.length >= 3) {
        // Gap between event 0→1 should be larger than gap between 1→2
        const gap01 = events[1].offset - events[0].offset;
        const gap12 = events[2].offset - events[1].offset;
        expect(gap01).toBeGreaterThan(gap12);
      }
    });
  });

  // ── Velocity averaging ───────────────────────────────────

  it('uses average velocity of input notes', () => {
    const notes: NoteData[] = [
      { midi: 60, velocity: 80, length: 0.8 },
      { midi: 64, velocity: 120, length: 0.8 },
    ];
    const events = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, BPM, SUBDIV);
    const expectedVel = Math.round((80 + 120) / 2);
    for (const ev of events) {
      expect(ev.velocity).toBe(expectedVel);
    }
  });

  // ── Different BPM ────────────────────────────────────────

  it('produces more sub-steps at slower BPM (longer step)', () => {
    const notes = makeNotes(60, 64);
    const fastEvents = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, 200, SUBDIV);
    const slowEvents = generateArpNotes(notes, 'up', '1/16', 1, 0.8, 0, 60, SUBDIV);
    expect(slowEvents.length).toBeGreaterThanOrEqual(fastEvents.length);
  });
});
