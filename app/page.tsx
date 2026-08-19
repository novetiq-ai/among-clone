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
} from '@/types/game';
import { ALL_TASKS, SPAWN_POSITION, getSpawnPosition, WAYPOINTS, findBotPath, getNearestWaypoint, VENTS } from '@/lib/map-data';
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
  const botTargetState = useRef<Record<string, { targetX: number; targetY: number; path: any[]; pathIdx: number; pauseTicks: number; killCooldownTicks?: number }>>({});

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
      setGameState((prevState) => {
        let newState = { ...prevState };

        switch (msg.type) {
          case 'JOIN_REQUEST': {
            const currentPlayers = Object.values(newState.players);
            if (currentPlayers.length >= newState.settings.maxPlayers) {
              networkRef.current?.sendToPeer(senderId, {
                type: 'JOIN_REJECTED',
                reason: 'Raum ist voll.',
              });
              return prevState;
            }

            const takenColors = currentPlayers.map((p) => p.color);
            let assignedColor = msg.preferredColor;
            if (takenColors.includes(assignedColor)) {
              const available = PLAYER_COLORS.map((c) => c.id).find((c) => !takenColors.includes(c));
              if (available) assignedColor = available;
            }

            const newPlayer: Player = {
              id: senderId,
              name: msg.name || 'Crewmate',
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

            newState.players = {
              ...newState.players,
              [senderId]: newPlayer,
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

            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}-${Math.random()}`,
              senderId: 'system',
              senderName: 'System',
              senderColor: 'white',
              text: `${newPlayer.name} ist dem Raum beigetreten.`,
              timestamp: Date.now(),
              isSystem: true,
            };
            setChatMessages((prev) => [...prev, sysMsg]);
            networkRef.current?.broadcast({ type: 'CHAT_MESSAGE', message: sysMsg });

            return newState;
          }

          case 'PLAYER_UPDATE_PROFILE': {
            if (newState.players[senderId]) {
              const updatedPlayer = {
                ...newState.players[senderId],
                ...(msg.name ? { name: msg.name } : {}),
                ...(msg.color ? { color: msg.color } : {}),
                ...(msg.hat !== undefined ? { hat: msg.hat } : {}),
                ...(msg.isReady !== undefined ? { isReady: msg.isReady } : {}),
              };

              newState.players = {
                ...newState.players,
                [senderId]: updatedPlayer,
              };

              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'UPDATE_SETTINGS': {
            newState.settings = {
              ...newState.settings,
              ...msg.settings,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }

          case 'CHAT_MESSAGE': {
            setChatMessages((prev) => [...prev, msg.message]);
            networkRef.current?.broadcast(msg);
            return prevState;
          }

          case 'PLAYER_MOVE': {
            if (newState.players[senderId]) {
              newState.players = {
                ...newState.players,
                [senderId]: {
                  ...newState.players[senderId],
                  x: msg.x,
                  y: msg.y,
                  facing: msg.facing,
                  isMoving: msg.isMoving,
                  inVent: msg.inVent,
                  ventId: msg.ventId,
                },
              };

              networkRef.current?.broadcast(
                {
                  type: 'PLAYER_MOVE',
                  playerId: senderId,
                  x: msg.x,
                  y: msg.y,
                  facing: msg.facing,
                  isMoving: msg.isMoving,
                  inVent: msg.inVent,
                  ventId: msg.ventId,
                },
                senderId
              );
            }
            return newState;
          }

          case 'KILL_PLAYER': {
            const killer = newState.players[senderId] || (senderId === localPlayerId ? newState.players[localPlayerId] : null);
            const victim = newState.players[msg.targetId];

            // Host Security Validation: Killer must be alive Impostor, victim alive, within range
            if (!killer || !killer.isAlive || killer.role !== 'impostor') return prevState;
            if (!victim || !victim.isAlive) return prevState;

            const dist = Math.hypot(killer.x - victim.x, killer.y - victim.y);
            if (dist > 250) return prevState;

            sound.playKillSound();

            const deadBody: DeadBody = {
              id: `body-${Date.now()}-${msg.targetId}`,
              playerId: victim.id,
              playerName: victim.name,
              color: victim.color,
              x: msg.x,
              y: msg.y,
              reported: false,
            };

            newState.deadBodies = [...newState.deadBodies, deadBody];
            newState.players = {
              ...newState.players,
              [msg.targetId]: {
                ...victim,
                isAlive: false,
              },
            };

            const winCheck = checkWinConditions(newState);
            if (winCheck.winner) {
              newState.phase = 'game_over';
              newState.winner = winCheck.winner;
              newState.winReason = winCheck.winReason;
            }

            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }

          case 'REPORT_BODY':
          case 'EMERGENCY_MEETING': {
            if (newState.phase === 'playing') {
              const currentLocalId = localPlayerIdRef.current || localPlayerId;
              const senderKey = senderId || (msg as any).reporterId || currentLocalId;
              const reporter =
                newState.players[senderKey] ||
                (currentLocalId ? newState.players[currentLocalId] : null) ||
                Object.values(newState.players).find((p) => p.isAlive && !p.inVent) ||
                Object.values(newState.players)[0];

              if (!reporter || !reporter.isAlive || reporter.inVent) return prevState;

              if (msg.type === 'EMERGENCY_MEETING') {
                const meetingsLeft = reporter.emergencyMeetingsLeft ?? newState.settings.emergencyMeetings;
                if (meetingsLeft <= 0 || newState.activeSabotage) return prevState;
                newState.players = {
                  ...newState.players,
                  [reporter.id]: {
                    ...reporter,
                    emergencyMeetingsLeft: meetingsLeft - 1,
                  },
                };
              } else if (msg.type === 'REPORT_BODY') {
                // Mark all dead bodies as reported
                newState.deadBodies = newState.deadBodies.map((b) => ({
                  ...b,
                  reported: true,
                }));
              }

              sound.playEmergencySiren();
              newState.phase = 'meeting';
              newState.meetingReporterName = reporter?.name || 'Unbekannt';
              newState.meetingReporterColor = reporter?.color || 'red';
              newState.isEmergencyMeeting = msg.type === 'EMERGENCY_MEETING';
              newState.meetingPhase = 'discussion';
              newState.meetingTimer = newState.settings.discussionTime;

              // Clear active sabotages when meeting starts
              newState.activeSabotage = null;

              // Reset votes immutably
              const resetPlayers: Record<string, Player> = {};
              for (const [pId, p] of Object.entries(newState.players)) {
                resetPlayers[pId] = {
                  ...p,
                  hasVoted: false,
                  votedFor: null,
                  inVent: false,
                };
              }
              newState.players = resetPlayers;

              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'CAST_VOTE': {
            const voter = newState.players[senderId] || (senderId === localPlayerId ? newState.players[localPlayerId] : null);
            if (
              newState.phase === 'meeting' &&
              newState.meetingPhase === 'voting' &&
              voter &&
              voter.isAlive &&
              !voter.hasVoted
            ) {
              sound.playButtonClick();
              newState.players = {
                ...newState.players,
                [voter.id]: {
                  ...voter,
                  hasVoted: true,
                  votedFor: msg.targetId,
                },
              };

              // Check if all alive players have voted
              const alivePlayers = Object.values(newState.players).filter((p) => p.isAlive);
              const allVoted = alivePlayers.every((p) => p.hasVoted);

              if (allVoted) {
                newState.meetingTimer = 1; // Jump to results
              }

              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'COMPLETE_TASK': {
            const player = newState.players[senderId] || (senderId === localPlayerId ? newState.players[localPlayerId] : null);
            if (player && player.isAlive && !player.completedTasks.includes(msg.taskId) && player.assignedTasks.includes(msg.taskId)) {
              const updatedTasks = [...player.completedTasks, msg.taskId];
              newState.players = {
                ...newState.players,
                [player.id]: {
                  ...player,
                  completedTasks: updatedTasks,
                },
              };
              
              // Only Crewmates advance the global task bar
              if (player.role !== 'impostor') {
                newState.completedTasksCount = (newState.completedTasksCount || 0) + 1;
              }

              if (player.id === localPlayerId) {
                setLocalPlayer((curr) => ({
                  ...curr,
                  completedTasks: curr.completedTasks.includes(msg.taskId) ? curr.completedTasks : [...curr.completedTasks, msg.taskId],
                }));
              }

              const winCheck = checkWinConditions(newState);
              if (winCheck.winner) {
                newState.phase = 'game_over';
                newState.winner = winCheck.winner;
                newState.winReason = winCheck.winReason;
              }

              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'VENT_ACTION': {
            const player = newState.players[senderId] || (senderId === localPlayerId ? newState.players[localPlayerId] : null);
            if (player && player.isAlive && player.role === 'impostor') {
              sound.playVentWhoosh();

              // Validate vent connections if traveling
              if (msg.action === 'travel' && msg.targetVentId) {
                const currentVent = VENTS.find((v) => v.id === player.ventId);
                if (!currentVent || !currentVent.connectedVents.includes(msg.targetVentId)) {
                  return prevState;
                }
              }

              const activeVentId = msg.action === 'travel' && msg.targetVentId ? msg.targetVentId : msg.ventId;
              const vent = VENTS.find((v) => v.id === activeVentId);

              const updatedPlayer: Player = { ...player };

              if (msg.action === 'enter') {
                updatedPlayer.inVent = true;
                updatedPlayer.ventId = msg.ventId;
                if (vent) {
                  updatedPlayer.x = vent.x;
                  updatedPlayer.y = vent.y;
                }
              } else if (msg.action === 'exit') {
                updatedPlayer.inVent = false;
                updatedPlayer.ventId = undefined;
                if (vent) {
                  updatedPlayer.x = vent.x;
                  updatedPlayer.y = vent.y;
                }
              } else if (msg.action === 'travel' && msg.targetVentId) {
                updatedPlayer.inVent = true;
                updatedPlayer.ventId = msg.targetVentId;
                if (vent) {
                  updatedPlayer.x = vent.x;
                  updatedPlayer.y = vent.y;
                }
              }

              newState.players = {
                ...newState.players,
                [player.id]: updatedPlayer,
              };

              if (player.id === localPlayerId) {
                setLocalPlayer((prev) => ({
                  ...prev,
                  inVent: updatedPlayer.inVent,
                  ventId: updatedPlayer.ventId,
                  x: updatedPlayer.x,
                  y: updatedPlayer.y,
                }));
              }

              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'TRIGGER_SABOTAGE': {
            const sender = newState.players[senderId] || (senderId === localPlayerId ? newState.players[localPlayerId] : null);
            if (!sender || !sender.isAlive || sender.role !== 'impostor') return prevState;

            playSabotageAlarm();
            const countdown = msg.sabotageType === 'reactor' || msg.sabotageType === 'o2' ? 30 : 0;
            newState.activeSabotage = {
              type: msg.sabotageType,
              countdown,
              requiredFixes: msg.sabotageType === 'reactor' ? 2 : 1,
              currentFixes: 0,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }

          case 'FIX_SABOTAGE': {
            if (newState.activeSabotage && newState.activeSabotage.type === msg.sabotageType) {
              newState.activeSabotage = null;
              networkRef.current?.broadcast({
                type: 'STATE_SYNC',
                gameState: newState,
              });
            }
            return newState;
          }

          case 'LOCK_DOORS': {
            playDoorLock();
            newState.lockedDoors = {
              ...(newState.lockedDoors || {}),
              [msg.room]: Date.now() + 10000,
            };
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }

          case 'SECURITY_CAM_TOGGLE': {
            newState.isSecurityCamActive = msg.active;
            networkRef.current?.broadcast({
              type: 'STATE_SYNC',
              gameState: newState,
            });
            return newState;
          }

          default:
            return prevState;
        }
      });
    },
    [checkWinConditions, localPlayerId]
  );

  // Client Message Processor
  const handleClientNetworkMessage = useCallback(
    (msg: NetworkMessage) => {
      switch (msg.type) {
        case 'JOIN_ACCEPTED': {
          setLocalPlayerId(msg.playerId);
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
          setGameState((prevState) => {
            const newPlayers = { ...msg.gameState.players };
            // If currently in playing phase, preserve our live coordinates in local gameState
            if (msg.gameState.phase === 'playing' && localPlayerId && prevState.players[localPlayerId]) {
              newPlayers[localPlayerId] = {
                ...newPlayers[localPlayerId],
                x: prevState.players[localPlayerId].x,
                y: prevState.players[localPlayerId].y,
                facing: prevState.players[localPlayerId].facing,
                isMoving: prevState.players[localPlayerId].isMoving,
              };
            }
            return {
              ...msg.gameState,
              players: newPlayers,
            };
          });

          setLocalPlayerId((id) => {
            if (id && msg.gameState.players[id]) {
              const serverP = msg.gameState.players[id];
              setLocalPlayer((curr) => {
                // If in active playing phase, preserve local player live movement
                if (msg.gameState.phase === 'playing' && curr.id === id) {
                  return {
                    ...serverP,
                    x: curr.x,
                    y: curr.y,
                    facing: curr.facing,
                    isMoving: curr.isMoving,
                  };
                }
                return serverP;
              });
            }
            return id;
          });
          break;
        }

        case 'PLAYER_MOVE': {
          if (msg.playerId === localPlayerId) break;
          setGameState((prev) => {
            if (prev.players[msg.playerId]) {
              return {
                ...prev,
                players: {
                  ...prev.players,
                  [msg.playerId]: {
                    ...prev.players[msg.playerId],
                    x: msg.x,
                    y: msg.y,
                    facing: msg.facing,
                    isMoving: msg.isMoving,
                    inVent: msg.inVent,
                    ventId: msg.ventId,
                  },
                },
              };
            }
            return prev;
          });
          break;
        }

        case 'CHAT_MESSAGE': {
          setChatMessages((prev) => [...prev, msg.message]);
          break;
        }

        default:
          break;
      }
    },
    [localPlayerId]
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

      const hostPlayer: Player = {
        id: peerId,
        name: playerName,
        color,
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
      };


      setLocalPlayerId(peerId);
      setIsHost(true);
      setRoomCode(code);
      setLocalPlayer(hostPlayer);
      setGameState(initialGameState);
      setInRoom(true);

      net.onMessage(handleHostNetworkMessage);

      net.onDisconnect((disconnectedPeerId) => {
        setGameState((prev) => {
          const updatedPlayers = { ...prev.players };
          const leavingPlayer = updatedPlayers[disconnectedPeerId];
          const leavingName = leavingPlayer?.name || 'Ein Spieler';
          delete updatedPlayers[disconnectedPeerId];

          let newTotalTasks = prev.totalTasksCount;
          let newCompletedTasks = prev.completedTasksCount;
          if (leavingPlayer && leavingPlayer.role !== 'impostor' && prev.phase !== 'lobby') {
            newTotalTasks = Math.max(0, (newTotalTasks || 0) - leavingPlayer.assignedTasks.length);
            newCompletedTasks = Math.max(0, (newCompletedTasks || 0) - leavingPlayer.completedTasks.length);
          }

          let updatedState: GameState = {
            ...prev,
            players: updatedPlayers,
            totalTasksCount: newTotalTasks,
            completedTasksCount: newCompletedTasks,
          };

          const winCheck = checkWinConditions(updatedState);
          if (winCheck.winner) {
            updatedState.phase = 'game_over';
            updatedState.winner = winCheck.winner;
            updatedState.winReason = winCheck.winReason;
          }

          net.broadcast({
            type: 'STATE_SYNC',
            gameState: updatedState,
          });

          const leaveMsg: ChatMessage = {
            id: `leave-${Date.now()}`,
            senderId: 'system',
            senderName: 'System',
            senderColor: 'white',
            text: `${leavingName} hat das Spiel verlassen.`,
            timestamp: Date.now(),
            isSystem: true,
          };
          setChatMessages((c) => [...c, leaveMsg]);
          net.broadcast({ type: 'CHAT_MESSAGE', message: leaveMsg });

          return updatedState;
        });
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Erstellen des Raums.');
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Konnte dem Raum nicht beitreten.');
      setIsLoading(false);
    }
  };

  // Update profile in Lobby
  const handleUpdateProfile = (name: string, color: PlayerColor, isReady: boolean, hat?: HatType) => {
    if (isHost) {
      setGameState((prev) => {
        const updatedHost = {
          ...prev.players[localPlayerId],
          name,
          color,
          hat: hat ?? prev.players[localPlayerId]?.hat ?? 'none',
          isReady: true,
        };
        const newState = {
          ...prev,
          players: {
            ...prev.players,
            [localPlayerId]: updatedHost,
          },
        };
        setLocalPlayer(updatedHost);
        networkRef.current?.broadcast({
          type: 'STATE_SYNC',
          gameState: newState,
        });
        return newState;
      });
    } else {
      setLocalPlayer((prev) => ({ ...prev, name, color, isReady, hat: hat ?? prev.hat ?? 'none' }));
      networkRef.current?.sendToHost({
        type: 'PLAYER_UPDATE_PROFILE',
        name,
        color,
        hat,
        isReady,
      });
    }
  };


  // Add Bot to Lobby (Host Only)
  const handleAddBot = useCallback(() => {
    if (!isHost) return;
    setGameState((prev) => {
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
  }, [isHost]);

  // Remove Bot from Lobby (Host Only)
  const handleRemoveBot = useCallback((botIdToRemove?: string) => {
    if (!isHost) return;
    setGameState((prev) => {
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
  }, [isHost]);

  // Update Game Settings (Host only) with dynamic bot count sync
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    if (!isHost) return;
    setGameState((prev) => {
      if (prev.phase !== 'lobby') return prev;
      let updatedPlayers = { ...prev.players };

      // Handle dynamic bot count adjustment
      if (newSettings.botCount !== undefined) {
        const targetBotCount = newSettings.botCount;
        const currentBots = Object.values(updatedPlayers).filter((p) => p.isBot);
        const currentBotCount = currentBots.length;

        if (targetBotCount === 0) {
          // Remove all bots
          currentBots.forEach((b) => {
            delete updatedPlayers[b.id];
          });
        } else if (targetBotCount > currentBotCount) {
          // Add extra bots
          const needed = targetBotCount - currentBotCount;
          for (let i = 0; i < needed; i++) {
            const currentList = Object.values(updatedPlayers);
            if (currentList.length >= prev.settings.maxPlayers) break;
            const takenColors = currentList.map((p) => p.color);
            const availableColors = PLAYER_COLORS.map((c) => c.id).filter((c) => !takenColors.includes(c));
            const botColor = availableColors[0] || 'yellow';
            const botNames = ['Orion', 'Nova', 'Pulsar', 'Cosmo', 'Orbit', 'AstroBot', 'Blauhelm', 'Sternenpilot', 'Atlas', 'Titan'];
            const existingBotNames = currentList.filter((p) => p.isBot).map((p) => p.name);
            const name = botNames.find((n) => !existingBotNames.includes(n)) || `Bot ${currentList.length + 1}`;
            const randomHat = HATS[Math.floor(Math.random() * HATS.length)].id;
            const botId = `bot_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`;
            const spawnPos = getSpawnPosition(currentList.length);

            updatedPlayers[botId] = {
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
          }
        } else if (targetBotCount < currentBotCount) {
          // Remove excess bots
          const toRemove = currentBotCount - targetBotCount;
          for (let i = 0; i < toRemove; i++) {
            const remainingBots = Object.values(updatedPlayers).filter((p) => p.isBot);
            if (remainingBots.length > 0) {
              const lastBot = remainingBots[remainingBots.length - 1];
              delete updatedPlayers[lastBot.id];
            }
          }
        }
      }

      const nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        settings: {
          ...prev.settings,
          ...newSettings,
        },
      };

      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });

      return nextState;
    });
  }, [isHost]);

  // Send Chat Message
  const handleSendMessage = (text: string, isDeadOnly?: boolean) => {
    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random()}`,
      senderId: localPlayerId,
      senderName: localPlayer.name,
      senderColor: localPlayer.color,
      text,
      timestamp: Date.now(),
      isDeadOnly,
    };

    setChatMessages((prev) => [...prev, msg]);

    if (isHost) {
      networkRef.current?.broadcast({
        type: 'CHAT_MESSAGE',
        message: msg,
      });
    } else {
      networkRef.current?.sendToHost({
        type: 'CHAT_MESSAGE',
        message: msg,
      });
    }
  };

  // START GAME (Host Authoritative Setup)
  const handleStartGame = () => {
    if (!isHost) return;

    setGameState((prev) => {
      const playersMap = { ...prev.players };
      const currentCount = Object.keys(playersMap).length;
      const currentBots = Object.values(playersMap).filter((p) => p.isBot).length;

      // Only spawn additional bots if explicitly configured in settings and not already in lobby
      if (prev.settings.botCount > 0 && currentBots < prev.settings.botCount) {
        const neededBots = Math.max(0, Math.min(prev.settings.botCount - currentBots, prev.settings.maxPlayers - currentCount));
        const takenColors = Object.values(playersMap).map((p) => p.color);
        const availableColors = PLAYER_COLORS.map((c) => c.id).filter((c) => !takenColors.includes(c));

        for (let i = 0; i < neededBots; i++) {
          const botId = `bot_${Date.now()}_${i}`;
          const botColor = availableColors[i] || 'yellow';
          const botNames = ['Blauhelm', 'Sternenpilot', 'AstroBot', 'Orion', 'Nova', 'Pulsar', 'Cosmo', 'Orbit'];
          const spawnPos = getSpawnPosition(currentCount + i);
          const randomHat = HATS[Math.floor(Math.random() * HATS.length)].id;
          playersMap[botId] = {
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
      }

      const allPlayerIds = Object.keys(playersMap);
      const shuffledIds = [...allPlayerIds].sort(() => 0.5 - Math.random());

      // Assign Impostor(s)
      const impostorCount = Math.min(prev.settings.impostorCount, Math.floor(allPlayerIds.length / 2) || 1);
      const impostorIds = shuffledIds.slice(0, impostorCount);

      // Assign Tasks to Crewmates (and Fake Tasks to Impostors)
      let totalTasksNeeded = 0;

      allPlayerIds.forEach((pId, idx) => {
        const isImpostor = impostorIds.includes(pId);
        const spawnPos = getSpawnPosition(idx);
        playersMap[pId].role = isImpostor ? 'impostor' : 'crewmate';
        playersMap[pId].isAlive = true;
        playersMap[pId].inVent = false;
        playersMap[pId].x = spawnPos.x;
        playersMap[pId].y = spawnPos.y;

        // Pick tasks ensuring diverse types across different rooms (no duplicate minigame types per player)
        const shuffledTasks = [...ALL_TASKS].sort(() => 0.5 - Math.random());
        const chosenTasks: typeof ALL_TASKS = [];
        const usedTypes = new Set<string>();

        for (const t of shuffledTasks) {
          if (!usedTypes.has(t.type)) {
            chosenTasks.push(t);
            usedTypes.add(t.type);
            if (chosenTasks.length >= prev.settings.totalTasksPerPlayer) break;
          }
        }

        if (chosenTasks.length < prev.settings.totalTasksPerPlayer) {
          for (const t of shuffledTasks) {
            if (!chosenTasks.some((c) => c.id === t.id)) {
              chosenTasks.push(t);
              if (chosenTasks.length >= prev.settings.totalTasksPerPlayer) break;
            }
          }
        }


        const assigned = chosenTasks.map((t) => t.id);
        playersMap[pId].assignedTasks = assigned;
        playersMap[pId].completedTasks = [];
        playersMap[pId].emergencyMeetingsLeft = prev.settings.emergencyMeetings;

        if (!isImpostor) {
          totalTasksNeeded += assigned.length;
        }
      });

      const nextState: GameState = {
        ...prev,
        phase: 'role_reveal',
        players: playersMap,
        deadBodies: [],
        totalTasksCount: totalTasksNeeded,
        completedTasksCount: 0,
      };

      setLocalPlayer(playersMap[localPlayerId]);

      networkRef.current?.broadcast({
        type: 'STATE_SYNC',
        gameState: nextState,
      });

      // Role reveal for 3.5 seconds, then playing phase
      setTimeout(() => {
        setGameState((current) => {
          if (current.phase !== 'role_reveal') return current;
          const playingState: GameState = {
            ...current,
            phase: 'playing',
          };
          networkRef.current?.broadcast({
            type: 'STATE_SYNC',
            gameState: playingState,
          });
          return playingState;
        });
      }, 3500);

      return nextState;
    });
  };

  // Host Meeting Timer Ticker & Bot AI
  useEffect(() => {
    if (!isHost) return;

    if (gameState.phase === 'meeting') {
      meetingIntervalRef.current = setInterval(() => {
        setGameState((prev) => {
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
                  setGameState((s) => {
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
              setGameState((curr) => {
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

                // Resume match & respawn players in Cafeteria
                const respawnPlayers = { ...curr.players };
                Object.values(respawnPlayers).forEach((p, idx) => {
                  const spawnPos = getSpawnPosition(idx);
                  p.x = spawnPos.x;
                  p.y = spawnPos.y;
                  p.hasVoted = false;
                  p.votedFor = null;
                  p.inVent = false;
                });

                const resumeState: GameState = {
                  ...curr,
                  phase: 'playing',
                  players: respawnPlayers,
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
  }, [gameState.phase, isHost, checkWinConditions]);

  // Host Sabotage Crisis Countdown Loop
  useEffect(() => {
    if (!isHost || gameState.phase !== 'playing') {
      if (sabotageIntervalRef.current) clearInterval(sabotageIntervalRef.current);
      return;
    }

    sabotageIntervalRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase !== 'playing' || !prev.activeSabotage) return prev;

        const currentSab = prev.activeSabotage;
        if (currentSab.countdown <= 0 && (currentSab.type === 'reactor' || currentSab.type === 'o2')) {
          // Sabotage timed out -> Impostors Win immediately!
          const overState: GameState = {
            ...prev,
            phase: 'game_over',
            winner: 'impostors',
            winReason:
              currentSab.type === 'reactor'
                ? 'Kritische Reaktorschmelze! Die Skeld wurde zerstört.'
                : 'Sauerstoff erschöpft! Die Besatzung konnte nicht gerettet werden.',
            activeSabotage: null,
          };
          networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: overState });
          return overState;
        }

        if (currentSab.countdown > 0) {
          const updatedSab = {
            ...currentSab,
            countdown: currentSab.countdown - 1,
          };
          const updatedState = {
            ...prev,
            activeSabotage: updatedSab,
          };
          networkRef.current?.broadcast({ type: 'STATE_SYNC', gameState: updatedState });
          return updatedState;
        }

        return prev;
      });
    }, 1000);

    return () => {
      if (sabotageIntervalRef.current) clearInterval(sabotageIntervalRef.current);
    };
  }, [isHost, gameState.phase]);

  // Host Bot Simulation Loop (Waypoint NavMesh Pathfinding, Stealth Kills & Body Reports)
  useEffect(() => {
    if (!isHost || gameState.phase !== 'playing') {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      return;
    }

    botIntervalRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase !== 'playing') return prev;


        const updatedPlayers = { ...prev.players };
        let updatedDeadBodies = [...prev.deadBodies];
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
            if (!bState.path || bState.path.length === 0 || bState.pathIdx >= bState.path.length) {
              let targetX = p.x;
              let targetY = p.y;

              // Alive Crewmate bots prioritize sabotage repair
              if (p.isAlive && updatedActiveSabotage && p.role !== 'impostor' && Math.random() < 0.6) {
                if (updatedActiveSabotage.type === 'lights') {
                  targetX = 670;
                  targetY = 960;
                } else if (updatedActiveSabotage.type === 'reactor') {
                  targetX = 140;
                  targetY = 720;
                } else if (updatedActiveSabotage.type === 'o2') {
                  targetX = 1740;
                  targetY = 800;
                }
              } else {
                // Ghost or living crewmate navigates to assigned task
                const unfinishedTask = p.assignedTasks.find((tId) => !p.completedTasks.includes(tId));
                const foundTaskDef = unfinishedTask ? ALL_TASKS.find((t) => t.id === unfinishedTask) : null;
                const targetTask = foundTaskDef || ALL_TASKS[Math.floor(Math.random() * ALL_TASKS.length)];
                targetX = targetTask.x;
                targetY = targetTask.y;
              }

              const path = findBotPath(p.x, p.y, targetX, targetY);
              bState.targetX = targetX;
              bState.targetY = targetY;
              bState.path = path;
              bState.pathIdx = 0;
              bState.pauseTicks = 0;
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
                  const sab = updatedActiveSabotage;
                  let atSab = false;
                  if (sab.type === 'lights' && Math.hypot(p.x - 670, p.y - 960) < 100) atSab = true;
                  if (sab.type === 'reactor' && Math.hypot(p.x - 140, p.y - 720) < 100) atSab = true;
                  if (sab.type === 'o2' && Math.hypot(p.x - 1740, p.y - 800) < 100) atSab = true;
                  if (atSab) {
                    updatedActiveSabotage = null;
                  }
                }
              }
              continue;
            }

            const currentWaypoint = bState.path[bState.pathIdx];
            if (currentWaypoint) {
              const dx = currentWaypoint.x - p.x;
              const dy = currentWaypoint.y - p.y;
              const dist = Math.hypot(dx, dy);

              const botSpeed = 24 * prev.settings.playerSpeed;

              if (dist < botSpeed) {
                p.x = currentWaypoint.x;
                p.y = currentWaypoint.y;
                bState.pathIdx++;

                // If finished path, pause at destination
                if (bState.pathIdx >= bState.path.length) {
                  bState.pauseTicks = Math.floor(Math.random() * 8) + 4;
                  p.isMoving = false;
                }
              } else {
                p.x += (dx / dist) * botSpeed;
                p.y += (dy / dist) * botSpeed;
                p.facing = dx >= 0 ? 'right' : 'left';
                p.isMoving = true;
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
  }, [isHost, gameState.phase, checkWinConditions]);


  // Player Actions: Move, Kill, Report, Meeting, Task, Vent, Sabotage
  const handlePlayerMove = (
    x: number,
    y: number,
    facing: 'left' | 'right',
    isMoving: boolean,
    inVent?: boolean,
    ventId?: string
  ) => {
    setLocalPlayer((prev) => ({ ...prev, x, y, facing, isMoving, inVent, ventId }));

    if (isHost) {
      setGameState((prev) => {
        const next = {
          ...prev,
          players: {
            ...prev.players,
            [localPlayerId]: {
              ...prev.players[localPlayerId],
              x,
              y,
              facing,
              isMoving,
              inVent,
              ventId,
            },
          },
        };
        networkRef.current?.broadcast(
          {
            type: 'PLAYER_MOVE',
            playerId: localPlayerId,
            x,
            y,
            facing,
            isMoving,
            inVent,
            ventId,
          },
          localPlayerId
        );
        return next;
      });
    } else {
      networkRef.current?.sendToHost({
        type: 'PLAYER_MOVE',
        playerId: localPlayerId,
        x,
        y,
        facing,
        isMoving,
        inVent,
        ventId,
      });
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
    sound.playTaskComplete();
    setLocalPlayer((prev) => {
      if (prev.completedTasks.includes(taskId)) return prev;
      return {
        ...prev,
        completedTasks: [...prev.completedTasks, taskId],
      };
    });

    if (isHost) {
      handleHostNetworkMessage(
        { type: 'COMPLETE_TASK', playerId: localPlayerId, taskId },
        localPlayerId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'COMPLETE_TASK',
        playerId: localPlayerId,
        taskId,
      });
    }
  };

  const handleVentAction = (ventId: string, action: 'enter' | 'exit' | 'travel', targetVentId?: string) => {
    const activeVentId = action === 'travel' && targetVentId ? targetVentId : ventId;
    const targetVent = VENTS.find((v) => v.id === activeVentId);
    const targetX = targetVent ? targetVent.x : localPlayer.x;
    const targetY = targetVent ? targetVent.y : localPlayer.y;

    const inVent = action !== 'exit';
    const ventIdentifier = action === 'exit' ? undefined : activeVentId;

    // Immediately update local player state for instant responsiveness
    setLocalPlayer((prev) => ({
      ...prev,
      x: targetX,
      y: targetY,
      inVent,
      ventId: ventIdentifier,
    }));

    sound.playVentWhoosh();

    if (isHost) {
      handleHostNetworkMessage(
        { type: 'VENT_ACTION', playerId: localPlayerId, ventId, action, targetVentId },
        localPlayerId
      );
    } else {
      networkRef.current?.sendToHost({
        type: 'VENT_ACTION',
        playerId: localPlayerId,
        ventId,
        action,
        targetVentId,
      });
      networkRef.current?.sendToHost({
        type: 'PLAYER_MOVE',
        playerId: localPlayerId,
        x: targetX,
        y: targetY,
        facing: localPlayer.facing,
        isMoving: false,
        inVent,
        ventId: ventIdentifier,
      });
    }
  };

  const handleTriggerSabotage = (sabotageType: SabotageType) => {
    if (isHost) {
      handleHostNetworkMessage({ type: 'TRIGGER_SABOTAGE', sabotageType }, localPlayerId);
    } else {
      networkRef.current?.sendToHost({ type: 'TRIGGER_SABOTAGE', sabotageType });
    }
  };

  const handleFixSabotage = (sabotageType: SabotageType) => {
    if (isHost) {
      handleHostNetworkMessage({ type: 'FIX_SABOTAGE', sabotageType, fixerId: localPlayerId }, localPlayerId);
    } else {
      networkRef.current?.sendToHost({ type: 'FIX_SABOTAGE', sabotageType, fixerId: localPlayerId });
    }
  };

  const handleLockDoors = (room: string) => {
    if (isHost) {
      handleHostNetworkMessage({ type: 'LOCK_DOORS', room }, localPlayerId);
    } else {
      networkRef.current?.sendToHost({ type: 'LOCK_DOORS', room });
    }
  };

  const handleSecurityCamToggle = (active: boolean) => {
    if (isHost) {
      handleHostNetworkMessage({ type: 'SECURITY_CAM_TOGGLE', active, viewerId: localPlayerId }, localPlayerId);
    } else {
      networkRef.current?.sendToHost({ type: 'SECURITY_CAM_TOGGLE', active, viewerId: localPlayerId });
    }
  };

  const handlePlayAgain = () => {
    if (!isHost) return;
    botTargetState.current = {};
    botVoteTimeoutsRef.current.forEach((t) => clearTimeout(t));
    botVoteTimeoutsRef.current = [];

    setGameState((prev) => {
      const resetPlayers: Record<string, Player> = {};
      Object.entries(prev.players).forEach(([pId, p]) => {
        resetPlayers[pId] = {
          ...p,
          isAlive: true,
          hasVoted: false,
          votedFor: null,
          inVent: false,
          assignedTasks: [],
          completedTasks: [],
          role: 'unassigned',
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
        isSecurityCamActive: false,
        lockedDoors: {},
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
          Lade Among Us P2P...
        </div>
      }
    >
      <AmongUsApp />
    </Suspense>
  );
}
