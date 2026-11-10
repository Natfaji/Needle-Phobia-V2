import type { AgeKey, WorldKind } from './types';

/**
 * Age profiles. Every number here is a *game tuning* value derived from the
 * physiology and evidence summarised in ../../research.md:
 *
 * - Resting respiratory rate falls with age (Fleming et al., Lancet 2011):
 *   ~24–30/min at 2–4 y, ~18–22/min at 6–12 y, ~12–16/min at 13–18 y.
 *   A therapeutic "slow" breath must be slower than resting but still
 *   achievable, so the paced cycle length grows with age.
 * - Exhale longer than inhale (≈1:1.5–1:2) maximises the vagal / relaxation
 *   effect (Van Diest et al. 2014; Zaccaro et al. 2018; Balban et al. 2023).
 * - Resonance-frequency breathing (~5.5–6 breaths/min) is the adult / teen
 *   optimum (Lehrer & Gevirtz 2014); children's resonance frequency is a bit
 *   higher, so the kid profile aims at ~7–8 breaths/min.
 * - Vital capacity and sustainable exhale time grow with age (maximum
 *   phonation time is ~5–8 s at 3–5 y, ~8–12 s at 6–9 y, >15 s in teens),
 *   so exhale targets are capped well below what would make a child strain.
 * - Very young children cannot follow pacing instructions and are better
 *   served by rich, movie-like stimulation that reacts to *anything* they do
 *   (MacLaren & Cohen 2005), so the `little` profile is non-directive.
 */
export interface AgeProfile {
  key: AgeKey;
  label: string;
  ages: string;
  world: WorldKind;
  tagline: string;

  // ---- Pacing (seconds) -------------------------------------------------
  /** Suggested inhale length shown by the pacer. */
  inhaleSec: number;
  /** Starting exhale target; adapts toward the child's own median exhale × `stretch`. */
  exhaleSecStart: number;
  exhaleSecMin: number;
  exhaleSecMax: number;
  restSec: number;
  /** target = lerp(target, clamp(median × stretch), adaptRate) after each breath. */
  stretch: number;
  adaptRate: number;

  // ---- Detection ----------------------------------------------------------
  /** Milliseconds above threshold before an exhale is declared. */
  onsetMs: number;
  /** Milliseconds below threshold before the exhale is declared over. */
  releaseMs: number;
  /** Exhales shorter than this are ignored (coughs, taps). */
  minExhaleMs: number;
  /** Whether voice / any noise should drive the game (true only for toddlers). */
  acceptVoice: boolean;
  /** dB penalty applied to harmonic (voice-like) sound when acceptVoice is false. */
  voicePenaltyDb: number;
  /** Fraction of the pacer target that counts as a "calm breath". */
  goodFraction: number;

  // ---- Gameplay ------------------------------------------------------------
  /** Strength band [lo, hi] that gives full lift. Gentle > forceful. */
  sweetSpot: [number, number];
  /** Pixels-per-second world scroll at rest / at full breath (scaled by width/1024). */
  scrollBase: number;
  scrollBoost: number;
  /** Radius (px @1024 wide) inside which collectibles are pulled toward the hero. */
  magnetRadius: number;
  /** Calm breaths needed for a "big moment" (null = time based). */
  breathsPerBigMoment: number | null;
  /** Seconds between big moments when time based. */
  bigMomentEverySec: number;
  /** Seconds between ambient "friend" appearances that need no input. */
  friendEverySec: number;
  /** Seconds between collectible groups. */
  spawnEverySec: number;
  /** Collectibles per group. */
  groupSize: number;
  sessionSec: number;
  showPacerText: boolean;
  showStats: boolean;
  /** Touch on the screen also counts as blowing (always on for the youngest). */
  touchAlwaysOn: boolean;
}

export const PROFILES: Record<AgeKey, AgeProfile> = {
  little: {
    key: 'little',
    label: 'Little ones',
    ages: '2 – 5 years',
    world: 'pond',
    tagline: 'Puff the fish blows bubbles. Anything you do makes magic happen.',
    inhaleSec: 1.6,
    exhaleSecStart: 1.8,
    exhaleSecMin: 1.0,
    exhaleSecMax: 3.0,
    restSec: 1.0,
    stretch: 1.1,
    adaptRate: 0.25,
    onsetMs: 40,
    releaseMs: 350,
    minExhaleMs: 120,
    acceptVoice: true,
    voicePenaltyDb: 0,
    goodFraction: 0.4,
    sweetSpot: [0.05, 1.0],
    scrollBase: 45,
    scrollBoost: 80,
    magnetRadius: 420,
    breathsPerBigMoment: null,
    bigMomentEverySec: 22,
    friendEverySec: 7,
    spawnEverySec: 2.2,
    groupSize: 3,
    sessionSec: 150,
    showPacerText: false,
    showStats: false,
    touchAlwaysOn: true,
  },
  kid: {
    key: 'kid',
    label: 'Kids',
    ages: '6 – 12 years',
    world: 'sky',
    tagline: 'Fly the balloon with slow, gentle breaths and collect the stars.',
    inhaleSec: 2.5,
    exhaleSecStart: 3.5,
    exhaleSecMin: 1.5,
    exhaleSecMax: 6.0,
    restSec: 0.8,
    stretch: 1.15,
    adaptRate: 0.3,
    onsetMs: 80,
    releaseMs: 300,
    minExhaleMs: 300,
    acceptVoice: false,
    voicePenaltyDb: 16,
    goodFraction: 0.6,
    sweetSpot: [0.18, 0.75],
    scrollBase: 40,
    scrollBoost: 110,
    magnetRadius: 240,
    breathsPerBigMoment: 4,
    bigMomentEverySec: 45,
    friendEverySec: 16,
    spawnEverySec: 3.0,
    groupSize: 6,
    sessionSec: 180,
    showPacerText: true,
    showStats: true,
    touchAlwaysOn: false,
  },
  teen: {
    key: 'teen',
    label: 'Teens',
    ages: '13 – 18 years',
    world: 'nebula',
    tagline: 'Steer the comet with long, steady exhales. Smoothness is the score.',
    inhaleSec: 4.0,
    exhaleSecStart: 5.0,
    exhaleSecMin: 2.5,
    exhaleSecMax: 8.0,
    restSec: 0.6,
    stretch: 1.15,
    adaptRate: 0.3,
    onsetMs: 90,
    releaseMs: 300,
    minExhaleMs: 400,
    acceptVoice: false,
    voicePenaltyDb: 20,
    goodFraction: 0.6,
    sweetSpot: [0.15, 0.7],
    scrollBase: 50,
    scrollBoost: 130,
    magnetRadius: 170,
    breathsPerBigMoment: 4,
    bigMomentEverySec: 50,
    friendEverySec: 20,
    spawnEverySec: 3.5,
    groupSize: 7,
    sessionSec: 180,
    showPacerText: true,
    showStats: true,
    touchAlwaysOn: false,
  },
};

export const AGE_KEYS: AgeKey[] = ['little', 'kid', 'teen'];
