import { HATS, PLAYER_COLORS, type GameSettings, type HatType, type Player, type PlayerColor, type SabotageType } from '@/types/game';
import { MAP_HEIGHT, MAP_WIDTH, resolvePlayerMovement } from '@/lib/map-data';

export const PLAYER_NAME_MAX_LENGTH = 16;
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const KILL_RANGE = 110;
export const TASK_INTERACTION_RANGE = 75;
export const VENT_INTERACTION_RANGE = 85;
export const EMERGENCY_INTERACTION_RANGE = 140;
export const SECURITY_INTERACTION_RANGE = 75;
export const SABOTAGE_COOLDOWN_MS = 15_000;
export const DOOR_COOLDOWN_MS = 10_000;

const BASE_PLAYER_SPEED = 260;
const INITIAL_MOVEMENT_BUDGET_MS = 50;
const MAX_MOVEMENT_BURST_MS = 120;
const MOVEMENT_DISTANCE_GRACE = 8;

const PLAYER_COLOR_IDS = new Set<PlayerColor>(PLAYER_COLORS.map(({ id }) => id));
const HAT_IDS = new Set<HatType>(HATS.map(({ id }) => id));
const SABOTAGE_TYPES = new Set<SabotageType>(['lights', 'reactor', 'o2', 'comms']);

export interface MovementCheckpoint {
  at: number;
  x: number;
  y: number;
  distanceBudget?: number;
}

export interface MovementRequest {
  x: number;
  y: number;
  facing: 'left' | 'right';
  isMoving: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integerInRange(value: unknown, min: number, max: number): number | undefined {
  if (!finiteNumber(value)) return undefined;
  return Math.round(clamp(value, min, max));
}

function numberInRange(value: unknown, min: number, max: number): number | undefined {
  if (!finiteNumber(value)) return undefined;
  return clamp(value, min, max);
}

export function sanitizePlayerName(value: unknown, fallback = 'Crewmate'): string {
  if (typeof value !== 'string') return fallback;

  const normalized = value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return Array.from(normalized).slice(0, PLAYER_NAME_MAX_LENGTH).join('') || fallback;
}

export function sanitizeChatText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
    .trim();
  const text = Array.from(normalized).slice(0, CHAT_MESSAGE_MAX_LENGTH).join('');
  return text.length > 0 ? text : null;
}

export function isPlayerColor(value: unknown): value is PlayerColor {
  return typeof value === 'string' && PLAYER_COLOR_IDS.has(value as PlayerColor);
}

export function isHatType(value: unknown): value is HatType {
  return typeof value === 'string' && HAT_IDS.has(value as HatType);
}

export function isSabotageType(value: unknown): value is SabotageType {
  return typeof value === 'string' && SABOTAGE_TYPES.has(value as SabotageType);
}

export function sanitizeSettingsUpdate(value: unknown): Partial<GameSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: Partial<GameSettings> = {};

  const maxPlayers = integerInRange(input.maxPlayers, 4, 12);
  const impostorCount = integerInRange(input.impostorCount, 1, 3);
  const playerSpeed = numberInRange(input.playerSpeed, 0.5, 2);
  const killCooldown = integerInRange(input.killCooldown, 5, 60);
  const emergencyMeetings = integerInRange(input.emergencyMeetings, 0, 9);
  const discussionTime = integerInRange(input.discussionTime, 0, 120);
  const votingTime = integerInRange(input.votingTime, 15, 300);
  const totalTasksPerPlayer = integerInRange(input.totalTasksPerPlayer, 1, 10);
  const botCount = integerInRange(input.botCount, 0, 8);

  if (maxPlayers !== undefined) output.maxPlayers = maxPlayers;
  if (impostorCount !== undefined) output.impostorCount = impostorCount;
  if (playerSpeed !== undefined) output.playerSpeed = Math.round(playerSpeed * 4) / 4;
  if (killCooldown !== undefined) output.killCooldown = killCooldown;
  if (emergencyMeetings !== undefined) output.emergencyMeetings = emergencyMeetings;
  if (discussionTime !== undefined) output.discussionTime = discussionTime;
  if (votingTime !== undefined) output.votingTime = votingTime;
  if (totalTasksPerPlayer !== undefined) output.totalTasksPerPlayer = totalTasksPerPlayer;
  if (botCount !== undefined) output.botCount = botCount;
  if (typeof input.anonymousVotes === 'boolean') output.anonymousVotes = input.anonymousVotes;
  if (typeof input.confirmEjects === 'boolean') output.confirmEjects = input.confirmEjects;

  return output;
}

export function isWithinRange(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  range: number,
): boolean {
  return [fromX, fromY, toX, toY, range].every(Number.isFinite)
    && Math.hypot(fromX - toX, fromY - toY) <= range;
}

export function resolveAuthoritativeMovement(
  player: Player,
  request: MovementRequest,
  checkpoint: MovementCheckpoint | undefined,
  now: number,
  playerSpeed: number,
  lockedDoors?: Record<string, number>,
): {
  x: number;
  y: number;
  facing: 'left' | 'right';
  isMoving: boolean;
  checkpoint: MovementCheckpoint;
} | null {
  if (
    !finiteNumber(request.x)
    || !finiteNumber(request.y)
    || (request.facing !== 'left' && request.facing !== 'right')
    || typeof request.isMoving !== 'boolean'
    || !finiteNumber(now)
  ) {
    return null;
  }

  if (
    request.x < 60
    || request.x > MAP_WIDTH - 60
    || request.y < 280
    || request.y > MAP_HEIGHT - 120
  ) {
    return null;
  }

  const speedPerSecond = BASE_PLAYER_SPEED * clamp(playerSpeed, 0.5, 2);
  const initialBudget = speedPerSecond * (INITIAL_MOVEMENT_BUDGET_MS / 1_000)
    + MOVEMENT_DISTANCE_GRACE;
  const maximumBudget = speedPerSecond * (MAX_MOVEMENT_BURST_MS / 1_000)
    + MOVEMENT_DISTANCE_GRACE;
  const checkpointMatchesPlayer = checkpoint
    && Math.hypot(checkpoint.x - player.x, checkpoint.y - player.y) <= 1;
  const prior = checkpointMatchesPlayer
    ? checkpoint
    : {
        at: now,
        x: player.x,
        y: player.y,
        distanceBudget: initialBudget,
      };
  const elapsedMs = clamp(now - prior.at, 0, 1_000);
  const carriedBudget = finiteNumber(prior.distanceBudget)
    ? clamp(prior.distanceBudget, 0, maximumBudget)
    : initialBudget;
  const availableBudget = Math.min(
    maximumBudget,
    carriedBudget + speedPerSecond * (elapsedMs / 1_000),
  );
  const requestedDistance = Math.hypot(request.x - prior.x, request.y - prior.y);

  if (requestedDistance > availableBudget + Number.EPSILON) return null;

  const resolved = resolvePlayerMovement(
    player.x,
    player.y,
    request.x - player.x,
    request.y - player.y,
    16,
    !player.isAlive,
    lockedDoors,
  );
  const travelledDistance = Math.hypot(resolved.x - prior.x, resolved.y - prior.y);

  return {
    x: resolved.x,
    y: resolved.y,
    facing: request.facing,
    isMoving: request.isMoving && resolved.moved,
    checkpoint: {
      at: now,
      x: resolved.x,
      y: resolved.y,
      distanceBudget: Math.max(0, availableBudget - travelledDistance),
    },
  };
}
