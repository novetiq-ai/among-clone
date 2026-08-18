'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wind, Trash2 } from 'lucide-react';
import { sound } from '@/lib/sound';

interface CleanO2FilterTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

interface Leaf {
  id: number;
  x: number;
  y: number;
  rotation: number;
  type: number; // 0, 1, 2 for leaf colors
}

export function CleanO2FilterTask({ onComplete, onClose }: CleanO2FilterTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initial 6 leaves in the chamber
  const [leaves, setLeaves] = useState<Leaf[]>(() => [
    { id: 1, x: 220, y: 80, rotation: 25, type: 0 },
    { id: 2, x: 280, y: 150, rotation: -40, type: 1 },
    { id: 3, x: 190, y: 220, rotation: 60, type: 2 },
    { id: 4, x: 330, y: 90, rotation: -15, type: 0 },
    { id: 5, x: 240, y: 160, rotation: 80, type: 1 },
    { id: 6, x: 310, y: 230, rotation: -70, type: 2 },
  ]);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const chamberRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (id: number) => {
    setDraggingId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingId === null || !chamberRef.current) return;
    const rect = chamberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If dragged into the left suction chute (x < 80 and y between 60 and 260)
    if (x < 90 && y >= 50 && y <= 270) {
      sound.playTrashFlush();
      setLeaves((prev) => {
        const remaining = prev.filter((l) => l.id !== draggingId);
        if (remaining.length === 0 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 400);
        }
        return remaining;
      });
      setDraggingId(null);
      return;
    }

    setLeaves((prev) =>
      prev.map((leaf) =>
        leaf.id === draggingId
          ? {
              ...leaf,
              x: Math.max(30, Math.min(370, x)),
              y: Math.max(30, Math.min(270, y)),
            }
          : leaf
      )
    );
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  const leafColors = [
    'from-amber-600 to-yellow-500 border-amber-400',
    'from-emerald-700 to-lime-600 border-emerald-400',
    'from-orange-700 to-amber-600 border-orange-400',
  ];

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-teal-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            O2: FILTER REINIGEN / CLEAN O2 FILTER
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
          <span className="text-slate-400">FILTER-STATUS:</span>
          <span className="text-sm font-black text-teal-400">
            {leaves.length === 0 ? '100% SAUBER' : `${leaves.length} BLÄTTER BLOCKIEREN DEN FILTER`}
          </span>
        </div>

        {/* Air Chamber & Suction Vent */}
        <div
          ref={chamberRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-72 bg-gradient-to-r from-slate-950 via-teal-950/30 to-slate-950 rounded-2xl border-4 border-slate-800 overflow-hidden shadow-inner touch-none"
        >
          {/* Suction Chute Hole on Left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-40 bg-gradient-to-r from-black via-slate-900 to-transparent border-r-4 border-teal-500/60 rounded-r-3xl flex flex-col items-center justify-center p-2 shadow-2xl">
            <Trash2 className="w-8 h-8 text-teal-400/80 animate-bounce mb-1" />
            <span className="font-mono text-[9px] font-bold text-teal-300 text-center tracking-tighter">
              ABSAUGUNG
            </span>
            <div className="w-3 h-3 rounded-full bg-teal-400 animate-ping mt-1" />
          </div>

          {/* Air flow indicator lines */}
          <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-20">
            <div className="w-1/3 h-0.5 bg-teal-300 animate-pulse" />
            <div className="w-1/3 h-0.5 bg-teal-300 animate-pulse" />
          </div>

          {/* Floating Leaves */}
          {leaves.map((leaf) => (
            <div
              key={leaf.id}
              onPointerDown={() => handlePointerDown(leaf.id)}
              style={{
                left: `${leaf.x}px`,
                top: `${leaf.y}px`,
                transform: `translate(-50%, -50%) rotate(${leaf.rotation}deg) scale(${
                  draggingId === leaf.id ? 1.15 : 1
                })`,
              }}
              className={`absolute w-14 h-10 rounded-full bg-gradient-to-r ${
                leafColors[leaf.type]
              } border-2 shadow-xl cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform select-none`}
            >
              {/* Leaf spine */}
              <div className="w-10 h-0.5 bg-white/40 rounded-full pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Ziehe alle <span className="text-teal-400 font-bold">Blätter</span> nach links in die <span className="text-teal-400 font-bold">Absaugung</span>!
        </p>
      </div>
    </div>
  );
}
