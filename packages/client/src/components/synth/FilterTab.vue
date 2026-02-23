<script setup lang="ts">
import { useSynthStore } from '@/stores/synth';
import { useSequencer } from '@/composables/useSequencer';

const synth = useSynthStore();
const sequencer = useSequencer();

function commit() { sequencer.sendSynthUpdate(); }
</script>

<template>
  <div class="ctrl-group">
    <div class="ctrl-label">Cutoff</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.filterFreq" min="80" max="18000" step="10" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ Math.round(synth.filterFreq) }}Hz</span>
    </div>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Resonance</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.filterQ" min="0.1" max="20" step="0.1" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.filterQ.toFixed(1) }}</span>
    </div>
  </div>
</template>
