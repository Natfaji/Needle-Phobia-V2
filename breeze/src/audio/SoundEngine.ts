import type { WorldKind } from '../core/types';

/** One-shot sound categories. Each maps to one or more CC0 samples (see manifest). */
export type SfxName =
  | 'ui_tap'
  | 'pop'
  | 'bubble'
  | 'bubble_pop'
  | 'plop'
  | 'boing'
  | 'bong'
  | 'bell'
  | 'bell_soft'
  | 'bell_arp'
  | 'xylo'
  | 'magic'
  | 'powerup'
  | 'confirm'
  | 'swish'
  | 'jingle_pizzi'
  | 'jingle_steel'
  | 'win'
  | 'complete';

export type LoopName = 'wind_loop' | 'noise_loop' | 'amb_underwater' | 'amb_bubbles_loop' | 'amb_birds' | 'amb_space';
export type VoiceName = 'press_start' | 'breathe_in' | 'breathe_out';

export interface PlayOptions {
  /** Playback rate (1 = original pitch). 2^(n/12) shifts by n semitones. */
  rate?: number;
  /** 0..1 relative to the SFX bus. */
  volume?: number;
}

export interface SoundEngine {
  /** True once samples are decoded; before that one-shots fall back to a tiny synth. */
  readonly ready: boolean;
  /** Must be called from a user gesture (tap) on the web. Resolves quickly; decoding continues in the background. */
  unlock(): Promise<void>;
  /** Starts the ambience loop for a world (crossfades between worlds). */
  setWorld(world: WorldKind | null): void;
  /** Continuous wind bed that follows the child's breath. Call every frame. */
  setBreath(strength: number, exhaling: boolean): void;
  play(name: SfxName, opts?: PlayOptions): void;
  playVoice(name: VoiceName): void;
  /** Pentatonic step (0..7) so consecutive collectibles form a little melody. */
  chime(step: number): void;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  setPaused(p: boolean): void;
  dispose(): void;
}

/** Semitone offsets of a major pentatonic run (C D E G A C D E). */
export const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

/**
 * All samples are CC0 (public domain) from kenney.nl and opengameart.org —
 * see ../../CREDITS.md. Transcoded to MP3 so Safari on iPad can decode them.
 */
export const SAMPLES: Record<SfxName, number[]> = {
  ui_tap: [require('../../assets/sfx/ui_tap.mp3')],
  pop: [require('../../assets/sfx/pop_1.mp3'), require('../../assets/sfx/pop_2.mp3'), require('../../assets/sfx/pop_3.mp3')],
  bubble: [require('../../assets/sfx/bubble_1.mp3'), require('../../assets/sfx/bubble_2.mp3'), require('../../assets/sfx/bubble_3.mp3')],
  bubble_pop: [require('../../assets/sfx/bubble_pop.mp3')],
  plop: [require('../../assets/sfx/plop_1.mp3'), require('../../assets/sfx/plop_2.mp3')],
  boing: [require('../../assets/sfx/boing_1.mp3'), require('../../assets/sfx/boing_2.mp3'), require('../../assets/sfx/boing_3.mp3')],
  bong: [require('../../assets/sfx/bong.mp3')],
  bell: [require('../../assets/sfx/bell_glass.mp3')],
  bell_soft: [require('../../assets/sfx/bell_soft.mp3')],
  bell_arp: [require('../../assets/sfx/bell_arp.mp3')],
  xylo: [require('../../assets/sfx/xylo_1.mp3'), require('../../assets/sfx/xylo_2.mp3')],
  magic: [require('../../assets/sfx/magic_1.mp3'), require('../../assets/sfx/magic_2.mp3')],
  powerup: [require('../../assets/sfx/powerup.mp3')],
  confirm: [require('../../assets/sfx/confirm.mp3')],
  swish: [require('../../assets/sfx/swish_1.mp3'), require('../../assets/sfx/swish_2.mp3')],
  jingle_pizzi: [require('../../assets/sfx/jingle_pizzi_1.mp3'), require('../../assets/sfx/jingle_pizzi_2.mp3')],
  jingle_steel: [require('../../assets/sfx/jingle_steel_1.mp3'), require('../../assets/sfx/jingle_steel_2.mp3')],
  win: [require('../../assets/sfx/win_jingle.mp3')],
  complete: [require('../../assets/sfx/complete.mp3')],
};

export const VOICES: Record<VoiceName, number> = {
  press_start: require('../../assets/voice/press start to begin - nl.mp3'),
  breathe_in: require('../../assets/voice/breathe in - nl.mp3'),
  breathe_out: require('../../assets/voice/breathe out - nl.mp3'),
};

export const LOOPS: Record<LoopName, number> = {
  wind_loop: require('../../assets/sfx/wind_loop.mp3'),
  noise_loop: require('../../assets/sfx/noise_loop.mp3'),
  amb_underwater: require('../../assets/sfx/amb_underwater.mp3'),
  amb_bubbles_loop: require('../../assets/sfx/amb_bubbles_loop.mp3'),
  amb_birds: require('../../assets/sfx/amb_birds.mp3'),
  amb_space: require('../../assets/sfx/amb_space.mp3'),
};

export const AMBIENCE_BY_WORLD: Record<WorldKind, LoopName[]> = {
  pond: ['amb_underwater', 'amb_bubbles_loop'],
  sky: ['amb_birds'],
  nebula: ['amb_space'],
};

export const WIND_BY_WORLD: Record<WorldKind, LoopName> = {
  pond: 'amb_bubbles_loop',
  sky: 'wind_loop',
  nebula: 'noise_loop',
};
