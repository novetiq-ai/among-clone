'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TestTube, Check, AlertCircle } from 'lucide-react';
import { sound } from '@/lib/sound';

interface InspectSampleTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function InspectSampleTask({ onComplete, onClose }: InspectSampleTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Anomaly tube index (0..4)
  const [anomalyIndex] = useState(() => Math.floor(Math.random() * 5));
  // State: 'idle' (ready to start), 'analyzing' (countdown), 'ready_to_pick' (one turned red), 'complete'
  const [state, setState] = useState<'idle' | 'analyzing' | 'ready_to_pick' | 'complete'>('idle');
  const [timer, setTimer] = useState(5);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);

  const startAnalysis = () => {
    sound.playShieldClick();
    setState('analyzing');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'analyzing') {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setState('ready_to_pick');
            sound.playToneBeep(880, 0.2);
            return 0;
          }
          sound.playToneBeep(440, 0.05);
          return prev - 1;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [state]);

  const selectTube = (idx: number) => {
    if (state !== 'ready_to_pick' || hasCompletedRef.current) return;

    if (idx === anomalyIndex) {
      setSelectedTube(idx);
      setState('complete');
      sound.playShieldClick();
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          sound.playTaskComplete();
          onCompleteRef.current();
        }, 500);
      }
    } else {
      sound.playToneBeep(200, 0.2);
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <TestTube className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            MEDBAY: PROBEN ANALYSIEREN
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
          <span className="text-slate-400">ANALYSATOR-STATUS:</span>
          <span className="text-sm font-black text-cyan-400">
            {state === 'idle'
              ? 'BEREIT'
              : state === 'analyzing'
              ? `TEST LÄUFT... (${timer}s)`
              : state === 'ready_to_pick'
              ? 'ANOMALIE ERKANNT! WÄHLE DIE ROTE PROBE'
              : 'PROBE BESTÄTIGT'}
          </span>
        </div>

        {/* Incubator Rack with 5 Test Tubes */}
        <div className="relative w-full h-56 bg-slate-900/90 rounded-2xl border-4 border-slate-800 flex items-center justify-around px-6 overflow-hidden shadow-inner">
          {/* Background shelf rack */}
          <div className="absolute inset-x-4 top-1/2 h-4 bg-slate-800 border border-slate-700 rounded" />

          {[0, 1, 2, 3, 4].map((idx) => {
            const isAnomaly = idx === anomalyIndex;
            const isPicked = selectedTube === idx;
            const showAnomaly = state === 'ready_to_pick' || state === 'complete';

            let liquidColor = 'bg-blue-500 shadow-blue-500/50';
            if (state === 'idle') {
              liquidColor = 'bg-slate-700';
            } else if (showAnomaly && isAnomaly) {
              liquidColor = 'bg-red-500 shadow-red-500/80 animate-pulse';
            }

            return (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                {/* Tube glass */}
                <button
                  type="button"
                  onClick={() => selectTube(idx)}
                  disabled={state !== 'ready_to_pick'}
                  className={`w-12 h-36 rounded-b-2xl border-2 border-slate-400/60 bg-slate-950/60 p-1 flex flex-col justify-end transition-all ${
                    state === 'ready_to_pick' && isAnomaly
                      ? 'cursor-pointer hover:scale-110 ring-4 ring-red-400'
                      : state === 'ready_to_pick'
                      ? 'cursor-pointer hover:scale-105'
                      : ''
                  }`}
                >
                  {/* Fluid level */}
                  <div
                    style={{
                      height: state === 'idle' ? '15%' : '75%',
                      transition: 'height 1.5s ease-out',
                    }}
                    className={`w-full rounded-b-xl shadow-lg transition-all ${liquidColor}`}
                  />
                </button>

                {/* Tube Number / Button */}
                {state === 'ready_to_pick' && (
                  <button
                    type="button"
                    onClick={() => selectTube(idx)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-black border flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                      isPicked
                        ? 'bg-emerald-500 text-white border-emerald-300'
                        : isAnomaly
                        ? 'bg-red-600 text-white border-red-400 animate-bounce'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isPicked ? <Check className="w-4 h-4" /> : idx + 1}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Start Button or Instruction */}
        {state === 'idle' && (
          <button
            type="button"
            onClick={startAnalysis}
            className="w-full py-3.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-2 border-cyan-300 shadow-xl cursor-pointer active:scale-95"
          >
            ANALYSE STARTEN
          </button>
        )}

        {/* Footer */}
        <p className="text-xs font-mono text-center text-slate-400">
          {state === 'idle' && 'Drücke auf Analyse starten, um die Testreagenzien einzufüllen.'}
          {state === 'analyzing' && 'Inkubator läuft... Bitte warten.'}
          {state === 'ready_to_pick' && 'Klicke auf das Reagenzglas mit der roten Anomalie-Flüssigkeit!'}
          {state === 'complete' && 'Anomalie erfolgreich isoliert!'}
        </p>
      </div>
    </div>
  );
}
