/**
 * Pure MIDI file parser and step-grid quantizer.
 * No Vue/Pinia dependencies — fully testable.
 */

import type { StepData } from '@beatcord/shared';

// ── Types ────────────────────────────────────────────────────

export interface MidiTrackNote {
  midi: number;
  velocity: number;
  startTick: number;
  durationTicks: number;
}

export interface MidiFileData {
  format: number;
  ticksPerBeat: number;
  notes: MidiTrackNote[];
}

// ── Helpers ──────────────────────────────────────────────────

const MIDI_MIN = 24;
const MIDI_MAX = 108;

/** Read a MIDI variable-length quantity from a DataView. */
export function readVarLength(
  view: DataView,
  offset: number,
): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;

  for (;;) {
    if (offset + bytesRead >= view.byteLength) {
      throw new Error('Unexpected end of MIDI data while reading variable-length quantity');
    }
    const byte = view.getUint8(offset + bytesRead);
    bytesRead++;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }

  return { value, bytesRead };
}

/** Read a 4-character ASCII string from a DataView. */
function readChunkId(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

// ── Track parsing ────────────────────────────────────────────

interface PendingNote {
  midi: number;
  velocity: number;
  startTick: number;
}

function parseTrack(view: DataView, trackStart: number, trackLength: number): MidiTrackNote[] {
  const notes: MidiTrackNote[] = [];
  const pending = new Map<number, PendingNote[]>();

  let offset = trackStart;
  const trackEnd = trackStart + trackLength;
  let absoluteTick = 0;
  let runningStatus = 0;

  while (offset < trackEnd) {
    // Delta time
    const delta = readVarLength(view, offset);
    offset += delta.bytesRead;
    absoluteTick += delta.value;

    if (offset >= trackEnd) break;

    let statusByte = view.getUint8(offset);

    // Running status: if the high bit is 0, reuse previous status
    if ((statusByte & 0x80) === 0) {
      statusByte = runningStatus;
    } else {
      offset++;
    }

    const command = statusByte & 0xf0;

    if (command === 0x80) {
      // Note Off
      const midi = view.getUint8(offset);
      offset += 2; // midi + velocity (ignored for off)

      const stack = pending.get(midi);
      if (stack && stack.length > 0) {
        const p = stack.pop()!;
        notes.push({
          midi: p.midi,
          velocity: p.velocity,
          startTick: p.startTick,
          durationTicks: absoluteTick - p.startTick,
        });
        if (stack.length === 0) pending.delete(midi);
      }

      runningStatus = statusByte;
    } else if (command === 0x90) {
      // Note On (velocity 0 = Note Off)
      const midi = view.getUint8(offset);
      const velocity = view.getUint8(offset + 1);
      offset += 2;

      if (velocity === 0) {
        // Treat as note-off
        const stack = pending.get(midi);
        if (stack && stack.length > 0) {
          const p = stack.pop()!;
          notes.push({
            midi: p.midi,
            velocity: p.velocity,
            startTick: p.startTick,
            durationTicks: absoluteTick - p.startTick,
          });
          if (stack.length === 0) pending.delete(midi);
        }
      } else {
        const stack = pending.get(midi) ?? [];
        stack.push({ midi, velocity, startTick: absoluteTick });
        pending.set(midi, stack);
      }

      runningStatus = statusByte;
    } else if (command === 0xa0) {
      // Polyphonic aftertouch — skip 2 data bytes
      offset += 2;
      runningStatus = statusByte;
    } else if (command === 0xb0) {
      // Control change — skip 2 data bytes
      offset += 2;
      runningStatus = statusByte;
    } else if (command === 0xc0) {
      // Program change — skip 1 data byte
      offset += 1;
      runningStatus = statusByte;
    } else if (command === 0xd0) {
      // Channel aftertouch — skip 1 data byte
      offset += 1;
      runningStatus = statusByte;
    } else if (command === 0xe0) {
      // Pitch bend — skip 2 data bytes
      offset += 2;
      runningStatus = statusByte;
    } else if (statusByte === 0xff) {
      // Meta event
      if (offset >= trackEnd) break;
      const metaType = view.getUint8(offset);
      offset++;
      const lenResult = readVarLength(view, offset);
      offset += lenResult.bytesRead;
      offset += lenResult.value; // skip meta data

      // End of track
      if (metaType === 0x2f) break;
    } else if (statusByte === 0xf0 || statusByte === 0xf7) {
      // SysEx event
      const lenResult = readVarLength(view, offset);
      offset += lenResult.bytesRead;
      offset += lenResult.value;
    } else {
      // Unknown — skip to avoid infinite loop
      break;
    }
  }

  return notes;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Parse a standard MIDI file from a raw ArrayBuffer.
 * Returns note data from all tracks merged together.
 */
export function parseMidiFile(buffer: ArrayBuffer): MidiFileData {
  const view = new DataView(buffer);

  if (buffer.byteLength < 14) {
    throw new Error('File is too small to be a valid MIDI file');
  }

  // ── Header chunk ──
  const headerId = readChunkId(view, 0);
  if (headerId !== 'MThd') {
    throw new Error('Invalid MIDI file: missing MThd header');
  }

  const headerLength = view.getUint32(4);
  if (headerLength < 6) {
    throw new Error('Invalid MIDI header length');
  }

  const format = view.getUint16(8);
  const nTracks = view.getUint16(10);
  const timeDivision = view.getUint16(12);

  // We only support ticks-per-beat timing (high bit = 0)
  if ((timeDivision & 0x8000) !== 0) {
    throw new Error('SMPTE time division is not supported');
  }
  const ticksPerBeat = timeDivision;

  // ── Track chunks ──
  const allNotes: MidiTrackNote[] = [];
  let offset = 8 + headerLength;

  for (let t = 0; t < nTracks && offset < buffer.byteLength - 8; t++) {
    const chunkId = readChunkId(view, offset);
    const chunkLength = view.getUint32(offset + 4);
    offset += 8;

    if (chunkId === 'MTrk') {
      const trackNotes = parseTrack(view, offset, chunkLength);
      allNotes.push(...trackNotes);
    }

    offset += chunkLength;
  }

  // Sort by startTick
  allNotes.sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);

  return { format, ticksPerBeat, notes: allNotes };
}

/**
 * Quantize parsed MIDI notes to a step grid.
 *
 * @param notes      Parsed MIDI notes
 * @param ticksPerBeat  Ticks per quarter note from the MIDI file header
 * @param subdiv     Beatcord subdivision (1=quarter, 2=eighth, 4=sixteenth)
 * @param maxSteps   Maximum number of steps (e.g. 32)
 * @returns          StepData[] ready to assign to the sequencer store
 */
export function quantizeMidiToSteps(
  notes: MidiTrackNote[],
  ticksPerBeat: number,
  subdiv: number,
  maxSteps: number,
): StepData[] {
  const steps: StepData[] = Array.from({ length: maxSteps }, () => ({ notes: [] }));
  const ticksPerStep = ticksPerBeat / subdiv;

  for (const note of notes) {
    // Clamp MIDI range
    if (note.midi < MIDI_MIN || note.midi > MIDI_MAX) continue;

    const stepIndex = Math.round(note.startTick / ticksPerStep);
    if (stepIndex < 0 || stepIndex >= maxSteps) continue;

    const length = Math.max(1, Math.round(note.durationTicks / ticksPerStep));
    const velocity = Math.max(1, Math.min(127, note.velocity));

    // Don't add duplicate midi notes to the same step
    const step = steps[stepIndex];
    if (step.notes.some((n) => n.midi === note.midi)) continue;

    step.notes.push({ midi: note.midi, velocity, length });
  }

  return steps;
}
