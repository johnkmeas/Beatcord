/**
 * Scheduler engine — module-level singleton managing the lookahead scheduler.
 *
 * This module intentionally does NOT import useWebSocket to avoid circular
 * dependencies. Both useSequencer (which imports useWebSocket) and
 * useWebSocket (which handles remote state) can safely import this module.
 */

import { useSequencerStore } from '@/stores/sequencer';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useArpeggiatorStore } from '@/stores/arpeggiator';
import { useSynthStore } from '@/stores/synth';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { generateArpNotes } from '@/composables/useArpeggiator';
import type { SynthState } from '@beatcord/shared';

const LOOKAHEAD = 0.1;        // schedule 100ms into the future
const SCHEDULE_INTERVAL = 25;  // check every 25ms

// ── Module-level singleton state ──────────────────────────────
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let nextStepTime = 0;
let scheduledStep = 0;

/** Callback to send a step_tick message — set by useSequencer to avoid circular dep. */
let onStepTick: ((step: number, hasNotes: boolean) => void) | null = null;

export function setStepTickCallback(cb: (step: number, hasNotes: boolean) => void): void {
  onStepTick = cb;
}

function scheduler(): void {
  const audio = useAudioEngine();
  const ctx = audio.audioCtx.value;
  if (!ctx) return;

  const seqStore = useSequencerStore();
  const globals = useGlobalSettingsStore();
  const synthStore = useSynthStore();
  const arpStore = useArpeggiatorStore();

  while (nextStepTime < ctx.currentTime + LOOKAHEAD) {
    const stepIndex = scheduledStep;
    const step = seqStore.steps[stepIndex];

    // Schedule audio at exact Web Audio time
    if (step) {
      const synthSnap: SynthState = {
        waveform: synthStore.waveform,
        attack: synthStore.attack,
        decay: synthStore.decay,
        sustain: synthStore.sustain,
        release: synthStore.release,
        filterFreq: synthStore.filterFreq,
        filterQ: synthStore.filterQ,
        volume: synthStore.volume,
        color: synthStore.color,
      };

      if (arpStore.enabled && step.notes.length > 0) {
        // Arpeggiate: schedule individual sub-notes
        const arpEvents = generateArpNotes(
          step.notes,
          arpStore.pattern,
          arpStore.rate,
          arpStore.octaveRange,
          arpStore.gate,
          arpStore.swing,
          globals.bpm,
          seqStore.subdiv,
        );
        for (const ev of arpEvents) {
          audio.playNote(
            ev.midi,
            ev.velocity,
            ev.duration,
            synthSnap,
            nextStepTime + ev.offset,
            globals.masterVolume,
          );
        }
      } else {
        audio.playStep(step, synthSnap, nextStepTime, globals.bpm, seqStore.subdiv, globals.masterVolume);
      }

      // Broadcast step_tick slightly ahead of actual play time
      const delay = Math.max(0, (nextStepTime - ctx.currentTime) * 1000);
      const hasNotes = step.notes.length > 0;
      const capturedStep = stepIndex;
      setTimeout(() => {
        seqStore.currentStep = capturedStep;
        onStepTick?.(capturedStep, hasNotes);
      }, delay);
    }

    // Advance
    const stepDuration = (60 / globals.bpm) / (seqStore.subdiv / 4);
    nextStepTime += stepDuration;
    scheduledStep = (scheduledStep + 1) % globals.stepCount;
  }

  schedulerTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

// ── Public API ────────────────────────────────────────────────

export function startScheduler(): void {
  const audio = useAudioEngine();
  const ctx = audio.init();
  const seqStore = useSequencerStore();

  scheduledStep = 0;
  seqStore.currentStep = -1;
  nextStepTime = ctx.currentTime;
  scheduler();
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  const seqStore = useSequencerStore();
  seqStore.currentStep = -1;
}

export function isSchedulerRunning(): boolean {
  return schedulerTimer !== null;
}
