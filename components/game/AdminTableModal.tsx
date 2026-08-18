'use client';

import React from 'react';
import { X, MapPin, Users } from 'lucide-react';
import { Player, DeadBody } from '@/types/game';
import { ROOMS, getCurrentRoomName } from '@/lib/map-data';

interface AdminTableModalProps {
  players: Record<string, Player>;
  deadBodies?: DeadBody[];
  onClose: () => void;
}

export function AdminTableModal({ players, deadBodies = [], onClose }: AdminTableModalProps) {
  // Count living players + unreported dead bodies in each room
  const livingPlayers = Object.values(players).filter((p) => p.isAlive && !p.inVent);
  const activeBodies = deadBodies.filter((b) => !b.reported);

  const roomCounts: Record<string, number> = {};
  for (const room of ROOMS) {
    roomCounts[room.name] = 0;
  }

  for (const p of livingPlayers) {
    const roomName = getCurrentRoomName(p.x, p.y);
    if (roomCounts[roomName] !== undefined) {
      roomCounts[roomName]++;
    } else {
      roomCounts['Flur'] = (roomCounts['Flur'] || 0) + 1;
    }
  }

  for (const b of activeBodies) {
    const roomName = getCurrentRoomName(b.x, b.y);
    if (roomCounts[roomName] !== undefined) {
      roomCounts[roomName]++;
    } else {
      roomCounts['Flur'] = (roomCounts['Flur'] || 0) + 1;
    }
  }


  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-slate-950 border-4 border-cyan-500/80 rounded-2xl p-6 w-full max-w-3xl shadow-2xl shadow-cyan-500/20 text-white select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-cyan-400">ADMIN KARTE (RADAR)</h2>
              <p className="text-xs text-slate-400">Echtzeit-Raumbelegung auf der Skeld</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold mr-10">
            <Users size={14} />
            <span>{livingPlayers.length} SPIELER ONLINE</span>
          </div>
        </div>

        {/* Tactical Room Grid Display */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {ROOMS.map((room) => {
            const count = roomCounts[room.name] || 0;
            return (
              <div
                key={room.id}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between h-24 ${
                  count > 0
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${count > 0 ? 'text-white' : 'text-slate-500'}`}>
                    {room.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono ${
                      count > 0 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </div>

                {/* Player Mini-Avatars in this room */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-5 rounded-t-full bg-amber-400 border border-slate-950 shadow-sm relative animate-pulse"
                    >
                      <div className="w-2 h-1 bg-sky-200 rounded-sm absolute top-1 left-0.5" />
                    </div>
                  ))}
                  {count === 0 && <span className="text-[10px] text-slate-600 italic">Leer</span>}
                </div>
              </div>
            );
          })}

          {/* Hallways Tile */}
          <div
            className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between h-24 ${
              (roomCounts['Flur'] || 0) > 0
                ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(roomCounts['Flur'] || 0) > 0 ? 'text-white' : 'text-slate-500'}`}>
                Flure & Gänge
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono ${
                  (roomCounts['Flur'] || 0) > 0 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {roomCounts['Flur'] || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: roomCounts['Flur'] || 0 }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-5 rounded-t-full bg-amber-400 border border-slate-950 shadow-sm relative animate-pulse"
                >
                  <div className="w-2 h-1 bg-sky-200 rounded-sm absolute top-1 left-0.5" />
                </div>
              ))}
              {!(roomCounts['Flur'] || 0) && <span className="text-[10px] text-slate-600 italic">Leer</span>}
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="text-center text-xs text-slate-400">
          Die Admin-Konsole zeigt die Anzahl der Lebewesen in jedem Raum. Sie unterscheidet nicht zwischen Crew und Impostor!
        </div>
      </div>
    </div>
  );
}
