# Orchestration Plan: Among Us ("The Skeld") High-Fidelity Replica

## Objective
Transform the repository into a complete, authentic, high-fidelity replica of Among Us ("The Skeld" map) with Next.js & TypeScript, adhering to all requirements R1-R5 and all acceptance criteria.

## Phase 0: Survey & Exploration (Current)
- Dispatch 3 Explorers:
  1. Explorer 1: Repo & Tech Stack Explorer (Inspect current Next.js setup, dependencies, scripts, canvas/rendering approach, package.json, directory structure).
  2. Explorer 2: Skeld Map, Geometry, Raycast Vision & Game Engine Spec Miner (Detailed specification of 14 rooms, collision bounding polygons, raycasting shadow occlusions, vent networks, admin table, security cameras).
  3. Explorer 3: Game Systems, Mini-Games, Sabotages, AI Bots, WebRTC & Audio Spec Miner (Tasks 12+, Sabotages 5, AI state machine, WebRTC signaling/mesh, WebAudio sound synthesis/effects, UI/HUD, customizer).

## Phase 1: Architecture & Decomposition (PROJECT.md)
- Synthesize explorer reports into `PROJECT.md` and `TEST_INFRA.md`.
- Define module boundaries, data structures, interface contracts, and code layout.
- Decompose into cohesive milestones.

## Phase 2: Dual-Track Execution
- **Track A (Implementation Track)**:
  - Milestone 1: Core Engine, Skeld Map Geometry, Raycasting Vision, Player Movement & Collisions, Vents & Surveillance
  - Milestone 2: Gameplay State Machine, Roles (Crewmate/Impostor), Kills, Reports, Emergency Meetings, Voting UI, Ejection Cutscenes & Ghost Mode
  - Milestone 3: Comprehensive 12+ Task Mini-Games & 5 Sabotages Engine
  - Milestone 4: Singleplayer AI Bots & WebRTC P2P Multiplayer Networking
  - Milestone 5: Visual FX, Cosmetics, HUD/Controls, WebAudio Sound Engine & Polish
- **Track B (E2E Testing Track)**:
  - Opaque-box E2E testing harness, Tier 1-4 test suite, `TEST_READY.md`.

## Phase 3: Integration, E2E Verification & Adversarial Hardening
- Run full test suite, fix any issues, conduct Tier 5 adversarial testing.

## Phase 4: Forensic Audit & Victory Report
- Run comprehensive forensic integrity audit.
- Report completion to Sentinel.
