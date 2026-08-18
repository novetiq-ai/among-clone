'use client';

import React from 'react';
import { PlayerColor, PLAYER_COLORS } from '@/types/game';

interface AstronautAvatarProps {
  color: PlayerColor;
  size?: number;
  facing?: 'left' | 'right';
  isDead?: boolean;
  isHost?: boolean;
  isReady?: boolean;
  name?: string;
  isWalking?: boolean;
  className?: string;
}

export function AstronautAvatar({
  color,
  size = 64,
  facing = 'right',
  isDead = false,
  isHost = false,
  isReady,
  name,
  isWalking = false,
  className = '',
}: AstronautAvatarProps) {
  const colorInfo = PLAYER_COLORS.find((c) => c.id === color) || PLAYER_COLORS[0];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Crown / Host Indicator */}
      {isHost && (
        <div className="text-amber-400 mb-1 text-sm font-black flex items-center gap-1 drop-shadow-md animate-bounce">
          👑
        </div>
      )}

      {/* Character Graphic */}
      <div
        className="relative transition-transform select-none"
        style={{
          width: size,
          height: size * 1.15,
          transform: `${facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'}`,
        }}
      >
        <svg
          viewBox="0 0 100 120"
          className={`w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.6)] ${
            isWalking ? 'animate-bounce' : ''
          }`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isDead ? (
            // Dead Body Representation (Cut bean + Vertebra bone)
            <g>
              {/* Blood puddle on floor */}
              <ellipse cx="50" cy="108" rx="42" ry="10" fill="#991b1b" opacity="0.8" />

              {/* Backpack lower stub */}
              <rect
                x="8"
                y="66"
                width="18"
                height="32"
                rx="6"
                fill={colorInfo.shadow}
                stroke="#0f172a"
                strokeWidth="6"
              />

              {/* Lower Body Half */}
              <path
                d="M22 62 C22 62 78 62 78 62 C86 62 92 68 92 78 L92 94 C92 104 84 110 74 110 L66 110 C58 110 55 102 52 96 C49 102 46 110 38 110 L30 110 C20 110 12 104 12 94 L12 78 C12 68 18 62 22 62 Z"
                fill={colorInfo.hex}
                stroke="#0f172a"
                strokeWidth="6"
                strokeLinejoin="round"
              />

              {/* 2-Tone Body Shadow */}
              <path
                d="M52 96 C49 102 46 110 38 110 L30 110 C20 110 12 104 12 94 L12 78 C12 68 18 62 22 62 L52 62 Z"
                fill={colorInfo.shadow}
              />
              <path
                d="M52 96 C55 102 58 110 66 110 L74 110 C84 110 92 104 92 94 L92 86 C82 96 66 100 52 96 Z"
                fill={colorInfo.shadow}
              />

              {/* Red Severed Meat Rim */}
              <ellipse
                cx="50"
                cy="62"
                rx="36"
                ry="9"
                fill="#ef4444"
                stroke="#0f172a"
                strokeWidth="5"
              />

              {/* Bone sticking out */}
              <path
                d="M46 62 L46 32 C46 27 41 22 39 20 C36 17 39 12 44 14 C49 16 49 20 49 22 C49 20 49 16 54 14 C59 12 62 17 59 20 C57 22 52 27 52 32 L52 62 Z"
                fill="#f8fafc"
                stroke="#0f172a"
                strokeWidth="5"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            // Full Authentic Among Us Crewmate
            <g>
              {/* Oxygen Tank / Backpack */}
              <rect
                x="8"
                y="34"
                width="20"
                height="56"
                rx="9"
                fill={colorInfo.hex}
                stroke="#0f172a"
                strokeWidth="6"
              />
              <rect
                x="8"
                y="58"
                width="20"
                height="32"
                rx="9"
                fill={colorInfo.shadow}
              />

              {/* Main Bean Body */}
              <path
                d="M26 36 C26 14 42 6 64 6 C84 6 92 16 92 36 L92 88 C92 98 84 106 74 106 L66 106 C58 106 55 98 52 92 C49 98 46 106 38 106 L30 106 C20 106 14 98 14 88 L14 44 C14 39 18 36 26 36 Z"
                fill={colorInfo.hex}
                stroke="#0f172a"
                strokeWidth="6"
                strokeLinejoin="round"
              />

              {/* Body 2-Tone Shadow (Bottom belly curve & left flank) */}
              <path
                d="M26 44 L26 88 C26 98 20 106 30 106 L38 106 C46 106 49 98 52 92 C49 98 46 106 38 106 L30 106 C20 106 14 98 14 88 L14 44 Z"
                fill={colorInfo.shadow}
              />
              <path
                d="M52 92 C55 98 58 106 66 106 L74 106 C84 106 92 98 92 88 L92 80 C80 92 64 96 52 92 Z"
                fill={colorInfo.shadow}
              />

              {/* Visor (Cyan/Sky-Blue Glass) */}
              <path
                d="M52 24 C52 18 64 15 78 15 C90 15 98 19 98 30 C98 42 88 47 76 47 C62 47 52 42 52 24 Z"
                fill={colorInfo.visor}
                stroke="#0f172a"
                strokeWidth="6"
                strokeLinejoin="round"
              />

              {/* Visor Glare / Glass Reflection Highlight */}
              <path
                d="M62 20 C72 19 86 20 92 24 C90 26 80 25 66 26 C62 26 60 23 62 20 Z"
                fill="#ffffff"
                opacity="0.85"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Name Label */}
      {name && (
        <div className="mt-1 px-2.5 py-0.5 rounded-lg bg-slate-950/90 border border-slate-700 text-white text-xs font-mono font-bold tracking-wide whitespace-nowrap shadow-lg">
          {name}
        </div>
      )}

      {/* Ready Badge */}
      {isReady !== undefined && (
        <div
          className={`mt-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${
            isReady
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {isReady ? 'Bereit' : 'Wartet'}
        </div>
      )}
    </div>
  );
}
