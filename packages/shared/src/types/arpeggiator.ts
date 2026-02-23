/** Arpeggiator pattern modes. */
export type ArpPattern =
  | 'up'
  | 'down'
  | 'up-down'
  | 'down-up'
  | 'random'
  | 'converge'
  | 'diverge';

/** Arpeggiator subdivision rate. */
export type ArpRate = '1/4' | '1/8' | '1/8t' | '1/16' | '1/16t' | '1/32';

/** Full arpeggiator settings (per-user, not global). */
export interface ArpSettings {
  enabled: boolean;
  pattern: ArpPattern;
  rate: ArpRate;
  /** Number of octaves to span (1–4). */
  octaveRange: number;
  /** Note gate as fraction of sub-step (0.1–1.0). */
  gate: number;
  /** Swing amount (0–0.5). */
  swing: number;
}

/** A named arpeggiator preset. */
export interface ArpPreset {
  name: string;
  settings: Omit<ArpSettings, 'enabled'>;
}
