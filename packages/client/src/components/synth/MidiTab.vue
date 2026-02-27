<script setup lang="ts">
import { ref } from 'vue';
import { useMidi } from '@/composables/useMidi';

const midi = useMidi();
const fileInput = ref<HTMLInputElement | null>(null);
const hasMidiApi = typeof navigator.requestMIDIAccess === 'function';

async function onInputChange(e: Event) {
  const id = (e.target as HTMLSelectElement).value || null;
  if (id && !midi.midiAccess.value) {
    await midi.requestAccess();
  }
  midi.selectInput(id);
}

function onChannelChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  midi.midiChannel.value = val === 'all' ? null : parseInt(val);
}

function onScaleLockChange(e: Event) {
  midi.scaleLock.value = (e.target as HTMLInputElement).checked;
}

function triggerFileImport() {
  fileInput.value?.click();
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    await midi.importMidiFile(file);
  } catch {
    // Error toast is shown by importMidiFile
  }
  // Reset so the same file can be re-imported
  input.value = '';
}

async function connectMidi() {
  await midi.requestAccess();
}
</script>

<template>
  <!-- MIDI Input device selector -->
  <template v-if="hasMidiApi">
    <div class="ctrl-group">
      <div class="ctrl-label">MIDI Input</div>
      <div class="ctrl-row">
        <select
          v-if="midi.midiAccess.value"
          class="ctrl-select"
          :value="midi.selectedInputId.value ?? ''"
          @change="onInputChange"
        >
          <option value="">None</option>
          <option v-for="input in midi.inputs.value" :key="input.id" :value="input.id">
            {{ input.name ?? input.id }}
          </option>
        </select>
        <button v-else class="midi-btn" @click="connectMidi">Connect</button>
      </div>
    </div>
    <div class="divider" />

    <!-- Channel filter -->
    <div class="ctrl-group">
      <div class="ctrl-label">Channel</div>
      <div class="ctrl-row">
        <select
          class="ctrl-select"
          :value="midi.midiChannel.value === null ? 'all' : midi.midiChannel.value"
          @change="onChannelChange"
        >
          <option value="all">All</option>
          <option v-for="ch in 16" :key="ch" :value="ch - 1">{{ ch }}</option>
        </select>
      </div>
    </div>
    <div class="divider" />

    <!-- Scale lock -->
    <div class="ctrl-group">
      <div class="ctrl-label">Scale Lock</div>
      <div class="ctrl-row">
        <label class="scale-lock-label">
          <input
            type="checkbox"
            :checked="midi.scaleLock.value"
            @change="onScaleLockChange"
          />
          <span class="scale-lock-text">{{ midi.scaleLock.value ? 'ON' : 'OFF' }}</span>
        </label>
      </div>
    </div>
    <div class="divider" />
  </template>

  <template v-else>
    <div class="ctrl-group">
      <div class="ctrl-label">MIDI Input</div>
      <div class="ctrl-row">
        <span class="no-midi-text">Not supported in this browser</span>
      </div>
    </div>
    <div class="divider" />
  </template>

  <!-- MIDI file import (always available) -->
  <div class="ctrl-group">
    <div class="ctrl-label">Import</div>
    <div class="ctrl-row">
      <button class="midi-btn" @click="triggerFileImport">Import .mid</button>
      <input
        ref="fileInput"
        type="file"
        accept=".mid,.midi"
        class="hidden"
        @change="onFileSelected"
      />
    </div>
  </div>
</template>

<style scoped>
.midi-btn {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 5px 10px;
  border: 1px solid #333350;
  background: #161624;
  color: #ddddf0;
  cursor: pointer;
  transition: all 0.12s;
  text-transform: uppercase;
  white-space: nowrap;
}
.midi-btn:hover {
  background: #1e1e2e;
  border-color: #ddddf0;
}
.scale-lock-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.scale-lock-text {
  font-size: 10px;
  color: #ddddf0;
}
.no-midi-text {
  font-size: 10px;
  color: #5555a0;
}
.hidden {
  display: none;
}
</style>
