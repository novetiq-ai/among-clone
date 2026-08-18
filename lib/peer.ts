'use client';

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { GameState, NetworkMessage, PlayerColor, Player } from '@/types/game';

// Ultra-fast European Supabase Realtime Relay (Frankfurt eu-central-1)
const SUPABASE_URL = 'https://cvjepqxttefdciuptdhp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2amVwcXh0dGVmZGNpdXB0ZGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDcxMjUsImV4cCI6MjEwMjIyMzEyNX0.6v77Tw5-cK_Z2kd5HmdowFu-gOgPsm7PfR-OGO90z0I';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused characters (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export type NetworkEventHandler = (message: NetworkMessage, senderId: string) => void;

interface BroadcastPayload {
  senderId: string;
  recipientId?: string | 'host' | 'all';
  message: NetworkMessage;
}

export class NetworkManager {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private roomCode: string = '';
  private hostId: string = '';

  private messageHandlers: Set<NetworkEventHandler> = new Set();
  private disconnectHandlers: Set<(peerId: string) => void> = new Set();
  private connectHandlers: Set<(peerId: string) => void> = new Set();

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 40,
          },
        },
      });
    }
    return this.supabase;
  }

  public async initHost(roomCode: string): Promise<string> {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    this.localPlayerId = 'host_' + Math.random().toString(36).substring(2, 9);
    this.hostId = this.localPlayerId;

    const supabase = this.getClient();
    const channelName = `skeld_room_${this.roomCode}`;

    return new Promise((resolve, reject) => {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { ack: true },
          presence: { key: this.localPlayerId },
        },
      });

      this.channel = channel;


      // Handle broadcast messages
      channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
        const data = payload as BroadcastPayload;
        if (!data || !data.message) return;

        // If message is directed to specific recipient
        if (
          data.recipientId &&
          data.recipientId !== 'all' &&
          data.recipientId !== 'host' &&
          data.recipientId !== this.localPlayerId
        ) {
          return;
        }

        this.notifyMessageHandlers(data.message, data.senderId);
      });

      // Presence tracking
      channel.on('presence', { event: 'leave' }, ({ key }) => {
        if (key && key !== this.localPlayerId) {
          this.notifyDisconnectHandlers(key);
        }
      });

      channel.on('presence', { event: 'join' }, ({ key }) => {
        if (key && key !== this.localPlayerId) {
          this.notifyConnectHandlers(key);
        }
      });

      const timeoutId = setTimeout(() => {
        reject(new Error('Konnte Host-Raum nicht initialisieren (Timeout).'));
      }, 10000);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeoutId);
          try {
            await channel.track({
              isHost: true,
              playerId: this.localPlayerId,
              joinedAt: Date.now(),
            });
            resolve(this.localPlayerId);
          } catch (e) {
            resolve(this.localPlayerId);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeoutId);
          reject(new Error(`Netzwerkfehler beim Erstellen von Raum ${this.roomCode}`));
        }
      });
    });
  }

  public async initClient(roomCode: string, name: string, preferredColor: PlayerColor): Promise<string> {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this.localPlayerId = 'player_' + Math.random().toString(36).substring(2, 9);

    const supabase = this.getClient();
    const channelName = `skeld_room_${this.roomCode}`;

    return new Promise((resolve, reject) => {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { ack: true },
          presence: { key: this.localPlayerId },
        },
      });

      this.channel = channel;

      let hasJoined = false;
      let joinInterval: NodeJS.Timeout | null = null;

      // Handle broadcast messages from Host
      channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
        const data = payload as BroadcastPayload;
        if (!data || !data.message) return;

        // If message is directed to specific recipient, check if it's for us
        if (data.recipientId && data.recipientId !== 'all' && data.recipientId !== this.localPlayerId) {
          return;
        }

        if (data.message.type === 'JOIN_ACCEPTED') {
          hasJoined = true;
          this.hostId = data.senderId;
          if (joinInterval) clearInterval(joinInterval);
          this.notifyMessageHandlers(data.message, data.senderId);
          resolve(this.localPlayerId);
        } else {
          this.notifyMessageHandlers(data.message, data.senderId);
        }
      });

      // Presence tracking
      channel.on('presence', { event: 'leave' }, ({ key }) => {
        if (key === this.hostId) {
          this.notifyDisconnectHandlers(key);
        }
      });

      const timeoutId = setTimeout(() => {
        if (joinInterval) clearInterval(joinInterval);
        if (!hasJoined) {
          channel.unsubscribe();
          reject(new Error(`Raum "${roomCode}" nicht gefunden oder Host ist offline.`));
        }
      }, 10000);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              isHost: false,
              playerId: this.localPlayerId,
              name,
              color: preferredColor,
              joinedAt: Date.now(),
            });
          } catch (e) {
            // ignore presence track failure
          }

          // Repeatedly send JOIN_REQUEST until accepted or timeout
          const sendJoin = () => {
            if (hasJoined) return;
            const joinMsg: NetworkMessage = {
              type: 'JOIN_REQUEST',
              name,
              preferredColor,
            };
            this.sendToHost(joinMsg);
          };

          sendJoin();
          joinInterval = setInterval(sendJoin, 800);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeoutId);
          if (joinInterval) clearInterval(joinInterval);
          reject(new Error(`Verbindungsfehler zu Raum "${roomCode}"`));
        }
      });
    });
  }

  public onMessage(handler: NetworkEventHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onDisconnect(handler: (peerId: string) => void) {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  public onConnect(handler: (peerId: string) => void) {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  private notifyMessageHandlers(message: NetworkMessage, senderId: string) {
    this.messageHandlers.forEach((handler) => handler(message, senderId));
  }

  private notifyDisconnectHandlers(peerId: string) {
    this.disconnectHandlers.forEach((handler) => handler(peerId));
  }

  private notifyConnectHandlers(peerId: string) {
    this.connectHandlers.forEach((handler) => handler(peerId));
  }

  /**
   * Broadcast message to all connected peers (Host -> all clients)
   */
  public broadcast(message: NetworkMessage, excludePeerId?: string) {
    if (!this.channel) return;

    this.channel.send({
      type: 'broadcast',
      event: 'msg',
      payload: {
        senderId: this.localPlayerId,
        recipientId: 'all',
        message,
      },
    });
  }

  /**
   * Send message to a specific peer (Host -> specific client)
   */
  public sendToPeer(peerId: string, message: NetworkMessage) {
    if (!this.channel) return;

    this.channel.send({
      type: 'broadcast',
      event: 'msg',
      payload: {
        senderId: this.localPlayerId,
        recipientId: peerId,
        message,
      },
    });
  }

  /**
   * Send message to host (Client -> Host)
   */
  public sendToHost(message: NetworkMessage) {
    if (!this.channel) return;

    if (this.isHost) {
      // Loopback for host
      this.notifyMessageHandlers(message, this.localPlayerId);
      return;
    }

    this.channel.send({
      type: 'broadcast',
      event: 'msg',
      payload: {
        senderId: this.localPlayerId,
        recipientId: 'all',
        message,
      },
    });
  }


  public destroy() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.messageHandlers.clear();
    this.disconnectHandlers.clear();
    this.connectHandlers.clear();
  }

  public getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }
}

