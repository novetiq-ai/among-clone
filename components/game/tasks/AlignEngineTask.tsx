'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Gauge, Check, ArrowRight } from 'lucide-react';
import { sound } from '@/lib/sound';

interface AlignEngineTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function AlignEngineTask({ onComplete, onClose }: AlignEngineTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initial offset from center (-40 to +40, excluding near 0)
  const [offset, setOffset] = useState<number>(() => {
    const val = (Math.random() - 0.5) * 60;
    return Math.abs(val) < 15 ? (val < 0 ? -25 : 25) : val;
  });

  const [isAligned, setIsAligned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderTrackRef.current || hasCompletedRef.current) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    // Center is 50%. Offset = (yPct - 50) * 1.5
    const newOffset = Math.max(-45, Math.min(45, (yPct - 50) * 1.5));
    // If within +- 3.5 degrees of 0, snap directly to 0
    if (Math.abs(newOffset) < 3.5) {
      setOffset(0);
      if (!isAligned) {
        setIsAligned(true);
        sound.playShieldClick();
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 500);
        }
      }
    } else {
      setOffset(newOffset);
      setIsAligned(false);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            TRIEBWERK: SCHUB AUSRICHTEN
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
          <span className="text-slate-400">AUSRICHTUNG:</span>
          <span className={`text-sm font-black ${isAligned ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isAligned ? 'PERFEKT AUSGERICHTET (0°)' : `${Math.round(offset)}° ABWEICHUNG`}
          </span>
        </div>

        {/* Engine Display Screen + Slider */}
        <div
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-72 flex gap-4 touch-none"
        >
          {/* Main Visualizer Radar */}
          <div className="relative flex-1 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
            {/* Target horizontal dashed line */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 border-b-2 border-dashed border-cyan-400/60 z-10" />

            {/* Target center marker */}
            <div className="absolute top-1/2 left-4 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>

            {/* Engine Jet Thruster Angle Indicator */}
            <div
              style={{
                transform: `rotate(${offset}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="relative w-48 h-12 flex items-center justify-between px-2 rounded-xl transition-colors z-20"
            >
              <div
                className={`w-full h-3 rounded-full flex items-center justify-end px-1 shadow-lg transition-colors ${
                  isAligned
                    ? 'bg-emerald-500 shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-amber-500/50'
                }`}
              >
                <ArrowRight
                  className={`w-6 h-6 stroke-[3] ${
                    isAligned ? 'text-white' : 'text-slate-950'
                  }`}
                />
              </div>
            </div>

            {/* Status text */}
            <div className="absolute bottom-3 inset-x-0 text-center font-mono text-[10px] text-slate-500">
              SOLAR-IMPULS-TRIEBWERK
            </div>
          </div>

          {/* Vertical Slider Bar */}
          <div
            ref={sliderTrackRef}
            className="w-16 bg-slate-900 border-4 border-slate-800 rounded-2xl relative flex items-center justify-center p-2 cursor-ns-resize shadow-inner"
          >
            {/* Center reference notch */}
            <div className="absolute top-1/2 inset-x-2 -translate-y-1/2 h-1 bg-cyan-400/80 rounded" />

            {/* Draggable Slider Handle */}
            <div
              onPointerDown={handlePointerDown}
              style={{
                top: `${50 + offset / 1.5}%`,
                transform: 'translateY(-50%)',
              }}
              className={`absolute inset-x-2 h-14 rounded-xl border-2 shadow-xl flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing transition-transform active:scale-105 ${
                isAligned
                  ? 'bg-emerald-500 border-emerald-300 shadow-emerald-950'
                  : 'bg-gradient-to-b from-amber-500 to-amber-600 border-amber-300 shadow-amber-950'
              }`}
            >
              <div className="w-5 h-0.5 bg-slate-950/60 rounded" />
              <div className="w-5 h-0.5 bg-slate-950/60 rounded" />
              <div className="w-5 h-0.5 bg-slate-950/60 rounded" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Bewege den <span className="text-amber-400 font-bold">Schieberegler</span> nach oben oder unten, bis der Pfeil exakt mittig auf der <span className="text-cyan-400 font-bold">cyanfarbenen Linie</span> liegt!
        </p>
      </div>
    </div>
  );
}
