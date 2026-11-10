import type { AgeKey, InputKind, PacerPhase, SessionStats } from '../core/types';

export interface SessionSettings {
  age: AgeKey;
  input: InputKind;
  sensitivity: number;
  detail: boolean;
  sound: boolean;
  volume: number;
  sessionSec: number;
}

export interface HudState {
  phase: PacerPhase;
  prompt: string;
  encouragement: string | null;
  stars: number;
  timeLeft: number;
  progress: number;
  calm: number;
  isExhaling: boolean;
  strength: number;
  levelDb: number;
  floorDb: number;
  thresholdDb: number;
  calibrating: boolean;
  paused: boolean;
  done: boolean;
  targetExhaleSec: number;
  stats: SessionStats;
}

export const EMPTY_STATS: SessionStats = {
  stars: 0,
  breaths: 0,
  goodBreaths: 0,
  longestExhaleMs: 0,
  medianExhaleMs: 0,
  breathsPerMinute: 0,
  calm: 0,
  bigMoments: 0,
  elapsedSec: 0,
};

export const PROMPTS: Record<AgeKey, Record<PacerPhase, string>> = {
  little: { inhale: '', exhale: '', rest: '' },
  kid: { inhale: 'Breathe in gently…', exhale: 'Now blow out slowly…', rest: 'Rest…' },
  teen: { inhale: 'Inhale', exhale: 'Exhale slowly', rest: 'Pause' },
};
