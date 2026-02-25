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

  function toggleNote(stepIndex: number, midi: number, velocity = 100, length = 1) {
    const step = steps.value[stepIndex];
    if (!step) return;
    const idx = step.notes.findIndex((n) => n.midi === midi);
    if (idx >= 0) {
      step.notes.splice(idx, 1);
    } else {
      step.notes.push({ midi, velocity, length });
    }
  }

  function addNote(stepIndex: number, midi: number, velocity = 100, length = 1) {
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

  /** Set the length of a single note (identified by step + midi). */
  function setSingleNoteLength(stepIndex: number, midi: number, length: number) {
    const step = steps.value[stepIndex];
    if (!step) return;
    const note = step.notes.find((n) => n.midi === midi);
    if (note) note.length = Math.max(1, length);
  }

  /** Move a note from one step to another. */
  function moveNote(fromStep: number, midi: number, toStep: number) {
    if (fromStep === toStep) return;
    const src = steps.value[fromStep];
    const dst = steps.value[toStep];
    if (!src || !dst) return;
    const idx = src.notes.findIndex((n) => n.midi === midi);
    if (idx < 0) return;
    const [note] = src.notes.splice(idx, 1);
    // Replace if note already exists at destination
    const dstIdx = dst.notes.findIndex((n) => n.midi === midi);
    if (dstIdx >= 0) dst.notes[dstIdx] = note;
    else dst.notes.push(note);
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
    setSingleNoteLength,
    moveNote,
    getSeqState,
  };
});
