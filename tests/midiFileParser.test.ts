import { describe, it, expect } from 'vitest';
import {
  readVarLength,
  parseMidiFile,
  quantizeMidiToSteps,
  type MidiTrackNote,
} from '../packages/client/src/composables/midiFileParser';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Build a minimal MIDI file ArrayBuffer from raw bytes.
 * Constructs header + one track chunk.
 */
function buildMidiBuffer(
  ticksPerBeat: number,
  trackEvents: number[],
): ArrayBuffer {
  // Header: MThd, length=6, format=0, nTracks=1, ticksPerBeat
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // header length = 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff,
  ];

  // Track chunk: MTrk, length, events
  const trackLength = trackEvents.length;
  const track = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff,
    ...trackEvents,
  ];

  const bytes = new Uint8Array([...header, ...track]);
  return bytes.buffer;
}

/**
 * Build MIDI track events for a single note.
 * Returns the byte sequence: [delta=0, note-on, delta, note-off, end-of-track]
 */
function singleNoteEvents(
  midi: number,
  velocity: number,
  durationTicks: number,
  startDelta = 0,
): number[] {
  // Variable-length encoding of durationTicks
  const durBytes = encodeVarLength(durationTicks);
  const startBytes = encodeVarLength(startDelta);

  return [
    ...startBytes, 0x90, midi, velocity,     // note-on at startDelta
    ...durBytes, 0x80, midi, 0x40,           // note-off after durationTicks
    0x00, 0xff, 0x2f, 0x00,                  // end of track
  ];
}

/** Encode a value as MIDI variable-length bytes. */
function encodeVarLength(value: number): number[] {
  if (value < 0) return [0];
  if (value < 0x80) return [value];

  const bytes: number[] = [];
  let v = value;
  bytes.unshift(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

// ── readVarLength ────────────────────────────────────────────

describe('readVarLength', () => {
  it('reads single-byte values (0–127)', () => {
    const buf = new Uint8Array([0x00]);
    const view = new DataView(buf.buffer);
    expect(readVarLength(view, 0)).toEqual({ value: 0, bytesRead: 1 });

    const buf2 = new Uint8Array([0x7f]);
    const view2 = new DataView(buf2.buffer);
    expect(readVarLength(view2, 0)).toEqual({ value: 127, bytesRead: 1 });
  });

  it('reads two-byte values (128+)', () => {
    // 128 = 0x81 0x00 in variable-length
    const buf = new Uint8Array([0x81, 0x00]);
    const view = new DataView(buf.buffer);
    expect(readVarLength(view, 0)).toEqual({ value: 128, bytesRead: 2 });
  });

  it('reads three-byte values', () => {
    // 16384 = 0x81 0x80 0x00
    const buf = new Uint8Array([0x81, 0x80, 0x00]);
    const view = new DataView(buf.buffer);
    expect(readVarLength(view, 0)).toEqual({ value: 16384, bytesRead: 3 });
  });

  it('reads from a non-zero offset', () => {
    const buf = new Uint8Array([0x00, 0x00, 0x60]);
    const view = new DataView(buf.buffer);
    expect(readVarLength(view, 2)).toEqual({ value: 96, bytesRead: 1 });
  });

  it('reads standard MIDI value 480 (0x83 0x60)', () => {
    // 480 = 0x83 0x60
    const buf = new Uint8Array([0x83, 0x60]);
    const view = new DataView(buf.buffer);
    expect(readVarLength(view, 0)).toEqual({ value: 480, bytesRead: 2 });
  });
});

// ── parseMidiFile ────────────────────────────────────────────

describe('parseMidiFile', () => {
  it('parses a minimal MIDI file with one note', () => {
    const events = singleNoteEvents(60, 100, 480);
    const buffer = buildMidiBuffer(480, events);
    const data = parseMidiFile(buffer);

    expect(data.format).toBe(0);
    expect(data.ticksPerBeat).toBe(480);
    expect(data.notes.length).toBe(1);
    expect(data.notes[0].midi).toBe(60);
    expect(data.notes[0].velocity).toBe(100);
    expect(data.notes[0].startTick).toBe(0);
    expect(data.notes[0].durationTicks).toBe(480);
  });

  it('extracts correct ticksPerBeat', () => {
    const events = singleNoteEvents(60, 80, 240);
    const buffer = buildMidiBuffer(240, events);
    const data = parseMidiFile(buffer);

    expect(data.ticksPerBeat).toBe(240);
  });

  it('handles note-on with velocity 0 as note-off', () => {
    // note-on C4 vel=100, then note-on C4 vel=0 (= note-off)
    const events = [
      0x00, 0x90, 60, 100,    // note-on at tick 0
      0x60, 0x90, 60, 0,      // note-on vel=0 at tick 96 (= note-off)
      0x00, 0xff, 0x2f, 0x00, // end of track
    ];
    const buffer = buildMidiBuffer(96, events);
    const data = parseMidiFile(buffer);

    expect(data.notes.length).toBe(1);
    expect(data.notes[0].midi).toBe(60);
    expect(data.notes[0].durationTicks).toBe(96);
  });

  it('parses multiple notes', () => {
    const events = [
      0x00, 0x90, 60, 100,    // note-on C4 at tick 0
      0x00, 0x90, 64, 90,     // note-on E4 at tick 0
      0x60, 0x80, 60, 0x40,   // note-off C4 at tick 96
      0x00, 0x80, 64, 0x40,   // note-off E4 at tick 96
      0x00, 0xff, 0x2f, 0x00, // end of track
    ];
    const buffer = buildMidiBuffer(96, events);
    const data = parseMidiFile(buffer);

    expect(data.notes.length).toBe(2);
    const midis = data.notes.map((n) => n.midi).sort();
    expect(midis).toEqual([60, 64]);
  });

  it('handles running status', () => {
    // After a note-on status, subsequent note-ons can omit the status byte
    const events = [
      0x00, 0x90, 60, 100,    // note-on C4 with status byte
      0x60, 60, 0,             // running status: note-on C4 vel=0 (note-off)
      0x00, 0xff, 0x2f, 0x00, // end of track
    ];
    const buffer = buildMidiBuffer(96, events);
    const data = parseMidiFile(buffer);

    expect(data.notes.length).toBe(1);
    expect(data.notes[0].midi).toBe(60);
    expect(data.notes[0].durationTicks).toBe(96);
  });

  it('parses sequential notes', () => {
    const events = [
      0x00, 0x90, 60, 100,      // note-on C4 at tick 0
      0x60, 0x80, 60, 0x40,     // note-off C4 at tick 96
      0x00, 0x90, 64, 80,       // note-on E4 at tick 96
      0x60, 0x80, 64, 0x40,     // note-off E4 at tick 192
      0x00, 0xff, 0x2f, 0x00,   // end of track
    ];
    const buffer = buildMidiBuffer(96, events);
    const data = parseMidiFile(buffer);

    expect(data.notes.length).toBe(2);
    expect(data.notes[0].midi).toBe(60);
    expect(data.notes[0].startTick).toBe(0);
    expect(data.notes[1].midi).toBe(64);
    expect(data.notes[1].startTick).toBe(96);
  });

  it('throws on invalid header', () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(() => parseMidiFile(buf.buffer)).toThrow('Invalid MIDI file: missing MThd header');
  });

  it('throws on too-small file', () => {
    const buf = new Uint8Array([0x4d, 0x54, 0x68, 0x64]);
    expect(() => parseMidiFile(buf.buffer)).toThrow('File is too small');
  });

  it('returns sorted notes by startTick', () => {
    // Two notes starting at different ticks
    const events = [
      0x60, 0x90, 64, 80,       // note-on E4 at tick 96
      0x00, 0x90, 60, 100,      // note-on C4 at tick 96 (same tick)
      0x60, 0x80, 64, 0x40,     // note-off E4 at tick 192
      0x00, 0x80, 60, 0x40,     // note-off C4 at tick 192
      0x00, 0xff, 0x2f, 0x00,   // end of track
    ];
    const buffer = buildMidiBuffer(96, events);
    const data = parseMidiFile(buffer);

    // Notes at same tick should be sorted by midi
    expect(data.notes[0].midi).toBeLessThanOrEqual(data.notes[1].midi);
  });
});

// ── quantizeMidiToSteps ──────────────────────────────────────

describe('quantizeMidiToSteps', () => {
  const TPB = 480; // ticksPerBeat

  it('returns empty steps for empty input', () => {
    const steps = quantizeMidiToSteps([], TPB, 4, 16);
    expect(steps.length).toBe(16);
    for (const s of steps) {
      expect(s.notes.length).toBe(0);
    }
  });

  it('maps a note at tick 0 to step 0', () => {
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 120 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);
    expect(steps[0].notes.length).toBe(1);
    expect(steps[0].notes[0].midi).toBe(60);
  });

  it('maps notes to correct steps at subdiv=4 (1/16th)', () => {
    // ticksPerStep = 480/4 = 120
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 120 },
      { midi: 64, velocity: 90, startTick: 120, durationTicks: 120 },
      { midi: 67, velocity: 80, startTick: 240, durationTicks: 120 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes[0].midi).toBe(60);
    expect(steps[1].notes[0].midi).toBe(64);
    expect(steps[2].notes[0].midi).toBe(67);
  });

  it('maps notes to correct steps at subdiv=2 (1/8th)', () => {
    // ticksPerStep = 480/2 = 240
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 240 },
      { midi: 64, velocity: 90, startTick: 240, durationTicks: 240 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 2, 16);

    expect(steps[0].notes[0].midi).toBe(60);
    expect(steps[1].notes[0].midi).toBe(64);
  });

  it('maps notes to correct steps at subdiv=1 (1/4th)', () => {
    // ticksPerStep = 480/1 = 480
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 480 },
      { midi: 64, velocity: 90, startTick: 480, durationTicks: 480 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 1, 16);

    expect(steps[0].notes[0].midi).toBe(60);
    expect(steps[1].notes[0].midi).toBe(64);
  });

  it('rounds to nearest step for notes between steps', () => {
    // ticksPerStep = 120 at subdiv=4
    const notes: MidiTrackNote[] = [
      // At tick 50 (closer to step 0 than step 1)
      { midi: 60, velocity: 100, startTick: 50, durationTicks: 120 },
      // At tick 70 (closer to step 1 than step 0)
      { midi: 64, velocity: 100, startTick: 70, durationTicks: 120 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes.length).toBe(1);
    expect(steps[0].notes[0].midi).toBe(60);
    expect(steps[1].notes.length).toBe(1);
    expect(steps[1].notes[0].midi).toBe(64);
  });

  it('sets note length correctly for multi-step notes', () => {
    // ticksPerStep = 120, note lasts 360 ticks = 3 steps
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 360 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes[0].length).toBe(3);
  });

  it('ensures minimum note length of 1', () => {
    // Very short note (< half a step)
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 10 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes[0].length).toBe(1);
  });

  it('clamps MIDI range to 24–108', () => {
    const notes: MidiTrackNote[] = [
      { midi: 10, velocity: 100, startTick: 0, durationTicks: 120 },  // below range
      { midi: 60, velocity: 100, startTick: 120, durationTicks: 120 }, // in range
      { midi: 120, velocity: 100, startTick: 240, durationTicks: 120 }, // above range
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    // Only the in-range note should be present
    const totalNotes = steps.reduce((sum, s) => sum + s.notes.length, 0);
    expect(totalNotes).toBe(1);
    expect(steps[1].notes[0].midi).toBe(60);
  });

  it('skips notes beyond maxSteps', () => {
    // ticksPerStep = 120, note at step 20 should be skipped if maxSteps = 16
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 120 },
      { midi: 64, velocity: 100, startTick: 2400, durationTicks: 120 }, // step 20
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps.length).toBe(16);
    const totalNotes = steps.reduce((sum, s) => sum + s.notes.length, 0);
    expect(totalNotes).toBe(1);
  });

  it('preserves velocity', () => {
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 42, startTick: 0, durationTicks: 120 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes[0].velocity).toBe(42);
  });

  it('does not add duplicate midi notes to the same step', () => {
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 120 },
      { midi: 60, velocity: 80, startTick: 5, durationTicks: 120 }, // same step, same midi
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes.length).toBe(1);
  });

  it('allows polyphonic notes on the same step', () => {
    const notes: MidiTrackNote[] = [
      { midi: 60, velocity: 100, startTick: 0, durationTicks: 120 },
      { midi: 64, velocity: 90, startTick: 0, durationTicks: 120 },
      { midi: 67, velocity: 80, startTick: 0, durationTicks: 120 },
    ];
    const steps = quantizeMidiToSteps(notes, TPB, 4, 16);

    expect(steps[0].notes.length).toBe(3);
  });
});
