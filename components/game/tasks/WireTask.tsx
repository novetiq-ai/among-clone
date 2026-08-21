'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { sound } from '@/lib/sound';

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

interface Point {
  x: number;
  y: number;
}

interface PinLayout {
  width: number;
  left: Record<string, Point>;
  right: Record<string, Point>;
}

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
  const leftPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pinLayout, setPinLayout] = useState<PinLayout>({ width: 480, left: {}, right: {} });
  const activePointerRef = useRef<{ pointerId: number; target: HTMLDivElement; leftId: string } | null>(null);

  const isAllConnected = 
    Object.keys(connections).length === 4 &&
    Object.entries(connections).every(([leftId, rightId]) => leftId === rightId);

  useEffect(() => {
    if (isAllConnected && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      sound.playTaskComplete();
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAllConnected]);

  // Measure pins after commit, then render wires from state. Reading DOM refs
  // during render breaks React's purity guarantees and produced stale lines.
  const measurePinLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const measurePins = (elements: Record<string, HTMLDivElement | null>) => {
      const positions: Record<string, Point> = {};
      for (const wire of WIRE_COLORS) {
        const element = elements[wire.id];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        positions[wire.id] = {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
      }
      return positions;
    };

    setPinLayout({
      width: containerRect.width,
      left: measurePins(leftPinRefs.current),
      right: measurePins(rightPinRefs.current),
    });
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    measurePinLayout();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measurePinLayout);
      return () => window.removeEventListener('resize', measurePinLayout);
    }

    const observer = new ResizeObserver(() => measurePinLayout());
    observer.observe(container);
    for (const element of [...Object.values(leftPinRefs.current), ...Object.values(rightPinRefs.current)]) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [measurePinLayout]);

  const getLeftPinPos = (colorId: string): Point => {
    const measured = pinLayout.left[colorId];
    if (measured) return measured;
    const index = leftWires.findIndex((wire) => wire.id === colorId);
    return { x: 44, y: 104 + Math.max(0, index) * 64 };
  };

  const getRightPinPos = (colorId: string): Point => {
    const measured = pinLayout.right[colorId];
    if (measured) return measured;
    const index = rightWires.findIndex((wire) => wire.id === colorId);
    return { x: pinLayout.width - 44, y: 104 + Math.max(0, index) * 64 };
  };

  const releaseActivePointer = useCallback((pointerId?: number) => {
    const active = activePointerRef.current;
    if (!active || (pointerId !== undefined && active.pointerId !== pointerId)) return;

    try {
      if (active.target.hasPointerCapture(active.pointerId)) {
        active.target.releasePointerCapture(active.pointerId);
      }
    } catch {
      // The browser may already have released capture during cancellation.
    }
    activePointerRef.current = null;
    setDraggingLeftId(null);
  }, []);

  useEffect(() => {
    return () => {
      const active = activePointerRef.current;
      if (!active) return;
      try {
        if (active.target.hasPointerCapture(active.pointerId)) {
          active.target.releasePointerCapture(active.pointerId);
        }
      } catch {
        // The element can already be detached while the task is closing.
      }
      activePointerRef.current = null;
    };
  }, []);

  const handlePointerDown = (leftId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current && activePointerRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();

    const target = e.currentTarget;
    activePointerRef.current = { pointerId: e.pointerId, target, leftId };
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is optional on older browsers; container events still work.
    }

    const container = containerRef.current;
    if (!container) {
      releaseActivePointer(e.pointerId);
      return;
    }

    sound.playButtonClick();
    setDraggingLeftId(leftId);
    const rect = container.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const active = activePointerRef.current;
    const container = containerRef.current;
    if (!active || active.pointerId !== e.pointerId || !container) return;
    const rect = container.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const active = activePointerRef.current;
    const container = containerRef.current;
    if (!active || active.pointerId !== e.pointerId || !container) {
      releaseActivePointer(e.pointerId);
      return;
    }

    const draggingId = active.leftId;
    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    let connectedRightId: string | null = null;
    for (const right of rightWires) {
      const pinPos = getRightPinPos(right.id);
      const distance = Math.hypot(pointerX - pinPos.x, pointerY - pinPos.y);
      if (distance < 45) connectedRightId = right.id;
    }

    if (connectedRightId) {
      const destinationId = connectedRightId;
      sound.playShieldClick();
      setConnections((previous) => {
        const next = { ...previous };
        for (const [leftKey, rightKey] of Object.entries(next)) {
          if (rightKey === destinationId) delete next[leftKey];
        }
        next[draggingId] = destinationId;
        return next;
      });
    } else {
      setConnections((previous) => {
        const next = { ...previous };
        delete next[draggingId];
        return next;
      });
    }

    releaseActivePointer(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    releaseActivePointer(e.pointerId);
  };

  const handleLostPointerCapture = (e: React.PointerEvent) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    activePointerRef.current = null;
    setDraggingLeftId(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      className="relative w-full max-w-[480px] bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
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
                  ref={(el) => {
                    leftPinRefs.current[wire.id] = el;
                  }}
                  onPointerDown={(e) => handlePointerDown(wire.id, e)}
                  className="w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform motion-reduce:transform-none motion-reduce:transition-none touch-manipulation"
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
                  ref={(el) => {
                    rightPinRefs.current[wire.id] = el;
                  }}
                  className={`w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center shadow-lg transition-all motion-reduce:transition-none ${
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
          <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-bounce motion-reduce:animate-none">
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
