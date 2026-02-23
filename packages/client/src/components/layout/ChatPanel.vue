<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useSessionStore } from '@/stores/session';
import { useWebSocket } from '@/composables/useWebSocket';

const chat = useChatStore();
const session = useSessionStore();
const { sendChat } = useWebSocket();

const input = ref('');
const messagesEl = ref<HTMLDivElement | null>(null);

function send() {
  const text = input.value.trim();
  if (!text) return;
  sendChat(text);
  input.value = '';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Auto-scroll to bottom when new messages arrive
watch(
  () => chat.messages.length,
  async () => {
    await nextTick();
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  },
);
</script>

<template>
  <div class="flex flex-col border-t border-border min-h-0 flex-1">
    <div class="px-3.5 py-2 text-[9px] tracking-[0.3em] text-muted uppercase border-b border-border shrink-0">
      Chat
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0">
      <div
        v-if="!chat.messages.length"
        class="text-[9px] text-muted tracking-wider py-2 text-center"
      >
        No messages yet
      </div>
      <div
        v-for="(msg, i) in chat.messages"
        :key="i"
        class="text-[10px] leading-snug py-0.5"
      >
        <span class="text-[8px] text-muted mr-1">{{ formatTime(msg.timestamp) }}</span>
        <span
          class="font-bold tracking-wide"
          :class="msg.userId === session.userId ? 'text-accent' : 'text-text'"
        >{{ msg.name }}</span>
        <span class="text-muted mx-0.5">:</span>
        <span class="text-text break-words">{{ msg.text }}</span>
      </div>
    </div>

    <!-- Input -->
    <div class="shrink-0 border-t border-border p-1.5 flex gap-1">
      <input
        v-model="input"
        type="text"
        placeholder="say something…"
        maxlength="500"
        class="flex-1 min-w-0 bg-bg border border-border text-text font-mono text-[10px] px-2 py-1 outline-none focus:border-accent placeholder:text-muted"
        @keydown.enter="send"
      />
      <button
        class="shrink-0 bg-surface-2 border border-border text-muted text-[9px] tracking-wider px-2 py-1 hover:text-text hover:border-text transition-colors uppercase"
        @click="send"
      >
        Send
      </button>
    </div>
  </div>
</template>
