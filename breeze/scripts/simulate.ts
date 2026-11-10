/**
 * Headless simulation of a whole session: scripted breathing → BreathEngine →
 * Pacer → World, at 60 Hz, for each age profile and several "child types".
 * Run with `npm run simulate`. Used to sanity-check detection and tuning
 * without a device: every child type should get rewards, no profile should
 * demand more than the child can do, and voices should not drive the game
 * for the older profiles.
 */
import { BreathEngine } from '../src/core/BreathEngine';
import { Rng } from '../src/core/math';
import { Pacer } from '../src/core/Pacer';
import { AGE_KEYS, PROFILES } from '../src/core/profiles';
import type { BreathFeatures } from '../src/core/types';
import { World } from '../src/core/World';
import { SimSensor } from '../src/sensors/SimSensor';

interface ChildType {
  name: string;
  exhaleSec: number;
  inhaleSec: number;
  peak: number;
  jitter: number;
  /** Extra room noise (linear RMS) and periodic talking bursts. */
  roomNoise: number;
  talking: boolean;
}

const CHILD_TYPES: ChildType[] = [
  { name: 'tiny puffs (2y)', exhaleSec: 1.0, inhaleSec: 1.2, peak: 0.12, jitter: 0.5, roomNoise: 0.004, talking: true },
  { name: 'short breaths (5y)', exhaleSec: 2.0, inhaleSec: 1.6, peak: 0.3, jitter: 0.4, roomNoise: 0.004, talking: false },
  { name: 'average (9y)', exhaleSec: 3.5, inhaleSec: 2.2, peak: 0.5, jitter: 0.3, roomNoise: 0.004, talking: false },
  { name: 'long, gentle (15y)', exhaleSec: 6.0, inhaleSec: 3.5, peak: 0.25, jitter: 0.2, roomNoise: 0.004, talking: false },
  { name: 'hard blower (12y)', exhaleSec: 2.5, inhaleSec: 2.0, peak: 0.9, jitter: 0.3, roomNoise: 0.004, talking: false },
  { name: 'noisy ward + nurse talking', exhaleSec: 3.5, inhaleSec: 2.2, peak: 0.4, jitter: 0.3, roomNoise: 0.02, talking: true },
];

function run(ageKey: (typeof AGE_KEYS)[number], child: ChildType, seed: number) {
  const profile = PROFILES[ageKey];
  const rng = new Rng(seed);
  const sensor = new SimSensor(child.exhaleSec, child.jitter, () => rng.next(), child.peak, child.inhaleSec);
  void sensor.start();
  const engine = new BreathEngine(profile);
  const pacer = new Pacer(profile);
  const world = new World(1024, 768, profile, seed);
  let exhalesStarted = 0;
  let firstDetectionMs = -1;
  engine.onExhaleStart = (t) => {
    exhalesStarted++;
    if (firstDetectionMs < 0) firstDetectionMs = t;
    world.onExhaleStart();
  };
  engine.onExhaleEnd = (s) => {
    world.onExhaleEnd(s);
    pacer.recordExhale(engine.medianExhaleMs());
  };
  pacer.onPhase = (p) => world.onPhase(p);

  const dt = 1 / 60;
  let t = 0;
  let collects = 0;
  let rings = 0;
  let big = 0;
  let friends = 0;
  let talkFrames = 0;
  let talkDrivenFrames = 0;
  // Actual simulated exhale cycles (ground truth from the sensor's script).
  let truthExhaleFrames = 0;
  while (t < profile.sessionSec * 1000 && !world.done) {
    t += dt * 1000;
    let f: BreathFeatures = sensor.read(t);
    const truthExhaling = f.level > 0.02;
    if (truthExhaling) truthExhaleFrames++;
    // Room noise + a nurse talking for 1.2 s every 9 s (harmonic sound).
    f = { level: f.level + child.roomNoise * (0.8 + 0.4 * rng.next()), noisiness: f.noisiness };
    if (child.talking && (t / 1000) % 9 < 1.2 && !truthExhaling) {
      f = { level: f.level + 0.06 * (0.6 + 0.8 * rng.next()), noisiness: 0.08 };
      talkFrames++;
      if (engine.isExhaling) talkDrivenFrames++;
    }
    engine.push(f, t);
    engine.goodMs = pacer.targetExhaleMs * profile.goodFraction;
    pacer.update(dt * 1000, engine.isExhaling);
    world.update(dt, { strength: engine.strength, isExhaling: engine.isExhaling }, pacer.view());
    world.setBreathStats(engine.longestMs, engine.medianExhaleMs(), engine.breathsPerMinute(t, 0));
    for (const e of world.drainEvents()) {
      if (e.type === 'collect') collects++;
      if (e.type === 'ring') rings++;
      if (e.type === 'bigMoment') big++;
      if (e.type === 'friend') friends++;
    }
  }
  const st = world.stats();
  const truthCycles = sensor.cycles;
  return {
    age: ageKey,
    child: child.name,
    truthCycles,
    detected: exhalesStarted,
    counted: st.breaths,
    good: st.goodBreaths,
    goodPct: st.breaths ? Math.round((100 * st.goodBreaths) / st.breaths) : 0,
    medianOut: (st.medianExhaleMs / 1000).toFixed(1),
    targetOut: (pacer.targetExhaleMs / 1000).toFixed(1),
    stars: st.stars,
    rings,
    big,
    friends,
    calm: st.calm.toFixed(2),
    bpm: engine.breathsPerMinute(t, 0).toFixed(1),
    firstDetect: firstDetectionMs < 0 ? '-' : (firstDetectionMs / 1000).toFixed(1) + 's',
    talkFalsePct: talkFrames ? Math.round((100 * talkDrivenFrames) / talkFrames) : 0,
  };
}

const rows: ReturnType<typeof run>[] = [];
for (const age of AGE_KEYS) {
  for (const child of CHILD_TYPES) rows.push(run(age, child, 42));
}
console.table(rows);
