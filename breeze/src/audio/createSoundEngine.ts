import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { WorldKind } from '../core/types';
import {
  AMBIENCE_BY_WORLD,
  LOOPS,
  PENTATONIC,
  SAMPLES,
  VOICES,
  WIND_BY_WORLD,
  type LoopName,
  type PlayOptions,
  type SfxName,
  type SoundEngine,
  type VoiceName,
} from './SoundEngine';

/**
 * Native (iOS / Android) implementation on expo-audio players. One player
 * per sample variant; loops for ambience and the breath-following wind bed.
 * Not exercised in the browser build; kept API-compatible with the web engine.
 */
class NativeSoundEngine implements SoundEngine {
  ready = false;
  private players = new Map<SfxName, AudioPlayer[]>();
  private voices = new Map<VoiceName, AudioPlayer>();
  private loops = new Map<LoopName, AudioPlayer>();
  private world: WorldKind | null = null;
  private wind: AudioPlayer | null = null;
  private ambience: AudioPlayer[] = [];
  private volume = 0.85;
  private muted = false;
  private paused = false;

  async unlock() {
    if (this.ready) return;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    (Object.keys(SAMPLES) as SfxName[]).forEach((name) => {
      this.players.set(
        name,
        SAMPLES[name].map((mod) => {
          const p = createAudioPlayer(mod);
          p.shouldCorrectPitch = false;
          return p;
        }),
      );
    });
    (Object.keys(LOOPS) as LoopName[]).forEach((name) => {
      const p = createAudioPlayer(LOOPS[name]);
      p.loop = true;
      p.volume = 0;
      this.loops.set(name, p);
    });
    (Object.keys(VOICES) as VoiceName[]).forEach((name) => {
      this.voices.set(name, createAudioPlayer(VOICES[name]));
    });
    this.ready = true;
    if (this.world) this.applyWorld(this.world);
  }

  setWorld(world: WorldKind | null) {
    this.world = world;
    if (this.ready) this.applyWorld(world);
  }

  private applyWorld(world: WorldKind | null) {
    this.ambience.forEach((p) => p.pause());
    this.ambience = [];
    if (this.wind) {
      this.wind.pause();
      this.wind = null;
    }
    if (!world) return;
    AMBIENCE_BY_WORLD[world].forEach((name, i) => {
      const p = this.loops.get(name);
      if (!p) return;
      p.volume = this.effVolume(i === 0 ? 0.5 : 0.2);
      p.play();
      this.ambience.push(p);
    });
    const w = this.loops.get(WIND_BY_WORLD[world]);
    if (w) {
      w.volume = 0;
      w.play();
      this.wind = w;
    }
  }

  private effVolume(v: number) {
    return this.muted ? 0 : v * this.volume;
  }

  setBreath(strength: number, exhaling: boolean) {
    if (!this.wind) return;
    this.wind.volume = this.effVolume(exhaling ? 0.05 + 0.5 * Math.min(1, strength) : 0);
  }

  play(name: SfxName, opts: PlayOptions = {}) {
    if (this.paused) return;
    const list = this.players.get(name);
    if (!list || list.length === 0) return;
    const p = list[Math.floor(Math.random() * list.length)];
    p.setPlaybackRate(opts.rate ?? 1, 'low');
    p.volume = this.effVolume(opts.volume ?? 1);
    p.seekTo(0).then(() => p.play());
  }

  playVoice(name: VoiceName) {
    if (this.paused || this.muted) return;
    const p = this.voices.get(name);
    if (!p) return;
    p.volume = this.volume;
    p.seekTo(0).then(() => p.play());
  }

  chime(step: number) {
    const idx = Math.max(0, Math.min(PENTATONIC.length - 1, step));
    this.play('bell', { rate: Math.pow(2, PENTATONIC[idx] / 12), volume: 0.75 });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.ambience.forEach((p, i) => (p.volume = this.effVolume(i === 0 ? 0.5 : 0.2)));
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.setVolume(this.volume);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.ambience.forEach((a) => a.pause());
      this.wind?.pause();
    } else {
      this.ambience.forEach((a) => a.play());
      this.wind?.play();
    }
  }

  dispose() {
    this.setWorld(null);
    this.players.forEach((list) => list.forEach((p) => p.remove()));
    this.loops.forEach((p) => p.remove());
    this.voices.forEach((p) => p.remove());
    this.players.clear();
    this.loops.clear();
    this.voices.clear();
    this.ready = false;
  }
}

let singleton: SoundEngine | null = null;
export function createSoundEngine(): SoundEngine {
  if (!singleton) singleton = new NativeSoundEngine();
  return singleton;
}
