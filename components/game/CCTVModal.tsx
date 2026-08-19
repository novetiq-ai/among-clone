'use client';

import React, { useEffect } from 'react';
import { X, Camera, Eye, Radio } from 'lucide-react';
import { Player, DeadBody, PLAYER_COLORS } from '@/types/game';
import { SECURITY_CAMERAS } from '@/lib/map-data';
import { playCameraClick } from '@/lib/sound';

interface CCTVModalProps {
  players: Record<string, Player>;
  deadBodies: DeadBody[];
  localPlayer: Player;
  onClose: () => void;
}

export function CCTVModal({ players, deadBodies, localPlayer, onClose }: CCTVModalProps) {
  const hasPlayedRef = React.useRef(false);

  useEffect(() => {
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      playCameraClick();
    }
  }, []);

  // Camera feeds with their coverage area bounding boxes
  const camFeeds = [
    {
      id: 'cam-medbay',
      name: 'KAMERA 1: MEDBAY FLUR',
      bounds: { x: 740, y: 380, w: 280, h: 220 },
      camPos: SECURITY_CAMERAS[0],
    },
    {
      id: 'cam-admin',
      name: 'KAMERA 2: ADMIN FLUR',
      bounds: { x: 1300, y: 920, w: 280, h: 220 },
      camPos: SECURITY_CAMERAS[1],
    },
    {
      id: 'cam-nav',
      name: 'KAMERA 3: NAVIGATION FLUR',
      bounds: { x: 1800, y: 680, w: 280, h: 220 },
      camPos: SECURITY_CAMERAS[2],
    },
    {
      id: 'cam-reactor',
      name: 'KAMERA 4: REAKTOR FLUR',
      bounds: { x: 300, y: 700, w: 280, h: 220 },
      camPos: SECURITY_CAMERAS[3],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-slate-950 border-4 border-emerald-500/80 rounded-2xl p-6 w-full max-w-4xl shadow-2xl shadow-emerald-500/20 text-white select-none">
        {/* Close Button */}
        <button
          onClick={() => {
            playCameraClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Camera size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-emerald-400">SICHERHEITS-ÜBERWACHUNG</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black animate-pulse">
                  <Radio size={12} /> LIVE REC
                </span>
              </div>
              <p className="text-xs text-slate-400">4-Kanal CCTV Videoüberwachung</p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-500/80 mr-12 hidden sm:inline">SKELD_SEC_NET_V2</span>
        </div>

        {/* 2x2 Camera Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {camFeeds.map((feed) => {
            // Find players in this camera's coverage zone
            const playersInFeed = Object.values(players).filter(
              (p) =>
                p.isAlive &&
                !p.inVent &&
                p.x >= feed.bounds.x &&
                p.x <= feed.bounds.x + feed.bounds.w &&
                p.y >= feed.bounds.y &&
                p.y <= feed.bounds.y + feed.bounds.h
            );

            // Find dead bodies in this camera's coverage zone
            const bodiesInFeed = deadBodies.filter(
              (b) =>
                !b.reported &&
                b.x >= feed.bounds.x &&
                b.x <= feed.bounds.x + feed.bounds.w &&
                b.y >= feed.bounds.y &&
                b.y <= feed.bounds.y + feed.bounds.h
            );

            return (
              <div
                key={feed.id}
                className="relative bg-slate-900/90 border-2 border-emerald-500/40 rounded-xl h-52 overflow-hidden flex flex-col justify-between p-3"
              >
                {/* CRT Scanline overlay effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-70 z-10" />

                {/* Top Info Bar */}
                <div className="flex items-center justify-between z-20">
                  <span className="text-[11px] font-black tracking-widest text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    {feed.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                    <Eye size={12} />
                    <span>{playersInFeed.length + bodiesInFeed.length} ERKANNT</span>
                  </div>
                </div>

                {/* Camera Viewport Canvas Simulation */}
                <div className="relative w-full h-full my-2 bg-slate-950/90 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                  {/* Hallway Floor representation */}
                  <div className="absolute inset-x-8 inset-y-4 bg-slate-900 border border-slate-700/50 rounded flex items-center justify-center">
                    <span className="text-[10px] font-mono text-slate-700 font-bold uppercase tracking-wider">
                      KORRIDOR BEREICH
                    </span>
                  </div>

                  {/* Render Living Players in Camera */}
                  {playersInFeed.map((p) => {
                    const col = PLAYER_COLORS.find((c) => c.id === p.color) || PLAYER_COLORS[0];
                    const relX = ((p.x - feed.bounds.x) / feed.bounds.w) * 100;
                    const relY = ((p.y - feed.bounds.y) / feed.bounds.h) * 100;

                    return (
                      <div
                        key={p.id}
                        className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                        style={{ left: `${Math.max(10, Math.min(90, relX))}%`, top: `${Math.max(10, Math.min(90, relY))}%` }}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 border-slate-950 shadow-md flex items-center justify-center"
                          style={{ backgroundColor: col.hex }}
                        >
                          <div className="w-2.5 h-1.5 bg-sky-300 rounded-sm" />
                        </div>
                        <span className="text-[9px] font-bold text-white bg-slate-950/80 px-1 rounded mt-0.5">
                          {p.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* Render Dead Bodies in Camera */}
                  {bodiesInFeed.map((b) => {
                    const col = PLAYER_COLORS.find((c) => c.id === b.color) || PLAYER_COLORS[0];
                    const relX = ((b.x - feed.bounds.x) / feed.bounds.w) * 100;
                    const relY = ((b.y - feed.bounds.y) / feed.bounds.h) * 100;

                    return (
                      <div
                        key={b.id}
                        className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${Math.max(10, Math.min(90, relX))}%`, top: `${Math.max(10, Math.min(90, relY))}%` }}
                      >
                        <div
                          className="w-4 h-3 rounded-b-md border border-slate-950 shadow-sm relative"
                          style={{ backgroundColor: col.hex }}
                        >
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full absolute -top-1 left-1" />
                        </div>
                        <span className="text-[8px] font-black text-red-400 bg-slate-950/90 px-1 rounded mt-0.5">
                          TOT
                        </span>
                      </div>
                    );
                  })}

                  {playersInFeed.length === 0 && bodiesInFeed.length === 0 && (
                    <span className="text-xs font-mono text-slate-600 z-20">KEINE BEWEGUNG</span>
                  )}
                </div>

                {/* Bottom timestamp */}
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 z-20">
                  <span>FPS: 30.0</span>
                  <span>FEED_ID: {feed.id.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Tipp: Achte auf die roten Blinkleuchten an den Korridoren, wenn jemand an den Kameras ist!
        </div>
      </div>
    </div>
  );
}
