'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface WireTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

const WIRE_COLORS = [
  { id: 'red', name: 'Rot', hex: '#ef4444' },
  { id: 'blue', name: 'Blau', hex: '#3b82f6' },
  { id: 'yellow', name: 'Gelb', hex: '#eab308' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
];

export function WireTask({ onComplete, onClose }: WireTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [leftWires] = useState(() => [...WIRE_COLORS]);
  const [rightWires] = useState(() => [...WIRE_COLORS].sort(() => 0.5 - Math.random()));
  
  // Connections: map of leftColorId -> rightColorId
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [draggingLeftId, setDraggingLeftId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isAllConnected = 
    Object.keys(connections).length === 4 &&
    Object.entries(connections).every(([leftId, rightId]) => leftId === rightId);

  useEffect(() => {
    if (isAllConnected && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAllConnected]);

  // Coordinates helper (Row height is 64px, top offset is 100px)
  const getLeftPinPos = (colorId: string) => {
    const idx = leftWires.findIndex((w) => w.id === colorId);
    return { x: 44, y: 104 + (idx >= 0 ? idx : 0) * 64 };
  };

  const getRightPinPos = (colorId: string) => {
    const idx = rightWires.findIndex((w) => w.id === colorId);
    return { x: 436, y: 104 + (idx >= 0 ? idx : 0) * 64 };
  };

  const handlePointerDown = (leftId: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDraggingLeftId(leftId);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingLeftId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingLeftId || !containerRef.current) {
      setDraggingLeftId(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if released close to any right pin
    let connectedRightId: string | null = null;
    rightWires.forEach((right) => {
      const pinPos = getRightPinPos(right.id);
      const dist = Math.hypot(mouseX - pinPos.x, mouseY - pinPos.y);
      if (dist < 45) {
        connectedRightId = right.id;
      }
    });

    if (connectedRightId) {
      setConnections((prev) => ({
        ...prev,
        [draggingLeftId]: connectedRightId!,
      }));
    } else {
      setConnections((prev) => {
        const next = { ...prev };
        delete next[draggingLeftId];
        return next;
      });
    }

    setDraggingLeftId(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full max-w-[480px] bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            KABEL VERBINDEN
          </h3>
        </div>
        <button
          onClick={() => {
            if (isAllConnected) {
              onCompleteRef.current();
            } else {
              onClose();
            }
          }}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* SVG Canvas for connected & dragged wires */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {Object.entries(connections).map(([leftId, rightId]) => {
          const p1 = getLeftPinPos(leftId);
          const p2 = getRightPinPos(rightId);
          const colorInfo = WIRE_COLORS.find((w) => w.id === leftId);
          const isCorrect = leftId === rightId;

          return (
            <g key={`wire-${leftId}`}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#0f172a"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={colorInfo?.hex || '#fff'}
                strokeWidth="10"
                strokeLinecap="round"
              />
              {isCorrect && (
                <circle cx={(p1.x + p2.x) / 2} cy={(p1.y + p2.y) / 2} r="4" fill="#fff" opacity="0.8" />
              )}
            </g>
          );
        })}

        {draggingLeftId && (
          (() => {
            const p1 = getLeftPinPos(draggingLeftId);
            const colorInfo = WIRE_COLORS.find((w) => w.id === draggingLeftId);
            return (
              <g>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={cursorPos.x}
                  y2={cursorPos.y}
                  stroke="#0f172a"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={cursorPos.x}
                  y2={cursorPos.y}
                  stroke={colorInfo?.hex || '#fff'}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </g>
            );
          })()
        )}
      </svg>

      {/* Pins Layout */}
      <div className="relative z-20 flex justify-between items-center py-4 px-2">
        {/* Left Wire Pins */}
        <div className="flex flex-col gap-6">
          {leftWires.map((wire) => {
            return (
              <div key={`left-${wire.id}`} className="flex items-center gap-3">
                <div
                  onPointerDown={(e) => handlePointerDown(wire.id, e)}
                  className="w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform"
                  style={{ backgroundColor: wire.hex }}
                >
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-white/50" />
                </div>
                <div className="w-8 h-4 rounded-r-lg bg-slate-800 border-y border-r border-slate-700" />
              </div>
            );
          })}
        </div>

        {/* Right Wire Targets */}
        <div className="flex flex-col gap-6">
          {rightWires.map((wire) => {
            const isConnected = Object.values(connections).includes(wire.id);
            return (
              <div key={`right-${wire.id}`} className="flex items-center gap-3">
                <div className="w-8 h-4 rounded-l-lg bg-slate-800 border-y border-l border-slate-700" />
                <div
                  className={`w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center shadow-lg transition-all ${
                    isConnected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: wire.hex }}
                >
                  {isConnected && <Check className="w-5 h-5 text-white stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-xs">
        {isAllConnected ? (
          <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4" /> AUFGABE ERFOLGREICH ABGESCHLOSSEN!
          </span>
        ) : (
          <span className="text-slate-400">
            Ziehe die linken Drähte zu den passenden Farben auf der rechten Seite.
          </span>
        )}
      </div>
    </div>
  );
}
