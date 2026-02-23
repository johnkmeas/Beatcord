import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StepData, StepCountOption, SubdivOption, SeqState, NoteData } from '@beatcord/shared';

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

  function toggleNote(stepIndex: number, midi: number, velocity = 100, length = 0.8) {
    const step = steps.value[stepIndex];
    if (!step) return;
    const idx = step.notes.findIndex((n) => n.midi === midi);
    if (idx >= 0) {
      step.notes.splice(idx, 1);
    } else {
      step.notes.push({ midi, velocity, length });
    }
  }

  function addNote(stepIndex: number, midi: number, velocity = 100, length = 0.8) {
    const step = steps.value[stepIndex];
    if (!step) return;
    if (step.notes.some((n) => n.midi === midi)) return;
    step.notes.push({ midi, velocity, length });
  }

  function removeNote(stepIndex: number, midi: number) {
    const step = steps.value[stepIndex];
    if (!step) return;
    const idx = step.notes.findIndex((n) => n.midi === midi);
    if (idx >= 0) step.notes.splice(idx, 1);
  }

  function setNoteVelocity(stepIndex: number, velocity: number) {
    const step = steps.value[stepIndex];
    if (!step) return;
    step.notes.forEach((n) => { n.velocity = velocity; });
  }

  function setNoteLength(stepIndex: number, length: number) {
    const step = steps.value[stepIndex];
    if (!step) return;
    step.notes.forEach((n) => { n.length = length; });
  }

  function getSeqState(): SeqState {
    return {
      steps: steps.value,
      stepCount: stepCount.value,
      bpm: bpm.value,
      subdiv: subdiv.value,
      playing: playing.value,
    };
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
    toggleNote,
    addNote,
    removeNote,
    setNoteVelocity,
    setNoteLength,
    getSeqState,
  };
});
