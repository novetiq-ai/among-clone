'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crosshair, Target, Check } from 'lucide-react';
import { sound } from '@/lib/sound';

interface ClearAsteroidsTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
}

interface LaserFlash {
  id: number;
  targetX: number;
  targetY: number;
  originLeftX: number;
  originRightX: number;
  originY: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  size: number;
}

const REQUIRED_ASTEROIDS = 20;

export function ClearAsteroidsTask({ onComplete, onClose }: ClearAsteroidsTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [destroyedCount, setDestroyedCount] = useState(0);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const [lasers, setLasers] = useState<LaserFlash[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Synchronize asteroids state with ref
  const updateAsteroids = useCallback((newAsteroids: Asteroid[]) => {
    asteroidsRef.current = newAsteroids;
    setAsteroids(newAsteroids);
  }, []);

  // Spawn asteroids
  const spawnAsteroid = useCallback(() => {
    const width = viewportRef.current?.clientWidth || 480;
    const height = viewportRef.current?.clientHeight || 320;

    const side = Math.floor(Math.random() * 3); // 0 = top, 1 = left, 2 = right
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;

    if (side === 0) {
      x = Math.random() * (width - 80) + 40;
      y = -30;
      vx = (Math.random() - 0.5) * 80;
      vy = Math.random() * 60 + 50;
    } else if (side === 1) {
      x = -30;
      y = Math.random() * (height - 80) + 40;
      vx = Math.random() * 70 + 50;
      vy = (Math.random() - 0.5) * 50;
    } else {
      x = width + 30;
      y = Math.random() * (height - 80) + 40;
      vx = -(Math.random() * 70 + 50);
      vy = (Math.random() - 0.5) * 50;
    }

    const newAst: Asteroid = {
      id: nextId.current++,
      x,
      y,
      size: Math.random() * 26 + 32,
      vx,
      vy,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 100,
    };

    const currentList = asteroidsRef.current;
    updateAsteroids([...currentList.slice(-12), newAst]);
  }, [updateAsteroids]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  // Game loop for moving asteroids smoothly
  useEffect(() => {
    const spawnTimer = setInterval(() => {
      if (!hasCompletedRef.current) {
        spawnAsteroid();
      }
    }, 650);

    let lastTime = performance.now();
    let animFrame: number;

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const width = viewportRef.current?.clientWidth || 480;
      const height = viewportRef.current?.clientHeight || 320;

      const nextList = asteroidsRef.current
        .map((ast) => ({
          ...ast,
          x: ast.x + ast.vx * delta,
          y: ast.y + ast.vy * delta,
          rotation: ast.rotation + ast.rotSpeed * delta,
        }))
        .filter((ast) => ast.x >= -60 && ast.x <= width + 60 && ast.y >= -60 && ast.y <= height + 60);

      updateAsteroids(nextList);

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      clearInterval(spawnTimer);
      cancelAnimationFrame(animFrame);
    };
  }, [spawnAsteroid, updateAsteroids]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    setCrosshairPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleShoot = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (destroyedCount >= REQUIRED_ASTEROIDS || hasCompletedRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setCrosshairPos({ x: clickX, y: clickY });
    sound.playLaserShoot();

    // Laser visual beam
    const laserId = nextId.current++;
    setLasers((prev) => [
      ...prev,
      {
        id: laserId,
        targetX: clickX,
        targetY: clickY,
        originLeftX: rect.width * 0.12,
        originRightX: rect.width * 0.88,
        originY: rect.height - 10,
      },
    ]);
    schedule(() => {
      setLasers((prev) => prev.filter((l) => l.id !== laserId));
    }, 120);

    // Synchronous Hit Detection on real-time asteroidsRef
    const currentAsteroids = asteroidsRef.current;
    let hitIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < currentAsteroids.length; i++) {
      const ast = currentAsteroids[i];
      const radius = ast.size / 2;
      const dist = Math.hypot(ast.x - clickX, ast.y - clickY);
      // Forgiving hit-box: radius + 22px margin of error
      if (dist <= radius + 22 && dist < minDistance) {
        minDistance = dist;
        hitIndex = i;
      }
    }

    if (hitIndex !== -1) {
      const hitAst = currentAsteroids[hitIndex];

      // Remove asteroid from active list immediately
      const remainingAsteroids = currentAsteroids.filter((_, idx) => idx !== hitIndex);
      updateAsteroids(remainingAsteroids);

      // Trigger explosion
      const expId = nextId.current++;
      setExplosions((exps) => [...exps, { id: expId, x: hitAst.x, y: hitAst.y, size: hitAst.size }]);
      schedule(() => {
        setExplosions((exps) => exps.filter((exp) => exp.id !== expId));
      }, 350);

      // Increment score
      setDestroyedCount((prev) => {
        const next = prev + 1;
        if (next >= REQUIRED_ASTEROIDS && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          schedule(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 400);
        }
        return next;
      });
    }
  };

  return (
    <div className="w-full max-w-xl bg-slate-900 border-4 border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-red-400 animate-pulse motion-reduce:animate-none" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            WAFFEN: ASTEROIDEN ABSCHIEßEN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Main Viewport */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 shadow-inner flex flex-col gap-4">
        <div className="flex justify-between items-center bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span className="text-slate-400">ABGESCHOSSENE ASTEROIDEN:</span>
          <span className={`text-xl font-black ${destroyedCount >= REQUIRED_ASTEROIDS ? 'text-emerald-400' : 'text-red-400'}`}>
            {destroyedCount} / {REQUIRED_ASTEROIDS}
          </span>
        </div>

        {/* Viewport Turret Screen */}
        <div
          ref={viewportRef}
          onPointerDown={handleShoot}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setCrosshairPos(null)}
          className="relative w-full h-80 bg-black rounded-2xl border-4 border-slate-800 overflow-hidden cursor-crosshair shadow-2xl touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Deep Space Background with Stars */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black pointer-events-none" />

          {/* Dynamic or Fixed Crosshair */}
          {crosshairPos ? (
            <div
              style={{
                left: `${crosshairPos.x}px`,
                top: `${crosshairPos.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-none z-30 transition-transform duration-75 motion-reduce:transition-none"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-400/80 rounded-full animate-spin motion-reduce:animate-none" />
                <div className="absolute w-2 h-2 bg-emerald-400 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <Crosshair className="w-20 h-20 text-emerald-400" />
            </div>
          )}

          {/* Asteroids */}
          {asteroids.map((ast) => (
            <div
              key={ast.id}
              style={{
                left: `${ast.x}px`,
                top: `${ast.y}px`,
                width: `${ast.size}px`,
                height: `${ast.size}px`,
                transform: `translate(-50%, -50%) rotate(${ast.rotation}deg)`,
              }}
              className="absolute bg-gradient-to-br from-amber-700 via-stone-700 to-stone-900 border-2 border-stone-400 rounded-2xl shadow-lg flex items-center justify-center pointer-events-none"
            >
              <div className="w-2 h-2 rounded-full bg-stone-950/60 absolute top-1.5 left-1.5" />
              <div className="w-3 h-3 rounded-full bg-stone-950/60 absolute bottom-2 right-2" />
            </div>
          ))}

          {/* Laser Beams from dual bottom cannons */}
          {lasers.map((laser) => (
            <svg
              key={laser.id}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            >
              {/* Left cannon laser */}
              <line
                x1={laser.originLeftX}
                y1={laser.originY}
                x2={laser.targetX}
                y2={laser.targetY}
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                className="animate-pulse motion-reduce:animate-none"
              />
              {/* Right cannon laser */}
              <line
                x1={laser.originRightX}
                y1={laser.originY}
                x2={laser.targetX}
                y2={laser.targetY}
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                className="animate-pulse motion-reduce:animate-none"
              />
            </svg>
          ))}

          {/* Explosions */}
          {explosions.map((exp) => (
            <div
              key={exp.id}
              style={{
                left: `${exp.x}px`,
                top: `${exp.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-none z-30 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 animate-ping motion-reduce:animate-none opacity-90" />
            </div>
          ))}

          {/* Bottom Cannon Mounts */}
          <div className="absolute bottom-0 left-6 w-12 h-6 bg-slate-700 rounded-t-lg border-2 border-slate-500 pointer-events-none shadow-lg" />
          <div className="absolute bottom-0 right-6 w-12 h-6 bg-slate-700 rounded-t-lg border-2 border-slate-500 pointer-events-none shadow-lg" />
        </div>

        {/* Status Bar */}
        <div className="text-xs font-mono text-center text-slate-400">
          {destroyedCount >= REQUIRED_ASTEROIDS ? (
            <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-bounce motion-reduce:animate-none">
              <Check className="w-4 h-4" /> AUFGABE ERFOLGREICH ABGESCHLOSSEN!
            </span>
          ) : (
            <span>
              Klicke oder tippe auf die <span className="text-amber-400 font-bold">Asteroiden</span>, um sie abzuschießen!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
