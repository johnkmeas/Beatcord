<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useSequencerStore } from '@/stores/sequencer';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useScaleStore } from '@/stores/scale';
import { useSynthStore } from '@/stores/synth';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useSequencer } from '@/composables/useSequencer';
import { usePianoRoll, MIDI_MAX, ROW_H, KEY_W, HEADER_H, STEP_W } from '@/composables/usePianoRoll';
import type { NoteEdgeHit } from '@/composables/usePianoRoll';

const emit = defineEmits<{
  (e: 'open-editor', stepIndex: number, rect: DOMRect): void;
}>();

const seqStore = useSequencerStore();
const globals = useGlobalSettingsStore();
const scaleStore = useScaleStore();
const synthStore = useSynthStore();
const audio = useAudioEngine();
const sequencer = useSequencer();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
const scrollX = ref(0);
const scrollY = ref(0);

const pianoRoll = usePianoRoll(canvasRef, scrollX, scrollY);

// ── Resize drag state ──────────────────────────────────────
const isResizing = ref(false);
const resizeEdge = ref<NoteEdgeHit | null>(null);
const resizeStartX = ref(0);
const resizeOrigLength = ref(1);

// ── Rendering ──────────────────────────────────────────────

let rafId = 0;

function renderLoop() {
  pianoRoll.draw();
  if (globals.playing) {
    rafId = requestAnimationFrame(renderLoop);
  }
}

function requestDraw() {
  pianoRoll.draw();
}

// Start/stop RAF loop when playing state changes
watch(() => globals.playing, (playing) => {
  if (playing) {
    rafId = requestAnimationFrame(renderLoop);
  } else {
    cancelAnimationFrame(rafId);
    requestDraw();
  }
});

// Redraw on relevant state changes
watch(
  [
    () => seqStore.steps,
    () => seqStore.stepCount,
    () => seqStore.currentStep,
    () => scaleStore.type,
    () => scaleStore.root,
    () => synthStore.color,
  ],
  () => {
    if (!seqStore.playing) requestDraw();
  },
  { deep: true },
);

// ── Resize ─────────────────────────────────────────────────

function resize() {
  const cvs = canvasRef.value;
  const wrap = wrapperRef.value;
  if (!cvs || !wrap) return;

  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  cvs.width = w * dpr;
  cvs.height = h * dpr;
  cvs.style.width = w + 'px';
  cvs.style.height = h + 'px';

  const ctx = cvs.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);

  requestDraw();
}

let resizeObs: ResizeObserver | null = null;

onMounted(() => {
  resize();
  resizeObs = new ResizeObserver(resize);
  if (wrapperRef.value) resizeObs.observe(wrapperRef.value);

  // Scroll to C4 on initial load
  nextTick(() => {
    const c4y = HEADER_H + (MIDI_MAX - 60) * ROW_H;
    const wrapH = wrapperRef.value?.clientHeight ?? 400;
    scrollY.value = Math.max(0, c4y - wrapH / 2);
    requestDraw();
  });
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  resizeObs?.disconnect();
});

// ── Scroll ─────────────────────────────────────────────────

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const maxX = Math.max(0, pianoRoll.gridWidth() + KEY_W - (wrapperRef.value?.clientWidth ?? 0));
  const maxY = Math.max(0, pianoRoll.gridHeight() - (wrapperRef.value?.clientHeight ?? 0));
  scrollX.value = Math.max(0, Math.min(maxX, scrollX.value + e.deltaX));
  scrollY.value = Math.max(0, Math.min(maxY, scrollY.value + e.deltaY));
  if (!globals.playing) requestDraw();
}

// ── Pointer events

function onPointerDown(e: PointerEvent) {
  if (e.button === 2) return; // handled by context menu

  const cvs = canvasRef.value;
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const cx = (e.clientX - rect.left);
  const cy = (e.clientY - rect.top);

  // Check for note edge resize
  const edgeHit = pianoRoll.hitTestNoteEdge(cx, cy);
  if (edgeHit) {
    isResizing.value = true;
    resizeEdge.value = edgeHit;
    resizeStartX.value = e.clientX;
    const step = seqStore.steps[edgeHit.step];
    const note = step?.notes.find((n) => n.midi === edgeHit.midi);
    resizeOrigLength.value = note?.length ?? 1;
    cvs.setPointerCapture(e.pointerId);
    return;
  }

  // Check header click
  const headerStep = pianoRoll.hitTestHeader(cx, cy);
  if (headerStep !== null) return; // header clicks don't toggle notes

  const hit = pianoRoll.hitTest(cx, cy);
  if (!hit) return;
  if (!scaleStore.isInScale(hit.midi)) return;

  audio.init();
  seqStore.toggleNote(hit.step, hit.midi);

  // Play preview if note was added
  const step = seqStore.steps[hit.step];
  if (step && step.notes.some((n) => n.midi === hit.midi)) {
    audio.playNoteNow(hit.midi, synthStore.$state as any);
  }

  sequencer.sendSeqUpdate();
  if (!globals.playing) requestDraw();
}

function onPointerMove(e: PointerEvent) {
  const cvs = canvasRef.value;
  if (!cvs) return;

  if (isResizing.value && resizeEdge.value) {
    const deltaX = e.clientX - resizeStartX.value;
    const deltaSteps = Math.round(deltaX / STEP_W);
    let newLength: number;

    if (resizeEdge.value.edge === 'right') {
      newLength = resizeOrigLength.value + deltaSteps;
    } else {
      newLength = resizeOrigLength.value - deltaSteps;
    }

    newLength = Math.max(1, Math.min(newLength, seqStore.stepCount - resizeEdge.value.step));
    seqStore.setSingleNoteLength(resizeEdge.value.step, resizeEdge.value.midi, newLength);
    if (!globals.playing) requestDraw();
    return;
  }

  // Cursor hint: show ew-resize when hovering a note edge
  const rect = cvs.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const edge = pianoRoll.hitTestNoteEdge(cx, cy);
  cvs.style.cursor = edge ? 'ew-resize' : 'crosshair';
}

function onPointerUp(e: PointerEvent) {
  if (isResizing.value) {
    isResizing.value = false;
    resizeEdge.value = null;
    sequencer.sendSeqUpdate();
    if (!globals.playing) requestDraw();
    const cvs = canvasRef.value;
    if (cvs) cvs.releasePointerCapture(e.pointerId);
  }
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  const cvs = canvasRef.value;
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const headerStep = pianoRoll.hitTestHeader(cx, cy);
  if (headerStep !== null) {
    // Emit editor open at the step header position
    const stepX = pianoRoll.stepToX(headerStep) - scrollX.value + rect.left;
    const editorRect = new DOMRect(stepX, rect.top + HEADER_H, pianoRoll.STEP_W, 0);
    emit('open-editor', headerStep, editorRect);
    return;
  }

  // Context-menu on note block removes it
  const hit = pianoRoll.hitTest(cx, cy);
  if (hit) {
    seqStore.removeNote(hit.step, hit.midi);
    sequencer.sendSeqUpdate();
    if (!globals.playing) requestDraw();
  }
}
</script>

<template>
  <div
    ref="wrapperRef"
    class="flex-1 overflow-hidden relative bg-bg"
    @wheel.prevent="onWheel"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0 cursor-crosshair"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @contextmenu="onContextMenu"
    />
  </div>
</template>
