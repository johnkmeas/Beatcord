import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StepData, StepCountOption, SubdivOption } from '@beatcord/shared';

function makeSteps(count: number): StepData[] {
  return Array.from({ length: count }, () => ({ notes: [] }));
}

export const useSequencerStore = defineStore('sequencer', () => {
  const steps = ref<StepData[]>(makeSteps(16));
  const stepCount = ref<StepCountOption>(16);
  const bpm = ref(120);
  const subdiv = ref<SubdivOption>(4);
  const playing = ref(false);
  const currentStep = ref(-1);

  function clear() {
    steps.value = makeSteps(stepCount.value);
    currentStep.value = -1;
  }

  function setStepCount(count: StepCountOption) {
    const old = steps.value.slice();
    stepCount.value = count;
    steps.value = makeSteps(count);
    for (let i = 0; i < Math.min(old.length, count); i++) {
      steps.value[i] = old[i];
    }
  }

  return {
    steps,
    stepCount,
    bpm,
    subdiv,
    playing,
    currentStep,
    clear,
    setStepCount,
  };
});
