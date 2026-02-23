<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useRoomStore } from '@/stores/room';
import { useSequencer } from '@/composables/useSequencer';
import { useWebSocket } from '@/composables/useWebSocket';
import { useAudioEngine } from '@/composables/useAudioEngine';

import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ToastContainer from '@/components/layout/ToastContainer.vue';
import TransportBar from '@/components/sequencer/TransportBar.vue';
import PianoRoll from '@/components/sequencer/PianoRoll.vue';
import NoteEditor from '@/components/sequencer/NoteEditor.vue';
import SynthPanel from '@/components/synth/SynthPanel.vue';
import OtherTrack from '@/components/users/OtherTrack.vue';

const router = useRouter();
const session = useSessionStore();
const room = useRoomStore();
const sequencer = useSequencer();
const ws = useWebSocket();
const audio = useAudioEngine();

// Note editor state
const editorStep = ref<number | null>(null);
const editorRect = ref(new DOMRect());

function openEditor(stepIndex: number, rect: DOMRect) {
  editorStep.value = stepIndex;
  editorRect.value = rect;
}

function closeEditor() {
  editorStep.value = null;
}

const otherUsersList = computed(() => Array.from(room.otherUsers.values()));

onMounted(() => {
  if (!session.userName) {
    router.replace({ name: 'lobby' });
    return;
  }
  audio.init();
  ws.connect(session.userName);
});

onUnmounted(() => {
  sequencer.stop();
  ws.disconnect();
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar — hidden on mobile -->
      <div class="w-[210px] shrink-0 hidden sm:block">
        <AppSidebar />
      </div>

      <!-- Main panel -->
      <div class="flex flex-col flex-1 overflow-hidden bg-bg">
        <TransportBar />
        <PianoRoll @open-editor="openEditor" />
        <SynthPanel />

        <!-- Other users -->
        <div class="shrink-0 max-h-[120px] overflow-y-auto border-t border-border bg-bg">
          <template v-if="otherUsersList.length">
            <OtherTrack
              v-for="u in otherUsersList"
              :key="u.id"
              :user="u"
              :active-step="room.activeSteps.get(u.id) ?? -1"
            />
          </template>
          <div v-else class="px-3.5 py-2.5 text-[10px] text-muted tracking-wider">
            No other musicians yet — share the link!
          </div>
        </div>
      </div>
    </div>

    <!-- Note editor popup -->
    <NoteEditor
      v-if="editorStep !== null"
      :step-index="editorStep"
      :anchor-rect="editorRect"
      @close="closeEditor"
    />

    <ToastContainer />
  </div>
</template>
