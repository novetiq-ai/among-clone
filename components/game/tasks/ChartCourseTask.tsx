'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Compass, Rocket, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface ChartCourseTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

interface Waypoint {
  x: number; // percentage
  y: number; // percentage
}

export function ChartCourseTask({ onComplete, onClose }: ChartCourseTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 4 Waypoint coordinates across the screen
  const [waypoints] = useState<Waypoint[]>([
    { x: 15, y: 50 },
    { x: 40, y: 25 },
    { x: 68, y: 75 },
    { x: 90, y: 40 },
  ]);

  const [currentWaypoint, setCurrentWaypoint] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [shipPos, setShipPos] = useState<{ x: number; y: number }>({ x: 15, y: 50 });
  const mapRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !mapRef.current || hasCompletedRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    setShipPos({ x: xPct, y: yPct });

    // Check if next waypoint reached
    const nextTargetIdx = currentWaypoint + 1;
    if (nextTargetIdx < waypoints.length) {
      const target = waypoints[nextTargetIdx];
      const dist = Math.hypot(xPct - target.x, yPct - target.y);
      if (dist < 8) {
        sound.playShieldClick();
        setCurrentWaypoint(nextTargetIdx);
        setShipPos({ x: target.x, y: target.y });

        if (nextTargetIdx === waypoints.length - 1 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setIsDragging(false);
          setTimeout(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 400);
        }
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    // Snap back to last locked waypoint if dropped
    setShipPos({
      x: waypoints[currentWaypoint].x,
      y: waypoints[currentWaypoint].y,
    });
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            NAVIGATION: KURS FESTLEGEN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col gap-6">
        <div className="flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">WEGPUNKTE:</span>
          <span className="text-sm font-black text-indigo-400">
            {currentWaypoint + 1} / {waypoints.length} ERREICHT
          </span>
        </div>

        {/* Space Nav Map */}
        <div
          ref={mapRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-72 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-black rounded-2xl border-4 border-slate-800 overflow-hidden shadow-inner touch-none cursor-grab active:cursor-grabbing"
        >
          {/* Radar background grid rings */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 border border-indigo-900/10 pointer-events-none" />

          {/* SVG Trajectory Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {waypoints.map((pt, i) => {
              if (i === 0) return null;
              const prevPt = waypoints[i - 1];
              const isPassed = i <= currentWaypoint;
              return (
                <line
                  key={i}
                  x1={`${prevPt.x}%`}
                  y1={`${prevPt.y}%`}
                  x2={`${pt.x}%`}
                  y2={`${pt.y}%`}
                  stroke={isPassed ? '#22c55e' : '#6366f1'}
                  strokeWidth="4"
                  strokeDasharray={isPassed ? 'none' : '6 6'}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Waypoint nodes */}
          {waypoints.map((pt, idx) => {
            const isPassed = idx <= currentWaypoint;
            const isNext = idx === currentWaypoint + 1;
            return (
              <div
                key={idx}
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-black shadow-lg transition-transform ${
                  isPassed
                    ? 'bg-emerald-500 text-white border-2 border-emerald-200'
                    : isNext
                    ? 'bg-indigo-600 text-white border-2 border-cyan-400 animate-pulse scale-110'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>
            );
          })}

          {/* Draggable Spaceship */}
          <div
            onPointerDown={handlePointerDown}
            style={{
              left: `${shipPos.x}%`,
              top: `${shipPos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-30 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 border-2 border-cyan-300 shadow-xl shadow-cyan-500/50 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform active:scale-125"
          >
            <Rocket className="w-6 h-6 text-white stroke-[2.5] -rotate-45" />
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Ziehe das <span className="text-cyan-400 font-bold">Raumschiff</span> nacheinander über alle <span className="text-indigo-400 font-bold">Wegpunkte (1 → 4)</span>!
        </p>
      </div>
    </div>
  );
}
