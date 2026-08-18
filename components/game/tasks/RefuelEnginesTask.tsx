'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Fuel, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface RefuelEnginesTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function RefuelEnginesTask({ onComplete, onClose }: RefuelEnginesTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [fuelLevel, setFuelLevel] = useState(0); // 0 to 100
  const [isFueling, setIsFueling] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFueling && !hasCompletedRef.current) {
      sound.playShieldClick();
      timer = setInterval(() => {
        setFuelLevel((prev) => {
          const next = prev + 4;
          if (next >= 100 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            clearInterval(timer);
            setTimeout(() => {
              sound.playTaskComplete();
              onCompleteRef.current();
            }, 400);
            return 100;
          }
          return next;
        });
      }, 70);
    }
    return () => clearInterval(timer);
  }, [isFueling]);

  const handlePointerDown = () => {
    setIsFueling(true);
  };

  const handlePointerUp = () => {
    setIsFueling(false);
  };

  const isFull = fuelLevel >= 100;

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            LAGER / TRIEBWERK: TREIBSTOFF TANKEN
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
          <span className="text-slate-400">TANK-FÜLLSTAND:</span>
          <span className={`text-sm font-black ${isFull ? 'text-emerald-400' : 'text-amber-400'}`}>
            {fuelLevel}% {isFull && '— VOLL'}
          </span>
        </div>

        {/* Tank Chamber + Fuel Button */}
        <div className="relative w-full h-64 flex gap-6 touch-none">
          {/* Fuel Canister Graphic */}
          <div className="relative flex-1 bg-slate-900 rounded-2xl border-4 border-slate-800 p-4 flex flex-col justify-between shadow-inner">
            {/* Top Cap */}
            <div className="flex justify-between items-center px-2">
              <div className="w-8 h-4 bg-amber-500 rounded-t border border-amber-300" />
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <span className={`w-2.5 h-2.5 rounded-full ${isFull ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                {isFull ? 'BEREIT' : 'LEER'}
              </div>
            </div>

            {/* Main Transparent Fuel Gauge */}
            <div className="relative w-full h-44 bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden flex flex-col justify-end p-1">
              {/* Level graduation marks */}
              <div className="absolute inset-y-2 left-2 flex flex-col justify-between z-10 pointer-events-none opacity-40 font-mono text-[8px] text-white">
                <span>100% —</span>
                <span>75% —</span>
                <span>50% —</span>
                <span>25% —</span>
              </div>

              {/* Liquid */}
              <div
                style={{ height: `${fuelLevel}%`, transition: 'height 0.1s linear' }}
                className="w-full bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-400 rounded-lg shadow-lg shadow-amber-500/30 relative"
              >
                {/* Fuel Surface Bubble Ripple */}
                {isFueling && !isFull && (
                  <div className="absolute inset-x-0 -top-1.5 h-3 bg-yellow-200/80 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Hold to Fuel Button */}
          <div className="w-36 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              disabled={isFull}
              className={`w-32 h-32 rounded-3xl border-4 font-mono font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-2 shadow-2xl transition-all select-none active:scale-95 ${
                isFull
                  ? 'bg-emerald-800/40 text-emerald-400 border-emerald-500/50 shadow-none cursor-default'
                  : isFueling
                  ? 'bg-gradient-to-b from-blue-600 to-blue-800 text-white border-cyan-300 shadow-cyan-500/50 scale-95'
                  : 'bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-blue-300 shadow-blue-900/60 cursor-pointer'
              }`}
            >
              {isFull ? (
                <>
                  <Check className="w-10 h-10 stroke-[3]" />
                  <span className="text-xs">VOLL</span>
                </>
              ) : (
                <>
                  <Fuel className="w-8 h-8" />
                  <span className="text-[11px] leading-tight text-center">
                    GEDRÜCKT<br />HALTEN
                  </span>
                </>
              )}
            </button>
            <span className="font-mono text-[9px] font-bold text-slate-500 text-center">
              PUMPE
            </span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Halte den blauen <span className="text-blue-400 font-bold">PUMPEN-KNOPF</span> gedrückt, bis der Treibstoffkanister zu 100% gefüllt ist!
        </p>
      </div>
    </div>
  );
}
