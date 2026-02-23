<script setup lang="ts">
import { useSynthStore } from '@/stores/synth';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useSequencer } from '@/composables/useSequencer';
import type { Waveform } from '@beatcord/shared';

const synth = useSynthStore();
const globals = useGlobalSettingsStore();
const sequencer = useSequencer();

function onWaveformChange(e: Event) {
  synth.waveform = (e.target as HTMLSelectElement).value as Waveform;
  sequencer.sendSynthUpdate();
}

function onMyVolumeInput(e: Event) {
  synth.volume = parseFloat((e.target as HTMLInputElement).value);
}
function onMyVolumeChange() {
  sequencer.sendSynthUpdate();
}

function onMasterVolumeInput(e: Event) {
  globals.updateAndBroadcast({ masterVolume: parseFloat((e.target as HTMLInputElement).value) });
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
    <div class="ctrl-label">My Vol</div>
    <div class="ctrl-row">
      <input type="range" :value="synth.volume" min="0" max="1" step="0.01" class="accent-accent" @input="onMyVolumeInput" @change="onMyVolumeChange" />
      <span class="ctrl-val">{{ synth.volume.toFixed(2) }}</span>
    </div>
  </div>
  <div class="divider" />
  <div class="ctrl-group">
    <div class="ctrl-label">Master Vol</div>
    <div class="ctrl-row">
      <input type="range" :value="globals.masterVolume" min="0" max="1" step="0.01" class="accent-green" @input="onMasterVolumeInput" />
      <span class="ctrl-val">{{ globals.masterVolume.toFixed(2) }}</span>
    </div>
  </div>
</template>
