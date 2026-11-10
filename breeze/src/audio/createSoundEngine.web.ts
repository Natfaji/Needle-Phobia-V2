import { Asset } from 'expo-asset';
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

interface LoopVoice {
  src: AudioBufferSourceNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
}

/**
 * Web Audio implementation. Polyphonic one-shots, a breath-following wind
 * bed (looping noise through a low-pass filter whose cutoff and gain track
 * the exhale), and a per-world ambience loop. If a sample is missing or
 * cannot be decoded, a tiny synthesizer stands in so the game is never silent.
 */
class WebSoundEngine implements SoundEngine {
  ready = false;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private buffers = new Map<string, AudioBuffer[]>();
  private loopBuffers = new Map<LoopName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private wind: LoopVoice | null = null;
  private windName: LoopName | null = null;
  private ambience: LoopVoice[] = [];
  private world: WorldKind | null = null;
  private volume = 0.85;
  private muted = false;
  private paused = false;

  private get AC(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    return (window as any).AudioContext ?? (window as any).webkitAudioContext ?? null;
  }

  async unlock() {
    const AC = this.AC;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.master);
      this.ambBus = this.ctx.createGain();
      this.ambBus.gain.value = 0.55;
      this.ambBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Will be retried by the next gesture.
      }
    }
    if (!this.loading) {
      this.loading = this.loadAll().then(() => {
        this.ready = true;
        if (this.world) this.applyWorld(this.world);
      });
    }
  }

  private async decode(mod: number): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const asset = Asset.fromModule(mod);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const res = await fetch(uri);
      const ab = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(ab);
    } catch (e) {
      console.warn('[sound] failed to decode sample', e);
      return null;
    }
  }

  private async loadAll() {
    const tasks: Promise<void>[] = [];
    (Object.keys(SAMPLES) as SfxName[]).forEach((name) => {
      SAMPLES[name].forEach((mod) => {
        tasks.push(
          this.decode(mod).then((buf) => {
            if (!buf) return;
            const list = this.buffers.get(name) ?? [];
            list.push(buf);
            this.buffers.set(name, list);
          }),
        );
      });
    });
    (Object.keys(LOOPS) as LoopName[]).forEach((name) => {
      tasks.push(
        this.decode(LOOPS[name]).then((buf) => {
          if (buf) this.loopBuffers.set(name, buf);
        }),
      );
    });
    (Object.keys(VOICES) as VoiceName[]).forEach((name) => {
      tasks.push(
        this.decode(VOICES[name]).then((buf) => {
          if (buf) this.buffers.set(`voice:${name}`, [buf]);
        }),
      );
    });
    await Promise.all(tasks);
  }

  private startLoop(name: LoopName, gain: number, filterHz?: number): LoopVoice | null {
    if (!this.ctx) return null;
    const buf = this.loopBuffers.get(name);
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // Trim MP3 encoder padding so the loop point is clean.
    src.loopStart = 0.03;
    src.loopEnd = Math.max(0.1, buf.duration - 0.06);
    const g = this.ctx.createGain();
    g.gain.value = gain;
    let filter: BiquadFilterNode | undefined;
    if (filterHz) {
      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterHz;
      filter.Q.value = 0.7;
      src.connect(filter).connect(g);
    } else {
      src.connect(g);
    }
    g.connect(name === 'wind_loop' || name === 'noise_loop' || name === 'amb_bubbles_loop' ? this.sfxBus : this.ambBus);
    src.start(0, 0.03);
    return { src, gain: g, filter };
  }

  private stopVoice(v: LoopVoice, fadeSec: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0, now, fadeSec / 3);
    try {
      v.src.stop(now + fadeSec + 0.1);
    } catch {
      // already stopped
    }
  }

  setWorld(world: WorldKind | null) {
    this.world = world;
    if (this.ready) this.applyWorld(world);
  }

  private applyWorld(world: WorldKind | null) {
    if (!this.ctx) return;
    this.ambience.forEach((v) => this.stopVoice(v, 1.5));
    this.ambience = [];
    if (this.wind) {
      this.stopVoice(this.wind, 0.3);
      this.wind = null;
    }
    if (!world) return;
    AMBIENCE_BY_WORLD[world].forEach((name, i) => {
      const v = this.startLoop(name, 0.0001);
      if (!v) return;
      v.gain.gain.setTargetAtTime(i === 0 ? 0.9 : 0.35, this.ctx!.currentTime, 0.8);
      this.ambience.push(v);
    });
    this.windName = WIND_BY_WORLD[world];
    this.wind = this.startLoop(this.windName, 0.0001, 600);
  }

  setBreath(strength: number, exhaling: boolean) {
    if (!this.ctx || !this.wind) return;
    const now = this.ctx.currentTime;
    const target = exhaling ? 0.04 + 0.5 * Math.min(1, strength) : 0.0001;
    this.wind.gain.gain.setTargetAtTime(target, now, exhaling ? 0.08 : 0.25);
    if (this.wind.filter) this.wind.filter.frequency.setTargetAtTime(500 + 2800 * Math.min(1, strength), now, 0.1);
  }

  play(name: SfxName, opts: PlayOptions = {}) {
    if (!this.ctx || this.paused) return;
    const rate = opts.rate ?? 1;
    const volume = opts.volume ?? 1;
    const list = this.buffers.get(name);
    if (!list || list.length === 0) {
      this.synth(name, rate, volume);
      return;
    }

    const buf = list[Math.floor(Math.random() * list.length)];
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.sfxBus);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
    src.start();
  }

  playVoice(name: VoiceName) {
    if (!this.ctx || this.paused || this.muted) return;
    const list = this.buffers.get(`voice:${name}`);
    const buf = list?.[0];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 1;
    src.connect(g).connect(this.sfxBus);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
    src.start();
  }

  chime(step: number) {
    const idx = Math.max(0, Math.min(PENTATONIC.length - 1, step));
    const rate = Math.pow(2, PENTATONIC[idx] / 12);
    this.play('bell', { rate, volume: 0.75 });
  }

  /** Minimal synthesizer used before samples are decoded (or if decoding fails). */
  private synth(name: SfxName, rate: number, volume: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.sfxBus);
    const osc = ctx.createOscillator();
    osc.connect(g);
    const tonal = ['bell', 'bell_soft', 'bell_arp', 'xylo', 'confirm', 'magic', 'powerup', 'jingle_pizzi', 'jingle_steel', 'win', 'complete'];
    if (tonal.includes(name)) {
      osc.type = 'triangle';
      osc.frequency.value = 660 * rate;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.5 * volume, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.start(now);
      osc.stop(now + 1);
    } else if (name === 'ui_tap') {
      osc.type = 'sine';
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.2 * volume, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      // pops, plops, boings: quick pitch sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700 * rate, now);
      osc.frequency.exponentialRampToValueAtTime(180 * rate, now + 0.18);
      g.gain.setValueAtTime(0.4 * volume, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);
    }
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!this.ctx) return;
    if (p) this.ctx.suspend().catch(() => undefined);
    else this.ctx.resume().catch(() => undefined);
  }

  dispose() {
    this.setWorld(null);
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.ready = false;
    this.loading = null;
    this.buffers.clear();
    this.loopBuffers.clear();
  }
}

let singleton: SoundEngine | null = null;
export function createSoundEngine(): SoundEngine {
  if (!singleton) singleton = new WebSoundEngine();
  return singleton;
}
