'use client';

import React from 'react';
import { EjectionData } from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';

interface EjectionScreenProps {
  data: EjectionData;
}

export function EjectionScreen({ data }: EjectionScreenProps) {
  const {
    ejectedPlayerName,
    ejectedPlayerColor,
    ejectedPlayerRole,
    wasTie,
    wasSkipped,
    remainingImpostors,
  } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      {/* Animated Star Stream Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black pointer-events-none" />

      {/* Floating Astronaut Animation if a player was ejected */}
      {ejectedPlayerName && ejectedPlayerColor && !wasTie && !wasSkipped && (
        <div className="relative z-10 animate-bounce duration-1000 mb-8 transform rotate-12 scale-125">
          <AstronautAvatar color={ejectedPlayerColor} size={110} />
        </div>
      )}

      {/* Ejection Dramatic Text */}
      <div className="relative z-10 text-center max-w-xl px-6">
        {wasTie ? (
          <h2 className="text-2xl sm:text-3xl font-black font-mono uppercase text-slate-300 tracking-wider mb-3">
            Niemand wurde hinausgeworfen. (Gleichstand)
          </h2>
        ) : wasSkipped ? (
          <h2 className="text-2xl sm:text-3xl font-black font-mono uppercase text-slate-300 tracking-wider mb-3">
            Niemand wurde hinausgeworfen. (Übersprungen)
          </h2>
        ) : (
          <h2 className="text-2xl sm:text-3xl font-black font-mono uppercase text-white tracking-wider mb-3">
            <span className="text-amber-400">{ejectedPlayerName}</span> war{' '}
            {ejectedPlayerRole === 'impostor' ? (
              <span className="text-red-500">Ein Impostor.</span>
            ) : (
              <span className="text-cyan-400">Nicht der Impostor.</span>
            )}
          </h2>
        )}

        <p className="text-sm font-mono text-slate-400 tracking-widest uppercase">
          {remainingImpostors === 1
            ? '1 Impostor verbleibt.'
            : `${remainingImpostors} Impostors verbleiben.`}
        </p>
      </div>
    </div>
  );
}
