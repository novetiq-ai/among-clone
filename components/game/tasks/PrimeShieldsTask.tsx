'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Shield, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface PrimeShieldsTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function PrimeShieldsTask({ onComplete, onClose }: PrimeShieldsTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 7 Hexagonal shield nodes: 0 is center, 1..6 are surrounding
  const [shields, setShields] = useState<boolean[]>(() => {
    // Start with all 7 active (true), then deactivate 2 to 4 random shields (false)
    const initial = [true, true, true, true, true, true, true];
    const deactiveCount = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4 deactivated
    const indices = [0, 1, 2, 3, 4, 5, 6].sort(() => 0.5 - Math.random());
    for (let i = 0; i < deactiveCount; i++) {
      initial[indices[i]] = false;
    }
    return initial;
  });

  const toggleShield = (index: number) => {
    if (shields[index]) return; // already active

    sound.playShieldClick();
    const newShields = [...shields];
    newShields[index] = true;
    setShields(newShields);

    const allActive = newShields.every(Boolean);
    if (allActive && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setTimeout(() => {
        sound.playTaskComplete();
        onCompleteRef.current();
      }, 400);
    }
  };

  // Hexagon positions in percentage
  const hexPositions = [
    { x: 50, y: 50 }, // Center
    { x: 50, y: 20 }, // Top
    { x: 76, y: 35 }, // Top-Right
    { x: 76, y: 65 }, // Bottom-Right
    { x: 50, y: 80 }, // Bottom
    { x: 24, y: 65 }, // Bottom-Left
    { x: 24, y: 35 }, // Top-Left
  ];

  const activeCount = shields.filter(Boolean).length;
  const isComplete = activeCount === 7;

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            SCHILDE AKTIVIEREN / PRIME SHIELDS
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Main Board */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col items-center gap-6">
        {/* Status display */}
        <div className="w-full flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">SCHILD-STATUS:</span>
          <span className={`font-black text-sm ${isComplete ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {isComplete ? '100% GELADEN' : `${activeCount} / 7 AKTIV`}
          </span>
        </div>

        {/* Shield Hexagonal Cluster */}
        <div className="relative w-72 h-72 rounded-full border-4 border-slate-800 bg-slate-900/60 p-4 flex items-center justify-center shadow-2xl">
          {/* Background grid ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-slate-700/50 pointer-events-none" />
          <div className="absolute inset-16 rounded-full border border-cyan-500/20 pointer-events-none" />

          {hexPositions.map((pos, idx) => {
            const isActive = shields[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleShield(idx)}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-18 h-18 rounded-2xl transition-all duration-300 flex items-center justify-center cursor-pointer shadow-lg active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white border-2 border-cyan-200 shadow-cyan-500/50 scale-105'
                    : 'bg-gradient-to-br from-red-800 to-red-950 text-red-300 border-2 border-red-500 hover:border-red-400 shadow-red-950/80 animate-pulse'
                }`}
              >
                {isActive ? (
                  <Check className="w-8 h-8 text-white stroke-[3]" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-red-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Klicke auf alle <span className="text-red-400 font-bold">roten Schild-Zellen</span>, um sie mit Energie zu versorgen.
        </p>
      </div>
    </div>
  );
}
