<script setup lang="ts">
import { useSessionStore } from '@/stores/session';
import { useRoomStore } from '@/stores/room';
import { useMidi } from '@/composables/useMidi';

const session = useSessionStore();
const room = useRoomStore();
const midi = useMidi();
</script>

<template>
  <header class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0 z-50">
    <div class="font-display text-sm font-bold tracking-[0.3em] text-accent">
      BEATCORD
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 text-[10px] text-muted tracking-wider">
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="session.isConnected ? 'bg-green animate-pulse' : 'bg-accent'"
        />
        <span>{{ room.userCount }} musician{{ room.userCount !== 1 ? 's' : '' }}</span>
      </div>
      <div v-if="midi.isConnected.value" class="flex items-center gap-1.5 text-[10px] text-muted tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span>MIDI</span>
      </div>
      <div class="text-[9px] text-muted tracking-wider hidden sm:block">
        RIGHT-CLICK STEP # TO EDIT NOTES
      </div>
    </div>
  </header>
</template>
