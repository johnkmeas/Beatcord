import { shallowRef } from 'vue';
import type { StepData, SynthState } from '@beatcord/shared';

const audioCtx = shallowRef<AudioContext | null>(null);

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function useAudioEngine() {
  function init(): AudioContext {
    if (!audioCtx.value) {
      audioCtx.value = new AudioContext();
    }
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume();
    }
    return audioCtx.value;
  }

  /**
   * Play a single MIDI note through the synth voice chain.
   * `when` is an AudioContext.currentTime value for precise scheduling.
   */
  function playNote(
    midi: number,
    velocity: number,
    noteLength: number,
    synth: SynthState,
    when: number,
    masterVolume = 1,
  ): void {
    const ctx = audioCtx.value;
    if (!ctx || ctx.state !== 'running') return;

    const freq = midiToFreq(midi);
    const vol = (velocity / 127) * synth.volume * masterVolume * 0.3;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = synth.waveform;
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = synth.filterFreq;
    filter.Q.value = synth.filterQ;

    // ADSR envelope
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + synth.attack);
    gain.gain.linearRampToValueAtTime(
      vol * synth.sustain,
      when + synth.attack + synth.decay,
    );

    const releaseStart = Math.max(
      when + synth.attack + synth.decay,
      when + noteLength,
    );
    gain.gain.setValueAtTime(vol * synth.sustain, releaseStart);
    gain.gain.linearRampToValueAtTime(0, releaseStart + synth.release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(when);
    osc.stop(releaseStart + synth.release + 0.05);
  }

  /**
   * Play all notes in a step at the given scheduled time.
   */
  function playStep(
    step: StepData,
    synth: SynthState,
    when: number,
    bpm: number,
    subdiv: number,
    masterVolume = 1,
  ): void {
    if (!step.notes.length) return;
    const beatLength = (60 / bpm) / (subdiv / 4);
    for (const n of step.notes) {
      playNote(n.midi, n.velocity, (n.length || 1) * beatLength, synth, when, masterVolume);
    }
  }

  /**
   * Play a note immediately (for preview / piano key clicks).
   */
  function playNoteNow(midi: number, synth: SynthState): void {
    const ctx = init();
    playNote(midi, 100, 0.3, synth, ctx.currentTime);
  }

  return {
    audioCtx,
    init,
    playNote,
    playStep,
    playNoteNow,
  };
}
