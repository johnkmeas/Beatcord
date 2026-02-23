<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useRoomStore } from '@/stores/room';
import UserCard from '@/components/users/UserCard.vue';
import ChatPanel from '@/components/layout/ChatPanel.vue';

const session = useSessionStore();
const seq = useSequencerStore();
const synth = useSynthStore();
const room = useRoomStore();

const myNoteCount = computed(() =>
  seq.steps.reduce((acc, s) => acc + s.notes.length, 0),
);

const otherUsersList = computed(() => Array.from(room.otherUsers.values()));

function noteCount(user: typeof otherUsersList.value[number]): number {
  if (!user.seq) return 0;
  return user.seq.steps.reduce((a, s) => a + s.notes.length, 0);
}
</script>

<template>
  <aside class="border-r border-border bg-surface flex flex-col overflow-hidden h-full">
    <div class="px-3.5 py-3 text-[9px] tracking-[0.3em] text-muted uppercase border-b border-border shrink-0">
      Musicians
    </div>
    <div class="shrink-0 overflow-y-auto p-2 max-h-[40%]">
      <!-- Current user -->
      <UserCard
        :name="session.userName"
        :color="synth.color"
        :waveform="synth.waveform"
        :bpm="seq.bpm"
        :note-count="myNoteCount"
        :is-playing="seq.playing"
        :is-me="true"
      />
      <!-- Other users -->
      <UserCard
        v-for="u in otherUsersList"
        :key="u.id"
        :name="u.name"
        :color="u.synth.color"
        :waveform="u.synth.waveform"
        :bpm="u.seq?.bpm ?? 120"
        :note-count="noteCount(u)"
        :is-playing="u.seq?.playing ?? false"
        :is-me="false"
      />
    </div>

    <!-- Chat -->
    <ChatPanel />
  </aside>
</template>
