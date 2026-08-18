'use client';

import React from 'react';
import { X, Flame, Zap, Wind, Radio, Lock, AlertCircle } from 'lucide-react';
import { SabotageType } from '@/types/game';
import { playDoorLock, playSabotageAlarm } from '@/lib/sound';

interface SabotageModalProps {
  onTriggerSabotage: (type: SabotageType) => void;
  onLockDoors: (room: string) => void;
  cooldownRemaining: number;
  activeSabotageType: SabotageType | null;
  onClose: () => void;
}

export function SabotageModal({
  onTriggerSabotage,
  onLockDoors,
  cooldownRemaining,
  activeSabotageType,
  onClose,
}: SabotageModalProps) {
  const isCooldown = cooldownRemaining > 0;
  const isAnySabotageActive = activeSabotageType !== null;

  const handleSystemSabotage = (type: SabotageType) => {
    if (isCooldown || isAnySabotageActive) return;
    playSabotageAlarm();
    onTriggerSabotage(type);
    onClose();
  };

  const handleDoorLock = (room: string) => {
    playDoorLock();
    onLockDoors(room);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-slate-950 border-4 border-red-600/80 rounded-2xl p-6 w-full max-w-2xl shadow-2xl shadow-red-600/30 text-white select-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-xl text-red-500 animate-pulse">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-red-500">SABOTAGE-STEUERUNG</h2>
              <p className="text-xs text-slate-400">Manipuliere Schiffssysteme und blockiere Türen</p>
            </div>
          </div>

          {/* Cooldown Display */}
          {isCooldown && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-600/50 text-red-400 text-xs font-mono font-bold mr-10">
              <AlertCircle size={14} />
              <span>COOLDOWN: {cooldownRemaining}s</span>
            </div>
          )}
        </div>

        {/* Section 1: Major System Sabotages */}
        <div className="mb-6">
          <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
            Kritische Schiffssysteme
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Lights */}
            <button
              disabled={isCooldown || isAnySabotageActive}
              onClick={() => handleSystemSabotage('lights')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                isCooldown || isAnySabotageActive
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/10'
              }`}
            >
              <Zap size={28} className="text-amber-400" />
              <div>
                <div className="font-black text-sm">Lichter</div>
                <div className="text-[10px] text-slate-400">Nachtsicht drosseln</div>
              </div>
            </button>

            {/* Reactor */}
            <button
              disabled={isCooldown || isAnySabotageActive}
              onClick={() => handleSystemSabotage('reactor')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                isCooldown || isAnySabotageActive
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-red-950/40 border-red-500/60 text-red-300 hover:bg-red-900/50 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/10'
              }`}
            >
              <Flame size={28} className="text-red-400 animate-pulse" />
              <div>
                <div className="font-black text-sm">Reaktor</div>
                <div className="text-[10px] text-slate-400">30s Meltdown Notfall</div>
              </div>
            </button>

            {/* O2 */}
            <button
              disabled={isCooldown || isAnySabotageActive}
              onClick={() => handleSystemSabotage('o2')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                isCooldown || isAnySabotageActive
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-teal-950/40 border-teal-500/60 text-teal-300 hover:bg-teal-900/50 hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/10'
              }`}
            >
              <Wind size={28} className="text-teal-400" />
              <div>
                <div className="font-black text-sm">Sauerstoff</div>
                <div className="text-[10px] text-slate-400">O2 Depletion Notfall</div>
              </div>
            </button>

            {/* Comms */}
            <button
              disabled={isCooldown || isAnySabotageActive}
              onClick={() => handleSystemSabotage('comms')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                isCooldown || isAnySabotageActive
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300 hover:bg-indigo-900/50 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/10'
              }`}
            >
              <Radio size={28} className="text-indigo-400" />
              <div>
                <div className="font-black text-sm">Funk / Comms</div>
                <div className="text-[10px] text-slate-400">Tasks & Radar stören</div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Door Locks */}
        <div>
          <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
            Türen verriegeln (10 Sekunden)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {['Cafeteria', 'MedBay', 'Security', 'Electrical', 'Storage'].map((room) => (
              <button
                key={room}
                onClick={() => handleDoorLock(room)}
                className="p-3 rounded-xl bg-slate-900/80 border-2 border-slate-700 hover:border-red-500/60 hover:bg-red-950/30 text-slate-300 hover:text-red-300 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center"
              >
                <Lock size={20} className="text-slate-400" />
                <span className="text-xs font-bold">{room}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Sabotage Alert */}
        {isAnySabotageActive && (
          <div className="mt-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
            <AlertCircle size={16} />
            Sabotage bereits aktiv: {activeSabotageType?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
