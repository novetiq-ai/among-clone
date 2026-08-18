'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Player,
  PlayerColor,
  PLAYER_COLORS,
  GameSettings,
  ChatMessage,
} from '@/types/game';
import { AstronautAvatar } from './AstronautAvatar';
import {
  Users,
  Copy,
  Check,
  Play,
  Settings,
  Send,
  LogOut,
  Sparkles,
  Info,
} from 'lucide-react';

interface LobbyProps {
  isHost: boolean;
  roomCode: string;
  localPlayerId: string;
  localPlayer: Player;
  players: Record<string, Player>;
  settings: GameSettings;
  chatMessages: ChatMessage[];
  onUpdateProfile: (name: string, color: PlayerColor, isReady: boolean) => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onSendMessage: (text: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function Lobby({
  isHost,
  roomCode,
  localPlayerId,
  localPlayer,
  players,
  settings,
  chatMessages,
  onUpdateProfile,
  onUpdateSettings,
  onSendMessage,
  onStartGame,
  onLeaveRoom,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'crew' | 'chat'>('crew');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const playerList = Object.values(players);
  const takenColors = playerList.map((p) => p.color).filter((c) => c !== localPlayer.color);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const canStart = isHost && playerList.length >= 1;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* Background Starfield & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Top Header Bar with Vibrant Telemetry */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-3.5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full border-2 border-slate-100 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <div className="w-6 h-3 bg-blue-300 rounded-sm opacity-70" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300">
              THE SKELD: LOBBY
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              {isHost ? 'AUTHORITY: HOST INSTANZ' : 'CLIENT: CONNECTED TO RELAY'}
            </p>
          </div>
        </div>

        {/* Room Code & Copy Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-inner">
            <span className="text-[11px] text-slate-400 font-mono font-bold uppercase">CODE:</span>
            <span className="font-mono text-lg font-black text-amber-400 tracking-widest">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Code kopieren"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="hidden sm:inline-flex text-xs font-mono font-bold px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 transition-all cursor-pointer"
          >
            {copied ? 'Kopiert!' : 'Link teilen'}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verlassen</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Left Settings / Customizer & Right Crew Deck / Chat */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Player Calibration & Game Rules */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Identity Calibration Card */}
          <div className="bg-slate-900/90 border-2 border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Mein Astronaut
              </span>
              <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                {localPlayer.isHost ? '👑 HOST' : localPlayer.isReady ? '✅ BEREIT' : '⏳ WARTET'}
              </span>
            </div>

            {/* Astronaut Avatar Preview with Glowing Frame */}
            <div className="flex flex-col items-center justify-center py-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
              <AstronautAvatar
                color={localPlayer.color}
                size={80}
                name={localPlayer.name}
                isHost={localPlayer.isHost}
              />
            </div>

            {/* Name Input */}
            <div>
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Spielername
              </label>
              <input
                type="text"
                maxLength={12}
                value={localPlayer.name}
                onChange={(e) =>
                  onUpdateProfile(e.target.value || 'Crewmate', localPlayer.color, localPlayer.isReady)
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>

            {/* Color Selector Grid */}
            <div>
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
                Farbe
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_COLORS.map((col) => {
                  const isTaken = takenColors.includes(col.id);
                  const isSelected = localPlayer.color === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      disabled={isTaken}
                      onClick={() => onUpdateProfile(localPlayer.name, col.id, localPlayer.isReady)}
                      title={`${col.name} ${isTaken ? '(Bereits belegt)' : ''}`}
                      className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                          : isTaken
                          ? 'opacity-20 cursor-not-allowed grayscale'
                          : 'hover:scale-105 border border-black/40'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ready State Toggle for Clients */}
            {!isHost && (
              <button
                type="button"
                onClick={() =>
                  onUpdateProfile(localPlayer.name, localPlayer.color, !localPlayer.isReady)
                }
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs font-mono transition-all shadow-lg active:scale-98 cursor-pointer ${
                  localPlayer.isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 border border-emerald-400/40'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40 border border-amber-400/40'
                }`}
              >
                {localPlayer.isReady ? '✅ Bereit (Abbrechen)' : '⏳ Als Bereit markieren'}
              </button>
            )}
          </div>

          {/* Quick Settings Snapshot */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Spielregeln
              </span>
              {isHost && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono font-bold underline cursor-pointer"
                >
                  Anpassen
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex justify-between">
                <span className="text-slate-400">Impostor:</span>
                <span className="font-bold text-red-400">{settings.impostorCount}</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex justify-between">
                <span className="text-slate-400">Tempo:</span>
                <span className="font-bold text-cyan-400">{settings.playerSpeed}x</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex justify-between">
                <span className="text-slate-400">Kill CD:</span>
                <span className="font-bold text-amber-400">{settings.killCooldown}s</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex justify-between">
                <span className="text-slate-400">Tasks:</span>
                <span className="font-bold text-emerald-400">{settings.totalTasksPerPlayer}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Dropship Floor (Crew Grid) + Lobby Chat */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('crew')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'crew'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Besatzung ({playerList.length}/{settings.maxPlayers})</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Lobby-Chat {chatMessages.length > 0 && `(${chatMessages.length})`}</span>
            </button>
          </div>

          {/* Dropship Floor Tab */}
          {activeTab === 'crew' && (
            <div className="flex-1 bg-slate-900/80 border-2 border-blue-500/20 rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Raumschiff-Besatzung</span>
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                        {playerList.length} / {settings.maxPlayers}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Warte auf den Startbefehl des Hosts...
                    </p>
                  </div>
                </div>

                {/* Player Roster Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {playerList.map((player) => (
                    <div
                      key={player.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-inner transition-all hover:scale-105"
                    >
                      <AstronautAvatar
                        color={player.color}
                        size={64}
                        isHost={player.isHost}
                        name={player.name}
                        isReady={player.isHost ? undefined : player.isReady}
                      />
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 5 - playerList.length) }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="border-2 border-dashed border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center text-slate-600 gap-2 min-h-[140px]"
                    >
                      <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-base">
                        👤
                      </div>
                      <span className="text-[10px] font-mono uppercase font-semibold">Freier Slot</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Start Bar */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Teile den 4-stelligen Raumcode mit deinen Mitspielern!</span>
                </div>

                {isHost ? (
                  <button
                    onClick={onStartGame}
                    disabled={!canStart}
                    className={`px-8 py-3.5 rounded-xl font-black uppercase font-mono tracking-wider text-sm flex items-center gap-3 transition-all shadow-xl cursor-pointer ${
                      canStart
                        ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-red-600/30 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Spiel Starten</span>
                  </button>
                ) : (
                  <div className="text-xs font-mono font-semibold text-slate-300 animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Warten auf Start durch {playerList.find((p) => p.isHost)?.name || 'Host'}...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lobby Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 bg-slate-900/80 border-2 border-purple-500/20 rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[380px]">
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto max-h-[320px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono py-12">
                    <span className="text-2xl mb-2">💬</span>
                    <span>Noch keine Nachrichten in der Lobby.</span>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.senderId === localPlayerId;
                    const senderColorInfo = PLAYER_COLORS.find((c) => c.id === msg.senderColor);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black"
                            style={{ backgroundColor: senderColorInfo?.hex || '#ccc' }}
                          />
                          <span className="text-xs font-bold text-slate-300">
                            {msg.senderName} {isMe && '(Du)'}
                          </span>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] break-words ${
                            isMe
                              ? 'bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-900/30'
                              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="mt-4 flex gap-2 pt-3 border-t border-slate-800">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nachricht schreiben..."
                  maxLength={100}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950/40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Senden</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal (Host Only) */}
      {showSettingsModal && isHost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-mono font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" /> Spiel-Einstellungen
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Impostors */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Anzahl Impostor</label>
                <div className="flex items-center gap-2">
                  {[1, 2].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onUpdateSettings({ impostorCount: num })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.impostorCount === num
                          ? 'bg-red-600 text-white border border-red-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Speed */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Tempo</label>
                <div className="flex items-center gap-2">
                  {[1.0, 1.25, 1.5, 1.75].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onUpdateSettings({ playerSpeed: spd })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.playerSpeed === spd
                          ? 'bg-cyan-600 text-white border border-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Kill Cooldown */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Kill-Cooldown</label>
                <div className="flex items-center gap-2">
                  {[15, 25, 35, 45].map((cd) => (
                    <button
                      key={cd}
                      type="button"
                      onClick={() => onUpdateSettings({ killCooldown: cd })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.killCooldown === cd
                          ? 'bg-amber-600 text-white border border-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cd}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks per Player */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Tasks / Spieler</label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 6].map((tsk) => (
                    <button
                      key={tsk}
                      type="button"
                      onClick={() => onUpdateSettings({ totalTasksPerPlayer: tsk })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.totalTasksPerPlayer === tsk
                          ? 'bg-emerald-600 text-white border border-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tsk}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-900/40"
            >
              Einstellungen Speichern
            </button>
          </div>
        </div>
      )}

      {/* Telemetry Footer */}
      <footer className="relative z-10 h-12 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 sm:px-8 justify-between">
        <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-mono text-slate-500">
          <span className="text-emerald-500 font-semibold">● P2P_ENCRYPTION_ACTIVE</span>
          <span className="hidden sm:inline">LATENCY: ~18ms</span>
          <span>PEERS: {playerList.length}/{settings.maxPlayers}</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          The Skeld • Sector 7
        </div>
      </footer>
    </div>
  );
}
