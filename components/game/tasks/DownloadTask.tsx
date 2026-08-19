'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, Check, HardDrive, Laptop } from 'lucide-react';
import { sound } from '@/lib/sound';

interface DownloadTaskProps {
  onComplete: () => void;
  onClose: () => void;
}

export function DownloadTask({ onComplete, onClose }: DownloadTaskProps) {
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!downloading) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            sound.playTaskComplete();
            setTimeout(() => {
              onCompleteRef.current();
            }, 500);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [downloading]);

  const handleStart = () => {
    sound.playButtonClick();
    setDownloading(true);
  };

  const eta = Math.max(0, Math.ceil((100 - progress) * 0.08));

  return (
    <div className="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          <h3 className="font-black uppercase text-sm tracking-wider text-slate-200 font-mono">
            DATEN HERUNTERLADEN
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          SCHLIEßEN [ESC]
        </button>
      </div>

      {/* Main Download Screen */}
      <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 shadow-inner flex flex-col gap-6">
        {/* Device Transfer Flow */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">SKELD_CORE</span>
          </div>

          {/* Animated packets */}
          <div className="flex-1 mx-6 flex items-center justify-center gap-1.5 overflow-hidden">
            {downloading && (
              <div className="flex gap-2 animate-pulse text-cyan-400 font-mono text-xs font-bold">
                <span>&bull;&bull;&bull;</span>
                <span>DATA</span>
                <span>&gt;&gt;&gt;</span>
              </div>
            )}
            {!downloading && <div className="h-0.5 w-full bg-slate-800" />}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/30">
              <Laptop className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-slate-400">TABLET</span>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">TRANSFER STATUS:</span>
            <span className="text-cyan-400 font-bold">
              {downloading ? `${progress}% (${eta}s verbleibend)` : 'BEREIT'}
            </span>
          </div>
          <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        {!downloading ? (
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm uppercase tracking-wider shadow-lg shadow-cyan-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD STARTEN</span>
          </button>
        ) : progress >= 100 ? (
          <div className="w-full py-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs uppercase text-center flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> TRANSFER VOLLSTÄNDIG!
          </div>
        ) : (
          <div className="w-full py-3 rounded-xl bg-slate-900 text-slate-400 font-mono font-bold text-xs uppercase text-center border border-slate-800 animate-pulse">
            DATENÜBERTRAGUNG LÄUFT...
          </div>
        )}
      </div>
    </div>
  );
}
