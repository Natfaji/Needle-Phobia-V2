import { clamp, mean, median, percentile, stddev } from './math';
import type { AgeProfile } from './profiles';
import type { BreathFeatures, BreathState, ExhaleSummary } from './types';

/**
 * Turns a stream of acoustic features into exhale events and a normalised
 * strength value. Everything adapts online so the same code works for a
 * quiet three-year-old and a teenager blowing hard at a different distance:
 *
 * - an adaptive noise floor (falls fast, rises slowly, frozen while exhaling)
 * - an adaptive peak reference so "full strength" is relative to *this* child
 * - hysteresis + hold times so the game never flickers
 * - an optional harmonic penalty so talking does not move the game
 */
export class BreathEngine {
  profile: AgeProfile;
  /** 0.5 (needs loud blowing) .. 2.5 (very sensitive). */
  sensitivity = 1;
  /** Set by the pacer: exhales at least this long are "calm breaths". */
  goodMs = 2000;

  floorDb = -60;
  peakDb = -30;
  levelDb = -90;
  effDb = -90;
  strength = 0;
  isExhaling = false;
  calibrating = true;

  onExhaleStart?: (t: number) => void;
  onExhaleEnd?: (s: ExhaleSummary) => void;

  private calibSamples: number[] = [];
  private calibStart = -1;
  private aboveSince = -1;
  private belowSince = -1;
  private exhaleStart = 0;
  private lastT = -1;
  private samples: number[] = [];
  private durations: number[] = [];
  private endTimes: number[] = [];
  longestMs = 0;
  totalExhales = 0;

  constructor(profile: AgeProfile) {
    this.profile = profile;
  }

  setProfile(profile: AgeProfile) {
    this.profile = profile;
  }

  /** Re-learn the room noise floor (takes ~0.8 s of silence). */
  calibrate() {
    this.calibrating = true;
    this.calibSamples = [];
    this.calibStart = -1;
    this.isExhaling = false;
    this.aboveSince = -1;
    this.belowSince = -1;
    this.strength = 0;
  }

  private get gapDb() {
    return 9 / clamp(this.sensitivity, 0.3, 3);
  }
  get thresholdOnDb() {
    return this.floorDb + this.gapDb;
  }
  get thresholdOffDb() {
    return this.floorDb + this.gapDb * 0.55;
  }

  get state(): BreathState {
    return {
      strength: this.strength,
      isExhaling: this.isExhaling,
      exhaleElapsedMs: this.isExhaling ? this.lastT - this.exhaleStart : 0,
      levelDb: this.levelDb,
      floorDb: this.floorDb,
      thresholdDb: this.thresholdOnDb,
      peakDb: this.peakDb,
      calibrating: this.calibrating,
    };
  }

  medianExhaleMs() {
    return median(this.durations.slice(-8));
  }

  /** Exhales per minute over the last 60 s (scaled up when the session is shorter). */
  breathsPerMinute(now: number, sessionStart: number) {
    const windowMs = Math.min(60000, Math.max(10000, now - sessionStart));
    const n = this.endTimes.filter((t) => now - t <= windowMs).length;
    return (n * 60000) / windowMs;
  }

  /** Feed one frame of features. `t` is a monotonic time in ms. */
  push(f: BreathFeatures, t: number) {
    const dt = this.lastT < 0 ? 16 : clamp(t - this.lastT, 1, 100);
    this.lastT = t;
    const db = 20 * Math.log10(Math.max(f.level, 1e-5));
    this.levelDb = db;
    const penalty = this.profile.acceptVoice ? 0 : (1 - clamp(f.noisiness, 0, 1)) * this.profile.voicePenaltyDb;
    const eff = db - penalty;
    this.effDb = eff;

    if (this.calibrating) {
      if (this.calibStart < 0) this.calibStart = t;
      this.calibSamples.push(db);
      if (t - this.calibStart >= 800 && this.calibSamples.length >= 10) {
        this.floorDb = clamp(percentile(this.calibSamples, 0.6), -90, -25);
        this.peakDb = this.floorDb + 24;
        this.calibrating = false;
      }
      return;
    }

    // Noise floor: drop quickly, creep up slowly, never while blowing.
    if (!this.isExhaling) {
      if (db < this.floorDb) this.floorDb += (db - this.floorDb) * 0.25;
      else this.floorDb += 0.5 * (dt / 1000);
    }
    this.floorDb = clamp(this.floorDb, -90, -25);
    const on = this.thresholdOnDb;
    const off = this.thresholdOffDb;

    // Peak reference: follows the loudest recent exhale, decays slowly so a
    // gentle blower still reaches full strength after a few breaths.
    if (this.isExhaling && eff > this.peakDb) this.peakDb += (eff - this.peakDb) * 0.15;
    this.peakDb -= 0.35 * (dt / 1000);
    this.peakDb = Math.max(this.peakDb, on + 7);

    const raw = clamp((eff - on) / Math.max(4, this.peakDb - on), 0, 1);

    if (!this.isExhaling) {
      if (eff > on) {
        if (this.aboveSince < 0) this.aboveSince = t;
        if (t - this.aboveSince >= this.profile.onsetMs) {
          this.isExhaling = true;
          this.exhaleStart = this.aboveSince;
          this.samples = [];
          this.belowSince = -1;
          this.onExhaleStart?.(t);
        }
      } else {
        this.aboveSince = -1;
      }
    } else {
      this.samples.push(raw);
      if (eff < off) {
        if (this.belowSince < 0) this.belowSince = t;
        if (t - this.belowSince >= this.profile.releaseMs) this.endExhale(this.belowSince);
      } else {
        this.belowSince = -1;
      }
      // A 15 s "exhale" is continuous noise, not a breath: absorb it into the floor.
      if (this.isExhaling && t - this.exhaleStart > 15000) {
        this.floorDb = eff - 2;
        this.endExhale(t);
      }
    }

    // Strength envelope: fast attack, gentle release.
    const target = this.isExhaling ? Math.max(raw, 0.06) : 0;
    const tau = target > this.strength ? 0.06 : 0.18;
    this.strength += (target - this.strength) * (1 - Math.exp(-(dt / 1000) / tau));
  }

  private endExhale(tEnd: number) {
    const durationMs = tEnd - this.exhaleStart;
    this.isExhaling = false;
    this.aboveSince = -1;
    this.belowSince = -1;
    if (durationMs < this.profile.minExhaleMs) return;
    const core = this.samples.slice(
      Math.floor(this.samples.length * 0.15),
      Math.max(1, Math.floor(this.samples.length * 0.85)),
    );
    const m = mean(core);
    const sd = stddev(core);
    const steadiness = clamp(1 - sd / 0.3, 0, 1);
    const summary: ExhaleSummary = {
      durationMs,
      meanStrength: m,
      steadiness,
      good: durationMs >= this.goodMs,
      endedAt: tEnd,
    };
    this.durations.push(durationMs);
    this.endTimes.push(tEnd);
    this.totalExhales += 1;
    this.longestMs = Math.max(this.longestMs, durationMs);
    this.onExhaleEnd?.(summary);
  }
}
