'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { drawTheSkeld } from './TheSkeldMap';
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

  // Position & Movement state
  const posRef = useRef({ x: localPlayer.x, y: localPlayer.y });
  const facingRef = useRef<'left' | 'right'>(localPlayer.facing);
  const keysPressed = useRef<Record<string, boolean>>({});
  const joystickVectorRef = useRef<{ dx: number; dy: number; isMoving: boolean }>({ dx: 0, dy: 0, isMoving: false });
  const lastSyncTime = useRef<number>(0);
  const prevAliveRef = useRef(localPlayer.isAlive);

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

  // Impostor kill cooldown interval
  useEffect(() => {
    if (localPlayer.role !== 'impostor' || !localPlayer.isAlive) return;

    const timer = setInterval(() => {
      setKillCooldown((prev) => Math.max(0, prev - 1));
      setSabotageCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [localPlayer.role, localPlayer.isAlive]);

  // Sync positions from props
  useEffect(() => {
    posRef.current = { x: localPlayer.x, y: localPlayer.y };
  }, [localPlayer.x, localPlayer.y]);

  // Kill Action
  const handleKill = () => {
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
  };


  // Vent Action
  const handleVentToggle = () => {
    if (localPlayer.role !== 'impostor' || !localPlayer.isAlive) return;

    if (localPlayer.inVent) {
      if (localPlayer.ventId) {
        onVentAction(localPlayer.ventId, 'exit');
      }
    } else if (nearbyVent) {
      onVentAction(nearbyVent.id, 'enter');
    }
  };

  // Travel between connected vents
  const handleTravelVent = (targetVentId: string) => {
    if (!localPlayer.inVent || !localPlayer.ventId) return;
    const targetVent = VENTS.find((v) => v.id === targetVentId);
    if (!targetVent) return;

    posRef.current = { x: targetVent.x, y: targetVent.y };
    onVentAction(localPlayer.ventId, 'travel', targetVentId);
  };

  // Toggle CCTV and notify peers
  const handleToggleCCTV = (open: boolean) => {
    setShowCCTV(open);
    if (onSecurityCamToggle) {
      onSecurityCamToggle(open);
    }
  };

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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });

  // Main Render & Physics Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const isInteracting = !!activeTask || showCCTV || showAdminRadar || showSabotageModal;

          // 1. Process Movement with Sub-Stepping Physics
          if (localPlayer.isAlive && !isInteracting && !localPlayer.inVent) {
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
              const mag = Math.hypot(dx, dy);
              if (mag > 1) {
                dx /= mag;
                dy /= mag;
              }

              const baseSpeed = 260 * settings.playerSpeed;
              const moveX = dx * baseSpeed * delta;
              const moveY = dy * baseSpeed * delta;

              // Airtight Sub-Stepping Collision Solver
              const resolved = resolvePlayerMovement(
                posRef.current.x,
                posRef.current.y,
                moveX,
                moveY,
                16,
                !localPlayer.isAlive
              );

              posRef.current.x = resolved.x;
              posRef.current.y = resolved.y;

              if (time - lastSyncTime.current > 40) {
                lastSyncTime.current = time;
                onPlayerMove(
                  posRef.current.x,
                  posRef.current.y,
                  facingRef.current,
                  true,
                  localPlayer.inVent,
                  localPlayer.ventId
                );
              }
            } else if (time - lastSyncTime.current > 150) {
              lastSyncTime.current = time;
              onPlayerMove(
                posRef.current.x,
                posRef.current.y,
                facingRef.current,
                false,
                localPlayer.inVent,
                localPlayer.ventId
              );
            }
          }

          // 2. Check Proximity to Entities & Consoles
          const currentX = posRef.current.x;
          const currentY = posRef.current.y;

          // Emergency Button Proximity in Cafeteria
          const distToEmergency = Math.hypot(currentX - EMERGENCY_BUTTON_POS.x, currentY - EMERGENCY_BUTTON_POS.y);
          setNearbyEmergencyButton(distToEmergency < 90 && localPlayer.isAlive && !localPlayer.inVent);

          // Security CCTV Console Proximity
          const distToSecurityDesk = Math.hypot(currentX - 740, currentY - 750);
          setNearbySecurityDesk(distToSecurityDesk < 75 && localPlayer.isAlive && !localPlayer.inVent);

          // Admin Radar Table Proximity
          const distToAdminTable = Math.hypot(currentX - 1650, currentY - 1040);
          setNearbyAdminTable(distToAdminTable < 80 && localPlayer.isAlive && !localPlayer.inVent);

          // Emergency Sabotage Fix Proximity
          let nearbySab: SabotageType | null = null;
          if (activeSabotage && localPlayer.isAlive && !localPlayer.inVent) {
            if (activeSabotage.type === 'lights') {
              const d = Math.hypot(currentX - 670, currentY - 960);
              if (d < 85) nearbySab = 'lights';
            } else if (activeSabotage.type === 'reactor') {
              const d = Math.hypot(currentX - 140, currentY - 720);
              if (d < 85) nearbySab = 'reactor';
            } else if (activeSabotage.type === 'o2') {
              const d = Math.hypot(currentX - 1740, currentY - 800);
              if (d < 85) nearbySab = 'o2';
            } else if (activeSabotage.type === 'comms') {
              const d = Math.hypot(currentX - 1480, currentY - 1400);
              if (d < 85) nearbySab = 'comms';
            }
          }
          setNearbyFixSabotage(nearbySab);

          // Task Proximity
          let foundTask: TaskDefinition | null = null;
          for (const t of ALL_TASKS) {
            if (localPlayer.assignedTasks.includes(t.id) && !localPlayer.completedTasks.includes(t.id)) {
              const d = Math.hypot(currentX - t.x, currentY - t.y);
              if (d < 75) {
                foundTask = t;
                break;
              }
            }
          }
          setNearbyTask(foundTask);

          // Dead Body Proximity
          let foundBody: DeadBody | null = null;
          for (const b of deadBodies) {
            const d = Math.hypot(currentX - b.x, currentY - b.y);
            if (d < 120) {
              foundBody = b;
              break;
            }
          }
          setNearbyDeadBody(foundBody);

          // Kill Target Proximity (for Impostors)
          let foundKillTarget: Player | null = null;
          if (localPlayer.role === 'impostor' && localPlayer.isAlive && !localPlayer.inVent) {
            for (const p of Object.values(players)) {
              if (p.id !== localPlayerId && p.isAlive && p.role !== 'impostor' && !p.inVent) {
                const d = Math.hypot(currentX - p.x, currentY - p.y);
                if (d < 110) {
                  foundKillTarget = p;
                  break;
                }
              }
            }
          }
          setNearbyKillTarget(foundKillTarget);

          // Vent Proximity
          let foundVent: VentDefinition | null = null;
          if (localPlayer.role === 'impostor' && localPlayer.isAlive) {
            for (const v of VENTS) {
              const d = Math.hypot(currentX - v.x, currentY - v.y);
              if (d < 80) {
                foundVent = v;
                break;
              }
            }
          }
          setNearbyVent(foundVent);

          // 3. Camera Offset (Centered on Local Player)
          const viewX = currentX - canvas.width / 2;
          const viewY = currentY - canvas.height / 2;

          // 4. Render The Skeld Game World
          drawTheSkeld(
            ctx,
            viewX,
            viewY,
            canvas.width,
            canvas.height,
            { ...localPlayer, x: currentX, y: currentY, facing: facingRef.current },
            {
              ...players,
              [localPlayerId]: {
                ...localPlayer,
                x: currentX,
                y: currentY,
                facing: facingRef.current,
              },
            },
            deadBodies,
            activeTask ? activeTask.id : null,
            activeSabotage,
            isSecurityCamActive,
            lockedDoors
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    activeTask,
    deadBodies,
    localPlayer,
    localPlayerId,
    onPlayerMove,
    players,
    settings.playerSpeed,
    showCCTV,
    showAdminRadar,
    showSabotageModal,
    activeSabotage,
    isSecurityCamActive,
    lockedDoors,
  ]);

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
  const currentVent = localPlayer.inVent && localPlayer.ventId ? VENTS.find((v) => v.id === localPlayer.ventId) : null;

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
      {localPlayer.inVent && currentVent && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center items-center gap-4 z-40 px-4">
          <div className="bg-slate-900/95 border-2 border-red-500 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-center gap-3 max-w-md">
            <span className="font-mono text-xs text-red-400 font-bold uppercase block w-full text-center">
              LÜFTUNGSSCHACHT ({currentVent.room}):
            </span>
            {currentVent.connectedVents.map((targetId) => {
              const targetVent = VENTS.find((v) => v.id === targetId);
              if (!targetVent) return null;
              return (
                <button
                  key={targetId}
                  onClick={() => handleTravelVent(targetId)}
                  className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase shadow cursor-pointer transition-all active:scale-95 min-h-[40px]"
                >
                  &rarr; {targetVent.room}
                </button>
              );
            })}
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
          onFinished={() => setActiveKillOverlay(null)}
        />
      )}
    </div>
  );
}


