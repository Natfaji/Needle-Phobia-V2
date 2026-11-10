/** Shared domain types for Breeze. */

export type AgeKey = 'little' | 'kid' | 'teen';
export type WorldKind = 'pond' | 'sky' | 'nebula';
export type InputKind = 'mic' | 'touch' | 'sim';
export type PacerPhase = 'inhale' | 'exhale' | 'rest';

/** One frame of acoustic features produced by a BreathSensor. */
export interface BreathFeatures {
  /** Linear RMS amplitude, 0..1 (1 = full scale). */
  level: number;
  /**
   * How noise-like the sound is, 0..1. Blowing on a microphone is broadband
   * turbulence (≈1); speech and tones are harmonic (≈0). Used to ignore voices
   * for older children; ignored for the youngest profile.
   */
  noisiness: number;
}

export interface BreathState {
  /** Smoothed, auto-normalised exhale strength 0..1. */
  strength: number;
  isExhaling: boolean;
  /** Milliseconds since the current exhale started (0 when idle). */
  exhaleElapsedMs: number;
  levelDb: number;
  floorDb: number;
  thresholdDb: number;
  peakDb: number;
  calibrating: boolean;
}

export interface ExhaleSummary {
  durationMs: number;
  meanStrength: number;
  /** 1 = perfectly steady airflow, 0 = very jerky. */
  steadiness: number;
  /** True when the exhale was long enough to count as a "calm breath". */
  good: boolean;
  endedAt: number;
}

export type GameEventType =
  | 'collect'
  | 'ring'
  | 'bigMoment'
  | 'exhaleStart'
  | 'exhaleEnd'
  | 'phase'
  | 'friend'
  | 'sessionEnd';

export interface GameEvent {
  type: GameEventType;
  x?: number;
  y?: number;
  hue?: number;
  /** Index of the chime in an ascending musical run (combo). */
  n?: number;
  phase?: PacerPhase;
  good?: boolean;
  strength?: number;
}

export interface SessionStats {
  stars: number;
  breaths: number;
  goodBreaths: number;
  longestExhaleMs: number;
  medianExhaleMs: number;
  breathsPerMinute: number;
  calm: number;
  bigMoments: number;
  elapsedSec: number;
}
