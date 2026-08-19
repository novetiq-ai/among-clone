# Project: Among Us ("The Skeld") High-Fidelity 2D Web Replica

## Architecture
- **Framework**: Next.js 15.4 App Router, React 19, TypeScript 5.9, Tailwind CSS v4
- **2D Game Rendering**: HTML5 Canvas engine (`components/game/TheSkeldMap.ts`) running at 60fps `requestAnimationFrame`, rendering multi-layer procedural space parallax, ship hull, floor decals, room props, shadows, dynamic lighting, player avatars, corpses, and telemetry.
- **Physics & Collisions**: Sub-stepping continuous circle-vs-AABB collider resolution with pushout in `lib/map-data.ts` and `GameCanvas.tsx`.
- **Vision & Line-of-Sight**: 2D Raycasting visibility polygon and segment occlusion (`hasLineOfSight`, `drawDynamicLighting`) considering structural walls and locked sabotage doors.
- **Game State Machine & Network**: Host-authoritative synchronization in `app/page.tsx` and P2P mesh relay via Supabase Realtime / WebRTC data channels in `lib/peer.ts`.
- **Audio Synthesis**: Pure procedural Web Audio API synthesizer (`lib/sound.ts`) with zero external sound asset dependencies.
- **Interactive Minigames**: Modular React 19 vector puzzle components in `components/game/tasks/`.
- **AI Behavior System**: Dijkstra NavMesh waypoint graph pathfinding with role-based decision trees for tasks, stealth kills, body reports, sabotages, and voting in `app/page.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 14 Skeld Rooms Layout | Cafeteria, Weapons, O2, Nav, Shields, Comms, Storage, Admin, Electrical, Lower/Upper Engine, Reactor, Security, MedBay | M1 | Survey / R1 |
| 2 | Collision Detection System | Circle-vs-box continuous sub-stepping collision with structural wall and obstacle colliders | M1 | Survey / R1 |
| 3 | 2D Raycasting Line-of-Sight | Dynamic raycast shadow occlusion and fog-of-war with Crewmate vs Impostor radius | M1 | Survey / R1 |
| 4 | 4 Vent Networks | Bidirectional vent hopping between linked stations restricted to Impostors | M1 | Survey / R1 |
| 5 | Admin Radar Table | Real-time room occupancy counters without player identity (blacked out during Comms sabotage) | M1 | Survey / R1 |
| 6 | Security CCTV Network | 4-channel security camera feed with live player tracking & flashing red surveillance LED | M1 | Survey / R1 |
| 7 | Role Assignment & Reveal | "SHHH!" cutscene and Crewmate / Impostor role assignment | M2 | Survey / R2 |
| 8 | Impostor Kill System | Kill cooldown, range validation, LOS validation, blood screen flash, corpse spawning & 4 kill animations | M2 | Survey / R2 |
| 9 | Dead Body Reporting | Proximity & LOS detection of corpses with instant emergency conference trigger | M2 | Survey / R2 |
| 10 | Emergency Meeting Button | Cafeteria table button with per-player limit and sabotage blocking | M2 | Survey / R2 |
| 11 | Discussion & Voting Conference | Discussion timer, voting timer, player chat, skip vote, vote tally, tie handling & anonymous voting | M2 | Survey / R2 |
| 12 | Cinematic Ejection Cutscene | Space ejection sequence with typewriter role reveal and `confirmEjects` toggle | M2 | Survey / R2 |
| 13 | Ghost Mode System | Translucent ghost entity, collision bypass (wall floating), ghost tasks, ghost visibility rules | M2 | Survey / R2 |
| 14 | Win Condition Evaluator | Instant win evaluation: tasks complete, all impostors ejected, impostor parity, sabotage timeout | M2 | Survey / R2 |
| 15 | Fix Wiring Task | 4-color wire drag puzzle across 3 randomized ship stations | M3 | Survey / R3 |
| 16 | Swipe Card Task | Admin speed-validated ID card reader (Too Fast / Too Slow / Accepted) | M3 | Survey / R3 |
| 17 | Divert & Accept Power Task | 2-stage Electrical power distribution slider and room breaker switches | M3 | Survey / R3 |
| 18 | Clear Asteroids Task | 20-target Weapons dual-laser space cannon shooter | M3 | Survey / R3 |
| 19 | Medbay Scan Task | 10-second biometrics holographic body scanner with visual green beam | M3 | Survey / R3 |
| 20 | Download / Upload Data Task | 8s room terminal download + 8s Admin mainframe upload | M3 | Survey / R3 |
| 21 | Calibrate Distributor Task | 3-stage timing alignment ring minigame in Electrical | M3 | Survey / R3 |
| 22 | Clean O2 Filter Task | Drag-and-drop floating leaves into air suction chute | M3 | Survey / R3 |
| 23 | Align Engine Output Task | Upper & Lower engine crosshair alignment slider | M3 | Survey / R3 |
| 24 | Unlock Manifolds Task | 1-to-10 sequential keypad clicker in Reactor | M3 | Survey / R3 |
| 25 | Start Reactor Task | 5-stage Simon Says memory match pattern in Reactor | M3 | Survey / R3 |
| 26 | Inspect Sample Task | 60s incubation timer + red anomaly test tube selector | M3 | Survey / R3 |
| 27 | Fuel & Refuel Engines Task | Storage jerry can hold-to-pump + engine tank refueling | M3 | Survey / R3 |
| 28 | Prime Shields Task | 7-node hexagonal shield toggle puzzle | M3 | Survey / R3 |
| 29 | Empty Garbage Task | Spring-loaded trash ejection lever in Cafeteria/Storage | M3 | Survey / R3 |
| 30 | Chart Course Task | 4-waypoint navigation trajectory plotting in Navigation | M3 | Survey / R3 |
| 31 | Reactor Meltdown Sabotage | Critical 30s countdown requiring dual simultaneous hand scanners | M3 | Survey / R3 |
| 32 | Oxygen Depletion Sabotage | Critical 30s countdown requiring 5-digit code entry in Admin & O2 | M3 | Survey / R3 |
| 33 | Electrical Lights Sabotage | 5-switch circuit board, drastically cuts Crewmate vision until fixed | M3 | Survey / R3 |
| 34 | Communications Sabotage | Frequency dial tuner, hides task list, minimap, Admin Table & CCTV | M3 | Survey / R3 |
| 35 | Door Sabotages | 10-second blast door lockdown for Cafeteria, Medbay, Security, Electrical, Storage, Engines | M3 | Survey / R3 |
| 36 | Autonomous AI Bots | Dijkstra NavMesh pathfinding, task wander, stealth kills, corpse reporting, voting | M4 | Survey / R4 |
| 37 | WebRTC P2P Multiplayer | Host-authoritative mesh relay with room codes via Supabase Realtime / DataChannels | M4 | Survey / R4 |
| 38 | Lobby & Game Customizer | Custom host settings (speed, vision, cooldowns, times) and cosmetic customizer (colors, hats) | M4 | Survey / R4 |
| 39 | Procedural WebAudio SFX | 16 pure synthesized WebAudio sound effects (footsteps, alarms, kills, vents, chimes, UI) | M5 | Survey / R5 |
| 40 | Visual Polish & HUD Action Controls | Action buttons (Use, Report, Kill, Vent, Sabotage), mobile joystick/D-pad, keybindings (E, Q, R, V, Tab) | M5 | Survey / R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Map, Physics, Vision & Surveillance | Features 1-6 (14 rooms, collision boxes, 2D raycast FOV, vents, Admin table, Security CCTV) | none | DONE |
| 2 | Core Gameplay Loop & Roles | Features 7-14 (Roles, Kills, Dead Bodies, Meetings, Voting, Ejections, Ghost mode, Win checks) | M1 | DONE |
| 3 | Tasks & Sabotages Engine | Features 15-35 (All 16 tasks + 5 sabotages with resolution interfaces & failstates) | M1, M2 | DONE |
| 4 | AI Bots & WebRTC Multiplayer | Features 36-38 (Dijkstra NavMesh bots, P2P mesh relay, room codes, lobby customizer) | M1, M2, M3 | DONE |
| 5 | Sound FX, Polish & Verification | Features 39-40 (WebAudio synthesizer, HUD/controls, visual animations, build verification) | M1-M4 | DONE |
| Final | E2E Verification & Adversarial Hardening | Full E2E test suite execution, Tier 1-5 testing, forensic integrity audit | M1-M5 | DONE |

## Interface Contracts
### Map & Physics (`lib/map-data.ts`) ↔ Canvas Controller (`components/game/TheSkeldMap.ts`, `GameCanvas.tsx`)
- `resolvePlayerMovement(x, y, dx, dy, radius, isGhost, activeSabotage)` $\to$ `{ x, y, collides }`
- `hasLineOfSight(x1, y1, x2, y2, walls)` $\to$ `boolean`
- `getRoomAt(x, y)` $\to$ `RoomID | null`

### Gameplay State Machine (`app/page.tsx`) ↔ Tasks & Sabotages (`components/game/tasks/`)
- `onCompleteTask(taskId)` $\to$ advances global task progress and updates player task status
- `onTriggerSabotage(sabotageType)` $\to$ activates countdown timer and room locked doors
- `onResolveSabotage(sabotageType)` $\to$ clears crisis state and restores normal telemetry

### Networking (`lib/peer.ts`) ↔ Game State (`app/page.tsx`)
- `sendNetworkMessage(message: NetworkMessage)` $\to$ serializes and broadcasts packet to mesh
- `onNetworkMessage(senderId, message: NetworkMessage)` $\to$ host-authoritative event handling

### Sound Engine (`lib/sound.ts`) ↔ UI & Game Events
- `soundEngine.play(soundName: SoundEffect)` $\to$ procedural WebAudio oscillator synthesis

## Code Layout
- `types/game.ts`: TypeScript data models and network schemas
- `lib/map-data.ts`: Geometry, rooms, corridors, colliders, waypoints, and vents
- `lib/sound.ts`: Pure WebAudio procedural synthesizer
- `lib/peer.ts`: WebRTC / Supabase Realtime mesh networking
- `components/game/TheSkeldMap.ts`: 2D Canvas rendering engine
- `components/game/GameCanvas.tsx`: Game world controller & HUD actions
- `components/game/tasks/*`: 18 interactive task components
- `components/game/MeetingModal.tsx`: Discussion, chat & voting interface
- `components/game/EjectionScreen.tsx`: Cinematic space ejection cutscene
- `components/game/KillAnimationOverlay.tsx`: 4 kill screen animations
- `components/game/SabotageModal.tsx`: Impostor sabotage interface
- `components/game/AdminTableModal.tsx`: Room radar tracking
- `components/game/CCTVModal.tsx`: 4-camera security surveillance
- `components/Lobby.tsx`: Lobby configuration & astronaut customizer
- `app/page.tsx`: Top-level game lifecycle, AI bot loop & network coordinator
- `scripts/run-e2e-tests.ts`: Automated master test runner (448/448 pass)
