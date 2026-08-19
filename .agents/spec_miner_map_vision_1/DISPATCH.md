## 2026-08-19T15:47:00Z

**From**: parent (8a5c986b-b1aa-4caa-b8de-43ee8ccf309a)
**Role**: Map, Geometry & Vision Spec Miner
**Working directory**: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\spec_miner_map_vision_1
**Project root**: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace
**User request path**: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\ORIGINAL_REQUEST.md

**Task**:
1. Read ORIGINAL_REQUEST.md.
2. Formulate the comprehensive mathematical and architectural specification for "The Skeld" map in Among Us:
   - Complete layout of all 14 canonical rooms: Cafeteria, Weapons, O2, Navigation, Shields, Communications, Storage, Admin, Electrical, Lower Engine, Upper Engine, Reactor, Security, Medbay, plus all connecting hallways.
   - Coordinate system, map scale, room bounding boxes, obstacle definitions (tables, consoles, reactor core, engine blocks, medbay scanner, etc.), and wall polygon collision segments.
   - 2D Raycasting Field-of-View (FOV) / Line-of-Sight shadow occlusion engine: algorithm details (radial raycasting to wall segment endpoints, angle sorting, visibility polygon generation, fog of war, crewmate vs impostor radius differences, lights sabotage visibility reduction).
   - 4 Vent Networks specification (interlinked vent pairs/triplets: Reactor-UpperEngine-LowerEngine-Medbay-Security vs Cafeteria-Admin-Hallway vs Navigation-Shields-Weapons etc., canonical connections, enter/exit/hop mechanics).
   - Admin Table specification: real-time room player tracking (room occupancy counters without player identity, comms sabotage blackout).
   - Security CCTV System specification: 4 camera locations (West hallway, East hallway, Medbay-Security hallway, Admin hallway), cycling camera monitor UI, blinking red camera LED indicator when security monitor is active.
3. Write your complete specification report to: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\spec_miner_map_vision_1\handoff.md
Follow the Handoff Protocol. When finished, send a message to parent with summary and handoff path.
