'use client';

import type { Peer as PeerType, DataConnection } from 'peerjs';
import { GameState, NetworkMessage, PlayerColor, Player } from '@/types/game';

export const ROOM_PREFIX = 'amongus2d-v1-';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused characters (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatRoomId(code: string): string {
  return `${ROOM_PREFIX}${code.trim().toUpperCase()}`;
}

export const PEER_ICE_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  },
};

export type NetworkEventHandler = (message: NetworkMessage, senderId: string) => void;

export class NetworkManager {
  private peer: PeerType | null = null;
  private isHost: boolean = false;
  private localPlayerId: string = '';
  private roomCode: string = '';
  
  // Host stores all client connections
  private connections: Map<string, DataConnection> = new Map();
  // Client stores connection to host
  private hostConnection: DataConnection | null = null;

  private messageHandlers: Set<NetworkEventHandler> = new Set();
  private disconnectHandlers: Set<(peerId: string) => void> = new Set();
  private connectHandlers: Set<(peerId: string) => void> = new Set();

  public async initHost(roomCode: string): Promise<string> {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    const peerId = formatRoomId(this.roomCode);

    // Dynamic import to avoid SSR errors
    const { default: Peer } = await import('peerjs');

    return new Promise((resolve, reject) => {
      // Create Peer with designated ID & STUN NAT traversal
      const peer = new Peer(peerId, PEER_ICE_CONFIG);

      peer.on('open', (id) => {
        this.peer = peer;
        this.localPlayerId = id;
        resolve(id);
      });

      peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      peer.on('error', (err: any) => {
        console.error('PeerJS Host Error:', err);
        if (err.type === 'unavailable-id') {
          reject(new Error(`Raum-Code "${roomCode}" ist bereits vergeben. Bitte versuche einen anderen.`));
        } else {
          reject(err);
        }
      });
    });
  }

  public async initClient(roomCode: string, name: string, preferredColor: PlayerColor): Promise<string> {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    const hostPeerId = formatRoomId(this.roomCode);

    const { default: Peer } = await import('peerjs');

    return new Promise((resolve, reject) => {
      // Client gets an auto-assigned peer ID & STUN NAT traversal
      const peer = new Peer(PEER_ICE_CONFIG);


      let timeoutId: NodeJS.Timeout;

      peer.on('open', (id) => {
        this.peer = peer;
        this.localPlayerId = id;

        // Connect to the host
        const conn = peer.connect(hostPeerId, {
          reliable: true,
        });

        timeoutId = setTimeout(() => {
          reject(new Error(`Verbindung zum Raum "${roomCode}" fehlgeschlagen (Timeout). Existiert der Raum?`));
        }, 12000);

        conn.on('open', () => {
          clearTimeout(timeoutId);
          this.hostConnection = conn;

          // Listen for messages from Host
          conn.on('data', (data: any) => {
            this.notifyMessageHandlers(data as NetworkMessage, hostPeerId);
          });

          conn.on('close', () => {
            console.log('Verbindung zum Host getrennt');
            this.notifyDisconnectHandlers(hostPeerId);
          });

          conn.on('error', (err) => {
            console.error('Verbindungsfehler zum Host:', err);
          });

          // Send JOIN_REQUEST immediately upon connection
          const joinMsg: NetworkMessage = {
            type: 'JOIN_REQUEST',
            name,
            preferredColor,
          };
          conn.send(joinMsg);

          resolve(id);
        });

        conn.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(new Error(`Konnte nicht mit Raum "${roomCode}" verbinden: ${err.message}`));
        });
      });

      peer.on('error', (err: any) => {
        console.error('PeerJS Client Error:', err);
        if (err.type === 'peer-unavailable') {
          reject(new Error(`Raum "${roomCode}" wurde nicht gefunden. Überprüfe den Code.`));
        } else {
          reject(err);
        }
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.notifyConnectHandlers(conn.peer);

      conn.on('data', (data: any) => {
        this.notifyMessageHandlers(data as NetworkMessage, conn.peer);
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.notifyDisconnectHandlers(conn.peer);
      });

      conn.on('error', (err) => {
        console.error(`Fehler bei Client ${conn.peer}:`, err);
        this.connections.delete(conn.peer);
        this.notifyDisconnectHandlers(conn.peer);
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
    if (!this.isHost) {
      console.warn('Nur der Host kann Nachrichten an alle broadcasten');
      return;
    }
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(message);
      }
    });
  }

  /**
   * Send message to a specific peer (Host -> specific client)
   */
  public sendToPeer(peerId: string, message: NetworkMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    }
  }

  /**
   * Send message to host (Client -> Host)
   */
  public sendToHost(message: NetworkMessage) {
    if (this.isHost) {
      // Local host loopback
      this.notifyMessageHandlers(message, this.localPlayerId);
      return;
    }
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(message);
    } else {
      console.warn('Keine aktive Verbindung zum Host');
    }
  }

  public destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
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
