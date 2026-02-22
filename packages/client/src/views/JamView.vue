<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();

onMounted(() => {
  // Redirect to lobby if user hasn't entered a name
  if (!session.userName) {
    router.replace({ name: 'lobby' });
  }
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0">
      <div class="font-display text-sm font-bold tracking-[0.3em] text-accent">
        BEATCORD
      </div>
      <div class="flex items-center gap-1.5 text-[10px] text-muted tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        <span>{{ session.userName }}</span>
      </div>
    </header>

    <!-- Workspace placeholder — components will be built in subsequent tasks -->
    <div class="flex-1 flex items-center justify-center text-muted text-sm tracking-wider">
      Sequencer workspace — coming soon
    </div>
  </div>
</template>
