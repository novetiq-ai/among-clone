'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crosshair, Target } from 'lucide-react';
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
  const [lasers, setLasers] = useState<LaserFlash[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const nextId = useRef(1);

  // Spawn asteroids
  const spawnAsteroid = useCallback(() => {
    const side = Math.floor(Math.random() * 3); // 0 = top, 1 = left, 2 = right
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;

    if (side === 0) {
      x = Math.random() * 400 + 40;
      y = -40;
      vx = (Math.random() - 0.5) * 60;
      vy = Math.random() * 50 + 40;
    } else if (side === 1) {
      x = -40;
      y = Math.random() * 260 + 20;
      vx = Math.random() * 60 + 40;
      vy = (Math.random() - 0.5) * 40;
    } else {
      x = 520;
      y = Math.random() * 260 + 20;
      vx = -(Math.random() * 60 + 40);
      vy = (Math.random() - 0.5) * 40;
    }

    const newAst: Asteroid = {
      id: nextId.current++,
      x,
      y,
      size: Math.random() * 24 + 28,
      vx,
      vy,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 90,
    };

    setAsteroids((prev) => [...prev.slice(-10), newAst]);
  }, []);

  // Game loop for moving asteroids
  useEffect(() => {
    const spawnTimer = setInterval(() => {
      spawnAsteroid();
    }, 700);

    let lastTime = performance.now();
    let animFrame: number;

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      setAsteroids((prev) =>
        prev
          .map((ast) => ({
            ...ast,
            x: ast.x + ast.vx * delta,
            y: ast.y + ast.vy * delta,
            rotation: ast.rotation + ast.rotSpeed * delta,
          }))
          .filter((ast) => ast.x >= -60 && ast.x <= 540 && ast.y >= -60 && ast.y <= 380)
      );

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      clearInterval(spawnTimer);
      cancelAnimationFrame(animFrame);
    };
  }, [spawnAsteroid]);

  const handleShoot = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (destroyedCount >= REQUIRED_ASTEROIDS || hasCompletedRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    sound.playLaserShoot();

    // Laser visual
    const laserId = nextId.current++;
    setLasers((prev) => [...prev, { id: laserId, targetX: clickX, targetY: clickY }]);
    setTimeout(() => {
      setLasers((prev) => prev.filter((l) => l.id !== laserId));
    }, 150);

    // Check hit on asteroids (within radius)
    let hitFound = false;
    setAsteroids((prev) => {
      const remaining: Asteroid[] = [];
      for (const ast of prev) {
        const dist = Math.hypot(ast.x - clickX, ast.y - clickY);
        if (!hitFound && dist < ast.size + 15) {
          hitFound = true;
          // Trigger explosion
          const expId = nextId.current++;
          setExplosions((exps) => [...exps, { id: expId, x: ast.x, y: ast.y, size: ast.size }]);
          setTimeout(() => {
            setExplosions((exps) => exps.filter((exp) => exp.id !== expId));
          }, 350);
        } else {
          remaining.push(ast);
        }
      }
      return remaining;
    });

    if (hitFound) {
      setDestroyedCount((prev) => {
        const next = prev + 1;
        if (next >= REQUIRED_ASTEROIDS && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(() => {
            sound.playTaskComplete();
            onCompleteRef.current();
          }, 400);
        }
        return next;
      });
    }
  };

  return (
    <div className="w-full max-w-xl bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-red-400 animate-pulse" />
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
          <span className="text-xl font-black text-red-400">
            {destroyedCount} / {REQUIRED_ASTEROIDS}
          </span>
        </div>

        {/* Viewport Turret Screen */}
        <div
          onPointerDown={handleShoot}
          className="relative w-full h-80 bg-black rounded-2xl border-4 border-slate-800 overflow-hidden cursor-crosshair shadow-2xl touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Deep Space Background with Stars */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black" />

          {/* Crosshair overlay in center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <Crosshair className="w-24 h-24 text-emerald-400" />
          </div>

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
              className="absolute bg-gradient-to-br from-amber-700 via-stone-700 to-stone-900 border-2 border-stone-500 rounded-xl shadow-lg flex items-center justify-center pointer-events-none"
            >
              <div className="w-2 h-2 rounded-full bg-stone-900/60 absolute top-1 left-1" />
              <div className="w-3 h-3 rounded-full bg-stone-900/60 absolute bottom-1 right-2" />
            </div>
          ))}

          {/* Laser Beams from dual bottom cannons */}
          {lasers.map((laser) => (
            <svg
              key={laser.id}
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
            >
              <line
                x1="40"
                y1="320"
                x2={laser.targetX}
                y2={laser.targetY}
                stroke="#22c55e"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-pulse"
              />
              <line
                x1="440"
                y1="320"
                x2={laser.targetX}
                y2={laser.targetY}
                stroke="#22c55e"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-pulse"
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
              className="absolute pointer-events-none z-30 flex items-center justify-center animate-ping"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 blur-sm" />
            </div>
          ))}

          {/* Bottom Cannon Mounts */}
          <div className="absolute bottom-0 left-6 w-12 h-6 bg-slate-700 rounded-t-lg border-2 border-slate-500 pointer-events-none" />
          <div className="absolute bottom-0 right-6 w-12 h-6 bg-slate-700 rounded-t-lg border-2 border-slate-500 pointer-events-none" />
        </div>

        {/* Footer */}
        <p className="text-xs font-mono text-center text-slate-400">
          Klicke auf die <span className="text-amber-400 font-bold">Asteroiden</span>, um sie mit den Laser-Geschützen zu zerstören!
        </p>
      </div>
    </div>
  );
}
