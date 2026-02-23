<script setup lang="ts">
defineProps<{
  name: string;
  color: string;
  waveform: string;
  bpm: number;
  noteCount: number;
  isPlaying: boolean;
  isMe: boolean;
}>();
</script>

<template>
  <div
    class="px-2.5 py-2 mb-1 border border-border"
    :class="isMe ? 'bg-[rgba(255,107,107,0.04)]' : 'bg-surface-2'"
    :style="{ borderLeftWidth: '3px', borderLeftColor: color }"
  >
    <div class="text-[11px] font-bold tracking-[0.05em] mb-0.5">
      {{ name }}
      <span v-if="isMe" class="text-[8px] text-muted">(you)</span>
      <span
        v-if="isPlaying"
        class="inline-block text-[8px] tracking-[0.15em] px-1 py-px ml-1 align-middle bg-[rgba(107,203,119,0.15)] text-green border border-[rgba(107,203,119,0.3)]"
      >LIVE</span>
    </div>
    <div class="text-[9px] text-muted tracking-wider">
      {{ waveform }} · {{ bpm }}bpm · {{ noteCount }}n
    </div>
  </div>
</template>
