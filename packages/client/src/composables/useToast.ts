import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  color: string;
}

let nextId = 0;
const toasts = ref<Toast[]>([]);

export function useToast() {
  function show(message: string, color = '#ff6b6b'): void {
    const id = nextId++;
    toasts.value.push({ id, message, color });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3000);
  }

  return { toasts, show };
}
