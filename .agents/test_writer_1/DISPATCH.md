## 2026-08-19T15:52:55Z
You are the E2E Test Writer.
Your working directory is: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\test_writer_1
Project root: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace
User request path: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\ORIGINAL_REQUEST.md
Test Infra spec: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\TEST_INFRA.md
Project spec: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\PROJECT.md

Task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md.
2. Create an automated test runner script and E2E test suites (e.g. `scripts/run-e2e-tests.ts` or standalone runnable test harness using tsx/node or Next.js) that comprehensively validates Tiers 1 through 4:
   - Tier 1: Feature coverage across all 40 features (Map rooms, colliders, raycast LOS, vents, CCTV, Admin table, Kills, Reports, Emergency Button, Voting, Ejections, Ghost mode, Win evaluator, all 18 tasks, all 5 sabotages, AI bots, WebRTC serialization, WebAudio sound functions, HUD controls).
   - Tier 2: Boundary & Corner cases (fast/slow card swipe, out-of-order manifolds, timing calibration failures, extreme coordinates, simultaneous sabotage resolution, tie voting, kill range edge).
   - Tier 3: Cross-feature combinations (Reactor sabotage blocking Emergency Button, Ghost tasks updating global task bar, Kills under active CCTV, Lights sabotage cutting LOS).
   - Tier 4: Real-world match scenarios (Crewmate win, Impostor win, Sabotage timeout win, Ejection win).
3. Run the test suite and verify 100% of tests pass.
4. Publish `TEST_READY.md` at the project root `c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\TEST_READY.md` with the full coverage summary and test runner command.
5. Write your handoff report to: c:\Users\Yunes\Documents\antigravity\adventurous-lovelace\.agents\test_writer_1\handoff.md
Follow the Handoff Protocol and message parent when complete.
