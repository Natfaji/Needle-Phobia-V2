import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Skia, type SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Runtime } from '../app/Runtime';
import { BreathEngine } from '../core/BreathEngine';
import { Pacer } from '../core/Pacer';
import { PROFILES, type AgeProfile } from '../core/profiles';
import type { InputKind, SessionStats } from '../core/types';
import { World } from '../core/World';
import type { ShaderUniforms } from '../render/GameCanvas';
import { WorldRenderer } from '../render/WorldRenderer';
import { buildHudState, initialHud } from '../session/hud';
import { playGameEvent } from '../session/audioEvents';
import { EMPTY_STATS } from '../session/types';
import type { HudState, SessionSettings } from '../session/types';
export type { HudState, SessionSettings } from '../session/types';

function emptyPicture(): SkPicture {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
}

interface Refs {
  engine: BreathEngine;
  pacer: Pacer;
  world: World;
  renderer: WorldRenderer;
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  oldPictures: SkPicture[];
  raf: number;
  last: number;
  hudAt: number;
  sessionStart: number;
  profile: AgeProfile;
  /** Virtual clock used when fast-forwarding (`?turbo=N`), else 0. */
  vt: number;
}

/** Dev helper: `?turbo=20` advances the simulation 20 fixed steps per animation frame. */
function turboSteps(): number {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return 1;
  const n = Number(new URLSearchParams(window.location.search).get('turbo'));
  return n >= 1 && n <= 200 ? Math.floor(n) : 1;
}

/**
 * Wires sensor → breath engine → pacer → world → Skia picture + shader
 * uniforms, at the display refresh rate, and turns world events into sound.
 * React state (the HUD) is refreshed at ~8 Hz only.
 */
export function useGameSession(
  runtime: Runtime,
  settings: SessionSettings,
  size: { width: number; height: number },
  cameraBackground = false,
) {
  const profile = useMemo<AgeProfile>(
    () => ({ ...PROFILES[settings.age], sessionSec: settings.sessionSec }),
    [settings.age, settings.sessionSec],
  );
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const uniforms = useSharedValue<ShaderUniforms>({
    uRes: [size.width, size.height],
    uTime: 0,
    uBreath: 0,
    uBloom: 0,
    uProgress: 0,
    uCalm: 0.15,
    uScroll: 0,
    uDetail: settings.detail ? 1 : 0,
    uCamera: cameraBackground ? 1 : 0,
  });
  const [hud, setHud] = useState<HudState>(() => initialHud(profile));
  const refs = useRef<Refs | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const cameraBackgroundRef = useRef(cameraBackground);
  cameraBackgroundRef.current = cameraBackground;

  // Create the simulation once per age profile.
  useEffect(() => {
    const { width, height } = sizeRef.current;
    const engine = new BreathEngine(profile);
    engine.sensitivity = settingsRef.current.sensitivity;
    const pacer = new Pacer(profile);
    const world = new World(width, height, profile);
    engine.onExhaleStart = () => world.onExhaleStart();
    engine.onExhaleEnd = (s) => {
      world.onExhaleEnd(s);
      pacer.recordExhale(engine.medianExhaleMs());
    };
    pacer.onPhase = (ph) => world.onPhase(ph);
    const r: Refs = {
      engine,
      pacer,
      world,
      renderer: new WorldRenderer(),
      recorder: Skia.PictureRecorder(),
      oldPictures: [],
      raf: 0,
      last: 0,
      hudAt: 0,
      sessionStart: 0,
      profile,
      vt: 0,
    };
    const turbo = turboSteps();
    refs.current = r;
    runtime.sound.setWorld(profile.world);

    const loop = (now: number) => {
      const cur = refs.current;
      if (cur !== r) return;
      r.raf = requestAnimationFrame(loop);
      const step = (t: number, dt: number) => {
        if (!r.sessionStart) r.sessionStart = t;
        // The breath engine keeps listening while paused so the nurse panel's
        // "breathing out" light stays live; only the game world freezes.
        const f = runtime.sensor.read(t);
        engine.push(f, t);
        if (world.paused) return;
        engine.goodMs = pacer.targetExhaleMs * profile.goodFraction;
        pacer.update(dt * 1000, engine.isExhaling);
        world.update(dt, { strength: engine.strength, isExhaling: engine.isExhaling }, pacer.view());
        world.setBreathStats(engine.longestMs, engine.medianExhaleMs(), engine.breathsPerMinute(t, r.sessionStart));
        for (const e of world.drainEvents()) {
          playGameEvent(e, { world: r.world.world, profile: r.profile }, runtime.sound, () => {
            if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
          });
        }
      };
      if (turbo > 1 && !world.paused) {
        for (let i = 0; i < turbo; i++) {
          r.vt += 1000 / 60;
          step(r.vt, 1 / 60);
        }
      } else {
        const dt = r.last ? Math.min(0.05, (now - r.last) / 1000) : 1 / 60;
        step(turbo > 1 ? r.vt : now, dt);
      }
      if (!world.paused) runtime.sound.setBreath(engine.strength, engine.isExhaling);
      r.last = now;
      // Render into a picture; keep a couple of old ones alive for the renderer, then free them.
      const t0 = performance.now();
      const canvas = r.recorder.beginRecording(Skia.XYWHRect(0, 0, world.w, world.h));
      r.renderer.draw(canvas, world);
      const pic = r.recorder.finishRecordingAsPicture();
      const t1 = performance.now();
      picture.value = pic;
      const t2 = performance.now();
      // Skia draws on its own animation frame, so a picture may still be in use
      // for a few frames after it was replaced. Free them ~1.5 s later.
      r.oldPictures.push(pic);
      while (r.oldPictures.length > 90) r.oldPictures.shift()?.dispose();
      const t3 = performance.now();
      uniforms.value = {
        uRes: [world.w, world.h],
        uTime: world.t,
        uBreath: world.breathSmooth,
        uBloom: world.bloom,
        uProgress: world.progress,
        uCalm: world.calm,
        uScroll: world.scroll,
        uDetail: settingsRef.current.detail ? 1 : 0,
        uCamera: cameraBackgroundRef.current ? 1 : 0,
      };
      const t4 = performance.now();
      if (__DEV__) {
        const g = globalThis as any;
        const st = (g.__breeze ??= { frames: 0, since: now, record: 0, setPic: 0, dispose: 0, setUniforms: 0, sim: 0, particles: 0, fps: 0, turbo });
        st.frames += 1;
        st.record += t1 - t0;
        st.setPic += t2 - t1;
        st.dispose += t3 - t2;
        st.setUniforms += t4 - t3;
        st.sim += t0 - now;
        st.particles = world.particles.length;
        if (now - st.since > 2000) {
          st.fps = (st.frames * 1000) / (now - st.since);
          st.avg = { record: st.record / st.frames, setPic: st.setPic / st.frames, dispose: st.dispose / st.frames, setUniforms: st.setUniforms / st.frames, sim: st.sim / st.frames };
          st.frames = 0;
          st.since = now;
          st.record = st.setPic = st.dispose = st.setUniforms = st.sim = 0;
        }
      }
      if (now - r.hudAt > 120) {
        r.hudAt = now;
        const h = buildHudState(r, now);
        if (__DEV__) (globalThis as any).__breezeHud = h;
        setHud(h);
      }
    };
    r.raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(r.raf);
      if (refs.current === r) refs.current = null;
      r.oldPictures.forEach((p) => p.dispose());
      r.oldPictures = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, runtime]);

  useEffect(() => {
    refs.current?.world.resize(size.width, size.height);
  }, [size.width, size.height]);

  useEffect(() => {
    if (refs.current) refs.current.engine.sensitivity = settings.sensitivity;
  }, [settings.sensitivity]);

  useEffect(() => {
    runtime.sound.setVolume(settings.volume);
    runtime.sound.setMuted(!settings.sound);
  }, [runtime, settings.volume, settings.sound]);

  const controls = useMemo(
    () => ({
      pause: () => {
        const r = refs.current;
        if (!r) return;
        r.world.paused = true;
        runtime.sound.setPaused(true);
      },
      resume: () => {
        const r = refs.current;
        if (!r) return;
        r.world.paused = false;
        r.last = 0;
        runtime.sound.setPaused(false);
      },
      end: () => {
        const r = refs.current;
        if (!r || r.world.done) return;
        r.world.done = true;
        playGameEvent({ type: 'sessionEnd' }, { world: r.world.world, profile: r.profile }, runtime.sound);
        setHud((h) => ({ ...h, done: true, stats: r.world.stats() }));
      },
      recalibrate: () => refs.current?.engine.calibrate(),
      setTouch: (pressed: boolean) => runtime.touch.setPressed(pressed),
      bigMoment: () => refs.current?.world.bigMoment(),
      stats: (): SessionStats => refs.current?.world.stats() ?? EMPTY_STATS,
    }),
    [runtime],
  );

  return { picture, uniforms, hud, controls, profile };
}
