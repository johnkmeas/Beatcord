<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSequencerStore } from '@/stores/sequencer';
import { useScaleStore } from '@/stores/scale';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useSynthStore } from '@/stores/synth';
import { useSequencer } from '@/composables/useSequencer';
import { useGlobalSettingsStore } from '@/stores/globalSettings';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);
const MIDI_MIN = 24;
const MIDI_MAX = 108;

const props = defineProps<{
  stepIndex: number;
  anchorRect: DOMRect;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const seqStore = useSequencerStore();
const scaleStore = useScaleStore();
const synthStore = useSynthStore();
const audio = useAudioEngine();
const sequencer = useSequencer();
const globals = useGlobalSettingsStore();

const editorRef = ref<HTMLDivElement | null>(null);
const octave = ref(4);

const step = computed(() => seqStore.steps[props.stepIndex]);
const activeMidis = computed(() => new Set(step.value?.notes.map((n) => n.midi) ?? []));

const velocity = ref(100);
const noteLength = ref(1);

// Sync velocity/length from first note
watch(() => props.stepIndex, () => {
  const first = step.value?.notes[0];
  velocity.value = first?.velocity ?? 100;
  noteLength.value = first?.length ?? 1;
}, { immediate: true });

// Position
const posStyle = computed(() => {
  const left = Math.min(props.anchorRect.left, window.innerWidth - 310);
  const top = Math.min(props.anchorRect.bottom + 4, window.innerHeight - 340);
  return { left: left + 'px', top: top + 'px' };
});

// Octave pills
const octaves = [7, 6, 5, 4, 3, 2, 1];

// Note pills for current octave
const pills = computed(() => {
  const result: { midi: number; name: string; isBlack: boolean; inScale: boolean; active: boolean }[] = [];
  for (const name of NOTE_NAMES) {
    const midi = NOTE_NAMES.indexOf(name) + (octave.value + 1) * 12;
    if (midi < MIDI_MIN || midi > MIDI_MAX) continue;
    const inScale = scaleStore.isInScale(midi);
    const active = activeMidis.value.has(midi);
    // Hide out-of-scale notes unless already placed
    if (scaleStore.type !== 'chromatic' && !inScale && !active) continue;
    result.push({
      midi,
      name: name + octave.value,
      isBlack: BLACK_NOTES.has(name),
      inScale,
      active,
    });
  }
  return result;
});

function toggleNote(midi: number) {
  if (scaleStore.type !== 'chromatic' && !scaleStore.isInScale(midi)) return;
  audio.init();
  seqStore.toggleNote(props.stepIndex, midi);
  // Play preview if added
  if (activeMidis.value.has(midi) || step.value?.notes.some((n) => n.midi === midi)) {
    audio.playNoteNow(midi, synthStore.$state as any);
  }
  sequencer.sendSeqUpdate();
}

function onVelocityInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value);
  velocity.value = v;
  seqStore.setNoteVelocity(props.stepIndex, v);
  sequencer.sendSeqUpdate();
}

function onLengthInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  noteLength.value = v;
  seqStore.setNoteLength(props.stepIndex, v);
  sequencer.sendSeqUpdate();
}

// Close on click outside
function onDocClick(e: MouseEvent) {
  if (editorRef.value && !editorRef.value.contains(e.target as Node)) {
    emit('close');
  }
}
onMounted(() => setTimeout(() => document.addEventListener('click', onDocClick), 0));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div
    ref="editorRef"
    class="fixed z-[300] w-[300px] bg-surface border border-border-2 shadow-2xl"
    :style="posStyle"
  >
    <!-- Header -->
    <div class="flex justify-between items-center px-3 py-2 border-b border-border text-[9px] tracking-[0.2em] text-muted uppercase">
      <span>STEP {{ stepIndex + 1 }}</span>
      <span class="cursor-pointer text-sm hover:text-accent" @click="emit('close')">✕</span>
    </div>

    <div class="p-3 flex flex-col gap-2.5">
      <!-- Octave -->
      <div>
        <div class="text-[8px] tracking-[0.2em] text-muted uppercase mb-1">Octave</div>
        <div class="flex gap-1">
          <div
            v-for="o in octaves"
            :key="o"
            class="px-2 py-0.5 text-[10px] font-mono border cursor-pointer transition-all"
            :class="o === octave
              ? 'bg-surface-3 border-text'
              : 'bg-surface-2 border-border-2 hover:bg-surface-3'"
            @click="octave = o"
          >C{{ o }}</div>
        </div>
      </div>

      <!-- Note pills -->
      <div>
        <div class="text-[8px] tracking-[0.2em] text-muted uppercase mb-1">Notes (click to toggle)</div>
        <div class="flex flex-wrap gap-0.5">
          <div
            v-for="p in pills"
            :key="p.midi"
            class="px-1.5 py-0.5 text-[9px] tracking-wider border cursor-pointer transition-all select-none"
            :class="p.active
              ? 'bg-accent border-accent text-bg'
              : p.isBlack
                ? 'bg-[rgba(0,0,0,0.3)] border-border-2 text-text'
                : 'bg-surface-2 border-border-2 text-text'"
            :style="!p.inScale && scaleStore.type !== 'chromatic' ? { opacity: '0.4', textDecoration: 'line-through' } : {}"
            @click="toggleNote(p.midi)"
          >{{ p.name }}</div>
        </div>
        <div
          v-if="scaleStore.type !== 'chromatic'"
          class="text-[8px] text-muted tracking-wider mt-1.5"
        >
          ♩ {{ NOTE_NAMES[scaleStore.root] }} {{ scaleStore.type }}
        </div>
      </div>

      <!-- Velocity -->
      <div>
        <div class="text-[8px] tracking-[0.2em] text-muted uppercase mb-1">Velocity</div>
        <div class="flex items-center gap-2 text-[10px] text-muted">
          <input
            type="range"
            :value="velocity"
            min="1"
            max="127"
            class="flex-1 accent-accent"
            @input="onVelocityInput"
          />
          <span class="min-w-[38px] text-right text-text">{{ velocity }}</span>
        </div>
      </div>

      <!-- Note length (steps) -->
      <div>
        <div class="text-[8px] tracking-[0.2em] text-muted uppercase mb-1">Note Length (steps)</div>
        <div class="flex items-center gap-2 text-[10px] text-muted">
          <input
            type="range"
            :value="noteLength"
            min="1"
            :max="globals.stepCount"
            step="1"
            class="flex-1 accent-accent"
            @input="onLengthInput"
          />
          <span class="min-w-[38px] text-right text-text">{{ noteLength }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
