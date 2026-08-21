# Release verification

This file is a verification checklist, not a permanent pass certificate. The current result is the latest successful CI run or a complete local run of the commands below.

## Required automated gates

Run from the repository root:

```bash
npm ci
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
npm audit --omit=dev
```

`npm run test:logic` runs deterministic in-process logic suites, while `npm run test:security` exercises adversarial host, state-projection, movement-budget, and navigation regressions. `npm test` runs both. These checks do not drive a browser and are not network end-to-end tests.

## Required browser checks

- Create a room, configure it, add bots, start a match, and return to the lobby.
- Join the same six-character room code from a second browser context.
- Verify movement, task completion, meetings, chat, voting, ejection, sabotage, vents, kills, reports, ghosts, and both win paths.
- Check desktop and 320 px, 375 px, and 768 px viewport widths.
- Check keyboard focus, touch controls, pointer cancellation, canvas resizing, high-DPI rendering, and reduced motion.
- Confirm there are no uncaught browser errors or hydration warnings.
- Confirm clients never receive hidden roles, hidden votes, or another player's private task list.
- Confirm malformed, duplicated, unauthorized, and implausibly fast client messages are rejected by the host.

See `TEST_INFRA.md` for the full verification strategy. Do not label a release ready unless every applicable item has fresh evidence.
