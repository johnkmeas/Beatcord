<script setup lang="ts">
import { useScaleStore, NOTE_NAMES, SCALE_NAMES } from '@/stores/scale';

const scale = useScaleStore();
const scaleKeys = Object.keys(SCALE_NAMES);
</script>

<template>
  <!-- Root -->
  <div class="flex items-center gap-1.5 text-[10px] text-muted">
    ROOT
    <select
      class="bg-surface-2 border border-border-2 text-text font-mono text-[10px] px-2 py-1 outline-none cursor-pointer"
      :value="NOTE_NAMES[scale.root]"
      @change="scale.root = NOTE_NAMES.indexOf(($event.target as HTMLSelectElement).value as typeof NOTE_NAMES[number])"
    >
      <option v-for="(n, i) in NOTE_NAMES" :key="i">{{ n }}</option>
    </select>
  </div>
  <!-- Scale -->
  <div class="flex items-center gap-1.5 text-[10px] text-muted">
    SCALE
    <select
      v-model="scale.type"
      class="bg-surface-2 border border-border-2 text-text font-mono text-[10px] px-2 py-1 outline-none cursor-pointer min-w-[110px]"
    >
      <option v-for="key in scaleKeys" :key="key" :value="key">{{ SCALE_NAMES[key] }}</option>
    </select>
  </div>
</template>
