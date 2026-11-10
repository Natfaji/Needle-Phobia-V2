import { approach, clamp, lerp, Rng, smoothstep } from './math';
import type { AgeProfile } from './profiles';
import type { ExhaleSummary, GameEvent, PacerPhase, SessionStats, WorldKind } from './types';
import type { PacerView } from './Pacer';

export type CollectibleKind = 'star' | 'orb' | 'fish' | 'pearl' | 'ring';
export interface Collectible {
  id: number;
  kind: CollectibleKind;
  x: number;
  y: number;
  r: number;
  hue: number;
  phase: number;
  vx: number;
  vy: number;
  collected: boolean;
  /** 0..1 shrink animation after collection. */
  fade: number;
  /** Seconds since spawn (pop-in animation). */
  age: number;
}

export type ParticleKind = 'wind' | 'bubble' | 'burst' | 'trail' | 'confetti' | 'dust' | 'spark';
export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  rot: number;
  spin: number;
}

export type FriendKind = 'whale' | 'duck' | 'jelly' | 'turtle' | 'rainbow' | 'birds' | 'balloonFriend' | 'shootingStars' | 'planet' | 'moonBuddy';
export interface Friend {
  kind: FriendKind;
  x: number;
  y: number;
  t: number;
  life: number;
  dir: 1 | -1;
  scale: number;
  hue: number;
}

export interface HeroState {
  x: number;
  y: number;
  baseY: number;
  topY: number;
  r: number;
  tilt: number;
  /** 0..1 smoothed breath strength for cheeks / flame / thrust. */
  puff: number;
  vy: number;
  blink: number;
  wobble: number;
}

export interface BreathInput {
  strength: number;
  isExhaling: boolean;
}

export interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  tw: number;
}

const FRIENDS: Record<WorldKind, FriendKind[]> = {
  pond: ['duck', 'jelly', 'turtle', 'whale'],
  sky: ['birds', 'balloonFriend', 'rainbow'],
  nebula: ['shootingStars', 'planet', 'moonBuddy'],
};

/**
 * The whole game simulation in one place, independent from rendering and
 * from React. Coordinates are canvas pixels. One instance per session.
 *
 * Design rules (see ../../research.md and docs/game-design.md):
 * - the only input is the breath; there are no enemies and no fail state;
 * - gentle, *sustained* exhaling is rewarded more than blowing hard;
 * - the world keeps moving and rewarding even without input (young children);
 * - "big moments" celebrate calm breaths, not score.
 */
export class World {
  w: number;
  h: number;
  profile: AgeProfile;
  readonly world: WorldKind;
  rng: Rng;

  t = 0;
  elapsed = 0;
  scroll = 0;
  scrollSpeed = 0;
  progress = 0;
  done = false;
  paused = false;

  hero: HeroState;
  collectibles: Collectible[] = [];
  particles: Particle[] = [];
  friends: Friend[] = [];
  stars: Star[] = [];
  events: GameEvent[] = [];

  breath: BreathInput = { strength: 0, isExhaling: false };
  pacer: PacerView = { phase: 'inhale', progress: 0, ringScale: 0, targetExhaleMs: 4000, cycles: 0 };

  score = 0;
  combo = 0;
  breaths = 0;
  goodBreaths = 0;
  bigMoments = 0;
  bigMomentProgress = 0;
  /** 0..1, teen "calm meter"; also tints the background. */
  calm = 0.15;
  /** 1 right after a big moment, decays; drives shader bloom. */
  bloom = 0;
  /** Smoothed breath for shaders (slower than hero.puff). */
  breathSmooth = 0;
  encouragement: { text: string; t: number } | null = null;

  private nextId = 1;
  private nextSpawn = 1.5;
  private nextFriend: number;
  private lastBigMomentAt = 0;
  private windAccum = 0;
  private bubbleAccum = 0;
  private trailAccum = 0;
  private lastExhaleSummary: ExhaleSummary | null = null;
  private longestMs = 0;
  private medianMs = 0;
  private bpm = 0;
  /** Sky: current base hue of the balloon; nebula: comet hue. */
  heroHue: number;

  constructor(w: number, h: number, profile: AgeProfile, seed = Date.now()) {
    this.w = w;
    this.h = h;
    this.profile = profile;
    this.world = profile.world;
    this.rng = new Rng(seed);
    this.nextFriend = profile.friendEverySec * 0.6;
    this.heroHue = this.world === 'sky' ? 8 : this.world === 'nebula' ? 190 : 200;
    this.hero = {
      x: w * 0.3,
      y: h * 0.62,
      baseY: h * 0.68,
      topY: h * 0.2,
      r: this.unit(34),
      tilt: 0,
      puff: 0,
      vy: 0,
      blink: 0,
      wobble: 0,
    };
    this.makeStars();
  }

  /** Scale factor so gameplay feels the same on any tablet size. */
  unit(px: number) {
    return (px * Math.min(this.w, this.h * 1.4)) / 1024;
  }

  resize(w: number, h: number) {
    const sx = w / this.w;
    const sy = h / this.h;
    this.w = w;
    this.h = h;
    this.hero.x = w * 0.3;
    this.hero.baseY = h * 0.68;
    this.hero.topY = h * 0.2;
    this.hero.y *= sy;
    this.hero.r = this.unit(34);
    for (const c of this.collectibles) {
      c.x *= sx;
      c.y *= sy;
    }
    this.makeStars();
  }

  private makeStars() {
    this.stars = [];
    const n = this.world === 'nebula' ? 140 : this.world === 'sky' ? 60 : 0;
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: this.rng.range(0, this.w),
        y: this.rng.range(0, this.h),
        z: this.rng.range(0.15, 1),
        size: this.rng.range(0.6, 2.2),
        tw: this.rng.range(0, Math.PI * 2),
      });
    }
  }

  stats(): SessionStats {
    return {
      stars: this.score,
      breaths: this.breaths,
      goodBreaths: this.goodBreaths,
      longestExhaleMs: this.longestMs,
      medianExhaleMs: this.medianMs,
      breathsPerMinute: this.bpm,
      calm: this.calm,
      bigMoments: this.bigMoments,
      elapsedSec: this.elapsed,
    };
  }

  setBreathStats(longestMs: number, medianMs: number, bpm: number) {
    this.longestMs = longestMs;
    this.medianMs = medianMs;
    this.bpm = bpm;
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---------------------------------------------------------------------------
  // Breath callbacks (wired by the session hook)
  // ---------------------------------------------------------------------------
  onExhaleStart() {
    this.events.push({ type: 'exhaleStart' });
  }

  onExhaleEnd(s: ExhaleSummary) {
    this.lastExhaleSummary = s;
    this.breaths += 1;
    const targetMs = this.pacer.targetExhaleMs;
    const lengthScore = clamp(s.durationMs / targetMs, 0, 1);
    const score = 0.55 * lengthScore + 0.45 * s.steadiness;
    this.calm = clamp(lerp(this.calm, 0.25 + 0.75 * score, 0.35), 0, 1);
    if (s.good) {
      this.goodBreaths += 1;
      if (this.profile.breathsPerBigMoment) {
        this.bigMomentProgress += 1 / this.profile.breathsPerBigMoment;
        if (this.bigMomentProgress >= 0.999) {
          this.bigMomentProgress = 0;
          this.bigMoment();
        }
      }
      this.encourage(s);
    }
    this.events.push({ type: 'exhaleEnd', good: s.good, strength: s.meanStrength });
  }

  onPhase(phase: PacerPhase) {
    this.events.push({ type: 'phase', phase });
  }

  private encourage(s: ExhaleSummary) {
    if (!this.profile.showPacerText) return;
    const long = s.durationMs >= this.pacer.targetExhaleMs * 0.95;
    const smooth = s.steadiness > 0.7;
    const pool = long && smooth
      ? ['Perfect breath!', 'So smooth!', 'Wonderful!']
      : long
        ? ['Long breath!', 'Great!', 'Nice and long!']
        : smooth
          ? ['So gentle!', 'Lovely!', 'Nice!']
          : ['Good!', 'Keep going!', 'Nice one!'];
    this.encouragement = { text: this.rng.pick(pool), t: this.t };
  }

  // ---------------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------------
  update(dt: number, breath: BreathInput, pacer: PacerView) {
    if (this.done || this.paused) return;
    dt = clamp(dt, 0.001, 0.05);
    this.t += dt;
    this.elapsed += dt;
    this.breath = breath;
    this.pacer = pacer;
    this.progress = clamp(this.elapsed / this.profile.sessionSec, 0, 1);
    this.breathSmooth = approach(this.breathSmooth, breath.strength, dt, breath.strength > this.breathSmooth ? 0.25 : 0.6);
    this.bloom = Math.max(0, this.bloom - dt / 2.5);

    this.updateHero(dt, breath);
    this.updateScroll(dt, breath);
    this.spawn(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt, breath);
    this.updateFriends(dt);
    this.updateStars(dt);

    if (this.encouragement && this.t - this.encouragement.t > 1.6) this.encouragement = null;

    // Time-based big moments: the only kind for young children, and a safety
    // net for older ones so a struggling child is still celebrated regularly.
    if (this.elapsed - this.lastBigMomentAt >= this.profile.bigMomentEverySec) this.bigMoment();

    if (this.elapsed >= this.profile.sessionSec && !this.done) {
      this.done = true;
      this.events.push({ type: 'sessionEnd' });
    }
  }

  private liftFor(strength: number) {
    const [lo, hi] = this.profile.sweetSpot;
    // Full lift is reached at the *low* end of the sweet spot: blowing gently is enough.
    const rise = smoothstep(lo * 0.4, lo, strength);
    // Above the sweet spot nothing extra happens (no reward for forcing).
    const over = smoothstep(hi, 1, strength);
    return rise * (1 - 0.08 * over);
  }

  private updateHero(dt: number, breath: BreathInput) {
    const h = this.hero;
    const lift = breath.isExhaling ? this.liftFor(breath.strength) : 0;
    const targetY = h.baseY - lift * (h.baseY - h.topY);
    const rising = targetY < h.y;
    const prevY = h.y;
    h.y = approach(h.y, targetY, dt, rising ? 0.45 : 1.3);
    // Gentle idle bob so the hero never looks frozen.
    h.wobble = Math.sin(this.t * 1.7) * this.unit(4) + Math.sin(this.t * 0.6) * this.unit(3);
    h.vy = (h.y - prevY) / dt;
    h.tilt = approach(h.tilt, clamp(-h.vy / this.h, -0.25, 0.25), dt, 0.3);
    h.puff = approach(h.puff, breath.isExhaling ? Math.max(0.35, breath.strength) : 0, dt, breath.isExhaling ? 0.1 : 0.35);
    // Blink now and then.
    h.blink = Math.max(0, h.blink - dt);
    if (h.blink <= 0 && this.rng.chance(dt * 0.35)) h.blink = 0.16;
  }

  private updateScroll(dt: number, breath: BreathInput) {
    const k = this.w / 1024;
    const target = (this.profile.scrollBase + this.profile.scrollBoost * (breath.isExhaling ? 0.35 + 0.65 * breath.strength : 0)) * k;
    this.scrollSpeed = approach(this.scrollSpeed, target, dt, 0.6);
    this.scroll += this.scrollSpeed * dt;
  }

  private spawn(dt: number) {
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      this.nextSpawn = this.profile.spawnEverySec * this.rng.range(0.8, 1.2);
      this.spawnGroup();
    }
    this.nextFriend -= dt;
    if (this.nextFriend <= 0) {
      this.nextFriend = this.profile.friendEverySec * this.rng.range(0.8, 1.3);
      this.spawnFriend(this.rng.pick(FRIENDS[this.world].filter((f) => f !== 'rainbow' && f !== 'whale')));
    }
  }

  private spawnGroup() {
    const n = this.profile.groupSize;
    const h = this.hero;
    const kindPool: CollectibleKind[] =
      this.world === 'pond' ? ['fish', 'pearl', 'star'] : this.world === 'sky' ? ['star', 'star', 'star', 'ring'] : ['orb', 'orb', 'star', 'ring'];
    const hue = this.rng.range(0, 360);
    if (this.world === 'pond') {
      // Friendly things pop into view all over the screen (a toddler will not
      // wait for something to scroll in) and drift toward the fish when it blows.
      for (let i = 0; i < n; i++) {
        this.collectibles.push({
          id: this.nextId++,
          kind: this.rng.pick(kindPool),
          x: this.rng.range(this.w * 0.45, this.w * 0.98),
          y: this.rng.range(this.h * 0.2, this.h * 0.85),
          r: this.unit(24),
          hue: (hue + i * 47) % 360,
          phase: this.rng.range(0, 6.28),
          vx: -this.unit(this.rng.range(8, 22)),
          vy: 0,
          collected: false,
          fade: 1,
          age: 0,
        });
      }
      return;
    }
    // Sky / nebula: an arc a sustained exhale sweeps through, from the resting
    // height up to the top and back down. Horizontal spacing matches the exhale
    // target at typical scroll speed so a full breath collects the whole arc.
    const speed = (this.profile.scrollBase + this.profile.scrollBoost * 0.7) * (this.w / 1024);
    const spanPx = speed * (this.pacer.targetExhaleMs / 1000);
    const spacing = spanPx / (n - 1);
    const amplitude = (h.baseY - h.topY) * this.rng.range(0.55, 1);
    const ringAt = this.rng.chance(0.45) ? this.rng.int(2, n - 3) : -1;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const y = h.baseY - amplitude * Math.sin(Math.PI * f) - this.unit(10);
      const isRing = i === ringAt;
      this.collectibles.push({
        id: this.nextId++,
        kind: isRing ? 'ring' : this.rng.pick(kindPool.filter((k) => k !== 'ring')),
        x: this.w + this.unit(80) + i * spacing,
        y,
        r: isRing ? this.unit(52) : this.unit(16),
        hue: (hue + i * 18) % 360,
        phase: this.rng.range(0, 6.28),
        vx: 0,
        vy: 0,
        collected: false,
        fade: 1,
        age: 0,
      });
    }
  }

  private spawnFriend(kind: FriendKind) {
    const fromRight = kind !== 'whale';
    this.friends.push({
      kind,
      x: fromRight ? this.w + this.unit(160) : -this.unit(260),
      y:
        kind === 'duck'
          ? this.h * 0.09
          : kind === 'rainbow'
            ? this.h * 0.5
            : kind === 'planet'
              ? this.h * 0.25
              : kind === 'whale'
                ? this.h * 0.8
                : this.rng.range(this.h * 0.2, this.h * 0.8),
      t: 0,
      life: kind === 'rainbow' ? 9 : kind === 'shootingStars' ? 4 : 16,
      dir: fromRight ? -1 : 1,
      scale: this.rng.range(0.85, 1.2),
      hue: this.rng.range(0, 360),
    });
    this.events.push({ type: 'friend' });
  }

  private updateCollectibles(dt: number) {
    const h = this.hero;
    const magnetR = this.unit(this.profile.magnetRadius) * (this.breath.isExhaling ? 1.35 : 1);
    const heroX = h.x;
    const heroY = h.y + h.wobble;
    for (const c of this.collectibles) {
      if (c.collected) {
        c.fade = Math.max(0, c.fade - dt * 3);
        continue;
      }
      c.age += dt;
      c.x -= this.scrollSpeed * dt;
      c.x += c.vx * dt;
      c.phase += dt * 2;
      const bob = Math.sin(c.phase) * this.unit(3);
      const dx = heroX - c.x;
      const dy = heroY - (c.y + bob);
      const d = Math.hypot(dx, dy);
      // Magnet assist: the closer, the stronger; always on for young children
      // when they blow, so effort is *always* rewarded.
      if (d < magnetR) {
        const pull = (1 - d / magnetR) * this.unit(this.world === 'pond' ? 320 : 240) * (0.4 + 0.6 * this.breath.strength + (this.world === 'pond' ? 0.4 : 0));
        c.x += (dx / d) * pull * dt;
        c.y += (dy / d) * pull * dt;
      }
      const hitR = c.kind === 'ring' ? c.r * 0.85 : h.r * 0.9 + c.r;
      if (d < hitR) this.collect(c);
    }
    this.collectibles = this.collectibles.filter((c) => c.x > -this.unit(120) && c.fade > 0);
  }

  private collect(c: Collectible) {
    c.collected = true;
    this.combo = this.breath.isExhaling ? this.combo + 1 : 1;
    const value = c.kind === 'ring' ? 3 : 1;
    this.score += value;
    const burst = c.kind === 'ring' ? 26 : 12;
    for (let i = 0; i < burst; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(this.unit(60), this.unit(220));
      this.particles.push({
        kind: c.kind === 'ring' ? 'spark' : 'burst',
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: this.rng.range(0.5, 0.9),
        maxLife: 0.9,
        size: this.rng.range(this.unit(2), this.unit(5)),
        hue: c.kind === 'ring' ? this.rng.range(0, 360) : c.hue,
        rot: 0,
        spin: 0,
      });
    }
    if (c.kind === 'ring') {
      this.events.push({ type: 'ring', x: c.x, y: c.y, hue: c.hue });
      this.heroHue = (this.heroHue + 47) % 360;
    } else {
      this.events.push({ type: 'collect', x: c.x, y: c.y, hue: c.hue, n: Math.min(this.combo - 1, 7) });
    }
  }

  private updateParticles(dt: number, breath: BreathInput) {
    const h = this.hero;
    const heroY = h.y + h.wobble;
    // Breath-driven emitters
    if (breath.isExhaling) {
      if (this.world === 'pond') {
        this.bubbleAccum += dt * (6 + 22 * breath.strength);
        while (this.bubbleAccum >= 1) {
          this.bubbleAccum -= 1;
          this.particles.push({
            kind: 'bubble',
            x: h.x + h.r * 0.9,
            y: heroY + this.rng.range(-h.r * 0.2, h.r * 0.2),
            vx: this.unit(this.rng.range(60, 140)) * (0.5 + breath.strength),
            vy: -this.unit(this.rng.range(20, 70)),
            life: this.rng.range(1.6, 3),
            maxLife: 3,
            size: this.unit(this.rng.range(3, 9 + 8 * breath.strength)),
            hue: 195,
            rot: this.rng.range(0, 6.28),
            spin: this.rng.range(1, 3),
          });
        }
      } else {
        this.windAccum += dt * (10 + 40 * breath.strength);
        while (this.windAccum >= 1) {
          this.windAccum -= 1;
          this.particles.push({
            kind: 'wind',
            x: this.rng.range(-this.unit(40), this.w * 0.5),
            y: this.rng.range(0, this.h),
            vx: this.unit(this.rng.range(380, 640)) * (0.6 + 0.6 * breath.strength),
            vy: this.unit(this.rng.range(-12, 12)),
            life: this.rng.range(0.35, 0.7),
            maxLife: 0.7,
            size: this.unit(this.rng.range(24, 70)),
            hue: this.world === 'sky' ? 200 : this.heroHue,
            rot: 0,
            spin: 0,
          });
        }
      }
    }
    // Trail (sky & nebula)
    if (this.world !== 'pond') {
      this.trailAccum += dt * (this.world === 'nebula' ? 45 : 18);
      while (this.trailAccum >= 1) {
        this.trailAccum -= 1;
        this.particles.push({
          kind: 'trail',
          x: h.x - h.r * 0.6,
          y: heroY + this.rng.range(-h.r * 0.25, h.r * 0.25),
          vx: -this.scrollSpeed * 0.8 - this.unit(20),
          vy: this.rng.range(-this.unit(8), this.unit(8)),
          life: this.world === 'nebula' ? 0.9 : 0.5,
          maxLife: 0.9,
          size: this.world === 'nebula' ? h.r * (0.35 + 0.5 * h.puff) : h.r * 0.2,
          hue: this.heroHue,
          rot: 0,
          spin: 0,
        });
      }
    }
    // Ambient
    if (this.world === 'pond' && this.rng.chance(dt * 2.5)) {
      this.particles.push({
        kind: 'bubble',
        x: this.rng.range(0, this.w),
        y: this.h + this.unit(10),
        vx: -this.scrollSpeed * 0.3,
        vy: -this.unit(this.rng.range(25, 55)),
        life: this.rng.range(4, 7),
        maxLife: 7,
        size: this.unit(this.rng.range(2, 6)),
        hue: 195,
        rot: this.rng.range(0, 6.28),
        spin: 1.5,
      });
    }
    if (this.world === 'nebula' && this.rng.chance(dt * 6)) {
      this.particles.push({
        kind: 'dust',
        x: this.w + this.unit(10),
        y: this.rng.range(0, this.h),
        vx: -this.unit(this.rng.range(20, 60)),
        vy: this.rng.range(-this.unit(5), this.unit(5)),
        life: this.rng.range(6, 12),
        maxLife: 12,
        size: this.unit(this.rng.range(1, 3)),
        hue: this.rng.range(180, 320),
        rot: 0,
        spin: 0,
      });
    }

    const gravity = this.unit(140);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      switch (p.kind) {
        case 'bubble':
          p.x += Math.sin(p.rot * 2) * this.unit(12) * dt;
          p.vy -= this.unit(18) * dt;
          break;
        case 'burst':
        case 'spark':
          p.vy += gravity * dt * 0.6;
          p.vx *= 1 - 1.5 * dt;
          break;
        case 'confetti':
          p.vy += gravity * dt * 0.5;
          p.vx *= 1 - 0.6 * dt;
          p.x += Math.sin(p.rot) * this.unit(30) * dt;
          break;
        case 'wind':
        case 'dust':
          p.x -= this.scrollSpeed * dt * 0.5;
          break;
        case 'trail':
          break;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.x > -this.unit(100) && p.x < this.w + this.unit(100) && p.y < this.h + this.unit(60));
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  private updateFriends(dt: number) {
    for (const f of this.friends) {
      f.t += dt;
      const speed = f.kind === 'shootingStars' ? this.unit(520) : f.kind === 'rainbow' ? 0 : this.unit(f.kind === 'whale' ? 55 : 70);
      f.x += f.dir * speed * dt - (f.kind === 'rainbow' ? 0 : this.scrollSpeed * 0.35 * dt);
      if (f.kind === 'jelly') f.y += Math.sin(f.t * 1.2) * this.unit(20) * dt;
      if (f.kind === 'balloonFriend') f.y += Math.sin(f.t * 0.8) * this.unit(15) * dt;
      if (f.kind === 'birds') f.y += Math.sin(f.t * 1.5) * this.unit(10) * dt;
    }
    this.friends = this.friends.filter((f) => f.t < f.life && f.x > -this.unit(400) && f.x < this.w + this.unit(400));
  }

  private updateStars(dt: number) {
    for (const s of this.stars) {
      s.x -= this.scrollSpeed * s.z * 0.25 * dt;
      if (s.x < -4) s.x += this.w + 8;
      s.tw += dt * (1 + s.z);
    }
  }

  bigMoment() {
    this.bigMoments += 1;
    this.lastBigMomentAt = this.elapsed;
    this.bigMomentProgress = 0;
    this.bloom = 1;
    const special: FriendKind = this.world === 'pond' ? 'whale' : this.world === 'sky' ? 'rainbow' : 'shootingStars';
    this.spawnFriend(special);
    const n = 70;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        kind: 'confetti',
        x: this.rng.range(0, this.w),
        y: this.rng.range(-this.h * 0.2, -this.unit(10)),
        vx: this.rng.range(-this.unit(40), this.unit(40)),
        vy: this.rng.range(this.unit(40), this.unit(120)),
        life: this.rng.range(2.5, 4),
        maxLife: 4,
        size: this.unit(this.rng.range(4, 9)),
        hue: this.rng.range(0, 360),
        rot: this.rng.range(0, 6.28),
        spin: this.rng.range(-4, 4),
      });
    }
    if (this.profile.showPacerText) this.encouragement = { text: this.world === 'nebula' ? 'Calm streak!' : 'Amazing!', t: this.t };
    this.events.push({ type: 'bigMoment' });
  }
}
