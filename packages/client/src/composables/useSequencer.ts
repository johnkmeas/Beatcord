import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useArpeggiatorStore } from '@/stores/arpeggiator';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useWebSocket } from '@/composables/useWebSocket';
import { generateArpNotes } from '@/composables/useArpeggiator';
import type { SeqState, SynthState } from '@beatcord/shared';

const LOOKAHEAD = 0.1;        // schedule 100ms into the future
const SCHEDULE_INTERVAL = 25;  // check every 25ms

export function useSequencer() {
  const seqStore = useSequencerStore();
  const synthStore = useSynthStore();
  const globals = useGlobalSettingsStore();
  const arpStore = useArpeggiatorStore();
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
      const stepDuration = (60 / globals.bpm) / (seqStore.subdiv / 4);
      nextStepTime += stepDuration;
      scheduledStep = (scheduledStep + 1) % globals.stepCount;
    }

    schedulerTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
  }

  // ── Transport controls ─────────────────────────────────────

  function start() {
    const ctx = audio.init();
    globals.updateAndBroadcast({ playing: true });
    scheduledStep = 0;
    seqStore.currentStep = -1;
    nextStepTime = ctx.currentTime;
    scheduler();
    sendSeqUpdate();
  }

  function stop() {
    if (schedulerTimer) { clearTimeout(schedulerTimer); schedulerTimer = null; }
    globals.updateAndBroadcast({ playing: false });
    seqStore.currentStep = -1;
    sendSeqUpdate();
  }

  function toggle() {
    if (globals.playing) stop();
    else start();
  }

  // ── State broadcasting ─────────────────────────────────────

  function getSeqState(): SeqState {
    return {
      steps: seqStore.steps,
      stepCount: globals.stepCount,
      bpm: globals.bpm,
      subdiv: seqStore.subdiv,
      playing: globals.playing,
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
