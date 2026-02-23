import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ArpPattern, ArpRate, ArpSettings, ArpPreset } from '@beatcord/shared';

export const ARP_PRESETS: ArpPreset[] = [
  { name: 'Classic Up',     settings: { pattern: 'up',      rate: '1/16',  octaveRange: 1, gate: 0.8,  swing: 0   } },
  { name: 'Down Sweep',     settings: { pattern: 'down',    rate: '1/16',  octaveRange: 2, gate: 0.6,  swing: 0   } },
  { name: 'Trance Gate',    settings: { pattern: 'up-down', rate: '1/16',  octaveRange: 1, gate: 0.5,  swing: 0   } },
  { name: 'Random Glitch',  settings: { pattern: 'random',  rate: '1/32',  octaveRange: 2, gate: 0.3,  swing: 0.2 } },
  { name: 'Slow Arp',       settings: { pattern: 'up',      rate: '1/4',   octaveRange: 2, gate: 0.9,  swing: 0   } },
  { name: 'Fast Arp',       settings: { pattern: 'up-down', rate: '1/32',  octaveRange: 1, gate: 0.4,  swing: 0   } },
  { name: 'Converge',       settings: { pattern: 'converge', rate: '1/16', octaveRange: 1, gate: 0.7,  swing: 0   } },
  { name: 'Diverge Sweep',  settings: { pattern: 'diverge', rate: '1/8',   octaveRange: 2, gate: 0.8,  swing: 0.1 } },
];

export const useArpeggiatorStore = defineStore('arpeggiator', () => {
  const enabled = ref(false);
  const pattern = ref<ArpPattern>('up');
  const rate = ref<ArpRate>('1/16');
  const octaveRange = ref(1);
  const gate = ref(0.8);
  const swing = ref(0);
  const selectedPreset = ref<string | null>(null);

  function toggle() {
    enabled.value = !enabled.value;
  }

  function applyPreset(name: string) {
    const preset = ARP_PRESETS.find((p) => p.name === name);
    if (!preset) return;
    selectedPreset.value = name;
    pattern.value = preset.settings.pattern;
    rate.value = preset.settings.rate;
    octaveRange.value = preset.settings.octaveRange;
    gate.value = preset.settings.gate;
    swing.value = preset.settings.swing;
  }

  function getSettings(): ArpSettings {
    return {
      enabled: enabled.value,
      pattern: pattern.value,
      rate: rate.value,
      octaveRange: octaveRange.value,
      gate: gate.value,
      swing: swing.value,
    };
  }

  function reset() {
    enabled.value = false;
    pattern.value = 'up';
    rate.value = '1/16';
    octaveRange.value = 1;
    gate.value = 0.8;
    swing.value = 0;
    selectedPreset.value = null;
  }

  return {
    enabled,
    pattern,
    rate,
    octaveRange,
    gate,
    swing,
    selectedPreset,
    toggle,
    applyPreset,
    getSettings,
    reset,
  };
});
