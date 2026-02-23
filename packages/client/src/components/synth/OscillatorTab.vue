<script setup lang="ts">
import { useSynthStore } from '@/stores/synth';
import { useSequencer } from '@/composables/useSequencer';
import type { Waveform } from '@beatcord/shared';

const synth = useSynthStore();
const sequencer = useSequencer();

function onWaveformChange(e: Event) {
  synth.waveform = (e.target as HTMLSelectElement).value as Waveform;
  sequencer.sendSynthUpdate();
}

function onVolumeInput(e: Event) {
  synth.volume = parseFloat((e.target as HTMLInputElement).value);
}
function onVolumeChange() {
  sequencer.sendSynthUpdate();
}
</script>

<template>
  <div class="ctrl-group">
    <div class="ctrl-label">Waveform</div>
    <select class="ctrl-select" :value="synth.waveform" @change="onWaveformChange">
      <option>sawtooth</option>
      <option>square</option>
      <option>sine</option>
      <option>triangle</option>
    </select>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Volume</div>
    <div class="ctrl-row">
      <input type="range" :value="synth.volume" min="0" max="1" step="0.01" class="accent-accent" @input="onVolumeInput" @change="onVolumeChange" />
      <span class="ctrl-val">{{ synth.volume.toFixed(2) }}</span>
    </div>
  </div>
</template>
