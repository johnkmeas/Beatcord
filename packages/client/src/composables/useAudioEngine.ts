import { shallowRef } from 'vue';
import type { StepData, SynthState } from '@beatcord/shared';

const audioCtx = shallowRef<AudioContext | null>(null);

// ── Persistent effects nodes (created once per AudioContext) ──
let effectsInput: GainNode | null = null;
let dryGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delayWet: GainNode | null = null;
let convolver: ConvolverNode | null = null;
let reverbWet: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

/** Track the last reverb decay so we only regenerate the IR when it changes. */
let lastReverbDecay = -1;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Generate a stereo impulse response buffer for a simple reverb.
 * Uses exponential-decay white noise.
 */
function generateImpulseResponse(
  ctx: AudioContext,
  decay: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * decay);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  return buffer;
}

/**
 * Wire up the persistent effects graph.
 * Call once after creating the AudioContext.
 */
function initEffectsChain(ctx: AudioContext): void {
  effectsInput = ctx.createGain();

  // Dry path
  dryGain = ctx.createGain();
  dryGain.gain.value = 1;

  // Delay
  delayNode = ctx.createDelay(2); // max 2 s
  delayNode.delayTime.value = 0.3;
  delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.3;
  delayWet = ctx.createGain();
  delayWet.gain.value = 0;

  // Reverb
  convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, 1.5);
  lastReverbDecay = 1.5;
  reverbWet = ctx.createGain();
  reverbWet.gain.value = 0;

  // Compressor (gentle, to tame peaks from delay/reverb tails)
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  // ── Routing ──
  // effectsInput → dry
  effectsInput.connect(dryGain);
  dryGain.connect(compressor);

  // effectsInput → delay → delayWet → compressor
  effectsInput.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode); // feedback loop
  delayNode.connect(delayWet);
  delayWet.connect(compressor);

  // effectsInput → convolver → reverbWet → compressor
  effectsInput.connect(convolver);
  convolver.connect(reverbWet);
  reverbWet.connect(compressor);

  // compressor → destination
  compressor.connect(ctx.destination);
}

export function useAudioEngine() {
  function init(): AudioContext {
    if (!audioCtx.value) {
      audioCtx.value = new AudioContext();
      initEffectsChain(audioCtx.value);
    }
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume();
    }
    return audioCtx.value;
  }

  /**
   * Update persistent effects nodes to match the current synth state.
   * Cheap to call every scheduler tick — only touches AudioParam values.
   */
  function updateEffects(synth: SynthState): void {
    const ctx = audioCtx.value;
    if (!ctx || !effectsInput) return;

    // Delay params
    delayNode!.delayTime.value = synth.delayTime;
    delayFeedback!.gain.value = Math.min(synth.delayFeedback, 0.9);
    delayWet!.gain.value = synth.delayMix;
    dryGain!.gain.value = 1 - 0.5 * Math.max(synth.delayMix, synth.reverbMix);

    // Reverb params
    reverbWet!.gain.value = synth.reverbMix;

    // Regenerate impulse response only when decay changes
    if (Math.abs(synth.reverbDecay - lastReverbDecay) > 0.01) {
      convolver!.buffer = generateImpulseResponse(ctx, synth.reverbDecay);
      lastReverbDecay = synth.reverbDecay;
    }
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

    const dest = effectsInput ?? ctx.destination;

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
    gain.connect(dest);

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
    updateEffects,
    playNote,
    playStep,
    playNoteNow,
  };
}
