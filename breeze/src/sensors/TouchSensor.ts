import type { BreathFeatures } from '../core/types';
import type { BreathSensor } from './BreathSensor';

/**
 * Fallback input: holding a finger on the screen "blows". The level ramps up
 * over ~250 ms and wobbles slightly so the engine's steadiness metric and the
 * visuals behave like a real breath.
 */
export class TouchSensor implements BreathSensor {
  readonly kind = 'touch' as const;
  active = false;
  private pressed = false;
  private level = 0;
  private last = 0;

  async start() {
    this.active = true;
    this.last = Date.now();
  }
  stop() {
    this.active = false;
    this.pressed = false;
    this.level = 0;
  }
  setPressed(p: boolean) {
    this.pressed = p;
  }
  read(): BreathFeatures {
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const target = this.pressed ? 0.35 + 0.03 * Math.sin(now / 90) : 0;
    const tau = this.pressed ? 0.25 : 0.12;
    this.level += (target - this.level) * (1 - Math.exp(-dt / tau));
    return { level: this.level, noisiness: 1 };
  }
}
