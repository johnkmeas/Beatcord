<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue';
import OscillatorTab from '@/components/synth/OscillatorTab.vue';
import EnvelopeTab from '@/components/synth/EnvelopeTab.vue';
import FilterTab from '@/components/synth/FilterTab.vue';
import EffectsTab from '@/components/synth/EffectsTab.vue';
import ArpeggiatorTab from '@/components/synth/ArpeggiatorTab.vue';
import MidiTab from '@/components/synth/MidiTab.vue';

const tabs = [
  { key: 'osc', label: 'Oscillator', component: markRaw(OscillatorTab) },
  { key: 'env', label: 'Envelope', component: markRaw(EnvelopeTab) },
  { key: 'filter', label: 'Filter', component: markRaw(FilterTab) },
  { key: 'fx', label: 'FX', component: markRaw(EffectsTab) },
  { key: 'arp', label: 'Arp', component: markRaw(ArpeggiatorTab) },
  { key: 'midi', label: 'MIDI', component: markRaw(MidiTab) },
] as const;

const activeTab = ref<string>('osc');
const activeComponent = shallowRef(tabs[0].component);

function selectTab(key: string) {
  activeTab.value = key;
  activeComponent.value = tabs.find((t) => t.key === key)!.component;
}
</script>

<template>
  <div class="bg-surface border-t border-border shrink-0">
    <!-- Tab bar -->
    <div class="flex border-b border-border">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="px-3.5 py-1.5 text-[9px] tracking-[0.2em] uppercase cursor-pointer border-r border-border transition-all"
        :class="activeTab === tab.key ? 'text-text bg-surface-2' : 'text-muted hover:text-text'"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </div>
    </div>
    <!-- Tab body -->
    <div class="flex items-center px-3.5 py-2.5 gap-4 overflow-x-auto min-h-[60px]">
      <component :is="activeComponent" />
    </div>
  </div>
</template>

<style scoped>
:deep(.ctrl-group) { display: flex; flex-direction: column; gap: 5px; min-width: 110px; }
:deep(.ctrl-label) { font-size: 8px; letter-spacing: 0.2em; color: #5555a0; text-transform: uppercase; }
:deep(.ctrl-row) { display: flex; align-items: center; gap: 7px; }
:deep(.ctrl-row input[type=range]) { flex: 1; min-width: 55px; cursor: pointer; height: 3px; }
:deep(.ctrl-val) { font-size: 10px; min-width: 40px; text-align: right; }
:deep(.ctrl-select) {
  background: #161624; border: 1px solid #333350; color: #ddddf0;
  font-family: 'Space Mono', monospace; font-size: 11px;
  padding: 5px 8px; cursor: pointer; outline: none; width: 100%;
}
:deep(.divider) { width: 1px; background: #252538; align-self: stretch; flex-shrink: 0; }
</style>
