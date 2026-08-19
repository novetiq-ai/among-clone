'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Check, AlertTriangle } from 'lucide-react';
import { sound } from '@/lib/sound';

interface SwipeCardTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function SwipeCardTask({ onComplete, onClose }: SwipeCardTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [cardTaken, setCardTaken] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 100
  const [swipeStatus, setSwipeStatus] = useState<'idle' | 'swiping' | 'too_fast' | 'too_slow' | 'accepted'>('idle');
  const startTimeRef = useRef<number>(0);
  const startPercentRef = useRef<number>(0);
  const hasMovedThroughMiddleRef = useRef<boolean>(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const handleTakeCard = () => {
    if (!cardTaken) {
      sound.playButtonClick();
      setCardTaken(true);
      setSwipeStatus('idle');
    }
  };

  const getPercent = (clientX: number) => {
    if (!slotRef.current) return 0;
    const rect = slotRef.current.getBoundingClientRect();
    const currentX = clientX - rect.left;
    const totalWidth = rect.width;
    return Math.max(0, Math.min(100, (currentX / totalWidth) * 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardTaken || swipeStatus === 'accepted') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const pct = getPercent(e.clientX);
    startTimeRef.current = now;
    startPercentRef.current = pct;
    hasMovedThroughMiddleRef.current = false;
    sound.playCardSwipe();
    setSwipeStatus('swiping');
    setSwipeProgress(pct);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (swipeStatus === 'swiping') {
      const pct = getPercent(e.clientX);
      if (pct >= 35 && pct <= 75) {
        hasMovedThroughMiddleRef.current = true;
      }
      setSwipeProgress(pct);
    }
  };

  const handlePointerUp = () => {
    if (swipeStatus !== 'swiping') return;

    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const duration = now - startTimeRef.current;

    // Must start on left side (< 30%) and travel through the middle
    const isValidSwipePath = startPercentRef.current <= 30 && hasMovedThroughMiddleRef.current;

    if (swipeProgress < 80 || !isValidSwipePath) {
      // Incomplete swipe or skipped middle
      sound.playErrorBuzz();
      setSwipeStatus('too_slow');
      setSwipeProgress(0);
    } else if (duration < 350) {
      // Too fast
      sound.playErrorBuzz();
      setSwipeStatus('too_fast');
      setSwipeProgress(0);
    } else if (duration > 1500) {
      // Too slow
      sound.playErrorBuzz();
      setSwipeStatus('too_slow');
      setSwipeProgress(0);
    } else {
      // Accepted!
      sound.playTaskComplete();
      setSwipeStatus('accepted');
      setSwipeProgress(100);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          onCompleteRef.current();
        }, 500);
      }
    }
  };

  return (
    <div
      className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            ADMIN KARTE DURCHZIEHEN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Card Reader Device */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col gap-6">
        {/* Status Indicator Screen */}
        <div className="h-12 bg-black border border-slate-800 rounded-xl flex items-center justify-center font-mono font-bold text-sm tracking-wider uppercase">
          {swipeStatus === 'idle' && (
            <span className="text-slate-400">
              {cardTaken ? 'KARTE DURCHZIEHEN...' : 'KLICKE AUF DIE KARTE IM PORTEMONNAIE'}
            </span>
          )}
          {swipeStatus === 'swiping' && (
            <span className="text-amber-400 animate-pulse">LESE DATEN...</span>
          )}
          {swipeStatus === 'too_fast' && (
            <span className="text-red-400 flex items-center gap-1.5 animate-bounce">
              <AlertTriangle className="w-4 h-4" /> ZU SCHNELL! NOCHMAL VERSUCHEN.
            </span>
          )}
          {swipeStatus === 'too_slow' && (
            <span className="text-amber-400 flex items-center gap-1.5 animate-bounce">
              <AlertTriangle className="w-4 h-4" /> ZU LANGSAM! NOCHMAL VERSUCHEN.
            </span>
          )}
          {swipeStatus === 'accepted' && (
            <span className="text-emerald-400 flex items-center gap-1.5 animate-pulse">
              <Check className="w-5 h-5" /> ZUGANG GEWÄHRT!
            </span>
          )}
        </div>

        {/* Swipe Slot Track */}
        <div
          ref={slotRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative h-20 bg-slate-900 border-2 rounded-xl flex items-center px-2 cursor-grab active:cursor-grabbing shadow-inner transition-colors ${
            cardTaken ? 'border-emerald-500/50 bg-slate-900/80' : 'border-slate-800 opacity-60'
          }`}
        >
          <div className="absolute inset-x-4 h-2 bg-black rounded-full border border-slate-800 pointer-events-none" />

          {/* Draggable Card in Slot */}
          {cardTaken && (
            <div
              style={{ left: `calc(${swipeProgress}% - 40px)` }}
              className={`absolute top-2 w-24 h-16 rounded-xl border-2 shadow-2xl flex flex-col justify-between p-2 font-mono text-[9px] transition-transform ${
                swipeStatus === 'accepted'
                  ? 'bg-emerald-600 border-emerald-300 text-white'
                  : 'bg-indigo-600 border-indigo-400 text-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">CREW_ID</span>
                <span className="w-3 h-2 bg-yellow-400 rounded-sm" />
              </div>
              <div className="text-[8px] opacity-75">SKELD-ADMIN</div>
            </div>
          )}
        </div>

        {/* Wallet Container at Bottom */}
        <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">
            <span className="block font-bold text-slate-300 font-mono">Brieftasche</span>
            <span>Klicke auf die Karte, um sie herauszuziehen.</span>
          </div>

          {!cardTaken ? (
            <button
              onClick={handleTakeCard}
              className="w-24 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 border-2 border-indigo-300 shadow-xl flex flex-col justify-between p-2 text-white font-mono text-[9px] hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">ID-CARD</span>
                <span className="w-3 h-2 bg-yellow-400 rounded-sm" />
              </div>
              <span className="text-[8px]">KLICKEN</span>
            </button>
          ) : (
            <div className="w-24 h-16 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-600 font-mono">
              [LEER]
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
