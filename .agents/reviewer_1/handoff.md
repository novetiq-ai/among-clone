# Codebase & Architecture Review Report (Reviewer 1)

## Review Summary

**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Map Data & Physics (`lib/map-data.ts`)
- **Rooms (Lines 57–72)**: Contains all 14 canonical Skeld rooms:
  1. `Cafeteria` (x: 920, y: 420, w: 560, h: 440)
  2. `Weapons` (x: 1600, y: 340, w: 380, h: 300)
  3. `O2` (x: 1540, y: 680, w: 280, h: 200)
  4. `Navigation` (x: 1980, y: 660, w: 380, h: 380)
  5. `Shields` (x: 1620, y: 1180, w: 360, h: 280)
  6. `Communications` (x: 1300, y: 1240, w: 260, h: 220)
  7. `Storage` (x: 920, y: 1020, w: 360, h: 440)
  8. `Admin` (x: 1500, y: 920, w: 320, h: 220)
  9. `Electrical` (x: 620, y: 920, w: 300, h: 340)
  10. `Lower Engine` (x: 260, y: 1080, w: 340, h: 340)
  11. `Security` (x: 620, y: 640, w: 280, h: 240)
  12. `Reactor` (x: 80, y: 620, w: 340, h: 440)
  13. `Upper Engine` (x: 260, y: 340, w: 340, h: 280)
  14. `MedBay` (x: 620, y: 360, w: 300, h: 260)
- **Vents (Lines 166–192)**: 12 vents configured in 4 distinct network graphs:
  - Triangle 1 (West): MedBay (`vent-medbay`) $\leftrightarrow$ Security (`vent-security`) $\leftrightarrow$ Electrical (`vent-electrical`).
  - Triangle 2 (East): Cafeteria (`vent-cafeteria`) $\leftrightarrow$ Admin (`vent-admin`) $\leftrightarrow$ Hallway (`vent-hallway-admin`).
  - Pair 3 & 4 (Reactor Engine Wing): Reactor Top $\leftrightarrow$ Upper Engine, Reactor Bottom $\leftrightarrow$ Lower Engine.
  - Pair 5 & 6 (East Wing): Weapons $\leftrightarrow$ Nav Top, Shields $\leftrightarrow$ Nav Bottom.
- **Surveillance Cameras (Lines 195–200)**: 4 CCTV cameras (`cam-medbay`, `cam-admin`, `cam-nav`, `cam-reactor`).
- **Collision Boundaries (Lines 207–378)**: Structural outer hull barriers, internal room perimeter walls with hallway doorways, and 12 interior obstacle colliders (Cafeteria tables, Reactor core, Engine turbines, MedBay scanner, Admin table, Electrical transformer, Security console, Storage crates, O2 greenhouse dome, Shields generator, Navigation console).
- **Sabotage Locked Doors (Lines 383–424)**: 9 room door definitions with obstacle hitboxes activated during door sabotages.
- **Continuous Collision Physics (Lines 434–543)**:
  - `checkCollision(x, y, radius, isGhost, lockedDoors)`: circle-vs-AABB distance squared check. Ghost bypass logic verified (`if (isGhost) return false`).
  - `resolvePlayerMovement(currentX, currentY, moveDx, moveDy, radius, isGhost, lockedDoors)`: continuous sub-stepping movement broken into maximum 3px increments (`maxStep = 3`), axis-independent sliding (X and Y independently evaluated), boundary clamping `[60..MAP_WIDTH-60, 340..MAP_HEIGHT-120]`, and anti-trap pushout `getNearestSafePosition`.
- **NavMesh Waypoint Graph (Lines 589–719)**: 23 connected waypoints with bidirectional edges, nearest-waypoint locator, and complete Dijkstra pathfinding algorithm `findBotPath`.

### 1.2 Canvas 2D Engine & Rendering (`components/game/TheSkeldMap.ts`)
- **Raycasting Line-of-Sight (Lines 27–104)**: `hasLineOfSight(x1, y1, x2, y2, lockedDoors)` computes 4-edge segment-to-segment intersection between the vision ray and all structural wall boxes (excluding non-LOS-blocking furniture obstacles) as well as active sabotage locked doors.
- **Parallax Deep Space (Lines 129–133, 189–250)**: Multi-layer space rendering with 0.2x translation factor relative to camera offset, pulsating nebulae, twinkling stars, and floating animated asteroids.
- **Room Props & Decals (Lines 144–176)**: Comprehensive 2D procedural rendering of ship hull, floor panels, hazard warning stripes, machinery, vents, security cameras with live blinking red surveillance LEDs, and cafeteria emergency table.
- **Stealth & Line-of-Sight Entity Culling (Lines 1304–1592)**:
  - Dead bodies: drawn only if within vision radius and `hasLineOfSight` passes (unless local player is a ghost).
  - Remote players: filtered by distance and `hasLineOfSight`. Living players cannot see through walls. Vents hide impostors from crewmates (`if (p.inVent && !isImpostor) continue`).
  - Ghosts: rendered translucently (`globalAlpha = 0.55`) and only visible to fellow dead players.
- **Dynamic Lighting & Fog of War (Lines 1842–1893)**:
  - Crewmate base vision: 280px radius radial vignette gradient.
  - Impostor & Ghost vision: 380px expanded radius.
  - Electrical lights sabotage: drops crewmate vision to 110px heavy blackout while impostors retain full 380px vision.
  - Critical sabotage strobe: pulsating red emergency alarm gradient (`rgba(239, 68, 68, ...)`).
- **Sabotage Telemetry (Lines 1928–2109)**: World-space pulsating sonar beacons at repair consoles and screen-space clamped directional chevron arrows with real-time distance meters.

### 1.3 Game World Controller (`components/game/GameCanvas.tsx`)
- **Physics Loop (Lines 490–763)**: 60fps `requestAnimationFrame` loop with delta timing (`Math.min(0.1, (time - lastTime) / 1000)`).
- **Input Handling**: Full desktop keyboard bindings (WASD, Arrows, Space/E for Use, Q for Kill, R for Report, V for Vent, M for Map, X/Tab for Sabotage, Esc for modals, 1–3/Tab for vent traversal) and mobile touch virtual joystick / D-pad.
- **Remote Player Interpolation (Lines 695–735)**: Delta-scaled lerping (`lp.x += (p.x - lp.x) * Math.min(1, delta * 20)`) with snap threshold (>250px) preventing wall-gliding on teleports and vent jumps.
- **Action HUD & Proximity Triggers**: Proximity checks combined with `hasLineOfSight` for Kill targets, Dead Body reports, Emergency meetings (blocked during sabotage crises), CCTV desk, Admin radar, and Sabotage repair stations.

### 1.4 Networking (`lib/peer.ts`)
- **P2P Mesh Relay**: European Supabase Realtime broadcast channels (`@supabase/supabase-js`) with low latency (40 events/sec).
- **Room Codes**: 4-character non-ambiguous uppercase codes (`generateRoomCode`).
- **Host-Authoritative Messaging**: Full typed broadcast and direct peer messaging (`initHost`, `initClient`, `broadcast`, `sendToPeer`, `sendToHost`, `onMessage`, `onDisconnect`).

### 1.5 Build & Lint Verification
- `npm run build`: **Exit Code 0**, Next.js 15.5 compiled all routes, validated TypeScript types with 0 errors, generated static pages.
- `npm run lint`: **Exit Code 0**, ESLint passed with 0 warnings or errors.

---

## 2. Logic Chain

1. **Map Fidelity & Completeness**: `lib/map-data.ts` contains exactly 14 rooms matching the authentic Skeld map layout, all 4 vent subnetworks (12 stations), 4 CCTV surveillance cameras, and 23 NavMesh waypoints.
2. **Robust Physics**: Sub-stepping movement in $\le 3\text{px}$ increments guarantees that even at high speeds or during framerate hiccups, circle colliders cannot tunnel through structural walls. Axis separation permits smooth wall-sliding.
3. **True Stealth Line-of-Sight**: `hasLineOfSight` runs 2D segment-to-box intersection tests against structural walls and locked doors. The rendering pipeline in `TheSkeldMap.ts` enforces this check on players and corpses before drawing, preventing wallhacking or information leaks.
4. **Vision & Lighting Asymmetry**: Crewmate vs. Impostor vision radii, blackout effects during Lights sabotage, and ghost transparency are strictly enforced in both rendering and interaction trigger logic.
5. **Architectural Separation**: Clean separation between data geometry (`lib/map-data.ts`), procedural 2D rendering (`components/game/TheSkeldMap.ts`), game loop/HUD (`components/game/GameCanvas.tsx`), and network relay (`lib/peer.ts`).
6. **Integrity & Quality**: No hardcoded test stubs, no facade implementations, and no build/lint errors.

---

## 3. Caveats

- **WebRTC / Supabase Relay**: The networking layer uses Supabase Realtime broadcast channels with fallback presence tracking. Network connectivity depends on internet access to the public Supabase endpoint.
- **Audio Synthesis**: The sound engine is fully procedural via Web Audio API (`lib/sound.ts`), requiring user interaction (click/touch) to unlock the browser AudioContext before sounds play.

---

## 4. Conclusion

The map geometry, 2D canvas rendering engine, continuous collision physics, raycasting vision system, HUD action controller, and P2P networking modules fully satisfy all requirements (R1–R5) of `ORIGINAL_REQUEST.md` and `PROJECT.md`. The implementation is robust, authentic, and performant.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently verify this evaluation:

1. **Build & Typecheck**:
   ```bash
   npm run build
   ```
   *Expected*: Exit code 0, all routes compiled, zero TypeScript errors.

2. **Lint Check**:
   ```bash
   npm run lint
   ```
   *Expected*: Exit code 0, zero lint errors.

3. **Code Inspection**:
   - Inspect `lib/map-data.ts` lines 57–72 (14 rooms), 166–192 (4 vent networks), 195–200 (4 CCTV cameras), 488–543 (`resolvePlayerMovement` sub-stepping).
   - Inspect `components/game/TheSkeldMap.ts` lines 27–104 (`hasLineOfSight` raycaster), 1842–1893 (`drawDynamicLighting`).
   - Inspect `components/game/GameCanvas.tsx` lines 490–763 (60fps physics loop).
   - Inspect `lib/peer.ts` lines 28–328 (`NetworkManager` broadcast mesh).
