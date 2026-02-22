import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PublicUser } from '@beatcord/shared';

export const useRoomStore = defineStore('room', () => {
  const otherUsers = ref<Map<string, PublicUser>>(new Map());

  /** Active step index per user, for rendering playheads. */
  const activeSteps = ref<Map<string, number>>(new Map());

  const userCount = computed(() => otherUsers.value.size + 1);

  function setUsers(users: PublicUser[], myId: string) {
    otherUsers.value = new Map(
      users.filter((u) => u.id !== myId).map((u) => [u.id, u]),
    );
  }

  function addUser(user: PublicUser) {
    otherUsers.value.set(user.id, user);
  }

  function removeUser(userId: string) {
    otherUsers.value.delete(userId);
    activeSteps.value.delete(userId);
  }

  function setActiveStep(userId: string, step: number) {
    activeSteps.value.set(userId, step);
  }

  function reset() {
    otherUsers.value.clear();
    activeSteps.value.clear();
  }

  return {
    otherUsers,
    activeSteps,
    userCount,
    setUsers,
    addUser,
    removeUser,
    setActiveStep,
    reset,
  };
});
