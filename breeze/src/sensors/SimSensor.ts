import type { BreathFeatures } from '../core/types';
import type { BreathSensor } from './BreathSensor';

/**
 * Scripted breathing used for demos and for checking the game without a
 * microphone (`?sim=1`). Breathes in a loop: silence (inhale) → a shaped
 * exhale with slight tremor → pause, with random variation like a real child.
 */
export class SimSensor implements BreathSensor {
  readonly kind = 'sim' as const;
  active = false;
  /** Number of scripted breath cycles completed (ground truth for tests). */
  cycles = 0;
  private t0 = 0;
  private cycle: { inhale: number; exhale: number; rest: number; peak: number } = { inhale: 2, exhale: 4, rest: 0.8, peak: 0.5 };
  private cycleStart = 0;
  constructor(
    private baseExhaleSec = 4,
    private jitter = 0.35,
    private rand: () => number = Math.random,
    private peakLevel = 0.55,
    private inhaleSec = 2.2,
  ) {}

  private newCycle() {
    const j = (a: number) => a * (1 + (this.rand() * 2 - 1) * this.jitter);
    return { inhale: j(this.inhaleSec), exhale: j(this.baseExhaleSec), rest: j(0.8), peak: this.peakLevel * (0.65 + this.rand() * 0.7) };
  }
  async start() {
    this.active = true;
    this.t0 = -1;
    this.cycleStart = 0;
    this.cycle = this.newCycle();
  }
  stop() {
    this.active = false;
  }
  read(nowMs: number = Date.now()): BreathFeatures {
    if (this.t0 < 0) this.t0 = nowMs;
    const t = (nowMs - this.t0) / 1000;
    let local = t - this.cycleStart;
    const total = this.cycle.inhale + this.cycle.exhale + this.cycle.rest;
    if (local > total) {
      this.cycleStart = t;
      this.cycle = this.newCycle();
      this.cycles += 1;
      local = 0;
    }
    const noiseFloor = 0.004 + this.rand() * 0.002;
    if (local < this.cycle.inhale || local > this.cycle.inhale + this.cycle.exhale) {
      return { level: noiseFloor, noisiness: 0.5 };
    }
    const e = (local - this.cycle.inhale) / this.cycle.exhale; // 0..1 through exhale
    const env = Math.sin(Math.PI * Math.min(1, e * 1.15)) ** 0.6;
    const tremor = 1 + 0.12 * Math.sin(t * 23) + 0.06 * Math.sin(t * 41);
    return { level: noiseFloor + this.cycle.peak * env * tremor, noisiness: 0.9 };
  }
}
