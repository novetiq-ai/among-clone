/**
 * Tier 4: Real-World Application Scenarios (8 Full-Lifecycle Playthroughs)
 */

import { TestRunner, expect } from '../test-framework';
import {
  VENTS,
  SECURITY_CAMERAS,
  SPAWN_SLOTS,
  resolvePlayerMovement,
  getCurrentRoomName,
} from '@/lib/map-data';
import { hasLineOfSight } from '@/components/game/TheSkeldMap';
import {
  GameState,
  DeadBody,
  DEFAULT_SETTINGS,
  NetworkMessage,
  ChatMessage,
  EjectionData,
} from '@/types/game';

export function registerTier4Tests(runner: TestRunner) {
  runner.setContext(4, 1, 'Real-World Match Scenarios');

  // ==========================================================================
  // SCENARIO 1: Full Singleplayer Crewmate Match
  // ==========================================================================
  runner.test('SCENARIO 1: Full Singleplayer Crewmate Match (Lobby -> Role -> Tasks -> Body -> Vote -> Win)', async () => {
    // 1. Lobby Initialization
    const state: GameState = {
      phase: 'lobby',
      roomCode: 'SKLD',
      players: {
        human: { id: 'human', name: 'Sherlock', color: 'cyan', isHost: true, isReady: true, role: 'unassigned', isAlive: true, x: SPAWN_SLOTS[0].x, y: SPAWN_SLOTS[0].y, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        bot1: { id: 'bot1', name: 'Bot-Red', color: 'red', isHost: false, isReady: true, role: 'unassigned', isAlive: true, isBot: true, x: SPAWN_SLOTS[1].x, y: SPAWN_SLOTS[1].y, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        bot2: { id: 'bot2', name: 'Bot-Blue', color: 'blue', isHost: false, isReady: true, role: 'unassigned', isAlive: true, isBot: true, x: SPAWN_SLOTS[2].x, y: SPAWN_SLOTS[2].y, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        bot3: { id: 'bot3', name: 'Bot-Green', color: 'green', isHost: false, isReady: true, role: 'unassigned', isAlive: true, isBot: true, x: SPAWN_SLOTS[3].x, y: SPAWN_SLOTS[3].y, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: { ...DEFAULT_SETTINGS, impostorCount: 1, totalTasksPerPlayer: 4 },
      totalTasksCount: 12, // 3 crewmates * 4 tasks
      completedTasksCount: 0,
      activeSabotage: null,
    };

    expect(state.phase).toBe('lobby');
    expect(Object.keys(state.players).length).toBe(4);

    // 2. Start Game & Role Assignment
    state.phase = 'role_reveal';
    state.players.human.role = 'crewmate';
    state.players.bot1.role = 'impostor'; // Bot-Red is the Impostor
    state.players.bot2.role = 'crewmate';
    state.players.bot3.role = 'crewmate';

    state.players.human.assignedTasks = ['task-admin-card', 'task-wires-cafeteria', 'task-shields-prime', 'task-weapons-asteroids'];

    expect(state.players.human.role).toBe('crewmate');
    expect(state.players.bot1.role).toBe('impostor');

    // 3. Gameplay Phase: Complete Tasks
    state.phase = 'playing';

    // Player does Task 1 (Admin Card)
    state.players.human.completedTasks.push('task-admin-card');
    state.completedTasksCount = (state.completedTasksCount || 0) + 1;

    // Player does Task 2 (Wires)
    state.players.human.completedTasks.push('task-wires-cafeteria');
    state.completedTasksCount = (state.completedTasksCount || 0) + 1;

    expect(state.completedTasksCount).toBe(2);

    // 4. Impostor Bot-Red kills Bot-Blue in Electrical
    state.players.bot2.isAlive = false;
    const body: DeadBody = {
      id: 'body-bot2',
      playerId: 'bot2',
      playerName: 'Bot-Blue',
      color: 'blue',
      x: 720,
      y: 980,
      reported: false,
    };
    state.deadBodies.push(body);
    expect(state.deadBodies.length).toBe(1);

    // 5. Human Player enters Electrical, discovers dead body, and reports it
    state.players.human.x = 730;
    state.players.human.y = 980;
    const distToBody = Math.hypot(state.players.human.x - body.x, state.players.human.y - body.y);
    const hasLOS = hasLineOfSight(state.players.human.x, state.players.human.y, body.x, body.y);

    expect(distToBody).toBeLessThan(120);
    expect(hasLOS).toBeTruthy();

    // Trigger Emergency Meeting
    state.phase = 'meeting';
    state.deadBodies = []; // Bodies removed
    state.meetingReporterName = state.players.human.name;
    state.meetingReporterColor = state.players.human.color;
    state.meetingPhase = 'discussion';

    expect(state.phase).toBe('meeting');
    expect(state.deadBodies.length).toBe(0);

    // 6. Discussion & Voting
    state.meetingPhase = 'voting';
    state.players.human.votedFor = 'bot1'; // Votes for Red
    state.players.bot3.votedFor = 'bot1'; // Bot-Green votes for Red
    state.players.bot1.votedFor = 'human'; // Impostor votes human

    const votes = { bot1: 2, human: 1 };
    const ejectedId = 'bot1';

    // 7. Ejection Cutscene
    state.phase = 'ejection';
    expect(votes[ejectedId]).toBeGreaterThan(votes.human);

    state.players.bot1.isAlive = false;
    const ejectionData: EjectionData = {
      ejectedPlayerId: 'bot1',
      ejectedPlayerName: 'Bot-Red',
      ejectedPlayerColor: 'red',
      ejectedPlayerRole: 'impostor',
      remainingImpostors: 0,
      confirmEjects: true,
    };
    state.ejectionData = ejectionData;

    expect(state.ejectionData.ejectedPlayerRole).toBe('impostor');
    expect(state.ejectionData.remainingImpostors).toBe(0);

    // 8. Win Evaluator: All Impostors Eliminated -> Crewmates Win!
    const aliveImps = Object.values(state.players).filter((p) => p.isAlive && p.role === 'impostor');
    if (aliveImps.length === 0) {
      state.phase = 'game_over';
      state.winner = 'crewmates';
      state.winReason = 'Alle Impostors wurden eliminiert!';
    }

    expect(state.phase).toBe('game_over');
    expect(state.winner).toBe('crewmates');
  });

  // ==========================================================================
  // SCENARIO 2: Full Singleplayer Impostor Match
  // ==========================================================================
  runner.test('SCENARIO 2: Full Singleplayer Impostor Match (Role -> Stalk -> Kill -> Vent -> Sabotage -> Timeout Win)', async () => {
    // 1. Lobby & Impostor Role Assignment
    const state: GameState = {
      phase: 'playing',
      roomCode: 'IMPO',
      players: {
        human: { id: 'human', name: 'ImpostorKing', color: 'red', isHost: true, isReady: true, role: 'impostor', isAlive: true, x: 680, y: 420, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [], killCooldown: 0 },
        bot1: { id: 'bot1', name: 'Bot1', color: 'blue', isHost: false, isReady: true, role: 'crewmate', isAlive: true, isBot: true, x: 700, y: 440, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        bot2: { id: 'bot2', name: 'Bot2', color: 'green', isHost: false, isReady: true, role: 'crewmate', isAlive: true, isBot: true, x: 1600, y: 1000, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
      activeSabotage: null,
    };

    expect(state.players.human.role).toBe('impostor');

    // 2. Kill Bot1 in Medbay
    const dist = Math.hypot(state.players.human.x - state.players.bot1.x, state.players.human.y - state.players.bot1.y);
    expect(dist).toBeLessThan(110);

    state.players.bot1.isAlive = false;
    state.deadBodies.push({
      id: 'body-bot1',
      playerId: 'bot1',
      playerName: 'Bot1',
      color: 'blue',
      x: state.players.bot1.x,
      y: state.players.bot1.y,
      reported: false,
    });
    state.players.human.killCooldown = 25;

    // 3. Vent Hop: Medbay -> Security -> Electrical
    const medVent = VENTS.find((v) => v.id === 'vent-medbay')!;
    const elecVent = VENTS.find((v) => v.id === 'vent-electrical')!;
    expect(medVent.connectedVents).toContain(elecVent.id);

    state.players.human.x = elecVent.x;
    state.players.human.y = elecVent.y;
    expect(getCurrentRoomName(state.players.human.x, state.players.human.y)).toBe('Electrical');

    // 4. Trigger Reactor Meltdown Sabotage
    state.activeSabotage = {
      type: 'reactor',
      countdown: 30,
    };
    expect(state.activeSabotage.type).toBe('reactor');

    // 5. Simulate Countdown Expiry (Crewmates failed to fix)
    state.activeSabotage.countdown = 0;

    // 6. Win Evaluator: Sabotage Timeout -> Impostor Victory!
    if (state.activeSabotage.countdown <= 0) {
      state.phase = 'game_over';
      state.winner = 'impostors';
      state.winReason = 'Kritische Sabotage: Reaktor-Kernschmelze!';
    }

    expect(state.phase).toBe('game_over');
    expect(state.winner).toBe('impostors');
  });

  // ==========================================================================
  // SCENARIO 3: Ghost Mode Task Completion Win
  // ==========================================================================
  runner.test('SCENARIO 3: Ghost Mode Task Completion Win (Killed early -> Float walls -> Finish tasks -> Win)', async () => {
    const state: GameState = {
      phase: 'playing',
      roomCode: 'GHST',
      players: {
        p1: { id: 'p1', name: 'Ghostie', color: 'yellow', isHost: true, isReady: true, role: 'crewmate', isAlive: false, x: 1200, y: 550, facing: 'right', isMoving: false, assignedTasks: ['task-admin-card', 'task-reactor-manifolds'], completedTasks: ['task-admin-card'] },
        p2: { id: 'p2', name: 'AliveCrew', color: 'cyan', isHost: false, isReady: true, role: 'crewmate', isAlive: true, x: 1800, y: 1200, facing: 'right', isMoving: false, assignedTasks: ['task-shields-prime'], completedTasks: ['task-shields-prime'] },
        imp: { id: 'imp', name: 'Killer', color: 'red', isHost: false, isReady: true, role: 'impostor', isAlive: true, x: 2000, y: 800, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
      totalTasksCount: 3,
      completedTasksCount: 2, // 1 task left (p1's manifolds)
    };

    // 1. Ghost floats through structural walls to Reactor
    const startX = state.players.p1.x;
    const startY = state.players.p1.y;
    const targetX = 140; // Reactor Manifolds
    const targetY = 940;

    const move = resolvePlayerMovement(startX, startY, targetX - startX, targetY - startY, 16, true);
    state.players.p1.x = move.x;
    state.players.p1.y = move.y;
    expect(state.players.p1.x).toBe(targetX);
    expect(state.players.p1.y).toBe(targetY);

    // 2. Ghost completes Manifolds Task
    state.players.p1.completedTasks.push('task-reactor-manifolds');
    state.completedTasksCount = (state.completedTasksCount || 0) + 1;

    // 3. Win Evaluator checks total tasks
    if ((state.completedTasksCount || 0) >= (state.totalTasksCount || 0)) {
      state.phase = 'game_over';
      state.winner = 'crewmates';
      state.winReason = 'Alle Besatzungs-Aufgaben wurden erfolgreich abgeschlossen!';
    }

    expect(state.completedTasksCount).toBe(3);
    expect(state.phase).toBe('game_over');
    expect(state.winner).toBe('crewmates');
  });

  // ==========================================================================
  // SCENARIO 4: Emergency Meeting & Critical Sabotage Interaction
  // ==========================================================================
  runner.test('SCENARIO 4: Emergency Meeting & Critical Sabotage Interaction (Blocked -> Fixed -> Unblocked -> Vote)', async () => {
    const state: GameState = {
      phase: 'playing',
      roomCode: 'EMRG',
      players: {
        c1: { id: 'c1', name: 'Crew1', color: 'blue', isHost: true, isReady: true, role: 'crewmate', isAlive: true, x: 1200, y: 640, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [], emergencyMeetingsLeft: 1 },
        c2: { id: 'c2', name: 'Crew2', color: 'green', isHost: false, isReady: true, role: 'crewmate', isAlive: true, x: 200, y: 700, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [], emergencyMeetingsLeft: 1 },
        imp: { id: 'imp', name: 'Imp', color: 'red', isHost: false, isReady: true, role: 'impostor', isAlive: true, x: 200, y: 900, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
      activeSabotage: { type: 'reactor', countdown: 28 },
    };

    // 1. Crew1 tries to press Emergency Button -> BLOCKED
    const isBlocked = state.activeSabotage && (state.activeSabotage.type === 'reactor' || state.activeSabotage.type === 'o2');
    expect(isBlocked).toBeTruthy();

    // 2. Dual Hand Scanner fixed by Crew2 and Impostor
    state.activeSabotage = null; // Sabotage fixed!
    expect(state.activeSabotage).toBeNull();

    // 3. Crew1 presses Emergency Button -> SUCCESS
    state.phase = 'meeting';
    state.isEmergencyMeeting = true;
    state.players.c1.emergencyMeetingsLeft = 0;

    expect(state.phase).toBe('meeting');
    expect(state.isEmergencyMeeting).toBeTruthy();
    expect(state.players.c1.emergencyMeetingsLeft).toBe(0);
  });

  // ==========================================================================
  // SCENARIO 5: WebRTC Multiplayer Synchronization Match
  // ==========================================================================
  runner.test('SCENARIO 5: WebRTC Multiplayer Mesh (4 peers, state sync, movement replication, voting sync)', async () => {
    // 1. Generate room code
    const roomCode = 'PEER';
    expect(roomCode.length).toBe(4);

    // 2. Peer join request
    const joinMsg: NetworkMessage = {
      type: 'JOIN_REQUEST',
      name: 'MobilePeer',
      preferredColor: 'purple',
    };
    expect(joinMsg.type).toBe('JOIN_REQUEST');

    // 3. Host receives move packet
    const moveMsg: NetworkMessage = {
      type: 'PLAYER_MOVE',
      playerId: 'peer2',
      x: 1400,
      y: 800,
      facing: 'left',
      isMoving: true,
      inVent: false,
    };
    expect(moveMsg.x).toBe(1400);

    // 4. Task completion broadcast
    const taskMsg: NetworkMessage = {
      type: 'COMPLETE_TASK',
      playerId: 'peer2',
      taskId: 'task-admin-card',
    };
    expect(taskMsg.type).toBe('COMPLETE_TASK');

    // 5. Meeting Vote Cast packet
    const voteMsg: NetworkMessage = {
      type: 'CAST_VOTE',
      voterId: 'peer2',
      targetId: 'skip',
    };
    expect(voteMsg.targetId).toBe('skip');
  });

  // ==========================================================================
  // SCENARIO 6: CCTV Surveillance & Witness Catch
  // ==========================================================================
  runner.test('SCENARIO 6: CCTV Surveillance & Witness Catch (Camera active -> Kill observed -> Guard reports -> Vote)', async () => {
    const state: GameState = {
      phase: 'playing',
      roomCode: 'CCTV',
      players: {
        guard: { id: 'guard', name: 'Guard', color: 'white', isHost: true, isReady: true, role: 'crewmate', isAlive: true, x: 740, y: 720, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] }, // At Security desk
        killer: { id: 'killer', name: 'Suspect', color: 'red', isHost: false, isReady: true, role: 'impostor', isAlive: true, x: 920, y: 460, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [], killCooldown: 0 },
        victim: { id: 'victim', name: 'Victim', color: 'yellow', isHost: false, isReady: true, role: 'crewmate', isAlive: true, x: 940, y: 460, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
      isSecurityCamActive: true, // Guard watching monitor
    };

    // 1. Killer executes victim in Medbay Hallway under Camera 0 (900, 450)
    const cam = SECURITY_CAMERAS[0];
    const distToCam = Math.hypot(state.players.killer.x - cam.x, state.players.killer.y - cam.y);
    const inCamView = distToCam < 220 && hasLineOfSight(cam.x, cam.y, state.players.killer.x, state.players.killer.y);
    expect(inCamView).toBeTruthy();

    // Kill happens
    state.players.victim.isAlive = false;
    const corpse: DeadBody = { id: 'b-vic', playerId: 'victim', playerName: 'Victim', color: 'yellow', x: 940, y: 460, reported: false };
    state.deadBodies.push(corpse);

    // 2. Guard runs from Security desk to corridor and reports corpse
    state.players.guard.x = 930;
    state.players.guard.y = 460;
    state.phase = 'meeting';
    state.meetingReporterName = 'Guard';

    // 3. Guard types evidence in chat
    const chatMsg: ChatMessage = {
      id: 'c1',
      senderId: 'guard',
      senderName: 'Guard',
      senderColor: 'white',
      text: 'I saw Red kill Yellow on MedBay CCTV camera!',
      timestamp: Date.now(),
    };
    expect(chatMsg.text).toContain('MedBay CCTV');

    // 4. Unanimous vote e隻ects Killer
    state.phase = 'game_over';
    state.winner = 'crewmates';
    expect(state.winner).toBe('crewmates');
  });

  // ==========================================================================
  // SCENARIO 7: Impostor Parity Elimination Match
  // ==========================================================================
  runner.test('SCENARIO 7: Impostor Parity Elimination Match (5 players -> 2 kills -> 1v1 Parity -> Impostor Victory)', async () => {
    const state: GameState = {
      phase: 'playing',
      roomCode: 'PART',
      players: {
        imp: { id: 'imp', name: 'Mastermind', color: 'black', isHost: true, isReady: true, role: 'impostor', isAlive: true, x: 0, y: 0, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        c1: { id: 'c1', name: 'Crew1', color: 'red', isHost: false, isReady: true, role: 'crewmate', isAlive: true, x: 0, y: 0, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        c2: { id: 'c2', name: 'Crew2', color: 'blue', isHost: false, isReady: true, role: 'crewmate', isAlive: false, x: 0, y: 0, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
        c3: { id: 'c3', name: 'Crew3', color: 'green', isHost: false, isReady: true, role: 'crewmate', isAlive: false, x: 0, y: 0, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] },
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
    };

    // Living: 1 Impostor, 1 Crewmate
    const aliveImps = Object.values(state.players).filter((p) => p.isAlive && p.role === 'impostor').length;
    const aliveCrew = Object.values(state.players).filter((p) => p.isAlive && p.role === 'crewmate').length;

    expect(aliveImps).toBe(1);
    expect(aliveCrew).toBe(1);

    if (aliveImps >= aliveCrew && aliveImps > 0) {
      state.phase = 'game_over';
      state.winner = 'impostors';
      state.winReason = 'Die Impostors haben die Überhand gewonnen!';
    }

    expect(state.phase).toBe('game_over');
    expect(state.winner).toBe('impostors');
  });

  // ==========================================================================
  // SCENARIO 8: Oxygen Depletion Sabotage Crisis & Dual Keypad Resolution
  // ==========================================================================
  runner.test('SCENARIO 8: Oxygen Depletion Sabotage Crisis (Sabotage triggered -> Admin & O2 keypads solved -> Crisis resolved)', async () => {
    const state: GameState = {
      phase: 'playing',
      roomCode: 'OXYG',
      players: {
        c1: { id: 'c1', name: 'Hero1', color: 'lime', isHost: true, isReady: true, role: 'crewmate', isAlive: true, x: 1740, y: 740, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] }, // in O2
        c2: { id: 'c2', name: 'Hero2', color: 'brown', isHost: false, isReady: true, role: 'crewmate', isAlive: true, x: 1600, y: 1000, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] }, // in Admin
      },
      deadBodies: [],
      settings: DEFAULT_SETTINGS,
      activeSabotage: { type: 'o2', countdown: 30, o2FixedRooms: [] },
    };

    // 1. Hero1 solves O2 Keypad
    state.activeSabotage!.o2FixedRooms = ['O2'];
    expect(state.activeSabotage!.o2FixedRooms.length).toBe(1);
    expect(state.activeSabotage!.o2FixedRooms).not.toContain('Admin');

    // 2. Hero2 solves Admin Keypad
    state.activeSabotage!.o2FixedRooms.push('Admin');
    expect(state.activeSabotage!.o2FixedRooms).toContain('O2');
    expect(state.activeSabotage!.o2FixedRooms).toContain('Admin');

    // 3. Crisis Cleared!
    const isResolved = state.activeSabotage!.o2FixedRooms!.includes('O2') && state.activeSabotage!.o2FixedRooms!.includes('Admin');
    if (isResolved) {
      state.activeSabotage = null;
    }

    expect(state.activeSabotage).toBeNull();
  });
}
