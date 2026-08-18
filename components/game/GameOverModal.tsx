'use client';

import React from 'react';
import { Player } from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { RotateCcw, Trophy, Skull } from 'lucide-react';

interface GameOverModalProps {
  winner: 'crewmates' | 'impostors';
  winReason?: string;
  localPlayerRole: 'crewmate' | 'impostor' | 'unassigned';
  players: Record<string, Player>;
  isHost: boolean;
  onPlayAgain: () => void;
}

export function GameOverModal({
  winner,
  winReason,
  localPlayerRole,
  players,
  isHost,
  onPlayAgain,
}: GameOverModalProps) {
  const isWin = (winner === 'crewmates' && localPlayerRole === 'crewmate') ||
                (winner === 'impostors' && localPlayerRole === 'impostor');

  const impostorList = Object.values(players).filter((p) => p.role === 'impostor');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="relative z-10 w-full max-w-md bg-slate-900 border-4 border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-6">
        {/* Banner Icon */}
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl ${
          isWin ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-400' : 'bg-red-500/20 text-red-500 border-2 border-red-500'
        }`}>
          {isWin ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
        </div>

        {/* Victory / Defeat Title */}
        <div>
          <h2 className={`text-4xl font-black uppercase font-mono tracking-tighter ${
            winner === 'crewmates' ? 'text-cyan-400' : 'text-red-500'
          }`}>
            {isWin ? 'SIEG' : 'NIEDERLAGE'}
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider">
            {winner === 'crewmates' ? 'CREWMATES GEWINNEN' : 'IMPOSTORS GEWINNEN'}
          </p>
          {winReason && (
            <p className="text-xs text-slate-300 mt-2 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              {winReason}
            </p>
          )}
        </div>

        {/* Impostor Reveal Roster */}
        <div className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-mono font-bold uppercase text-red-400 block mb-3">
            🔪 DIE IMPOSTORS WAREN:
          </span>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            {impostorList.map((imp) => (
              <div key={imp.id} className="flex flex-col items-center">
                <AstronautAvatar color={imp.color} hat={imp.hat || 'none'} size={48} />
                <span className="text-xs font-bold text-red-400 mt-1">{imp.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-mono font-black text-sm uppercase tracking-wider shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>NOCHMAL SPIELEN (LOBBY)</span>
          </button>
        ) : (
          <div className="text-xs font-mono text-slate-400 animate-pulse">
            Warte auf den Host für die nächste Runde...
          </div>
        )}
      </div>
    </div>
  );
}
