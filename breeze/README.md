# Breeze (app)

React Native + Expo SDK 57 + TypeScript. Runs in the browser (React Native Web + Skia/CanvasKit) and can be built for iOS/Android.

## Scripts

| Command | What it does |
|---|---|
| `npm run web` | Expo dev server (Metro) on http://localhost:8081 |
| `npm run build:web` | Static production export to `dist/` (single-page output; includes `canvaskit.wasm`) |
| `npm run serve:web` | Serve `dist/` on http://localhost:8080 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run simulate` | Headless 60 Hz simulation of scripted breathing through the engine and world |
| `npm run ios` / `npm run android` | Native dev (requires a development build; Skia + expo-audio need native code, so use `npx expo run:ios` / `run:android`, not Expo Go) |

## Requirements on the tablet

* **HTTPS** (or `localhost`) — browsers only expose the microphone on secure origins. Any static host works (the export is plain files). For a quick LAN test use a tunnel (`npx cloudflared tunnel --url http://localhost:8080`) or a local certificate.
* The export uses root-absolute paths (`/_expo/...`, `/canvaskit.wasm`), so host it at the root of a (sub)domain. To host under a sub-path, set `"experiments": { "baseUrl": "/your/path" }` in `app.json` before `npm run build:web`.
* First load downloads ~10 MB (CanvasKit 8 MB + bundles + audio); it is cached afterwards.
* Tap "Start" once so the browser allows audio and the microphone.
* Safari on iPad, Chrome on Android and desktop browsers are supported. WebGL is required (all current tablets have it).

## URL parameters

`?age=little|kid|teen` · `?input=mic|touch|sim` · `?minutes=1..10` · `?detail=0` · `?sound=0` · `?sensitivity=0.4..3` · `?turbo=N` (dev only: fast-forward N steps per frame).

## Layout

```
App.tsx                      web: loads CanvasKit then the app; native: direct
src/app/Root.tsx             screen flow (start → play → end)
src/app/Runtime.ts           long-lived sensor + sound objects (created in the Start tap)
src/session/config.ts        default settings and URL preset parsing
src/session/types.ts         shared session settings, HUD state, and empty values
src/session/hud.ts           pure projection from simulation state to HUD state
src/session/audioEvents.ts   game event to sound/haptics policy
src/core/profiles.ts         age profiles (all tuning numbers, with rationale)
src/core/BreathEngine.ts     adaptive exhale detection
src/core/Pacer.ts            child-led breathing guide
src/core/World.ts            game simulation (pure TS)
src/sensors/*                mic (web/native), touch, simulated, composite
src/audio/*                  sound engine (Web Audio / expo-audio) + CC0 sample manifest
src/render/shaders.ts        SkSL background shaders (pond, sky, nebula)
src/render/WorldRenderer.ts  imperative drawing of the world into an SkPicture
src/render/GameCanvas.tsx    Skia canvas: shader fill + picture
src/hooks/useGameSession.ts  React lifecycle and frame-loop orchestration
src/ui/*                     screens, HUD, nurse panel, components
scripts/simulate.ts          headless simulation
assets/sfx/*.mp3             CC0 sounds (see ../CREDITS.md)
public/canvaskit.wasm        Skia for the web (copied by `npx setup-skia-web`)
```

## Native notes

* `app.json` declares the microphone permission strings. Build with `npx expo run:ios` / `run:android` (development build).
* The native microphone sensor uses expo-audio's `AudioStream` (raw PCM) and the native sound engine uses expo-audio players. These paths compile but were not exercised on a device in this iteration; the web path is the verified one.
