import type { BreathFeatures } from '../core/types';
import type { BreathSensor } from './BreathSensor';

/**
 * Web microphone sensor (Web Audio API). Works in Safari (iPad), Chrome and
 * Firefox. Must be started from a user gesture (tap) and over HTTPS or
 * localhost. Browser noise suppression / AGC are disabled because they
 * actively remove the broadband "wind" of a breath.
 *
 * Features per frame:
 * - level: RMS of the time-domain signal (linear, 0..1)
 * - noisiness: spectral flatness over 80 Hz–6 kHz, mapped to 0..1.
 *   Breath ≈ 0.6–1.0, voice ≈ 0–0.3.
 */
export class MicSensor implements BreathSensor {
  readonly kind = 'mic' as const;
  active = false;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private time = new Float32Array(2048);
  private freq = new Float32Array(1024);
  private lastFeatures: BreathFeatures = { level: 0, noisiness: 1 };
  private lastRead = 0;
  private binLo = 0;
  private binHi = 0;

  static isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async start() {
    if (this.active) return;
    if (!MicSensor.isSupported()) throw new Error('Microphone not supported in this browser');
    const AC: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      } as MediaTrackConstraints,
      video: false,
    });
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.1;
    this.source.connect(this.analyser);
    this.time = new Float32Array(this.analyser.fftSize);
    this.freq = new Float32Array(this.analyser.frequencyBinCount);
    const hzPerBin = this.ctx.sampleRate / this.analyser.fftSize;
    this.binLo = Math.max(1, Math.round(80 / hzPerBin));
    this.binHi = Math.min(this.freq.length - 1, Math.round(6000 / hzPerBin));
    this.active = true;
  }

  stop() {
    this.active = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.ctx?.close().catch(() => undefined);
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.ctx = null;
  }

  read(): BreathFeatures {
    if (!this.active || !this.analyser) return { level: 0, noisiness: 1 };
    const now = performance.now();
    // The analyser only refreshes every few ms; avoid redundant FFT reads.
    if (now - this.lastRead < 8) return this.lastFeatures;
    this.lastRead = now;

    this.analyser.getFloatTimeDomainData(this.time);
    let sum = 0;
    for (let i = 0; i < this.time.length; i++) sum += this.time[i] * this.time[i];
    const rms = Math.sqrt(sum / this.time.length);

    this.analyser.getFloatFrequencyData(this.freq);
    let logSum = 0;
    let linSum = 0;
    let n = 0;
    for (let i = this.binLo; i <= this.binHi; i++) {
      const db = this.freq[i];
      if (!Number.isFinite(db)) continue;
      const p = Math.pow(10, db / 10) + 1e-12;
      logSum += Math.log(p);
      linSum += p;
      n++;
    }
    let noisiness = 1;
    if (n > 0) {
      const flatness = Math.exp(logSum / n) / (linSum / n); // 0 (tonal) .. 1 (white noise)
      noisiness = Math.min(1, Math.max(0, (flatness - 0.03) / 0.3));
    }
    this.lastFeatures = { level: rms, noisiness };
    return this.lastFeatures;
  }
}
