import { ref } from 'vue';
import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useWebSocket } from '@/composables/useWebSocket';
import type { SeqState, SynthState } from '@beatcord/shared';

const LOOKAHEAD = 0.1;        // schedule 100ms into the future
const SCHEDULE_INTERVAL = 25;  // check every 25ms

export function useSequencer() {
  const seqStore = useSequencerStore();
  const synthStore = useSynthStore();
  const audio = useAudioEngine();
  const { send } = useWebSocket();

  let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  let nextStepTime = 0;
  let scheduledStep = 0;

  // ── Scheduler ──────────────────────────────────────────────

  function scheduler() {
    const ctx = audio.audioCtx.value;
    if (!ctx) return;

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
        audio.playStep(step, synthSnap, nextStepTime, seqStore.bpm, seqStore.subdiv);

        // Broadcast step_tick slightly ahead of actual play time
        const delay = Math.max(0, (nextStepTime - ctx.currentTime) * 1000);
        const hasNotes = step.notes.length > 0;
        setTimeout(() => {
          seqStore.currentStep = stepIndex;
          send({
            type: 'step_tick',
            step: stepIndex,
            hasNotes,
          });
        }, delay);
      }

      // Advance
      const stepDuration = (60 / seqStore.bpm) / (seqStore.subdiv / 4);
      nextStepTime += stepDuration;
      scheduledStep = (scheduledStep + 1) % seqStore.stepCount;
    }

    schedulerTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
  }

  // ── Transport controls ─────────────────────────────────────

  function start() {
    const ctx = audio.init();
    seqStore.playing = true;
    scheduledStep = 0;
    seqStore.currentStep = -1;
    nextStepTime = ctx.currentTime;
    scheduler();
    sendSeqUpdate();
  }

  function stop() {
    if (schedulerTimer) { clearTimeout(schedulerTimer); schedulerTimer = null; }
    seqStore.playing = false;
    seqStore.currentStep = -1;
    sendSeqUpdate();
  }

  function toggle() {
    if (seqStore.playing) stop();
    else start();
  }

  // ── State broadcasting ─────────────────────────────────────

  function getSeqState(): SeqState {
    return {
      steps: seqStore.steps,
      stepCount: seqStore.stepCount,
      bpm: seqStore.bpm,
      subdiv: seqStore.subdiv,
      playing: seqStore.playing,
    };
  }

  function getSynthState(): SynthState {
    return {
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
  }

  function sendSeqUpdate() {
    send({ type: 'sequencer_update', seq: getSeqState() });
  }

  function sendSynthUpdate() {
    send({ type: 'synth_update', synth: getSynthState() });
  }

  return {
    start,
    stop,
    toggle,
    sendSeqUpdate,
    sendSynthUpdate,
    getSeqState,
    getSynthState,
  };
}
