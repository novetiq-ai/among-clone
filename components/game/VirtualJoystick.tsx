'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (dx: number, dy: number, isMoving: boolean) => void;
  mode?: 'joystick' | 'dpad';
}

const MAX_RADIUS = 46;

export function VirtualJoystick({ onMove, mode = 'joystick' }: VirtualJoystickProps) {
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Touch tracking state
  const touchIdRef = useRef<number | null>(null);
  const basePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'joystick') return;
    if (touchIdRef.current !== null) return; // already active

    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;

    touchIdRef.current = touch.identifier;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    basePosRef.current = { x: centerX, y: centerY };
    setIsTouched(true);

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const clampedDist = Math.min(distance, MAX_RADIUS);
    const angle = Math.atan2(deltaY, deltaX);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: clampedX, y: clampedY });
    const normX = clampedDist > 6 ? clampedX / MAX_RADIUS : 0;
    const normY = clampedDist > 6 ? clampedY / MAX_RADIUS : 0;
    onMoveRef.current(normX, normY, clampedDist > 6);
  };

  // Handle Touch Move
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'joystick') return;
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const deltaX = touch.clientX - basePosRef.current.x;
        const deltaY = touch.clientY - basePosRef.current.y;
        const distance = Math.hypot(deltaX, deltaY);
        const clampedDist = Math.min(distance, MAX_RADIUS);
        const angle = Math.atan2(deltaY, deltaX);

        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        setKnobPos({ x: clampedX, y: clampedY });
        const normX = clampedDist > 6 ? clampedX / MAX_RADIUS : 0;
        const normY = clampedDist > 6 ? clampedY / MAX_RADIUS : 0;
        onMoveRef.current(normX, normY, clampedDist > 6);
        break;
      }
    }
  };

  // Handle Touch End / Cancel
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'joystick') return;
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsTouched(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveRef.current(0, 0, false);
        break;
      }
    }
  };

  // D-Pad state
  const dpadPressed = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const updateDpadMovement = useCallback(() => {
    let dx = 0;
    let dy = 0;
    if (dpadPressed.current.up) dy -= 1;
    if (dpadPressed.current.down) dy += 1;
    if (dpadPressed.current.left) dx -= 1;
    if (dpadPressed.current.right) dx += 1;

    const isMoving = dx !== 0 || dy !== 0;
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    onMoveRef.current(dx, dy, isMoving);
  }, []);

  const handleDpadPointerDown = (dir: 'up' | 'down' | 'left' | 'right') => {
    dpadPressed.current[dir] = true;
    updateDpadMovement();
  };

  const handleDpadPointerUp = (dir: 'up' | 'down' | 'left' | 'right') => {
    dpadPressed.current[dir] = false;
    updateDpadMovement();
  };

  if (mode === 'dpad') {
    return (
      <div
        className="relative w-36 h-36 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {/* Up */}
        <button
          type="button"
          onPointerDown={() => handleDpadPointerDown('up')}
          onPointerEnter={(e) => { if (e.buttons > 0) handleDpadPointerDown('up'); }}
          onPointerUp={() => handleDpadPointerUp('up')}
          onPointerLeave={() => handleDpadPointerUp('up')}
          className="absolute top-0 left-12 w-12 h-12 rounded-t-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 active:bg-cyan-600 active:border-cyan-400 active:text-white transition-colors cursor-pointer shadow-lg"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        {/* Left */}
        <button
          type="button"
          onPointerDown={() => handleDpadPointerDown('left')}
          onPointerEnter={(e) => { if (e.buttons > 0) handleDpadPointerDown('left'); }}
          onPointerUp={() => handleDpadPointerUp('left')}
          onPointerLeave={() => handleDpadPointerUp('left')}
          className="absolute top-12 left-0 w-12 h-12 rounded-l-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 active:bg-cyan-600 active:border-cyan-400 active:text-white transition-colors cursor-pointer shadow-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center Hub */}
        <div className="absolute top-12 left-12 w-12 h-12 bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-cyan-400/40" />
        </div>

        {/* Right */}
        <button
          type="button"
          onPointerDown={() => handleDpadPointerDown('right')}
          onPointerEnter={(e) => { if (e.buttons > 0) handleDpadPointerDown('right'); }}
          onPointerUp={() => handleDpadPointerUp('right')}
          onPointerLeave={() => handleDpadPointerUp('right')}
          className="absolute top-12 right-0 w-12 h-12 rounded-r-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 active:bg-cyan-600 active:border-cyan-400 active:text-white transition-colors cursor-pointer shadow-lg"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Down */}
        <button
          type="button"
          onPointerDown={() => handleDpadPointerDown('down')}
          onPointerEnter={(e) => { if (e.buttons > 0) handleDpadPointerDown('down'); }}
          onPointerUp={() => handleDpadPointerUp('down')}
          onPointerLeave={() => handleDpadPointerUp('down')}
          className="absolute bottom-0 left-12 w-12 h-12 rounded-b-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 active:bg-cyan-600 active:border-cyan-400 active:text-white transition-colors cursor-pointer shadow-lg"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Analog Joystick Mode
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full select-none touch-none flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      {/* Outer Base Ring */}
      <div
        className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 flex items-center justify-center transition-all ${
          isTouched
            ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-105'
            : 'bg-slate-950/70 border-slate-700/80 shadow-2xl'
        }`}
      >
        {/* Subtle direction guides */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-full h-[1px] bg-slate-500" />
          <div className="h-full w-[1px] bg-slate-500 absolute" />
        </div>

        {/* Inner concentric ring */}
        <div className="w-16 h-16 rounded-full border border-slate-700/50 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-cyan-400/20" />
        </div>

        {/* Draggable Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isTouched ? 'none' : 'transform 0.15s ease-out',
          }}
          className={`absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center shadow-xl ${
            isTouched
              ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-white shadow-cyan-500/50'
              : 'bg-gradient-to-b from-slate-700 to-slate-800 border-slate-500 text-slate-400'
          }`}
        >
          {/* Knob grip texture */}
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow" />
          </div>
        </div>
      </div>
    </div>
  );
}
