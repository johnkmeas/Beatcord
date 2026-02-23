<script setup lang="ts">
import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useSessionStore } from '@/stores/session';
import { useSequencer } from '@/composables/useSequencer';
import type { StepCountOption, SubdivOption } from '@beatcord/shared';
import ScaleSelector from '@/components/sequencer/ScaleSelector.vue';

const seq = useSequencerStore();
const synth = useSynthStore();
const session = useSessionStore();
const sequencer = useSequencer();

function onBpmChange(e: Event) {
  seq.bpm = parseInt((e.target as HTMLInputElement).value);
  if (seq.playing) { sequencer.stop(); sequencer.start(); }
  sequencer.sendSeqUpdate();
}

function onStepCountChange(e: Event) {
  const count = parseInt((e.target as HTMLSelectElement).value) as StepCountOption;
  seq.setStepCount(count);
  if (seq.playing) sequencer.stop();
  sequencer.sendSeqUpdate();
}

function onSubdivChange(e: Event) {
  seq.subdiv = parseInt((e.target as HTMLSelectElement).value) as SubdivOption;
  if (seq.playing) { sequencer.stop(); sequencer.start(); }
  sequencer.sendSeqUpdate();
}

function onClear() {
  seq.clear();
  sequencer.sendSeqUpdate();
}
</script>

<template>
  <div class="flex items-center gap-2.5 flex-wrap px-3.5 py-2 bg-surface border-b border-border shrink-0">
    <!-- User label -->
    <div class="font-display text-[11px] tracking-[0.15em] flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: synth.color }" />
      <span>{{ session.userName }}</span>
    </div>

    <!-- Play / Stop -->
    <button
      class="btn"
      :class="{ active: seq.playing }"
      @click="sequencer.toggle()"
    >
      {{ seq.playing ? '⏹ STOP' : '▶ PLAY' }}
    </button>

    <!-- Clear -->
    <button class="btn danger" @click="onClear">CLEAR</button>

    <!-- BPM -->
    <div class="flex items-center gap-1.5 text-[10px] text-muted">
      BPM
      <input
        type="range"
        :value="seq.bpm"
        min="40"
        max="220"
        class="w-[70px] accent-accent cursor-pointer"
        @input="onBpmChange"
      />
      <span class="font-bold text-text min-w-[34px]">{{ seq.bpm }}</span>
    </div>

    <!-- Steps -->
    <div class="flex items-center gap-1.5 text-[10px] text-muted">
      STEPS
      <select
        class="ctrl-select"
        :value="seq.stepCount"
        @change="onStepCountChange"
      >
        <option value="8">8</option>
        <option value="16">16</option>
        <option value="32">32</option>
      </select>
    </div>

    <!-- Subdivision -->
    <div class="flex items-center gap-1.5 text-[10px] text-muted">
      DIV
      <select
        class="ctrl-select"
        :value="seq.subdiv"
        @change="onSubdivChange"
      >
        <option value="4">1/16</option>
        <option value="2">1/8</option>
        <option value="1">1/4</option>
      </select>
    </div>

    <!-- Divider -->
    <div class="w-px bg-border-2 self-stretch mx-0.5" />

    <!-- Scale -->
    <ScaleSelector />
  </div>
</template>

<style scoped>
.btn {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 6px 12px;
  border: 1px solid #333350;
  background: #161624;
  color: #ddddf0;
  cursor: pointer;
  transition: all 0.12s;
  text-transform: uppercase;
  white-space: nowrap;
}
.btn:hover { background: #1e1e2e; border-color: #ddddf0; }
.btn.active { background: #6bcb77; border-color: #6bcb77; color: #080810; }
.btn.danger:hover { background: #ff6b6b; border-color: #ff6b6b; color: #080810; }

.ctrl-select {
  background: #161624;
  border: 1px solid #333350;
  color: #ddddf0;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  padding: 5px 8px;
  cursor: pointer;
  outline: none;
}
</style>
