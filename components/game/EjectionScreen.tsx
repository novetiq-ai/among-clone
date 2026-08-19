import React, { useState, useEffect } from 'react';
import { EjectionData } from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { playButtonClick } from '@/lib/sound';

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
    confirmEjects = true,
  } = data;

  const fullHeadline = wasTie
    ? 'Niemand wurde hinausgeworfen. (Gleichstand)'
    : wasSkipped
    ? 'Niemand wurde hinausgeworfen. (Übersprungen)'
    : !confirmEjects
    ? `${ejectedPlayerName || 'Jemand'} wurde hinausgeworfen.`
    : `${ejectedPlayerName || 'Jemand'} war ${ejectedPlayerRole === 'impostor' ? 'Ein Impostor.' : 'Nicht der Impostor.'}`;

  const fullSubtext = !confirmEjects
    ? ''
    : remainingImpostors === 1
    ? '1 Impostor verbleibt.'
    : `${remainingImpostors} Impostors verbleiben.`;

  const [displayedHeadline, setDisplayedHeadline] = useState('');
  const [displayedSubtext, setDisplayedSubtext] = useState('');

  // Typewriter effect
  useEffect(() => {
    let charIdx = 0;
    const headlineInterval = setInterval(() => {
      if (charIdx < fullHeadline.length) {
        setDisplayedHeadline(fullHeadline.slice(0, charIdx + 1));
        playButtonClick();
        charIdx++;
      } else {
        clearInterval(headlineInterval);
        // Start subtext
        let subIdx = 0;
        const subInterval = setInterval(() => {
          if (subIdx < fullSubtext.length) {
            setDisplayedSubtext(fullSubtext.slice(0, subIdx + 1));
            subIdx++;
          } else {
            clearInterval(subInterval);
          }
        }, 50);
      }
    }, 65);

    return () => clearInterval(headlineInterval);
  }, [fullHeadline, fullSubtext]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      {/* Dynamic Starfield with Streaming Space Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#020617_60%,_#000000_100%)] pointer-events-none" />

      {/* Floating Tumbling Astronaut */}
      {ejectedPlayerName && ejectedPlayerColor && !wasTie && !wasSkipped && (
        <div className="absolute z-10 animate-[spin_8s_linear_infinite] top-1/3 transition-all duration-1000">
          <div className="animate-pulse">
            <AstronautAvatar color={ejectedPlayerColor} size={110} />
          </div>
        </div>
      )}

      {/* Typewriter Verdict Text */}
      <div className="relative z-20 text-center max-w-2xl px-6">
        <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wider mb-4 min-h-[3rem]">
          {displayedHeadline.includes('Ein Impostor.') ? (
            <span className="text-red-500">{displayedHeadline}</span>
          ) : displayedHeadline.includes('Nicht der Impostor.') ? (
            <span className="text-cyan-400">{displayedHeadline}</span>
          ) : (
            <span className="text-slate-200">{displayedHeadline}</span>
          )}
          <span className="animate-ping text-slate-500">|</span>
        </h2>

        {displayedSubtext && (
          <p className="text-sm sm:text-base font-mono text-slate-400 tracking-widest uppercase animate-fade-in">
            {displayedSubtext}
          </p>
        )}
      </div>
    </div>
  );
}

