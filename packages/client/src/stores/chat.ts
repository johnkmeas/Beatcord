import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ChatEntry {
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

const MAX_MESSAGES = 200;

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatEntry[]>([]);

  function addMessage(entry: ChatEntry) {
    messages.value.push(entry);
    if (messages.value.length > MAX_MESSAGES) {
      messages.value = messages.value.slice(-MAX_MESSAGES);
    }
  }

  function reset() {
    messages.value = [];
  }

  return { messages, addMessage, reset };
});
