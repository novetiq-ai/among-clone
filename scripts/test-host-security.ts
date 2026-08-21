import assert from 'node:assert/strict';

import {
  CHAT_MESSAGE_MAX_LENGTH,
  KILL_RANGE,
  isHatType,
  isPlayerColor,
  isSabotageType,
  isWithinRange,
  resolveAuthoritativeMovement,
  sanitizeChatText,
  sanitizePlayerName,
  sanitizeSettingsUpdate,
  type MovementCheckpoint,
} from '../lib/game-rules';
import {
  ALL_TASKS,
  SPAWN_POSITION,
  checkCollision,
  findBotPath,
} from '../lib/map-data';
import { projectGameStateForPlayer } from '../lib/peer';
import { DEFAULT_SETTINGS, type GameState, type Player } from '../types/game';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Nova',
    color: 'red',
    isHost: false,
    isReady: true,
    role: 'crewmate',
    isAlive: true,
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
    facing: 'right',
    isMoving: false,
    assignedTasks: [],
    completedTasks: [],
    ...overrides,
  };
}

assert.equal(sanitizePlayerName('  Nova\u0000   Prime  '), 'Nova Prime');
assert.equal(sanitizePlayerName(''), 'Crewmate');
assert.equal(Array.from(sanitizePlayerName('12345678901234567890')).length, 16);

assert.equal(sanitizeChatText('  Hallo Schiff!  '), 'Hallo Schiff!');
assert.equal(sanitizeChatText('\u0000\u0001'), null);
assert.equal(
  Array.from(sanitizeChatText('x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 20)) ?? '').length,
  CHAT_MESSAGE_MAX_LENGTH,
);

assert.equal(isPlayerColor('cyan'), true);
assert.equal(isPlayerColor('transparent'), false);
assert.equal(isHatType('crown'), true);
assert.equal(isHatType('__proto__'), false);
assert.equal(isSabotageType('reactor'), true);
assert.equal(isSabotageType('teleport'), false);

assert.deepEqual(
  sanitizeSettingsUpdate({
    maxPlayers: 99,
    impostorCount: -5,
    playerSpeed: 9,
    killCooldown: -1,
    discussionTime: 999,
    anonymousVotes: 'yes',
    injected: 'ignored',
  }),
  {
    maxPlayers: 12,
    impostorCount: 1,
    playerSpeed: 2,
    killCooldown: 5,
    discussionTime: 120,
  },
);

assert.equal(isWithinRange(0, 0, KILL_RANGE, 0, KILL_RANGE), true);
assert.equal(isWithinRange(0, 0, KILL_RANGE + 0.01, 0, KILL_RANGE), false);
assert.equal(isWithinRange(0, 0, Number.NaN, 0, KILL_RANGE), false);

const player = makePlayer();
const now = 10_000;
const validMove = resolveAuthoritativeMovement(
  player,
  {
    x: player.x + 10,
    y: player.y,
    facing: 'right',
    isMoving: true,
  },
  { at: now - 50, x: player.x, y: player.y },
  now,
  1.25,
);
assert.ok(validMove, 'A normal 10px movement should be accepted.');

assert.equal(
  resolveAuthoritativeMovement(
    player,
    {
      x: player.x + 500,
      y: player.y,
      facing: 'right',
      isMoving: true,
    },
    { at: now - 50, x: player.x, y: player.y },
    now,
    1.25,
  ),
  null,
  'A one-packet teleport must be rejected.',
);

assert.equal(
  resolveAuthoritativeMovement(
    player,
    {
      x: Number.NaN,
      y: player.y,
      facing: 'right',
      isMoving: true,
    },
    undefined,
    now,
    1.25,
  ),
  null,
  'Non-finite coordinates must be rejected.',
);

let burstPlayer = makePlayer({ isAlive: false });
let burstCheckpoint: MovementCheckpoint | undefined;
const burstStartX = burstPlayer.x;

for (let packet = 0; packet < 90; packet += 1) {
  const packetTime = 20_000 + Math.floor((packet * 1_000) / 90);
  const movement = resolveAuthoritativeMovement(
    burstPlayer,
    {
      x: burstPlayer.x + 10,
      y: burstPlayer.y,
      facing: 'right',
      isMoving: true,
    },
    burstCheckpoint,
    packetTime,
    1.25,
  );
  if (!movement) continue;

  const { checkpoint, ...acceptedMovement } = movement;
  burstCheckpoint = checkpoint;
  burstPlayer = {
    ...burstPlayer,
    ...acceptedMovement,
  };
}

const burstDistance = burstPlayer.x - burstStartX;
assert.ok(
  burstDistance <= 350,
  `A 90 packets/s burst moved ${burstDistance}px, exceeding the one-second speed budget.`,
);
assert.ok(
  burstDistance >= 250,
  `The cumulative limiter was too strict for legitimate movement (${burstDistance}px).`,
);

const secretState: GameState = {
  roomCode: 'ABCDEF',
  phase: 'playing',
  players: {
    crew: makePlayer({
      id: 'crew',
      role: 'crewmate',
      assignedTasks: ['cafeteria_wires'],
      votedFor: 'impostor',
    }),
    impostor: makePlayer({
      id: 'impostor',
      color: 'blue',
      role: 'impostor',
      assignedTasks: ['fake_task'],
      killAvailableAt: 42_000,
      inVent: true,
      ventId: 'cafeteria_vent',
      votedFor: 'crew',
    }),
  },
  deadBodies: [],
  settings: { ...DEFAULT_SETTINGS, anonymousVotes: true },
};

const crewProjection = projectGameStateForPlayer(secretState, 'crew');
assert.equal(crewProjection.players.impostor.role, 'unassigned');
assert.equal(crewProjection.players.impostor.killAvailableAt, undefined);
assert.equal(crewProjection.players.impostor.killCooldown, undefined);
assert.equal(crewProjection.players.impostor.ventId, undefined);
assert.deepEqual(crewProjection.players.impostor.assignedTasks, []);
assert.deepEqual(crewProjection.players.crew.assignedTasks, ['cafeteria_wires']);

const impostorProjection = projectGameStateForPlayer(secretState, 'impostor');
assert.equal(impostorProjection.players.impostor.role, 'impostor');
assert.equal(impostorProjection.players.impostor.killAvailableAt, 42_000);
assert.equal(impostorProjection.players.impostor.ventId, 'cafeteria_vent');

const votingProjection = projectGameStateForPlayer(
  { ...secretState, phase: 'meeting', meetingPhase: 'voting' },
  'crew',
);
assert.equal(votingProjection.players.crew.votedFor, 'impostor');
assert.equal(votingProjection.players.impostor.votedFor, null);

for (const task of ALL_TASKS) {
  const path = findBotPath(
    SPAWN_POSITION.x,
    SPAWN_POSITION.y,
    task.x,
    task.y,
  );
  assert.ok(path.length > 0, `No bot path to task ${task.id}.`);

  let previous = SPAWN_POSITION;
  for (const waypoint of path) {
    assert.equal(
      checkCollision(waypoint.x, waypoint.y, 16),
      false,
      `Bot path ${task.id} contains a 16px-colliding waypoint ${waypoint.id}.`,
    );

    const distance = Math.hypot(waypoint.x - previous.x, waypoint.y - previous.y);
    const samples = Math.max(1, Math.ceil(distance / 4));
    for (let sample = 0; sample <= samples; sample += 1) {
      const progress = sample / samples;
      assert.equal(
        checkCollision(
          previous.x + (waypoint.x - previous.x) * progress,
          previous.y + (waypoint.y - previous.y) * progress,
          16,
        ),
        false,
        `Bot path ${task.id} crosses a wall before ${waypoint.id}.`,
      );
    }
    previous = waypoint;
  }
}

console.log('Host, projection, and navigation security checks passed.');
