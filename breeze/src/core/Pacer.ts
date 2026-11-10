import { clamp, easeInOut, lerp } from './math';
import type { AgeProfile } from './profiles';
import type { PacerPhase } from './types';

export interface PacerView {
  phase: PacerPhase;
  /** 0..1 progress inside the current phase. */
  progress: number;
  /** 0 (empty lungs) .. 1 (full) — drives the guide ring / cheeks. */
  ringScale: number;
  targetExhaleMs: number;
  cycles: number;
}

/**
 * Breathing pacer that *follows the child* rather than forcing a rhythm:
 * - an exhale detected during inhale/rest jumps the guide to "exhale" so the
 *   visuals never contradict what the child is doing;
 * - an exhale that ends early releases the guide early;
 * - an exhale that goes on longer than the target is celebrated, up to a cap;
 * - the exhale target slowly stretches toward 1.15 × the child's own median,
 *   bounded by the age profile, so lung capacity is respected.
 */
export class Pacer {
  profile: AgeProfile;
  phase: PacerPhase = 'inhale';
  elapsed = 0;
  duration: number;
  targetExhaleMs: number;
  cycles = 0;
  private hadExhale = false;
  onPhase?: (phase: PacerPhase) => void;

  constructor(profile: AgeProfile) {
    this.profile = profile;
    this.targetExhaleMs = profile.exhaleSecStart * 1000;
    this.duration = profile.inhaleSec * 1000;
  }

  setProfile(profile: AgeProfile) {
    this.profile = profile;
    this.targetExhaleMs = clamp(this.targetExhaleMs, profile.exhaleSecMin * 1000, profile.exhaleSecMax * 1000);
  }

  get progress() {
    return clamp(this.elapsed / this.duration, 0, 1);
  }

  get ringScale() {
    const p = easeInOut(this.progress);
    if (this.phase === 'inhale') return p;
    if (this.phase === 'exhale') return 1 - p;
    return 0;
  }

  view(): PacerView {
    return {
      phase: this.phase,
      progress: this.progress,
      ringScale: this.ringScale,
      targetExhaleMs: this.targetExhaleMs,
      cycles: this.cycles,
    };
  }

  update(dtMs: number, isExhaling: boolean) {
    this.elapsed += dtMs;
    const maxMs = this.profile.exhaleSecMax * 1000;
    switch (this.phase) {
      case 'inhale':
        if (isExhaling && this.elapsed > 250) this.go('exhale');
        else if (this.elapsed >= this.duration) this.go('exhale');
        break;
      case 'exhale':
        if (isExhaling) {
          this.hadExhale = true;
          if (this.elapsed >= maxMs) this.go('rest');
        } else if (this.elapsed >= this.duration) {
          this.go('rest');
        } else if (this.hadExhale && this.elapsed > this.duration * 0.5) {
          this.go('rest');
        }
        break;
      case 'rest':
        if (isExhaling) this.go('exhale');
        else if (this.elapsed >= this.duration) this.go('inhale');
        break;
    }
  }

  /** Adapt the exhale target after each counted exhale. */
  recordExhale(medianMs: number) {
    if (medianMs <= 0) return;
    const desired = clamp(
      medianMs * this.profile.stretch,
      this.profile.exhaleSecMin * 1000,
      this.profile.exhaleSecMax * 1000,
    );
    this.targetExhaleMs = lerp(this.targetExhaleMs, desired, this.profile.adaptRate);
  }

  private go(phase: PacerPhase) {
    this.phase = phase;
    this.elapsed = 0;
    this.hadExhale = false;
    if (phase === 'inhale') {
      this.duration = this.profile.inhaleSec * 1000;
      this.cycles += 1;
    } else if (phase === 'exhale') {
      this.duration = this.targetExhaleMs;
    } else {
      this.duration = this.profile.restSec * 1000;
    }
    this.onPhase?.(phase);
  }
}
