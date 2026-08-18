'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlayerColor, PLAYER_COLORS, HatType, KillAnimationType } from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { playKillSound } from '@/lib/sound';

interface KillAnimationOverlayProps {
  killerColor: PlayerColor;
  killerHat?: HatType;
  victimColor: PlayerColor;
  victimHat?: HatType;
  isVictimLocal: boolean;
  onFinished: () => void;
}

export function KillAnimationOverlay({
  killerColor,
  killerHat = 'none',
  victimColor,
  victimHat = 'none',
  isVictimLocal,
  onFinished,
}: KillAnimationOverlayProps) {
  const [animType] = useState<KillAnimationType>(() => {
    const types: KillAnimationType[] = ['tongue', 'gun', 'knife', 'neck_snap'];
    return types[Math.floor(Math.random() * types.length)];
  });

  const [frame, setFrame] = useState(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    // Play dramatic kill sound once
    playKillSound();

    const interval = setInterval(() => {
      setFrame((prev) => prev + 1);
    }, 40);

    const timeout = setTimeout(() => {
      onFinishedRef.current();
    }, 2000);

    const handleKey = () => {
      onFinishedRef.current();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div
      onClick={() => onFinishedRef.current()}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* Red Blood Screen Flash */}
      <div
        className={`absolute inset-0 bg-red-600 pointer-events-none transition-opacity duration-300 ${
          frame < 6 ? 'opacity-40' : 'opacity-0'
        }`}
      />


      {/* Cinematic Black Letterbox Bars */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-black border-b border-red-900/50 shadow-2xl z-20 flex items-center justify-between px-8">
        <span className="font-mono text-red-500 font-black tracking-widest text-sm uppercase animate-pulse">
          {isVictimLocal ? '⚠️ DU WURDEST ELIMINIERT!' : '🔪 ELIMINIERUNG AUSGEFÜHRT'}
        </span>
        <span className="font-mono text-slate-500 text-xs">THE SKELD SECURITY FEED</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black border-t border-red-900/50 shadow-2xl z-20" />

      {/* Main Animation Stage */}
      <div className="relative w-full max-w-2xl h-80 flex items-center justify-center">
        {/* Spotlight Circle on Floor */}
        <div className="absolute bottom-10 w-96 h-24 bg-red-950/40 rounded-[100%] blur-xl border border-red-500/20" />

        {/* 1. TONGUE IMPALE ANIMATION */}
        {animType === 'tongue' && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Impostor Left */}
            <div className="absolute left-32 transform scale-150 transition-all duration-300">
              <AstronautAvatar color={killerColor} hat={killerHat} facing="right" size={90} />
              {/* Jagged Alien Mouth Overlay */}
              {frame > 8 && (
                <div className="absolute top-8 right-2 w-8 h-8 bg-red-950 rounded-full border-2 border-red-500 flex items-center justify-center animate-ping duration-300" />
              )}
            </div>

            {/* Alien Sharp Razor Tongue */}
            {frame > 8 && frame < 35 && (
              <div
                className="absolute left-56 top-36 h-3 bg-red-500 border border-red-200 rounded-r-full shadow-[0_0_15px_rgba(239,68,68,1)] transition-all duration-100"
                style={{
                  width: `${Math.min(180, (frame - 8) * 25)}px`,
                }}
              >
                {/* Sharp Needle Tip */}
                <div className="absolute right-0 top-[-6px] border-l-[16px] border-l-red-200 border-y-[8px] border-y-transparent" />
              </div>
            )}

            {/* Victim Right */}
            <div
              className={`absolute right-32 transform scale-150 transition-all duration-500 ${
                frame > 15 ? 'rotate-45 translate-y-12' : ''
              }`}
            >
              <AstronautAvatar
                color={victimColor}
                hat={victimHat}
                facing="left"
                isDead={frame > 22}
                size={90}
              />
            </div>
          </div>
        )}

        {/* 2. GUN SHOT ANIMATION */}
        {animType === 'gun' && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Impostor Left */}
            <div className="absolute left-32 transform scale-150">
              <AstronautAvatar color={killerColor} hat={killerHat} facing="right" size={90} />
              {/* Handgun */}
              <div className="absolute top-10 -right-6 w-10 h-6 bg-slate-800 border-2 border-slate-600 rounded-sm shadow-md">
                <div className="absolute right-0 top-1 w-4 h-2 bg-slate-900" />
              </div>
            </div>

            {/* Gun Muzzle Flash */}
            {frame === 10 || frame === 11 ? (
              <div className="absolute left-64 top-32 w-16 h-16 bg-yellow-300 rounded-full blur-sm border-4 border-white animate-ping" />
            ) : null}

            {/* Bullet Streak */}
            {frame > 10 && frame < 18 && (
              <div className="absolute left-64 top-38 w-24 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_10px_#fde047]" />
            )}

            {/* Victim Right */}
            <div
              className={`absolute right-32 transform scale-150 transition-all duration-500 ${
                frame > 12 ? 'rotate-90 translate-y-16 opacity-90' : ''
              }`}
            >
              <AstronautAvatar
                color={victimColor}
                hat={victimHat}
                facing="left"
                isDead={frame > 18}
                size={90}
              />
            </div>
          </div>
        )}

        {/* 3. COMBAT KNIFE SLASH ANIMATION */}
        {animType === 'knife' && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Impostor Left */}
            <div
              className={`absolute left-32 transform scale-150 transition-all duration-200 ${
                frame > 8 && frame < 18 ? 'translate-x-16' : ''
              }`}
            >
              <AstronautAvatar color={killerColor} hat={killerHat} facing="right" size={90} />
              {/* Combat Knife in hand */}
              <div className="absolute top-10 -right-8 w-12 h-3 bg-slate-200 border border-slate-900 rounded-r-full shadow-lg transform -rotate-12">
                <div className="w-4 h-3 bg-amber-900 rounded-l" />
              </div>
            </div>

            {/* Knife Slash Visual Arc */}
            {frame > 10 && frame < 20 && (
              <div className="absolute left-64 top-28 w-24 h-24 border-r-4 border-t-4 border-cyan-300 rounded-full transform rotate-45 animate-pulse" />
            )}

            {/* Victim Right */}
            <div
              className={`absolute right-32 transform scale-150 transition-all duration-500 ${
                frame > 14 ? 'rotate-45 translate-y-12' : ''
              }`}
            >
              <AstronautAvatar
                color={victimColor}
                hat={victimHat}
                facing="left"
                isDead={frame > 18}
                size={90}
              />
            </div>
          </div>
        )}

        {/* 4. NECK SNAP ANIMATION */}
        {animType === 'neck_snap' && (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Impostor rushes behind victim */}
            <div
              className={`absolute transform scale-150 transition-all duration-300 ${
                frame < 8 ? 'left-24' : 'left-56 z-20'
              }`}
            >
              <AstronautAvatar color={killerColor} hat={killerHat} facing="right" size={90} />
            </div>

            {/* Victim Center/Right */}
            <div
              className={`absolute right-40 transform scale-150 transition-all duration-300 ${
                frame > 12 ? 'rotate-[140deg] translate-y-16' : ''
              }`}
            >
              <AstronautAvatar
                color={victimColor}
                hat={victimHat}
                facing="right"
                isDead={frame > 16}
                size={90}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dramatic Subtitle */}
      <div className="relative z-20 mt-4 text-center">
        <p className="font-mono text-xl sm:text-2xl font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
          {isVictimLocal ? 'DU WURDEST ELIMINIERT!' : 'CREWMATE ELIMINIERT'}
        </p>
      </div>
    </div>
  );
}
