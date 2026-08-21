'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GameState,
  Player,
  PlayerColor,
  PLAYER_COLORS,
  DEFAULT_SETTINGS,
  GameSettings,
  ChatMessage,
  NetworkMessage,
  DeadBody,
  EjectionData,
  REPORT_RANGE,
} from '@/types/game';
import {
  ALL_TASKS,
  EMERGENCY_BUTTON_POS,
  LOCKED_DOOR_WALLS,
  SPAWN_POSITION,
  getSpawnPosition,
  findBotPath,
  resolvePlayerMovement,
  VENTS,
  type Waypoint,
} from '@/lib/map-data';
import {
  DOOR_COOLDOWN_MS,
  EMERGENCY_INTERACTION_RANGE,
  KILL_RANGE,
  SABOTAGE_COOLDOWN_MS,
  SECURITY_INTERACTION_RANGE,
  TASK_INTERACTION_RANGE,
  VENT_INTERACTION_RANGE,
  isHatType,
  isPlayerColor,
  isSabotageType,
  isWithinRange,
  resolveAuthoritativeMovement,
  sanitizeChatText,
  sanitizePlayerName,
  sanitizeSettingsUpdate,
  type MovementCheckpoint,
} from '@/lib/game-rules';
import { NetworkManager, generateRoomCode } from '@/lib/peer';
import { sound, playSabotageAlarm, playDoorLock } from '@/lib/sound';
import { MainMenu } from '@/components/MainMenu';
import { Lobby } from '@/components/Lobby';
import { GameCanvas } from '@/components/game/GameCanvas';
import { MeetingModal } from '@/components/game/MeetingModal';
import { EjectionScreen } from '@/components/game/EjectionScreen';
import { GameOverModal } from '@/components/game/GameOverModal';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { SabotageType, ActiveSabotage, HatType, HATS } from '@/types/game';
import { hasLineOfSight } from '@/components/game/TheSkeldMap';

const SABOTAGE_FIX_RANGE = 120;
const SECURITY_DESK_POSITION = { x: 640, y: 760 };
const CHAT_HISTORY_LIMIT = 200;
const VALID_DOOR_ROOMS = new Set(Object.keys(LOCKED_DOOR_WALLS));

function normalizeDoorRoom(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  return VALID_DOOR_ROOMS.has(normalized) ? normalized : null;
}

function createChatMessageId(prefix: string): string {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function appendChatMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...messages, message].slice(-CHAT_HISTORY_LIMIT);
}


type SabotageFixPoint = {
  id: string;
  x: number;
  y: number;
  room?: 'O2' | 'Admin';
};

const SABOTAGE_FIX_POINTS: Record<SabotageType, SabotageFixPoint[]> = {
  lights: [{ id: 'lights_panel', x: 760, y: 1080 }],
  reactor: [
    { id: 'reactor_top', x: 100, y: 720 },
    { id: 'reactor_bottom', x: 100, y: 920 },
  ],
  o2: [
    { id: 'o2_room', x: 1520, y: 620, room: 'O2' },
    { id: 'admin_room', x: 1590, y: 820, room: 'Admin' },
  ],
  comms: [{ id: 'comms_radio', x: 1450, y: 1350 }],
};

function getSabotageFixPoint(type: SabotageType, x: number, y: number) {
  return SABOTAGE_FIX_POINTS[type].find((point) => (
    Math.hypot(x - point.x, y - point.y) <= SABOTAGE_FIX_RANGE
  ));
}

/**
 * Returns undefined for an invalid or duplicate repair attempt, the updated
 * sabotage for a partial repair, and null once the sabotage is fully resolved.
 */
function applySabotageFix(
  sabotage: ActiveSabotage,
  fixerId: string,
  fixerX: number,
  fixerY: number,
): ActiveSabotage | null | undefined {
  const fixPoint = getSabotageFixPoint(sabotage.type, fixerX, fixerY);
  if (!fixPoint) return undefined;

  if (sabotage.type === 'reactor') {
    const reactorHands = sabotage.reactorHands ?? [];
    const reactorStations = sabotage.reactorStations ?? [];
    if (
      reactorHands.includes(fixerId)
      || reactorStations.includes(fixPoint.id)
    ) {
      return undefined;
    }

    const nextHands = [...reactorHands, fixerId];
    const nextStations = [...reactorStations, fixPoint.id];
    if (nextStations.length >= (sabotage.requiredFixes ?? 2)) return null;

    return {
      ...sabotage,
      reactorHands: nextHands,
      reactorStations: nextStations,
      currentFixes: nextStations.length,
    };
  }

  if (sabotage.type === 'o2') {
    if (!fixPoint.room) return undefined;

    const o2FixedRooms = sabotage.o2FixedRooms ?? [];
    if (o2FixedRooms.includes(fixPoint.room)) return undefined;

    const nextRooms = [...o2FixedRooms, fixPoint.room];
    if (nextRooms.length >= (sabotage.requiredFixes ?? 2)) return null;

    return { ...sabotage, o2FixedRooms: nextRooms, currentFixes: nextRooms.length };
  }

  return null;
}

function getBotSabotageTarget(sabotage: ActiveSabotage, botId: string): SabotageFixPoint {
  const points = SABOTAGE_FIX_POINTS[sabotage.type];

  if (sabotage.type === 'o2') {
    return points.find((point) => !sabotage.o2FixedRooms?.includes(point.room!)) ?? points[0];
  }

  if (sabotage.type === 'reactor') {
    const availablePoints = points.filter(
      (point) => !sabotage.reactorStations?.includes(point.id),
    );
    const candidates = availablePoints.length > 0 ? availablePoints : points;
    const botNumber = [...botId].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return candidates[botNumber % candidates.length];
  }

  return points[0];
}

function AmongUsApp() {
  const searchParams = useSearchParams();
  const initialRoomQuery = searchParams.get('room') || '';

  const [inRoom, setInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [localPlayerId, setLocalPlayerId] = useState('');
  const localPlayerIdRef = useRef(localPlayerId);
  useEffect(() => {
    localPlayerIdRef.current = localPlayerId;
  }, [localPlayerId]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local Player Profile
  const [localPlayer, setLocalPlayer] = useState<Player>({
    id: '',
    name: 'Crewmate',
    color: 'red',
    isHost: false,
    isReady: false,
    role: 'unassigned',
    isAlive: true,
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
    facing: 'right',
    isMoving: false,
    assignedTasks: [],
    completedTasks: [],
  });

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    phase: 'lobby',
    roomCode: '',
    players: {},
    deadBodies: [],
    settings: { ...DEFAULT_SETTINGS },
    totalTasksCount: 0,
    completedTasksCount: 0,
    activeSabotage: null,
    isSecurityCamActive: false,
    securityCamViewers: [],
    lockedDoors: {},
    isEmergencyMeeting: false,
  });


  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Network & Timer Refs
  const networkRef = useRef<NetworkManager | null>(null);
  const meetingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sabotageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const botVoteTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const botTargetState = useRef<Record<string, {
    targetX: number;
    targetY: number;
    path: Waypoint[];
    pathIdx: number;
    pauseTicks: number;
    pathRetryTicks?: number;
    killCooldownTicks?: number;
  }>>({});
  const movementCheckpointsRef = useRef<Record<string, MovementCheckpoint>>({});
  const gameStateRef = useRef(gameState);
  const previousGamePhaseRef = useRef(gameState.phase);
  const updateGameState = useCallback(
    (updater: (previousState: GameState) => GameState) => {
      const previousState = gameStateRef.current;
      const nextState = updater(previousState);
      if (nextState !== previousState) {
        gameStateRef.current = nextState;
        setGameState(nextState);
      }
    },
    [],
  );


  useEffect(() => {
    const previousPhase = previousGamePhaseRef.current;
    const authoritativePlayer = localPlayerId ? gameState.players[localPlayerId] : undefined;
    gameStateRef.current = gameState;

    if (previousPhase !== gameState.phase || gameState.phase !== 'playing') {
      movementCheckpointsRef.current = {};
    }

    if (authoritativePlayer) {
      setLocalPlayer((current) => {
        const mayPreserveLiveMovement =
          previousPhase === 'playing'
          && gameState.phase === 'playing'
          && current.id === authoritativePlayer.id
          && current.isAlive === authoritativePlayer.isAlive
          && current.inVent === authoritativePlayer.inVent
          && current.ventId === authoritativePlayer.ventId;

        if (mayPreserveLiveMovement) {
          return {
            ...authoritativePlayer,
            x: current.x,
            y: current.y,
            facing: current.facing,
            isMoving: current.isMoving,
          };
        }

        return authoritativePlayer;
      });
    }

    previousGamePhaseRef.current = gameState.phase;
  }, [gameState, localPlayerId]);

  // Helper to check win conditions (Authoritative on Host)
  const checkWinConditions = useCallback((state: GameState): { winner?: 'crewmates' | 'impostors'; winReason?: string } => {
    // Only evaluate during active gameplay, meeting or ejection
    if (state.phase !== 'playing' && state.phase !== 'meeting' && state.phase !== 'ejection') {
      return {};
    }

    const playersList = Object.values(state.players);
    if (playersList.length === 0) return {};

    const alivePlayers = playersList.filter((p) => p.isAlive);
    const aliveImpostors = alivePlayers.filter((p) => p.role === 'impostor');
    const aliveCrewmates = alivePlayers.filter((p) => p.role === 'crewmate');

    // 1. All Impostors Eliminated -> Crewmates Win
    if (aliveImpostors.length === 0 && playersList.some((p) => p.role === 'impostor')) {
      return {
        winner: 'crewmates',
        winReason: 'Alle Impostors wurden eliminiert!',
      };
    }

    // 2. Impostors Equal or Outnumber Crewmates -> Impostors Win
    if (aliveImpostors.length > 0 && aliveImpostors.length >= aliveCrewmates.length) {
      return {
        winner: 'impostors',
        winReason: 'Die Impostors haben die Überhand gewonnen!',
      };
    }

    // 3. All Tasks Completed -> Crewmates Win
    if (state.totalTasksCount && state.totalTasksCount > 0 && (state.completedTasksCount || 0) >= state.totalTasksCount) {
      return {
        winner: 'crewmates',
        winReason: 'Alle Besatzungs-Aufgaben wurden erfolgreich abgeschlossen!',
      };
    }

    return {};
  }, []);

  // Host Message Processor
  const handleHostNetworkMessage = useCallback(
    (msg: NetworkMessage, senderId: string) => {
      const previousState = gameStateRef.current;
      const processMessage = (): GameState => {
        const prevState = previousState;
        let newState = { ...prevState };

        switch (msg.type) {
          case 'JOIN_REQUEST': {
            if (newState.phase !== 'lobby') {
              networkRef.current?.sendToPeer(senderId, {
                type: 'JOIN_REJECTED',
                reason: 'Das Spiel läuft bereits.',
              });
              return prevState;
            }

            const existingPlayer = newState.players[senderId];
            if (existingPlayer) {
              networkRef.current?.sendToPeer(senderId, {
                type: 'JOIN_ACCEPTED',
                playerId: senderId,
                gameState: newState,
              });
              return prevState;
            }

            const currentPlayers = Object.values(newState.players);
            if (currentPlayers.length >= newState.settings.maxPlayers) {
              networkRef.current?.sendToPeer(senderId, {
                type: 'JOIN_REJECTED',
                reason: 'Raum ist voll.',
              });
              return prevState;
            }

            const takenColors = new Set(currentPlayers.map((player) => player.color));
            const preferredColor = isPlayerColor(msg.preferredColor) ? msg.preferredColor : undefined;
            const assignedColor = preferredColor && !takenColors.has(preferredColor)
              ? preferredColor
              : PLAYER_COLORS.find(({ id }) => !takenColors.has(id))?.id;

            if (!assignedColor) {
              networkRef.current?.sendToPeer(senderId, {
                type: 'JOIN_REJECTED',
                reason: 'Keine Spielerfarbe ist mehr verfügbar.',
              });
              return prevState;
            }

            const newPlayer: Player = {
              id: senderId,
              name: sanitizePlayerName(msg.name),
              color: assignedColor,
              isHost: false,
              isReady: false,
              role: 'unassigned',
              isAlive: true,
              x: SPAWN_POSITION.x,
              y: SPAWN_POSITION.y,
              facing: 'right',
              isMoving: false,
              assignedTasks: [],
              completedTasks: [],
            };

            newState = {
              ...newState,
              players: {
                ...newState.players,
                [senderId]: newPlayer,
              },
            };

            networkRef.current?.sendToPeer(senderId, {
              type: 'JOIN_ACCEPTED',
              playerId: senderId,
              gameState: newState,
            });
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });

            const systemMessage: ChatMessage = {
              id: createChatMessageId('join'),
              senderId: 'system',
              senderName: 'System',
              senderColor: 'white',
              text: `${newPlayer.name} ist dem Raum beigetreten.`,
              timestamp: Date.now(),
              isSystem: true,
            };
            setChatMessages((messages) => appendChatMessage(messages, systemMessage));
            networkRef.current?.broadcast({ type: 'CHAT_MESSAGE', message: systemMessage });

            return newState;
          }


          case 'PLAYER_UPDATE_PROFILE': {
            if (newState.phase !== 'lobby') return prevState;
            const player = newState.players[senderId];
            if (!player) return prevState;

            const requestedColor = isPlayerColor(msg.color) ? msg.color : player.color;
            const colorTaken = Object.values(newState.players).some(
              (candidate) => candidate.id !== senderId && candidate.color === requestedColor,
            );
            const nextColor = colorTaken ? player.color : requestedColor;
            const nextHat = msg.hat === undefined
              ? player.hat
              : isHatType(msg.hat)
                ? msg.hat
                : player.hat;

            const updatedPlayer: Player = {
              ...player,
              name: msg.name === undefined
                ? player.name
                : sanitizePlayerName(msg.name, player.name),
              color: nextColor,
              hat: nextHat,
              isReady: player.isHost
                ? true
                : typeof msg.isReady === 'boolean'
                  ? msg.isReady
                  : player.isReady,
            };

            newState = {
              ...newState,
              players: {
                ...newState.players,
                [senderId]: updatedPlayer,
              },
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'UPDATE_SETTINGS': {
            if (
              newState.phase !== 'lobby'
              || senderId !== localPlayerIdRef.current
              || !newState.players[senderId]?.isHost
            ) {
              return prevState;
            }

            const settingsUpdate = sanitizeSettingsUpdate(msg.settings);
            if (Object.keys(settingsUpdate).length === 0) return prevState;

            const mergedSettings = {
              ...newState.settings,
              ...settingsUpdate,
            };
            mergedSettings.impostorCount = Math.min(
              mergedSettings.impostorCount,
              3,
              Math.max(1, Math.floor(mergedSettings.maxPlayers / 2)),
            );
            mergedSettings.botCount = Math.min(
              mergedSettings.botCount,
              Math.max(0, mergedSettings.maxPlayers - 1),
            );

            newState = {
              ...newState,
              settings: mergedSettings,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'CHAT_MESSAGE': {
            const sender = newState.players[senderId];
            const text = sanitizeChatText(msg.message?.text);
            if (!sender || !text) return prevState;

            const isDeadOnly = !sender.isAlive;
            const message: ChatMessage = {
              id: createChatMessageId('chat'),
              senderId: sender.id,
              senderName: sender.name,
              senderColor: sender.color,
              text,
              timestamp: Date.now(),
              isDeadOnly,
            };

            const hostPlayer = newState.players[localPlayerIdRef.current];
            if (!isDeadOnly || hostPlayer?.isAlive === false) {
              setChatMessages((messages) => appendChatMessage(messages, message));
            }

            if (isDeadOnly) {
              for (const recipient of Object.values(newState.players)) {
                if (
                  !recipient.isAlive
                  && !recipient.isBot
                  && recipient.id !== localPlayerIdRef.current
                ) {
                  networkRef.current?.sendToPeer(recipient.id, {
                    type: 'CHAT_MESSAGE',
                    message,
                  });
                }
              }
            } else {
              networkRef.current?.broadcast({ type: 'CHAT_MESSAGE', message });
            }

            return prevState;
          }


          case 'PLAYER_MOVE': {
            if (newState.phase !== 'playing' || msg.playerId !== senderId) return prevState;
            const player = newState.players[senderId];
            if (!player || player.inVent) return prevState;

            const now = Date.now();
            const validatedMovement = resolveAuthoritativeMovement(
              player,
              {
                x: msg.x,
                y: msg.y,
                facing: msg.facing,
                isMoving: msg.isMoving,
              },
              movementCheckpointsRef.current[senderId],
              now,
              newState.settings.playerSpeed,
              newState.lockedDoors,
            );
            if (!validatedMovement) return prevState;

            const {
              checkpoint: nextCheckpoint,
              ...resolvedMovement
            } = validatedMovement;
            movementCheckpointsRef.current[senderId] = nextCheckpoint;

            const updatedPlayer: Player = {
              ...player,
              ...resolvedMovement,
            };
            newState = {
              ...newState,
              players: {
                ...newState.players,
                [senderId]: updatedPlayer,
              },
            };

            networkRef.current?.broadcast({
              type: 'PLAYER_MOVE',
              playerId: senderId,
              x: updatedPlayer.x,
              y: updatedPlayer.y,
              facing: updatedPlayer.facing,
              isMoving: updatedPlayer.isMoving,
              inVent: updatedPlayer.inVent,
              ventId: updatedPlayer.ventId,
            });
            return newState;
          }


          case 'KILL_PLAYER': {
            if (
              newState.phase !== 'playing'
              || msg.killerId !== senderId
              || msg.targetId === senderId
            ) {
              return prevState;
            }

            const killer = newState.players[senderId];
            const victim = newState.players[msg.targetId];
            const now = Date.now();
            if (
              !killer
              || !killer.isAlive
              || killer.role !== 'impostor'
              || killer.inVent
              || !victim
              || !victim.isAlive
              || victim.role !== 'crewmate'
              || victim.inVent
              || (killer.killAvailableAt ?? 0) > now
              || !isWithinRange(killer.x, killer.y, victim.x, victim.y, KILL_RANGE)
              || !hasLineOfSight(killer.x, killer.y, victim.x, victim.y, newState.lockedDoors)
            ) {
              return prevState;
            }

            sound.playKillSound();
            const deadBody: DeadBody = {
              id: createChatMessageId('body'),
              playerId: victim.id,
              playerName: victim.name,
              color: victim.color,
              hat: victim.hat,
              x: victim.x,
              y: victim.y,
              reported: false,
            };

            const securityCamViewers = (newState.securityCamViewers ?? [])
              .filter((viewerId) => viewerId !== victim.id);
            newState = {
              ...newState,
              deadBodies: [...newState.deadBodies, deadBody],
              players: {
                ...newState.players,
                [killer.id]: {
                  ...killer,
                  killAvailableAt: now + newState.settings.killCooldown * 1_000,
                },
                [victim.id]: {
                  ...victim,
                  isAlive: false,
                  isMoving: false,
                  inVent: false,
                  ventId: undefined,
                },
              },
              securityCamViewers,
              isSecurityCamActive: securityCamViewers.length > 0,
            };

            const winCheck = checkWinConditions(newState);
            if (winCheck.winner) {
              newState = {
                ...newState,
                phase: 'game_over',
                winner: winCheck.winner,
                winReason: winCheck.winReason,
              };
            }

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'REPORT_BODY':
          case 'EMERGENCY_MEETING': {
            if (newState.phase !== 'playing' || msg.reporterId !== senderId) return prevState;
            const reporter = newState.players[senderId];
            if (!reporter || !reporter.isAlive || reporter.inVent) return prevState;

            if (msg.type === 'EMERGENCY_MEETING') {
              const meetingsLeft = reporter.emergencyMeetingsLeft
                ?? newState.settings.emergencyMeetings;
              const nearButton = isWithinRange(
                reporter.x,
                reporter.y,
                EMERGENCY_BUTTON_POS.x,
                EMERGENCY_BUTTON_POS.y,
                EMERGENCY_INTERACTION_RANGE,
              );
              if (
                meetingsLeft <= 0
                || newState.activeSabotage
                || !nearButton
                || !hasLineOfSight(
                  reporter.x,
                  reporter.y,
                  EMERGENCY_BUTTON_POS.x,
                  EMERGENCY_BUTTON_POS.y,
                  newState.lockedDoors,
                )
              ) {
                return prevState;
              }

              newState = {
                ...newState,
                players: {
                  ...newState.players,
                  [reporter.id]: {
                    ...reporter,
                    emergencyMeetingsLeft: meetingsLeft - 1,
                  },
                },
              };
            } else {
              const body = msg.bodyId
                ? newState.deadBodies.find((candidate) => candidate.id === msg.bodyId)
                : undefined;
              if (
                !body
                || body.reported
                || !isWithinRange(reporter.x, reporter.y, body.x, body.y, REPORT_RANGE)
                || !hasLineOfSight(
                  reporter.x,
                  reporter.y,
                  body.x,
                  body.y,
                  newState.lockedDoors,
                )
              ) {
                return prevState;
              }

              newState = {
                ...newState,
                deadBodies: newState.deadBodies.map((candidate) => ({
                  ...candidate,
                  reported: true,
                })),
              };
            }

            sound.playEmergencySiren();
            const resetPlayers = Object.fromEntries(
              Object.entries(newState.players).map(([playerId, player]) => [
                playerId,
                {
                  ...player,
                  hasVoted: false,
                  votedFor: null,
                  inVent: false,
                  ventId: undefined,
                  isMoving: false,
                },
              ]),
            ) as Record<string, Player>;

            movementCheckpointsRef.current = {};
            newState = {
              ...newState,
              phase: 'meeting',
              players: resetPlayers,
              meetingReporterName: reporter.name,
              meetingReporterColor: reporter.color,
              isEmergencyMeeting: msg.type === 'EMERGENCY_MEETING',
              meetingPhase: 'discussion',
              meetingTimer: newState.settings.discussionTime,
              activeSabotage: null,
              sabotageAvailableAt: Date.now() + SABOTAGE_COOLDOWN_MS,
              securityCamViewers: [],
              isSecurityCamActive: false,
            };

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'CAST_VOTE': {
            if (msg.voterId !== senderId) return prevState;
            const voter = newState.players[senderId];
            const targetIsValid = msg.targetId === 'skip'
              || Boolean(newState.players[msg.targetId]?.isAlive);
            if (
              newState.phase !== 'meeting'
              || newState.meetingPhase !== 'voting'
              || !voter
              || !voter.isAlive
              || voter.hasVoted
              || !targetIsValid
            ) {
              return prevState;
            }

            sound.playButtonClick();
            newState = {
              ...newState,
              players: {
                ...newState.players,
                [voter.id]: {
                  ...voter,
                  hasVoted: true,
                  votedFor: msg.targetId,
                },
              },
            };

            const alivePlayers = Object.values(newState.players).filter((player) => player.isAlive);
            if (alivePlayers.every((player) => player.hasVoted)) {
              newState.meetingTimer = 1;
            }

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'COMPLETE_TASK': {
            if (newState.phase !== 'playing' || msg.playerId !== senderId) return prevState;
            const player = newState.players[senderId];
            const task = ALL_TASKS.find((candidate) => candidate.id === msg.taskId);
            if (
              !player
              || player.role !== 'crewmate'
              || player.inVent
              || !task
              || !player.assignedTasks.includes(task.id)
              || player.completedTasks.includes(task.id)
              || !isWithinRange(
                player.x,
                player.y,
                task.x,
                task.y,
                TASK_INTERACTION_RANGE,
              )
              || !hasLineOfSight(
                player.x,
                player.y,
                task.x,
                task.y,
                newState.lockedDoors,
              )
            ) {
              return prevState;
            }

            newState = {
              ...newState,
              players: {
                ...newState.players,
                [player.id]: {
                  ...player,
                  completedTasks: [...player.completedTasks, task.id],
                },
              },
              completedTasksCount: (newState.completedTasksCount ?? 0) + 1,
            };

            const winCheck = checkWinConditions(newState);
            if (winCheck.winner) {
              newState = {
                ...newState,
                phase: 'game_over',
                winner: winCheck.winner,
                winReason: winCheck.winReason,
              };
            }

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'VENT_ACTION': {
            if (newState.phase !== 'playing' || msg.playerId !== senderId) return prevState;
            const player = newState.players[senderId];
            if (!player || !player.isAlive || player.role !== 'impostor') return prevState;

            const sourceVent = VENTS.find((vent) => vent.id === msg.ventId);
            if (!sourceVent) return prevState;

            const updatedPlayer: Player = { ...player, isMoving: false };
            if (msg.action === 'enter') {
              if (
                player.inVent
                || !isWithinRange(
                  player.x,
                  player.y,
                  sourceVent.x,
                  sourceVent.y,
                  VENT_INTERACTION_RANGE,
                )
                || !hasLineOfSight(
                  player.x,
                  player.y,
                  sourceVent.x,
                  sourceVent.y,
                  newState.lockedDoors,
                )
              ) {
                return prevState;
              }
              updatedPlayer.inVent = true;
              updatedPlayer.ventId = sourceVent.id;
              updatedPlayer.x = sourceVent.x;
              updatedPlayer.y = sourceVent.y;
            } else if (msg.action === 'exit') {
              if (!player.inVent || player.ventId !== sourceVent.id) return prevState;
              updatedPlayer.inVent = false;
              updatedPlayer.ventId = undefined;
              updatedPlayer.x = sourceVent.x;
              updatedPlayer.y = sourceVent.y;
            } else if (msg.action === 'travel') {
              const targetVent = msg.targetVentId
                ? VENTS.find((vent) => vent.id === msg.targetVentId)
                : undefined;
              if (
                !player.inVent
                || player.ventId !== sourceVent.id
                || !targetVent
                || !sourceVent.connectedVents.includes(targetVent.id)
              ) {
                return prevState;
              }
              updatedPlayer.inVent = true;
              updatedPlayer.ventId = targetVent.id;
              updatedPlayer.x = targetVent.x;
              updatedPlayer.y = targetVent.y;
            } else {
              return prevState;
            }

            movementCheckpointsRef.current[player.id] = {
              at: Date.now(),
              x: updatedPlayer.x,
              y: updatedPlayer.y,
            };
            sound.playVentWhoosh();
            newState = {
              ...newState,
              players: {
                ...newState.players,
                [player.id]: updatedPlayer,
              },
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'TRIGGER_SABOTAGE': {
            const sender = newState.players[senderId];
            const now = Date.now();
            if (
              newState.phase !== 'playing'
              || newState.activeSabotage
              || !sender
              || !sender.isAlive
              || sender.role !== 'impostor'
              || sender.inVent
              || !isSabotageType(msg.sabotageType)
              || (newState.sabotageAvailableAt ?? 0) > now
            ) {
              return prevState;
            }

            playSabotageAlarm();
            const isCritical = msg.sabotageType === 'reactor' || msg.sabotageType === 'o2';
            newState = {
              ...newState,
              activeSabotage: {
                type: msg.sabotageType,
                countdown: isCritical ? 30 : 0,
                activatedAt: now,
                requiredFixes: isCritical ? 2 : 1,
                currentFixes: 0,
                ...(msg.sabotageType === 'reactor'
                  ? { reactorHands: [], reactorStations: [] }
                  : {}),
                ...(msg.sabotageType === 'o2' ? { o2FixedRooms: [] } : {}),
              },
              sabotageAvailableAt: now + SABOTAGE_COOLDOWN_MS,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'FIX_SABOTAGE': {
            if (msg.fixerId !== senderId || !isSabotageType(msg.sabotageType)) {
              return prevState;
            }
            const fixer = newState.players[senderId];
            const activeSabotage = newState.activeSabotage;
            if (
              newState.phase !== 'playing'
              || !activeSabotage
              || activeSabotage.type !== msg.sabotageType
              || !fixer
              || !fixer.isAlive
              || fixer.inVent
            ) {
              return prevState;
            }

            const fixPoint = getSabotageFixPoint(
              activeSabotage.type,
              fixer.x,
              fixer.y,
            );
            if (
              !fixPoint
              || !hasLineOfSight(
                fixer.x,
                fixer.y,
                fixPoint.x,
                fixPoint.y,
                newState.lockedDoors,
              )
            ) {
              return prevState;
            }

            const repairedSabotage = applySabotageFix(
              activeSabotage,
              fixer.id,
              fixer.x,
              fixer.y,
            );
            if (repairedSabotage === undefined) return prevState;

            newState = {
              ...newState,
              activeSabotage: repairedSabotage,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'LOCK_DOORS': {
            const sender = newState.players[senderId];
            const room = normalizeDoorRoom(msg.room);
            const now = Date.now();
            if (
              newState.phase !== 'playing'
              || !sender
              || !sender.isAlive
              || sender.role !== 'impostor'
              || sender.inVent
              || !room
              || (newState.doorAvailableAt ?? 0) > now
              || (newState.lockedDoors?.[room] ?? 0) > now
            ) {
              return prevState;
            }

            const activeDoorLocks = Object.fromEntries(
              Object.entries(newState.lockedDoors ?? {})
                .filter(([, expiresAt]) => expiresAt > now),
            );
            playDoorLock();
            newState = {
              ...newState,
              lockedDoors: {
                ...activeDoorLocks,
                [room]: now + 10_000,
              },
              doorAvailableAt: now + DOOR_COOLDOWN_MS,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          case 'SECURITY_CAM_TOGGLE': {
            if (msg.viewerId !== undefined && msg.viewerId !== senderId) return prevState;
            const viewer = newState.players[senderId];
            if (!viewer) return prevState;

            const viewerIds = new Set(
              (newState.securityCamViewers ?? [])
                .filter((viewerId) => Boolean(newState.players[viewerId])),
            );

            if (msg.active) {
              if (
                newState.phase !== 'playing'
                || !viewer.isAlive
                || viewer.inVent
                || !isWithinRange(
                  viewer.x,
                  viewer.y,
                  SECURITY_DESK_POSITION.x,
                  SECURITY_DESK_POSITION.y,
                  SECURITY_INTERACTION_RANGE,
                )
                || !hasLineOfSight(
                  viewer.x,
                  viewer.y,
                  SECURITY_DESK_POSITION.x,
                  SECURITY_DESK_POSITION.y,
                  newState.lockedDoors,
                )
              ) {
                return prevState;
              }
              viewerIds.add(senderId);
            } else {
              viewerIds.delete(senderId);
            }

            const securityCamViewers = [...viewerIds];
            newState = {
              ...newState,
              securityCamViewers,
              isSecurityCamActive: securityCamViewers.length > 0,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }


          default:
            return prevState;
        }
      };

      const nextState = processMessage();
      if (nextState !== previousState) {
        gameStateRef.current = nextState;
        setGameState(nextState);
      }
    },
    [checkWinConditions]
  );

  // Client Message Processor
  const handleClientNetworkMessage = useCallback(
    (msg: NetworkMessage) => {
      switch (msg.type) {
        case 'JOIN_ACCEPTED': {
          setLocalPlayerId(msg.playerId);
          gameStateRef.current = msg.gameState;
          setGameState(msg.gameState);
          if (msg.gameState.players[msg.playerId]) {
            setLocalPlayer(msg.gameState.players[msg.playerId]);
          }
          setInRoom(true);
          setIsLoading(false);
          break;
        }

        case 'JOIN_REJECTED': {
          setError(msg.reason || 'Beitritt abgelehnt');
          setIsLoading(false);
          networkRef.current?.destroy();
          break;
        }

        case 'STATE_SYNC': {
          gameStateRef.current = msg.gameState;
          setGameState(msg.gameState);
          break;
        }


        case 'PLAYER_MOVE': {
          if (
            !Number.isFinite(msg.x)
            || !Number.isFinite(msg.y)
            || (msg.facing !== 'left' && msg.facing !== 'right')
          ) {
            break;
          }

          updateGameState((previousState) => {
            const player = previousState.players[msg.playerId];
            if (!player) return previousState;
            const nextState: GameState = {
              ...previousState,
              players: {
                ...previousState.players,
                [msg.playerId]: {
                  ...player,
                  x: msg.x,
                  y: msg.y,
                  facing: msg.facing,
                  isMoving: Boolean(msg.isMoving),
                  inVent: msg.inVent,
                  ventId: msg.ventId,
                },
              },
            };
            gameStateRef.current = nextState;
            return nextState;
          });

          if (msg.playerId === localPlayerIdRef.current) {
            setLocalPlayer((current) => {
              const correctionDistance = Math.hypot(current.x - msg.x, current.y - msg.y);
              if (
                correctionDistance <= 40
                && current.inVent === msg.inVent
                && current.ventId === msg.ventId
              ) {
                return current;
              }
              return {
                ...current,
                x: msg.x,
                y: msg.y,
                facing: msg.facing,
                isMoving: Boolean(msg.isMoving),
                inVent: msg.inVent,
                ventId: msg.ventId,
              };
            });
          }
          break;
        }


        case 'CHAT_MESSAGE': {
          const local = gameStateRef.current.players[localPlayerIdRef.current];
          if (msg.message.isDeadOnly && local?.isAlive !== false) break;
          setChatMessages((messages) => (
            messages.some((message) => message.id === msg.message.id)
              ? messages
              : appendChatMessage(messages, msg.message)
          ));
          break;
        }


        default:
          break;
      }
    },
    [updateGameState]
  );

  // Initialize Host
  const handleCreateRoom = async (playerName: string, color: PlayerColor) => {
    setIsLoading(true);
    setError(null);

    try {
      const code = generateRoomCode();
      const net = new NetworkManager();
      networkRef.current = net;

      const peerId = await net.initHost(code);

      const safeHostColor = isPlayerColor(color) ? color : 'red';
      const hostPlayer: Player = {
        id: peerId,
        name: sanitizePlayerName(playerName),
        color: safeHostColor,
        isHost: true,
        isReady: true,
        role: 'unassigned',
        isAlive: true,
        x: SPAWN_POSITION.x,
        y: SPAWN_POSITION.y,
        facing: 'right',
        isMoving: false,
        assignedTasks: [],
        completedTasks: [],
      };


      const initialPlayers: Record<string, Player> = { [peerId]: hostPlayer };
      const takenColors = [color];
      const availableColors = PLAYER_COLORS.map((c) => c.id).filter((c) => !takenColors.includes(c));
      const botNames = ['Orion', 'Nova', 'Pulsar', 'Cosmo', 'Orbit', 'AstroBot', 'Blauhelm', 'Sternenpilot'];

      for (let i = 0; i < DEFAULT_SETTINGS.botCount; i++) {
        const botId = `bot_${Date.now()}_${i}`;
        const botColor = availableColors[i] || 'yellow';
        const randomHat = HATS[Math.floor(Math.random() * HATS.length)].id;
        const spawnPos = getSpawnPosition(1 + i);
        initialPlayers[botId] = {
          id: botId,
          name: botNames[i % botNames.length] || `Bot ${i + 1}`,
          color: botColor,
          hat: randomHat,
          isHost: false,
          isReady: true,
          role: 'unassigned',
          isAlive: true,
          x: spawnPos.x,
          y: spawnPos.y,
          facing: 'left',
          isMoving: false,
          assignedTasks: [],
          completedTasks: [],
          isBot: true,
        };
      }

      const initialGameState: GameState = {
        roomCode: code,
        phase: 'lobby',
        players: initialPlayers,
        deadBodies: [],
        settings: { ...DEFAULT_SETTINGS },
        totalTasksCount: 0,
        completedTasksCount: 0,
        activeSabotage: null,
        sabotageAvailableAt: 0,
        doorAvailableAt: 0,
        lockedDoors: {},
        securityCamViewers: [],
        isSecurityCamActive: false,
      };



      localPlayerIdRef.current = peerId;
      setLocalPlayerId(peerId);
      setIsHost(true);
      setRoomCode(code);
      setLocalPlayer(hostPlayer);
      gameStateRef.current = initialGameState;
      setGameState(initialGameState);
      setInRoom(true);

      net.onMessage(handleHostNetworkMessage);

      net.onDisconnect((disconnectedPeerId) => {
        updateGameState((previousState) => {
          const leavingPlayer = previousState.players[disconnectedPeerId];
          if (!leavingPlayer) return previousState;

          delete movementCheckpointsRef.current[disconnectedPeerId];
          const updatedPlayers = { ...previousState.players };
          delete updatedPlayers[disconnectedPeerId];

          let totalTasksCount = previousState.totalTasksCount;
          let completedTasksCount = previousState.completedTasksCount;
          if (leavingPlayer.role === 'crewmate' && previousState.phase !== 'lobby') {
            totalTasksCount = Math.max(
              0,
              (totalTasksCount ?? 0) - leavingPlayer.assignedTasks.length,
            );
            completedTasksCount = Math.max(
              0,
              (completedTasksCount ?? 0) - leavingPlayer.completedTasks.length,
            );
          }

          const securityCamViewers = (previousState.securityCamViewers ?? [])
            .filter((viewerId) => viewerId !== disconnectedPeerId);
          let updatedState: GameState = {
            ...previousState,
            players: updatedPlayers,
            totalTasksCount,
            completedTasksCount,
            securityCamViewers,
            isSecurityCamActive: securityCamViewers.length > 0,
          };

          const winCheck = checkWinConditions(updatedState);
          if (winCheck.winner) {
            updatedState = {
              ...updatedState,
              phase: 'game_over',
              winner: winCheck.winner,
              winReason: winCheck.winReason,
            };
          }

          net.broadcast({
            type: 'STATE_SYNC',
            gameState: updatedState,
          });

          const leaveMessage: ChatMessage = {
            id: createChatMessageId('leave'),
            senderId: 'system',
            senderName: 'System',
            senderColor: 'white',
            text: `${leavingPlayer.name} hat das Spiel verlassen.`,
            timestamp: Date.now(),
            isSystem: true,
          };
          setChatMessages((messages) => appendChatMessage(messages, leaveMessage));
          net.broadcast({ type: 'CHAT_MESSAGE', message: leaveMessage });

          return updatedState;
        });
      });

    } catch (error: unknown) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Fehler beim Erstellen des Raums.');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Room as Client
  const handleJoinRoom = async (code: string, playerName: string, color: PlayerColor) => {
    setIsLoading(true);
    setError(null);

    try {
      const net = new NetworkManager();
      networkRef.current = net;

      net.onMessage(handleClientNetworkMessage);

      net.onDisconnect(() => {
        setError('Die Verbindung zum Host wurde unterbrochen.');
        setInRoom(false);
      });

      await net.initClient(code, playerName, color);
      setIsHost(false);
      setRoomCode(code.toUpperCase());
    } catch (error: unknown) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Konnte dem Raum nicht beitreten.');
      setIsLoading(false);
    }
  };

  // Update profile in Lobby through the same authoritative path as remote peers.
  const handleUpdateProfile = (name: string, color: PlayerColor, isReady: boolean, hat?: HatType) => {
    const message: NetworkMessage = {
      type: 'PLAYER_UPDATE_PROFILE',
      name,
      color,
      hat,
      isReady,
    };
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;

    if (isHost) {
      handleHostNetworkMessage(message, currentId);
    } else {
      networkRef.current?.sendToHost(message);
    }
  };



  // Add Bot to Lobby (Host Only)
  const handleAddBot = useCallback(() => {
    if (!isHost) return;
    updateGameState((prev) => {
      if (prev.phase !== 'lobby') return prev;
      const currentPlayers = Object.values(prev.players);
      if (currentPlayers.length >= prev.settings.maxPlayers) return prev;

      const takenColors = currentPlayers.map((p) => p.color);
      const availableColors = PLAYER_COLORS.map((c) => c.id).filter((c) => !takenColors.includes(c));
      const botColor = availableColors[0] || 'yellow';

      const botNames = ['Orion', 'Nova', 'Pulsar', 'Cosmo', 'Orbit', 'AstroBot', 'Blauhelm', 'Sternenpilot', 'Atlas', 'Titan', 'Zeus', 'Apollo'];
      const existingBotNames = currentPlayers.filter((p) => p.isBot).map((p) => p.name);
      const name = botNames.find((n) => !existingBotNames.includes(n)) || `Bot ${currentPlayers.length + 1}`;

      const randomHat = HATS[Math.floor(Math.random() * HATS.length)].id;
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const spawnPos = getSpawnPosition(currentPlayers.length);

      const newBot: Player = {
        id: botId,
        name,
        color: botColor,
        hat: randomHat,
        isHost: false,
        isReady: true,
        role: 'unassigned',
        isAlive: true,
        x: spawnPos.x,
        y: spawnPos.y,
        facing: 'left',
        isMoving: false,
        assignedTasks: [],
        completedTasks: [],
        isBot: true,
      };

      const updatedPlayers = {
        ...prev.players,
        [botId]: newBot,
      };

      const botCount = Object.values(updatedPlayers).filter((p) => p.isBot).length;
      const nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        settings: {
          ...prev.settings,
          botCount,
        },
      };

      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });

      return nextState;
    });
  }, [isHost, updateGameState]);

  // Remove Bot from Lobby (Host Only)
  const handleRemoveBot = useCallback((botIdToRemove?: string) => {
    if (!isHost) return;
    updateGameState((prev) => {
      if (prev.phase !== 'lobby') return prev;
      const updatedPlayers = { ...prev.players };
      const bots = Object.values(updatedPlayers).filter((p) => p.isBot);
      if (bots.length === 0) return prev;

      const targetId = botIdToRemove || bots[bots.length - 1].id;
      delete updatedPlayers[targetId];

      const botCount = Object.values(updatedPlayers).filter((p) => p.isBot).length;
      const nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        settings: {
          ...prev.settings,
          botCount,
        },
      };

      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });

      return nextState;
    });
  }, [isHost, updateGameState]);

  // Update Game Settings (Host only) with validated dynamic bot count sync.
  const handleUpdateSettings = useCallback((requestedSettings: Partial<GameSettings>) => {
    if (!isHost) return;
    const settingsUpdate = sanitizeSettingsUpdate(requestedSettings);
    if (Object.keys(settingsUpdate).length === 0) return;

    updateGameState((previousState) => {
      if (previousState.phase !== 'lobby') return previousState;

      const updatedPlayers = { ...previousState.players };
      const humanCount = Object.values(updatedPlayers).filter((player) => !player.isBot).length;
      const effectiveMaxPlayers = Math.max(
        humanCount,
        settingsUpdate.maxPlayers ?? previousState.settings.maxPlayers,
      );
      const requestedBotCount = settingsUpdate.botCount
        ?? Object.values(updatedPlayers).filter((player) => player.isBot).length;
      const targetBotCount = Math.min(
        requestedBotCount,
        Math.max(0, effectiveMaxPlayers - humanCount),
      );
      const currentBots = Object.values(updatedPlayers).filter((player) => player.isBot);

      if (targetBotCount < currentBots.length) {
        for (const bot of currentBots.slice(targetBotCount)) {
          delete updatedPlayers[bot.id];
        }
      } else if (targetBotCount > currentBots.length) {
        const needed = targetBotCount - currentBots.length;
        for (let index = 0; index < needed; index += 1) {
          const currentPlayers = Object.values(updatedPlayers);
          if (currentPlayers.length >= effectiveMaxPlayers) break;

          const takenColors = new Set(currentPlayers.map((player) => player.color));
          const botColor = PLAYER_COLORS.find(({ id }) => !takenColors.has(id))?.id;
          if (!botColor) break;

          const botNames = [
            'Orion',
            'Nova',
            'Pulsar',
            'Cosmo',
            'Orbit',
            'AstroBot',
            'Blauhelm',
            'Sternenpilot',
            'Atlas',
            'Titan',
          ];
          const existingNames = new Set(
            currentPlayers.filter((player) => player.isBot).map((player) => player.name),
          );
          const botName = botNames.find((name) => !existingNames.has(name))
            ?? `Bot ${currentPlayers.length + 1}`;
          const botId = `bot_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 5)}`;
          const spawnPosition = getSpawnPosition(currentPlayers.length);

          updatedPlayers[botId] = {
            id: botId,
            name: botName,
            color: botColor,
            hat: HATS[Math.floor(Math.random() * HATS.length)].id,
            isHost: false,
            isReady: true,
            role: 'unassigned',
            isAlive: true,
            x: spawnPosition.x,
            y: spawnPosition.y,
            facing: 'left',
            isMoving: false,
            assignedTasks: [],
            completedTasks: [],
            isBot: true,
          };
        }
      }

      const botCount = Object.values(updatedPlayers).filter((player) => player.isBot).length;
      const settings: GameSettings = {
        ...previousState.settings,
        ...settingsUpdate,
        maxPlayers: effectiveMaxPlayers,
        botCount,
      };
      settings.impostorCount = Math.min(
        settings.impostorCount,
        3,
        Math.max(1, Math.floor(Object.keys(updatedPlayers).length / 2)),
      );

      const nextState: GameState = {
        ...previousState,
        players: updatedPlayers,
        settings,
      };
      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });
      return nextState;
    });
  }, [isHost, updateGameState]);


  // Send chat through the host so identity, visibility and timestamps cannot be forged.
  const handleSendMessage = (text: string, isDeadOnly?: boolean) => {
    const sanitizedText = sanitizeChatText(text);
    const currentId = localPlayerIdRef.current;
    if (!sanitizedText || !currentId) return;

    const message: NetworkMessage = {
      type: 'CHAT_MESSAGE',
      message: {
        id: '',
        senderId: currentId,
        senderName: '',
        senderColor: 'white',
        text: sanitizedText,
        timestamp: 0,
        isDeadOnly,
      },
    };

    if (isHost) {
      handleHostNetworkMessage(message, currentId);
    } else {
      networkRef.current?.sendToHost(message);
    }
  };


  // START GAME (Host Authoritative Setup)
  const handleStartGame = () => {
    if (!isHost) return;

    updateGameState((previousState) => {
      if (previousState.phase !== 'lobby') return previousState;

      const playersMap = Object.fromEntries(
        Object.entries(previousState.players).map(([playerId, player]) => [
          playerId,
          { ...player },
        ]),
      ) as Record<string, Player>;
      const currentPlayerCount = Object.keys(playersMap).length;
      const currentBotCount = Object.values(playersMap)
        .filter((player) => player.isBot).length;

      if (
        previousState.settings.botCount > currentBotCount
        && currentPlayerCount < previousState.settings.maxPlayers
      ) {
        const botsNeeded = Math.min(
          previousState.settings.botCount - currentBotCount,
          previousState.settings.maxPlayers - currentPlayerCount,
        );
        const botNames = [
          'Blauhelm',
          'Sternenpilot',
          'AstroBot',
          'Orion',
          'Nova',
          'Pulsar',
          'Cosmo',
          'Orbit',
        ];

        for (let index = 0; index < botsNeeded; index += 1) {
          const currentPlayers = Object.values(playersMap);
          const takenColors = new Set(currentPlayers.map((player) => player.color));
          const botColor = PLAYER_COLORS.find(({ id }) => !takenColors.has(id))?.id;
          if (!botColor) break;

          const botId = `bot_${Date.now()}_${index}`;
          const spawnPosition = getSpawnPosition(currentPlayers.length);
          playersMap[botId] = {
            id: botId,
            name: botNames[index % botNames.length] ?? `Bot ${index + 1}`,
            color: botColor,
            hat: HATS[Math.floor(Math.random() * HATS.length)].id,
            isHost: false,
            isReady: true,
            role: 'unassigned',
            isAlive: true,
            x: spawnPosition.x,
            y: spawnPosition.y,
            facing: 'left',
            isMoving: false,
            assignedTasks: [],
            completedTasks: [],
            isBot: true,
          };
        }
      }

      const playerIds = Object.keys(playersMap);
      const allHumanPlayersReady = Object.values(playersMap)
        .filter((player) => !player.isBot && !player.isHost)
        .every((player) => player.isReady);
      const configuredImpostorCount = Math.min(
        previousState.settings.impostorCount,
        Math.max(1, Math.floor(playerIds.length / 2)),
      );
      if (
        !allHumanPlayersReady
        || playerIds.length <= configuredImpostorCount * 2
      ) {
        return previousState;
      }

      const shuffledIds = [...playerIds];
      for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffledIds[index], shuffledIds[swapIndex]] = [
          shuffledIds[swapIndex],
          shuffledIds[index],
        ];
      }

      const impostorCount = configuredImpostorCount;
      const impostorIds = new Set(shuffledIds.slice(0, impostorCount));
      const matchStartsAt = Date.now() + 3_500;
      let totalTasksCount = 0;

      playerIds.forEach((playerId, playerIndex) => {
        const player = playersMap[playerId];
        const isImpostor = impostorIds.has(playerId);
        const spawnPosition = getSpawnPosition(playerIndex);
        const shuffledTasks = [...ALL_TASKS];
        for (let index = shuffledTasks.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [shuffledTasks[index], shuffledTasks[swapIndex]] = [
            shuffledTasks[swapIndex],
            shuffledTasks[index],
          ];
        }

        const chosenTasks = [];
        const usedTypes = new Set<string>();
        for (const task of shuffledTasks) {
          if (!usedTypes.has(task.type)) {
            chosenTasks.push(task);
            usedTypes.add(task.type);
          }
          if (chosenTasks.length >= previousState.settings.totalTasksPerPlayer) break;
        }
        for (const task of shuffledTasks) {
          if (chosenTasks.length >= previousState.settings.totalTasksPerPlayer) break;
          if (!chosenTasks.some((chosenTask) => chosenTask.id === task.id)) {
            chosenTasks.push(task);
          }
        }

        const assignedTasks = chosenTasks.map((task) => task.id);
        playersMap[playerId] = {
          ...player,
          role: isImpostor ? 'impostor' : 'crewmate',
          isAlive: true,
          x: spawnPosition.x,
          y: spawnPosition.y,
          facing: player.facing === 'left' ? 'left' : 'right',
          isMoving: false,
          assignedTasks,
          completedTasks: [],
          votedFor: null,
          hasVoted: false,
          inVent: false,
          ventId: undefined,
          emergencyMeetingsLeft: previousState.settings.emergencyMeetings,
          killAvailableAt: isImpostor
            ? matchStartsAt + previousState.settings.killCooldown * 1_000
            : undefined,
        };

        if (!isImpostor) totalTasksCount += assignedTasks.length;
      });

      movementCheckpointsRef.current = {};
      botTargetState.current = {};
      const nextState: GameState = {
        ...previousState,
        phase: 'role_reveal',
        players: playersMap,
        deadBodies: [],
        winner: undefined,
        winReason: undefined,
        totalTasksCount,
        completedTasksCount: 0,
        activeSabotage: null,
        sabotageAvailableAt: matchStartsAt + SABOTAGE_COOLDOWN_MS,
        doorAvailableAt: matchStartsAt + DOOR_COOLDOWN_MS,
        lockedDoors: {},
        securityCamViewers: [],
        isSecurityCamActive: false,
      };

      const currentPlayer = playersMap[localPlayerIdRef.current];
      if (currentPlayer) setLocalPlayer(currentPlayer);
      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });

      setTimeout(() => {
        updateGameState((currentState) => {
          if (currentState.phase !== 'role_reveal') return currentState;
          const playingState: GameState = {
            ...currentState,
            phase: 'playing',
          };
          networkRef.current?.broadcast({
            type: 'STATE_SYNC',
            gameState: playingState,
          });
          return playingState;
        });
      }, 3_500);

      return nextState;
    });
  };


  // Host Meeting Timer Ticker & Bot AI
  useEffect(() => {
    if (!isHost) return;

    if (gameState.phase === 'meeting') {
      meetingIntervalRef.current = setInterval(() => {
        updateGameState((prev) => {
          if (prev.phase !== 'meeting') return prev;

          let newTimer = (prev.meetingTimer || 0) - 1;
          let newPhase = prev.meetingPhase || 'discussion';

          // Discussion Phase ended -> Switch to Voting
          if (newPhase === 'discussion' && newTimer <= 0) {
            newPhase = 'voting';
            newTimer = prev.settings.votingTime;

            // Clear any prior bot vote timeouts
            botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
            botVoteTimeoutsRef.current = [];

            // Trigger Bot Voting after random delays
            Object.values(prev.players)
              .filter((p) => p.isBot && p.isAlive)
              .forEach((bot) => {
                const timerId = setTimeout(() => {
                  updateGameState((s) => {
                    if (s.phase !== 'meeting' || s.meetingPhase !== 'voting' || !s.players[bot.id] || s.players[bot.id].hasVoted) return s;
                    const aliveTargets = Object.values(s.players).filter((p) => p.isAlive);
                    const randomChoice = Math.random() > 0.3
                      ? aliveTargets[Math.floor(Math.random() * aliveTargets.length)].id
                      : 'skip';

                    const updated = {
                      ...s,
                      players: {
                        ...s.players,
                        [bot.id]: {
                          ...s.players[bot.id],
                          hasVoted: true,
                          votedFor: randomChoice,
                        },
                      },
                    };
                    networkRef.current?.broadcast({
                      type: 'STATE_SYNC',
                      gameState: updated,
                    });
                    return updated;
                  });
                }, Math.random() * 6000 + 1500);
                botVoteTimeoutsRef.current.push(timerId);
              });
          }

          // Voting ended -> Switch to Results Phase (Show votes for 4s)
          if (newPhase === 'voting' && newTimer <= 0) {
            // Cancel pending bot votes immediately
            botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
            botVoteTimeoutsRef.current = [];
            newPhase = 'results';
            newTimer = 4;
          }

          // Results ended -> Calculate Ejection
          if (newPhase === 'results' && newTimer <= 0) {
            clearInterval(meetingIntervalRef.current!);
            botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
            botVoteTimeoutsRef.current = [];

            // Count votes
            const voteCounts: Record<string, number> = { skip: 0 };
            Object.values(prev.players).forEach((p) => {
              if (p.votedFor) {
                voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
              }
            });

            let highestVoteCount = 0;
            let highestTarget: string | null = null;
            let isTie = false;

            Object.entries(voteCounts).forEach(([target, count]) => {
              if (count > highestVoteCount) {
                highestVoteCount = count;
                highestTarget = target;
                isTie = false;
              } else if (count === highestVoteCount && count > 0) {
                isTie = true;
              }
            });

            const nextPlayers = { ...prev.players };
            let ejectedPlayer: Player | undefined;
            const wasSkipped = highestTarget === 'skip' || !highestTarget;

            if (!isTie && !wasSkipped && highestTarget && nextPlayers[highestTarget]) {
              ejectedPlayer = nextPlayers[highestTarget];
              nextPlayers[highestTarget] = {
                ...ejectedPlayer,
                isAlive: false,
              };
            }

            const remainingImps = Object.values(nextPlayers).filter((p) => p.isAlive && p.role === 'impostor').length;

            const ejectionData: EjectionData = {
              ejectedPlayerId: ejectedPlayer?.id,
              ejectedPlayerName: ejectedPlayer?.name,
              ejectedPlayerColor: ejectedPlayer?.color,
              ejectedPlayerRole: ejectedPlayer?.role,
              wasTie: isTie,
              wasSkipped: wasSkipped,
              remainingImpostors: remainingImps,
              confirmEjects: prev.settings.confirmEjects,
            };

            const ejectionState: GameState = {
              ...prev,
              phase: 'ejection',
              players: nextPlayers,
              deadBodies: [], // Clear reported bodies
              ejectionData,
            };

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: ejectionState,
            });

            // Check Win Condition after ejection
            const winCheck = checkWinConditions(ejectionState);

            setTimeout(() => {
              updateGameState((curr) => {
                if (curr.phase !== 'ejection') return curr;

                if (winCheck.winner) {
                  const overState: GameState = {
                    ...curr,
                    phase: 'game_over',
                    winner: winCheck.winner,
                    winReason: winCheck.winReason,
                  };
                  networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: overState });
                  return overState;
                }

                // Resume match & respawn players in Cafeteria.
                const resumedAt = Date.now();
                const respawnPlayers = Object.fromEntries(
                  Object.entries(curr.players).map(([playerId, player], index) => {
                    const spawnPosition = getSpawnPosition(index);
                    return [
                      playerId,
                      {
                        ...player,
                        x: spawnPosition.x,
                        y: spawnPosition.y,
                        facing: player.facing === 'left' ? 'left' : 'right',
                        isMoving: false,
                        hasVoted: false,
                        votedFor: null,
                        inVent: false,
                        ventId: undefined,
                        killAvailableAt: player.role === 'impostor'
                          ? resumedAt + curr.settings.killCooldown * 1_000
                          : undefined,
                      },
                    ];
                  }),
                ) as Record<string, Player>;

                movementCheckpointsRef.current = {};
                const resumeState: GameState = {
                  ...curr,
                  phase: 'playing',
                  players: respawnPlayers,
                  activeSabotage: null,
                  sabotageAvailableAt: resumedAt + SABOTAGE_COOLDOWN_MS,
                  doorAvailableAt: resumedAt + DOOR_COOLDOWN_MS,
                  lockedDoors: {},
                  securityCamViewers: [],
                  isSecurityCamActive: false,
                };

                networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: resumeState });
                return resumeState;
              });
            }, 5000);

            return ejectionState;
          }

          const updated: GameState = {
            ...prev,
            meetingPhase: newPhase,
            meetingTimer: newTimer,
          };

          networkRef.current?.broadcast({
            type: 'STATE_SYNC',
            gameState: updated,
          });

          return updated;
        });
      }, 1000);
    } else {
      if (meetingIntervalRef.current) clearInterval(meetingIntervalRef.current);
    }

    return () => {
      if (meetingIntervalRef.current) clearInterval(meetingIntervalRef.current);
    };
  }, [gameState.phase, isHost, checkWinConditions, updateGameState]);

  // Host Sabotage Crisis Countdown Loop
  useEffect(() => {
    if (!isHost || gameState.phase !== 'playing') {
      if (sabotageIntervalRef.current) clearInterval(sabotageIntervalRef.current);
      return;
    }

    sabotageIntervalRef.current = setInterval(() => {
      updateGameState((prev) => {
        if (prev.phase !== 'playing' || !prev.activeSabotage) return prev;

        const currentSabotage = prev.activeSabotage;
        const isCritical = currentSabotage.type === 'reactor'
          || currentSabotage.type === 'o2';
        if (!isCritical) return prev;

        const nextCountdown = currentSabotage.countdown - 1;
        if (nextCountdown <= 0) {
          const overState: GameState = {
            ...prev,
            phase: 'game_over',
            winner: 'impostors',
            winReason:
              currentSabotage.type === 'reactor'
                ? 'Kritische Reaktorschmelze! Das Schiff wurde zerstört.'
                : 'Sauerstoff erschöpft! Die Besatzung konnte nicht gerettet werden.',
            activeSabotage: null,
            securityCamViewers: [],
            isSecurityCamActive: false,
          };
          networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: overState });
          return overState;
        }

        const updatedState: GameState = {
          ...prev,
          activeSabotage: {
            ...currentSabotage,
            countdown: nextCountdown,
          },
        };
        networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: updatedState });
        return updatedState;
      });
    }, 1000);

    return () => {
      if (sabotageIntervalRef.current) clearInterval(sabotageIntervalRef.current);
    };
  }, [isHost, gameState.phase, updateGameState]);

  // Host Bot Simulation Loop (Waypoint NavMesh Pathfinding, Stealth Kills & Body Reports)
  useEffect(() => {
    if (!isHost || gameState.phase !== 'playing') {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      return;
    }

    botIntervalRef.current = setInterval(() => {
      updateGameState((prev) => {
        if (prev.phase !== 'playing') return prev;


        const updatedPlayers = Object.fromEntries(
          Object.entries(prev.players).map(([playerId, player]) => [
            playerId,
            { ...player },
          ]),
        ) as Record<string, Player>;

        const updatedDeadBodies = [...prev.deadBodies];
        let updatedCompletedTasksCount = prev.completedTasksCount || 0;
        let updatedActiveSabotage = prev.activeSabotage;
        let anyBotMoved = false;
        let triggeredReport = false;
        let reportingBotId: string | null = null;

        const allPlayersList = Object.values(updatedPlayers);
        const now = Date.now();

        for (const p of allPlayersList) {
          if (p.isBot && !p.inVent) {
            anyBotMoved = true;

            // Initialize bot state
            let bState = botTargetState.current[p.id];
            if (!bState) {
              bState = {
                targetX: p.x,
                targetY: p.y,
                path: [],
                pathIdx: 0,
                pauseTicks: 0,
                pathRetryTicks: 0,
                killCooldownTicks: Math.floor(prev.settings.killCooldown * 5),
              };
              botTargetState.current[p.id] = bState;
            }

            // Decrement kill cooldown ticks
            if (bState.killCooldownTicks && bState.killCooldownTicks > 0) {
              bState.killCooldownTicks--;
            }

            // 1. BOT CREWMATE (Alive only): Check for dead bodies in Line of Sight to report
            if (p.isAlive && p.role !== 'impostor' && !triggeredReport) {
              for (const body of updatedDeadBodies) {
                if (body.reported) continue;
                const d = Math.hypot(p.x - body.x, p.y - body.y);
                if (d < 180 && hasLineOfSight(p.x, p.y, body.x, body.y, prev.lockedDoors)) {
                  triggeredReport = true;
                  reportingBotId = p.id;
                  break;
                }
              }
            }

            // 2. BOT IMPOSTOR (Alive only): Check for isolated crewmate to kill
            if (p.isAlive && p.role === 'impostor' && (!bState.killCooldownTicks || bState.killCooldownTicks <= 0)) {
              const potentialVictims = allPlayersList.filter(
                (v) => v.id !== p.id && v.isAlive && v.role !== 'impostor' && !v.inVent
              );

              for (const victim of potentialVictims) {
                const distToVictim = Math.hypot(p.x - victim.x, p.y - victim.y);
                if (distToVictim < 90 && hasLineOfSight(p.x, p.y, victim.x, victim.y, prev.lockedDoors)) {
                  // Check for witnesses with LOS
                  const witnesses = allPlayersList.filter(
                    (w) =>
                      w.id !== p.id &&
                      w.id !== victim.id &&
                      w.isAlive &&
                      !w.inVent &&
                      Math.hypot(w.x - victim.x, w.y - victim.y) < 220 &&
                      hasLineOfSight(w.x, w.y, victim.x, victim.y, prev.lockedDoors)
                  );

                  // If no witnesses or high stealth chance, execute kill!
                  if (witnesses.length === 0 || Math.random() < 0.25) {
                    updatedPlayers[victim.id] = {
                      ...victim,
                      isAlive: false,
                    };
                    updatedDeadBodies.push({
                      id: `body-${now}-${victim.id}`,
                      playerId: victim.id,
                      playerName: victim.name,
                      color: victim.color,
                      hat: victim.hat,
                      x: victim.x,
                      y: victim.y,
                      reported: false,
                    });
                    sound.playKillSound();
                    bState.killCooldownTicks = Math.floor(prev.settings.killCooldown * 5);
                    break;
                  }
                }
              }
            }

            // 3. Navigation & Pathfinding (Alive bots & Ghost bots)
            const needsPath = !bState.path
              || bState.path.length === 0
              || bState.pathIdx >= bState.path.length;
            if (needsPath && (bState.pathRetryTicks ?? 0) > 0) {
              bState.pathRetryTicks = Math.max(0, (bState.pathRetryTicks ?? 0) - 1);
              p.isMoving = false;
              continue;
            }

            if (needsPath) {
              let targetX = p.x;
              let targetY = p.y;

              // Alive Crewmate bots prioritize sabotage repair
              if (p.isAlive && updatedActiveSabotage && p.role !== 'impostor' && Math.random() < 0.6) {
                const sabotageTarget = getBotSabotageTarget(updatedActiveSabotage, p.id);
                targetX = sabotageTarget.x;
                targetY = sabotageTarget.y;
              } else {
                // Ghost or living crewmate navigates to assigned task
                const unfinishedTask = p.assignedTasks.find((tId) => !p.completedTasks.includes(tId));
                const foundTaskDef = unfinishedTask ? ALL_TASKS.find((t) => t.id === unfinishedTask) : null;
                const targetTask = foundTaskDef || ALL_TASKS[Math.floor(Math.random() * ALL_TASKS.length)];
                targetX = targetTask.x;
                targetY = targetTask.y;
              }

              const path = findBotPath(
                p.x,
                p.y,
                targetX,
                targetY,
                prev.lockedDoors,
              );

              bState.targetX = targetX;
              bState.targetY = targetY;
              bState.path = path;
              bState.pathIdx = 0;
              bState.pauseTicks = 0;
              bState.pathRetryTicks = path.length === 0 ? 10 : 0;
            }

            // If bot is pausing at task to simulate work
            if (bState.pauseTicks > 0) {
              bState.pauseTicks--;
              p.isMoving = false;

              // If bot finishes working on an assigned task, complete it! (Crewmate living & ghosts)
              if (bState.pauseTicks === 0 && p.role !== 'impostor') {
                const assignedUnfinished = p.assignedTasks.find((tId) => !p.completedTasks.includes(tId));
                if (assignedUnfinished) {
                  p.completedTasks = [...p.completedTasks, assignedUnfinished];
                  updatedCompletedTasksCount++;
                }

                // If at sabotage location, fix it (Living crewmates only)
                if (p.isAlive && updatedActiveSabotage) {
                  const sabotageTarget = getBotSabotageTarget(updatedActiveSabotage, p.id);
                  if (Math.hypot(p.x - sabotageTarget.x, p.y - sabotageTarget.y) < 100) {
                    const repairedSabotage = applySabotageFix(updatedActiveSabotage, p.id, p.x, p.y);
                    if (repairedSabotage !== undefined) {
                      updatedActiveSabotage = repairedSabotage;
                    }
                  }
                }
              }
              continue;
            }

            const currentWaypoint = bState.path[bState.pathIdx];
            if (currentWaypoint) {
              const dx = currentWaypoint.x - p.x;
              const dy = currentWaypoint.y - p.y;
              const distance = Math.hypot(dx, dy);
              const botSpeed = 24 * prev.settings.playerSpeed;

              if (distance <= 0.001) {
                bState.pathIdx += 1;
              } else {
                const stepDistance = Math.min(botSpeed, distance);
                const resolvedMovement = resolvePlayerMovement(
                  p.x,
                  p.y,
                  (dx / distance) * stepDistance,
                  (dy / distance) * stepDistance,
                  16,
                  !p.isAlive,
                  prev.lockedDoors,
                );
                if (!resolvedMovement.moved && stepDistance > 0.001) {
                  bState.path = [];
                  bState.pathIdx = 0;
                  bState.pathRetryTicks = 5;
                  p.isMoving = false;
                  continue;
                }
                p.x = resolvedMovement.x;
                p.y = resolvedMovement.y;
                p.facing = dx >= 0 ? 'right' : 'left';
                p.isMoving = resolvedMovement.moved;

                if (!resolvedMovement.moved) {
                  bState.path = [];
                  bState.pathIdx = 0;
                } else if (
                  Math.hypot(
                    currentWaypoint.x - resolvedMovement.x,
                    currentWaypoint.y - resolvedMovement.y,
                  ) <= 3
                ) {
                  bState.pathIdx += 1;
                }
              }

              if (bState.pathIdx >= bState.path.length && bState.path.length > 0) {
                bState.pauseTicks = Math.floor(Math.random() * 8) + 4;
                p.isMoving = false;
              }
            }
          }
        }


        // If a bot reported a dead body, trigger emergency meeting!
        if (triggeredReport && reportingBotId && updatedPlayers[reportingBotId]) {
          const reporter = updatedPlayers[reportingBotId];
          sound.playEmergencySiren();
          const nextMeetingState: GameState = {
            ...prev,
            phase: 'meeting',
            players: updatedPlayers,
            deadBodies: updatedDeadBodies,
            meetingReporterName: reporter.name,
            meetingReporterColor: reporter.color,
            isEmergencyMeeting: false,
            meetingPhase: 'discussion',
            meetingTimer: prev.settings.discussionTime,
            activeSabotage: null,
            completedTasksCount: updatedCompletedTasksCount,
          };
          networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: nextMeetingState });
          return nextMeetingState;
        }


        const nextState: GameState = {
          ...prev,
          players: updatedPlayers,
          deadBodies: updatedDeadBodies,
          completedTasksCount: updatedCompletedTasksCount,
          activeSabotage: updatedActiveSabotage,
        };

        const winCheck = checkWinConditions(nextState);
        if (winCheck.winner) {
          nextState.phase = 'game_over';
          nextState.winner = winCheck.winner;
          nextState.winReason = winCheck.winReason;
        }

        if (anyBotMoved) {
          networkRef.current?.broadcast({
            type: 'STATE_SYNC',
            gameState: nextState,
          });
        }

        return nextState;
      });
    }, 200);

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [isHost, gameState.phase, checkWinConditions, updateGameState]);


  // Player Actions: Move, Kill, Report, Meeting, Task, Vent, Sabotage
  const handlePlayerMove = (
    x: number,
    y: number,
    facing: 'left' | 'right',
    isMoving: boolean,
  ) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;

    setLocalPlayer((current) => ({
      ...current,
      x,
      y,
      facing,
      isMoving,
    }));

    const message: NetworkMessage = {
      type: 'PLAYER_MOVE',
      playerId: currentId,
      x,
      y,
      facing,
      isMoving,
    };
    if (isHost) {
      handleHostNetworkMessage(message, currentId);
    } else {
      networkRef.current?.sendToHost(message);
    }
  };


  const handleKillPlayer = (targetId: string, x: number, y: number) => {
    const currentId = localPlayerIdRef.current || localPlayerId;
    if (isHost) {
      handleHostNetworkMessage(
        { type: 'KILL_PLAYER', killerId: currentId, targetId, x, y },
        currentId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'KILL_PLAYER',
        killerId: currentId,
        targetId,
        x,
        y,
      });
    }
  };

  const handleReportBody = (bodyId?: string) => {
    const currentId = localPlayerIdRef.current || localPlayerId;
    if (isHost) {
      handleHostNetworkMessage(
        { type: 'REPORT_BODY', reporterId: currentId, bodyId },
        currentId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'REPORT_BODY',
        reporterId: currentId,
        bodyId,
      });
    }
  };

  const handleEmergencyMeeting = () => {
    const currentId = localPlayerIdRef.current || localPlayerId;
    if (isHost) {
      handleHostNetworkMessage(
        { type: 'EMERGENCY_MEETING', reporterId: currentId },
        currentId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'EMERGENCY_MEETING',
        reporterId: currentId,
      });
    }
  };

  const handleCastVote = (targetId: string | 'skip') => {
    const currentId = localPlayerIdRef.current || localPlayerId;
    if (isHost) {
      handleHostNetworkMessage(
        { type: 'CAST_VOTE', voterId: currentId, targetId },
        currentId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'CAST_VOTE',
        voterId: currentId,
        targetId,
      });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;
    sound.playTaskComplete();

    const message: NetworkMessage = {
      type: 'COMPLETE_TASK',
      playerId: currentId,
      taskId,
    };
    if (isHost) {
      handleHostNetworkMessage(message, currentId);
    } else {
      networkRef.current?.sendToHost(message);
    }
  };


  const handleVentAction = (
    ventId: string,
    action: 'enter' | 'exit' | 'travel',
    targetVentId?: string,
  ) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;

    sound.playVentWhoosh();
    const message: NetworkMessage = {
      type: 'VENT_ACTION',
      playerId: currentId,
      ventId,
      action,
      targetVentId,
    };
    if (isHost) {
      handleHostNetworkMessage(message, currentId);
    } else {
      networkRef.current?.sendToHost(message);
    }
  };


  const handleTriggerSabotage = (sabotageType: SabotageType) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;
    const message: NetworkMessage = { type: 'TRIGGER_SABOTAGE', sabotageType };
    if (isHost) handleHostNetworkMessage(message, currentId);
    else networkRef.current?.sendToHost(message);
  };

  const handleFixSabotage = (sabotageType: SabotageType) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;
    const message: NetworkMessage = {
      type: 'FIX_SABOTAGE',
      sabotageType,
      fixerId: currentId,
    };
    if (isHost) handleHostNetworkMessage(message, currentId);
    else networkRef.current?.sendToHost(message);
  };

  const handleLockDoors = (room: string) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;
    const message: NetworkMessage = { type: 'LOCK_DOORS', room };
    if (isHost) handleHostNetworkMessage(message, currentId);
    else networkRef.current?.sendToHost(message);
  };

  const handleSecurityCamToggle = (active: boolean) => {
    const currentId = localPlayerIdRef.current;
    if (!currentId) return;
    const message: NetworkMessage = {
      type: 'SECURITY_CAM_TOGGLE',
      active,
      viewerId: currentId,
    };
    if (isHost) handleHostNetworkMessage(message, currentId);
    else networkRef.current?.sendToHost(message);
  };

  const handlePlayAgain = () => {
    if (!isHost) return;
    botTargetState.current = {};
    movementCheckpointsRef.current = {};
    botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
    botVoteTimeoutsRef.current = [];

    updateGameState((prev) => {
      const resetPlayers: Record<string, Player> = {};
      Object.entries(prev.players).forEach(([pId, p]) => {
        resetPlayers[pId] = {
          ...p,
          isAlive: true,
          hasVoted: false,
          votedFor: null,
          inVent: false,
          ventId: undefined,
          isMoving: false,
          assignedTasks: [],
          completedTasks: [],
          role: 'unassigned',
          killAvailableAt: undefined,
        };
      });

      const nextLobbyState: GameState = {
        ...prev,
        phase: 'lobby',
        players: resetPlayers,
        deadBodies: [],
        winner: undefined,
        winReason: undefined,
        totalTasksCount: 0,
        completedTasksCount: 0,
        activeSabotage: null,
        sabotageAvailableAt: 0,
        doorAvailableAt: 0,
        securityCamViewers: [],
        isSecurityCamActive: false,
        lockedDoors: {},
        meetingReporterName: undefined,
        meetingReporterColor: undefined,
        meetingPhase: undefined,
        meetingTimer: undefined,
        ejectionData: undefined,
        isEmergencyMeeting: false,
      };

      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextLobbyState,
      });

      return nextLobbyState;
    });
  };

  const handleLeaveRoom = () => {
    botTargetState.current = {};
    botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
    botVoteTimeoutsRef.current = [];
    networkRef.current?.destroy();
    networkRef.current = null;
    setInRoom(false);
    setIsHost(false);
    setRoomCode('');
    setChatMessages([]);
  };

  useEffect(() => {
    return () => {
      networkRef.current?.destroy();
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white">
      {!inRoom ? (
        <MainMenu
          initialRoomCode={initialRoomQuery}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isLoading={isLoading}
          error={error}
        />
      ) : gameState.phase === 'lobby' ? (
        <Lobby
          isHost={isHost}
          roomCode={roomCode}
          localPlayerId={localPlayerId}
          localPlayer={localPlayer}
          players={gameState.players}
          settings={gameState.settings}
          chatMessages={chatMessages}
          onUpdateProfile={handleUpdateProfile}
          onUpdateSettings={handleUpdateSettings}
          onSendMessage={handleSendMessage}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
        />
      ) : gameState.phase === 'role_reveal' ? (

        // Cinematic Role Reveal Screen
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 transform scale-150">
            <AstronautAvatar color={localPlayer.color} hat={localPlayer.hat || 'none'} size={90} />
          </div>
          <h2 className="text-xl font-mono text-slate-400 uppercase tracking-widest mb-2 animate-pulse">
            SHHHHH!
          </h2>
          <div className="my-3">
            <h1
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tighter uppercase ${
                localPlayer.role === 'impostor' ? 'text-red-500 animate-bounce' : 'text-cyan-400'
              }`}
            >
              {localPlayer.role === 'impostor' ? '🔪 IMPOSTOR' : '🛡️ CREWMATE'}
            </h1>
          </div>
          <p className="text-sm font-mono text-slate-300 max-w-md mt-4">
            {localPlayer.role === 'impostor'
              ? 'Sabotiere das Schiff und eliminiere die Besatzung unbemerkt!'
              : 'Erledige deine Aufgaben auf der Skeld und enttarne die Impostors!'}
          </p>
        </div>
      ) : gameState.phase === 'playing' ? (
        <GameCanvas
          localPlayerId={localPlayerId}
          localPlayer={localPlayer}
          players={gameState.players}
          deadBodies={gameState.deadBodies}
          settings={gameState.settings}
          totalTasksCount={gameState.totalTasksCount || 0}
          completedTasksCount={gameState.completedTasksCount || 0}
          activeSabotage={gameState.activeSabotage}
          isSecurityCamActive={gameState.isSecurityCamActive}
          lockedDoors={gameState.lockedDoors}
          onPlayerMove={handlePlayerMove}
          onKillPlayer={handleKillPlayer}
          onReportBody={handleReportBody}
          onEmergencyMeeting={handleEmergencyMeeting}
          onCompleteTask={handleCompleteTask}
          onVentAction={handleVentAction}
          onTriggerSabotage={handleTriggerSabotage}
          onFixSabotage={handleFixSabotage}
          onLockDoors={handleLockDoors}
          onSecurityCamToggle={handleSecurityCamToggle}
        />
      ) : gameState.phase === 'meeting' ? (
        <MeetingModal
          isEmergencyMeeting={gameState.isEmergencyMeeting || false}
          reporterName={gameState.meetingReporterName || 'Jemand'}
          reporterColor={gameState.meetingReporterColor}
          players={gameState.players}
          localPlayerId={localPlayerId}
          localPlayer={localPlayer}
          meetingTimer={gameState.meetingTimer || 0}
          phase={gameState.meetingPhase || 'discussion'}
          chatMessages={chatMessages}
          anonymousVotes={gameState.settings.anonymousVotes}
          onSendMessage={handleSendMessage}
          onCastVote={handleCastVote}
        />
      ) : gameState.phase === 'ejection' && gameState.ejectionData ? (
        <EjectionScreen data={gameState.ejectionData} />
      ) : gameState.phase === 'game_over' && gameState.winner ? (
        <GameOverModal
          winner={gameState.winner}
          winReason={gameState.winReason}
          localPlayerRole={localPlayer.role}
          players={gameState.players}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
        />
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-sm">
          Lade Nebula Deception...
        </div>
      }
    >
      <AmongUsApp />
    </Suspense>
  );
}
