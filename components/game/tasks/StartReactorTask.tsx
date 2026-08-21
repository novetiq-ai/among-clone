'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Cpu } from 'lucide-react';
import { sound } from '@/lib/sound';

interface StartReactorTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function StartReactorTask({ onComplete, onClose }: StartReactorTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 5 Steps Simon Says
  const TOTAL_ROUNDS = 5;
  const [sequence] = useState<number[]>(() =>
    Array.from({ length: TOTAL_ROUNDS }, () => Math.floor(Math.random() * 9))
  );
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [playerInputIndex, setPlayerInputIndex] = useState<number>(0);
  const [activeDisplayIndex, setActiveDisplayIndex] = useState<number | null>(null);
  const [isShowingSequence, setIsShowingSequence] = useState<boolean>(true);
  const [errorFlash, setErrorFlash] = useState<boolean>(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear all pending sequence timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Playback sequence function
  const playSequence = useCallback((round: number, fullSeq: number[]) => {
    clearAllTimeouts();
    setIsShowingSequence(true);
    setPlayerInputIndex(0);
    const roundSeq = fullSeq.slice(0, round);

    roundSeq.forEach((padIndex, step) => {
      const t1 = setTimeout(() => {
        setActiveDisplayIndex(padIndex);
        sound.playToneBeep(350 + padIndex * 60, 0.18);
        const t2 = setTimeout(() => {
          setActiveDisplayIndex(null);
        }, 300);
        timeoutsRef.current.push(t2);
      }, step * 500 + 400);
      timeoutsRef.current.push(t1);
    });

    const tFinal = setTimeout(() => {
      setIsShowingSequence(false);
    }, roundSeq.length * 500 + 500);
    timeoutsRef.current.push(tFinal);
  }, [clearAllTimeouts]);

  // Trigger sequence playback whenever round changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sequence.length > 0 && currentRound <= TOTAL_ROUNDS) {
        playSequence(currentRound, sequence);
      }
    }, 100);
    timeoutsRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [currentRound, sequence, playSequence]);

  const handlePadClick = (padIndex: number) => {
    if (isShowingSequence || hasCompletedRef.current || errorFlash) return;

    sound.playToneBeep(350 + padIndex * 60, 0.15);

    const expected = sequence[playerInputIndex];
    if (padIndex === expected) {
      const nextInputIdx = playerInputIndex + 1;
      if (nextInputIdx === currentRound) {
        // Round completed!
        if (currentRound === TOTAL_ROUNDS) {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            const completionTimer = setTimeout(() => {
              sound.playTaskComplete();
              onCompleteRef.current();
            }, 400);
            timeoutsRef.current.push(completionTimer);
          }
        } else {
          // Next round
          setCurrentRound((prev) => prev + 1);
        }
      } else {
        setPlayerInputIndex(nextInputIdx);
      }
    } else {
      // Mistake! Flash red and repeat round
      sound.playToneBeep(180, 0.3);
      setErrorFlash(true);
      const retryTimer = setTimeout(() => {
        setErrorFlash(false);
        playSequence(currentRound, sequence);
      }, 600);
      timeoutsRef.current.push(retryTimer);
    }
  };

  return (
    <div className="w-full max-w-xl bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            REAKTOR: SEQUENZ STARTEN (SIMON SAYS)
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Reaktor-Aufgabe schließen"
          className="min-h-11 text-slate-400 hover:text-white text-xs font-mono font-bold px-3 py-2 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col gap-6">
        {/* Progress & Round indicator */}
        <div className="flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">SEQUENZ-STUFE:</span>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-black">
              {currentRound} / {TOTAL_ROUNDS}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-sm ${
                    idx < currentRound - 1
                      ? 'bg-emerald-400'
                      : idx === currentRound - 1
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dual 3x3 Panels (Left = Display, Right = Input) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Memory Display */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isShowingSequence ? 'VORZEIGEN...' : 'DISPLAY'}
            </span>
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 w-full aspect-square">
              {Array.from({ length: 9 }).map((_, idx) => {
                const isActive = activeDisplayIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all ${
                      isActive
                        ? 'bg-cyan-400 border-white shadow-lg shadow-cyan-400 scale-105'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Keypad Input */}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isShowingSequence ? 'BITTE WARTEN...' : 'EINGABE'}
            </span>
            <div
              className={`grid grid-cols-3 gap-2 p-3 rounded-2xl border w-full aspect-square transition-colors ${
                errorFlash
                  ? 'bg-red-950/40 border-red-500'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {Array.from({ length: 9 }).map((_, idx) => {
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Reaktor-Eingabefeld ${idx + 1}`}
                    onClick={() => handlePadClick(idx)}
                    disabled={isShowingSequence || errorFlash}
                    className={`rounded-xl border-2 font-mono font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-md ${
                      isShowingSequence
                        ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-b from-cyan-700 to-cyan-900 hover:from-cyan-600 hover:to-cyan-800 text-white border-cyan-500 shadow-cyan-950'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Merke dir das <span className="text-cyan-400 font-bold">Lichtmuster links</span> und tippe es <span className="text-cyan-400 font-bold">rechts</span> nach!
        </p>
      </div>
    </div>
  );
}
