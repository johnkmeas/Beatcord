import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSessionStore = defineStore('session', () => {
  const userId = ref<string | null>(null);
  const userName = ref('');
  const userColor = ref('#ff6b6b');
  const roomId = ref('global');
  const isConnected = ref(false);
  const isJoined = ref(false);

  function setIdentity(id: string, name: string, color: string) {
    userId.value = id;
    userName.value = name;
    userColor.value = color;
    isJoined.value = true;
  }

  function setRoom(nextRoomId: string) {
    roomId.value = nextRoomId;
  }

  function reset() {
    userId.value = null;
    userName.value = '';
    roomId.value = 'global';
    isConnected.value = false;
    isJoined.value = false;
  }

  return {
    userId,
    userName,
    userColor,
    roomId,
    isConnected,
    isJoined,
    setIdentity,
    setRoom,
    reset,
  };
});
