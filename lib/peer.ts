'use client';

import type { DataConnection, Peer } from 'peerjs';
import type { GameState, NetworkMessage, Player, PlayerColor } from '@/types/game';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const PROTOCOL_VERSION = 1 as const;
const MAX_MESSAGE_BYTES = 64 * 1024;
const CONNECTION_TIMEOUT_MS = 12_000;
const JOIN_HANDSHAKE_TIMEOUT_MS = 6_000;
const MAX_HOST_CONNECTIONS = 16;
const SIGNAL_RECONNECT_LIMIT = 3;
const HOST_MESSAGES_PER_SECOND = 90;
const MAX_PENDING_MESSAGES = 256;

const KNOWN_MESSAGE_TYPES = new Set<NetworkMessage['type']>([
  'JOIN_REQUEST',
  'JOIN_ACCEPTED',
  'JOIN_REJECTED',
  'PLAYER_JOINED',
  'PLAYER_LEFT',
  'PLAYER_UPDATE_PROFILE',
  'UPDATE_SETTINGS',
  'CHAT_MESSAGE',
  'STATE_SYNC',
  'PLAYER_MOVE',
  'START_GAME',
  'KILL_PLAYER',
  'REPORT_BODY',
  'EMERGENCY_MEETING',
  'CAST_VOTE',
  'COMPLETE_TASK',
  'VENT_ACTION',
  'TRIGGER_SABOTAGE',
  'FIX_SABOTAGE',
  'LOCK_DOORS',
  'SECURITY_CAM_TOGGLE',
  'PLAY_AGAIN',
]);

const CLIENT_TO_HOST_TYPES = new Set<NetworkMessage['type']>([
  'JOIN_REQUEST',
  'PLAYER_UPDATE_PROFILE',
  'CHAT_MESSAGE',
  'PLAYER_MOVE',
  'KILL_PLAYER',
  'REPORT_BODY',
  'EMERGENCY_MEETING',
  'CAST_VOTE',
  'COMPLETE_TASK',
  'VENT_ACTION',
  'TRIGGER_SABOTAGE',
  'FIX_SABOTAGE',
  'LOCK_DOORS',
  'SECURITY_CAM_TOGGLE',
]);

interface WireEnvelope {
  v: typeof PROTOCOL_VERSION;
  message: NetworkMessage;
}

interface PendingMessage {
  message: NetworkMessage;
  senderId: string;
}

interface RateLimitState {
  windowStartedAt: number;
  count: number;
}

export type NetworkEventHandler = (message: NetworkMessage, senderId: string) => void;

function normalizeRoomCode(roomCode: string): string {
  const normalized = roomCode.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) {
    throw new Error('Raumcodes bestehen aus genau 6 gültigen Zeichen.');
  }
  return normalized;
}

function getHostPeerId(roomCode: string): string {
  return 'nebula-deception-host-' + roomCode.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonByteLength(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') return null;
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return null;
  }
}

function decodeEnvelope(value: unknown): NetworkMessage | null {
  if (!isRecord(value) || value.v !== PROTOCOL_VERSION || !isRecord(value.message)) {
    return null;
  }

  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'v' && key !== 'message')) {
    return null;
  }

  const type = value.message.type;
  if (typeof type !== 'string' || !KNOWN_MESSAGE_TYPES.has(type as NetworkMessage['type'])) {
    return null;
  }

  return value.message as unknown as NetworkMessage;
}

function projectPlayer(
  player: Player,
  recipientId: string,
  recipientRole: Player['role'] | undefined,
  revealAllRoles: boolean,
  redactVote: boolean
): Player {
  const isRecipient = player.id === recipientId;
  const isImpostorTeammate = recipientRole === 'impostor' && player.role === 'impostor';
  const canSeeRole = revealAllRoles || isRecipient || isImpostorTeammate;

  const projected = {
    ...player,
    role: canSeeRole ? player.role : 'unassigned',
    assignedTasks: isRecipient ? [...player.assignedTasks] : [],
    completedTasks: isRecipient ? [...player.completedTasks] : [],
    ...(redactVote && !isRecipient ? { votedFor: null } : {}),
  };

  if (!canSeeRole) {
    projected.killAvailableAt = undefined;
    projected.killCooldown = undefined;
    projected.ventId = undefined;
  }

  return projected;
}

/**
 * Creates the authoritative state view a single recipient is allowed to know.
 * The host keeps the full state; only serialized client snapshots are redacted.
 */
export function projectGameStateForPlayer(gameState: GameState, recipientId: string): GameState {
  const recipientRole = gameState.players[recipientId]?.role;
  const revealAllRoles = gameState.phase === 'game_over';
  const redactVotes = gameState.phase === 'meeting' && gameState.meetingPhase === 'voting';

  const players = Object.fromEntries(
    Object.entries(gameState.players).map(([playerId, player]) => [
      playerId,
      projectPlayer(player, recipientId, recipientRole, revealAllRoles, redactVotes),
    ])
  );

  const ejectionData = gameState.ejectionData
    ? gameState.settings.confirmEjects
      ? { ...gameState.ejectionData }
      : {
          ...gameState.ejectionData,
          ejectedPlayerRole: undefined,
          remainingImpostors: 0,
          confirmEjects: false,
        }
    : undefined;

  return {
    ...gameState,
    players,
    settings: { ...gameState.settings },
    deadBodies: gameState.deadBodies.map((body) => ({ ...body })),
    ejectionData,
    activeSabotage: gameState.activeSabotage
      ? {
          ...gameState.activeSabotage,
          fixedSwitches: gameState.activeSabotage.fixedSwitches
            ? [...gameState.activeSabotage.fixedSwitches]
            : undefined,
          reactorHands: gameState.activeSabotage.reactorHands
            ? [...gameState.activeSabotage.reactorHands]
            : undefined,
          reactorStations: gameState.activeSabotage.reactorStations
            ? [...gameState.activeSabotage.reactorStations]
            : undefined,
          o2FixedRooms: gameState.activeSabotage.o2FixedRooms
            ? [...gameState.activeSabotage.o2FixedRooms]
            : undefined,
        }
      : gameState.activeSabotage,
    lockedDoors: gameState.lockedDoors ? { ...gameState.lockedDoors } : undefined,
  };
}

function projectMessageForRecipient(message: NetworkMessage, recipientId: string): NetworkMessage {
  switch (message.type) {
    case 'JOIN_ACCEPTED':
      return {
        ...message,
        gameState: projectGameStateForPlayer(message.gameState, recipientId),
      };

    case 'STATE_SYNC':
      return {
        ...message,
        gameState: projectGameStateForPlayer(message.gameState, recipientId),
      };

    case 'PLAYER_JOINED':
      return {
        ...message,
        player:
          message.player.id === recipientId
            ? {
                ...message.player,
                assignedTasks: [...message.player.assignedTasks],
                completedTasks: [...message.player.completedTasks],
              }
            : {
                ...message.player,
                role: 'unassigned',
                assignedTasks: [],
                completedTasks: [],
                votedFor: null,
              },
      };

    default:
      return message;
  }
}

function bindClientIdentity(message: NetworkMessage, senderId: string): NetworkMessage {
  switch (message.type) {
    case 'CHAT_MESSAGE':
      return {
        ...message,
        message: {
          ...message.message,
          senderId,
          timestamp: Date.now(),
          isSystem: false,
        },
      };

    case 'PLAYER_MOVE':
      return { ...message, playerId: senderId };

    case 'KILL_PLAYER':
      return { ...message, killerId: senderId };

    case 'REPORT_BODY':
      return { ...message, reporterId: senderId };

    case 'EMERGENCY_MEETING':
      return { ...message, reporterId: senderId };

    case 'CAST_VOTE':
      return { ...message, voterId: senderId };

    case 'COMPLETE_TASK':
      return { ...message, playerId: senderId };

    case 'VENT_ACTION':
      return { ...message, playerId: senderId };

    case 'FIX_SABOTAGE':
      return { ...message, fixerId: senderId };

    case 'SECURITY_CAM_TOGGLE':
      return { ...message, viewerId: senderId };

    default:
      return message;
  }
}

function errorType(error: unknown): string {
  return isRecord(error) && typeof error.type === 'string' ? error.type : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function generateRoomCode(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Sichere Zufallszahlen werden von diesem Browser nicht unterstützt.');
  }

  const randomBytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(randomBytes);

  let code = '';
  for (const randomByte of randomBytes) {
    code += ROOM_CODE_ALPHABET[randomByte & 31];
  }
  return code;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private connections = new Map<string, DataConnection>();
  private rateLimits = new Map<string, RateLimitState>();
  private acceptedPeerIds = new Set<string>();
  private hostHandshakeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private joinRequestsSeen = new WeakSet<DataConnection>();
  private joinRequestsSent = new WeakSet<DataConnection>();
  private suppressedConnections = new WeakSet<DataConnection>();

  private isHost = false;
  private localPlayerId = '';
  private roomCode = '';
  private hostId = '';
  private transportClosed = true;
  private clientJoined = false;

  private messageHandlers = new Set<NetworkEventHandler>();
  private disconnectHandlers = new Set<(peerId: string) => void>();
  private connectHandlers = new Set<(peerId: string) => void>();
  private pendingMessages: PendingMessage[] = [];
  private notifiedDisconnects = new Set<string>();

  private clientInitResolve: ((peerId: string) => void) | null = null;
  private clientInitReject: ((error: Error) => void) | null = null;
  private clientJoinTimeout: ReturnType<typeof setTimeout> | null = null;
  private signalReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private signalReconnectAttempts = 0;

  public async initHost(roomCode: string): Promise<string> {
    this.prepareForInitialization();
    this.isHost = true;
    this.roomCode = normalizeRoomCode(roomCode);
    this.localPlayerId = getHostPeerId(this.roomCode);
    this.hostId = this.localPlayerId;

    const { Peer: PeerConstructor } = await import('peerjs');
    const peer = new PeerConstructor(this.localPlayerId, { debug: 1 });
    this.peer = peer;

    return new Promise<string>((resolve, reject) => {
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.teardownTransport();
        reject(error);
      };

      const timeoutId = setTimeout(() => {
        fail(new Error('Konnte den Host-Raum nicht initialisieren (Timeout).'));
      }, CONNECTION_TIMEOUT_MS);

      peer.on('connection', (connection) => {
        this.attachHostConnection(connection);
      });

      peer.on('open', (peerId) => {
        if (peerId !== this.localPlayerId) {
          fail(new Error('Der Host erhielt eine unerwartete Netzwerk-ID.'));
          return;
        }

        this.handleSignalingOpen();
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(peerId);
        }
      });

      peer.on('disconnected', () => {
        this.scheduleSignalingReconnect(peer);
      });

      peer.on('close', () => {
        if (this.transportClosed) return;
        for (const peerId of this.connections.keys()) {
          this.notifyDisconnectHandlers(peerId);
        }
      });

      peer.on('error', (error) => {
        if (!settled) {
          const type = errorType(error);
          const message =
            type === 'unavailable-id'
              ? 'Raum "' + this.roomCode + '" wird bereits gehostet.'
              : 'Netzwerkfehler beim Erstellen von Raum "' +
                this.roomCode +
                '": ' +
                errorMessage(error);
          fail(new Error(message));
        }
      });
    });
  }

  public async initClient(
    roomCode: string,
    name: string,
    preferredColor: PlayerColor
  ): Promise<string> {
    this.prepareForInitialization();
    this.isHost = false;
    this.roomCode = normalizeRoomCode(roomCode);
    this.hostId = getHostPeerId(this.roomCode);

    const { Peer: PeerConstructor } = await import('peerjs');
    const peer = new PeerConstructor({ debug: 1 });
    this.peer = peer;

    return new Promise<string>((resolve, reject) => {
      this.clientInitResolve = resolve;
      this.clientInitReject = reject;
      this.clientJoinTimeout = setTimeout(() => {
        this.failClientInitialization(
          new Error('Raum "' + this.roomCode + '" wurde nicht gefunden oder antwortet nicht.')
        );
      }, CONNECTION_TIMEOUT_MS);

      peer.on('open', (peerId) => {
        if (!peerId) {
          this.failClientInitialization(new Error('Der Netzwerkdienst lieferte keine Spieler-ID.'));
          return;
        }

        this.localPlayerId = peerId;
        this.handleSignalingOpen();

        if (!this.hostConnection) {
          const connection = peer.connect(this.hostId, {
            label: 'nebula-deception-v1',
            metadata: { protocol: PROTOCOL_VERSION },
            serialization: 'json',
            reliable: true,
          });
          this.attachClientConnection(connection, name, preferredColor);
        }
      });

      peer.on('connection', (connection) => {
        this.suppressedConnections.add(connection);
        connection.close();
      });

      peer.on('disconnected', () => {
        this.scheduleSignalingReconnect(peer);
      });

      peer.on('close', () => {
        if (this.transportClosed) return;
        if (!this.clientJoined) {
          this.failClientInitialization(new Error('Die Verbindung wurde vor dem Beitritt beendet.'));
        } else {
          this.notifyDisconnectHandlers(this.hostId);
        }
      });

      peer.on('error', (error) => {
        const type = errorType(error);
        if (!this.clientJoined) {
          const message =
            type === 'peer-unavailable'
              ? 'Raum "' + this.roomCode + '" wurde nicht gefunden oder der Host ist offline.'
              : 'Verbindungsfehler zu Raum "' + this.roomCode + '": ' + errorMessage(error);
          this.failClientInitialization(new Error(message));
        }
      });
    });
  }

  public onMessage(handler: NetworkEventHandler): () => void {
    this.messageHandlers.add(handler);

    if (this.pendingMessages.length > 0) {
      const queuedMessages = this.pendingMessages.splice(0);
      for (const queued of queuedMessages) {
        this.deliverMessage(queued.message, queued.senderId);
      }
    }

    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onDisconnect(handler: (peerId: string) => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  public onConnect(handler: (peerId: string) => void): () => void {
    this.connectHandlers.add(handler);
    return () => {
      this.connectHandlers.delete(handler);
    };
  }

  public broadcast(message: NetworkMessage, excludePeerId?: string): void {
    if (!this.isHost || this.transportClosed) return;

    for (const [peerId, connection] of this.connections) {
      if (peerId === excludePeerId || !this.acceptedPeerIds.has(peerId)) continue;
      this.sendEnvelope(connection, projectMessageForRecipient(message, peerId));
    }
  }

  public sendToPeer(peerId: string, message: NetworkMessage): void {
    if (!this.isHost || this.transportClosed) return;

    const connection = this.connections.get(peerId);
    if (!connection) return;

    const isHandshakeResponse = message.type === 'JOIN_ACCEPTED' || message.type === 'JOIN_REJECTED';
    if (!isHandshakeResponse && !this.acceptedPeerIds.has(peerId)) return;

    const sent = this.sendEnvelope(
      connection,
      projectMessageForRecipient(message, peerId)
    );

    if (message.type === 'JOIN_ACCEPTED' && message.playerId === peerId && sent) {
      this.acceptedPeerIds.add(peerId);
      this.clearHostHandshakeTimeout(peerId);
    } else if (message.type === 'JOIN_REJECTED') {
      this.acceptedPeerIds.delete(peerId);
      this.clearHostHandshakeTimeout(peerId);
    }
  }

  public sendToHost(message: NetworkMessage): void {
    if (this.transportClosed) return;

    if (this.isHost) {
      this.enqueueOrDeliver(bindClientIdentity(message, this.localPlayerId), this.localPlayerId);
      return;
    }

    if (!CLIENT_TO_HOST_TYPES.has(message.type)) return;
    if (!this.hostConnection?.open) return;
    this.sendEnvelope(this.hostConnection, message);
  }

  public destroy(): void {
    this.teardownTransport(new Error('Die Netzwerkverbindung wurde geschlossen.'));
    this.messageHandlers.clear();
    this.disconnectHandlers.clear();
    this.connectHandlers.clear();
    this.pendingMessages = [];
    this.localPlayerId = '';
    this.hostId = '';
    this.roomCode = '';
    this.isHost = false;
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

  private prepareForInitialization(): void {
    this.teardownTransport(new Error('Die vorherige Netzwerkverbindung wurde ersetzt.'));
    this.transportClosed = false;
    this.clientJoined = false;
    this.pendingMessages = [];
    this.notifiedDisconnects.clear();
    this.rateLimits.clear();
    this.acceptedPeerIds.clear();
    this.clearAllHostHandshakeTimeouts();
    this.signalReconnectAttempts = 0;
  }

  private attachHostConnection(connection: DataConnection): void {
    if (this.transportClosed || !this.isHost || !connection.peer) {
      this.suppressedConnections.add(connection);
      connection.close();
      return;
    }

    const existing = this.connections.get(connection.peer);
    if (!existing && this.connections.size >= MAX_HOST_CONNECTIONS) {
      this.suppressedConnections.add(connection);
      connection.close();
      return;
    }

    if (existing && existing !== connection) {
      this.suppressedConnections.add(existing);
      existing.close();
    }

    this.clearHostHandshakeTimeout(connection.peer);
    this.acceptedPeerIds.delete(connection.peer);
    this.connections.set(connection.peer, connection);
    this.hostHandshakeTimeouts.set(
      connection.peer,
      setTimeout(() => {
        if (
          this.connections.get(connection.peer) === connection
          && !this.acceptedPeerIds.has(connection.peer)
        ) {
          this.suppressedConnections.add(connection);
          connection.close();
        }
      }, JOIN_HANDSHAKE_TIMEOUT_MS),
    );
    let opened = false;

    const handleOpen = () => {
      if (opened || this.transportClosed) return;
      opened = true;
      this.notifiedDisconnects.delete(connection.peer);
      this.notifyConnectHandlers(connection.peer);
    };

    connection.on('open', handleOpen);
    connection.on('data', (data) => {
      this.handleHostData(connection, data);
    });
    connection.on('close', () => {
      const isCurrentConnection = this.connections.get(connection.peer) === connection;
      if (isCurrentConnection) {
        this.connections.delete(connection.peer);
        this.acceptedPeerIds.delete(connection.peer);
        this.clearHostHandshakeTimeout(connection.peer);
      }

      if (
        opened &&
        isCurrentConnection &&
        !this.transportClosed &&
        !this.suppressedConnections.has(connection)
      ) {
        this.notifyDisconnectHandlers(connection.peer);
      }
    });
    connection.on('error', () => {
      if (!connection.open) connection.close();
    });

    if (connection.open) queueMicrotask(handleOpen);
  }

  private attachClientConnection(
    connection: DataConnection,
    name: string,
    preferredColor: PlayerColor
  ): void {
    if (this.transportClosed || connection.peer !== this.hostId) {
      this.suppressedConnections.add(connection);
      connection.close();
      return;
    }

    if (this.hostConnection && this.hostConnection !== connection) {
      this.suppressedConnections.add(this.hostConnection);
      this.hostConnection.close();
    }

    this.hostConnection = connection;
    let opened = false;

    const handleOpen = () => {
      if (opened || this.transportClosed) return;
      opened = true;
      this.notifiedDisconnects.delete(this.hostId);
      this.notifyConnectHandlers(this.hostId);

      if (!this.clientJoined && !this.joinRequestsSent.has(connection)) {
        this.joinRequestsSent.add(connection);
        const sent = this.sendEnvelope(connection, {
          type: 'JOIN_REQUEST',
          name,
          preferredColor,
        });
        if (!sent) {
          this.failClientInitialization(new Error('Die Beitrittsanfrage konnte nicht gesendet werden.'));
        }
      }
    };

    connection.on('open', handleOpen);
    connection.on('data', (data) => {
      this.handleClientData(connection, data);
    });
    connection.on('close', () => {
      if (this.hostConnection === connection) {
        this.hostConnection = null;
      }

      if (this.transportClosed || this.suppressedConnections.has(connection)) return;

      if (!this.clientJoined) {
        this.failClientInitialization(
          new Error('Raum "' + this.roomCode + '" wurde nicht gefunden oder der Host ist offline.')
        );
      } else {
        this.notifyDisconnectHandlers(this.hostId);
      }
    });
    connection.on('error', (error) => {
      if (!this.clientJoined) {
        this.failClientInitialization(
          new Error('Die WebRTC-Verbindung ist fehlgeschlagen: ' + errorMessage(error))
        );
      }
    });

    if (connection.open) queueMicrotask(handleOpen);
  }

  private handleHostData(connection: DataConnection, data: unknown): void {
    if (
      this.transportClosed ||
      !this.isHost ||
      this.connections.get(connection.peer) !== connection
    ) {
      return;
    }

    if (!this.allowHostMessage(connection.peer)) {
      connection.close();
      return;
    }

    const byteLength = jsonByteLength(data);
    if (byteLength === null || byteLength > MAX_MESSAGE_BYTES) {
      connection.close();
      return;
    }

    const message = decodeEnvelope(data);
    if (!message || !CLIENT_TO_HOST_TYPES.has(message.type)) return;

    if (message.type === 'JOIN_REQUEST') {
      if (this.joinRequestsSeen.has(connection)) return;
      this.joinRequestsSeen.add(connection);
    } else if (!this.acceptedPeerIds.has(connection.peer)) {
      return;
    }

    this.enqueueOrDeliver(bindClientIdentity(message, connection.peer), connection.peer);
  }

  private handleClientData(connection: DataConnection, data: unknown): void {
    if (
      this.transportClosed ||
      this.isHost ||
      this.hostConnection !== connection ||
      connection.peer !== this.hostId
    ) {
      return;
    }

    const byteLength = jsonByteLength(data);
    if (byteLength === null || byteLength > MAX_MESSAGE_BYTES) {
      connection.close();
      return;
    }

    const message = decodeEnvelope(data);
    if (!message) return;

    if (message.type === 'JOIN_ACCEPTED') {
      if (message.playerId !== this.localPlayerId) return;
      this.clientJoined = true;
      this.resolveClientInitialization();
    } else if (message.type === 'JOIN_REJECTED') {
      this.rejectClientInitialization(new Error(message.reason || 'Beitritt abgelehnt.'));
    }

    this.enqueueOrDeliver(message, connection.peer);

    if (message.type === 'JOIN_REJECTED') {
      queueMicrotask(() => this.teardownTransport());
    }
  }

  private allowHostMessage(peerId: string): boolean {
    const now = Date.now();
    const current = this.rateLimits.get(peerId);

    if (!current || now - current.windowStartedAt >= 1_000) {
      this.rateLimits.set(peerId, { windowStartedAt: now, count: 1 });
      return true;
    }

    current.count += 1;
    return current.count <= HOST_MESSAGES_PER_SECOND;
  }

  private clearHostHandshakeTimeout(peerId: string): void {
    const timeout = this.hostHandshakeTimeouts.get(peerId);
    if (!timeout) return;
    clearTimeout(timeout);
    this.hostHandshakeTimeouts.delete(peerId);
  }

  private clearAllHostHandshakeTimeouts(): void {
    for (const timeout of this.hostHandshakeTimeouts.values()) clearTimeout(timeout);
    this.hostHandshakeTimeouts.clear();
  }

  private sendEnvelope(connection: DataConnection, message: NetworkMessage): boolean {
    if (!connection.open || !KNOWN_MESSAGE_TYPES.has(message.type)) return false;

    const envelope: WireEnvelope = {
      v: PROTOCOL_VERSION,
      message,
    };
    const byteLength = jsonByteLength(envelope);
    if (byteLength === null || byteLength > MAX_MESSAGE_BYTES) return false;

    try {
      const result = connection.send(envelope);
      if (result && typeof result.then === 'function') {
        void result.catch(() => undefined);
      }
      return true;
    } catch {
      return false;
    }
  }

  private enqueueOrDeliver(message: NetworkMessage, senderId: string): void {
    if (this.messageHandlers.size === 0) {
      if (this.pendingMessages.length >= MAX_PENDING_MESSAGES) {
        this.pendingMessages.shift();
      }
      this.pendingMessages.push({ message, senderId });
      return;
    }

    this.deliverMessage(message, senderId);
  }

  private deliverMessage(message: NetworkMessage, senderId: string): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message, senderId);
      } catch (error) {
        console.error('Netzwerk-Nachrichtenhandler fehlgeschlagen:', error);
      }
    }
  }

  private notifyDisconnectHandlers(peerId: string): void {
    if (!peerId || this.notifiedDisconnects.has(peerId)) return;
    this.notifiedDisconnects.add(peerId);

    for (const handler of this.disconnectHandlers) {
      try {
        handler(peerId);
      } catch (error) {
        console.error('Netzwerk-Trennungshandler fehlgeschlagen:', error);
      }
    }
  }

  private notifyConnectHandlers(peerId: string): void {
    if (!peerId) return;
    this.notifiedDisconnects.delete(peerId);

    for (const handler of this.connectHandlers) {
      try {
        handler(peerId);
      } catch (error) {
        console.error('Netzwerk-Verbindungshandler fehlgeschlagen:', error);
      }
    }
  }

  private resolveClientInitialization(): void {
    if (!this.clientInitResolve) return;

    const resolve = this.clientInitResolve;
    this.clearClientInitialization();
    resolve(this.localPlayerId);
  }

  private rejectClientInitialization(error: Error): void {
    if (!this.clientInitReject) return;

    const reject = this.clientInitReject;
    this.clearClientInitialization();
    reject(error);
  }

  private failClientInitialization(error: Error): void {
    if (!this.clientInitReject) return;
    this.rejectClientInitialization(error);
    queueMicrotask(() => this.teardownTransport());
  }

  private clearClientInitialization(): void {
    if (this.clientJoinTimeout) {
      clearTimeout(this.clientJoinTimeout);
      this.clientJoinTimeout = null;
    }
    this.clientInitResolve = null;
    this.clientInitReject = null;
  }

  private handleSignalingOpen(): void {
    this.signalReconnectAttempts = 0;
    if (this.signalReconnectTimeout) {
      clearTimeout(this.signalReconnectTimeout);
      this.signalReconnectTimeout = null;
    }
  }

  private scheduleSignalingReconnect(peer: Peer): void {
    if (
      this.transportClosed ||
      peer.destroyed ||
      !peer.disconnected ||
      this.signalReconnectTimeout ||
      this.signalReconnectAttempts >= SIGNAL_RECONNECT_LIMIT
    ) {
      return;
    }

    const delay = 400 * 2 ** this.signalReconnectAttempts;
    this.signalReconnectAttempts += 1;
    this.signalReconnectTimeout = setTimeout(() => {
      this.signalReconnectTimeout = null;
      if (this.transportClosed || peer.destroyed || !peer.disconnected) return;

      try {
        peer.reconnect();
      } catch {
        this.scheduleSignalingReconnect(peer);
      }
    }, delay);
  }

  private teardownTransport(reason?: Error): void {
    if (this.clientInitReject) {
      this.rejectClientInitialization(
        reason ?? new Error('Die Netzwerkverbindung wurde beendet.')
      );
    } else {
      this.clearClientInitialization();
    }

    this.transportClosed = true;
    this.clientJoined = false;

    if (this.signalReconnectTimeout) {
      clearTimeout(this.signalReconnectTimeout);
      this.signalReconnectTimeout = null;
    }

    for (const connection of this.connections.values()) {
      this.suppressedConnections.add(connection);
      connection.close();
    }
    this.connections.clear();

    if (this.hostConnection) {
      this.suppressedConnections.add(this.hostConnection);
      this.hostConnection.close();
      this.hostConnection = null;
    }

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }
    this.peer = null;

    this.rateLimits.clear();
    this.acceptedPeerIds.clear();
    this.clearAllHostHandshakeTimeouts();
    this.signalReconnectAttempts = 0;
  }
}
