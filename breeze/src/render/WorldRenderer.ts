import {
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkShader,
} from '@shopify/react-native-skia';
import { clamp, hsla, lerp, rgba, smoothstep } from '../core/math';
import type { Collectible, Friend, Particle, World } from '../core/World';

const WHITE = rgba(1, 1, 1, 1);
const TAU = Math.PI * 2;

/**
 * Draws one frame of a World into a Skia canvas (recorded into an SkPicture
 * by the session hook). Pure imperative drawing: no React, no allocations
 * per frame except a few transient rects. Glows use a cached unit radial
 * gradient scaled through the canvas matrix instead of blur mask filters,
 * which keeps old tablets at 60 fps.
 */
export class WorldRenderer {
  private fill: SkPaint;
  private stroke: SkPaint;
  private glowPaint: SkPaint;
  private glowCache = new Map<number, SkShader>();
  private starPath: SkPath;
  private scratch: SkPath;

  constructor() {
    this.fill = Skia.Paint();
    this.fill.setAntiAlias(true);
    this.stroke = Skia.Paint();
    this.stroke.setAntiAlias(true);
    this.stroke.setStyle(PaintStyle.Stroke);
    this.stroke.setStrokeCap(StrokeCap.Round);
    this.stroke.setStrokeJoin(StrokeJoin.Round);
    this.glowPaint = Skia.Paint();
    this.glowPaint.setAntiAlias(true);
    this.starPath = Skia.Path.Make();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 1 : 0.46;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) this.starPath.moveTo(x, y);
      else this.starPath.lineTo(x, y);
    }
    this.starPath.close();
    this.scratch = Skia.Path.Make();
  }

  // ---------------------------------------------------------------- helpers
  private glowShader(hue: number): SkShader {
    const key = Math.round(hue / 12) * 12;
    let s = this.glowCache.get(key);
    if (!s) {
      s = Skia.Shader.MakeRadialGradient(
        Skia.Point(0, 0),
        1,
        [hsla(key, 0.9, 0.75, 1), hsla(key, 0.9, 0.6, 0.35), hsla(key, 0.9, 0.5, 0)],
        [0, 0.35, 1],
        TileMode.Clamp,
      );
      this.glowCache.set(key, s);
    }
    return s;
  }

  private glow(c: SkCanvas, x: number, y: number, r: number, hue: number, alpha: number) {
    if (r <= 0.5 || alpha <= 0.01) return;
    this.glowPaint.setShader(this.glowShader(hue));
    this.glowPaint.setAlphaf(clamp(alpha, 0, 1));
    c.save();
    c.translate(x, y);
    c.scale(r, r);
    c.drawCircle(0, 0, 1, this.glowPaint);
    c.restore();
  }

  private circle(c: SkCanvas, x: number, y: number, r: number, color: Float32Array) {
    this.fill.setColor(color);
    c.drawCircle(x, y, r, this.fill);
  }

  private ring(c: SkCanvas, x: number, y: number, r: number, width: number, color: Float32Array) {
    this.stroke.setColor(color);
    this.stroke.setStrokeWidth(width);
    c.drawCircle(x, y, r, this.stroke);
  }

  private star(c: SkCanvas, x: number, y: number, r: number, rotDeg: number, color: Float32Array) {
    this.fill.setColor(color);
    c.save();
    c.translate(x, y);
    c.rotate(rotDeg, 0, 0);
    c.scale(r, r);
    c.drawPath(this.starPath, this.fill);
    c.restore();
  }

  private oval(c: SkCanvas, x: number, y: number, rx: number, ry: number, color: Float32Array) {
    this.fill.setColor(color);
    c.drawOval(Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2), this.fill);
  }

  private eye(c: SkCanvas, x: number, y: number, r: number, blink: number, lookX = 0.3) {
    if (blink > 0) {
      this.stroke.setColor(rgba(0.1, 0.1, 0.15, 1));
      this.stroke.setStrokeWidth(r * 0.35);
      c.drawLine(x - r, y, x + r, y, this.stroke);
      return;
    }
    this.circle(c, x, y, r, WHITE);
    this.circle(c, x + r * lookX, y + r * 0.1, r * 0.55, rgba(0.1, 0.1, 0.15, 1));
    this.circle(c, x + r * lookX + r * 0.2, y - r * 0.15, r * 0.2, WHITE);
  }

  // ------------------------------------------------------------------ main
  draw(c: SkCanvas, w: World) {
    switch (w.world) {
      case 'pond':
        this.drawPondBack(c, w);
        break;
      case 'sky':
        this.drawSkyBack(c, w);
        break;
      case 'nebula':
        this.drawNebulaBack(c, w);
        break;
    }
    this.drawFriends(c, w, true);
    this.drawParticles(c, w, true);
    if (w.profile.showPacerText) this.drawAura(c, w);
    this.drawCollectibles(c, w);
    this.drawHero(c, w);
    this.drawParticles(c, w, false);
    this.drawFriends(c, w, false);
  }

  // ----------------------------------------------------------- backgrounds
  private drawPondBack(c: SkCanvas, w: World) {
    // Water surface band with a wavy edge; the duck floats on it.
    const surfaceY = w.h * 0.12;
    const p = this.scratch;
    p.reset();
    p.moveTo(0, 0);
    p.lineTo(w.w, 0);
    p.lineTo(w.w, surfaceY);
    const n = 24;
    for (let i = n; i >= 0; i--) {
      const x = (i / n) * w.w;
      const y = surfaceY + Math.sin(x * 0.012 + w.t * 1.6 - w.scroll * 0.01) * w.unit(6) + Math.sin(x * 0.03 - w.t * 0.9) * w.unit(3);
      p.lineTo(x, y);
    }
    p.close();
    this.fill.setColor(rgba(0.85, 0.97, 1, 0.55));
    c.drawPath(p, this.fill);
    this.stroke.setColor(rgba(1, 1, 1, 0.7));
    this.stroke.setStrokeWidth(w.unit(3));
    c.drawPath(p, this.stroke);

    // Seaweed silhouettes swaying at the bottom (parallax).
    for (let i = 0; i < 9; i++) {
      const bx = ((i * 173 - w.scroll * 0.5) % (w.w + 200) + w.w + 200) % (w.w + 200) - 100;
      const height = w.unit(60 + (i % 3) * 30);
      const sway = Math.sin(w.t * 1.2 + i) * w.unit(12) * (1 + w.breathSmooth);
      p.reset();
      p.moveTo(bx, w.h + 2);
      p.quadTo(bx + sway * 0.5, w.h - height * 0.5, bx + sway, w.h - height);
      this.stroke.setColor(hsla(150, 0.5, 0.3, 0.55));
      this.stroke.setStrokeWidth(w.unit(7));
      c.drawPath(p, this.stroke);
    }
  }

  private drawSkyBack(c: SkCanvas, w: World) {
    // Stars fade in at night.
    const night = smoothstep(0.72, 1, w.progress);
    if (night > 0.02) {
      for (const s of w.stars) {
        const a = night * (0.5 + 0.5 * Math.sin(s.tw)) * 0.9;
        this.circle(c, s.x, s.y * 0.7, s.size * w.unit(1.2), rgba(1, 1, 1, a));
      }
    }
    // Two layers of rolling hills.
    const p = this.scratch;
    for (let layer = 0; layer < 2; layer++) {
      const par = layer === 0 ? 0.15 : 0.3;
      const base = w.h * (layer === 0 ? 0.86 : 0.93);
      p.reset();
      p.moveTo(0, w.h);
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w.w;
        const wx = x + w.scroll * par;
        const y = base - Math.sin(wx * 0.004 + layer) * w.unit(40) - Math.sin(wx * 0.011 + layer * 2) * w.unit(18);
        p.lineTo(x, y);
      }
      p.lineTo(w.w, w.h);
      p.close();
      const dayCol = hsla(200 + layer * 20, 0.45, layer === 0 ? 0.62 : 0.45, 1);
      const nightCol = hsla(235, 0.5, layer === 0 ? 0.18 : 0.12, 1);
      const col = Float32Array.of(
        lerp(dayCol[0], nightCol[0], night),
        lerp(dayCol[1], nightCol[1], night),
        lerp(dayCol[2], nightCol[2], night),
        0.9,
      );
      this.fill.setColor(col);
      c.drawPath(p, this.fill);
    }
  }

  private drawNebulaBack(c: SkCanvas, w: World) {
    for (const s of w.stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw)) * s.z;
      this.circle(c, s.x, s.y, s.size * w.unit(1) * (0.6 + s.z), rgba(1, 1, 1, a));
    }
  }

  // ----------------------------------------------------------------- aura
  /** Breathing guide drawn around the hero: grows on inhale, shrinks on exhale. */
  private drawAura(c: SkCanvas, w: World) {
    const h = w.hero;
    const cx = h.x;
    const cy = h.y + h.wobble;
    const rMin = h.r * 1.5;
    const rMax = h.r * 3.6;
    const r = lerp(rMin, rMax, w.pacer.ringScale);
    const phase = w.pacer.phase;
    const hue = phase === 'inhale' ? 200 : phase === 'exhale' ? 40 : 160;
    // Track (target size) — dotted thin ring.
    this.ring(c, cx, cy, rMax, w.unit(1.5), rgba(1, 1, 1, 0.22));
    // Filled aura.
    this.glow(c, cx, cy, r * 1.25, hue, 0.55);
    this.ring(c, cx, cy, r, w.unit(3), hsla(hue, 0.8, 0.85, 0.85));
    // Progress arc through the current phase.
    const sweep = 360 * w.pacer.progress;
    this.stroke.setColor(hsla(hue, 0.9, 0.9, 0.9));
    this.stroke.setStrokeWidth(w.unit(4));
    c.drawArc(Skia.XYWHRect(cx - rMax, cy - rMax, rMax * 2, rMax * 2), -90, sweep, false, this.stroke);
  }

  // ---------------------------------------------------------- collectibles
  private drawCollectibles(c: SkCanvas, w: World) {
    for (const k of w.collectibles) this.drawCollectible(c, w, k);
  }

  private drawCollectible(c: SkCanvas, w: World, k: Collectible) {
    // Pop in with a little overshoot, shrink away when collected.
    const popIn = k.age < 0.6 ? Math.min(1, k.age * 3) * (1 + 0.35 * Math.sin(k.age * 9) * Math.exp(-k.age * 4)) : 1;
    const s = (k.collected ? k.fade : 1) * popIn;
    const bob = Math.sin(k.phase) * w.unit(3);
    const x = k.x;
    const y = k.y + bob;
    const pulse = 0.9 + 0.1 * Math.sin(k.phase * 2.3);
    switch (k.kind) {
      case 'star': {
        this.glow(c, x, y, k.r * 2.6 * s, 48, 0.7 * s);
        this.star(c, x, y, k.r * pulse * s, k.phase * 12, hsla(48, 1, 0.62, s));
        this.star(c, x, y, k.r * pulse * 0.55 * s, k.phase * 12, hsla(50, 1, 0.85, s));
        break;
      }
      case 'orb': {
        this.glow(c, x, y, k.r * 3 * s, k.hue, 0.8 * s);
        this.circle(c, x, y, k.r * pulse * s, hsla(k.hue, 0.9, 0.7, s));
        this.circle(c, x - k.r * 0.3, y - k.r * 0.3, k.r * 0.3 * s, rgba(1, 1, 1, 0.9 * s));
        break;
      }
      case 'pearl': {
        this.glow(c, x, y, k.r * 2.4 * s, 320, 0.5 * s);
        this.circle(c, x, y, k.r * 0.85 * s, hsla(330, 0.4, 0.92, s));
        this.circle(c, x - k.r * 0.25, y - k.r * 0.3, k.r * 0.22 * s, rgba(1, 1, 1, s));
        break;
      }
      case 'fish': {
        // Small friendly fish swimming left.
        const r = k.r * s;
        const wag = Math.sin(k.phase * 5) * 0.4;
        this.oval(c, x, y, r, r * 0.62, hsla(k.hue, 0.85, 0.6, s));
        const p = this.scratch;
        p.reset();
        p.moveTo(x + r * 0.7, y);
        p.lineTo(x + r * 1.5, y - r * 0.6 + wag * r);
        p.lineTo(x + r * 1.5, y + r * 0.6 + wag * r);
        p.close();
        this.fill.setColor(hsla(k.hue, 0.85, 0.5, s));
        c.drawPath(p, this.fill);
        this.oval(c, x - r * 0.1, y + r * 0.1, r * 0.6, r * 0.3, hsla(k.hue, 0.7, 0.8, 0.7 * s));
        this.eye(c, x - r * 0.45, y - r * 0.1, r * 0.2, 0, -0.3);
        break;
      }
      case 'ring': {
        const r = k.r * s;
        const rot = k.phase * 30;
        for (let i = 0; i < 3; i++) {
          this.ring(c, x, y, r - i * w.unit(7), w.unit(6), hsla((k.hue + i * 60 + w.t * 60) % 360, 0.9, 0.65, 0.85 * s));
        }
        for (let i = 0; i < 6; i++) {
          const a = (rot * Math.PI) / 180 + (i * TAU) / 6;
          this.star(c, x + Math.cos(a) * r, y + Math.sin(a) * r, w.unit(6) * s, rot, rgba(1, 1, 1, 0.9 * s));
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ hero
  private drawHero(c: SkCanvas, w: World) {
    switch (w.world) {
      case 'pond':
        this.drawPuff(c, w);
        break;
      case 'sky':
        this.drawBalloon(c, w, w.hero.x, w.hero.y + w.hero.wobble, w.hero.r, w.heroHue, w.hero.tilt, w.hero.puff, true);
        break;
      case 'nebula':
        this.drawComet(c, w);
        break;
    }
  }

  /** "Puff" the fish — the toddler hero. Cheeks inflate with the breath. */
  private drawPuff(c: SkCanvas, w: World) {
    const h = w.hero;
    const x = h.x;
    const y = h.y + h.wobble;
    const r = h.r * 1.15 * (1 + 0.1 * w.pacer.ringScale + 0.12 * h.puff);
    const hue = 28;
    c.save();
    c.rotate(h.tilt * 40, x, y);
    // Tail (wags faster while blowing).
    const wag = Math.sin(w.t * (6 + 10 * h.puff)) * 0.35;
    const p = this.scratch;
    p.reset();
    p.moveTo(x - r * 0.75, y);
    p.quadTo(x - r * 1.35, y - r * 0.9 + wag * r, x - r * 1.6, y - r * 0.55 + wag * r);
    p.quadTo(x - r * 1.25, y, x - r * 1.6, y + r * 0.55 + wag * r);
    p.quadTo(x - r * 1.35, y + r * 0.9 + wag * r, x - r * 0.75, y);
    p.close();
    this.fill.setColor(hsla(hue, 0.9, 0.55, 1));
    c.drawPath(p, this.fill);
    // Top fin.
    p.reset();
    p.moveTo(x - r * 0.35, y - r * 0.55);
    p.quadTo(x, y - r * 1.25, x + r * 0.35, y - r * 0.6);
    p.close();
    c.drawPath(p, this.fill);
    // Body + belly.
    this.oval(c, x, y, r, r * 0.8, hsla(hue, 0.95, 0.6, 1));
    this.oval(c, x + r * 0.1, y + r * 0.25, r * 0.7, r * 0.42, hsla(45, 0.9, 0.8, 1));
    // Stripes.
    for (let i = -1; i <= 1; i++) {
      this.oval(c, x + i * r * 0.32, y - r * 0.1, r * 0.09, r * 0.5, hsla(hue, 0.9, 0.45, 0.55));
    }
    // Side fin.
    p.reset();
    p.moveTo(x - r * 0.1, y + r * 0.15);
    p.quadTo(x - r * 0.45, y + r * 0.55 + Math.sin(w.t * 5) * r * 0.1, x - r * 0.05, y + r * 0.6);
    p.close();
    this.fill.setColor(hsla(hue, 0.9, 0.5, 0.9));
    c.drawPath(p, this.fill);
    // Cheeks (inflate with breath) and eye.
    const cheek = r * (0.18 + 0.22 * h.puff);
    this.circle(c, x + r * 0.55, y + r * 0.15, cheek, hsla(350, 0.9, 0.75, 0.5 + 0.4 * h.puff));
    this.eye(c, x + r * 0.45, y - r * 0.25, r * 0.19, h.blink, 0.3);
    // Mouth: "o" while blowing, smile otherwise.
    if (h.puff > 0.15) {
      this.circle(c, x + r * 0.95, y + r * 0.12, r * (0.08 + 0.1 * h.puff), rgba(0.35, 0.1, 0.1, 1));
    } else {
      this.stroke.setColor(rgba(0.35, 0.1, 0.1, 1));
      this.stroke.setStrokeWidth(r * 0.06);
      c.drawArc(Skia.XYWHRect(x + r * 0.6, y - r * 0.1, r * 0.45, r * 0.4), 20, 120, false, this.stroke);
    }
    c.restore();
  }

  /** Hot-air balloon (also used for the smaller "balloon friend"). */
  private drawBalloon(c: SkCanvas, w: World, x: number, y: number, r: number, hue: number, tilt: number, puff: number, withGlow: boolean) {
    const R = r * 1.45;
    c.save();
    c.rotate(tilt * 35, x, y + R);
    if (withGlow) this.glow(c, x, y, R * 2.1, hue, 0.25 + 0.3 * puff);
    // Envelope: circle + tapered neck.
    const p = this.scratch;
    p.reset();
    p.addCircle(x, y, R);
    p.moveTo(x - R * 0.62, y + R * 0.78);
    p.lineTo(x - R * 0.2, y + R * 1.42);
    p.lineTo(x + R * 0.2, y + R * 1.42);
    p.lineTo(x + R * 0.62, y + R * 0.78);
    p.close();
    this.fill.setColor(hsla(hue, 0.85, 0.55, 1));
    c.drawPath(p, this.fill);
    // Stripes clipped to the envelope.
    c.save();
    c.clipPath(p, ClipOp.Intersect, true);
    for (let i = -2; i <= 2; i++) {
      if (i % 2 === 0) continue;
      this.fill.setColor(hsla((hue + 40) % 360, 0.9, 0.75, 1));
      const sx = x + i * R * 0.42;
      c.drawOval(Skia.XYWHRect(sx - R * 0.2, y - R * 1.1, R * 0.4, R * 2.6), this.fill);
    }
    // Highlight.
    this.oval(c, x - R * 0.35, y - R * 0.4, R * 0.28, R * 0.45, rgba(1, 1, 1, 0.35));
    c.restore();
    // Burner flame (breath!).
    if (puff > 0.05) {
      const fy = y + R * 1.45;
      this.glow(c, x, fy, R * (0.35 + 0.5 * puff), 35, 0.9 * puff);
      this.oval(c, x, fy - R * 0.05 * puff, R * 0.1 * (0.6 + puff), R * (0.12 + 0.22 * puff), hsla(45, 1, 0.75, 0.95));
    }
    // Ropes + basket.
    this.stroke.setColor(hsla(30, 0.5, 0.35, 1));
    this.stroke.setStrokeWidth(Math.max(1, r * 0.06));
    const by = y + R * 1.95;
    c.drawLine(x - R * 0.2, y + R * 1.42, x - R * 0.28, by, this.stroke);
    c.drawLine(x + R * 0.2, y + R * 1.42, x + R * 0.28, by, this.stroke);
    this.fill.setColor(hsla(30, 0.6, 0.42, 1));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - R * 0.32, by, R * 0.64, R * 0.42), r * 0.15, r * 0.15), this.fill);
    this.fill.setColor(hsla(30, 0.6, 0.32, 1));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - R * 0.32, by + R * 0.12, R * 0.64, R * 0.06), 1, 1), this.fill);
    c.restore();
  }

  /** Glowing comet for teens; the trail is drawn as particles. */
  private drawComet(c: SkCanvas, w: World) {
    const h = w.hero;
    const x = h.x;
    const y = h.y + h.wobble;
    const r = h.r * 0.75;
    const hue = w.heroHue;
    this.glow(c, x, y, r * (3.2 + 2 * h.puff), hue, 0.5 + 0.4 * h.puff);
    this.ring(c, x, y, r * 1.35, w.unit(2), hsla(hue, 0.9, 0.8, 0.6));
    this.circle(c, x, y, r, hsla(hue, 0.7, 0.85, 1));
    this.circle(c, x, y, r * 0.55, WHITE);
    // Orbiting sparks.
    for (let i = 0; i < 3; i++) {
      const a = w.t * (1.5 + i * 0.4) + (i * TAU) / 3;
      const rr = r * (1.8 + 0.3 * Math.sin(w.t * 2 + i));
      this.circle(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5, w.unit(3), hsla((hue + 60 * i) % 360, 0.9, 0.85, 0.9));
    }
  }

  // ------------------------------------------------------------- particles
  private drawParticles(c: SkCanvas, w: World, back: boolean) {
    for (const p of w.particles) {
      const isBack = p.kind === 'trail' || p.kind === 'dust';
      if (isBack !== back) continue;
      this.drawParticle(c, w, p);
    }
  }

  private drawParticle(c: SkCanvas, w: World, p: Particle) {
    const f = clamp(p.life / p.maxLife, 0, 1);
    switch (p.kind) {
      case 'wind': {
        this.stroke.setColor(hsla(p.hue, 0.6, 0.9, 0.38 * Math.sin(f * Math.PI)));
        this.stroke.setStrokeWidth(w.unit(2));
        c.drawLine(p.x, p.y, p.x + p.size, p.y, this.stroke);
        break;
      }
      case 'bubble': {
        const a = clamp(f * 2, 0, 1) * 0.85;
        this.ring(c, p.x, p.y, p.size, Math.max(1, p.size * 0.18), hsla(195, 0.8, 0.9, a));
        this.circle(c, p.x, p.y, p.size, hsla(195, 0.8, 0.85, a * 0.18));
        this.circle(c, p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.22, rgba(1, 1, 1, a));
        break;
      }
      case 'burst':
        this.circle(c, p.x, p.y, p.size * f, hsla(p.hue, 0.9, 0.7, f));
        break;
      case 'spark':
        this.star(c, p.x, p.y, p.size * 1.6 * f, p.rot * 57, hsla(p.hue, 0.9, 0.75, f));
        break;
      case 'trail':
        if (w.world === 'nebula') this.glow(c, p.x, p.y, p.size * (0.6 + f), p.hue, 0.5 * f);
        else this.circle(c, p.x, p.y, p.size * f, rgba(1, 1, 1, 0.35 * f));
        break;
      case 'dust':
        this.circle(c, p.x, p.y, p.size, hsla(p.hue, 0.6, 0.8, 0.5 * Math.sin(f * Math.PI)));
        break;
      case 'confetti': {
        this.fill.setColor(hsla(p.hue, 0.9, 0.62, clamp(f * 2, 0, 1)));
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot * 57.3, 0, 0);
        c.drawRect(Skia.XYWHRect(-p.size / 2, -p.size / 4, p.size, p.size / 2), this.fill);
        c.restore();
        break;
      }
    }
  }

  // --------------------------------------------------------------- friends
  private drawFriends(c: SkCanvas, w: World, back: boolean) {
    for (const f of w.friends) {
      const isBack = f.kind === 'whale' || f.kind === 'rainbow' || f.kind === 'planet' || f.kind === 'moonBuddy' || f.kind === 'birds';
      if (isBack !== back) continue;
      this.drawFriend(c, w, f);
    }
  }

  private drawFriend(c: SkCanvas, w: World, f: Friend) {
    const u = (v: number) => w.unit(v) * f.scale;
    const fadeIn = smoothstep(0, 1, f.t);
    const fadeOut = smoothstep(f.life, f.life - 1.5, f.t);
    const a = fadeIn * fadeOut;
    const p = this.scratch;
    switch (f.kind) {
      case 'duck': {
        const y = f.y + Math.sin(w.t * 1.6) * u(4);
        this.oval(c, f.x, y, u(34), u(22), hsla(50, 0.95, 0.6, a));
        this.circle(c, f.x + u(26) * f.dir, y - u(22), u(15), hsla(50, 0.95, 0.62, a));
        p.reset();
        p.moveTo(f.x + u(38) * f.dir, y - u(24));
        p.lineTo(f.x + u(56) * f.dir, y - u(18));
        p.lineTo(f.x + u(38) * f.dir, y - u(14));
        p.close();
        this.fill.setColor(hsla(25, 0.95, 0.55, a));
        c.drawPath(p, this.fill);
        this.eye(c, f.x + u(29) * f.dir, y - u(26), u(4), 0, f.dir * 0.3);
        // wing
        this.oval(c, f.x - u(6) * f.dir, y + u(2), u(16), u(9), hsla(48, 0.9, 0.5, a));
        break;
      }
      case 'jelly': {
        const pulse = 1 + 0.08 * Math.sin(w.t * 3);
        const r = u(30) * pulse;
        this.glow(c, f.x, f.y, r * 2.2, f.hue, 0.35 * a);
        this.fill.setColor(hsla(f.hue, 0.8, 0.8, 0.75 * a));
        c.drawArc(Skia.XYWHRect(f.x - r, f.y - r, r * 2, r * 2), 180, 180, true, this.fill);
        this.stroke.setColor(hsla(f.hue, 0.8, 0.85, 0.8 * a));
        this.stroke.setStrokeWidth(u(2.5));
        for (let i = -2; i <= 2; i++) {
          p.reset();
          const sx = f.x + i * r * 0.35;
          p.moveTo(sx, f.y);
          const s1 = Math.sin(w.t * 2.5 + i) * u(10);
          const s2 = Math.sin(w.t * 2.5 + i + 1.5) * u(12);
          p.cubicTo(sx + s1, f.y + r * 0.7, sx - s2, f.y + r * 1.3, sx + s1, f.y + r * 1.9);
          c.drawPath(p, this.stroke);
        }
        break;
      }
      case 'turtle': {
        const y = f.y + Math.sin(w.t * 1.1) * u(6);
        const flip = Math.sin(w.t * 4) * u(6);
        this.oval(c, f.x - u(28) * f.dir, y + u(8) + flip, u(14), u(7), hsla(110, 0.5, 0.45, a));
        this.oval(c, f.x + u(24) * f.dir, y + u(8) - flip, u(14), u(7), hsla(110, 0.5, 0.45, a));
        this.oval(c, f.x, y, u(36), u(24), hsla(120, 0.45, 0.4, a));
        this.oval(c, f.x, y - u(2), u(26), u(15), hsla(120, 0.4, 0.5, a));
        this.circle(c, f.x + u(40) * f.dir, y - u(2), u(12), hsla(110, 0.5, 0.5, a));
        this.eye(c, f.x + u(44) * f.dir, y - u(6), u(3.2), 0, f.dir * 0.3);
        break;
      }
      case 'whale': {
        const y = f.y + Math.sin(w.t * 0.8) * u(10);
        const col = hsla(215, 0.55, 0.45, 0.85 * a);
        this.oval(c, f.x, y, u(120), u(58), col);
        this.oval(c, f.x + u(20), y + u(22), u(80), u(28), hsla(215, 0.4, 0.75, 0.6 * a));
        // tail
        const tw = Math.sin(w.t * 2) * u(10);
        p.reset();
        p.moveTo(f.x - u(105), y);
        p.quadTo(f.x - u(150), y - u(45) + tw, f.x - u(175), y - u(25) + tw);
        p.quadTo(f.x - u(150), y, f.x - u(175), y + u(25) + tw);
        p.quadTo(f.x - u(150), y + u(45) + tw, f.x - u(105), y);
        p.close();
        this.fill.setColor(col);
        c.drawPath(p, this.fill);
        this.eye(c, f.x + u(80), y - u(12), u(7), 0, 0.3);
        // smile
        this.stroke.setColor(hsla(215, 0.5, 0.25, a));
        this.stroke.setStrokeWidth(u(3));
        c.drawArc(Skia.XYWHRect(f.x + u(60), y + u(4), u(50), u(26)), 15, 120, false, this.stroke);
        // spout bubbles
        for (let i = 0; i < 4; i++) {
          const ph = (w.t * 0.9 + i * 0.25) % 1;
          this.ring(c, f.x + u(30) + Math.sin(ph * 6 + i) * u(8), y - u(60) - ph * u(70), u(4 + i * 2), u(1.5), hsla(195, 0.8, 0.9, (1 - ph) * a));
        }
        break;
      }
      case 'birds': {
        this.stroke.setColor(hsla(230, 0.3, 0.25, 0.8 * a));
        this.stroke.setStrokeWidth(u(2.5));
        for (let i = 0; i < 5; i++) {
          const bx = f.x + (i - 2) * u(26) * f.dir + Math.abs(i - 2) * u(8) * f.dir;
          const by = f.y + Math.abs(i - 2) * u(14);
          const flap = Math.sin(w.t * 8 + i) * u(6);
          p.reset();
          p.moveTo(bx - u(10), by - flap);
          p.quadTo(bx, by + u(3), bx + u(10), by - flap);
          c.drawPath(p, this.stroke);
        }
        break;
      }
      case 'balloonFriend':
        this.drawBalloon(c, w, f.x, f.y, w.unit(22) * f.scale, f.hue, Math.sin(w.t) * 0.08, 0.3 + 0.3 * Math.sin(w.t * 3), false);
        break;
      case 'rainbow': {
        const cx = w.w * 0.5;
        const cy = w.h * 0.95;
        const R = Math.max(w.w, w.h) * 0.55;
        const alpha = Math.sin(Math.PI * clamp(f.t / f.life, 0, 1)) * 0.55;
        const colors = [0, 30, 55, 120, 200, 250, 280];
        this.stroke.setStrokeWidth(w.unit(14));
        colors.forEach((hue, i) => {
          this.stroke.setColor(hsla(hue, 0.9, 0.65, alpha));
          const r = R - i * w.unit(14);
          c.drawArc(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), 180, 180, false, this.stroke);
        });
        break;
      }
      case 'shootingStars': {
        for (let i = 0; i < 3; i++) {
          const sx = f.x + i * u(90);
          const sy = f.y + i * u(40) + f.t * u(120);
          this.stroke.setColor(rgba(1, 1, 1, 0.85 * a));
          this.stroke.setStrokeWidth(u(3));
          c.drawLine(sx, sy, sx + u(120), sy - u(60), this.stroke);
          this.glow(c, sx, sy, u(26), 200, 0.9 * a);
          this.circle(c, sx, sy, u(5), WHITE);
        }
        break;
      }
      case 'planet': {
        const r = u(46);
        this.glow(c, f.x, f.y, r * 2.4, f.hue, 0.35 * a);
        this.circle(c, f.x, f.y, r, hsla(f.hue, 0.5, 0.6, a));
        this.oval(c, f.x - r * 0.25, f.y - r * 0.2, r * 0.45, r * 0.3, hsla(f.hue, 0.5, 0.72, a));
        this.stroke.setColor(hsla((f.hue + 40) % 360, 0.6, 0.8, 0.8 * a));
        this.stroke.setStrokeWidth(u(5));
        c.save();
        c.rotate(-18, f.x, f.y);
        c.drawOval(Skia.XYWHRect(f.x - r * 1.9, f.y - r * 0.45, r * 3.8, r * 0.9), this.stroke);
        c.restore();
        break;
      }
      case 'moonBuddy': {
        const r = u(42);
        this.glow(c, f.x, f.y, r * 2.6, 50, 0.4 * a);
        this.circle(c, f.x, f.y, r, hsla(50, 0.8, 0.85, a));
        this.eye(c, f.x - r * 0.3, f.y - r * 0.15, r * 0.14, 0, 0.3);
        this.eye(c, f.x + r * 0.25, f.y - r * 0.15, r * 0.14, 0, 0.3);
        this.stroke.setColor(hsla(30, 0.6, 0.4, a));
        this.stroke.setStrokeWidth(u(3));
        c.drawArc(Skia.XYWHRect(f.x - r * 0.35, f.y - r * 0.05, r * 0.7, r * 0.5), 20, 140, false, this.stroke);
        break;
      }
    }
  }
}
