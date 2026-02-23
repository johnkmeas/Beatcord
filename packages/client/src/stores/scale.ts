import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useGlobalSettingsStore } from '@/stores/globalSettings';

export const SCALES: Record<string, number[]> = {
  chromatic:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:           [0, 2, 4, 5, 7, 9, 11],
  minor:           [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],
  melodicMinor:    [0, 2, 3, 5, 7, 9, 11],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  lydian:          [0, 2, 4, 6, 7, 9, 11],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  locrian:         [0, 1, 3, 5, 6, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues:           [0, 3, 5, 6, 7, 10],
  wholeTone:       [0, 2, 4, 6, 8, 10],
  diminished:      [0, 2, 3, 5, 6, 8, 9, 11],
  augmented:       [0, 3, 4, 7, 8, 11],
} as const;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const SCALE_NAMES: Record<string, string> = {
  chromatic: 'Chromatic',
  major: 'Major',
  minor: 'Minor (Nat.)',
  harmonicMinor: 'Harmonic Minor',
  melodicMinor: 'Melodic Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
  pentatonicMajor: 'Penta. Major',
  pentatonicMinor: 'Penta. Minor',
  blues: 'Blues',
  wholeTone: 'Whole Tone',
  diminished: 'Diminished',
  augmented: 'Augmented',
};

export const useScaleStore = defineStore('scale', () => {
  const globals = useGlobalSettingsStore();

  const root = computed(() => globals.rootNote);
  const type = computed(() => globals.scaleType);

  const scaleNotes = computed(() => {
    const intervals = SCALES[type.value] ?? SCALES.chromatic;
    return new Set(intervals.map((i) => (root.value + i) % 12));
  });

  function isInScale(midi: number): boolean {
    if (type.value === 'chromatic') return true;
    return scaleNotes.value.has(midi % 12);
  }

  return {
    root,
    type,
    scaleNotes,
    isInScale,
  };
});
