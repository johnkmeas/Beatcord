import type { Ref } from 'vue';
import type { StepData } from '@beatcord/shared';
import { useSequencerStore } from '@/stores/sequencer';
import { useScaleStore } from '@/stores/scale';
import { useSynthStore } from '@/stores/synth';

// ── Constants ────────────────────────────────────────────────
export const ROW_H = 20;
export const STEP_W = 40;
export const KEY_W = 50;
export const HEADER_H = 20;
export const MIDI_MIN = 24;  // C1
export const MIDI_MAX = 108; // C8
export const TOTAL_ROWS = MIDI_MAX - MIDI_MIN + 1;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);

// ── Colors ───────────────────────────────────────────────────
const COL = {
  bg: '#080810',
  surface: '#0f0f1a',
  surface2: '#161624',
  surface3: '#1e1e2e',
  border: '#252538',
  border2: '#333350',
  text: '#ddddf0',
  muted: '#5555a0',
  accent: '#ff6b6b',
  green: '#6bcb77',
  gridLine: 'rgba(255,255,255,0.04)',
  beatLine: 'rgba(255,255,255,0.10)',
  scaleHighlight: 'rgba(255,217,61,0.04)',
  outOfScale: 'rgba(0,0,0,0.4)',
  scaleAccent: '#ffd93d',
  blackRow: 'rgba(0,0,0,0.28)',
};

function midiToLabel(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export interface PianoRollHit {
  step: number;
  midi: number;
}

export function usePianoRoll(
  canvas: Ref<HTMLCanvasElement | null>,
  scrollX: Ref<number>,
  scrollY: Ref<number>,
) {
  const seqStore = useSequencerStore();
  const scaleStore = useScaleStore();
  const synthStore = useSynthStore();

  // ── Coordinate helpers ───────────────────────────────────

  /** Total pixel width of the grid area (excluding piano keys). */
  function gridWidth(): number {
    return seqStore.stepCount * STEP_W;
  }

  /** Total pixel height of rows + header. */
  function gridHeight(): number {
    return HEADER_H + TOTAL_ROWS * ROW_H;
  }

  function midiToY(midi: number): number {
    return HEADER_H + (MIDI_MAX - midi) * ROW_H;
  }

  function stepToX(step: number): number {
    return KEY_W + step * STEP_W;
  }

  function hitTest(canvasX: number, canvasY: number): PianoRollHit | null {
    const gx = canvasX + scrollX.value - KEY_W;
    const gy = canvasY + scrollY.value - HEADER_H;
    if (gx < 0 || gy < 0) return null;
    const step = Math.floor(gx / STEP_W);
    const midi = MIDI_MAX - Math.floor(gy / ROW_H);
    if (step < 0 || step >= seqStore.stepCount) return null;
    if (midi < MIDI_MIN || midi > MIDI_MAX) return null;
    return { step, midi };
  }

  /** Test if click is in the step header area. */
  function hitTestHeader(canvasX: number, canvasY: number): number | null {
    if (canvasY + scrollY.value > HEADER_H) return null;
    const gx = canvasX + scrollX.value - KEY_W;
    if (gx < 0) return null;
    const step = Math.floor(gx / STEP_W);
    if (step < 0 || step >= seqStore.stepCount) return null;
    return step;
  }

  // ── Drawing ──────────────────────────────────────────────

  function draw(): void {
    const cvs = canvas.value;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const w = cvs.width;
    const h = cvs.height;
    const sx = scrollX.value;
    const sy = scrollY.value;

    ctx.clearRect(0, 0, w, h);

    drawRows(ctx, w, h, sx, sy);
    drawGridLines(ctx, w, h, sx, sy);
    drawNotes(ctx, w, h, sx, sy);
    drawPlayhead(ctx, h, sx, sy);
    drawPianoKeys(ctx, h, sy);
    drawStepHeader(ctx, w, sx);
  }

  function drawRows(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    sx: number, sy: number,
  ): void {
    const isChromatic = scaleStore.type === 'chromatic';
    for (let midi = MIDI_MAX; midi >= MIDI_MIN; midi--) {
      const y = midiToY(midi) - sy;
      if (y + ROW_H < 0 || y > h) continue;

      const name = NOTE_NAMES[midi % 12];
      const isBlack = BLACK_NOTES.has(name);
      const isC = name === 'C';
      const inScale = scaleStore.isInScale(midi);

      // Row background
      if (!isChromatic && !inScale) {
        ctx.fillStyle = COL.outOfScale;
        ctx.fillRect(KEY_W, y, w - KEY_W, ROW_H);
      } else if (!isChromatic && inScale) {
        ctx.fillStyle = COL.scaleHighlight;
        ctx.fillRect(KEY_W, y, w - KEY_W, ROW_H);
      } else if (isBlack) {
        ctx.fillStyle = COL.blackRow;
        ctx.fillRect(KEY_W, y, w - KEY_W, ROW_H);
      }

      // Row bottom border
      ctx.strokeStyle = isC ? COL.border2 : COL.gridLine;
      ctx.beginPath();
      ctx.moveTo(KEY_W, y + ROW_H);
      ctx.lineTo(w, y + ROW_H);
      ctx.stroke();
    }
  }

  function drawGridLines(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    sx: number, sy: number,
  ): void {
    for (let s = 0; s <= seqStore.stepCount; s++) {
      const x = stepToX(s) - sx;
      if (x < KEY_W || x > w) continue;
      ctx.strokeStyle = s % 4 === 0 ? COL.beatLine : COL.gridLine;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_H);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  function drawNotes(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    sx: number, sy: number,
  ): void {
    const color = synthStore.color;
    seqStore.steps.forEach((step: StepData, si: number) => {
      for (const n of step.notes) {
        const x = stepToX(si) - sx + 1;
        const y = midiToY(n.midi) - sy + 1;
        const nw = Math.max(4, STEP_W * (n.length || 0.8) - 2);
        const nh = ROW_H - 2;

        if (x + nw < KEY_W || x > w || y + nh < HEADER_H || y > h) continue;

        const alpha = 0.25 + (n.velocity / 127) * 0.75;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, nw, nh);

        // Border
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(x, y, nw, nh);

        // Label
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.font = 'bold 7px "Space Mono", monospace';
        ctx.fillText(midiToLabel(n.midi), x + 3, y + nh - 4);

        ctx.globalAlpha = 1;
      }
    });
  }

  function drawPlayhead(
    ctx: CanvasRenderingContext2D,
    h: number,
    sx: number,
    sy: number,
  ): void {
    if (!seqStore.playing || seqStore.currentStep < 0) return;
    const x = stepToX(seqStore.currentStep) - sx;
    if (x < KEY_W || x > ctx.canvas.width) return;

    ctx.fillStyle = COL.green;
    ctx.shadowColor = 'rgba(107,203,119,0.7)';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, 0, 2, h);
    ctx.shadowBlur = 0;
  }

  function drawPianoKeys(
    ctx: CanvasRenderingContext2D,
    h: number,
    sy: number,
  ): void {
    const isChromatic = scaleStore.type === 'chromatic';

    // Key background
    ctx.fillStyle = COL.surface;
    ctx.fillRect(0, 0, KEY_W, h);

    for (let midi = MIDI_MAX; midi >= MIDI_MIN; midi--) {
      const y = midiToY(midi) - sy;
      if (y + ROW_H < 0 || y > h) continue;

      const name = NOTE_NAMES[midi % 12];
      const oct = Math.floor(midi / 12) - 1;
      const isBlack = BLACK_NOTES.has(name);
      const isC = name === 'C';
      const inScale = scaleStore.isInScale(midi);

      // Key fill
      ctx.fillStyle = isBlack ? '#0c0c18' : COL.surface2;
      ctx.fillRect(0, y, KEY_W, ROW_H);

      // Scale indicator stripe on left
      if (!isChromatic && inScale) {
        ctx.fillStyle = COL.scaleAccent;
        ctx.fillRect(KEY_W - 3, y, 3, ROW_H);
      }

      // Dim out-of-scale keys
      if (!isChromatic && !inScale) {
        ctx.globalAlpha = 0.35;
      }

      // Key label
      let label = '';
      if (isC) label = 'C' + oct;
      else if (!isBlack) label = name;

      if (label) {
        ctx.fillStyle = isC ? COL.text : COL.muted;
        ctx.font = `${isC ? 'bold ' : ''}8px "Space Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(label, KEY_W - 5, y + ROW_H / 2 + 3);
        ctx.textAlign = 'left';
      }

      ctx.globalAlpha = 1;

      // Key bottom border
      ctx.strokeStyle = COL.border;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_H);
      ctx.lineTo(KEY_W, y + ROW_H);
      ctx.stroke();

      // C-note top accent
      if (isC) {
        ctx.strokeStyle = COL.border2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(KEY_W, y);
        ctx.stroke();
      }
    }

    // Right border of key column
    ctx.strokeStyle = COL.border;
    ctx.beginPath();
    ctx.moveTo(KEY_W, 0);
    ctx.lineTo(KEY_W, h);
    ctx.stroke();
  }

  function drawStepHeader(
    ctx: CanvasRenderingContext2D,
    w: number,
    sx: number,
  ): void {
    // Header background
    ctx.fillStyle = COL.surface2;
    ctx.fillRect(0, 0, w, HEADER_H);

    // Step cells
    for (let s = 0; s < seqStore.stepCount; s++) {
      const x = stepToX(s) - sx;
      if (x + STEP_W < KEY_W || x > w) continue;

      // Current step highlight
      if (seqStore.playing && seqStore.currentStep === s) {
        ctx.fillStyle = 'rgba(107,203,119,0.2)';
        ctx.fillRect(x, 0, STEP_W, HEADER_H);
      }

      // Cell border
      ctx.strokeStyle = s % 4 === 0 ? COL.border2 : COL.gridLine;
      ctx.beginPath();
      ctx.moveTo(x + STEP_W, 0);
      ctx.lineTo(x + STEP_W, HEADER_H);
      ctx.stroke();

      // Step number
      const textColor = (seqStore.playing && seqStore.currentStep === s)
        ? COL.green
        : (s % 4 === 0 ? COL.text : COL.muted);
      ctx.fillStyle = textColor;
      ctx.font = '8px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(s + 1), x + STEP_W / 2, 13);

      // Has-notes dot
      const step = seqStore.steps[s];
      if (step && step.notes.length > 0) {
        ctx.fillStyle = COL.accent;
        ctx.beginPath();
        ctx.arc(x + STEP_W / 2, HEADER_H - 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = 'left';
    }

    // Bottom border
    ctx.strokeStyle = COL.border2;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H);
    ctx.lineTo(w, HEADER_H);
    ctx.stroke();

    // Fill top-left corner (above keys column)
    ctx.fillStyle = COL.surface;
    ctx.fillRect(0, 0, KEY_W, HEADER_H);
  }

  return {
    draw,
    hitTest,
    hitTestHeader,
    gridWidth,
    gridHeight,
    midiToY,
    stepToX,
    ROW_H,
    STEP_W,
    KEY_W,
    HEADER_H,
    MIDI_MIN,
    MIDI_MAX,
    TOTAL_ROWS,
  };
}
