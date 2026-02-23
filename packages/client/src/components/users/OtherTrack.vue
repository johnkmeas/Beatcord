<script setup lang="ts">
import type { PublicUser } from '@beatcord/shared';
import { computed } from 'vue';

const props = defineProps<{
  user: PublicUser;
  activeStep: number;
}>();

const MIDI_MIN = 24;
const TOTAL_ROWS = 85;

const stepCount = computed(() => props.user.seq?.stepCount ?? 16);
const steps = computed(() => props.user.seq?.steps ?? []);
</script>

<template>
  <div
    class="flex items-stretch border-b border-border min-h-[36px]"
    :style="{ '--user-color': user.synth.color }"
  >
    <!-- Label -->
    <div
      class="w-[160px] shrink-0 flex items-center gap-1.5 px-2.5 bg-surface text-[10px]"
      :style="{ borderRight: `3px solid ${user.synth.color}` }"
    >
      <span class="font-bold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {{ user.name }}
      </span>
      <span
        v-if="user.seq?.playing"
        class="text-[8px] tracking-[0.15em] px-1 py-px bg-[rgba(107,203,119,0.15)] text-green border border-[rgba(107,203,119,0.3)]"
      >LIVE</span>
      <span class="text-[9px] text-muted">{{ user.seq?.bpm ?? '?' }}</span>
    </div>
    <!-- Mini grid -->
    <div class="flex-1 flex items-center px-1.5 py-0.5 gap-0.5 overflow-hidden">
      <div
        v-for="(step, si) in steps"
        :key="si"
        class="flex-1 h-[22px] bg-surface-2 border border-border relative overflow-hidden min-w-0 transition-colors duration-50"
        :class="{
          'bg-surface-3': step.notes.length > 0,
          'outline outline-2 -outline-offset-1': si === activeStep,
        }"
        :style="si === activeStep ? { outlineColor: user.synth.color } : {}"
      >
        <div
          v-for="(n, ni) in step.notes"
          :key="ni"
          class="absolute left-px right-px h-[3px] rounded-sm"
          :style="{
            background: user.synth.color,
            bottom: ((n.midi - MIDI_MIN) / TOTAL_ROWS * 100).toFixed(1) + '%',
          }"
        />
      </div>
    </div>
  </div>
</template>
