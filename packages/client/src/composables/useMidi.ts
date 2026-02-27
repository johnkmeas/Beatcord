/**
 * Singleton composable for Web MIDI input and MIDI file import.
 *
 * Follows the same module-level ref pattern as useWebSocket and useAudioEngine.
 * Call useMidi() from any component — returns the same shared instance.
 */

import { ref, shallowRef } from 'vue';
import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useSequencer } from '@/composables/useSequencer';
import { useScale } from '@/composables/useScale';
import { useToast } from '@/composables/useToast';
import { parseMidiFile, quantizeMidiToSteps } from '@/composables/midiFileParser';
import type { StepCountOption } from '@beatcord/shared';

// ── Module-level singleton state ─────────────────────────────

const midiAccess = shallowRef<MIDIAccess | null>(null);
const inputs = ref<MIDIInput[]>([]);
const selectedInputId = ref<string | null>(null);
const isConnected = ref(false);
const scaleLock = ref(false);
const midiChannel = ref<number | null>(null); // null = all channels

// ── Internals ────────────────────────────────────────────────

const MIDI_MIN = 24;
const MIDI_MAX = 108;
const NOTE_ON = 0x90;

function clampMidi(midi: number): number {
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, midi));
}

function handleMidiMessage(event: MIDIMessageEvent): void {
  const data = event.data;
  if (!data || data.length < 2) return;

  const status = data[0];
  const command = status & 0xf0;
  const channel = status & 0x0f;

  // Channel filter
  if (midiChannel.value !== null && channel !== midiChannel.value) return;

  if (command === NOTE_ON && data.length >= 3) {
    const rawMidi = data[1];
    const velocity = data[2];

    // Velocity 0 = note-off per MIDI spec
    if (velocity === 0) return;

    // Scale lock
    const scale = useScale();
    const midi = clampMidi(scaleLock.value ? scale.snapToScale(rawMidi) : rawMidi);

    // Out-of-range after clamping still needs to be in 24–108
    if (midi < MIDI_MIN || midi > MIDI_MAX) return;

    // Live preview
    const audio = useAudioEngine();
    const synthStore = useSynthStore();
    audio.playNoteNow(midi, synthStore.getSynthState(), velocity);

    // Overdub: record to grid if playing
    const globals = useGlobalSettingsStore();
    if (globals.playing) {
      const seqStore = useSequencerStore();
      const currentStep = seqStore.currentStep;
      if (currentStep >= 0 && currentStep < globals.stepCount) {
        seqStore.addNote(currentStep, midi, velocity, 1);
        const sequencer = useSequencer();
        sequencer.sendSeqUpdate();
      }
    }
  }
  // Note-off is silently ignored — preview handles its own ADSR release
}

function refreshInputs(): void {
  if (!midiAccess.value) {
    inputs.value = [];
    return;
  }
  const list: MIDIInput[] = [];
  midiAccess.value.inputs.forEach((input) => {
    list.push(input);
  });
  inputs.value = list;

  // If the selected input was disconnected, clear selection
  if (selectedInputId.value && !list.some((i) => i.id === selectedInputId.value)) {
    selectedInputId.value = null;
    isConnected.value = false;
  }
}

// ── Public API ───────────────────────────────────────────────

export function useMidi() {
  /** Request Web MIDI API access. Returns true if granted. */
  async function requestAccess(): Promise<boolean> {
    if (midiAccess.value) return true;

    if (typeof navigator.requestMIDIAccess !== 'function') {
      return false;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      midiAccess.value = access;
      refreshInputs();

      // Listen for device connect/disconnect
      access.onstatechange = () => {
        refreshInputs();
      };

      return true;
    } catch {
      return false;
    }
  }

  /** Select a MIDI input device by ID. Pass null to deselect. */
  function selectInput(id: string | null): void {
    // Remove listener from previous input
    if (selectedInputId.value) {
      const prev = inputs.value.find((i) => i.id === selectedInputId.value);
      if (prev) {
        prev.onmidimessage = null;
      }
    }

    selectedInputId.value = id;

    if (id) {
      const input = inputs.value.find((i) => i.id === id);
      if (input) {
        input.onmidimessage = handleMidiMessage;
        isConnected.value = true;
      } else {
        isConnected.value = false;
      }
    } else {
      isConnected.value = false;
    }
  }

  /** Disconnect all MIDI listeners and reset state. */
  function disconnect(): void {
    if (selectedInputId.value) {
      const input = inputs.value.find((i) => i.id === selectedInputId.value);
      if (input) {
        input.onmidimessage = null;
      }
    }

    if (midiAccess.value) {
      midiAccess.value.onstatechange = null;
    }

    selectedInputId.value = null;
    isConnected.value = false;
  }

  /**
   * Import a MIDI file into the sequencer.
   * Auto-expands step count to fit (max 32), clears existing notes, populates grid.
   */
  async function importMidiFile(file: File): Promise<{ stepCount: number; noteCount: number }> {
    const toast = useToast();

    const buffer = await file.arrayBuffer();

    let data;
    try {
      data = parseMidiFile(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse MIDI file';
      toast.show(msg, '#ff6b6b');
      throw err;
    }

    if (data.notes.length === 0) {
      toast.show('No notes found in MIDI file', '#ff6b6b');
      return { stepCount: 0, noteCount: 0 };
    }

    const seqStore = useSequencerStore();
    const globals = useGlobalSettingsStore();
    const sequencer = useSequencer();

    // Determine best step count
    const ticksPerStep = data.ticksPerBeat / seqStore.subdiv;
    const maxTick = Math.max(...data.notes.map((n) => n.startTick));
    const neededSteps = Math.ceil(maxTick / ticksPerStep) + 1;

    // Pick the smallest StepCountOption that fits, capped at 32
    const STEP_OPTIONS: StepCountOption[] = [8, 16, 32];
    const bestStepCount = STEP_OPTIONS.find((s) => s >= neededSteps) ?? 32;

    // Update step count if needed
    if (bestStepCount !== globals.stepCount) {
      seqStore.setStepCount(bestStepCount);
      globals.updateAndBroadcast({ stepCount: bestStepCount });
    }

    // Clear and populate
    seqStore.clear();
    const importedSteps = quantizeMidiToSteps(
      data.notes,
      data.ticksPerBeat,
      seqStore.subdiv,
      bestStepCount,
    );

    // Copy imported notes into the store's steps
    for (let i = 0; i < importedSteps.length; i++) {
      for (const note of importedSteps[i].notes) {
        seqStore.addNote(i, note.midi, note.velocity, note.length);
      }
    }

    // Broadcast to room
    sequencer.sendSeqUpdate();

    const noteCount = importedSteps.reduce((sum, s) => sum + s.notes.length, 0);
    toast.show(`Imported ${noteCount} notes into ${bestStepCount} steps`, '#6bcb77');

    return { stepCount: bestStepCount, noteCount };
  }

  return {
    midiAccess,
    inputs,
    selectedInputId,
    isConnected,
    scaleLock,
    midiChannel,
    requestAccess,
    selectInput,
    disconnect,
    importMidiFile,
  };
}
