import type { NoteData, ArpPattern, ArpRate } from '@beatcord/shared';

/** A single note event scheduled at a specific time offset within a step. */
export interface ArpEvent {
  midi: number;
  velocity: number;
  /** Duration of this sub-note in seconds. */
  duration: number;
  /** Time offset from the start of the step in seconds. */
  offset: number;
}

// ── Rate → subdivisions-per-beat mapping ─────────────────────
const RATE_DIVISORS: Record<ArpRate, number> = {
  '1/4':   1,
  '1/8':   2,
  '1/8t':  3,
  '1/16':  4,
  '1/16t': 6,
  '1/32':  8,
};

// ── Pattern orderings ────────────────────────────────────────

function orderUp(midis: number[]): number[] {
  return [...midis].sort((a, b) => a - b);
}

function orderDown(midis: number[]): number[] {
  return [...midis].sort((a, b) => b - a);
}

function orderUpDown(midis: number[]): number[] {
  const up = orderUp(midis);
  if (up.length <= 1) return up;
  return [...up, ...up.slice(1, -1).reverse()];
}

function orderDownUp(midis: number[]): number[] {
  const down = orderDown(midis);
  if (down.length <= 1) return down;
  return [...down, ...down.slice(1, -1).reverse()];
}

function orderConverge(midis: number[]): number[] {
  const sorted = orderUp(midis);
  const result: number[] = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    result.push(sorted[lo]);
    if (lo !== hi) result.push(sorted[hi]);
    lo++;
    hi--;
  }
  return result;
}

function orderDiverge(midis: number[]): number[] {
  const sorted = orderUp(midis);
  const result: number[] = [];
  const mid = Math.floor(sorted.length / 2);
  let lo = mid;
  let hi = mid;
  let goLo = true;
  while (lo >= 0 || hi < sorted.length) {
    if (goLo && lo >= 0) {
      result.push(sorted[lo]);
      lo--;
    } else if (hi < sorted.length) {
      result.push(sorted[hi]);
      hi++;
    }
    goLo = !goLo;
  }
  return result;
}

function orderRandom(midis: number[]): number[] {
  const arr = [...midis];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function applyPattern(midis: number[], pattern: ArpPattern): number[] {
  switch (pattern) {
    case 'up':       return orderUp(midis);
    case 'down':     return orderDown(midis);
    case 'up-down':  return orderUpDown(midis);
    case 'down-up':  return orderDownUp(midis);
    case 'converge': return orderConverge(midis);
    case 'diverge':  return orderDiverge(midis);
    case 'random':   return orderRandom(midis);
    default:         return orderUp(midis);
  }
}

// ── Octave expansion ─────────────────────────────────────────

function expandOctaves(midis: number[], octaveRange: number): number[] {
  if (octaveRange <= 1) return midis;
  const expanded: number[] = [];
  for (let oct = 0; oct < octaveRange; oct++) {
    for (const m of midis) {
      const shifted = m + oct * 12;
      if (shifted <= 127) expanded.push(shifted);
    }
  }
  return expanded;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Generate arpeggiated note events for a single step.
 *
 * Pure function — no side effects, easy to test.
 *
 * @param notes       The notes placed on the step
 * @param pattern     Arp ordering mode
 * @param rate        Sub-division rate
 * @param octaveRange Number of octaves to span (1–4)
 * @param gate        Note gate (fraction of sub-step, 0.1–1.0)
 * @param swing       Swing amount (0–0.5)
 * @param bpm         Current BPM
 * @param subdiv      Step subdivision (1/2/4)
 * @returns           Array of ArpEvents with offsets relative to step start
 */
export function generateArpNotes(
  notes: NoteData[],
  pattern: ArpPattern,
  rate: ArpRate,
  octaveRange: number,
  gate: number,
  swing: number,
  bpm: number,
  subdiv: number,
): ArpEvent[] {
  if (notes.length === 0) return [];

  // Step duration in seconds
  const stepDur = (60 / bpm) / (subdiv / 4);

  // Sub-step duration based on arp rate relative to a beat (quarter note)
  const beatDur = 60 / bpm;
  const subStepDur = beatDur / RATE_DIVISORS[rate];

  // How many sub-steps fit in one sequencer step
  const subStepCount = Math.max(1, Math.floor(stepDur / subStepDur));

  // Build the note sequence
  const baseMidis = notes.map((n) => n.midi);
  const expanded = expandOctaves(baseMidis, octaveRange);
  const ordered = applyPattern(expanded, pattern);
  if (ordered.length === 0) return [];

  // Average velocity from the original notes
  const avgVel = Math.round(notes.reduce((s, n) => s + n.velocity, 0) / notes.length);

  const events: ArpEvent[] = [];
  for (let i = 0; i < subStepCount; i++) {
    const midi = ordered[i % ordered.length];
    const baseOffset = i * subStepDur;
    // Apply swing: every other note is pushed forward
    const swingOffset = (i % 2 === 1) ? swing * subStepDur : 0;
    const offset = baseOffset + swingOffset;
    const duration = subStepDur * gate;

    // Don't schedule past the step boundary
    if (offset >= stepDur) break;

    events.push({
      midi,
      velocity: avgVel,
      duration: Math.min(duration, stepDur - offset),
      offset,
    });
  }

  return events;
}

export function useArpeggiator() {
  return { generateArpNotes };
}
