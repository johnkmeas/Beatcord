<script setup lang="ts">
import { useSynthStore } from '@/stores/synth';
import { useSequencer } from '@/composables/useSequencer';
import { useAudioEngine } from '@/composables/useAudioEngine';

const synth = useSynthStore();
const sequencer = useSequencer();
const audio = useAudioEngine();

function commit() {
  audio.updateEffects(synth.getSynthState());
  sequencer.sendSynthUpdate();
}
</script>

<template>
  <!-- Delay Time -->
  <div class="ctrl-group">
    <div class="ctrl-label">Delay Time</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.delayTime" min="0.01" max="1" step="0.01" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.delayTime.toFixed(2) }}s</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Delay Feedback -->
  <div class="ctrl-group">
    <div class="ctrl-label">Delay FB</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.delayFeedback" min="0" max="0.9" step="0.01" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.delayFeedback.toFixed(2) }}</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Delay Mix -->
  <div class="ctrl-group">
    <div class="ctrl-label">Delay Mix</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.delayMix" min="0" max="1" step="0.01" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ (synth.delayMix * 100).toFixed(0) }}%</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Reverb Mix -->
  <div class="ctrl-group">
    <div class="ctrl-label">Reverb Mix</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.reverbMix" min="0" max="1" step="0.01" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ (synth.reverbMix * 100).toFixed(0) }}%</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Reverb Decay -->
  <div class="ctrl-group">
    <div class="ctrl-label">Reverb Decay</div>
    <div class="ctrl-row">
      <input type="range" v-model.number="synth.reverbDecay" min="0.1" max="5" step="0.1" class="accent-accent" @change="commit" />
      <span class="ctrl-val">{{ synth.reverbDecay.toFixed(1) }}s</span>
    </div>
  </div>
</template>
