export type PlayerRole = 'crewmate' | 'impostor' | 'unassigned';

export type PlayerColor = 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'pink' 
  | 'orange' 
  | 'yellow' 
  | 'black' 
  | 'white' 
  | 'purple' 
  | 'cyan' 
  | 'lime' 
  | 'brown';

export interface PlayerColorInfo {
  id: PlayerColor;
  name: string;
  hex: string;
  shadow: string;
  visor: string;
}

export const PLAYER_COLORS: PlayerColorInfo[] = [
  { id: 'red', name: 'Rot', hex: '#c51111', shadow: '#7a0838', visor: '#99d9ea' },
  { id: 'blue', name: 'Blau', hex: '#132ed1', shadow: '#09158e', visor: '#99d9ea' },
  { id: 'green', name: 'Grün', hex: '#117f2d', shadow: '#0a4d1a', visor: '#99d9ea' },
  { id: 'pink', name: 'Pink', hex: '#ed54ba', shadow: '#ab2bad', visor: '#99d9ea' },
  { id: 'orange', name: 'Orange', hex: '#ef7d0d', shadow: '#b33e15', visor: '#99d9ea' },
  { id: 'yellow', name: 'Gelb', hex: '#f5f557', shadow: '#c2870f', visor: '#99d9ea' },
  { id: 'black', name: 'Schwarz', hex: '#3f474e', shadow: '#1e1f26', visor: '#99d9ea' },
  { id: 'white', name: 'Weiß', hex: '#d6e0f0', shadow: '#8394bf', visor: '#99d9ea' },
  { id: 'purple', name: 'Lila', hex: '#6b2fbb', shadow: '#3b177c', visor: '#99d9ea' },
  { id: 'cyan', name: 'Cyan', hex: '#38fedc', shadow: '#24a8be', visor: '#99d9ea' },
  { id: 'lime', name: 'Lime', hex: '#50ef39', shadow: '#15a722', visor: '#99d9ea' },
  { id: 'brown', name: 'Braun', hex: '#71491e', shadow: '#46270d', visor: '#99d9ea' },
];

export type TaskType = 
  | 'wires' 
  | 'swipe_card' 
  | 'manifolds' 
  | 'medbay_scan' 
  | 'divert_power' 
  | 'download_data'
  | 'prime_shields'
  | 'clear_asteroids'
  | 'calibrate_distributor'
  | 'clean_o2_filter'
  | 'chart_course'
  | 'align_engine'
  | 'empty_garbage'
  | 'start_reactor'
  | 'inspect_sample'
  | 'refuel_engines';

export interface TaskDefinition {
  id: string;
  type: TaskType;
  name: string;
  room: string;
  x: number;
  y: number;
  duration?: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
  role: PlayerRole;
  isAlive: boolean;
  x: number;
  y: number;
  facing: 'left' | 'right';
  isMoving: boolean;
  assignedTasks: string[]; // List of task IDs
  completedTasks: string[]; // List of completed task IDs
  votedFor?: string | 'skip' | null;
  hasVoted?: boolean;
  killCooldown?: number;
  inVent?: boolean;
  ventId?: string;
  isBot?: boolean;
}

export interface DeadBody {
  id: string;
  playerId: string;
  playerName: string;
  color: PlayerColor;
  x: number;
  y: number;
  reported: boolean;
}

export interface VentDefinition {
  id: string;
  room: string;
  x: number;
  y: number;
  connectedVents: string[];
}

export interface GameSettings {
  maxPlayers: number;
  impostorCount: number;
  playerSpeed: number; // e.g. 1.0, 1.25, 1.5
  killCooldown: number; // in seconds
  emergencyMeetings: number;
  discussionTime: number; // in seconds
  votingTime: number; // in seconds
  totalTasksPerPlayer: number;
  anonymousVotes: boolean;
  botCount: number; // for solo / quick play
}

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  impostorCount: 1,
  playerSpeed: 1.25,
  killCooldown: 25,
  emergencyMeetings: 1,
  discussionTime: 10,
  votingTime: 30,
  totalTasksPerPlayer: 4,
  anonymousVotes: false,
  botCount: 4,
};

export type GamePhase = 
  | 'lobby' 
  | 'role_reveal' 
  | 'playing' 
  | 'meeting' 
  | 'ejection' 
  | 'game_over';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PlayerColor;
  text: string;
  timestamp: number;
  isDeadOnly?: boolean;
  isSystem?: boolean;
}

export interface EjectionData {
  ejectedPlayerId?: string | null;
  ejectedPlayerName?: string;
  ejectedPlayerColor?: PlayerColor;
  ejectedPlayerRole?: PlayerRole;
  wasTie?: boolean;
  wasSkipped?: boolean;
  remainingImpostors: number;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Record<string, Player>;
  deadBodies: DeadBody[];
  settings: GameSettings;
  winner?: 'crewmates' | 'impostors';
  winReason?: string;
  meetingReporterName?: string;
  meetingReporterColor?: PlayerColor;
  isEmergencyMeeting?: boolean;
  meetingTimer?: number;
  meetingPhase?: 'discussion' | 'voting' | 'results';
  ejectionData?: EjectionData;
  totalTasksCount?: number;
  completedTasksCount?: number;
}

// Network Message Types
export type NetworkMessage =
  | { type: 'JOIN_REQUEST'; name: string; preferredColor: PlayerColor }
  | { type: 'JOIN_ACCEPTED'; playerId: string; gameState: GameState }
  | { type: 'JOIN_REJECTED'; reason: string }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_UPDATE_PROFILE'; name?: string; color?: PlayerColor; isReady?: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'STATE_SYNC'; gameState: GameState }
  | { type: 'PLAYER_MOVE'; playerId: string; x: number; y: number; facing: 'left' | 'right'; isMoving: boolean; inVent?: boolean; ventId?: string }
  | { type: 'START_GAME' }
  | { type: 'KILL_PLAYER'; killerId: string; targetId: string; x: number; y: number }
  | { type: 'REPORT_BODY'; reporterId: string; bodyId?: string }
  | { type: 'EMERGENCY_MEETING'; reporterId: string }
  | { type: 'CAST_VOTE'; voterId: string; targetId: string | 'skip' }
  | { type: 'COMPLETE_TASK'; playerId: string; taskId: string }
  | { type: 'VENT_ACTION'; playerId: string; ventId: string; action: 'enter' | 'exit' | 'travel'; targetVentId?: string }
  | { type: 'PLAY_AGAIN' };
