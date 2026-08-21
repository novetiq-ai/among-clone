# Nebula Deception

Nebula Deception is a browser-based social-deduction game for private groups. It uses an original procedural presentation, a host-authoritative game loop, AI crew members and direct WebRTC data connections.

This repository does not contain copied game art, music or binary assets. Names and presentation should remain distinct from third-party commercial games.

## Requirements

- Node.js 20.9 through 25
- npm 11

## Run locally

```bash
npm ci
npm run dev
```

Open the printed local URL. One player creates a six-character room code; other players join with that code. The public PeerJS service is used only for signalling, while game messages use reliable WebRTC DataConnections.

## Controls

- WASD or arrow keys: move
- E or Space: use a nearby station
- R: report a body
- Q: impostor action
- V: vent
- Tab: map
- Escape: close the active overlay
- Touch devices: virtual joystick and HUD actions

Keyboard shortcuts are ignored while typing and while blocking overlays are open.

## Architecture

- Next.js 16, React 19 and TypeScript 5.9
- Canvas ship renderer with collision and line-of-sight geometry
- Host-authoritative validation in `app/page.tsx` and `lib/game-rules.ts`
- PeerJS/WebRTC transport in `lib/peer.ts`
- Recipient-specific state projection for secret roles and tasks
- Collider- and locked-door-aware A* bot navigation
- Procedural Web Audio effects and React task minigames

A six-character room code is not an account or access-control system. Share it only with intended players. The host remains authoritative and should be run by a trusted participant.

## Verification

```bash
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

`npm run check` runs the first four checks in sequence. GitHub Actions runs the complete gate, including the production dependency audit, for pushes and pull requests.

The 448-case suite is an in-process logic and state-transition suite. `npm test` also runs adversarial host, state-projection, movement-budget, and bot-navigation regressions. These checks are not a substitute for browser, real-network or multi-device testing; those are separate release checks documented in `TEST_INFRA.md`.

## Repository policy

No commit, branch push or pull request is created automatically by the repair workflow. Review the working-tree diff and test evidence before publishing.
