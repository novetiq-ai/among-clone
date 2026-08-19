'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Zap, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface CalibrateDistributorTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

const DIAL_SPEEDS = [120, 160, 200]; // degrees per second
const DIAL_COLORS = ['#f59e0b', '#3b82f6', '#ec4899'];

export function CalibrateDistributorTask({ onComplete, onClose }: CalibrateDistributorTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Active step: 0 (first dial), 1 (second dial), 2 (third dial)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [angles, setAngles] = useState<[number, number, number]>([0, 120, 240]);
  const [errorFlash, setErrorFlash] = useState(false);
  const [lockedSteps, setLockedSteps] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const lockedStepsRef = useRef<[boolean, boolean, boolean]>([false, false, false]);

  const anglesRef = useRef<[number, number, number]>([0, 120, 240]);

  useEffect(() => {
    let lastTime = performance.now();
    let animFrame: number;

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const nextAngles: [number, number, number] = [
        lockedStepsRef.current[0] ? anglesRef.current[0] : (anglesRef.current[0] + DIAL_SPEEDS[0] * delta) % 360,
        lockedStepsRef.current[1] ? anglesRef.current[1] : (anglesRef.current[1] + DIAL_SPEEDS[1] * delta) % 360,
        lockedStepsRef.current[2] ? anglesRef.current[2] : (anglesRef.current[2] + DIAL_SPEEDS[2] * delta) % 360,
      ];
      anglesRef.current = nextAngles;
      setAngles(nextAngles);

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const handleDialClick = (stepIndex: number) => {
    if (stepIndex !== currentStep || hasCompletedRef.current) return;

    // Contact is located at 0 degrees (pointing directly right)
    // Tolerant window: between 340 deg and 20 deg (within +- 20 degrees of 0 deg)
    const angle = anglesRef.current[stepIndex];
    const isAligned = angle >= 340 || angle <= 20;

    if (isAligned) {
      sound.playShieldClick();
      const newLocked: [boolean, boolean, boolean] = [...lockedSteps];
      newLocked[stepIndex] = true;
      lockedStepsRef.current = newLocked;
      setLockedSteps(newLocked);

      const nextStep = currentStep + 1;
      if (nextStep >= 3) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 400);
        }
      } else {
        setCurrentStep(nextStep);
      }
    } else {
      // Mistake! Reset
      sound.playToneBeep(240, 0.2);
      setErrorFlash(true);
      setCurrentStep(0);
      setLockedSteps([false, false, false]);
      setTimeout(() => setErrorFlash(false), 400);
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            ELEKTRIK: VERTEILER KALIBRIEREN
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
        {/* Status display */}
        <div className="flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">KALIBRIERUNG:</span>
          <span className="text-sm font-black text-amber-400">
            {lockedSteps.filter(Boolean).length} / 3 STUFEN VERRIEGELT
          </span>
        </div>

        {/* 3 Dials rows */}
        <div className={`flex flex-col gap-4 p-4 rounded-2xl border transition-colors ${
          errorFlash ? 'border-red-500 bg-red-950/40' : 'border-slate-800 bg-slate-900'
        }`}>
          {[0, 1, 2].map((idx) => {
            const isLocked = lockedSteps[idx];
            const isActive = currentStep === idx;
            const angle = angles[idx];

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isLocked
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : isActive
                    ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 opacity-60'
                }`}
              >
                {/* Rotating Dial */}
                <div className="relative w-20 h-20 rounded-full border-4 border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner">
                  {/* Right contact gate */}
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-5 rounded-l-md border border-slate-500"
                    style={{ backgroundColor: isLocked ? '#22c55e' : DIAL_COLORS[idx] }}
                  />

                  {/* Rotating pointer ring */}
                  <div
                    className="absolute inset-1 rounded-full flex items-center justify-end"
                    style={{
                      transform: isLocked ? 'rotate(0deg)' : `rotate(${angle}deg)`,
                      transition: isLocked ? 'transform 0.2s ease-out' : 'none',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md -mr-1"
                      style={{ backgroundColor: isLocked ? '#22c55e' : DIAL_COLORS[idx] }}
                    />
                  </div>

                  {/* Center hub */}
                  <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center font-mono text-[10px] font-bold text-slate-300">
                    {idx + 1}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-1 font-mono text-xs">
                  <span className="text-slate-400 text-[10px]">KNOTEN {idx + 1}</span>
                  {isLocked ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> OK
                    </span>
                  ) : isActive ? (
                    <span className="text-cyan-400 font-bold animate-pulse">BEREIT</span>
                  ) : (
                    <span className="text-slate-600 font-bold">WARTEN</span>
                  )}
                </div>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => handleDialClick(idx)}
                  disabled={!isActive || isLocked}
                  className={`w-28 py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${
                    isLocked
                      ? 'bg-emerald-800/40 text-emerald-400 border border-emerald-600/50 shadow-none'
                      : isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-300 font-bold'
                      : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Check className="w-4 h-4" /> VERRIEGELT
                    </>
                  ) : (
                    'EINRASTEN'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Klicke auf <span className="text-amber-400 font-bold">EINRASTEN</span> genau in dem Moment, in dem der rotierende Kreis den rechten Kontakt berührt!
        </p>
      </div>
    </div>
  );
}
