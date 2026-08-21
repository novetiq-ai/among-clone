# Verification strategy

Verification is split into deterministic code checks and real browser/network checks. These categories must not be conflated.

## Automated gates

Run from the repository root:

```bash
npm ci
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
npm audit --omit=dev
```

`npm run test:logic` executes the suites under `tests/e2e/` in-process. The directory name is historical. The runner covers data contracts, geometry, movement, collision, line of sight, tasks, win rules, cross-system combinations, and simulated scenarios. It dynamically prints the real assertion count and exits nonzero on a failure. `npm run test:security` adds adversarial host, state-projection, movement-budget, and 16-pixel navigation regressions; `npm test` runs both.

These suites are useful logic tests, but they do not launch a browser, establish real PeerJS connections, or prove a full match end to end.

## Browser matrix

At minimum, verify these viewport widths:

- 320 px and 375 px phone layouts.
- 768 px tablet layout.
- A desktop viewport at 1280 x 720 or larger.
- A high-DPI viewport with devicePixelRatio greater than 1.

For every viewport, check menu, create/join forms, lobby customization, role reveal, gameplay HUD, meetings, task dialogs, sabotage dialogs, ejection, game-over, and return-to-lobby. Inspect browser console output for exceptions, hydration failures, missing assets, and accessibility warnings.

## Multiplayer matrix

Use two isolated browser contexts and a newly generated six-character room code.

1. Create a room and join from the second context.
2. Confirm joins are idempotent and a reconnect cannot create duplicate players.
3. Confirm host settings and profile updates are sanitized.
4. Start a match and confirm late or over-capacity joins are rejected.
5. Verify movement, task progress, chat, meetings, voting, ejection, and play-again synchronization.
6. Verify dead-only chat visibility and absence of duplicate chat messages.
7. Verify a client cannot spoof another identity or force host-only message types.
8. Verify hidden roles, votes, and private task lists are absent from unauthorized state snapshots.
9. Send malformed, oversized, repeated, out-of-phase, and implausibly fast actions and confirm they do not mutate canonical state.
10. Disconnect and reconnect both host and client deliberately; confirm the UI recovers or fails clearly.

## Gameplay regression paths

Exercise at least one full crewmate path and one full impostor path, including tasks, kills, reporting, emergency meeting, voting, ejection, ghost behavior, vents, each sabotage type, locked doors, and both victory conditions. Also verify that bots never cross walls or locked doors.

## Evidence

GitHub Actions is the shared automated gate. Manual browser/network evidence belongs in the release or pull-request notes with date, browser version, viewport, contexts used, and observed result. Do not preserve a timeless "100% pass" certificate in the repository.
