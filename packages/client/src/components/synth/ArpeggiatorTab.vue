<script setup lang="ts">
import { useArpeggiatorStore, ARP_PRESETS } from '@/stores/arpeggiator';
import type { ArpPattern, ArpRate } from '@beatcord/shared';

const arp = useArpeggiatorStore();

const patterns: { value: ArpPattern; label: string }[] = [
  { value: 'up',       label: 'Up' },
  { value: 'down',     label: 'Down' },
  { value: 'up-down',  label: 'Up-Down' },
  { value: 'down-up',  label: 'Down-Up' },
  { value: 'random',   label: 'Random' },
  { value: 'converge', label: 'Converge' },
  { value: 'diverge',  label: 'Diverge' },
];

const rates: { value: ArpRate; label: string }[] = [
  { value: '1/4',   label: '1/4' },
  { value: '1/8',   label: '1/8' },
  { value: '1/8t',  label: '1/8T' },
  { value: '1/16',  label: '1/16' },
  { value: '1/16t', label: '1/16T' },
  { value: '1/32',  label: '1/32' },
];

function onPatternChange(e: Event) {
  arp.pattern = (e.target as HTMLSelectElement).value as ArpPattern;
  arp.selectedPreset = null;
}
function onRateChange(e: Event) {
  arp.rate = (e.target as HTMLSelectElement).value as ArpRate;
  arp.selectedPreset = null;
}
function onOctaveInput(e: Event) {
  arp.octaveRange = parseInt((e.target as HTMLInputElement).value);
  arp.selectedPreset = null;
}
function onGateInput(e: Event) {
  arp.gate = parseFloat((e.target as HTMLInputElement).value);
  arp.selectedPreset = null;
}
function onSwingInput(e: Event) {
  arp.swing = parseFloat((e.target as HTMLInputElement).value);
  arp.selectedPreset = null;
}
function onPresetChange(e: Event) {
  const name = (e.target as HTMLSelectElement).value;
  if (name) arp.applyPreset(name);
}
</script>

<template>
  <!-- Toggle -->
  <div class="ctrl-group" style="min-width: 60px;">
    <div class="ctrl-label">Arp</div>
    <button
      class="arp-toggle"
      :class="{ active: arp.enabled }"
      @click="arp.toggle()"
    >
      {{ arp.enabled ? 'ON' : 'OFF' }}
    </button>
  </div>
  <div class="divider" />

  <!-- Preset -->
  <div class="ctrl-group">
    <div class="ctrl-label">Preset</div>
    <select
      class="ctrl-select"
      :value="arp.selectedPreset ?? ''"
      @change="onPresetChange"
    >
      <option value="">Custom</option>
      <option v-for="p in ARP_PRESETS" :key="p.name" :value="p.name">{{ p.name }}</option>
    </select>
  </div>
  <div class="divider" />

  <!-- Pattern -->
  <div class="ctrl-group">
    <div class="ctrl-label">Pattern</div>
    <select class="ctrl-select" :value="arp.pattern" @change="onPatternChange">
      <option v-for="p in patterns" :key="p.value" :value="p.value">{{ p.label }}</option>
    </select>
  </div>
  <div class="divider" />

  <!-- Rate -->
  <div class="ctrl-group">
    <div class="ctrl-label">Rate</div>
    <select class="ctrl-select" :value="arp.rate" @change="onRateChange">
      <option v-for="r in rates" :key="r.value" :value="r.value">{{ r.label }}</option>
    </select>
  </div>
  <div class="divider" />

  <!-- Octave Range -->
  <div class="ctrl-group">
    <div class="ctrl-label">Octaves</div>
    <div class="ctrl-row">
      <input type="range" :value="arp.octaveRange" min="1" max="4" step="1" class="accent-accent" @input="onOctaveInput" />
      <span class="ctrl-val">{{ arp.octaveRange }}</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Gate -->
  <div class="ctrl-group">
    <div class="ctrl-label">Gate</div>
    <div class="ctrl-row">
      <input type="range" :value="arp.gate" min="0.1" max="1" step="0.05" class="accent-accent" @input="onGateInput" />
      <span class="ctrl-val">{{ arp.gate.toFixed(2) }}</span>
    </div>
  </div>
  <div class="divider" />

  <!-- Swing -->
  <div class="ctrl-group">
    <div class="ctrl-label">Swing</div>
    <div class="ctrl-row">
      <input type="range" :value="arp.swing" min="0" max="0.5" step="0.01" class="accent-accent" @input="onSwingInput" />
      <span class="ctrl-val">{{ (arp.swing * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.arp-toggle {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 4px 10px;
  border: 1px solid #333350;
  background: #161624;
  color: #ddddf0;
  cursor: pointer;
  transition: all 0.12s;
  text-transform: uppercase;
  width: 100%;
}
.arp-toggle:hover { background: #1e1e2e; border-color: #ddddf0; }
.arp-toggle.active { background: #6bcb77; border-color: #6bcb77; color: #080810; }
</style>
