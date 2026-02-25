import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useWebSocket } from '@/composables/useWebSocket';
import { startScheduler, stopScheduler, setStepTickCallback } from '@/composables/schedulerEngine';
import type { SeqState, SynthState } from '@beatcord/shared';

export function useSequencer() {
  const seqStore = useSequencerStore();
  const synthStore = useSynthStore();
  const globals = useGlobalSettingsStore();
  const { send } = useWebSocket();

  // Wire up step_tick broadcasting through the callback
  setStepTickCallback((step, hasNotes) => {
    send({ type: 'step_tick', step, hasNotes });
  });

  // ── Transport controls ─────────────────────────────────────

  function start() {
    globals.updateAndBroadcast({ playing: true });
    startScheduler();
    sendSeqUpdate();
  }

  function stop() {
    stopScheduler();
    globals.updateAndBroadcast({ playing: false });
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
