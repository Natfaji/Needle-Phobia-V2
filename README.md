# Breeze — a breathing-controlled game for children who are afraid of needles

Breeze is a browser game for tablets that turns a slow breath *out* into wind. It is meant to be played on a nurse's tablet just before and during an injection or blood draw. Every world rewards long, gentle exhales — the one breathing technique that both calms the body and is recommended during needle procedures — while giving the child something colourful, moving and musical to look at instead of the needle.

* **Evidence and design rationale:** [`research.md`](research.md)
* **Game design (mechanics, age tuning, visuals, audio):** [`docs/game-design.md`](docs/game-design.md)
* **Sound credits (all CC0):** [`CREDITS.md`](CREDITS.md)
* **The app (React Native + Expo + TypeScript):** [`breeze/`](breeze/README.md)

## Three worlds for three ages

| | Little ones (2–5) | Kids (6–12) | Teens (13–18) |
|---|---|---|---|
| World | **Bubble Pond** — Puff the fish blows bubbles; ducks, jellyfish, turtles and a whale visit | **Sky Sailor** — a hot-air balloon flies through a day that turns into a starry night, collecting stars and rainbow rings | **Nebula Drift** — a comet through a domain-warped nebula that turns from violet to teal as the calm meter fills |
| How it plays | Anything the child does — a puff, a giggle, a tap — makes bubbles and friends appear; the world keeps moving even with no input | A breathing ring around the balloon says when to breathe in and when to blow; arcs of stars are shaped so one long, gentle breath collects the whole arc | Same mechanic, calmer look; explicit target ("aim for ~5 s"), a calm meter driven by exhale length and steadiness, statistics at the end |
| Pacing | none | ≈ 7–8 breaths/min, exhale target adapts 1.5–6 s | ≈ 5.5–6.5 breaths/min, exhale target adapts 2.5–8 s |

There are no enemies, no timers to beat and no way to lose. A celebration ("big moment": rainbow, whale, shooting stars, confetti, jingle) happens every few calm breaths, and at least every 22–50 s regardless.

## For the nurse

* Open the **nurse panel** with a long press (or three quick taps) on the ⚙︎ gear on the start screen, or from the pause menu during a game.
* The panel shows a large **"BREATHING OUT" light** — the best moment for the needle — plus a live microphone meter, sensitivity, game length (1–10 min), sound, and a low-detail graphics switch for old tablets.
* If the microphone is unavailable or the room is too noisy, switch to **"Hold the screen"**: holding a finger anywhere on the screen counts as breathing out (you can do it for the child).
* Hold the tablet about a hand's width from the child's mouth. No mouthpiece is needed; wipe the tablet between patients.

## Quick start

```bash
cd breeze
npm install
npm run web          # dev server on http://localhost:8081
```

For a tablet, the microphone needs **HTTPS** (or localhost). Build the static site and put it behind any HTTPS host:

```bash
cd breeze
npm run build:web    # writes breeze/dist (static, ~12 MB incl. CanvasKit)
npm run serve:web    # serves dist on http://localhost:8080 for a quick check
```

URL parameters preset the game, e.g. `?age=teen&input=touch&minutes=2`, `?input=sim` for a self-playing demo, `?detail=0` for old tablets.

## Status

The game is complete and runs in the browser (verified in Chromium; the audio is MP3 so Safari/iPad decodes it). Detection and tuning were validated with a headless 60 Hz simulation of scripted breathing, room noise and a talking nurse (`npm run simulate`), not yet with real children — see the limitations in `research.md`.
