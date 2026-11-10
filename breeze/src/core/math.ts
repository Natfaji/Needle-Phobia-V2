/** Small math helpers shared by the simulation and the renderer. */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** Exponential approach: moves `current` toward `target` with time constant `tau` (seconds). */
export const approach = (current: number, target: number, dt: number, tau: number) =>
  current + (target - current) * (1 - Math.exp(-dt / Math.max(1e-4, tau)));

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.round(p * (s.length - 1)), 0, s.length - 1);
  return s[idx];
};
export const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
export const stddev = (values: number[]) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (values.length - 1));
};

/** Deterministic PRNG (mulberry32) so a session can be replayed / tested. */
export class Rng {
  private s: number;
  constructor(seed = 1234567) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number) {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number) {
    return this.next() < p;
  }
}

/** HSL (h in degrees, s/l in 0..1) to premultiplied-free RGBA float array usable as a Skia color. */
export const hsla = (h: number, s: number, l: number, a = 1): Float32Array => {
  const hh = (((h % 360) + 360) % 360) / 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t0: number) => {
      let t = t0;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(hh + 1 / 3);
    g = hue2rgb(hh);
    b = hue2rgb(hh - 1 / 3);
  }
  return Float32Array.of(r, g, b, a);
};
export const rgba = (r: number, g: number, b: number, a = 1) => Float32Array.of(r, g, b, a);
export const withAlpha = (c: Float32Array, a: number) => Float32Array.of(c[0], c[1], c[2], a);
