import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import type { BreathFeatures } from '../core/types';
import type { BreathSensor } from './BreathSensor';

/**
 * Native (iOS / Android) microphone sensor using expo-audio's real-time PCM
 * `AudioStream`. Computes RMS and a zero-crossing-rate based noisiness
 * estimate (breath = dense zero crossings, voice = sparse) per buffer.
 */
export class MicSensor implements BreathSensor {
  readonly kind = 'mic' as const;
  active = false;
  private stream: InstanceType<typeof AudioModule.AudioStream> | null = null;
  private sub: { remove(): void } | null = null;
  private last: BreathFeatures = { level: 0, noisiness: 1 };

  static isSupported() {
    return !!AudioModule?.AudioStream;
  }

  async start() {
    if (this.active) return;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('Microphone permission denied');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    this.stream = new AudioModule.AudioStream({ sampleRate: 16000, channels: 1, encoding: 'float32' });
    this.sub = this.stream.addListener('audioStreamBuffer', (buf) => {
      const data = new Float32Array(buf.data);
      if (data.length === 0) return;
      let sum = 0;
      let crossings = 0;
      let prev = data[0];
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        sum += v * v;
        if ((v >= 0) !== (prev >= 0)) crossings++;
        prev = v;
      }
      const rms = Math.sqrt(sum / data.length);
      const zcr = crossings / data.length; // ~0.02 voice .. 0.2+ breath noise at 16 kHz
      const noisiness = Math.min(1, Math.max(0, (zcr - 0.04) / 0.16));
      this.last = { level: rms, noisiness };
    });
    await this.stream.start();
    this.active = true;
  }

  stop() {
    this.active = false;
    this.sub?.remove();
    this.sub = null;
    try {
      this.stream?.stop();
    } catch {
      // already stopped
    }
    this.stream = null;
    this.last = { level: 0, noisiness: 1 };
  }

  read(): BreathFeatures {
    return this.last;
  }
}
