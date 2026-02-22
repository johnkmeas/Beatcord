import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSessionStore = defineStore('session', () => {
  const userId = ref<string | null>(null);
  const userName = ref('');
  const userColor = ref('#ff6b6b');
  const isConnected = ref(false);
  const isJoined = ref(false);

  function setIdentity(id: string, name: string, color: string) {
    userId.value = id;
    userName.value = name;
    userColor.value = color;
    isJoined.value = true;
  }

  function reset() {
    userId.value = null;
    userName.value = '';
    isConnected.value = false;
    isJoined.value = false;
  }

  return {
    userId,
    userName,
    userColor,
    isConnected,
    isJoined,
    setIdentity,
    reset,
  };
});
