<script setup lang="ts">
import { useSynthStore } from '@/stores/synth';
import { useSequencer } from '@/composables/useSequencer';

const synth = useSynthStore();
const sequencer = useSequencer();

function commit() { sequencer.sendSynthUpdate(); }
</script>

<template>
  <div class="ctrl-group">
    <div class="ctrl-label">Attack</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.attack" min="0.001" max="2" step="0.001" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.attack.toFixed(3) }}s</span>
    </div>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Decay</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.decay" min="0.001" max="2" step="0.001" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.decay.toFixed(3) }}s</span>
    </div>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Sustain</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.sustain" min="0" max="1" step="0.01" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.sustain.toFixed(2) }}</span>
    </div>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Release</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.release" min="0.001" max="4" step="0.001" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.release.toFixed(3) }}s</span>
    </div>
  </div>
</template>
