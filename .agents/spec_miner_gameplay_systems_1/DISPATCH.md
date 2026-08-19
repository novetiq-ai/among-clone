## 2026-08-19T15:46:59Z

You are the Game Systems & Audio Spec Miner.
Your working directory is: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\spec_miner_gameplay_systems_1
Project root: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace
User request path: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md.
2. Formulate the comprehensive technical specification for all gameplay systems:
   - 12+ Task Mini-Games: Exact rules, UI interaction states, step sequence, failure/success validation, and visual design for:
     1. Fix Wiring (3 sequential locations, 4 colored wires)
     2. Swipe Card (Admin speed-sensitive swipe)
     3. Divert Power / Accept Power (Electrical slider -> destination switch)
     4. Clear Asteroids (Weapons 20 target clicker/crosshair)
     5. Medbay Scan (10s scan, visual animation, green halo)
     6. Download / Upload Data (Location download -> Admin upload)
     7. Calibrate Distributor (Electrical 3 spinning wheels timing)
     8. Clean O2 Filter (O2 leaf drag & drop into vent)
     9. Align Engine Output (Upper & Lower engine alignment slider)
     10. Unlock Manifolds (Reactor 1-10 sequence clicker)
     11. Start Reactor (Reactor Simon Says memory match)
     12. Inspect Sample (Medbay 60s incubation timer + red anomaly selector)
     13. Fuel Engines (Storage gas can fill -> Upper/Lower engine fill)
     14. Prime Shields (Shields hexagon toggle puzzle)
   - 5 Sabotages:
     1. Reactor Meltdown (two-person simultaneous hand scanner, 30s countdown, Impostor win on expiry)
     2. Oxygen Depletion (Admin + O2 5-digit code pads, 30s countdown, Impostor win on expiry)
     3. Electrical Lights (5 binary toggle switches to align, reduces Crewmate vision to near zero)
     4. Communications (frequency dial match / button reset, hides tasks, minimap, admin table & security feeds)
     5. Door Sabotages (10s locked doors for Cafeteria, Medbay, Security, Electrical, Storage, Upper Engine, Lower Engine)
   - Core Game Loop & State Machine:
     - Lobby setup & custom settings (speed, vision, kill cooldown, kill distance, discussion/voting time, emergency meetings count, confirm ejects, visual tasks)
     - Role Reveal & SHHH animation
     - Kill mechanics (range, cooldown, kill animations/overlays)
     - Dead body reporting & Emergency button
     - Discussion & Voting screen (chat, skip vote, vote tally, tie handling, anonymous voting option, ejection cutscene & role confirmation)
     - Ghost mode (wall passing, ghost tasks, ghost chat, spectator mode)
     - Win conditions (all tasks done, all impostors voted out, impostor kill parity, critical sabotage countdown expiry)
   - Singleplayer AI Bots:
     - Pathfinding / waypoint navigation on Skeld graph
     - Crewmate AI: task wander -> solve tasks -> inspect bodies -> report -> vote logic -> fix sabotages
     - Impostor AI: wander/stalk -> fake tasks -> isolate crewmates -> kill -> vent -> trigger sabotages -> vote deception
   - WebRTC Multiplayer:
     - Peer-to-peer data channel mesh / host-authoritative relay architecture with room codes (e.g. via public STUN servers + BroadcastChannel / signaling)
   - WebAudio Sound Synthesizer & Audio FX:
     - Pure WebAudio API procedural sound generator (or integrated SFX engine): footsteps, kill stinger, sabotage alarms, task completion chimes, vent whoosh, emergency meeting siren, button clicks, vote sounds.
3. Write your complete specification report to: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\spec_miner_gameplay_systems_1\handoff.md
Follow the Handoff Protocol. When finished, send a message to parent with summary and handoff path.
