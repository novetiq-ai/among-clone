'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Check } from 'lucide-react';
import { PlayerColor } from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { sound } from '@/lib/sound';

interface MedbayScanTaskProps {
  playerColor: PlayerColor;
  playerName: string;
  onComplete: () => void;
  onClose: () => void;
}

export function MedbayScanTask({ playerColor, playerName, onComplete, onClose }: MedbayScanTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            sound.playTaskComplete();
            setTimeout(() => {
              onCompleteRef.current();
            }, 500);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            MEDBAY KÖRPERSCAN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Holographic Scanner Display */}
      <div className="relative bg-slate-950 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-inner flex flex-col items-center gap-6 overflow-hidden">
        {/* Hologram Scanner Circle */}
        <div className="relative w-48 h-48 rounded-full border-2 border-emerald-400/40 flex items-center justify-center bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          {/* Animated Scanning Beam */}
          <div
            className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] transition-all"
            style={{ top: `${(Math.sin(progress / 5) + 1) * 45}%` }}
          />

          <AstronautAvatar color={playerColor} size={90} />
        </div>

        {/* Biometrics Data Readout */}
        <div className="w-full grid grid-cols-2 gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-mono text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">SUBJEKT:</span>
            <span className="text-white font-bold">{playerName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">BLUTGRUPPE:</span>
            <span className="text-emerald-400 font-bold">O+ (UNIVERSAL)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">GEWICHT:</span>
            <span className="text-slate-200 font-bold">92 LBS</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">STATUS:</span>
            <span className="text-emerald-400 font-bold">ORGANISCH VITAL</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400">SCANNING FORTSCHRITT:</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progress >= 100 && (
          <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4" /> SCAN VOLLSTÄNDIG ABGESCHLOSSEN!
          </div>
        )}
      </div>
    </div>
  );
}
