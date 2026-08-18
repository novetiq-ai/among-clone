'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Hand } from 'lucide-react';
import { playTaskComplete } from '@/lib/sound';

interface FixReactorTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function FixReactorTask({ onComplete, onClose }: FixReactorTaskProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (holding && !isDone) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsDone(true);
            playTaskComplete();
            setTimeout(() => {
              onComplete();
            }, 600);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    } else if (!holding && progress < 100) {
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [holding, isDone, progress, onComplete]);

  return (
    <div className="relative bg-slate-900 border-4 border-red-500/80 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-500/20 text-white select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
      >
        <X size={20} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 animate-pulse">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-wide text-red-400">NOTFALL: REAKTOR STABILISIEREN</h2>
          <p className="text-xs text-slate-400">Halte den Handflächenscanner gedrückt</p>
        </div>
      </div>

      {/* Scanner Pad */}
      <div className="bg-slate-950/80 border-2 border-slate-700/60 rounded-xl p-8 mb-4 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Scanning laser beam animation */}
        {holding && !isDone && (
          <div className="absolute inset-x-0 h-1 bg-red-500 shadow-lg shadow-red-500/80 animate-bounce" />
        )}

        <button
          onMouseDown={() => setHolding(true)}
          onMouseUp={() => setHolding(false)}
          onMouseLeave={() => setHolding(false)}
          onTouchStart={() => setHolding(true)}
          onTouchEnd={() => setHolding(false)}
          className={`w-36 h-36 rounded-2xl border-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDone
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/30'
              : holding
              ? 'bg-red-500/30 border-red-400 text-red-300 shadow-lg shadow-red-500/40 scale-98'
              : 'bg-slate-800/80 border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400'
          }`}
        >
          <Hand size={54} className={holding ? 'animate-pulse' : ''} />
          <span className="text-[11px] font-black tracking-widest uppercase">
            {isDone ? 'STABILISIERT' : holding ? 'SCANNT...' : 'GEDRÜCKT HALTEN'}
          </span>
        </button>

        {/* Progress bar */}
        <div className="w-full max-w-xs bg-slate-800 h-3 rounded-full mt-6 overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-emerald-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-slate-400 mt-2">{progress}% SYNCHRONISIERT</span>
      </div>

      {/* Status banner */}
      <div
        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm tracking-wider uppercase transition-colors ${
          isDone
            ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}
      >
        {isDone ? (
          <>
            <CheckCircle2 size={18} />
            REAKTOR ERFOLGREICH ABGESICHERT!
          </>
        ) : (
          <>
            <AlertTriangle size={16} className="animate-bounce" />
            REAKTORKERN KRITISCH
          </>
        )}
      </div>
    </div>
  );
}
