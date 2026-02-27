import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Waveform, SynthState } from '@beatcord/shared';

export const useSynthStore = defineStore('synth', () => {
  const waveform = ref<Waveform>('sawtooth');
  const attack = ref(0.005);
  const decay = ref(0.12);
  const sustain = ref(0.5);
  const release = ref(0.4);
  const filterFreq = ref(3000);
  const filterQ = ref(1.5);
  const volume = ref(0.7);
  const color = ref('#ff6b6b');
  const delayTime = ref(0.3);
  const delayFeedback = ref(0.3);
  const delayMix = ref(0);
  const reverbMix = ref(0);
  const reverbDecay = ref(1.5);

  function getSynthState(): SynthState {
    return {
      waveform: waveform.value,
      attack: attack.value,
      decay: decay.value,
      sustain: sustain.value,
      release: release.value,
      filterFreq: filterFreq.value,
      filterQ: filterQ.value,
      volume: volume.value,
      color: color.value,
      delayTime: delayTime.value,
      delayFeedback: delayFeedback.value,
      delayMix: delayMix.value,
      reverbMix: reverbMix.value,
      reverbDecay: reverbDecay.value,
    };
  }

  return {
    waveform,
    attack,
    decay,
    sustain,
    release,
    filterFreq,
    filterQ,
    volume,
    color,
    delayTime,
    delayFeedback,
    delayMix,
    reverbMix,
    reverbDecay,
    getSynthState,
  };
});
