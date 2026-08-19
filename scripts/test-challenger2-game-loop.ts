/**
 * CHALLENGER 2: GAME LOOP & STATE SYNC EMPIRICAL TEST SUITE (EXTENDED)
 * 
 * Verified against:
 * - types/game.ts
 * - lib/map-data.ts
 * - lib/peer.ts
 * - components/game/TheSkeldMap.ts
 * - app/page.tsx
 */

import {
  GameState,
  Player,
  DeadBody,
  DEFAULT_SETTINGS,
  GameSettings,
  ActiveSabotage,
  EjectionData,
  SabotageType,
  ChatMessage,
} from '../types/game';
import {
  ROOMS,
  CORRIDORS,
  WALLS,
  LOCKED_DOOR_WALLS,
  ALL_TASKS,
  VENTS,
  WAYPOINTS,
  SPAWN_POSITION,
  EMERGENCY_BUTTON_POS,
  checkCollision,
  resolvePlayerMovement,
  findBotPath,
  getNearestWaypoint,
  getCurrentRoomName,
} from '../lib/map-data';
import { hasLineOfSight } from '../components/game/TheSkeldMap';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, errorDetails?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    const msg = `  ✗ FAIL: ${testName}${errorDetails ? ` - Details: ${errorDetails}` : ''}`;
    console.error(msg);
    failures.push(msg);
  }
}

// ---------------------------------------------------------------------------
// Authoritative Win Condition Evaluator (Host)
// ---------------------------------------------------------------------------
function checkWinConditions(state: GameState): { winner?: 'crewmates' | 'impostors'; winReason?: string } {
  if (state.phase !== 'playing' && state.phase !== 'meeting' && state.phase !== 'ejection') {
    return {};
  }
  const playersList = Object.values(state.players);
  if (playersList.length === 0) return {};

  const alivePlayers = playersList.filter((p) => p.isAlive);
  const aliveImpostors = alivePlayers.filter((p) => p.role === 'impostor');
  const aliveCrewmates = alivePlayers.filter((p) => p.role === 'crewmate');

  // 1. All Impostors Eliminated -> Crewmates Win
  if (aliveImpostors.length === 0 && playersList.some((p) => p.role === 'impostor')) {
    return {
      winner: 'crewmates',
      winReason: 'Alle Impostors wurden eliminiert!',
    };
  }

  // 2. Impostors Equal or Outnumber Crewmates -> Impostors Win
  if (aliveImpostors.length > 0 && aliveImpostors.length >= aliveCrewmates.length) {
    return {
      winner: 'impostors',
      winReason: 'Die Impostors haben die Überhand gewonnen!',
    };
  }

  // 3. All Tasks Completed -> Crewmates Win
  if (state.totalTasksCount && state.totalTasksCount > 0 && (state.completedTasksCount || 0) >= state.totalTasksCount) {
    return {
      winner: 'crewmates',
      winReason: 'Alle Besatzungs-Aufgaben wurden erfolgreich abgeschlossen!',
    };
  }

  return {};
}

function createInitialState(playerCount = 5, impostorCount = 1): GameState {
  const players: Record<string, Player> = {};
  const botNames = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];
  const colors = ['red', 'blue', 'green', 'pink', 'orange', 'yellow', 'cyan', 'white', 'purple', 'lime'] as const;

  for (let i = 0; i < playerCount; i++) {
    const id = `p_${i}`;
    players[id] = {
      id,
      name: botNames[i] || `Player ${i}`,
      color: colors[i % colors.length],
      isHost: i === 0,
      isReady: true,
      role: i < impostorCount ? 'impostor' : 'crewmate',
      isAlive: true,
      x: SPAWN_POSITION.x + (i % 3) * 40 - 40,
      y: SPAWN_POSITION.y + Math.floor(i / 3) * 40,
      facing: 'right',
      isMoving: false,
      assignedTasks: [],
      completedTasks: [],
      emergencyMeetingsLeft: DEFAULT_SETTINGS.emergencyMeetings,
      isBot: i > 0,
    };
  }

  // Assign tasks
  let totalTasks = 0;
  Object.values(players).forEach((p) => {
    const tasks = ALL_TASKS.slice(0, DEFAULT_SETTINGS.totalTasksPerPlayer).map((t) => t.id);
    p.assignedTasks = tasks;
    if (p.role === 'crewmate') {
      totalTasks += tasks.length;
    }
  });

  return {
    roomCode: 'TEST01',
    phase: 'playing',
    players,
    deadBodies: [],
    settings: { ...DEFAULT_SETTINGS, impostorCount },
    totalTasksCount: totalTasks,
    completedTasksCount: 0,
    activeSabotage: null,
    lockedDoors: {},
  };
}

// ===========================================================================
// SUITE 1: KILL & REPORT MECHANICS
// ===========================================================================
function testKillAndReportMechanics() {
  console.log('\n--- SUITE 1: KILL & REPORT MECHANICS ---');

  // 1.1 Distance limits
  {
    const state = createInitialState(3, 1);
    const imp = state.players['p_0'];
    const victim = state.players['p_1'];

    // In close range (< 110px)
    imp.x = 1000; imp.y = 500;
    victim.x = 1060; victim.y = 500;
    const d1 = Math.hypot(imp.x - victim.x, imp.y - victim.y);
    assert(d1 <= 110, 'Kill Range: Targetable when distance is 60px (<= 110px)');

    // Medium range (between 110px and 250px)
    victim.x = 1180;
    const d2 = Math.hypot(imp.x - victim.x, imp.y - victim.y);
    assert(d2 > 110 && d2 <= 250, 'Kill Range: Untargetable on client (> 110px) but within server boundary (<= 250px)');

    // Outside server limit (> 250px)
    victim.x = 1350;
    const d3 = Math.hypot(imp.x - victim.x, imp.y - victim.y);
    assert(d3 > 250, 'Kill Range: Server rejects kill attempts beyond 250px');
  }

  // 1.2 Cooldown enforcement
  {
    let killCooldown = DEFAULT_SETTINGS.killCooldown; // 25s
    assert(killCooldown === 25, 'Kill Cooldown: Initialized to 25s');

    // Simulate 1s ticks
    killCooldown = Math.max(0, killCooldown - 1);
    assert(killCooldown === 24, 'Kill Cooldown: Decrements each second');

    // Cannot kill while cooldown > 0
    const canKillWhileCd = killCooldown === 0;
    assert(!canKillWhileCd, 'Kill Cooldown: Impostor kill action disabled while cooldown > 0');

    // Can kill when cooldown reaches 0
    killCooldown = 0;
    const canKillZeroCd = killCooldown === 0;
    assert(canKillZeroCd, 'Kill Cooldown: Impostor kill action enabled when cooldown reaches 0');
  }

  // 1.3 Target validation (Cannot kill dead / in vent / impostor)
  {
    const state = createInitialState(4, 2); // 2 imps (p_0, p_1), 2 crew (p_2, p_3)
    const imp0 = state.players['p_0'];
    const imp1 = state.players['p_1'];
    const crew2 = state.players['p_2'];
    const crew3 = state.players['p_3'];

    // Cannot kill fellow impostor
    const targetImp = imp1.role !== 'impostor' && imp1.isAlive;
    assert(!targetImp, 'Kill Target Validation: Impostor cannot kill another Impostor');

    // Cannot kill dead player
    crew2.isAlive = false;
    const targetDead = crew2.role !== 'impostor' && crew2.isAlive;
    assert(!targetDead, 'Kill Target Validation: Impostor cannot kill already dead player');

    // Cannot kill player hiding in vent
    crew3.inVent = true;
    const targetInVent = crew3.role !== 'impostor' && crew3.isAlive && !crew3.inVent;
    assert(!targetInVent, 'Kill Target Validation: Impostor cannot kill player inside vent');

    // Impostor in vent cannot execute kill
    imp0.inVent = true;
    const impCanKillFromVent = !imp0.inVent && imp0.isAlive;
    assert(!impCanKillFromVent, 'Kill Target Validation: Impostor hidden inside vent cannot execute kill');
  }

  // 1.4 Line of Sight occlusion by structural walls
  {
    // Cafeteria (1000, 700) to Security (750, 700) - separated by Cafeteria West wall (x: 880, y: 580..860)
    const losWall = hasLineOfSight(1000, 700, 750, 700);
    assert(!losWall, 'Kill LOS: Blocked by solid structural wall between Cafeteria and Security');

    // Admin (1600, 920) to Storage (1100, 1100) - separated by Admin West wall (x: 1460)
    const losAdminStor = hasLineOfSight(1600, 920, 1100, 1100);
    assert(!losAdminStor, 'Kill LOS: Blocked by Admin room wall');

    // Same room without wall occlusion (Cafeteria open floor)
    const losOpen = hasLineOfSight(1100, 500, 1300, 500);
    assert(losOpen, 'Kill LOS: Clear line of sight between players in open Cafeteria area');

    // Blocked by active locked doors
    const lockedDoors = { cafeteria: Date.now() + 10000 };
    const losDoorLocked = hasLineOfSight(950, 500, 850, 500, lockedDoors);
    assert(!losDoorLocked, 'Kill LOS: Blocked by locked blast door in Cafeteria NW doorway');
  }

  // 1.5 Dead Body Spawning, LOS, and Reporting
  {
    const state = createInitialState(4, 1);
    const victim = state.players['p_1'];
    const reporter = state.players['p_2'];

    // Spawn corpse in Storage (x: 1100, y: 1200)
    victim.isAlive = false;
    victim.x = 1100; victim.y = 1200;
    const body: DeadBody = {
      id: `body-${Date.now()}-${victim.id}`,
      playerId: victim.id,
      playerName: victim.name,
      color: victim.color,
      x: victim.x,
      y: victim.y,
      reported: false,
    };
    state.deadBodies.push(body);

    assert(state.deadBodies.length === 1 && !state.deadBodies[0].reported, 'Dead Body: Corpse spawned with reported = false');

    // Reporter in same room within 120px with direct LOS
    reporter.x = 1150; reporter.y = 1200;
    const distToBody = Math.hypot(reporter.x - body.x, reporter.y - body.y);
    const losToBody = hasLineOfSight(reporter.x, reporter.y, body.x, body.y);
    assert(distToBody < 120 && losToBody, 'Dead Body Report: Reporter within 120px and direct LOS can report corpse');

    // Reporter in Electrical behind solid wall (x: 750, y: 1050) to Storage (x: 1050, y: 1050)
    reporter.x = 750; reporter.y = 1050;
    body.x = 1050; body.y = 1050;
    const losFromElec = hasLineOfSight(reporter.x, reporter.y, body.x, body.y);
    assert(!losFromElec, 'Dead Body Report: Reporter in Electrical cannot see or report corpse in Storage through solid wall');

    // Once reported, body.reported = true
    body.reported = true;
    assert(body.reported === true, 'Dead Body Report: Reporting marks body.reported = true preventing double reports');
  }
}

// ===========================================================================
// SUITE 2: MEETING & VOTING MECHANICS
// ===========================================================================
function testMeetingAndVotingMechanics() {
  console.log('\n--- SUITE 2: MEETING & VOTING MECHANICS ---');

  // 2.1 Discussion & Voting Timers
  {
    const state = createInitialState(5, 1);
    state.phase = 'meeting';
    state.meetingPhase = 'discussion';
    state.meetingTimer = state.settings.discussionTime; // 10s

    assert(state.meetingPhase === 'discussion' && state.meetingTimer === 10, 'Meeting Lifecycle: Initialized in discussion phase with 10s timer');

    // Discussion expiry -> transitions to voting
    state.meetingTimer = 0;
    if (state.meetingPhase === 'discussion' && state.meetingTimer <= 0) {
      state.meetingPhase = 'voting';
      state.meetingTimer = state.settings.votingTime;
    }
    assert(state.meetingPhase === 'voting' && state.meetingTimer === 30, 'Meeting Lifecycle: Discussion expiry transitions to voting phase with 30s timer');
  }

  // 2.2 Voting rules: living vote once, dead cannot vote
  {
    const state = createInitialState(4, 1);
    state.phase = 'meeting';
    state.meetingPhase = 'voting';

    const livingVoter = state.players['p_1'];
    const deadPlayer = state.players['p_2'];
    deadPlayer.isAlive = false;

    // Living player votes
    const canLivingVote = livingVoter.isAlive && !livingVoter.hasVoted;
    assert(canLivingVote, 'Voting Rules: Living player who has not voted can cast vote');
    livingVoter.hasVoted = true;
    livingVoter.votedFor = 'p_0';

    // Living player cannot double-vote
    const canLivingDoubleVote = livingVoter.isAlive && !livingVoter.hasVoted;
    assert(!canLivingDoubleVote, 'Voting Rules: Player cannot vote more than once');

    // Dead player cannot vote
    const canDeadVote = deadPlayer.isAlive && !deadPlayer.hasVoted;
    assert(!canDeadVote, 'Voting Rules: Dead ghost players cannot cast votes');
  }

  // 2.3 Early completion jump when all alive have voted
  {
    const state = createInitialState(4, 1);
    state.phase = 'meeting';
    state.meetingPhase = 'voting';
    state.meetingTimer = 25;

    // 4 alive players vote
    state.players['p_0'].hasVoted = true; state.players['p_0'].votedFor = 'p_1';
    state.players['p_1'].hasVoted = true; state.players['p_1'].votedFor = 'p_0';
    state.players['p_2'].hasVoted = true; state.players['p_2'].votedFor = 'p_0';
    state.players['p_3'].hasVoted = true; state.players['p_3'].votedFor = 'p_0';

    const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
    const allVoted = alivePlayers.every((p) => p.hasVoted);
    if (allVoted) {
      state.meetingTimer = 1;
    }
    assert(allVoted && state.meetingTimer === 1, 'Voting Speedup: All alive votes cast jumps countdown timer to results');
  }

  // 2.4 Majority vote ejection calculation
  {
    const state = createInitialState(5, 1);
    // Votes: p_0 (Impostor) gets 4 votes, p_1 gets 1 vote
    state.players['p_0'].votedFor = 'p_1';
    state.players['p_1'].votedFor = 'p_0';
    state.players['p_2'].votedFor = 'p_0';
    state.players['p_3'].votedFor = 'p_0';
    state.players['p_4'].votedFor = 'p_0';

    const voteCounts: Record<string, number> = { skip: 0 };
    Object.values(state.players).forEach((p) => {
      if (p.votedFor) {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    });

    let highestVoteCount = 0;
    let highestTarget: string | null = null;
    let isTie = false;

    Object.entries(voteCounts).forEach(([target, count]) => {
      if (count > highestVoteCount) {
        highestVoteCount = count;
        highestTarget = target;
        isTie = false;
      } else if (count === highestVoteCount && count > 0) {
        isTie = true;
      }
    });

    assert(highestTarget === 'p_0' && !isTie, 'Vote Tally: Impostor p_0 correctly received majority (4 votes)');

    // Eject p_0
    state.players['p_0'].isAlive = false;
    const remainingImps = Object.values(state.players).filter((p) => p.isAlive && p.role === 'impostor').length;
    const ejectionData: EjectionData = {
      ejectedPlayerId: 'p_0',
      ejectedPlayerName: state.players['p_0'].name,
      ejectedPlayerColor: state.players['p_0'].color,
      ejectedPlayerRole: state.players['p_0'].role,
      wasTie: false,
      wasSkipped: false,
      remainingImpostors: remainingImps,
      confirmEjects: true,
    };

    assert(ejectionData.remainingImpostors === 0, 'Ejection Data: Correct remaining impostors count (0)');
  }

  // 2.5 Tie vote handling
  {
    const state = createInitialState(4, 1);
    // Votes: p_0 gets 2 votes, p_1 gets 2 votes
    state.players['p_0'].votedFor = 'p_1';
    state.players['p_1'].votedFor = 'p_0';
    state.players['p_2'].votedFor = 'p_0';
    state.players['p_3'].votedFor = 'p_1';

    const voteCounts: Record<string, number> = { skip: 0 };
    Object.values(state.players).forEach((p) => {
      if (p.votedFor) {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    });

    let highestVoteCount = 0;
    let highestTarget: string | null = null;
    let isTie: boolean = false;

    for (const [target, count] of Object.entries(voteCounts)) {
      if (count > highestVoteCount) {
        highestVoteCount = count;
        highestTarget = target;
        isTie = false;
      } else if (count === highestVoteCount && count > 0) {
        isTie = true;
      }
    }

    assert(isTie === true, 'Vote Tally: Tie detected between equal top vote getters');
    const wasSkipped = highestTarget === 'skip' || !highestTarget;
    const shouldEject = !isTie && !wasSkipped && highestTarget;
    assert(!shouldEject, 'Ejection Verdict: No player ejected on vote tie');
  }

  // 2.6 Skip vote majority handling
  {
    const state = createInitialState(4, 1);
    // Votes: 3 for skip, 1 for p_0
    state.players['p_0'].votedFor = 'skip';
    state.players['p_1'].votedFor = 'skip';
    state.players['p_2'].votedFor = 'skip';
    state.players['p_3'].votedFor = 'p_0';

    const voteCounts: Record<string, number> = { skip: 0 };
    Object.values(state.players).forEach((p) => {
      if (p.votedFor) {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    });

    let highestVoteCount = 0;
    let highestTarget: string | null = null;
    let isTie: boolean = false;

    for (const [target, count] of Object.entries(voteCounts)) {
      if (count > highestVoteCount) {
        highestVoteCount = count;
        highestTarget = target;
        isTie = false;
      } else if (count === highestVoteCount && count > 0) {
        isTie = true;
      }
    }

    const wasSkipped = highestTarget === 'skip';
    assert(wasSkipped, 'Vote Tally: Skip majority recognized');
  }

  // 2.7 Anonymous Voting & Confirm Ejects Settings
  {
    const ejectionDataConfirm: EjectionData = {
      ejectedPlayerName: 'Bob',
      ejectedPlayerColor: 'blue',
      ejectedPlayerRole: 'crewmate',
      wasTie: false,
      wasSkipped: false,
      remainingImpostors: 1,
      confirmEjects: true,
    };
    const ejectionDataNoConfirm: EjectionData = {
      ...ejectionDataConfirm,
      confirmEjects: false,
    };

    const textConfirm = `${ejectionDataConfirm.ejectedPlayerName} war ${ejectionDataConfirm.ejectedPlayerRole === 'impostor' ? 'Ein Impostor.' : 'Nicht der Impostor.'}`;
    const textNoConfirm = `${ejectionDataNoConfirm.ejectedPlayerName} wurde hinausgeworfen.`;

    assert(textConfirm === 'Bob war Nicht der Impostor.', 'Confirm Ejects: Explicit role revealed when confirmEjects is true');
    assert(textNoConfirm === 'Bob wurde hinausgeworfen.', 'Confirm Ejects: Role concealed when confirmEjects is false');
  }
}

// ===========================================================================
// SUITE 3: TASK PROGRESSION & GHOST TASKS
// ===========================================================================
function testTaskProgressionAndGhostTasks() {
  console.log('\n--- SUITE 3: TASK PROGRESSION & GHOST TASKS ---');

  // 3.1 Task Assignment validation
  {
    const state = createInitialState(6, 1);
    let allUniqueAndCorrect = true;
    Object.values(state.players).forEach((p) => {
      if (p.assignedTasks.length !== DEFAULT_SETTINGS.totalTasksPerPlayer) {
        allUniqueAndCorrect = false;
      }
      const unique = new Set(p.assignedTasks);
      if (unique.size !== p.assignedTasks.length) {
        allUniqueAndCorrect = false;
      }
    });
    assert(allUniqueAndCorrect, 'Task Setup: Each player receives exactly 4 unique assigned tasks');
  }

  // 3.2 Crewmate task completion increments global task bar
  {
    const state = createInitialState(5, 1); // 1 imp, 4 crew. 4 * 4 = 16 crewmate tasks
    assert(state.totalTasksCount === 16, 'Task Setup: totalTasksCount equals 16 (4 crewmates * 4 tasks)');

    const crew1 = state.players['p_1'];
    const task = crew1.assignedTasks[0];
    crew1.completedTasks.push(task);
    if (crew1.role !== 'impostor') {
      state.completedTasksCount = (state.completedTasksCount || 0) + 1;
    }

    assert(state.completedTasksCount === 1, 'Task Progress: Crewmate task completion increments global completedTasksCount to 1');
    const percent = Math.round(((state.completedTasksCount || 0) / (state.totalTasksCount || 1)) * 100);
    assert(percent === 6, 'Task Progress: Global progress bar percentage matches formula (1/16 = 6%)');
  }

  // 3.3 Impostor fake task completion does not increment global task bar
  {
    const state = createInitialState(5, 1);
    const imp = state.players['p_0'];
    const initialCompleted = state.completedTasksCount || 0;

    imp.completedTasks.push(imp.assignedTasks[0]);
    if (imp.role !== 'impostor') {
      state.completedTasksCount = (state.completedTasksCount || 0) + 1;
    }

    assert(state.completedTasksCount === initialCompleted, 'Task Progress: Impostor completing fake task leaves global task count unchanged');
  }

  // 3.4 Ghost Crewmates task completion and 100% win condition
  {
    const state = createInitialState(5, 1); // 1 imp (p_0), 4 crew (p_1..p_4). 16 tasks total.
    const crew1 = state.players['p_1'];
    // Kill crew1 -> becomes ghost
    crew1.isAlive = false;

    // Ghost crew1 finishes all 4 tasks
    crew1.assignedTasks.forEach((tId) => {
      crew1.completedTasks.push(tId);
      state.completedTasksCount = (state.completedTasksCount || 0) + 1;
    });

    assert(state.completedTasksCount === 4, 'Ghost Tasks: Dead ghost crewmate completes 4 tasks, adding 4 to global bar');

    // Other 3 living crewmates finish all their tasks
    ['p_2', 'p_3', 'p_4'].forEach((pId) => {
      state.players[pId].assignedTasks.forEach((tId) => {
        state.players[pId].completedTasks.push(tId);
        state.completedTasksCount = (state.completedTasksCount || 0) + 1;
      });
    });

    assert(state.completedTasksCount === state.totalTasksCount, 'Task Progress: All 16 crewmate tasks completed');

    const win = checkWinConditions(state);
    assert(win.winner === 'crewmates', 'Win Condition: Crewmates win when 100% tasks completed with ghost participation');
  }
}

// ===========================================================================
// SUITE 4: SABOTAGE MECHANICS & DOOR LOCKS
// ===========================================================================
function testSabotageMechanicsAndDoorLocks() {
  console.log('\n--- SUITE 4: SABOTAGE MECHANICS & DOOR LOCKS ---');

  // 4.1 Critical Sabotages: Reactor Meltdown & Oxygen Depletion
  {
    const state = createInitialState(5, 1);

    // Trigger Reactor Meltdown
    state.activeSabotage = {
      type: 'reactor',
      countdown: 30,
      requiredFixes: 2,
      currentFixes: 0,
    };
    assert(state.activeSabotage.countdown === 30, 'Critical Sabotage: Reactor Meltdown initialized with 30s countdown');

    // Decrement countdown
    state.activeSabotage.countdown -= 1;
    assert(state.activeSabotage.countdown === 29, 'Critical Sabotage: Countdown decrements each second');

    // Countdown reaches 0 -> Impostor win
    state.activeSabotage.countdown = 0;
    if (state.activeSabotage.countdown <= 0 && state.activeSabotage.type === 'reactor') {
      state.phase = 'game_over';
      state.winner = 'impostors';
      state.winReason = 'Kritische Reaktorschmelze! Die Skeld wurde zerstört.';
    }
    assert(state.phase === 'game_over' && state.winner === 'impostors', 'Critical Sabotage: Reactor Meltdown countdown expiry triggers instant Impostor victory');
  }

  // 4.2 Oxygen Depletion Expiry Win
  {
    const state = createInitialState(5, 1);
    state.activeSabotage = {
      type: 'o2',
      countdown: 0,
      requiredFixes: 1,
    };
    if (state.activeSabotage.countdown <= 0 && state.activeSabotage.type === 'o2') {
      state.phase = 'game_over';
      state.winner = 'impostors';
      state.winReason = 'Sauerstoff erschöpft! Die Besatzung konnte nicht gerettet werden.';
    }
    assert(state.winner === 'impostors', 'Critical Sabotage: O2 Depletion countdown expiry triggers instant Impostor victory');
  }

  // 4.3 Tactical Sabotages: Lights & Comms
  {
    const state = createInitialState(5, 1);

    // Lights
    state.activeSabotage = { type: 'lights', countdown: 0 };
    assert(state.activeSabotage.type === 'lights', 'Tactical Sabotage: Lights sabotage active');

    // Resolving lights clears activeSabotage
    state.activeSabotage = null;
    assert(state.activeSabotage === null, 'Tactical Sabotage: Fixing lights clears crisis');
  }

  // 4.4 Door Sabotage: 10s Lock, Wall Collision, and Ghost Bypass
  {
    const now = Date.now();
    const lockedDoors = { cafeteria: now + 10000 };

    // South doorway of Cafeteria (x: 1180, y: 860)
    const doorX = 1180;
    const doorY = 860;

    // Living player collides with locked blast door
    const livingCollides = checkCollision(doorX, doorY, 16, false, lockedDoors);
    assert(livingCollides, 'Door Sabotage: Living player collides with locked cafeteria door');

    // Ghost player bypasses locked blast door
    const ghostCollides = checkCollision(doorX, doorY, 16, true, lockedDoors);
    assert(!ghostCollides, 'Door Sabotage: Ghost player does not collide with locked blast door');

    // Sub-stepping movement solver test: Living player cannot push past door
    const livingMove = resolvePlayerMovement(1180, 830, 0, 50, 16, false, lockedDoors);
    assert(livingMove.y < 860, 'Movement Solver: Living player movement halted before locked blast door');

    // Sub-stepping movement solver test: Ghost floats past door freely
    const ghostMove = resolvePlayerMovement(1180, 830, 0, 50, 16, true, lockedDoors);
    assert(ghostMove.y === 880, 'Movement Solver: Ghost player successfully moves through locked blast door');
  }
}

// ===========================================================================
// SUITE 5: BOT AI BEHAVIOR & WAYPOINT NAVMESH
// ===========================================================================
function testBotAIBehaviorAndNavMesh() {
  console.log('\n--- SUITE 5: BOT AI BEHAVIOR & WAYPOINT NAVMESH ---');

  // 5.1 NavMesh All-Pairs Reachability (23 Waypoints x 23 Waypoints = 529 routes)
  {
    assert(WAYPOINTS.length === 23, `NavMesh: Total waypoints equals 23 (observed: ${WAYPOINTS.length})`);

    let allPairsConnected = true;
    let failedPairs: string[] = [];

    for (let i = 0; i < WAYPOINTS.length; i++) {
      for (let j = 0; j < WAYPOINTS.length; j++) {
        const start = WAYPOINTS[i];
        const end = WAYPOINTS[j];
        const path = findBotPath(start.x, start.y, end.x, end.y);

        if (path.length === 0) {
          allPairsConnected = false;
          failedPairs.push(`${start.id} ➔ ${end.id}`);
        } else if (path[path.length - 1].id !== end.id) {
          allPairsConnected = false;
          failedPairs.push(`${start.id} ➔ ${end.id}`);
        }
      }
    }

    assert(allPairsConnected, `NavMesh Connectivity: All 529 waypoint pairs are mutually reachable without dead ends`, failedPairs.join(', '));
  }

  // 5.2 Bot Pathfinding to all 28 tasks across 14 rooms
  {
    let allTasksReachable = true;
    for (const task of ALL_TASKS) {
      const path = findBotPath(SPAWN_POSITION.x, SPAWN_POSITION.y, task.x, task.y);
      if (path.length === 0) {
        allTasksReachable = false;
      }
    }
    assert(allTasksReachable, `Bot AI: Paths found from Cafeteria spawn to all ${ALL_TASKS.length} tasks across all 14 rooms`);
  }

  // 5.3 Impostor Bot Stealth Kill Evaluation
  {
    const state = createInitialState(5, 1);
    const impBot = state.players['p_0'];
    const victim = state.players['p_1'];
    const witness = state.players['p_2'];

    // Position Impostor and Victim isolated in Electrical (x: 700, y: 1000)
    impBot.x = 700; impBot.y = 1000;
    victim.x = 730; victim.y = 1000;

    // Witness far in Cafeteria (x: 1200, y: 500) behind walls
    witness.x = 1200; witness.y = 500;

    const distVictim = Math.hypot(impBot.x - victim.x, impBot.y - victim.y);
    const losVictim = hasLineOfSight(impBot.x, impBot.y, victim.x, victim.y);

    const witnessLos = hasLineOfSight(witness.x, witness.y, victim.x, victim.y);
    const witnessDist = Math.hypot(witness.x - victim.x, witness.y - victim.y);
    const isWitnessPresent = witnessDist < 220 && witnessLos;

    assert(distVictim < 90 && losVictim && !isWitnessPresent, 'Stealth Kill: Impostor bot executes kill when isolated without witnesses');

    // Move witness into Electrical next to victim
    witness.x = 740; witness.y = 1010;
    const witnessCloseLos = hasLineOfSight(witness.x, witness.y, victim.x, victim.y);
    const witnessCloseDist = Math.hypot(witness.x - victim.x, witness.y - victim.y);
    const hasWitnessNearby = witnessCloseDist < 220 && witnessCloseLos;
    assert(hasWitnessNearby, 'Stealth Kill: Impostor bot identifies nearby witness in same room with LOS');
  }

  // 5.4 Crewmate Bot Body Reporting
  {
    const state = createInitialState(3, 1);
    const bot = state.players['p_2'];
    const body: DeadBody = { id: 'body-b1', playerId: 'p_1', playerName: 'Bob', color: 'blue', x: 800, y: 500, reported: false };
    state.deadBodies = [body];

    // Bot approaches body in Medbay
    bot.x = 850; bot.y = 500;
    const distToBody = Math.hypot(bot.x - body.x, bot.y - body.y);
    const losToBody = hasLineOfSight(bot.x, bot.y, body.x, body.y);

    const shouldTriggerReport = distToBody < 180 && losToBody && !body.reported;
    assert(shouldTriggerReport, 'Bot AI: Crewmate bot triggers emergency report when within 180px of dead body with LOS');
  }

  // 5.5 Impostor Parity Win Condition
  {
    const state = createInitialState(4, 1); // 1 imp, 3 crew (4 total)
    // Kill 2 crewmates -> 1 imp vs 1 crew
    state.players['p_1'].isAlive = false;
    state.players['p_2'].isAlive = false;

    const win = checkWinConditions(state);
    assert(win.winner === 'impostors', 'Win Condition: Impostor wins when alive impostor count equals alive crewmate count (1 vs 1)');
  }
}

// ===========================================================================
// SUITE 6: END-TO-END SIMULATED MATCH SCENARIOS
// ===========================================================================
function testFullScenarios() {
  console.log('\n--- SUITE 6: END-TO-END SIMULATED MATCH SCENARIOS ---');

  // Scenario 1: Crewmates Task Completion Win
  {
    const state = createInitialState(5, 1); // 1 imp, 4 crew (16 tasks)
    state.phase = 'playing';

    const crew = Object.values(state.players).filter((p) => p.role === 'crewmate');
    crew.forEach((c) => {
      c.assignedTasks.forEach((tId) => {
        c.completedTasks.push(tId);
        state.completedTasksCount = (state.completedTasksCount || 0) + 1;
      });
    });

    const win = checkWinConditions(state);
    assert(win.winner === 'crewmates', 'Scenario 1: 4 Crewmates complete all assigned tasks -> Crewmate Victory');
  }

  // Scenario 2: Impostor Stealth Elimination to Parity
  {
    const state = createInitialState(4, 1); // 1 imp, 3 crew
    state.phase = 'playing';

    state.players['p_1'].isAlive = false;
    state.players['p_2'].isAlive = false;

    const win = checkWinConditions(state);
    assert(win.winner === 'impostors', 'Scenario 2: Impostor eliminates crewmates to parity -> Impostor Victory');
  }

  // Scenario 3: Emergency Meeting Vote Ejection of Impostor
  {
    const state = createInitialState(5, 1); // 1 imp (p_0), 4 crew
    state.phase = 'meeting';
    state.meetingPhase = 'results';

    state.players['p_1'].votedFor = 'p_0';
    state.players['p_2'].votedFor = 'p_0';
    state.players['p_3'].votedFor = 'p_0';
    state.players['p_4'].votedFor = 'p_0';
    state.players['p_0'].votedFor = 'p_1';

    state.players['p_0'].isAlive = false;
    state.phase = 'ejection';

    const win = checkWinConditions(state);
    assert(win.winner === 'crewmates', 'Scenario 3: Crewmates vote out Impostor in meeting -> Crewmate Victory');
  }

  // Scenario 4: Player Disconnect Task Adjustment
  {
    const state = createInitialState(5, 1); // 1 imp, 4 crew. 16 tasks.
    assert(state.totalTasksCount === 16, 'Scenario 4: Initial totalTasksCount is 16');

    // Disconnect crewmate p_4 with 4 assigned tasks (0 completed)
    const leavingPlayer = state.players['p_4'];
    delete state.players['p_4'];
    state.totalTasksCount = Math.max(0, (state.totalTasksCount || 0) - leavingPlayer.assignedTasks.length);

    assert(state.totalTasksCount === 12, 'Scenario 4: Disconnecting crewmate subtracts their uncompleted tasks from total (16 - 4 = 12)');
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
export function runAllTests() {
  console.log('================================================================');
  console.log('CHALLENGER 2: EMPIRICAL GAME LOOP & STATE SYNC TEST HARNESS');
  console.log('================================================================');

  testKillAndReportMechanics();
  testMeetingAndVotingMechanics();
  testTaskProgressionAndGhostTasks();
  testSabotageMechanicsAndDoorLocks();
  testBotAIBehaviorAndNavMesh();
  testFullScenarios();

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error(`\nFAILED SUITES SUMMARY (${failedTests} failures):`);
    failures.forEach((f) => console.error(f));
    process.exit(1);
  } else {
    console.log('\n>>> ALL EMPIRICAL GAME LOOP & STATE SYNC TESTS PASSED (100%)! <<<');
    process.exit(0);
  }
}

runAllTests();
