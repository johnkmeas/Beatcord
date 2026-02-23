<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts } = useToast();
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[500] flex flex-col gap-1.5 pointer-events-none">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="bg-surface-2 border border-border-2 px-3 py-2 text-[11px] tracking-wider max-w-[250px] animate-toast-in"
      :style="{ borderLeftWidth: '3px', borderLeftColor: t.color }"
    >
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
@keyframes toastIn {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}
.animate-toast-in {
  animation: toastIn 0.25s ease;
}
</style>
