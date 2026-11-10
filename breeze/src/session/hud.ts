import type { BreathEngine } from '../core/BreathEngine';
import type { AgeProfile } from '../core/profiles';
import type { Pacer } from '../core/Pacer';
import type { SessionStats } from '../core/types';
import type { World } from '../core/World';
import { EMPTY_STATS, PROMPTS, type HudState } from './types';

interface HudSession {
  engine: BreathEngine;
  pacer: Pacer;
  world: World;
  profile: AgeProfile;
  sessionStart: number;
}

export function initialHud(profile: AgeProfile): HudState {
  return {
    phase: 'inhale',
    prompt: '',
    encouragement: null,
    stars: 0,
    timeLeft: profile.sessionSec,
    progress: 0,
    calm: 0.15,
    isExhaling: false,
    strength: 0,
    levelDb: -90,
    floorDb: -60,
    thresholdDb: -50,
    calibrating: true,
    paused: false,
    done: false,
    targetExhaleSec: profile.exhaleSecStart,
    stats: EMPTY_STATS,
  };
}

export function buildHudState(session: HudSession, now: number): HudState {
  const { engine, pacer, world, profile } = session;
  const state = engine.state;
  const prompt = state.calibrating
    ? profile.key === 'little'
      ? ''
      : 'Listening… stay quiet a moment'
    : PROMPTS[profile.key][pacer.phase];

  const stats: SessionStats = {
    ...world.stats(),
    breathsPerMinute: engine.breathsPerMinute(now, session.sessionStart),
  };

  return {
    phase: pacer.phase,
    prompt,
    encouragement: world.encouragement?.text ?? null,
    stars: world.score,
    timeLeft: Math.max(0, profile.sessionSec - world.elapsed),
    progress: world.progress,
    calm: world.calm,
    isExhaling: state.isExhaling,
    strength: state.strength,
    levelDb: state.levelDb,
    floorDb: state.floorDb,
    thresholdDb: state.thresholdDb,
    calibrating: state.calibrating,
    paused: world.paused,
    done: world.done,
    targetExhaleSec: pacer.targetExhaleMs / 1000,
    stats,
  };
}
