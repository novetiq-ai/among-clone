'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ShieldAlert } from 'lucide-react';

interface ManifoldsTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function ManifoldsTask({ onComplete, onClose }: ManifoldsTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Shuffle numbers 1 to 10
  const [numbers] = useState(() => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return arr.sort(() => 0.5 - Math.random());
  });

  const [nextExpected, setNextExpected] = useState<number>(1);
  const [errorFlash, setErrorFlash] = useState(false);

  const handleClick = (num: number) => {
    if (num === nextExpected) {
      const next = nextExpected + 1;
      setNextExpected(next);
      if (next > 10 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          onCompleteRef.current();
        }, 400);
      }
    } else {
      // Mistake! Reset back to 1 with a flash
      setErrorFlash(true);
      setNextExpected(1);
      setTimeout(() => setErrorFlash(false), 400);
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            REAKTOR MANIFOLDS ENTSPERREN
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
          <span className="text-slate-400">NÄCHSTE ZAHL:</span>
          <span className="text-xl font-black text-cyan-400">
            {nextExpected <= 10 ? nextExpected : 'FERTIG'}
          </span>
        </div>

        {/* 2x5 Number Grid */}
        <div className={`grid grid-cols-5 gap-3 p-4 bg-slate-900 rounded-2xl border transition-colors ${
          errorFlash ? 'border-red-500 bg-red-950/40' : 'border-slate-800'
        }`}>
          {numbers.map((num) => {
            const isUnlocked = num < nextExpected;
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleClick(num)}
                disabled={isUnlocked || nextExpected > 10}
                className={`h-20 rounded-xl font-mono text-2xl font-black transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-95 ${
                  isUnlocked
                    ? 'bg-slate-800/40 text-slate-600 border border-slate-800 shadow-none'
                    : 'bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white border-2 border-cyan-400 shadow-cyan-900/50'
                }`}
              >
                {isUnlocked ? <Check className="w-6 h-6 text-slate-600" /> : num}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs font-mono text-slate-400">
          {errorFlash ? (
            <span className="text-red-400 font-bold flex items-center justify-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Falsche Reihenfolge! Von 1 neu beginnen.
            </span>
          ) : nextExpected > 10 ? (
            <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Reaktor-Manifolds entsperrt!
            </span>
          ) : (
            <span>Klicke die Tasten der Reihe nach von 1 bis 10 an.</span>
          )}
        </div>
      </div>
    </div>
  );
}
