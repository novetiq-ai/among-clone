'use client';

import React, { useState } from 'react';
import { PlayerColor, PLAYER_COLORS } from '@/types/game';
import { AstronautAvatar } from './AstronautAvatar';
import { PlusCircle, LogIn, Sparkles, ShieldAlert, HelpCircle, ArrowRight } from 'lucide-react';

interface MainMenuProps {
  initialRoomCode?: string;
  onCreateRoom: (name: string, color: PlayerColor) => void;
  onJoinRoom: (roomCode: string, name: string, color: PlayerColor) => void;
  isLoading: boolean;
  error: string | null;
}

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function normalizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function MainMenu({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
}: MainMenuProps) {
  const [name, setName] = useState('Pilot');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');
  const [roomCodeInput, setRoomCodeInput] = useState(() => normalizeRoomCode(initialRoomCode));
  const [activeMode, setActiveMode] = useState<'menu' | 'join' | 'create' | 'help'>(
    initialRoomCode ? 'join' : 'menu'
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;
    onCreateRoom(name.trim(), selectedColor);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedRoomCode = normalizeRoomCode(roomCodeInput);
    if (!name.trim() || !ROOM_CODE_PATTERN.test(normalizedRoomCode) || isLoading) return;
    onJoinRoom(normalizedRoomCode, name.trim(), selectedColor);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* Dynamic Animated Space Background & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />

      {/* Subtle Star Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Top Brand Header */}
      <header className="relative z-10 flex min-w-0 items-center px-3 py-3.5 sm:px-8 sm:py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div aria-hidden="true" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-red-600 rounded-full border-2 border-slate-100 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <div className="w-5 h-2.5 sm:w-6 sm:h-3 bg-blue-300 rounded-sm opacity-70" />
          </div>
          <h1 className="min-w-0 truncate text-base sm:text-2xl font-black tracking-tight sm:tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300">
            NEBULA DECEPTION
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="w-full mb-6 bg-red-950/70 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-xs shadow-lg shadow-red-950/50"
          >
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-red-300 uppercase tracking-wider">Verbindungsfehler</span>
              {error}
            </div>
          </div>
        )}

        {activeMode === 'menu' && (
          <div className="w-full flex flex-col gap-6">
            {/* Dual Action Cards: Host (Blue) vs Join (Purple) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Host Session Card */}
              <div 
                onClick={() => setActiveMode('create')}
                className="bg-slate-900/90 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-6 transition-all group shadow-xl shadow-blue-950/20 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                    <span className="text-2xl">🛰️</span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center justify-between">
                    <span>Raum Erstellen</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded font-mono font-bold">HOST</span>
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Erstelle eine private Spielsitzung und lege die Regeln für deine Runde fest.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 group-hover:shadow-blue-600/50 rounded-xl font-bold text-sm text-white uppercase tracking-wider shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>SESSION HOSTEN</span>
                </button>
              </div>

              {/* Join Relay Card */}
              <div
                onClick={() => setActiveMode('join')}
                className="bg-slate-900/90 border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-6 transition-all group shadow-xl shadow-purple-950/20 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                    <span className="text-2xl">🧬</span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-2 flex items-center justify-between">
                    <span>Raum Beitreten</span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-bold">CLIENT</span>
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Tritt einer privaten Runde mit einem 6-stelligen Raumcode oder Einladungslink bei.
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 group-hover:shadow-purple-600/50 rounded-xl font-bold text-sm text-white uppercase tracking-wider shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>BEITRETEN</span>
                </button>
              </div>
            </div>

            {/* Identity Calibration Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <h4 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Identität konfigurieren
              </h4>

              <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                {/* Astronaut Calibration Display */}
                <div className="w-36 h-44 bg-slate-800/90 rounded-2xl relative flex flex-col items-center justify-center border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)] p-3">
                  <AstronautAvatar color={selectedColor} size={76} />
                  <div className="absolute -bottom-3 bg-red-600 border border-red-400 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    {name || 'PILOT'}
                  </div>
                </div>

                {/* Name & Color Controls */}
                <div className="flex-1 w-full flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="main-menu-player-name"
                      className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
                    >
                      Spielername:
                    </label>
                    <input
                      id="main-menu-player-name"
                      type="text"
                      maxLength={12}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name eingeben..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors shadow-inner"
                    />
                  </div>

                  <fieldset>
                    <legend className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Anzug-Farbe:
                    </legend>
                    <div className="grid grid-cols-4 justify-items-center gap-2 sm:grid-cols-12">
                      {PLAYER_COLORS.map((c) => {
                        const isSelected = selectedColor === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedColor(c.id)}
                            aria-label={'Anzugfarbe ' + c.name + (isSelected ? ', ausgewählt' : '')}
                            aria-pressed={isSelected}
                            title={c.name}
                            className={`h-11 w-11 rounded-full transition-all cursor-pointer sm:h-8 sm:w-8 ${
                              isSelected
                                ? 'ring-2 ring-white ring-offset-4 ring-offset-slate-900 scale-110 shadow-lg'
                                : 'hover:scale-105 border border-black/40'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>

            {/* Help link */}
            <div className="flex justify-center">
              <button
                onClick={() => setActiveMode('help')}
                className="min-h-11 px-2 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Wie funktioniert die Direktverbindung?</span>
              </button>
            </div>
          </div>
        )}

        {/* Create Mode View */}
        {activeMode === 'create' && (
          <div className="w-full max-w-lg bg-slate-900/90 border-2 border-blue-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-xl">
                🛰️
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Raum Hosten</h3>
                <p className="text-xs text-slate-400">Du wirst die Host-Instanz für deine Freunde</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-5">
              <div className="flex items-center gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <AstronautAvatar color={selectedColor} size={54} />
                <div className="flex-1">
                  <span className="text-xs font-mono text-slate-400 block uppercase">Gewählter Pilot</span>
                  <span className="text-base font-bold text-white">{name}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('menu')}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition-all"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="w-2/3 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Raum wird erstellt...</span>
                  ) : (
                    <>
                      <span>Session Starten</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Mode View */}
        {activeMode === 'join' && (
          <div className="w-full max-w-lg bg-slate-900/90 border-2 border-purple-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-xl">
                🧬
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Raum Beitreten</h3>
                <p className="text-xs text-slate-400">Gib den 6-stelligen Code der privaten Runde ein</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-5">
              <div>
                <label htmlFor="room-code" className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  6-stelliger Raumcode
                </label>
                <input
                  id="room-code"
                  type="text"
                  minLength={ROOM_CODE_LENGTH}
                  maxLength={ROOM_CODE_LENGTH}
                  pattern="[A-HJ-NP-Z2-9]{6}"
                  required
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(normalizeRoomCode(e.target.value))}
                  placeholder="Z. B. X4Z9Q7"
                  aria-describedby="room-code-hint"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-4 py-3.5 font-mono text-center text-3xl font-black tracking-widest text-purple-400 focus:outline-none focus:border-purple-400 uppercase shadow-inner"
                  autoFocus
                />
                <p id="room-code-hint" className="mt-2 text-[11px] text-slate-400">
                  Erlaubt sind A–H, J–N, P–Z und 2–9.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMode('menu')}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition-all"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim() || !ROOM_CODE_PATTERN.test(roomCodeInput)}
                  className="w-2/3 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Verbindung wird aufgebaut...</span>
                  ) : (
                    <>
                      <span>Runde beitreten</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Help Mode View */}
        {activeMode === 'help' && (
          <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h4 className="font-bold text-white flex items-center gap-2 text-base mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" /> Direktverbindung im Browser
            </h4>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800 mb-6">
              <p>
                Nebula Deception verbindet private Runden über WebRTC.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li><strong className="text-slate-200">Host:</strong> Erstellt die Runde und legt die Regeln fest.</li>
                <li><strong className="text-slate-200">Mitspieler:</strong> Treten per Raumcode oder Einladungslink bei.</li>
                <li>
                  <strong className="text-slate-200">Netzwerk:</strong> Der tatsächliche Verbindungsweg hängt von Browser und Netzwerk ab.
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveMode('menu')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Schließen
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 min-h-12 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center gap-3 px-3 py-3 sm:px-8 justify-between">
        <span className="text-[10px] font-mono font-semibold text-slate-400">NEBULA DECEPTION</span>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Private Browserrunde
        </div>
      </footer>
    </div>
  );
}
