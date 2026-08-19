'use client';

import React, { useEffect } from 'react';
import { Player, PLAYER_COLORS, ActiveSabotage } from '@/types/game';
import {
  ROOMS,
  CORRIDORS,
  ALL_TASKS,
  VENTS,
  EMERGENCY_BUTTON_POS,
  getCurrentRoomName,
} from '@/lib/map-data';
import { Map as MapIcon, X, Navigation2, Megaphone, Skull, Compass, Zap, Flame, AlertTriangle } from 'lucide-react';

interface SkeldMinimapModalProps {
  localPlayer: Player;
  activeSabotage?: ActiveSabotage | null;
  onClose: () => void;
}

export function SkeldMinimapModal({ localPlayer, activeSabotage, onClose }: SkeldMinimapModalProps) {
  const currentRoomName = getCurrentRoomName(localPlayer.x, localPlayer.y);
  const playerColor = PLAYER_COLORS.find((c) => c.id === localPlayer.color) || PLAYER_COLORS[0];

  // Close on Escape or M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'm' || e.key === 'Tab') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none font-sans animate-fade-in"
      style={{ touchAction: 'none' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-slate-900/95 border-2 sm:border-4 border-cyan-500/70 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-3 sm:gap-4 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500 text-cyan-400">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-black text-white text-sm sm:text-base tracking-wider flex items-center gap-2">
                THE SKELD <span className="text-cyan-400">•</span> SCHIFFS-RADARPLAN
              </h3>
              <p className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Aktueller Standort: <span className="text-cyan-300 font-bold uppercase">{currentRoomName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white font-mono font-bold text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl border border-slate-600 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">SCHLIEßEN [M / ESC]</span>
          </button>
        </div>

        {/* Authentic Among Us Hologram SVG Map */}
        <div className="relative w-full h-[52vh] sm:h-[60vh] bg-slate-950 border-2 border-cyan-900/70 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          {/* Subtle Radar Scanline Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#082f4915_1px,transparent_1px),linear-gradient(to_bottom,#082f4915_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          <svg viewBox="0 0 2400 1600" className="w-full h-full">
            <defs>
              {/* Cyan Glow Filter */}
              <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Yellow Task Glow */}
              <filter id="task-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Red Vent Glow */}
              <filter id="vent-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. Outer Ship Hull Blueprint Outline */}
            <path
              d="
                M 60 580
                L 240 320
                L 600 320
                L 920 380
                L 1480 380
                L 1600 300
                L 1980 300
                L 2380 620
                L 2380 1060
                L 1980 1480
                L 1600 1480
                L 1260 1480
                L 900 1480
                L 600 1440
                L 240 1440
                L 60 1100
                Z
              "
              fill="#060c18"
              stroke="#1e293b"
              strokeWidth="18"
              strokeLinejoin="round"
            />

            {/* 2. All Connecting Corridors (Rendered with Cyan Outlines and Seamless Floor) */}
            {CORRIDORS.map((corr) => (
              <g key={corr.id}>
                {/* Corridor Fill */}
                <rect
                  x={corr.x}
                  y={corr.y}
                  width={corr.width}
                  height={corr.height}
                  fill="#0c182b"
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                {/* Interior floor seam cover */}
                <rect
                  x={corr.x + 4}
                  y={corr.y + 4}
                  width={corr.width - 8}
                  height={corr.height - 8}
                  fill="#0c182b"
                />
              </g>
            ))}

            {/* 3. All Ship Rooms */}
            {ROOMS.map((room) => (
              <g key={room.name}>
                {/* Room Shape with Glowing Cyan Borders */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx="18"
                  fill="#11223b"
                  stroke="#38bdf8"
                  strokeWidth="10"
                  strokeLinejoin="round"
                />

                {/* Subtle Inner Accent Frame */}
                <rect
                  x={room.x + 8}
                  y={room.y + 8}
                  width={room.width - 16}
                  height={room.height - 16}
                  rx="12"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  opacity="0.5"
                />

                {/* Stencil Room Name */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 + 10}
                  fill="#e0f2fe"
                  fontSize="44"
                  fontWeight="900"
                  fontFamily="monospace"
                  textAnchor="middle"
                  letterSpacing="4"
                  opacity="0.95"
                >
                  {room.name.toUpperCase()}
                </text>
              </g>
            ))}

            {/* 4. Cafeteria Emergency Meeting Table Icon in Center */}
            <circle
              cx={EMERGENCY_BUTTON_POS.x}
              cy={EMERGENCY_BUTTON_POS.y}
              r={EMERGENCY_BUTTON_POS.radius}
              fill="#0f172a"
              stroke="#ef4444"
              strokeWidth="6"
            />
            <circle
              cx={EMERGENCY_BUTTON_POS.x}
              cy={EMERGENCY_BUTTON_POS.y}
              r="22"
              fill="#ef4444"
            />
            <text
              x={EMERGENCY_BUTTON_POS.x}
              y={EMERGENCY_BUTTON_POS.y + 6}
              fill="#ffffff"
              fontSize="20"
              fontWeight="bold"
              textAnchor="middle"
            >
              🚨
            </text>

            {/* 5. Impostor Vent Network (Visible only to Impostors) */}
            {localPlayer.role === 'impostor' && (
              <g filter="url(#vent-glow)">
                {/* Connecting Vent Pipelines (Dynamically connected between paired/triangle vents) */}
                {VENTS.map((v) =>
                  v.connectedVents.map((targetId) => {
                    const target = VENTS.find((o) => o.id === targetId);
                    if (!target || v.id > target.id) return null;
                    return (
                      <line
                        key={`minimap-vent-line-${v.id}-${target.id}`}
                        x1={v.x}
                        y1={v.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#ef4444"
                        strokeWidth="8"
                        strokeDasharray="18,12"
                        opacity="0.85"
                      />
                    );
                  })
                )}

                {/* Vent Markers */}
                {VENTS.map((v) => (
                  <g key={`minimap-vent-${v.id}`}>
                    <circle cx={v.x} cy={v.y} r="26" fill="#991b1b" stroke="#fca5a5" strokeWidth="5" />
                    <text x={v.x} y={v.y + 8} fill="#ffffff" fontSize="22" fontWeight="bold" textAnchor="middle">
                      🕳️
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* 6. Assigned Task Markers (Yellow Exclamation Marks `!`) */}
            {localPlayer.assignedTasks.map((taskId) => {
              const taskDef = ALL_TASKS.find((t) => t.id === taskId);
              const isDone = localPlayer.completedTasks.includes(taskId);
              if (!taskDef || isDone) return null;

              return (
                <g key={`minimap-task-${taskId}`} filter="url(#task-glow)">
                  {/* Outer Pulsing Ring */}
                  <circle
                    cx={taskDef.x}
                    cy={taskDef.y}
                    r="40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="6"
                    opacity="0.75"
                  />
                  {/* Task Yellow Badge */}
                  <circle
                    cx={taskDef.x}
                    cy={taskDef.y}
                    r="30"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="6"
                  />
                  {/* Exclamation mark */}
                  <text
                    x={taskDef.x}
                    y={taskDef.y + 13}
                    fill="#000000"
                    fontSize="38"
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    !
                  </text>
                </g>
              );
            })}

            {/* 7. Active Sabotage Emergency Beacons on Radar */}
            {activeSabotage && (
              <g>
                {(activeSabotage.type === 'o2'
                  ? [
                      { name: 'O2-RAUM', x: 1740, y: 800 },
                      { name: 'ADMIN', x: 1620, y: 1080 },
                    ]
                  : activeSabotage.type === 'reactor'
                  ? [
                      { name: 'REAKTOR (OBEN)', x: 140, y: 620 },
                      { name: 'REAKTOR (UNTEN)', x: 140, y: 820 },
                    ]
                  : activeSabotage.type === 'lights'
                  ? [{ name: 'ELEKTRIK', x: 670, y: 960 }]
                  : activeSabotage.type === 'comms'
                  ? [{ name: 'FUNKRAUM', x: 1480, y: 1400 }]
                  : []
                ).map((sabTarget, idx) => (
                  <g key={`sab-map-${idx}`}>
                    {/* Flashing Hazard Ping Waves */}
                    <circle
                      cx={sabTarget.x}
                      cy={sabTarget.y}
                      r="80"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="8"
                      opacity="0.6"
                    />
                    <circle
                      cx={sabTarget.x}
                      cy={sabTarget.y}
                      r="40"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="6"
                    />
                    <text
                      x={sabTarget.x}
                      y={sabTarget.y + 11}
                      fill="#ffffff"
                      fontSize="28"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ⚠️
                    </text>
                    <rect
                      x={sabTarget.x - 75}
                      y={sabTarget.y - 75}
                      width="150"
                      height="26"
                      rx="6"
                      fill="#7f1d1d"
                      stroke="#ef4444"
                      strokeWidth="3"
                    />
                    <text
                      x={sabTarget.x}
                      y={sabTarget.y - 58}
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {sabTarget.name}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* 8. Player Location Marker (Authentic Crewmate Icon + Radar Ping Ring) */}
            <g transform={`translate(${localPlayer.x}, ${localPlayer.y})`}>
              {/* Radar Ping Wave */}
              <circle
                cx="0"
                cy="0"
                r="70"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                opacity="0.4"
              />
              <circle
                cx="0"
                cy="0"
                r="50"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                opacity="0.7"
              />

              {/* Facing Orientation Arrow */}
              <polygon
                points={localPlayer.facing === 'left' ? '-55,0 -40,-16 -40,16' : '55,0 40,-16 40,16'}
                fill="#38bdf8"
              />

              {/* Player Crewmate Miniature Bean */}
              {/* Backpack */}
              <rect
                x={localPlayer.facing === 'left' ? '8' : '-22'}
                y="-14"
                width="14"
                height="28"
                rx="6"
                fill={playerColor.hex}
                stroke="#0f172a"
                strokeWidth="4"
              />
              {/* Body */}
              <rect
                x="-16"
                y="-24"
                width="32"
                height="44"
                rx="14"
                fill={playerColor.hex}
                stroke="#0f172a"
                strokeWidth="5"
              />
              {/* Visor */}
              <rect
                x={localPlayer.facing === 'left' ? '-16' : '2'}
                y="-16"
                width="20"
                height="15"
                rx="7"
                fill={playerColor.visor}
                stroke="#0f172a"
                strokeWidth="4"
              />
              {/* Visor Glare */}
              <rect
                x={localPlayer.facing === 'left' ? '-13' : '5'}
                y="-14"
                width="10"
                height="4"
                rx="2"
                fill="#ffffff"
              />

              {/* "DU" (YOU) Tag Floating Above */}
              <rect
                x="-40"
                y="-56"
                width="80"
                height="22"
                rx="6"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x="0"
                y="-40"
                fill="#ffffff"
                fontSize="14"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="middle"
              >
                DU (YOU)
              </text>
            </g>
          </svg>
        </div>

        {/* Footer Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px] sm:text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black font-black flex items-center justify-center text-[9px]">!</span>
              Offene Aufgaben
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 border border-white" />
              Deine Position
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[8px]">🚨</span>
              Notfall-Button (Cafeteria)
            </span>
            {localPlayer.role === 'impostor' && (
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-3.5 h-3.5 rounded-full bg-red-900 border border-red-400 flex items-center justify-center text-[8px]">🕳️</span>
                Lüftungsschächte (Vents)
              </span>
            )}
          </div>

          <div className="text-slate-500 text-[10px]">
            Tippe auf [M] oder [ESC] zum Schließen
          </div>
        </div>
      </div>
    </div>
  );
}
