# Original User Request

## Initial Request — 2026-08-19T15:45:46Z

Transform the Next.js / TypeScript repository into a complete, authentic, high-fidelity replica of Among Us ("The Skeld" map), featuring exact room geometry, shadows/line-of-sight vision cones, crewmate & impostor roles, all authentic task mini-games, sabotages, meeting voting/ejections, sound effects, full WebRTC multiplayer with lobby room codes, and intelligent AI bots for singleplayer practice.

Working directory: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace
Integrity mode: development

## Requirements

### R1. Authentic Skeld Map & Vision System
- Faithful reproduction of The Skeld layout including all 14 rooms (Cafeteria, Weapons, O2, Navigation, Shields, Communications, Storage, Admin, Electrical, Lower Engine, Upper Engine, Reactor, Security, Medbay) and hallways.
- Dynamic 2D raycasting line-of-sight vision system with realistic shadow occlusions around walls, tables, and obstacles. Impostor vision vs. Crewmate vision radius modifiers.
- Complete collision detection against all room walls, furniture, and objects.
- Vents network with bidirectional traversal between linked rooms (Reactor, Medbay, Electrical, Admin, Cafeteria, Navigation, Shields, Weapons) restricted to Impostors.
- Functional Admin Table (showing player counts in rooms without identities) and Security CCTV Monitors (cycling real-time camera feeds across 4 hallway locations with flashing red camera lights when in use).

### R2. Core Gameplay Mechanics, Roles & Elimination
- Crewmate objective: Complete all assigned tasks or discover and vote out all Impostors.
- Impostor objective: Eliminate Crewmates until Impostors equal or outnumber Crewmates, or trigger an unresolved critical sabotage (Reactor/O2).
- Kill cooldown timer, kill range checks, and authentic kill animation / kill screen overlays.
- Ghost mode upon death/ejection: ghosts can float through walls, complete remaining tasks (if crewmate), or sabotage/spectate, while invisible to living players.
- Dead body reporting & Emergency Button mechanics leading to the Discussion & Voting meeting screen with individual voting, skip voting, voting timer, player chat, voting result reveals, and ejection cutscenes (confirming or concealing ejectee role based on settings).

### R3. Comprehensive Task Mini-Games & Sabotages
- Full set of interactive Skeld mini-games with authentic visual puzzles, audio feedback, and progress updates:
  - Fix Wiring (4 matching colored wire connections across 3 randomized steps)
  - Swipe Card (Admin card swipe with Too Fast / Too Slow / Accepted speed validation)
  - Divert Power / Accept Diverted Power (Electrical slider to designated room switch)
  - Clear Asteroids (Weapons targeting mini-game with score count)
  - Medbay Scan (Visual green holographic scanner with 10s timer and optional visual effects)
  - Download / Upload Data (Progress bar transfer across cafeteria, weapons, shields, comms, nav to admin)
  - Calibrate Distributor, Clean O2 Filter, Align Engine Output, Unlock Manifolds, Start Reactor, Inspect Sample, Fuel Engines, and Prime Shields.
- Full sabotage system:
  - Critical Sabotages: Reactor Meltdown (two-person simultaneous hand scanner) and Oxygen Depletion (two code pads in Admin and O2) with countdown timers leading to Impostor victory on expiry.
  - Tactical Sabotages: Electrical Lights (drastically reduces Crewmate vision until 5 switches are aligned), Communications (disables task list, minimap, and security cameras), and Door Sabotages (locks designated room doors for 10 seconds).

### R4. Multiplayer, AI Bots & Lobby Customization
- Seamless WebRTC peer-to-peer multiplayer using room codes for private/public lobbies.
- Intelligent AI Bots capable of navigating waypoints across the map, doing tasks, reporting bodies, calling emergency meetings, voting in chat, and killing/venting/sabotaging when assigned as Impostor.
- Host customizable game settings: Player speed, Crewmate vision, Impostor vision, Kill cooldown, Kill distance, Discussion time, Voting time, Emergency meetings per player, Confirm ejects toggle, and Visual tasks toggle.
- Astronaut cosmetic customizer (Color palette, hats/skins, name tag).

### R5. Visual Polish, Sound FX & User Experience
- Authentic Among Us visual aesthetics, player animations (walk cycle, idle, kill, ghost hover), HUD buttons (Use, Report, Kill, Vent, Sabotage with hotkeys), and full-screen event animations (SHHH intro screen, Role Reveal, Emergency Meeting alert, Body Reported alert, Victory/Defeat screen).
- Comprehensive WebAudio / SFX sound engine for all interactions: footsteps, task success/fail beeps, alarm klaxons, kill stingers, vent whoosh, meeting gavel/sirens, and ambient hums.

## Acceptance Criteria

### Map, Navigation & Vision
- [ ] The Skeld map contains all 14 canonical rooms with correct boundary collision polygons and hallway interconnects.
- [ ] Raycasting dynamic shadow engine occludes players and objects behind walls and closed doors according to player vision radius.
- [ ] Admin table correctly computes real-time player counts per room; Security cameras correctly display live camera views with blinking red camera indicator.
- [ ] Impostors can enter, navigate between linked nodes, and exit all 4 distinct vent networks.

### Tasks & Sabotages
- [ ] Minimum 12 distinct functional task mini-games with interactive UI, validation logic, and shared task bar progression.
- [ ] All 5 sabotages (Reactor, O2, Lights, Comms, Doors) work with authentic resolution interactions and countdown fail-states.

### Game Loop & AI Bots
- [ ] Complete game lifecycle: Lobby -> Role Assignment ("Shhh" / Role Intro) -> Gameplay -> Dead Body / Emergency Meeting -> Voting & Chat -> Ejection Cutscene -> Win/Loss Screen -> Return to Lobby.
- [ ] AI Bots simulate realistic crewmate and impostor behaviors, allowing a full singleplayer test game with 4-10 players.
- [ ] WebRTC peer-to-peer multiplayer synchronizes player positions, states, tasks, sabotages, and meetings without desync.

### Audio & UI Polish
- [ ] UI HUD provides responsive action buttons (Use/Kill/Report/Vent/Sabotage) with touch/joystick and keyboard shortcuts (E, Q, R, V, Tab).
- [ ] Sound engine triggers authentic audio feedback for movement, UI clicks, task completions, alarms, kills, and meeting transitions.
- [ ] Application builds with `npm run build` and runs cleanly without runtime console errors or TypeScript compilation issues.
