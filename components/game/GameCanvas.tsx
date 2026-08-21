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
  REPORT_RANGE,
} from '@/types/game';
import {
  ALL_TASKS,
  VENTS,
  EMERGENCY_BUTTON_POS,
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
import { sound } from '@/lib/sound';
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

interface CanvasMetrics {
  width: number;
  height: number;
  dpr: number;
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  );
}

function isGameplayControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    isTextEntryTarget(target) ||
    Boolean(target.closest('button, a, [role="button"], [role="dialog"], [aria-modal="true"]'))
  );
}

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
  const canvasMetricsRef = useRef<CanvasMetrics>({ width: 1, height: 1, dpr: 1 });

  // Active Interactive Modals
  const [activeTask, setActiveTask] = useState<TaskDefinition | null>(null);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showCCTV, setShowCCTV] = useState(false);
  const [showAdminRadar, setShowAdminRadar] = useState(false);
  const [showSabotageModal, setShowSabotageModal] = useState(false);
  const [showTasksList, setShowTasksList] = useState(false);
  const [controlMode, setControlMode] = useState<'joystick' | 'dpad' | 'none'>('joystick');
  const [joystickResetKey, setJoystickResetKey] = useState(0);
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const [activeKillOverlay, setActiveKillOverlay] = useState<{
    killerColor: PlayerColor;
    killerHat?: HatType;
    victimColor: PlayerColor;
    victimHat?: HatType;
    isVictimLocal: boolean;
  } | null>(null);
  const systemsDisabledByComms = activeSabotage?.type === 'comms';
  const [previousCommsState, setPreviousCommsState] = useState(systemsDisabledByComms);
  if (previousCommsState !== systemsDisabledByComms) {
    setPreviousCommsState(systemsDisabledByComms);
    if (systemsDisabledByComms) {
      setShowTasksList(false);
      setShowAdminRadar(false);
      setShowCCTV(false);
      setShowSabotageModal(false);
      setActiveTask(null);
    }
  }

  const hasBlockingOverlay = Boolean(
    activeTask || showMinimap || showCCTV || showAdminRadar || showSabotageModal || activeKillOverlay
  );

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
  const showMinimapRef = useRef(showMinimap);
  const showCCTVRef = useRef(showCCTV);
  const showAdminRadarRef = useRef(showAdminRadar);
  const showSabotageModalRef = useRef(showSabotageModal);
  const activeKillOverlayRef = useRef(activeKillOverlay);
  const settingsRef = useRef(settings);
  const onPlayerMoveRef = useRef(onPlayerMove);

  const stopMovement = useCallback(() => {
    keysPressed.current = {};
    joystickVectorRef.current = { dx: 0, dy: 0, isMoving: false };
    if (!wasMovingRef.current) return;

    wasMovingRef.current = false;
    const currentPlayer = localPlayerRef.current;
    onPlayerMoveRef.current(
      posRef.current.x,
      posRef.current.y,
      facingRef.current,
      false,
      currentPlayer.inVent,
      currentPlayer.ventId
    );
  }, []);

  useEffect(() => {
    playersRef.current = players;
    localPlayerRef.current = localPlayer;
    deadBodiesRef.current = deadBodies;
    lockedDoorsRef.current = lockedDoors;
    activeSabotageRef.current = activeSabotage;
    isSecurityCamActiveRef.current = isSecurityCamActive;
    activeTaskRef.current = activeTask;
    showMinimapRef.current = showMinimap;
    showCCTVRef.current = showCCTV;
    showAdminRadarRef.current = showAdminRadar;
    showSabotageModalRef.current = showSabotageModal;
    activeKillOverlayRef.current = activeKillOverlay;
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

  // Stop movement immediately while any gameplay-covering overlay is active.
  useEffect(() => {
    if (hasBlockingOverlay) stopMovement();
  }, [hasBlockingOverlay, stopMovement]);

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

  useEffect(() => {
    if (systemsDisabledByComms) onSecurityCamToggle?.(false);
  }, [systemsDisabledByComms, onSecurityCamToggle]);

  // Handle USE action (Task / Sabotage Fix / Emergency Button / CCTV / Admin Table)
  const handleUseAction = useCallback(() => {
    if (hasBlockingOverlay) return;

    if (nearbyEmergencyButton) {
      if (emergencyCooldown > 0) {
        sound.playErrorBuzz();
        return;
      }
      onEmergencyMeeting();
      setEmergencyCooldown(15);
    } else if (nearbyFixSabotage) {
      if (nearbyFixSabotage === 'lights') {
        setActiveTask({ id: 'fix_lights', type: 'fix_lights', name: 'Lichter reparieren', room: 'Electrical', x: 670, y: 960 });
      } else if (nearbyFixSabotage === 'reactor') {
        setActiveTask({ id: 'fix_reactor', type: 'fix_reactor', name: 'Reaktor stabilisieren', room: 'Reactor', x: 140, y: 720 });
      } else if (onFixSabotage) {
        onFixSabotage(nearbyFixSabotage);
      }
    } else if (systemsDisabledByComms && (nearbySecurityDesk || nearbyAdminTable || nearbyTask)) {
      sound.playErrorBuzz();
    } else if (nearbySecurityDesk) {
      handleToggleCCTV(true);
    } else if (nearbyAdminTable) {
      setShowAdminRadar(true);
    } else if (nearbyTask) {
      setActiveTask(nearbyTask);
    }
  }, [
    hasBlockingOverlay,
    nearbyEmergencyButton,
    emergencyCooldown,
    onEmergencyMeeting,
    nearbyFixSabotage,
    onFixSabotage,
    systemsDisabledByComms,
    nearbySecurityDesk,
    handleToggleCCTV,
    nearbyAdminTable,
    nearbyTask,
  ]);

  const handleTriggerSabotage = useCallback((type: SabotageType) => {
    if (sabotageCooldown > 0 || activeSabotage) return;
    setSabotageCooldown(15);
    onTriggerSabotage?.(type);
  }, [activeSabotage, onTriggerSabotage, sabotageCooldown]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGameplayControlTarget(event.target)) return;

      if (activeTask || showMinimap || showCCTV || showAdminRadar || showSabotageModal || activeKillOverlay) {
        if (event.key === 'Escape' && !activeKillOverlay) {
          event.preventDefault();
          setActiveTask(null);
          setShowMinimap(false);
          handleToggleCCTV(false);
          setShowAdminRadar(false);
          setShowSabotageModal(false);
        }
        return;
      }

      const key = event.key.toLowerCase();

      // Handle in-vent keyboard controls
      if (localPlayer.inVent && localPlayer.role === 'impostor') {
        const currentVent = localPlayer.ventId ? VENTS.find((vent) => vent.id === localPlayer.ventId) : nearbyVent;

        // V, Space, E, or Escape to exit vent
        if (key === 'v' || event.key === ' ' || key === 'e' || event.key === 'Escape') {
          event.preventDefault();
          handleVentToggle();
          return;
        }

        // 1, 2, 3 to travel to connected vents
        if (currentVent && currentVent.connectedVents.length > 0) {
          const numberOfVents = currentVent.connectedVents.length;
          const numberedIndex = Number.parseInt(event.key, 10) - 1;
          if (numberedIndex >= 0 && numberedIndex < numberOfVents) {
            event.preventDefault();
            ventIndexRef.current = numberedIndex;
            handleTravelVent(currentVent.connectedVents[numberedIndex]);
            return;
          }
          if (event.key === 'ArrowRight' || key === 'd') {
            event.preventDefault();
            ventIndexRef.current = (ventIndexRef.current + 1) % numberOfVents;
            handleTravelVent(currentVent.connectedVents[ventIndexRef.current]);
            return;
          }
          if (event.key === 'ArrowLeft' || key === 'a') {
            event.preventDefault();
            ventIndexRef.current = (ventIndexRef.current - 1 + numberOfVents) % numberOfVents;
            handleTravelVent(currentVent.connectedVents[ventIndexRef.current]);
            return;
          }
        }
      }

      keysPressed.current[key] = true;

      if ((event.key === ' ' || key === 'e') && !event.repeat) {
        event.preventDefault();
        handleUseAction();
      }

      if (key === 'q' && !event.repeat && localPlayer.role === 'impostor' && nearbyKillTarget && killCooldown === 0) {
        event.preventDefault();
        handleKill();
      }

      if (key === 'r' && !event.repeat && nearbyDeadBody) {
        event.preventDefault();
        onReportBody(nearbyDeadBody.id);
      }

      if (key === 'v' && !event.repeat && localPlayer.role === 'impostor') {
        event.preventDefault();
        handleVentToggle();
      }

      if (key === 'm' && !event.repeat) {
        event.preventDefault();
        setShowMinimap((previous) => !previous);
      }

      // Tab remains reserved for accessible focus navigation.
      if (key === 'x' && !event.repeat && localPlayer.role === 'impostor' && localPlayer.isAlive) {
        event.preventDefault();
        setShowSabotageModal((previous) => !previous);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current[event.key.toLowerCase()] = false;
    };

    const handleBlur = () => stopMovement();
    const handleFocusIn = (event: FocusEvent) => {
      if (isTextEntryTarget(event.target)) stopMovement();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focusin', handleFocusIn);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [
    activeTask,
    showMinimap,
    showCCTV,
    showAdminRadar,
    showSabotageModal,
    activeKillOverlay,
    localPlayer.inVent,
    localPlayer.role,
    localPlayer.ventId,
    localPlayer.isAlive,
    nearbyVent,
    nearbyKillTarget,
    nearbyDeadBody,
    killCooldown,
    onReportBody,
    handleUseAction,
    handleKill,
    handleVentToggle,
    handleTravelVent,
    handleToggleCCTV,
    stopMovement,
  ]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, rect.height || canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    canvasMetricsRef.current = { width, height, dpr };
  }, []);

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observedElement = canvas.parentElement ?? canvas;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeCanvas);
    observer?.observe(observedElement);
    window.addEventListener('resize', resizeCanvas);
    window.visualViewport?.addEventListener('resize', resizeCanvas);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      window.visualViewport?.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  // Main Render & Physics Loop (Runs continuously without stutter or re-mount resets)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (canvas) {
        const currentDpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
        if (canvasMetricsRef.current.dpr !== currentDpr) resizeCanvas();
        const canvasMetrics = canvasMetricsRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(canvasMetrics.dpr, 0, 0, canvasMetrics.dpr, 0, 0);
          ctx.imageSmoothingEnabled = true;
          const isInteracting =
            !!activeTaskRef.current ||
            showMinimapRef.current ||
            showCCTVRef.current ||
            showAdminRadarRef.current ||
            showSabotageModalRef.current ||
            !!activeKillOverlayRef.current ||
            isTextEntryTarget(document.activeElement);
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

          // Emergency Button Proximity in Cafeteria (Blocked during active Sabotage Crisis)
          const distToEmergency = Math.hypot(currentX - EMERGENCY_BUTTON_POS.x, currentY - EMERGENCY_BUTTON_POS.y);
          const hasEmergencyMeetingsLeft = (localP.emergencyMeetingsLeft ?? curSettings.emergencyMeetings) > 0;
          setNearbyEmergencyButton(
            distToEmergency < 140 &&
            localP.isAlive &&
            !localP.inVent &&
            !curActiveSab &&
            hasEmergencyMeetingsLeft
          );

          // Security CCTV Console Proximity
          const distToSecurityDesk = Math.hypot(currentX - 640, currentY - 760);
          setNearbySecurityDesk(distToSecurityDesk < 75 && localP.isAlive && !localP.inVent && curActiveSab?.type !== 'comms');

          // Admin Radar Table Proximity
          const distToAdminTable = Math.hypot(currentX - 1490, currentY - 890);
          setNearbyAdminTable(distToAdminTable < 80 && localP.isAlive && !localP.inVent && curActiveSab?.type !== 'comms');

          // Emergency Sabotage Fix Proximity (Both Consoles for O2 & Reactor)
          let nearbySab: SabotageType | null = null;
          if (curActiveSab && localP.isAlive && !localP.inVent) {
            if (curActiveSab.type === 'lights') {
              const d = Math.hypot(currentX - 760, currentY - 1080);
              if (
                d < 85
                && hasLineOfSight(currentX, currentY, 760, 1080, curLockedDoors)
              ) nearbySab = 'lights';
            } else if (curActiveSab.type === 'reactor') {
              const dTop = Math.hypot(currentX - 100, currentY - 720);
              const dBottom = Math.hypot(currentX - 100, currentY - 920);
              const fixedStations = curActiveSab.reactorStations ?? [];
              const canUseTop = dTop < 85
                && !fixedStations.includes('reactor_top')
                && hasLineOfSight(currentX, currentY, 100, 720, curLockedDoors);
              const canUseBottom = dBottom < 85
                && !fixedStations.includes('reactor_bottom')
                && hasLineOfSight(currentX, currentY, 100, 920, curLockedDoors);
              if (
                !(curActiveSab.reactorHands ?? []).includes(localPlayerId)
                && (canUseTop || canUseBottom)
              ) {
                nearbySab = 'reactor';
              }
            } else if (curActiveSab.type === 'o2') {
              const dO2Room = Math.hypot(currentX - 1520, currentY - 620);
              const dAdminRoom = Math.hypot(currentX - 1590, currentY - 820);
              const fixedRooms = curActiveSab.o2FixedRooms ?? [];
              const canFixO2 = dO2Room < 85
                && !fixedRooms.includes('O2')
                && hasLineOfSight(currentX, currentY, 1520, 620, curLockedDoors);
              const canFixAdmin = dAdminRoom < 85
                && !fixedRooms.includes('Admin')
                && hasLineOfSight(currentX, currentY, 1590, 820, curLockedDoors);
              if (canFixO2 || canFixAdmin) nearbySab = 'o2';
            } else if (curActiveSab.type === 'comms') {
              const d = Math.hypot(currentX - 1450, currentY - 1350);
              if (
                d < 85
                && hasLineOfSight(currentX, currentY, 1450, 1350, curLockedDoors)
              ) nearbySab = 'comms';
            }
          }
          setNearbyFixSabotage(nearbySab);

          // Comms disables task consoles and their navigation data until repaired.
          let foundTask: TaskDefinition | null = null;
          if (!localP.inVent && curActiveSab?.type !== 'comms') {
            for (const t of ALL_TASKS) {
              if (localP.assignedTasks.includes(t.id) && !localP.completedTasks.includes(t.id)) {
                const d = Math.hypot(currentX - t.x, currentY - t.y);
                if (
                  d < 75
                  && hasLineOfSight(currentX, currentY, t.x, t.y, curLockedDoors)
                ) {
                  foundTask = t;
                  break;
                }
              }
            }
          }
          setNearbyTask(foundTask);

          // Dead Body Proximity. Match the host's range and line-of-sight
          // validation so the report control never advertises a rejected action.
          let foundBody: DeadBody | null = null;
          if (localP.isAlive && !localP.inVent) {
            for (const b of curDeadBodies) {
              if (b.reported) continue;
              const d = Math.hypot(currentX - b.x, currentY - b.y);
              if (
                d <= REPORT_RANGE
                && hasLineOfSight(currentX, currentY, b.x, b.y, curLockedDoors)
              ) {
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
                if (
                  d < 85
                  && hasLineOfSight(currentX, currentY, v.x, v.y, curLockedDoors)
                ) {
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

          const renderedLocalPlayer: Player = {
            ...localP,
            x: currentX,
            y: currentY,
            facing: facingRef.current,
            isMoving: wasMovingRef.current,
            assignedTasks: curActiveSab?.type === 'comms' ? [] : localP.assignedTasks,
          };
          const renderedPlayers: Record<string, Player> = {};
          for (const p of Object.values(curAllPlayers)) {
            if (p.id === localPlayerId) {
              renderedPlayers[p.id] = renderedLocalPlayer;
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

          // 4. Camera Offset (Centered on Local Player with close-up POV Zoom)
          const ZOOM = 1.35;
          const viewX = currentX - (canvasMetrics.width / 2) / ZOOM;
          const viewY = currentY - (canvasMetrics.height / 2) / ZOOM;

          // 5. Render the Nebula vessel game world
          drawTheSkeld(
            ctx,
            viewX,
            viewY,
            canvasMetrics.width,
            canvasMetrics.height,
            renderedLocalPlayer,
            renderedPlayers,
            curDeadBodies,
            activeTaskRef.current ? activeTaskRef.current.id : null,
            curActiveSab,
            isSecurityCamActiveRef.current && curActiveSab?.type !== 'comms',
            curLockedDoors,
            ZOOM
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [localPlayerId, resizeCanvas]);

  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const visibleProgressPercent = systemsDisabledByComms ? 0 : progressPercent;
  const canUseAction = Boolean(
    nearbyTask || nearbyEmergencyButton || nearbySecurityDesk || nearbyAdminTable || nearbyFixSabotage
  );

  const resetJoystick = useCallback(() => {
    joystickVectorRef.current = { dx: 0, dy: 0, isMoving: false };
  }, []);

  const handleJoystickPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (controlMode !== 'joystick' || event.pointerType === 'mouse') return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is not available in every embedded browser.
      }
    },
    [controlMode]
  );

  const handleJoystickPointerRelease = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      resetJoystick();
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    },
    [resetJoystick]
  );

  const handleJoystickPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      handleJoystickPointerRelease(event);
      setJoystickResetKey((previous) => previous + 1);
    },
    [handleJoystickPointerRelease]
  );

  useEffect(() => {
    resetJoystick();
  }, [controlMode, resetJoystick]);

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
            className={`px-5 py-2.5 rounded-2xl border-2 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce motion-reduce:animate-none ${
              activeSabotage.type === 'reactor' || activeSabotage.type === 'o2'
                ? 'bg-red-950/90 border-red-500 text-red-300 shadow-red-500/30'
                : 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-500/30'
            }`}
          >
            {activeSabotage.type === 'reactor' && <Flame className="w-5 h-5 text-red-400 animate-pulse motion-reduce:animate-none" />}
            {activeSabotage.type === 'o2' && <AlertTriangle className="w-5 h-5 text-teal-400 animate-pulse motion-reduce:animate-none" />}
            {activeSabotage.type === 'lights' && <Zap className="w-5 h-5 text-amber-400 animate-pulse motion-reduce:animate-none" />}

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
              <span>{systemsDisabledByComms ? 'SIGNAL GESTÖRT' : 'GESAMTAUFGABEN'}</span>
              <span className={systemsDisabledByComms ? 'text-amber-400' : 'text-emerald-400'}>
                {systemsDisabledByComms ? '--' : `${progressPercent}%`}
              </span>
            </div>
            <div
              className="w-full h-2.5 sm:h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden"
              role="progressbar"
              aria-label="Fortschritt der Gesamtaufgaben"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={systemsDisabledByComms ? undefined : progressPercent}
            >
              <div
                className={`h-full transition-all duration-300 motion-reduce:transition-none ${
                  systemsDisabledByComms
                    ? 'bg-amber-500/30'
                    : 'bg-gradient-to-r from-emerald-500 to-green-400'
                }`}
                style={{ width: `${visibleProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Assigned Tasks Card (Collapsible) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xl backdrop-blur-sm">
            <button
              type="button"
              disabled={systemsDisabledByComms}
              aria-expanded={!systemsDisabledByComms && showTasksList}
              onClick={() => setShowTasksList((previous) => !previous)}
              className={`flex w-full justify-between items-center text-[11px] sm:text-xs font-mono font-bold text-slate-300 ${
                systemsDisabledByComms ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              }`}
            >
              <span
                className={
                  systemsDisabledByComms
                    ? 'text-amber-400'
                    : localPlayer.role === 'impostor'
                    ? 'text-red-400'
                    : 'text-amber-400'
                }
              >
                {systemsDisabledByComms
                  ? '📡 SIGNAL VERLOREN'
                  : localPlayer.role === 'impostor'
                  ? '🔪 FAKE-TASKS'
                  : '📋 AUFGABEN'}
              </span>
              {systemsDisabledByComms ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : showTasksList ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showTasksList && !systemsDisabledByComms && (
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
      {controlMode !== 'none' && localPlayer.isAlive && !hasBlockingOverlay && !localPlayer.inVent && (
        <div
          className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-30 select-none touch-none"
          onPointerDown={handleJoystickPointerDown}
          onPointerUp={handleJoystickPointerRelease}
          onPointerCancel={handleJoystickPointerCancel}
          onLostPointerCapture={resetJoystick}
        >
          <VirtualJoystick
            key={`${controlMode}-${joystickResetKey}`}
            mode={controlMode}
            onMove={(dx, dy, isMoving) => {
              joystickVectorRef.current = { dx, dy, isMoving };
            }}
          />
        </div>
      )}

      {/* BOTTOM RIGHT: Action Buttons */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-40 select-none pointer-events-auto">
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
            onTouchEnd={(e) => {
              if (localPlayer.inVent || nearbyVent) {
                e.preventDefault();
                handleVentToggle();
              }
            }}
            disabled={!localPlayer.inVent && !nearbyVent}
            className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation pointer-events-auto ${
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
          onClick={() => {
            if (nearbyDeadBody) {
              onReportBody(nearbyDeadBody.id);
            }
          }}
          onTouchEnd={(e) => {
            if (nearbyDeadBody) {
              e.preventDefault();
              onReportBody(nearbyDeadBody.id);
            }
          }}
          disabled={!nearbyDeadBody}
          className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation pointer-events-auto ${
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
            onTouchEnd={(e) => {
              if (nearbyKillTarget && killCooldown === 0 && localPlayer.isAlive) {
                e.preventDefault();
                handleKill();
              }
            }}
            disabled={!nearbyKillTarget || killCooldown > 0 || !localPlayer.isAlive}
            className={`relative w-16 h-16 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation pointer-events-auto ${
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
          onClick={handleUseAction}
          onTouchEnd={(e) => {
            if (nearbyTask || nearbyEmergencyButton || nearbySecurityDesk || nearbyAdminTable || nearbyFixSabotage) {
              e.preventDefault();
              handleUseAction();
            }
          }}
          disabled={!canUseAction || hasBlockingOverlay || (nearbyEmergencyButton && emergencyCooldown > 0)}
          className={`w-16 h-16 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center font-mono font-black text-xs uppercase shadow-2xl transition-all cursor-pointer select-none touch-manipulation pointer-events-auto ${
            nearbyEmergencyButton
              ? emergencyCooldown > 0
                ? 'bg-amber-900/60 border-amber-500 text-amber-300 shadow-amber-950/60 opacity-80 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 border-red-300 text-white shadow-red-950/60 hover:scale-105 active:scale-90 animate-bounce'
              : nearbyFixSabotage
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
              <Megaphone className={`w-6 h-6 sm:w-8 sm:h-8 ${emergencyCooldown === 0 ? 'animate-bounce' : ''}`} />
              <span className="text-[9px] sm:text-[10px]">
                {emergencyCooldown > 0 ? `${emergencyCooldown}s` : 'MEETING'}
              </span>
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
          activeSabotage={activeSabotage}
          onClose={() => setShowMinimap(false)}
        />
      )}

      {/* CCTV Security Camera Monitor Modal */}
      {showCCTV && !systemsDisabledByComms && (
        <CCTVModal
          players={players}
          deadBodies={deadBodies}
          localPlayer={localPlayer}
          onClose={() => handleToggleCCTV(false)}
        />
      )}

      {/* Admin Table Radar Modal */}
      {showAdminRadar && !systemsDisabledByComms && (
        <AdminTableModal
          players={players}
          deadBodies={deadBodies}
          onClose={() => setShowAdminRadar(false)}
        />
      )}

      {/* Impostor Sabotage Map Modal */}
      {showSabotageModal && onTriggerSabotage && onLockDoors && (
        <SabotageModal
          onTriggerSabotage={handleTriggerSabotage}
          onLockDoors={onLockDoors}
          cooldownRemaining={sabotageCooldown}
          activeSabotageType={activeSabotage?.type || null}
          onClose={() => setShowSabotageModal(false)}
        />
      )}

      {/* Task Minigame Modal */}
      {activeTask && !systemsDisabledByComms && (
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
