'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, CheckCircle2 } from 'lucide-react';
import { playSwitchClick, playTaskComplete } from '@/lib/sound';

interface FixLightsTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function FixLightsTask({ onComplete, onClose }: FixLightsTaskProps) {
  // 5 toggle switches (all must be turned ON / green)
  const [switches, setSwitches] = useState<boolean[]>([false, false, false, false, false]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Generate initial random broken state with at least 2 off
    const initial = [false, false, false, false, false].map(() => Math.random() > 0.6);
    if (initial.every((s) => s)) {
      initial[0] = false;
      initial[2] = false;
    }
    setSwitches(initial);
  }, []);

  const handleToggle = (index: number) => {
    if (isDone) return;
    playSwitchClick();
    const next = [...switches];
    next[index] = !next[index];
    setSwitches(next);

    if (next.every((s) => s)) {
      setIsDone(true);
      playTaskComplete();
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  return (
    <div className="relative bg-slate-900 border-4 border-amber-500/80 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-amber-500/20 text-white select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
      >
        <X size={20} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 animate-pulse">
          <Zap size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-wide text-amber-400">NOTFALL: LICHTER REPARIEREN</h2>
          <p className="text-xs text-slate-400">Schalte alle 5 Sicherungen ein</p>
        </div>
      </div>

      {/* Main Switchboard */}
      <div className="bg-slate-950/80 border-2 border-slate-700/60 rounded-xl p-5 mb-4">
        <div className="grid grid-cols-5 gap-3">
          {switches.map((isOn, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3">
              {/* Indicator LED */}
              <div
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  isOn
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/80 border border-emerald-300'
                    : 'bg-red-950 border border-red-800'
                }`}
              />

              {/* Heavy Toggle Switch */}
              <button
                onClick={() => handleToggle(idx)}
                className={`w-12 h-24 rounded-lg flex flex-col items-center justify-between p-1.5 transition-all active:scale-95 ${
                  isOn
                    ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-emerald-500 shadow-emerald-500/20'
                    : 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-inner'
                }`}
              >
                {/* Switch lever */}
                <div
                  className={`w-9 h-10 rounded-md shadow-md transition-all duration-200 ${
                    isOn
                      ? 'bg-emerald-500 translate-y-0 text-[10px] font-black text-slate-950 flex items-center justify-center'
                      : 'bg-slate-600 translate-y-11 text-[10px] font-black text-slate-400 flex items-center justify-center'
                  }`}
                >
                  {isOn ? 'ON' : 'OFF'}
                </div>
              </button>

              <span className="text-[11px] font-mono text-slate-500">SW-{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm tracking-wider uppercase transition-colors ${
          isDone
            ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
        }`}
      >
        {isDone ? (
          <>
            <CheckCircle2 size={18} />
            STROMVERSORGUNG WIEDERHERGESTELLT!
          </>
        ) : (
          <>
            <Zap size={16} className="animate-bounce" />
            SICHERUNGSSCHALTER BETÄTIGEN
          </>
        )}
      </div>
    </div>
  );
}
