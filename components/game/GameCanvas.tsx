'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Player,
  DeadBody,
  TaskDefinition,
  GameSettings,
  VentDefinition,
  ActiveSabotage,
  SabotageType,
  PlayerColor,
  HatType,
} from '@/types/game';
import {
  ALL_TASKS,
  VENTS,
  EMERGENCY_BUTTON_POS,
  MAP_WIDTH,
  MAP_HEIGHT,
  resolvePlayerMovement,
  getCurrentRoomName,
} from '@/lib/map-data';
import { drawTheSkeld, hasLineOfSight } from './TheSkeldMap';
import { TaskModal } from './tasks/TaskModal';
import { VirtualJoystick } from './VirtualJoystick';
import { SkeldMinimapModal } from './SkeldMinimapModal';
import { CCTVModal } from './CCTVModal';
import { AdminTableModal } from './AdminTableModal';
import { SabotageModal } from './SabotageModal';
import { KillAnimationOverlay } from './KillAnimationOverlay';
import { sound, playSabotageAlarm } from '@/lib/sound';
import {
  Skull,
  Megaphone,
  Wrench,
  Compass,
  Map as MapIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Gamepad2,
  Camera,
  Flame,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface GameCanvasProps {
  localPlayerId: string;
  localPlayer: Player;
  players: Record<string, Player>;
  deadBodies: DeadBody[];
  settings: GameSettings;
  totalTasksCount: number;
  completedTasksCount: number;
  activeSabotage?: ActiveSabotage | null;
  isSecurityCamActive?: boolean;
  lockedDoors?: Record<string, number>;
  onPlayerMove: (
    x: number,
    y: number,
    facing: 'left' | 'right',
    isMoving: boolean,
    inVent?: boolean,
    ventId?: string
  ) => void;
  onKillPlayer: (targetId: string, x: number, y: number) => void;
  onReportBody: (bodyId?: string) => void;
  onEmergencyMeeting: () => void;
  onCompleteTask: (taskId: string) => void;
  onVentAction: (ventId: string, action: 'enter' | 'exit' | 'travel', targetVentId?: string) => void;
  onTriggerSabotage?: (type: SabotageType) => void;
  onFixSabotage?: (type: SabotageType) => void;
  onLockDoors?: (room: string) => void;
  onSecurityCamToggle?: (active: boolean) => void;
}

export function GameCanvas({
  localPlayerId,
  localPlayer,
  players,
  deadBodies,
  settings,
  totalTasksCount,
  completedTasksCount,
  activeSabotage,
  isSecurityCamActive,
  lockedDoors,
  onPlayerMove,
  onKillPlayer,
  onReportBody,
  onEmergencyMeeting,
  onCompleteTask,
  onVentAction,
  onTriggerSabotage,
  onFixSabotage,
  onLockDoors,
  onSecurityCamToggle,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Interactive Modals
  const [activeTask, setActiveTask] = useState<TaskDefinition | null>(null);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showCCTV, setShowCCTV] = useState(false);
  const [showAdminRadar, setShowAdminRadar] = useState(false);
  const [showSabotageModal, setShowSabotageModal] = useState(false);
  const [showTasksList, setShowTasksList] = useState(false);
  const [controlMode, setControlMode] = useState<'joystick' | 'dpad' | 'none'>('joystick');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const [activeKillOverlay, setActiveKillOverlay] = useState<{
    killerColor: PlayerColor;
    killerHat?: HatType;
    victimColor: PlayerColor;
    victimHat?: HatType;
    isVictimLocal: boolean;
  } | null>(null);

  const handleCloseKillOverlay = React.useCallback(() => {
    setActiveKillOverlay(null);
  }, []);

  // Position & Movement state
  const posRef = useRef({ x: localPlayer.x, y: localPlayer.y });
  const facingRef = useRef<'left' | 'right'>(localPlayer.facing);
  const keysPressed = useRef<Record<string, boolean>>({});
  const joystickVectorRef = useRef<{ dx: number; dy: number; isMoving: boolean }>({ dx: 0, dy: 0, isMoving: false });
  const lastSyncTime = useRef<number>(0);
  const wasMovingRef = useRef<boolean>(false);
  const prevAliveRef = useRef(localPlayer.isAlive);
  const lerpedPositions = useRef<Record<string, { x: number; y: number }>>({});

  // Dynamic props kept in refs for silky-smooth 60fps render loop
  const playersRef = useRef(players);
  const localPlayerRef = useRef(localPlayer);
  const deadBodiesRef = useRef(deadBodies);
  const lockedDoorsRef = useRef(lockedDoors);
  const activeSabotageRef = useRef(activeSabotage);
  const isSecurityCamActiveRef = useRef(isSecurityCamActive);
  const activeTaskRef = useRef(activeTask);
  const showCCTVRef = useRef(showCCTV);
  const showAdminRadarRef = useRef(showAdminRadar);
  const showSabotageModalRef = useRef(showSabotageModal);
  const settingsRef = useRef(settings);
  const onPlayerMoveRef = useRef(onPlayerMove);

  useEffect(() => {
    playersRef.current = players;
    localPlayerRef.current = localPlayer;
    deadBodiesRef.current = deadBodies;
    lockedDoorsRef.current = lockedDoors;
    activeSabotageRef.current = activeSabotage;
    isSecurityCamActiveRef.current = isSecurityCamActive;
    activeTaskRef.current = activeTask;
    showCCTVRef.current = showCCTV;
    showAdminRadarRef.current = showAdminRadar;
    showSabotageModalRef.current = showSabotageModal;
    settingsRef.current = settings;
    onPlayerMoveRef.current = onPlayerMove;
  });

  // Detect if local player was killed
  useEffect(() => {
    if (prevAliveRef.current && !localPlayer.isAlive) {
      const killer = Object.values(players).find((p) => p.role === 'impostor');
      setActiveKillOverlay({
        killerColor: killer?.color || 'red',
        killerHat: killer?.hat || 'none',
        victimColor: localPlayer.color,
        victimHat: localPlayer.hat || 'none',
        isVictimLocal: true,
      });
    }
    prevAliveRef.current = localPlayer.isAlive;
  }, [localPlayer.isAlive, localPlayer.color, localPlayer.hat, players]);

  // Cooldown timers
  const [killCooldown, setKillCooldown] = useState(settings.killCooldown);
  const [sabotageCooldown, setSabotageCooldown] = useState(15);
  const [emergencyCooldown, setEmergencyCooldown] = useState(15);

  // Sync cooldowns on role or settings change without cascading render in effect
  const [prevRole, setPrevRole] = useState(localPlayer.role);
  const [prevSettingsCd, setPrevSettingsCd] = useState(settings.killCooldown);

  if (localPlayer.role !== prevRole || settings.killCooldown !== prevSettingsCd) {
    setPrevRole(localPlayer.role);
    setPrevSettingsCd(settings.killCooldown);
    if (localPlayer.role === 'impostor') {
      setKillCooldown(settings.killCooldown);
    }
    setEmergencyCooldown(15);
  }

  // Nearby Action Targets
  const [nearbyTask, setNearbyTask] = useState<TaskDefinition | null>(null);
  const [nearbyEmergencyButton, setNearbyEmergencyButton] = useState(false);
  const [nearbyKillTarget, setNearbyKillTarget] = useState<Player | null>(null);
  const [nearbyDeadBody, setNearbyDeadBody] = useState<DeadBody | null>(null);
  const [nearbyVent, setNearbyVent] = useState<VentDefinition | null>(null);
  const [nearbySecurityDesk, setNearbySecurityDesk] = useState(false);
  const [nearbyAdminTable, setNearbyAdminTable] = useState(false);
  const [nearbyFixSabotage, setNearbyFixSabotage] = useState<SabotageType | null>(null);

  // Current room indicator computed from player coordinates
  const currentRoomName = getCurrentRoomName(localPlayer.x, localPlayer.y);

  // Cooldown countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setKillCooldown((prev) => Math.max(0, prev - 1));
      setSabotageCooldown((prev) => Math.max(0, prev - 1));
      setEmergencyCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Position initialization & Vent jump / Teleport handling
  const initialMountRef = useRef(false);
  const prevVentIdRef = useRef(localPlayer.ventId);
  const ventIndexRef = useRef(0);

  useEffect(() => {
    if (!initialMountRef.current) {
      initialMountRef.current = true;
      if (localPlayer.x !== undefined && localPlayer.y !== undefined) {
        posRef.current = { x: localPlayer.x, y: localPlayer.y };
      }
      return;
    }

    // Update position if vent state changed
    if (localPlayer.inVent && localPlayer.ventId && localPlayer.ventId !== prevVentIdRef.current) {
      const v = VENTS.find((vent) => vent.id === localPlayer.ventId);
      if (v) {
        posRef.current = { x: v.x, y: v.y };
      }
    } else if (localPlayer.x !== undefined && localPlayer.y !== undefined) {
      // If server teleported player (e.g. match start, meeting return)
      const distFromExpected = Math.hypot(posRef.current.x - localPlayer.x, posRef.current.y - localPlayer.y);
      if (distFromExpected > 280) {
        posRef.current = { x: localPlayer.x, y: localPlayer.y };
      }
    }
    prevVentIdRef.current = localPlayer.ventId;
  }, [localPlayer.inVent, localPlayer.ventId, localPlayer.x, localPlayer.y]);

  // Stop player movement immediately when opening any modal
  useEffect(() => {
    if (activeTask || showCCTV || showAdminRadar || showSabotageModal) {
      keysPressed.current = {};
      joystickVectorRef.current = { dx: 0, dy: 0, isMoving: false };
      if (wasMovingRef.current) {
        wasMovingRef.current = false;
        onPlayerMoveRef.current(
          posRef.current.x,
          posRef.current.y,
          facingRef.current,
          false,
          localPlayer.inVent,
          localPlayer.ventId
        );
      }
    }
  }, [activeTask, showCCTV, showAdminRadar, showSabotageModal, localPlayer.inVent, localPlayer.ventId]);

  // Kill Action
  const handleKill = useCallback(() => {
    if (!nearbyKillTarget || killCooldown > 0 || !localPlayer.isAlive || localPlayer.role !== 'impostor') return;
    setActiveKillOverlay({
      killerColor: localPlayer.color,
      killerHat: localPlayer.hat || 'none',
      victimColor: nearbyKillTarget.color,
      victimHat: nearbyKillTarget.hat || 'none',
      isVictimLocal: false,
    });
    onKillPlayer(nearbyKillTarget.id, nearbyKillTarget.x, nearbyKillTarget.y);
    setKillCooldown(settings.killCooldown);
  }, [nearbyKillTarget, killCooldown, localPlayer.isAlive, localPlayer.role, localPlayer.color, localPlayer.hat, onKillPlayer, settings.killCooldown]);

  // Vent Action Toggle (Enter / Exit)
  const handleVentToggle = useCallback(() => {
    if (localPlayer.role !== 'impostor' || !localPlayer.isAlive) return;

    if (localPlayer.inVent) {
      const activeVentId = localPlayer.ventId || (nearbyVent ? nearbyVent.id : undefined) || VENTS[0].id;
      onVentAction(activeVentId, 'exit');
    } else if (nearbyVent) {
      ventIndexRef.current = 0;
      onVentAction(nearbyVent.id, 'enter');
    }
  }, [localPlayer.role, localPlayer.isAlive, localPlayer.inVent, localPlayer.ventId, nearbyVent, onVentAction]);

  // Travel between connected vents
  const handleTravelVent = useCallback((targetVentId: string) => {
    if (!localPlayer.inVent) return;
    const currentVentId = localPlayer.ventId || (nearbyVent ? nearbyVent.id : undefined);
    if (!currentVentId) return;
    const targetVent = VENTS.find((v) => v.id === targetVentId);
    if (!targetVent) return;

    posRef.current = { x: targetVent.x, y: targetVent.y };
    onVentAction(currentVentId, 'travel', targetVentId);
  }, [localPlayer.inVent, localPlayer.ventId, nearbyVent, onVentAction]);

  // Toggle CCTV and notify peers
  const handleToggleCCTV = useCallback((open: boolean) => {
    setShowCCTV(open);
    if (onSecurityCamToggle) {
      onSecurityCamToggle(open);
    }
  }, [onSecurityCamToggle]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTask || showCCTV || showAdminRadar || showSabotageModal) {
        if (e.key === 'Escape') {
          setActiveTask(null);
          handleToggleCCTV(false);
          setShowAdminRadar(false);
          setShowSabotageModal(false);
        }
        return;
      }

      // Handle in-vent keyboard controls
      if (localPlayer.inVent && localPlayer.role === 'impostor') {
        const currVent = localPlayer.ventId ? VENTS.find((v) => v.id === localPlayer.ventId) : nearbyVent;

        // V, Space, E, or Escape to exit vent
        if (e.key.toLowerCase() === 'v' || e.key === ' ' || e.key.toLowerCase() === 'e' || e.key === 'Escape') {
          e.preventDefault();
          handleVentToggle();
          return;
        }

        // 1, 2, 3 to travel to connected vents
        if (currVent && currVent.connectedVents.length > 0) {
          const numVents = currVent.connectedVents.length;
          if (e.key === '1' && currVent.connectedVents[0]) {
            e.preventDefault();
            ventIndexRef.current = 0;
            handleTravelVent(currVent.connectedVents[0]);
            return;
          }
          if (e.key === '2' && currVent.connectedVents[1]) {
            e.preventDefault();
            ventIndexRef.current = 1;
            handleTravelVent(currVent.connectedVents[1]);
            return;
          }
          if (e.key === '3' && currVent.connectedVents[2]) {
            e.preventDefault();
            ventIndexRef.current = 2;
            handleTravelVent(currVent.connectedVents[2]);
            return;
          }
          if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            e.preventDefault();
            ventIndexRef.current = (ventIndexRef.current + 1) % numVents;
            handleTravelVent(currVent.connectedVents[ventIndexRef.current]);
            return;
          }
          if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            e.preventDefault();
            ventIndexRef.current = (ventIndexRef.current - 1 + numVents) % numVents;
            handleTravelVent(currVent.connectedVents[ventIndexRef.current]);
            return;
          }
        }
      }

      keysPressed.current[e.key.toLowerCase()] = true;

      // Space or E for USE / INTERACT
      if (e.key === ' ' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (nearbyEmergencyButton) {
          onEmergencyMeeting();
        } else if (nearbyFixSabotage) {
          if (nearbyFixSabotage === 'lights') {
            setActiveTask({ id: 'fix_lights', type: 'fix_lights', name: 'Lichter reparieren', room: 'Electrical', x: 670, y: 960 });
          } else if (nearbyFixSabotage === 'reactor') {
            setActiveTask({ id: 'fix_reactor', type: 'fix_reactor', name: 'Reaktor stabilisieren', room: 'Reactor', x: 140, y: 720 });
          } else if (onFixSabotage) {
            onFixSabotage(nearbyFixSabotage);
          }
        } else if (nearbySecurityDesk) {
          handleToggleCCTV(true);
        } else if (nearbyAdminTable) {
          setShowAdminRadar(true);
        } else if (nearbyTask) {
          setActiveTask(nearbyTask);
        }
      }

      // Q for KILL (Impostor)
      if (e.key.toLowerCase() === 'q' && localPlayer.role === 'impostor' && nearbyKillTarget && killCooldown === 0) {
        e.preventDefault();
        handleKill();
      }

      // R for REPORT
      if (e.key.toLowerCase() === 'r' && nearbyDeadBody) {
        e.preventDefault();
        onReportBody(nearbyDeadBody.id);
      }

      // V for VENT
      if (e.key.toLowerCase() === 'v' && localPlayer.role === 'impostor') {
        e.preventDefault();
        handleVentToggle();
      }

      // M for MAP
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setShowMinimap((prev) => !prev);
      }

      // X or TAB for SABOTAGE (Impostor)
      if ((e.key.toLowerCase() === 'x' || e.key === 'Tab') && localPlayer.role === 'impostor' && localPlayer.isAlive) {
        e.preventDefault();
        setShowSabotageModal((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleBlur = () => {
      keysPressed.current = {};
      joystickVectorRef.current = { dx: 0, dy: 0, isMoving: false };
      if (wasMovingRef.current) {
        wasMovingRef.current = false;
        onPlayerMoveRef.current(
          posRef.current.x,
          posRef.current.y,
          facingRef.current,
          false,
          localPlayer.inVent,
          localPlayer.ventId
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    activeTask,
    showCCTV,
    showAdminRadar,
    showSabotageModal,
    localPlayer.inVent,
    localPlayer.role,
    localPlayer.ventId,
    localPlayer.isAlive,
    nearbyVent,
    nearbyEmergencyButton,
    nearbyFixSabotage,
    nearbySecurityDesk,
    nearbyAdminTable,
    nearbyTask,
    nearbyKillTarget,
    nearbyDeadBody,
    killCooldown,
    onEmergencyMeeting,
    onFixSabotage,
    onReportBody,
    handleKill,
    handleVentToggle,
    handleTravelVent,
    handleToggleCCTV,
  ]);

  // Main Render & Physics Loop (Runs continuously without stutter or re-mount resets)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const isInteracting = !!activeTaskRef.current || showCCTVRef.current || showAdminRadarRef.current || showSabotageModalRef.current;
          const localP = localPlayerRef.current;
          const curSettings = settingsRef.current;

          // 1. Process Movement with Sub-Stepping Physics (Living players & Ghosts)
          if (!isInteracting && !localP.inVent) {
            let dx = 0;
            let dy = 0;

            if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
            if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
            if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
              dx -= 1;
              facingRef.current = 'left';
            }
            if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
              dx += 1;
              facingRef.current = 'right';
            }

            // Virtual Joystick Input (Touch / D-Pad)
            if (joystickVectorRef.current.isMoving) {
              dx += joystickVectorRef.current.dx;
              dy += joystickVectorRef.current.dy;
              if (joystickVectorRef.current.dx < -0.1) facingRef.current = 'left';
              if (joystickVectorRef.current.dx > 0.1) facingRef.current = 'right';
            }

            const isMoving = dx !== 0 || dy !== 0;

            if (isMoving) {
              wasMovingRef.current = true;
              const mag = Math.hypot(dx, dy);
              if (mag > 1) {
                dx /= mag;
                dy /= mag;
              }

              const baseSpeed = 260 * curSettings.playerSpeed;
              const moveX = dx * baseSpeed * delta;
              const moveY = dy * baseSpeed * delta;

              // Airtight Sub-Stepping Collision Solver with Locked Doors
              const resolved = resolvePlayerMovement(
                posRef.current.x,
                posRef.current.y,
                moveX,
                moveY,
                16,
                !localP.isAlive,
                lockedDoorsRef.current
              );

              posRef.current.x = resolved.x;
              posRef.current.y = resolved.y;

              if (time - lastSyncTime.current > 50) {
                lastSyncTime.current = time;
                onPlayerMoveRef.current(
                  posRef.current.x,
                  posRef.current.y,
                  facingRef.current,
                  true,
                  localP.inVent,
                  localP.ventId
                );
              }
            } else if (wasMovingRef.current) {
              // Send final stop moving update once
              wasMovingRef.current = false;
              lastSyncTime.current = time;
              onPlayerMoveRef.current(
                posRef.current.x,
                posRef.current.y,
                facingRef.current,
                false,
                localP.inVent,
                localP.ventId
              );
            }
          }

          // 2. Check Proximity to Entities & Consoles
          const currentX = posRef.current.x;
          const currentY = posRef.current.y;
          const curActiveSab = activeSabotageRef.current;
          const curDeadBodies = deadBodiesRef.current;
          const curLockedDoors = lockedDoorsRef.current;

          // Emergency Button Proximity in Cafeteria (Blocked during active Sabotage Crisis or on cooldown)
          const distToEmergency = Math.hypot(currentX - EMERGENCY_BUTTON_POS.x, currentY - EMERGENCY_BUTTON_POS.y);
          const hasEmergencyMeetingsLeft = (localP.emergencyMeetingsLeft ?? curSettings.emergencyMeetings) > 0;
          setNearbyEmergencyButton(
            distToEmergency < 90 &&
            localP.isAlive &&
            !localP.inVent &&
            !curActiveSab &&
            emergencyCooldown === 0 &&
            hasEmergencyMeetingsLeft
          );

          // Security CCTV Console Proximity
          const distToSecurityDesk = Math.hypot(currentX - 740, currentY - 750);
          setNearbySecurityDesk(distToSecurityDesk < 75 && localP.isAlive && !localP.inVent);

          // Admin Radar Table Proximity
          const distToAdminTable = Math.hypot(currentX - 1650, currentY - 1040);
          setNearbyAdminTable(distToAdminTable < 80 && localP.isAlive && !localP.inVent);

          // Emergency Sabotage Fix Proximity (Both Consoles for O2 & Reactor)
          let nearbySab: SabotageType | null = null;
          if (curActiveSab && localP.isAlive && !localP.inVent) {
            if (curActiveSab.type === 'lights') {
              const d = Math.hypot(currentX - 670, currentY - 960);
              if (d < 85) nearbySab = 'lights';
            } else if (curActiveSab.type === 'reactor') {
              const dTop = Math.hypot(currentX - 140, currentY - 620);
              const dBottom = Math.hypot(currentX - 140, currentY - 820);
              const dCenter = Math.hypot(currentX - 140, currentY - 720);
              if (dTop < 85 || dBottom < 85 || dCenter < 85) nearbySab = 'reactor';
            } else if (curActiveSab.type === 'o2') {
              const dO2Room = Math.hypot(currentX - 1740, currentY - 800);
              const dAdminRoom = Math.hypot(currentX - 1620, currentY - 1080);
              if (dO2Room < 85 || dAdminRoom < 85) nearbySab = 'o2';
            } else if (curActiveSab.type === 'comms') {
              const d = Math.hypot(currentX - 1480, currentY - 1400);
              if (d < 85) nearbySab = 'comms';
            }
          }
          setNearbyFixSabotage(nearbySab);

          // Task Proximity (Living Crewmates and Dead Ghosts can do tasks)
          let foundTask: TaskDefinition | null = null;
          if (!localP.inVent) {
            for (const t of ALL_TASKS) {
              if (localP.assignedTasks.includes(t.id) && !localP.completedTasks.includes(t.id)) {
                const d = Math.hypot(currentX - t.x, currentY - t.y);
                if (d < 75) {
                  foundTask = t;
                  break;
                }
              }
            }
          }
          setNearbyTask(foundTask);

          // Dead Body Proximity (Requires living player + Line of Sight)
          let foundBody: DeadBody | null = null;
          if (localP.isAlive && !localP.inVent) {
            for (const b of curDeadBodies) {
              if (b.reported) continue;
              const d = Math.hypot(currentX - b.x, currentY - b.y);
              if (d < 120 && hasLineOfSight(currentX, currentY, b.x, b.y, curLockedDoors)) {
                foundBody = b;
                break;
              }
            }
          }
          setNearbyDeadBody(foundBody);

          // Kill Target Proximity (Requires Impostor + Living Victim + Line of Sight through walls & locked doors)
          let foundKillTarget: Player | null = null;
          const curAllPlayers = playersRef.current;
          if (localP.role === 'impostor' && localP.isAlive && !localP.inVent) {
            for (const p of Object.values(curAllPlayers)) {
              if (p.id !== localPlayerId && p.isAlive && p.role !== 'impostor' && !p.inVent) {
                const d = Math.hypot(currentX - p.x, currentY - p.y);
                if (d < 110 && hasLineOfSight(currentX, currentY, p.x, p.y, curLockedDoors)) {
                  foundKillTarget = p;
                  break;
                }
              }
            }
          }
          setNearbyKillTarget(foundKillTarget);

          // Vent Proximity (Impostors only)
          let foundVent: VentDefinition | null = null;
          if (localP.role === 'impostor' && localP.isAlive) {
            if (localP.inVent && localP.ventId) {
              foundVent = VENTS.find((v) => v.id === localP.ventId) || null;
            } else {
              for (const v of VENTS) {
                const d = Math.hypot(currentX - v.x, currentY - v.y);
                if (d < 85) {
                  foundVent = v;
                  break;
                }
              }
            }
          }
          setNearbyVent(foundVent);

          // 3. Smooth Interpolation (Lerp) for Remote Players
          const activePeerIds = new Set(Object.keys(curAllPlayers));
          for (const cachedId of Object.keys(lerpedPositions.current)) {
            if (!activePeerIds.has(cachedId)) {
              delete lerpedPositions.current[cachedId];
            }
          }

          const renderedPlayers: Record<string, Player> = {};
          for (const p of Object.values(curAllPlayers)) {
            if (p.id === localPlayerId) {
              renderedPlayers[p.id] = {
                ...localP,
                x: currentX,
                y: currentY,
                facing: facingRef.current,
              };
            } else {
              if (!lerpedPositions.current[p.id]) {
                lerpedPositions.current[p.id] = { x: p.x, y: p.y };
              }
              const lp = lerpedPositions.current[p.id];
              const distFromTarget = Math.hypot(p.x - lp.x, p.y - lp.y);

              // If distance is large (teleport/spawn/vent exit), snap immediately without gliding through walls
              if (distFromTarget > 250) {
                lp.x = p.x;
                lp.y = p.y;
              } else {
                lp.x += (p.x - lp.x) * Math.min(1, delta * 20);
                lp.y += (p.y - lp.y) * Math.min(1, delta * 20);
              }

              renderedPlayers[p.id] = {
                ...p,
                x: lp.x,
                y: lp.y,
              };
            }
          }

          // 4. Camera Offset (Centered on Local Player)
          const viewX = currentX - canvas.width / 2;
          const viewY = currentY - canvas.height / 2;

          // 5. Render The Skeld Game World
          drawTheSkeld(
            ctx,
            viewX,
            viewY,
            canvas.width,
            canvas.height,
            { ...localP, x: currentX, y: currentY, facing: facingRef.current },
            renderedPlayers,
            curDeadBodies,
            activeTaskRef.current ? activeTaskRef.current.id : null,
            curActiveSab,
            isSecurityCamActiveRef.current,
            curLockedDoors
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [localPlayerId, emergencyCooldown]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const currentVent =
    localPlayer.inVent && localPlayer.ventId
      ? VENTS.find((v) => v.id === localPlayer.ventId)
      : localPlayer.inVent && nearbyVent
      ? nearbyVent
      : null;

  return (
    <div
      className="relative w-full h-screen bg-slate-950 overflow-hidden select-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
      />

      {/* EMERGENCY CRISIS SABOTAGE BANNER */}
      {activeSabotage && (
        <div className="absolute top-16 sm:top-20 inset-x-0 flex justify-center items-center pointer-events-none z-40 px-4">
          <div
            className={`px-5 py-2.5 rounded-2xl border-2 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce ${
              activeSabotage.type === 'reactor' || activeSabotage.type === 'o2'
                ? 'bg-red-950/90 border-red-500 text-red-300 shadow-red-500/30'
                : 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-500/30'
            }`}
          >
            {activeSabotage.type === 'reactor' && <Flame className="w-5 h-5 text-red-400 animate-pulse" />}
            {activeSabotage.type === 'o2' && <AlertTriangle className="w-5 h-5 text-teal-400 animate-pulse" />}
            {activeSabotage.type === 'lights' && <Zap className="w-5 h-5 text-amber-400 animate-pulse" />}

            <div className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider">
              {activeSabotage.type === 'reactor' && `KRITISCH: REAKTOR MELTDOWN IN ${activeSabotage.countdown}s!`}
              {activeSabotage.type === 'o2' && `KRITISCH: SAUERSTOFFAUSFALL IN ${activeSabotage.countdown}s!`}
              {activeSabotage.type === 'lights' && 'WARNUNG: ELEKTRIKAUSFALL (LICHTER REPARIEREN)'}
              {activeSabotage.type === 'comms' && 'WARNUNG: FUNKVERBINDUNG GESTÖRT'}
            </div>
          </div>
        </div>
      )}

      {/* TOP HUD: Task Bar & Tasks List & Room Name */}
      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 flex justify-between items-start pointer-events-none z-30 gap-2">
        {/* Left: Total Tasks Progress Bar & Assigned Tasks */}
        <div className="w-56 sm:w-80 pointer-events-auto flex flex-col gap-1.5 sm:gap-2">
          {/* Global Task Bar */}
          <div className="bg-slate-900/90 border border-slate-700 sm:border-2 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-mono font-bold uppercase text-slate-300 mb-1">
              <span>GESAMTAUFGABEN</span>
              <span className="text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 sm:h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Assigned Tasks Card (Collapsible) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xl backdrop-blur-sm">
            <div
              onClick={() => setShowTasksList((prev) => !prev)}
              className="flex justify-between items-center cursor-pointer text-[11px] sm:text-xs font-mono font-bold text-slate-300"
            >
              <span className={localPlayer.role === 'impostor' ? 'text-red-400' : 'text-amber-400'}>
                {localPlayer.role === 'impostor' ? '🔪 FAKE-TASKS' : '📋 AUFGABEN'}
              </span>
              {showTasksList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>

            {showTasksList && (
              <div className="mt-2 space-y-1 text-[11px] sm:text-xs font-mono max-h-48 overflow-y-auto pr-1">
                {localPlayer.assignedTasks.map((tId) => {
                  const taskDef = ALL_TASKS.find((t) => t.id === tId);
                  const isDone = localPlayer.completedTasks.includes(tId);
                  if (!taskDef) return null;

                  return (
                    <div
                      key={tId}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                        isDone
                          ? 'text-emerald-400 line-through bg-emerald-950/20'
                          : localPlayer.role === 'impostor'
                          ? 'text-red-300'
                          : 'text-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                      <span className="truncate">
                        {taskDef.room}: {taskDef.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Current Room Banner */}
        <div className="hidden md:flex bg-slate-900/90 border border-slate-700 px-4 py-1.5 rounded-2xl shadow-xl backdrop-blur-sm pointer-events-auto items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            {currentRoomName}
          </span>
        </div>

        {/* Right: Sound, Controls, Map, Sabotage & Role Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto">
          {/* Mute/Unmute Button */}
          <button
            type="button"
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            title={isMuted ? 'Ton aktivieren' : 'Ton stummschalten'}
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white shadow-xl backdrop-blur-sm cursor-pointer transition-all active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Control Scheme Switcher */}
          <button
            type="button"
            onClick={() => {
              setControlMode((prev) => (prev === 'joystick' ? 'dpad' : prev === 'dpad' ? 'none' : 'joystick'));
            }}
            title="Steuerung umschalten (Joystick / D-Pad / Aus)"
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white shadow-xl backdrop-blur-sm cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-[10px] font-mono font-bold"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline uppercase">{controlMode === 'joystick' ? 'Stick' : controlMode === 'dpad' ? 'D-Pad' : 'Aus'}</span>
          </button>

          {/* Map Button */}
          <button
            type="button"
            onClick={() => setShowMinimap((prev) => !prev)}
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-slate-200 shadow-xl backdrop-blur-sm cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-mono font-bold uppercase"
          >
            <MapIcon className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">KARTE</span>
          </button>

          {/* Role Pill */}
          <div
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border font-mono text-[10px] sm:text-xs font-black uppercase shadow-xl backdrop-blur-sm ${
              localPlayer.role === 'impostor'
                ? 'bg-red-950/80 border-red-500 text-red-400 shadow-red-950/50'
                : 'bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-cyan-950/50'
            }`}
          >
            {localPlayer.role === 'impostor' ? '🔪 IMPOSTOR' : '🛡️ CREWMATE'}
          </div>
        </div>
      </div>

      {/* Vent Navigation UI (When Impostor is inside a Vent) */}
      {localPlayer.inVent && (
        <div className="absolute inset-x-0 bottom-24 sm:bottom-28 flex justify-center items-center gap-4 z-40 px-4 pointer-events-auto">
          <div className="bg-slate-950/95 border-2 border-red-500/90 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-red-950/80 flex flex-col items-center justify-center gap-3 max-w-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between w-full border-b border-red-900/50 pb-2">
              <span className="font-mono text-xs sm:text-sm text-red-400 font-black uppercase flex items-center gap-2">
                <span className="text-base">🕳️</span> SCHACHT: {currentVent ? currentVent.room : 'Unbekannt'}
              </span>
              <button
                type="button"
                onClick={handleVentToggle}
                className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/50 hover:bg-red-900 text-red-300 font-mono text-[11px] font-bold uppercase transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                ✕ VERLASSEN [V / ESC]
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              {currentVent?.connectedVents.map((targetId, idx) => {
                const targetVent = VENTS.find((v) => v.id === targetId);
                if (!targetVent) return null;
                return (
                  <button
                    key={targetId}
                    type="button"
                    onClick={() => handleTravelVent(targetId)}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono text-xs font-black uppercase shadow-lg shadow-red-950/50 cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-red-400/40"
                  >
                    <span className="bg-red-900/80 px-1.5 py-0.5 rounded text-[10px]">[{idx + 1}]</span>
                    <span>➔ {targetVent.room}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: Virtual Joystick */}
      {controlMode !== 'none' && localPlayer.isAlive && !activeTask && !localPlayer.inVent && (
        <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-30 select-none touch-none">
          <VirtualJoystick
            mode={controlMode}
            onMove={(dx, dy, isMoving) => {
              joystickVectorRef.current = { dx, dy, isMoving };
            }}
          />
        </div>
      )}

      {/* BOTTOM RIGHT: Action Buttons */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-30 select-none touch-none">
        {/* Sabotage Button (Impostor only) */}
        {localPlayer.role === 'impostor' && localPlayer.isAlive && onTriggerSabotage && (
          <button
            type="button"
            onClick={() => setShowSabotageModal(true)}
            className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 border-red-500 bg-red-950/80 hover:bg-red-900 text-red-400 shadow-2xl flex flex-col items-center justify-center font-mono font-black text-xs uppercase transition-all cursor-pointer select-none touch-manipulation hover:scale-105 active:scale-90"
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px]">SABOTAGE</span>
          </button>
        )}

        {/* Vent Button (Impostor only) */}
        {localPlayer.role === 'impostor' && localPlayer.isAlive && (
          <button
            type="button"
            onClick={handleVentToggle}
            disabled={!localPlayer.inVent && !nearbyVent}
            className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation ${
              localPlayer.inVent
                ? 'bg-red-600 border-white text-white animate-pulse'
                : nearbyVent
                ? 'bg-slate-900 border-red-500 text-red-400 shadow-red-950/50 hover:scale-105 active:scale-90'
                : 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="text-lg sm:text-xl">🕳️</span>
            <span className="text-[9px] sm:text-[10px]">{localPlayer.inVent ? 'EXIT' : 'VENT'}</span>
          </button>
        )}

        {/* Report Button */}
        <button
          type="button"
          onClick={() => nearbyDeadBody && onReportBody(nearbyDeadBody.id)}
          disabled={!nearbyDeadBody}
          className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation ${
            nearbyDeadBody
              ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 text-white shadow-amber-950/50 hover:scale-105 active:scale-90 animate-bounce'
              : 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] sm:text-[10px]">REPORT</span>
        </button>

        {/* Kill Button (Impostor only) */}
        {localPlayer.role === 'impostor' && (
          <button
            type="button"
            onClick={handleKill}
            disabled={!nearbyKillTarget || killCooldown > 0 || !localPlayer.isAlive}
            className={`relative w-16 h-16 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation ${
              nearbyKillTarget && killCooldown === 0
                ? 'bg-red-600 hover:bg-red-500 border-red-300 text-white shadow-red-950/60 hover:scale-105 active:scale-90 animate-pulse'
                : 'bg-slate-950/70 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <Skull className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-[9px] sm:text-[10px]">{killCooldown > 0 ? `${killCooldown}s` : 'KILL'}</span>
          </button>
        )}

        {/* USE / INTERACT / CONSOLE Button */}
        <button
          type="button"
          onClick={() => {
            if (nearbyEmergencyButton) {
              onEmergencyMeeting();
            } else if (nearbyFixSabotage) {
              if (nearbyFixSabotage === 'lights') {
                setActiveTask({ id: 'fix_lights', type: 'fix_lights', name: 'Lichter reparieren', room: 'Electrical', x: 670, y: 960 });
              } else if (nearbyFixSabotage === 'reactor') {
                setActiveTask({ id: 'fix_reactor', type: 'fix_reactor', name: 'Reaktor stabilisieren', room: 'Reactor', x: 140, y: 720 });
              } else if (onFixSabotage) {
                onFixSabotage(nearbyFixSabotage);
              }
            } else if (nearbySecurityDesk) {
              handleToggleCCTV(true);
            } else if (nearbyAdminTable) {
              setShowAdminRadar(true);
            } else if (nearbyTask) {
              setActiveTask(nearbyTask);
            }
          }}
          disabled={!nearbyTask && !nearbyEmergencyButton && !nearbySecurityDesk && !nearbyAdminTable && !nearbyFixSabotage}
          className={`w-16 h-16 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation ${
            nearbyEmergencyButton || nearbyFixSabotage
              ? 'bg-red-600 hover:bg-red-500 border-red-300 text-white shadow-red-950/60 hover:scale-105 active:scale-90 animate-bounce'
              : nearbySecurityDesk
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white shadow-emerald-950/60 hover:scale-105 active:scale-90'
              : nearbyAdminTable
              ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-300 text-white shadow-cyan-950/60 hover:scale-105 active:scale-90'
              : nearbyTask
              ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-300 text-white shadow-cyan-950/60 hover:scale-105 active:scale-90'
              : 'bg-slate-950/70 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
          }`}
        >
          {nearbyEmergencyButton ? (
            <>
              <Megaphone className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-[9px] sm:text-[10px]">MEETING</span>
            </>
          ) : nearbyFixSabotage ? (
            <>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce" />
              <span className="text-[9px] sm:text-[10px]">REPARIEREN</span>
            </>
          ) : nearbySecurityDesk ? (
            <>
              <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-[9px] sm:text-[10px]">CCTV</span>
            </>
          ) : nearbyAdminTable ? (
            <>
              <MapIcon className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-[9px] sm:text-[10px]">RADAR</span>
            </>
          ) : (
            <>
              <Wrench className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-[9px] sm:text-[10px]">USE</span>
            </>
          )}
        </button>
      </div>

      {/* Full Ship Minimap Overlay Modal */}
      {showMinimap && (
        <SkeldMinimapModal
          localPlayer={localPlayer}
          onClose={() => setShowMinimap(false)}
        />
      )}

      {/* CCTV Security Camera Monitor Modal */}
      {showCCTV && (
        <CCTVModal
          players={players}
          deadBodies={deadBodies}
          localPlayer={localPlayer}
          onClose={() => handleToggleCCTV(false)}
        />
      )}

      {/* Admin Table Radar Modal */}
      {showAdminRadar && (
        <AdminTableModal
          players={players}
          deadBodies={deadBodies}
          onClose={() => setShowAdminRadar(false)}
        />
      )}

      {/* Impostor Sabotage Map Modal */}
      {showSabotageModal && onTriggerSabotage && onLockDoors && (
        <SabotageModal
          onTriggerSabotage={onTriggerSabotage}
          onLockDoors={onLockDoors}
          cooldownRemaining={sabotageCooldown}
          activeSabotageType={activeSabotage?.type || null}
          onClose={() => setShowSabotageModal(false)}
        />
      )}

      {/* Task Minigame Modal */}
      {activeTask && (
        <TaskModal
          task={activeTask}
          playerColor={localPlayer.color}
          playerName={localPlayer.name}
          onComplete={() => {
            if (activeTask.id === 'fix_lights' || activeTask.id === 'fix_reactor') {
              if (onFixSabotage) {
                onFixSabotage(activeTask.id === 'fix_lights' ? 'lights' : 'reactor');
              }
            } else {
              onCompleteTask(activeTask.id);
            }
            setActiveTask(null);
          }}
          onClose={() => setActiveTask(null)}
        />
      )}

      {/* Fullscreen Cinematic Kill Animation */}
      {activeKillOverlay && (
        <KillAnimationOverlay
          killerColor={activeKillOverlay.killerColor}
          killerHat={activeKillOverlay.killerHat}
          victimColor={activeKillOverlay.victimColor}
          victimHat={activeKillOverlay.victimHat}
          isVictimLocal={activeKillOverlay.isVictimLocal}
          onFinished={handleCloseKillOverlay}
        />
      )}
    </div>
  );
}


