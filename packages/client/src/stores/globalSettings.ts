import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GlobalSettings, StepCountOption } from '@beatcord/shared';
import { useWebSocket } from '@/composables/useWebSocket';

export const useGlobalSettingsStore = defineStore('globalSettings', () => {
  const playing = ref(false);
  const bpm = ref(120);
  const stepCount = ref<StepCountOption>(16);
  const rootNote = ref(0);
  const scaleType = ref('chromatic');
  const masterVolume = ref(0.8);

  /** Apply full settings received from the server. */
  function applyFromServer(settings: GlobalSettings) {
    playing.value = settings.playing;
    bpm.value = settings.bpm;
    stepCount.value = settings.stepCount;
    rootNote.value = settings.rootNote;
    scaleType.value = settings.scaleType;
    masterVolume.value = settings.masterVolume;
  }

  /** Update one or more fields locally and broadcast to server. */
  function updateAndBroadcast(partial: Partial<GlobalSettings>) {
    if (partial.playing !== undefined) playing.value = partial.playing;
    if (partial.bpm !== undefined) bpm.value = partial.bpm;
    if (partial.stepCount !== undefined) stepCount.value = partial.stepCount;
    if (partial.rootNote !== undefined) rootNote.value = partial.rootNote;
    if (partial.scaleType !== undefined) scaleType.value = partial.scaleType;
    if (partial.masterVolume !== undefined) masterVolume.value = partial.masterVolume;

    const { send } = useWebSocket();
    send({ type: 'global_settings_update', settings: partial });
  }

  function getSnapshot(): GlobalSettings {
    return {
      playing: playing.value,
      bpm: bpm.value,
      stepCount: stepCount.value,
      rootNote: rootNote.value,
      scaleType: scaleType.value,
      masterVolume: masterVolume.value,
    };
  }

  return {
    playing,
    bpm,
    stepCount,
    rootNote,
    scaleType,
    masterVolume,
    applyFromServer,
    updateAndBroadcast,
    getSnapshot,
  };
});
