'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Player,
  ChatMessage,
  PLAYER_COLORS,
  PlayerColor,
} from '@/types/game';
import { AstronautAvatar } from '@/components/AstronautAvatar';
import { Megaphone, Send, Clock, Check, X, ShieldAlert, SkipForward } from 'lucide-react';

interface MeetingModalProps {
  isEmergencyMeeting: boolean;
  reporterName: string;
  reporterColor?: PlayerColor;
  players: Record<string, Player>;
  localPlayerId: string;
  localPlayer: Player;
  meetingTimer: number;
  phase: 'discussion' | 'voting' | 'results';
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onCastVote: (targetId: string | 'skip') => void;
}

export function MeetingModal({
  isEmergencyMeeting,
  reporterName,
  reporterColor,
  players,
  localPlayerId,
  localPlayer,
  meetingTimer,
  phase,
  chatMessages,
  onSendMessage,
  onCastVote,
}: MeetingModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | 'skip' | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'voting' | 'chat'>('voting');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const playerList = Object.values(players);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !localPlayer.isAlive) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleConfirmVote = () => {
    if (!selectedTargetId || !localPlayer.isAlive || localPlayer.hasVoted) return;
    onCastVote(selectedTargetId);
  };

  // Group votes for results phase
  const votesMap: Record<string, Player[]> = { skip: [] };
  playerList.forEach((p) => {
    if (p.votedFor) {
      if (!votesMap[p.votedFor]) votesMap[p.votedFor] = [];
      votesMap[p.votedFor].push(p);
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* Top Meeting Siren Banner */}
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-red-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600 border-2 border-red-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 tracking-tighter">
              {isEmergencyMeeting ? 'NOTFALL-MEETING' : 'LEICHE GEMELDET!'}
            </h2>
            <p className="text-xs font-mono text-slate-300">
              Einberufen von: <strong className="text-amber-400">{reporterName}</strong>
            </p>
          </div>
        </div>

        {/* Meeting Countdown Timer */}
        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono">
          <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-lg font-black text-cyan-400">{meetingTimer}s</span>
        </div>
      </div>

      {/* Mobile Tab Switcher (< md screens) */}
      <div className="w-full max-w-4xl flex md:hidden bg-slate-900 border border-slate-800 rounded-xl p-1 mb-2 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('voting')}
          className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'voting'
              ? 'bg-red-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🗳️ ABSTIMMEN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>💬 CHAT ({chatMessages.length})</span>
        </button>
      </div>

      {/* Center Layout: Voting Deck & Discussion Chat */}
      <div className="w-full max-w-4xl flex-1 my-1 md:my-4 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[360px] overflow-hidden">
        {/* Voting Panel */}
        <div
          className={`md:col-span-8 bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto ${
            activeTab === 'voting' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">
                {phase === 'discussion' && '🗣️ DISKUSSIONSPHASE (KEINE STIMMEN)'}
                {phase === 'voting' && '🗳️ WÄHLE EINEN VERDÄCHTIGEN'}
                {phase === 'results' && '📊 ABSTIMMUNGSERGEBNIS'}
              </span>

              {localPlayer.hasVoted && (
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> STIMME ABGEGEBEN
                </span>
              )}
            </div>

            {/* Players Voting Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {playerList.map((p) => {
                const isMe = p.id === localPlayerId;
                const isSelected = selectedTargetId === p.id;
                const isDead = !p.isAlive;
                const isReporter = p.name === reporterName;
                const votersForP = votesMap[p.id] || [];

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (phase === 'voting' && localPlayer.isAlive && !localPlayer.hasVoted && !isDead) {
                        setSelectedTargetId(p.id);
                      }
                    }}
                    className={`relative p-2.5 sm:p-3 rounded-xl border-2 transition-all flex items-center justify-between min-h-[52px] ${
                      isDead
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-60'
                        : isSelected
                        ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50 cursor-pointer'
                        : phase === 'voting' && localPlayer.isAlive && !localPlayer.hasVoted
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-600 cursor-pointer active:scale-98'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <AstronautAvatar color={p.color} size={36} />
                        {isDead && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                            <X className="w-5 h-5 text-red-500 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white block truncate">
                          {p.name} {isMe && '(Du)'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {isDead ? 'TOT' : isReporter ? '📢 BERICHTER' : 'LEBENDIG'}
                        </span>
                      </div>
                    </div>

                    {/* Voted check / vote tokens */}
                    <div className="flex items-center gap-1 shrink-0">
                      {phase !== 'results' && p.hasVoted && !isDead && (
                        <span className="p-1 rounded-md bg-emerald-950 border border-emerald-500/50 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {/* In results phase, show avatar icons of who voted for this player */}
                      {phase === 'results' && votersForP.length > 0 && (
                        <div className="flex -space-x-1">
                          {votersForP.map((v) => (
                            <div
                              key={`voter-${v.id}`}
                              className="w-5 h-5 rounded-full border border-black shadow"
                              style={{ backgroundColor: PLAYER_COLORS.find((c) => c.id === v.color)?.hex }}
                              title={`${v.name} stimmte ab`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voting Action Bar */}
          {phase === 'voting' && localPlayer.isAlive && !localPlayer.hasVoted && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTargetId('skip')}
                className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
                  selectedTargetId === 'skip'
                    ? 'bg-slate-700 border-white text-white'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Überspringen</span>
              </button>

              <button
                type="button"
                disabled={!selectedTargetId}
                onClick={handleConfirmVote}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Check className="w-4 h-4" />
                <span>Stimme Bestätigen</span>
              </button>
            </div>
          )}
        </div>

        {/* Discussion Chat Panel */}
        <div
          className={`md:col-span-4 bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px] ${
            activeTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div>
            <span className="text-xs font-mono font-bold uppercase text-slate-400 block mb-3 border-b border-slate-800 pb-2">
              💬 Meeting-Chat
            </span>

            {/* Messages Feed */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-slate-500 font-mono py-8">
                  Wer war es? Diskutiert hier!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === localPlayerId;
                  const col = PLAYER_COLORS.find((c) => c.id === msg.senderColor);
                  return (
                    <div key={msg.id} className={`text-xs ${isMe ? 'text-right' : 'text-left'}`}>
                      <div className="flex items-center gap-1 font-bold text-[10px] text-slate-400 mb-0.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: col?.hex || '#ccc' }}
                        />
                        <span>{msg.senderName}</span>
                      </div>
                      <div
                        className={`inline-block px-3 py-1.5 rounded-xl break-words max-w-[90%] ${
                          isMe ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="mt-3 flex gap-2 pt-3 border-t border-slate-800">
            <input
              type="text"
              value={chatInput}
              disabled={!localPlayer.isAlive}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={localPlayer.isAlive ? 'Verdacht äußern...' : 'Tote können nicht chatten!'}
              maxLength={80}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || !localPlayer.isAlive}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
