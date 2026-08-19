'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Check, ArrowDown } from 'lucide-react';
import { sound } from '@/lib/sound';

interface EmptyGarbageTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

interface TrashItem {
  id: number;
  name: string;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
}

export function EmptyGarbageTask({ onComplete, onClose }: EmptyGarbageTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [leverHeld, setLeverHeld] = useState(false);
  const [emptyProgress, setEmptyProgress] = useState(0); // 0 to 100
  const [trashItems, setTrashItems] = useState<TrashItem[]>([
    { id: 1, name: 'Banana', emoji: '🍌', x: 80, y: 180, rotation: 25 },
    { id: 2, name: 'Can', emoji: '🥫', x: 140, y: 190, rotation: -15 },
    { id: 3, name: 'Bone', emoji: '🦴', x: 190, y: 170, rotation: 40 },
    { id: 4, name: 'Bottle', emoji: '🍾', x: 100, y: 130, rotation: -30 },
    { id: 5, name: 'Paper', emoji: '📄', x: 160, y: 120, rotation: 60 },
    { id: 6, name: 'Apple', emoji: '🍎', x: 210, y: 150, rotation: -10 },
    { id: 7, name: 'Diamond', emoji: '💎', x: 130, y: 80, rotation: 15 },
  ]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (leverHeld && !hasCompletedRef.current) {
      sound.playTrashFlush();
      timer = setInterval(() => {
        setEmptyProgress((prev) => {
          const next = prev + 5;
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

        // Drop trash items downwards
        setTrashItems((items) =>
          items
            .map((item) => ({
              ...item,
              y: item.y + 18,
              rotation: item.rotation + 15,
            }))
            .filter((item) => item.y < 340)
        );
      }, 80);
    }

    return () => {
      clearInterval(timer);
    };
  }, [leverHeld]);

  const handleLeverDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setLeverHeld(true);
  };

  const handleLeverUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setLeverHeld(false);
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            MÜLLSCHACHT: MÜLL ENTSORGEN
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
          <span className="text-slate-400">SCHACHT-STATUS:</span>
          <span className="text-sm font-black text-emerald-400">
            {emptyProgress >= 100 ? 'VOLLSTÄNDIG GELEERT' : `${100 - emptyProgress}% MÜLL VERBLIEBEN`}
          </span>
        </div>

        {/* Chute Container + Lever */}
        <div className="relative w-full h-72 flex gap-4 touch-none">
          {/* Transparent Garbage Compartment */}
          <div className="relative flex-1 bg-slate-900/80 rounded-2xl border-4 border-slate-800 overflow-hidden shadow-inner flex flex-col justify-end p-4">
            {/* Space Void underneath hatch */}
            <div
              className={`absolute inset-x-0 bottom-0 h-16 bg-black border-t-2 border-slate-700 transition-all ${
                leverHeld ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="text-[10px] font-mono text-center text-slate-600 mt-2">
                WELTRAUM-AUSWURF
              </div>
            </div>

            {/* Floating Trash Items */}
            {trashItems.map((item) => (
              <div
                key={item.id}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  transform: `rotate(${item.rotation}deg)`,
                }}
                className="absolute text-4xl select-none pointer-events-none drop-shadow-lg"
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Spring-Loaded Pull Lever */}
          <div className="w-24 bg-slate-900 border-4 border-slate-800 rounded-2xl flex flex-col items-center justify-between p-3 relative shadow-inner">
            <span className="font-mono text-[10px] font-bold text-slate-400">HEBEL</span>

            {/* Lever track */}
            <div className="relative w-4 flex-1 bg-slate-950 border-2 border-slate-800 rounded-full my-2 flex items-center justify-center">
              {/* Lever Handle */}
              <button
                type="button"
                onPointerDown={handleLeverDown}
                onPointerUp={handleLeverUp}
                onPointerLeave={handleLeverUp}
                style={{
                  top: leverHeld ? '75%' : '15%',
                  transform: 'translateY(-50%)',
                }}
                className={`absolute inset-x--4 w-16 h-14 rounded-2xl border-2 shadow-xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all active:scale-105 select-none ${
                  leverHeld
                    ? 'bg-gradient-to-b from-red-600 to-red-800 border-red-400 shadow-red-950'
                    : 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-300 shadow-emerald-950 hover:from-emerald-400 hover:to-emerald-600'
                }`}
              >
                <ArrowDown className={`w-6 h-6 stroke-[3] ${leverHeld ? 'text-white' : 'text-slate-950 animate-bounce'}`} />
              </button>
            </div>

            <span className="font-mono text-[9px] font-bold text-center text-slate-500">
              HALTEN
            </span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs font-mono text-center text-slate-400">
          Ziehe den <span className="text-emerald-400 font-bold">Hebel nach unten</span> und halte ihn gedrückt, bis der gesamte Müll ins All gesaugt wurde!
        </p>
      </div>
    </div>
  );
}
