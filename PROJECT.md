# Nebula Deception - architecture

Nebula Deception is an independently branded, social-deduction spaceship game. It keeps familiar genre mechanics while using procedural code and original presentation instead of copied commercial assets.

## Runtime

- Next.js 16 App Router, React 19, TypeScript 5.9, and Tailwind CSS 4.
- A 2400 x 1600 canvas world rendered with a device-pixel-ratio-aware animation loop.
- Procedural Web Audio effects; no bundled third-party sound assets.
- PeerJS/WebRTC data channels for room-based multiplayer. No Supabase dependency or public relay is required.

## Authority and networking

The host owns the canonical match state. Clients send bounded gameplay intents; the host validates identity, phase, role, alive/dead state, cooldowns, distance, line of sight, collision, and message ordering before changing state.

Transport identity comes from the WebRTC connection, not from a client-supplied player ID. The transport applies message-size and rate limits, an allowlist for client-to-host message types, deterministic six-character room addressing, and per-recipient state projection. Private roles, votes, and task lists are only disclosed when the recipient is allowed to know them.

## World and simulation

- Circle-versus-AABB movement resolution with substeps and locked-door collision.
- Segment line-of-sight checks for visibility and action validation.
- A 20 px collision-aware A* grid with path smoothing for bots.
- Collision-safe spawn points, task consoles, emergency controls, and vent positions.
- Host-driven bots use the same collision and door constraints as human players.

## Interface

- Responsive lobby and in-game HUD for keyboard, pointer, and touch input.
- High-DPI canvas resizing through ResizeObserver and visualViewport updates.
- Blocking dialogs and focused form controls suspend world shortcuts.
- Communications disruption hides task telemetry and disables affected consoles.
- Reduced-motion behavior is respected where animated UI can be shortened.

## Important code

- `app/page.tsx`: match lifecycle, host authority, networking coordinator, and bots.
- `lib/game-rules.ts`: pure validation and sanitization helpers.
- `lib/peer.ts`: PeerJS/WebRTC transport, limits, and state projection.
- `lib/map-data.ts`: rooms, colliders, line of sight, movement, vents, and A*.
- `components/game/GameCanvas.tsx`: canvas controller, input, and HUD.
- `components/game/TheSkeldMap.ts`: procedural world renderer. The legacy filename is internal only.
- `components/game/tasks/`: interactive task components.
- `types/game.ts`: shared game and protocol types.
- `scripts/run-e2e-tests.ts`: historical filename for the in-process logic runner; it does not drive a browser.
- `scripts/test-host-security.ts`: adversarial host, projection, movement, and navigation regressions.

## Quality gates

The authoritative status comes from a fresh local run or the GitHub Actions workflow, not from a checked-in pass claim. Required commands and manual browser/network checks are documented in `TEST_READY.md` and `TEST_INFRA.md`.
