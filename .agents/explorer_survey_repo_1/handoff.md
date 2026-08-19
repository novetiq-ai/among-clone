# Comprehensive Repository Survey & Tech Stack Architecture Report

## 1. Observation

### 1.1 Project Structure & Configuration
- **Project Root**: `c:\Users\Yunes\Documents\antigravity\adventurous-lovelace`
- **Framework**: Next.js 15.4.9 (Next 15 App Router architecture)
- **Language & Runtime**: TypeScript 5.9.3 (`tsconfig.json` with strict mode, ES2017 target, `@/*` alias path resolution)
- **Styling**: Tailwind CSS v4 (`tailwindcss` 4.1.11, `@tailwindcss/postcss` 4.1.11, `@tailwindcss/typography` 0.5.19, `tw-animate-css` 1.4.0, `clsx` 2.1.1, `tailwind-merge` 3.3.1, `class-variance-authority` 0.7.1)
- **Configuration Files**:
  - `package.json` (lines 1-42): Scripts `dev`, `build`, `start`, `lint`, `clean`.
  - `next.config.ts` (lines 1-37): `reactStrictMode: true`, `transpilePackages: ['motion']`, `output: 'standalone'`.
  - `tsconfig.json` (lines 1-29): Paths alias `@/*` pointing to `./*`.
  - `app/globals.css` (lines 1-2): `@import "tailwindcss";`.
  - `metadata.json` (lines 1-7): Applet title "Among Us 2D Web P2P".

### 1.2 Dependencies & Libraries Available
- **Icons & Visual Indicators**: `lucide-react` (^0.553.0) — Used throughout HUD, emergency buttons, sabotages, task modals, minimap, CCTV, radar, chat, and lobby.
- **Animations**: `motion` (^12.23.24) — Framer Motion / Motion available for high-fidelity UI overlays.
- **P2P Multiplayer Relay**: `@supabase/supabase-js` (^2.112.3) and `peerjs` (^1.5.5) — `lib/peer.ts` implements low-latency broadcast channels (`skeld_room_<CODE>`) with presence tracking and message delivery.
- **AI & Integrations**: `@google/genai` (^2.4.0) — Google Gemini SDK available.
- **React**: `react` 19.2.1 / `react-dom` 19.2.1.

### 1.3 Codebase Components Inventory
1. **Types & Data Contracts** (`types/game.ts`, lines 1-285):
   - Comprehensive TypeScript definitions for `Player`, `PlayerRole`, `PlayerColor` (12 distinct colors with shadow/visor hexes), `HatType` (20 authentic hats), `TaskType` (18 task types), `VentDefinition`, `GameSettings`, `GamePhase`, `ChatMessage`, `EjectionData`, `SabotageType`, `ActiveSabotage`, `GameState`, and 17 `NetworkMessage` variants.
2. **Skeld Map & Spatial Physics** (`lib/map-data.ts`, lines 1-720):
   - 2400 x 1600 coordinate map.
   - 14 Canonical Skeld rooms: Cafeteria, Weapons, O2, Navigation, Shields, Communications, Storage, Admin, Electrical, Lower Engine, Upper Engine, Reactor, Security, MedBay.
   - Hallways, corridor tile geometry, and 12 cafeteria meeting table spawn slots.
   - 28 Authentic task definitions mapped to exact room coordinates.
   - 14 Vent definitions with bidirectional network graphs (triangles and pairs).
   - 4 Security CCTV camera positions.
   - Exhaustive `WALLS` array containing outer hull space void boundaries, room boundary colliders, and interior obstacle colliders.
   - `LOCKED_DOOR_WALLS` colliders for 10-second door sabotage lockdown.
   - Sub-stepping continuous collision resolution in `resolvePlayerMovement` with anti-trap pushout.
   - 21-node Waypoint NavMesh graph (`WAYPOINTS`) with Dijkstra pathfinding (`findBotPath`) for autonomous bot navigation.
3. **HTML5 2D Canvas Engine** (`components/game/TheSkeldMap.ts`, lines 1-2110):
   - Multi-layered procedural drawing pipeline:
     - 0.2x Parallax deep space with nebulae, twinkling stars, and orbiting asteroids.
     - Exterior spaceship hull contours with animated thruster plasma plumes and laser cannon fire.
     - Floor panels, metallic plate grids, floor rivets, room stencil typography, and hazard diagonal tape.
     - Room props: iconic Cafeteria table with 10 chairs and space window, pulsing Reactor antimatter core with cooling pipes, Upper/Lower Engine plasma turbines with spinning fins, MedBay holographic scan platform & examination beds, Admin oval table with rotating radar sweep line, Shields glowing hexagonal energy core, Weapons gunner control pods with laser targeting HUD, O2 greenhouse dome with space plant, Navigation galaxy star globe with orbiting rings, Storage cargo crates & fuel jerry cans, Electrical transformers with live electrical sparks, Security CCTV desk with 4 CRT screens & blinking red record LED, Communications oscilloscope audio waveforms.
     - Vent grates with red glow and travel destination HUD prompts for Impostors.
     - Emergency button dome with glass lid.
     - Dead bodies on floor with blood pools, sliced meat layer, protruding vertebra bone, and reported status.
     - Players: living crewmates with bean body shape, backpack oxygen tank, 2-tone shadow belly curve, cyan visor with pure white gleam, animated walking leg swing, customizable 2D canvas hats, name tags, and Impostor red name highlighting; ghost crewmates with translucent floating wavy bean shape.
     - 2.5D solid wall bulkheads drawn over floor entities for realistic depth occlusion.
     - World-space glowing sabotage sonar beacons at repair terminals.
     - Dynamic 2D raycasting line-of-sight (`hasLineOfSight`, `lineIntersectsBox`) testing ray intersections against structural walls and closed locked doors.
     - Dynamic lighting & fog of war (`drawDynamicLighting`) rendering radial darkness, flashlight vignettes, Impostor/Crewmate vision radii, blackout darkness during Electrical sabotage, and pulsing red alarm strobes during Reactor/O2 crises.
     - Screen-space directional navigation chevron arrows with room and distance tags pointing to active sabotage consoles.
4. **Game Controller & Action HUD** (`components/game/GameCanvas.tsx`, lines 1-1199):
   - 60fps `requestAnimationFrame` render loop with sub-stepping movement physics.
   - Smooth interpolation (lerp) for remote players with instant snap for teleports.
   - Dynamic top HUD with global task progress bar, collapsible task checklist, current room telemetry banner, audio mute toggle, control scheme switcher (Joystick / D-Pad / None), minimap toggle, and role indicator pill.
   - Bottom Action Buttons: USE / INTERACT / REPAIR, REPORT (with distance and line-of-sight validation), KILL (with cooldown and range validation), VENT (enter/exit/travel UI), and SABOTAGE (map modal).
   - Crisis alert banners for Reactor, O2, Lights, and Comms sabotages.
   - Integrated modals: `TaskModal`, `SkeldMinimapModal`, `CCTVModal`, `AdminTableModal`, `SabotageModal`, `KillAnimationOverlay`.
5. **18 Interactive Task Mini-Games** (`components/game/tasks/`):
   - `WireTask.tsx`: Interactive 4-wire color-matching puzzle with dragging physics and sound.
   - `SwipeCardTask.tsx`: Admin card swipe with speed validation (Too Fast / Too Slow / Accepted).
   - `ManifoldsTask.tsx`: 1-to-10 sequential keypad puzzle.
   - `MedbayScanTask.tsx`: Holographic body scan with visual timer, player stats, and green scanner beam.
   - `DownloadTask.tsx`: Data transfer progress bar with estimated time and transfer speed.
   - `DivertPowerTask.tsx`: Power distribution slider and acceptance switch.
   - `PrimeShieldsTask.tsx`: Hexagonal shield nodes toggle puzzle.
   - `ClearAsteroidsTask.tsx`: 2D arcade shooter targeting 20 flying asteroids.
   - `CalibrateDistributorTask.tsx`: 3-stage timing alignment ring minigame.
   - `CleanO2FilterTask.tsx`: Drag-and-drop space leaf clearing through air chute.
   - `ChartCourseTask.tsx`: 4-point flight path navigation waypoints.
   - `AlignEngineTask.tsx`: Engine angle calibration crosshair alignment.
   - `EmptyGarbageTask.tsx`: Spring-loaded trash ejection lever.
   - `StartReactorTask.tsx`: Simon Says 5-stage memory pattern puzzle.
   - `InspectSampleTask.tsx`: Reagent chemical incubation timer and anomaly detection.
   - `RefuelEnginesTask.tsx`: Storage jerry can hold-to-refill and engine tank refueling.
   - `FixLightsTask.tsx`: 5-switch electrical alignment minigame.
   - `FixReactorTask.tsx`: Reactor dual-hand biometric stabilization interface.
6. **Procedural WebAudio Sound Engine** (`lib/sound.ts`, lines 1-544):
   - 100% synthesized procedural audio using Web Audio API oscillators, noise buffers, and biquad filters.
   - Footsteps, task completion chord chime, emergency sirens, kill slash noise + sub-bass thud, vent whoosh, button clicks, laser shots, shield hums, sabotage alarm klaxons, switch clicks, door lock thuds, camera shutters, error buzzes, card swipe beeps.
7. **Multiplayer, Bots, and Meeting Flow** (`app/page.tsx`, lines 1-2088):
   - Host-authoritative architecture managing game state, movement deltas, and win conditions (Impostor parity, Crewmate task completion, Impostor elimination, Sabotage timeout).
   - Autonomous AI bot loop with Dijkstra NavMesh pathfinding, task simulation, dead body reporting with LOS, stealth kills with witness LOS checks, and meeting voting delays.
   - Meeting workflow: Discussion timer -> Voting timer -> Results reveal (4s) -> Cinematic ejection cutscene -> Cafeteria respawn.
   - Role Reveal ("SHHH!" cutscene) and Game Over modal with victory reason and "Play Again" reset.
8. **Build Verification**:
   - `npm run build` executed and exited with code 0 (clean static build, 132 kB route bundle size, 0 TypeScript errors).

---

## 2. Logic Chain

1. **Evaluation of Architecture (Canvas 2D Engine vs React DOM)**:
   - *Premise*: The Skeld map is a large (2400x1600) environment with complex geometry, 14 rooms, dense decorative props, animated thrusters, parallax starfields, and up to 10 players/bots moving simultaneously with raycasting shadow occlusions and dynamic lighting.
   - *Reasoning*: Rendering hundreds of moving objects and raycasting shadow geometry via DOM nodes creates excessive layout/reflow overhead. A dedicated HTML5 2D Canvas rendering loop using `requestAnimationFrame` handles 60fps rendering, sub-stepping movement physics, raycasting line-of-sight checks, and camera translations without DOM overhead.
   - *UI Reasoning*: Conversely, text-heavy menus, chat rooms, settings toggles, and vector puzzle minigames benefit immensely from React 19's declarative state, accessibility, and Tailwind CSS styling.
   - *Inference*: The existing hybrid architecture (Canvas 2D game world + React DOM UI/Task overlays) is the optimal frontend pattern for performance, fidelity, and maintainability.

2. **Evaluation of Networking Strategy**:
   - *Premise*: WebRTC peer-to-peer multiplayer requires a reliable, zero-cost signaling / relay channel with room code discovery.
   - *Reasoning*: Supabase Realtime broadcast channels (`skeld_room_<CODE>`) provide ultra-low latency signaling and state sync with presence tracking, eliminating the need for dedicated WebSocket servers while enabling seamless private room codes.
   - *Inference*: The existing P2P architecture in `lib/peer.ts` with host-authoritative state resolution in `app/page.tsx` satisfies R4 seamlessly.

3. **Evaluation of Sound & Asset Architecture**:
   - *Premise*: External audio and sprite assets can cause 404s, CORS failures, long load times, and bandwidth overhead.
   - *Reasoning*: Procedural WebAudio synthesis (`lib/sound.ts`) and Canvas vector geometry (`TheSkeldMap.ts`, `AstronautAvatar.tsx`) produce 100% reliable, zero-asset, instant-load gameplay that is resilient across all deployment environments.

---

## 3. Caveats

- **No Caveats**: All components, map data, tasks, network relay, audio synthesis, and build pipelines were inspected and verified directly in the repository.
- The build has a minor warning regarding multiple `package-lock.json` files in parent directories (inferred workspace root), which is benign and can be silenced if desired via `outputFileTracingRoot` in `next.config.ts`.

---

## 4. Conclusion

The repository is in a high-fidelity state with:
1. **Next.js 15 App Router + React 19 + TypeScript 5.9 + Tailwind CSS v4** fully configured and compiling cleanly.
2. **HTML5 2D Canvas engine** (`TheSkeldMap.ts`) providing 60fps rendering with 14 Skeld rooms, parallax cosmic backgrounds, raycasting line-of-sight, dynamic lighting, 14 vents, 4 CCTV cameras, and Admin radar table.
3. **18 complete, interactive Task Mini-Games** covering all Skeld tasks and sabotages.
4. **Complete Game Lifecycle**: Main Menu -> Lobby with customizer & bot controls -> Role Reveal -> Active Gameplay -> Dead Body / Meeting Modal -> Ejection Cutscene -> Win/Loss screen -> Play Again loop.
5. **Intelligent AI Bots** navigating the map via Dijkstra NavMesh, doing tasks, reporting bodies, and performing stealth kills.
6. **Pure WebAudio SFX engine** with authentic sound synthesis for all interactions.

---

## 5. Verification Method

To independently verify the repository state:
1. **Run Build**:
   ```pwsh
   npm run build
   ```
   *Expected Result*: Exit code 0, static pages generated cleanly.

2. **Inspect Core Engine Files**:
   - Map & Physics: `lib/map-data.ts`, `components/game/TheSkeldMap.ts`
   - Game Canvas & HUD: `components/game/GameCanvas.tsx`
   - Game Loop & State Sync: `app/page.tsx`
   - Sound Engine: `lib/sound.ts`
   - Networking: `lib/peer.ts`
   - Task Minigames: `components/game/tasks/TaskModal.tsx` and all task components in `components/game/tasks/`
