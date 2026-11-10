import type { BreathFeatures } from '../core/types';

/**
 * A BreathSensor produces acoustic features ~50–60× per second. Implementations:
 * - MicSensor (web: Web Audio API, native: expo-audio AudioStream)
 * - TouchSensor (hold anywhere on the screen = blow)
 * - SimSensor (scripted breathing for demos / automated checks)
 * Several sensors can be merged with CompositeSensor (max of levels).
 */
export interface BreathSensor {
  readonly kind: 'mic' | 'touch' | 'sim' | 'composite';
  /** Resolves when capturing. May throw (e.g. microphone permission denied). */
  start(): Promise<void>;
  stop(): void;
  /** Latest features. Cheap; called every animation frame. `nowMs` lets scripted sensors run on a virtual clock. */
  read(nowMs?: number): BreathFeatures;
  /** True while the sensor is delivering real data. */
  readonly active: boolean;
}

export class CompositeSensor implements BreathSensor {
  readonly kind = 'composite' as const;
  private sensors: BreathSensor[];
  constructor(sensors: BreathSensor[]) {
    this.sensors = sensors;
  }
  get active() {
    return this.sensors.some((s) => s.active);
  }
  async start() {
    const results = await Promise.allSettled(this.sensors.map((s) => s.start()));
    if (results.every((r) => r.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
  }
  stop() {
    this.sensors.forEach((s) => s.stop());
  }
  read(nowMs?: number): BreathFeatures {
    let best: BreathFeatures = { level: 0, noisiness: 1 };
    for (const s of this.sensors) {
      if (!s.active) continue;
      const f = s.read(nowMs);
      if (f.level > best.level) best = f;
    }
    return best;
  }
}
