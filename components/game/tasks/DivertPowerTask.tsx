'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Zap, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface DivertPowerTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function DivertPowerTask({ onComplete, onClose }: DivertPowerTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [sliderValue, setSliderValue] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    if (val >= 95 && !isDone) {
      setIsDone(true);
      sound.playSwitchClick();
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        sound.playTaskComplete();
        setTimeout(() => {
          onCompleteRef.current();
        }, 400);
      }
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            ENERGIE UMLEITEN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Slider Panel */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col items-center gap-6">
        <div className="w-full flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">ENERGIE-DISTRIBUTOR</span>
          <span className="text-amber-400 font-bold">{sliderValue}%</span>
        </div>

        {/* Vertical or Heavy Horizontal Slider Track */}
        <div className="w-full bg-slate-900/90 p-6 rounded-2xl border border-slate-800 flex flex-col items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleChange}
            disabled={isDone}
            className="w-full h-8 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-slate-700"
          />

          <div className="w-full flex justify-between text-[10px] font-mono text-slate-500">
            <span>OFF</span>
            <span>50%</span>
            <span className="text-amber-400 font-bold">MAX (100%)</span>
          </div>
        </div>

        {isDone ? (
          <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4" /> ENERGIE ERFOLGREICH UMGELENKT!
          </div>
        ) : (
          <div className="text-slate-400 font-mono text-xs text-center">
            Ziehe den Schieberegler ganz nach rechts auf MAX.
          </div>
        )}
      </div>
    </div>
  );
}
