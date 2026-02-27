<script setup lang="ts">
import { watch } from 'vue';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { NOTE_NAMES, SCALE_NAMES } from '@/stores/scale';
import { useScale } from '@/composables/useScale';
import { useSequencerStore } from '@/stores/sequencer';
import { useSequencer } from '@/composables/useSequencer';

const globals = useGlobalSettingsStore();
const scaleKeys = Object.keys(SCALE_NAMES);
const { snapToScale } = useScale();
const seqStore = useSequencerStore();
const sequencer = useSequencer();

function onRootChange(e: Event) {
  const name = (e.target as HTMLSelectElement).value as typeof NOTE_NAMES[number];
  globals.updateAndBroadcast({ rootNote: NOTE_NAMES.indexOf(name) });
}

function onScaleChange(e: Event) {
  globals.updateAndBroadcast({ scaleType: (e.target as HTMLSelectElement).value });
}

watch(
  [() => globals.rootNote, () => globals.scaleType],
  ([, newScale]) => {
    if (newScale === 'chromatic') return;

    let changed = false;
    seqStore.steps.forEach((step, stepIndex) => {
      const snapshot = [...step.notes];
      for (const note of snapshot) {
        const snapped = snapToScale(note.midi);
        if (snapped !== note.midi) {
          seqStore.removeNote(stepIndex, note.midi);
          seqStore.addNote(stepIndex, snapped, note.velocity, note.length);
          changed = true;
        }
      }
    });

    if (changed) sequencer.sendSeqUpdate();
  },
);
</script>

<template>
  <!-- Root (global) -->
  <div class="flex items-center gap-1.5 text-[10px] text-muted">
    ROOT
    <select
      class="bg-surface-2 border border-border-2 text-text font-mono text-[10px] px-2 py-1 outline-none cursor-pointer"
      :value="NOTE_NAMES[globals.rootNote]"
      @change="onRootChange"
    >
      <option v-for="(n, i) in NOTE_NAMES" :key="i">{{ n }}</option>
    </select>
  </div>
  <!-- Scale (global) -->
  <div class="flex items-center gap-1.5 text-[10px] text-muted">
    SCALE
    <select
      class="bg-surface-2 border border-border-2 text-text font-mono text-[10px] px-2 py-1 outline-none cursor-pointer min-w-[110px]"
      :value="globals.scaleType"
      @change="onScaleChange"
    >
      <option v-for="key in scaleKeys" :key="key" :value="key">{{ SCALE_NAMES[key] }}</option>
    </select>
  </div>
</template>
