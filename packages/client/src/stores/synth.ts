import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Waveform } from '@beatcord/shared';

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
  };
});
