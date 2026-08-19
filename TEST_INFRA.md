# E2E Test Infra: Among Us ("The Skeld") Web Replica

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived directly from `ORIGINAL_REQUEST.md` (R1-R5) and user acceptance criteria.
- **Methodology**: 4-Tier Hierarchical Testing:
  - **Tier 1 (Feature Coverage)**: Basic happy-path verification of all 40 inventoried features.
  - **Tier 2 (Boundary & Corner Cases)**: Testing limits (e.g. fast/slow card swipes, simultaneous sabotage triggers, out-of-sequence inputs, wall collision edges).
  - **Tier 3 (Cross-Feature Combinations)**: Interactions between features (e.g. Sabotages + Meetings, Kills + Vents + CCTV, Ghost Tasks + Win Evaluation).
  - **Tier 4 (Real-World Application Scenarios)**: Complete end-to-end game playthroughs simulating full matches with bots and humans.
  - **Tier 5 (Adversarial Coverage Hardening)**: White-box adversarial edge case audits.

## Test Architecture
- **E2E Test Runner**: Automated test script `scripts/run-e2e-tests.ts` / Next.js verification runner.
- **Verification Harness**: Validates compilation, layout correctness, physics boundaries, task validation rules, state machine transitions, AI bot behaviors, network packet integrity, and procedural audio synthesis graphs.
- **Pass/Fail Semantics**: All test suites must execute with 0 failures and exit code 0.

## Feature Inventory & Test Matrix
| # | Feature Area | Requirement | Tier 1 | Tier 2 | Tier 3 |
|---|--------------|-------------|:------:|:------:|:------:|
| 1 | 14 Skeld Rooms & Corridors | R1 | 5 | 5 | ✓ |
| 2 | Wall & Obstacle Collision Physics | R1 | 5 | 5 | ✓ |
| 3 | Raycasting Line-of-Sight & Vision Radius | R1 | 5 | 5 | ✓ |
| 4 | 4 Vent Networks | R1 | 5 | 5 | ✓ |
| 5 | Admin Radar Table | R1 | 5 | 5 | ✓ |
| 6 | Security CCTV 4-Camera System | R1 | 5 | 5 | ✓ |
| 7 | Role Assignment & "SHHH" Reveal | R2 | 5 | 5 | ✓ |
| 8 | Impostor Kill System & Cooldowns | R2 | 5 | 5 | ✓ |
| 9 | Dead Body Reporting & Trigger | R2 | 5 | 5 | ✓ |
| 10 | Emergency Meeting Button & Limits | R2 | 5 | 5 | ✓ |
| 11 | Meeting Discussion, Voting & Chat | R2 | 5 | 5 | ✓ |
| 12 | Cinematic Ejection Cutscene | R2 | 5 | 5 | ✓ |
| 13 | Ghost Mode Physics & Tasks | R2 | 5 | 5 | ✓ |
| 14 | Win Condition Evaluator | R2 | 5 | 5 | ✓ |
| 15 | Fix Wiring Task | R3 | 5 | 5 | ✓ |
| 16 | Swipe Card Task | R3 | 5 | 5 | ✓ |
| 17 | Divert & Accept Power Task | R3 | 5 | 5 | ✓ |
| 18 | Clear Asteroids Task | R3 | 5 | 5 | ✓ |
| 19 | Medbay Scan Task | R3 | 5 | 5 | ✓ |
| 20 | Download / Upload Data Task | R3 | 5 | 5 | ✓ |
| 21 | Calibrate Distributor Task | R3 | 5 | 5 | ✓ |
| 22 | Clean O2 Filter Task | R3 | 5 | 5 | ✓ |
| 23 | Align Engine Output Task | R3 | 5 | 5 | ✓ |
| 24 | Unlock Manifolds Task | R3 | 5 | 5 | ✓ |
| 25 | Start Reactor Task | R3 | 5 | 5 | ✓ |
| 26 | Inspect Sample Task | R3 | 5 | 5 | ✓ |
| 27 | Fuel & Refuel Engines Task | R3 | 5 | 5 | ✓ |
| 28 | Prime Shields Task | R3 | 5 | 5 | ✓ |
| 29 | Empty Garbage Task | R3 | 5 | 5 | ✓ |
| 30 | Chart Course Task | R3 | 5 | 5 | ✓ |
| 31 | Reactor Meltdown Sabotage | R3 | 5 | 5 | ✓ |
| 32 | Oxygen Depletion Sabotage | R3 | 5 | 5 | ✓ |
| 33 | Electrical Lights Sabotage | R3 | 5 | 5 | ✓ |
| 34 | Communications Sabotage | R3 | 5 | 5 | ✓ |
| 35 | Door Sabotages (10s lock) | R3 | 5 | 5 | ✓ |
| 36 | Autonomous AI Bots & NavMesh | R4 | 5 | 5 | ✓ |
| 37 | WebRTC P2P Multiplayer Mesh | R4 | 5 | 5 | ✓ |
| 38 | Lobby Settings & Cosmetics | R4 | 5 | 5 | ✓ |
| 39 | WebAudio Procedural Synthesizer | R5 | 5 | 5 | ✓ |
| 40 | HUD Controls & Visual Polish | R5 | 5 | 5 | ✓ |

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Singleplayer Crewmate Match | Lobby -> Role Intro -> Move -> 4 Tasks -> Dead Body Discovery -> Meeting Vote -> Eject Impostor -> Win | High |
| 2 | Full Singleplayer Impostor Match | Lobby -> Role Intro -> Stalk -> Stealth Kill -> Vent Hop -> Sabotage Reactor -> Timeout Win | High |
| 3 | Ghost Mode Task Completion Win | Crewmate killed early -> Floats through walls as Ghost -> Finishes all Ghost tasks -> Global Task Bar fills -> Crew Win | Medium |
| 4 | Emergency Meeting & Critical Sabotage Interaction | Impostor starts Reactor Sabotage -> Crew tries Emergency Button (blocked) -> 2 Crew fix Reactor -> Button unblocked -> Vote | High |
| 5 | WebRTC Multiplayer Synchronization Match | 4-Player P2P room -> Movement replication -> Real-time task progress bar sync -> Chat & voting sync | High |
| 6 | CCTV Surveillance & Witness Catch | Impostor kills in East Hallway under active red CCTV camera -> Guard on Security monitor watches -> Runs & reports | High |

## Coverage Thresholds
- **Tier 1**: $\ge$ 5 test cases per feature (200 test cases)
- **Tier 2**: $\ge$ 5 boundary cases per feature (200 test cases)
- **Tier 3**: Pairwise interaction tests covering major cross-feature flows (40 test cases)
- **Tier 4**: $\ge$ 6 full-lifecycle application scenario simulations
- **Total Suite**: 446+ comprehensive test cases
