<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();
const nameInput = ref('');

function join() {
  const name = nameInput.value.trim();
  if (!name) return;
  session.userName = name;
  router.push({ name: 'jam' });
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-bg">
    <div class="text-center p-14 bg-surface max-w-[420px] w-[90%] relative">
      <h1 class="font-display text-4xl font-bold tracking-[0.2em] text-accent mb-1.5">
        BEATCORD
      </h1>
      <p class="text-muted text-[10px] tracking-[0.25em] uppercase mb-11">
        polyphonic · real-time · collaborative
      </p>
      <input
        v-model="nameInput"
        type="text"
        placeholder="enter your name"
        maxlength="20"
        autocomplete="off"
        class="w-full bg-bg border border-border text-text font-mono text-base px-4 py-3 text-center tracking-wider mb-4 outline-none focus:border-accent placeholder:text-muted"
        @keydown.enter="join"
      />
      <button
        class="w-full bg-accent text-bg font-display text-[13px] font-bold tracking-[0.25em] py-4 uppercase hover:opacity-85 active:scale-[0.98] transition-all"
        @click="join"
      >
        JOIN THE JAM
      </button>
    </div>
  </div>
</template>
