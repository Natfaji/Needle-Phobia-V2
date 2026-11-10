import { createSoundEngine } from '../audio/createSoundEngine';
import type { SoundEngine } from '../audio/SoundEngine';
import type { AgeProfile } from '../core/profiles';
import type { InputKind } from '../core/types';
import { CompositeSensor, type BreathSensor } from '../sensors/BreathSensor';
import { MicSensor } from '../sensors/MicSensor';
import { SimSensor } from '../sensors/SimSensor';
import { TouchSensor } from '../sensors/TouchSensor';

/**
 * Long-lived objects that must be created inside a user gesture on the web
 * (AudioContext, getUserMedia). Created once, restarted per session.
 */
export class Runtime {
  readonly touch = new TouchSensor();
  readonly sound: SoundEngine = createSoundEngine();
  sensor: BreathSensor = new CompositeSensor([this.touch]);
  mic: MicSensor | null = null;
  sim: SimSensor | null = null;
  input: InputKind = 'mic';
  micError: string | null = null;

  /** Starts sound + sensors for a session. Never throws: falls back to touch. */
  async start(input: InputKind, profile: AgeProfile, soundOn: boolean) {
    this.stop();
    this.input = input;
    this.micError = null;
    const soundPromise = soundOn ? this.sound.unlock().catch((e) => console.warn('[sound]', e)) : Promise.resolve();
    const sensors: BreathSensor[] = [];
    if (input === 'mic') {
      this.mic = new MicSensor();
      try {
        await this.mic.start();
        sensors.push(this.mic);
      } catch (e: any) {
        this.micError = e?.message ? String(e.message) : 'Microphone unavailable';
        this.mic = null;
      }
    } else if (input === 'sim') {
      this.sim = new SimSensor(profile.exhaleSecStart, 0.35);
      await this.sim.start();
      sensors.push(this.sim);
    }
    await this.touch.start();
    sensors.push(this.touch);
    this.sensor = new CompositeSensor(sensors);
    await soundPromise;
  }

  stop() {
    this.mic?.stop();
    this.sim?.stop();
    this.touch.stop();
    this.mic = null;
    this.sim = null;
    this.sound.setWorld(null);
  }
}
