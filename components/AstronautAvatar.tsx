'use client';

import React from 'react';
import { PlayerColor, PLAYER_COLORS, HatType } from '@/types/game';

interface AstronautAvatarProps {
  color: PlayerColor;
  hat?: HatType;
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
  hat = 'none',
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

  const renderHat = () => {
    if (isDead) return null;
    const activeHat = hat === 'none' && isHost ? 'crown' : hat;
    if (!activeHat || activeHat === 'none') return null;

    switch (activeHat) {
      case 'tophat':
        return (
          <g>
            <ellipse cx="60" cy="18" rx="22" ry="6" fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
            <path d="M46 18 L48 -14 L72 -14 L74 18 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
            <rect x="47" y="10" width="26" height="6" fill="#ef4444" />
            <ellipse cx="60" cy="-14" rx="12" ry="3" fill="#334155" />
          </g>
        );
      case 'crown':
        return (
          <g>
            <path d="M42 16 L38 -4 L50 6 L60 -10 L70 6 L82 -4 L78 16 Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="38" cy="-4" r="3" fill="#ef4444" />
            <circle cx="60" cy="-10" r="4" fill="#3b82f6" />
            <circle cx="82" cy="-4" r="3" fill="#10b981" />
          </g>
        );
      case 'sprout':
        return (
          <g>
            <path d="M60 16 C60 0 62 -10 60 -18" stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M60 -18 C50 -26 40 -16 60 -12 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="3" />
            <path d="M60 -16 C70 -26 80 -16 60 -10 Z" fill="#4ade80" stroke="#16a34a" strokeWidth="3" />
          </g>
        );
      case 'party':
        return (
          <g>
            <path d="M44 16 L60 -20 L76 16 Z" fill="#ec4899" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="60" cy="-22" r="5" fill="#fbbf24" />
            <path d="M48 6 L72 6" stroke="#38bdf8" strokeWidth="3" />
            <path d="M52 -4 L68 -4" stroke="#a855f7" strokeWidth="3" />
          </g>
        );
      case 'knife':
        return (
          <g>
            <path d="M22 6 L68 12 L70 18 L22 10 Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="3" />
            <rect x="70" y="8" width="16" height="8" rx="2" fill="#78350f" stroke="#0f172a" strokeWidth="3" />
            <circle cx="68" cy="14" r="4" fill="#ef4444" />
          </g>
        );
      case 'dum':
        return (
          <g transform="rotate(-12 60 22)">
            <rect x="46" y="16" width="30" height="24" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
            <text x="61" y="32" fill="#000000" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">DUM</text>
          </g>
        );
      case 'devil':
        return (
          <g>
            <path d="M44 16 C40 8 36 -2 32 -10 C42 -6 48 4 50 16 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="3" />
            <path d="M76 16 C80 8 84 -2 88 -10 C78 -6 72 4 70 16 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="3" />
          </g>
        );
      case 'halo':
        return (
          <g>
            <ellipse cx="60" cy="-6" rx="22" ry="7" fill="none" stroke="#fde047" strokeWidth="5" />
            <ellipse cx="60" cy="-6" rx="22" ry="7" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
          </g>
        );
      case 'goggles':
        return (
          <g>
            <rect x="42" y="10" width="36" height="10" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
            <ellipse cx="52" cy="15" rx="7" ry="6" fill="#38bdf8" stroke="#ca8a04" strokeWidth="2.5" />
            <ellipse cx="68" cy="15" rx="7" ry="6" fill="#38bdf8" stroke="#ca8a04" strokeWidth="2.5" />
          </g>
        );
      case 'viking':
        return (
          <g>
            <path d="M40 18 C40 4 80 4 80 18 Z" fill="#64748b" stroke="#0f172a" strokeWidth="4" />
            <path d="M40 12 C30 6 22 -6 20 -14 C28 -8 34 2 40 8 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
            <path d="M80 12 C90 6 98 -6 100 -14 C92 -8 86 2 80 8 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
          </g>
        );
      case 'cap':
        return (
          <g>
            <path d="M42 18 C42 6 78 6 78 18 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="4" />
            <path d="M30 18 C30 18 42 16 46 18 Z" fill="#b91c1c" stroke="#0f172a" strokeWidth="3" />
          </g>
        );
      case 'beanie':
        return (
          <g>
            <path d="M42 18 C42 0 78 0 78 18 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="4" />
            <circle cx="60" cy="-2" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
            <rect x="40" y="14" width="40" height="6" rx="2" fill="#0369a1" stroke="#0f172a" strokeWidth="3" />
          </g>
        );
      case 'egg':
        return (
          <g>
            <path d="M38 16 C38 10 46 8 56 6 C68 4 84 8 82 16 C80 20 68 18 58 18 C48 18 38 20 38 16 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
            <ellipse cx="60" cy="11" rx="8" ry="6" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
          </g>
        );
      case 'cheese':
        return (
          <g>
            <polygon points="42,16 78,16 66,-4" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="56" cy="10" r="3" fill="#d97706" />
            <circle cx="66" cy="8" r="2.5" fill="#d97706" />
            <circle cx="62" cy="1" r="2" fill="#d97706" />
          </g>
        );
      case 'cat':
        return (
          <g>
            <polygon points="42,16 40,-2 52,10" fill="#1e293b" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="43,14 42,2 50,10" fill="#f472b6" />
            <polygon points="78,16 80,-2 68,10" fill="#1e293b" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="77,14 78,2 70,10" fill="#f472b6" />
          </g>
        );
      case 'plague':
        return (
          <g>
            <path d="M42 16 C42 4 78 4 78 16 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
            <path d="M72 24 C86 24 96 32 94 40 C84 34 76 30 72 26 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
            <circle cx="68" cy="22" r="4" fill="#0f172a" />
          </g>
        );
      case 'straw':
        return (
          <g>
            <ellipse cx="60" cy="18" rx="26" ry="6" fill="#fde047" stroke="#0f172a" strokeWidth="3" />
            <path d="M46 18 C46 6 74 6 74 18 Z" fill="#fef08a" stroke="#0f172a" strokeWidth="3" />
            <rect x="47" y="13" width="26" height="4" fill="#0284c7" />
          </g>
        );
      case 'cowboy':
        return (
          <g>
            <path d="M34 18 C34 18 42 12 60 14 C78 12 86 18 86 18 C86 18 78 15 60 16 C42 15 34 18 34 18 Z" fill="#78350f" stroke="#0f172a" strokeWidth="4" />
            <path d="M46 16 C46 2 54 4 60 2 C66 4 74 2 74 16 Z" fill="#92400e" stroke="#0f172a" strokeWidth="4" />
          </g>
        );
      case 'santa':
        return (
          <g>
            <path d="M42 18 C44 2 76 0 86 16 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="4" />
            <circle cx="90" cy="18" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
            <rect x="40" y="14" width="42" height="7" rx="3.5" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
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

              {/* Headwear / Custom Hat */}
              {renderHat()}
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

