# Breeze — game design document

## 1. Goal

Reduce distress during needle procedures in 2–18-year-olds by (a) occupying attention with rich, continuously moving, responsive visuals and sound, and (b) shaping the child's breathing toward slow, gentle, extended exhalations — which lowers physiological arousal and, if the needle goes in during an exhale, reduces pain. One input only: the breath (microphone), with touch as a fallback.

Design rules, all traceable to the evidence in `../research.md`:

1. **Gentle beats hard.** Full reward is reached at a *low* airflow; blowing harder gains nothing. This protects against forced breathing and hyperventilation and teaches the calming pattern.
2. **Long beats short.** "Calm breaths" are those that last at least 60 % of the current target; the target adapts to the child (1.15 × their own median exhale, clamped per age).
3. **Never punish, never wait.** No fail state, no game over, no score loss. Young children get a movie that reacts; everything they do is rewarded, and the world keeps performing when they do nothing.
4. **The guide follows the child.** The breathing ring re-synchronises to a real exhale whenever it starts; it never contradicts the body.
5. **Celebrate calm, not effort.** Big moments are triggered by calm breaths (and by time as a safety net), not by points.
6. **Give the nurse the needle timing.** A large exhale light and live meter live in a hidden panel.

## 2. Core loop

```
inhale (ring grows)  →  exhale (ring shrinks, hero rises, wind, chimes)  →  rest  →  …
                            │
                            ├── collectibles laid out along an arc the exhale sweeps
                            ├── every N calm breaths: "big moment" (bloom shader pulse, friend, confetti, jingle)
                            └── encouragement toast on a calm breath ("So gentle!", "Long breath!")
```

Session length is 3 min by default (1–10 min). It ends with a celebration and, for kids/teens, statistics.

### Breath input

`BreathEngine` (src/core/BreathEngine.ts) receives ~60 feature frames per second (`level` = RMS, `noisiness` = spectral flatness) and produces:

* an **adaptive noise floor** (0.8 s calibration, falls fast, rises 0.5 dB/s, frozen while exhaling);
* an **adaptive peak** so "full strength" is relative to the child (a toddler's puff and a teen's blow both reach 1.0 after a few breaths);
* hysteresis + hold times (onset 40–90 ms, release 300–350 ms) so nothing flickers;
* a **voice penalty** (16–20 dB) for harmonic sound in the kid/teen profiles, so a talking nurse does not fly the balloon; the toddler profile accepts any sound on purpose;
* exhale events with duration, mean strength and **steadiness** (1 − normalised standard deviation of strength over the middle 70 % of the breath).

Sensors: `MicSensor.web.ts` (Web Audio, noise suppression/AGC off), `MicSensor.ts` (expo-audio PCM stream on iOS/Android), `TouchSensor` (hold = blow), `SimSensor` (scripted breathing for demos and tests). They are merged by `CompositeSensor` (max level).

### Pacer

`Pacer` (src/core/Pacer.ts): phases inhale → exhale → rest with per-age durations; jumps to *exhale* when a real exhale starts; releases early when the child stops; extends up to the age cap while the child keeps going; after every breath, `target = lerp(target, clamp(median × 1.15, min, max), 0.3)`.

### World

`World` (src/core/World.ts) is a pure TypeScript simulation (no React, no Skia) so it can be unit-tested headlessly (`npm run simulate`):

* hero physics: target height = rest height − lift(strength) × range; rises with τ = 0.45 s, sinks with τ = 1.3 s;
* scrolling speed rises with the breath;
* collectible groups every 2–3.5 s: for the pond, things pop in anywhere and drift to the fish; for sky/nebula, arcs of 6–7 items whose horizontal span equals the exhale target at typical speed;
* magnet assist pulls collectibles toward the hero (radius 110–420 px, stronger for younger profiles) so effort is always rewarded;
* particles: wind streaks, bubbles from the fish's mouth, bursts, trails, confetti, dust;
* friends (need no input): duck, jellyfish, turtle, whale / birds, balloon friend, rainbow / shooting stars, planet, moon;
* big moments: bloom pulse (shader), special friend, 70 confetti, jingle;
* calm meter = EMA of 0.55 × length score + 0.45 × steadiness.

## 3. Age profiles (src/core/profiles.ts)

| | little (2–5) | kid (6–12) | teen (13–18) |
|---|---|---|---|
| inhale / exhale start / exhale min–max / rest (s) | 1.6 / 1.8 / 1.0–3.0 / 1.0 | 2.5 / 3.5 / 1.5–6.0 / 0.8 | 4.0 / 5.0 / 2.5–8.0 / 0.6 |
| onset / release / min exhale (ms) | 40 / 350 / 120 | 80 / 300 / 300 | 90 / 300 / 400 |
| accept voice / voice penalty | yes / 0 dB | no / 16 dB | no / 20 dB |
| calm-breath threshold | 40 % of target | 60 % | 60 % |
| sweet spot (strength) | 0.05–1.0 | 0.18–0.75 | 0.15–0.70 |
| scroll base / boost (px/s @1024) | 45 / 80 | 40 / 110 | 50 / 130 |
| magnet radius (px @1024) | 420 | 240 | 170 |
| big moment | every 22 s | 4 calm breaths, ≤ 45 s | 4 calm breaths, ≤ 50 s |
| friend every / spawn every (s) | 7 / 2.2 | 16 / 3.0 | 20 / 3.5 |
| session (s) | 150 | 180 | 180 |
| pacer text / stats / touch always | no / no / yes | yes / yes / no | yes / yes / no |

Why the numbers: resting respiratory rate and comfortable exhale length by age (research.md §4), resonance-frequency breathing for teens (~6/min) and children (6.5–9.5/min), the "no forced breathing" rule, and the finding that young children need passive-rich content.

## 4. Visuals (Skia)

Rendering is `@shopify/react-native-skia` (CanvasKit/WebGL on the web). One full-screen **SkSL runtime shader** per world (src/render/shaders.ts) takes the uniforms `uTime, uBreath, uBloom, uProgress, uCalm, uScroll, uDetail`:

* **Pond:** depth gradient, multiplicative sine caustics that brighten with the breath, three drifting light rays, sandy noise floor, vignette.
* **Sky:** dawn → day → golden hour → night keyed to session progress; sun on an arc, crescent moon at night; two fbm cloud layers with parallax that stretch with the breath; wind streaks while blowing.
* **Nebula:** domain-warped fbm gas with two palettes mixed by the calm meter (violet → teal), hash-grid twinkling stars, brightness that follows the breath; bloom pulses from the centre on big moments.

`uDetail = 0` (nurse panel "Rich graphics" off, or `?detail=0`) skips the expensive octaves for old tablets.

Everything else — heroes (Puff the fish with inflating cheeks, striped balloon with burner flame, glowing comet with orbiting sparks), collectibles, particles, friends and the breathing aura — is drawn imperatively into an `SkPicture` every frame by `WorldRenderer` (src/render/WorldRenderer.ts). Glows use a cached unit radial gradient scaled through the canvas matrix instead of blur filters, which keeps the frame cost around 1 ms of CPU. The picture and the shader uniforms are Reanimated shared values, so no React re-render happens per frame; the HUD re-renders at ~8 Hz.

## 5. Audio

Web Audio (src/audio/createSoundEngine.web.ts) with expo-audio on native:

* **Wind bed** — a looping noise/wind sample through a low-pass filter; gain and cutoff follow the exhale strength (immediate feedback: "my breath is the wind").
* **Ambience** per world — underwater pad + bubbles, birds, relaxing space pad — crossfaded.
* **Chimes** — one glass-bell sample pitched along a major pentatonic run, so any sequence of collected stars sounds musical; pops/plops/bubbles for the pond.
* **Events** — magic sweep for rings, soft confirmation on a calm breath, xylophone for toddlers, pizzicato/steel-drum/win jingles for big moments, completion sound at the end, a low soft bell at each inhale for kids/teens.
* All samples are CC0 (../CREDITS.md), transcoded to MP3 for Safari. If a sample fails to load, a tiny oscillator synth stands in so the game is never silent.

## 6. Screens

1. **Start** — pick the age (three big cards), pick the input (Microphone / Hold the screen / Demo), one big Start button, plain-language instructions. Gear (long press or 3 taps) opens the nurse panel.
2. **Game** — full-screen canvas; prompts at the top ("Breathe in gently…", "Now blow out slowly…"), stars and timer pills, encouragement toasts, calm meter (teens), thin session progress bar, pause button (long press = nurse panel).
3. **Pause menu** — keep playing / nurse settings / finish now.
4. **Nurse panel** — exhale light, live mic meter with threshold marker, breath statistics, re-learn room noise, trigger a celebration, age, input, sensitivity, game length, sound, volume, graphics detail, end game.
5. **End** — age-appropriate praise; stars, calm breaths, longest exhale; breaths/min and calm score for teens; play again / choose another game.

## 7. Testing

* `npm run typecheck` — TypeScript strict.
* `npm run simulate` — 18 headless sessions (3 profiles × 6 child types incl. tiny puffs, hard blowing, noisy ward + talking nurse) printing detection rate, calm-breath rate, adaptation of the target, rewards, and the false-trigger rate from speech.
* `?input=sim&turbo=120` (dev builds) fast-forwards a session for visual checks.
* Verified in the browser: all three worlds, day/night cycle, rings, friends, big moments, toasts, end screen, pause menu, nurse panel, production export (`npm run build:web`).

## 8. Ideas not built (yet)

* Spoken prompts (recorded child-friendly voice) — the guideline evidence favours guided practice.
* A "practice round" the day before (home use), and a nurse-side session log (needs consent/data policy).
* Heart-rate input from a wearable to show the calming effect to teens.
* Localisation (all strings are in `src/ui/*` and `src/hooks/useGameSession.ts`).
