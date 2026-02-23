import { useScaleStore } from '@/stores/scale';

const MIDI_MIN = 24;
const MIDI_MAX = 108;

export function useScale() {
  const store = useScaleStore();

  /**
   * Snap a MIDI note to the nearest in-scale note.
   * Returns the original note if already in scale or scale is chromatic.
   */
  function snapToScale(midi: number): number {
    if (store.isInScale(midi)) return midi;
    for (let d = 1; d <= 6; d++) {
      if (midi - d >= MIDI_MIN && store.isInScale(midi - d)) return midi - d;
      if (midi + d <= MIDI_MAX && store.isInScale(midi + d)) return midi + d;
    }
    return midi;
  }

  return {
    root: store.root,
    type: store.type,
    scaleNotes: store.scaleNotes,
    isInScale: store.isInScale,
    snapToScale,
  };
}
