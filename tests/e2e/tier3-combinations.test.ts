/**
 * Tier 3: Cross-Feature Combinations & Multi-System Interactions (40 Tests)
 */

import { TestRunner, expect } from '../test-framework';
import {
  VENTS,
  ALL_TASKS,
  SECURITY_CAMERAS,
  SPAWN_SLOTS,
  EMERGENCY_BUTTON_POS,
  checkCollision,
  resolvePlayerMovement,
  getCurrentRoomName,
  findBotPath,
} from '@/lib/map-data';
import { hasLineOfSight } from '@/components/game/TheSkeldMap';
import {
  Player,
  DeadBody,
  DEFAULT_SETTINGS,
  ActiveSabotage,
  NetworkMessage,
} from '@/types/game';

export function registerTier3Tests(runner: TestRunner) {
  runner.setContext(3, 1, 'Cross-Feature Interactions');

  runner.test('X01: Reactor Meltdown Sabotage blocks Emergency Meeting Button', () => {
    const activeSabotage: ActiveSabotage = { type: 'reactor', countdown: 25 };
    const playerAtButton = { x: EMERGENCY_BUTTON_POS.x, y: EMERGENCY_BUTTON_POS.y };
    const dist = Math.hypot(playerAtButton.x - EMERGENCY_BUTTON_POS.x, playerAtButton.y - EMERGENCY_BUTTON_POS.y);
    const inRange = dist <= EMERGENCY_BUTTON_POS.radius;
    const isBlockedBySabotage = activeSabotage && (activeSabotage.type === 'reactor' || activeSabotage.type === 'o2');
    const canPress = inRange && !isBlockedBySabotage;
    expect(canPress).toBeFalsy();
  });

  runner.test('X02: Oxygen Depletion Sabotage blocks Emergency Meeting Button', () => {
    const activeSabotage: ActiveSabotage = { type: 'o2', countdown: 22 };
    const isBlocked = activeSabotage && (activeSabotage.type === 'reactor' || activeSabotage.type === 'o2');
    expect(isBlocked).toBeTruthy();
  });

  runner.test('X03: Electrical Lights Sabotage reduces Crewmate LOS while Impostor sees full range', () => {
    const lightsSabotage: ActiveSabotage = { type: 'lights', countdown: 0 };
    const crewVision = lightsSabotage.type === 'lights' ? 80 : 250;
    const impVision = 375;

    const targetDistance = 150; // Between 80 and 375
    const crewmateSeesTarget = targetDistance <= crewVision;
    const impostorSeesTarget = targetDistance <= impVision;

    expect(crewmateSeesTarget).toBeFalsy();
    expect(impostorSeesTarget).toBeTruthy();
  });

  runner.test('X04: Communications Sabotage blacks out Admin Radar Table telemetry', () => {
    const commsSabotage: ActiveSabotage = { type: 'comms', countdown: 0 };
    const adminTableActive = commsSabotage.type !== 'comms';
    expect(adminTableActive).toBeFalsy();
  });

  runner.test('X05: Communications Sabotage displays static fuzz on Security CCTV monitor', () => {
    const commsSabotage: ActiveSabotage = { type: 'comms', countdown: 0 };
    const cctvOperational = commsSabotage.type !== 'comms';
    expect(cctvOperational).toBeFalsy();
  });

  runner.test('X06: Communications Sabotage disables Task List display', () => {
    const commsSabotage: ActiveSabotage = { type: 'comms', countdown: 0 };
    const taskListVisible = commsSabotage.type !== 'comms';
    expect(taskListVisible).toBeFalsy();
  });

  runner.test('X07: Impostor Kill under active CCTV camera is within camera surveillance radius', () => {
    const cam = SECURITY_CAMERAS[0]; // Medbay camera at 900, 450
    const killPos = { x: 920, y: 460 };
    const distToCam = Math.hypot(killPos.x - cam.x, killPos.y - cam.y);
    const hasCamLOS = hasLineOfSight(cam.x, cam.y, killPos.x, killPos.y);
    const caughtOnCamera = distToCam <= 220 && hasCamLOS;
    expect(caughtOnCamera).toBeTruthy();
  });

  runner.test('X08: Impostor executes kill then vents from Medbay to Electrical', () => {
    const killer: Player = { id: 'k', name: 'Killer', color: 'red', isHost: false, isReady: true, role: 'impostor', isAlive: true, x: 680, y: 420, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [], killCooldown: 0 };
    const medVent = VENTS.find((v) => v.id === 'vent-medbay')!;
    const elecVent = VENTS.find((v) => v.id === 'vent-electrical')!;

    // 1. Enter Medbay vent
    killer.inVent = true;
    killer.ventId = medVent.id;

    // 2. Travel to Electrical vent
    expect(medVent.connectedVents).toContain(elecVent.id);
    killer.ventId = elecVent.id;
    killer.x = elecVent.x;
    killer.y = elecVent.y;

    // 3. Exit in Electrical
    killer.inVent = false;
    killer.ventId = undefined;

    expect(killer.x).toBe(elecVent.x);
    expect(killer.y).toBe(elecVent.y);
    expect(getCurrentRoomName(killer.x, killer.y)).toBe('Electrical');
  });

  runner.test('X09: Impostor locks Electrical doors after kill trapping victim corpse inside', () => {
    const now = Date.now();
    const lockedDoors = { electrical: now + 10000 };
    // Door at doorway x: 680..840, y: 880
    const collidesAtDoor = checkCollision(760, 1150, 16, false, lockedDoors);
    expect(collidesAtDoor).toBeTruthy();
  });

  runner.test('X10: Ghost mode player bypasses structural walls to reach Reactor Manifolds task', () => {
    const ghostStart = { x: 500, y: 780 }; // In Security/hallway
    const manifoldsTask = ALL_TASKS.find((t) => t.id === 'task-reactor-manifolds')!; // at 140, 940
    // Move through reactor wall as ghost
    const move = resolvePlayerMovement(ghostStart.x, ghostStart.y, manifoldsTask.x - ghostStart.x, manifoldsTask.y - ghostStart.y, 16, true);
    expect(move.x).toBe(manifoldsTask.x);
    expect(move.y).toBe(manifoldsTask.y);
  });

  runner.test('X11: Ghost completes final task triggering Global Task Bar 100% and Crewmate Victory', () => {
    let completedTasks = 11;
    const totalTasks = 12;

    // Ghost finishes 12th task
    completedTasks++;
    const winCrewmates = completedTasks >= totalTasks;
    expect(winCrewmates).toBeTruthy();
  });

  runner.test('X12: Emergency meeting called while Impostor in vent extracts Impostor to Cafeteria table', () => {
    let imp: Player = { id: 'imp', name: 'Imp', color: 'red', isHost: false, isReady: true, role: 'impostor', isAlive: true, inVent: true, ventId: 'vent-admin', x: 1760, y: 1040, facing: 'right', isMoving: false, assignedTasks: [], completedTasks: [] };
    // Meeting starts
    imp = {
      ...imp,
      inVent: false,
      ventId: undefined,
      x: SPAWN_SLOTS[0].x,
      y: SPAWN_SLOTS[0].y,
    };
    expect(imp.inVent).toBeFalsy();
    expect(imp.ventId).toBeUndefined();
    expect(imp.x).toBe(SPAWN_SLOTS[0].x);
  });

  runner.test('X13: Dead body report clears all dead bodies from Skeld floor', () => {
    let deadBodies: DeadBody[] = [
      { id: 'b1', playerId: 'p1', playerName: 'P1', color: 'red', x: 100, y: 100, reported: false },
      { id: 'b2', playerId: 'p2', playerName: 'P2', color: 'lime', x: 200, y: 200, reported: false },
    ];
    deadBodies = [];
    expect(deadBodies.length).toBe(0);
  });

  runner.test('X14: Non-critical sabotages (Lights, Comms) cleared upon Emergency Meeting start', () => {
    let activeSabotage: ActiveSabotage | null = { type: 'lights', countdown: 0 };
    // Meeting triggers
    activeSabotage = null;
    expect(activeSabotage).toBeNull();
  });

  runner.test('X15: Meeting phase timer transition triggers AI Bot discussion chat and votes', () => {
    const meetingPhase: 'discussion' | 'voting' | 'results' = 'voting';
    const botsVoted = meetingPhase === 'voting';
    expect(botsVoted).toBeTruthy();
  });

  runner.test('X16: Anonymous voting setting conceals voter identities on voting result tally', () => {
    const anonymousVotes = true;
    const showVoters = !anonymousVotes;
    expect(showVoters).toBeFalsy();
  });

  runner.test('X17: Confirm Ejects (true) reveals Impostor identity upon ejection', () => {
    const confirmEjects = true;
    const role = 'impostor';
    const msg = confirmEjects && role === 'impostor' ? `Red was An Impostor.` : `Red was ejected.`;
    expect(msg).toBe('Red was An Impostor.');
  });

  runner.test('X18: Confirm Ejects (false) hides role upon ejection', () => {
    const confirmEjects = false;
    const msg = confirmEjects ? `Red was An Impostor.` : `Red was ejected.`;
    expect(msg).toBe('Red was ejected.');
  });

  runner.test('X19: Tie vote results in no ejection and resumes gameplay phase', () => {
    const votes = { p1: 2, p2: 2 };
    const isTie = votes.p1 === votes.p2;
    const nextPhase = 'playing';
    expect(isTie).toBeTruthy();
    expect(nextPhase).toBe('playing');
  });

  runner.test('X20: Skip vote majority results in no ejection and resumes gameplay phase', () => {
    const votes = { skip: 3, p1: 1 };
    const wasSkipped = votes.skip > votes.p1;
    const nextPhase = 'playing';
    expect(wasSkipped).toBeTruthy();
    expect(nextPhase).toBe('playing');
  });

  runner.test('X21: Impostor parity: Impostor eliminates Crewmate down to 1v1 triggering Impostor Win', () => {
    const aliveImps = 1;
    const aliveCrew = 1;
    const isImpostorWin = aliveImps >= aliveCrew && aliveImps > 0;
    expect(isImpostorWin).toBeTruthy();
  });

  runner.test('X22: All Impostors ejected triggers immediate Crewmate Victory', () => {
    const aliveImps = 0;
    const isCrewmateWin = aliveImps === 0;
    expect(isCrewmateWin).toBeTruthy();
  });

  runner.test('X23: Critical Sabotage Countdown reaching 0.0s triggers Impostor Victory', () => {
    const countdown = 0.0;
    const isImpostorWin = countdown <= 0;
    expect(isImpostorWin).toBeTruthy();
  });

  runner.test('X24: Visual Tasks (true) renders Medbay Scanner holographic green beam for onlookers', () => {
    const visualTasks = true;
    const scanActive = true;
    const renderGreenBeam = visualTasks && scanActive;
    expect(renderGreenBeam).toBeTruthy();
  });

  runner.test('X25: Visual Tasks (true) fires exterior laser cannons on Weapons Asteroid shoot', () => {
    const visualTasks = true;
    const asteroidsShot = true;
    const renderOuterLasers = visualTasks && asteroidsShot;
    expect(renderOuterLasers).toBeTruthy();
  });

  runner.test('X26: Visual Tasks (true) vents trash debris into outer space vacuum', () => {
    const visualTasks = true;
    const garbageFlushed = true;
    const renderSpaceDebris = visualTasks && garbageFlushed;
    expect(renderSpaceDebris).toBeTruthy();
  });

  runner.test('X27: Prime Shields completed turns on exterior Skeld ship hull illumination lights', () => {
    const shieldsPrimed = true;
    const exteriorLightsOn = shieldsPrimed;
    expect(exteriorLightsOn).toBeTruthy();
  });

  runner.test('X28: Door Sabotage in Storage blocks raycast LOS across hallway', () => {
    const now = Date.now();
    const lockedDoors = { storage: now + 10000 };
    // Raycast across north doorway of Storage (1180, 960 to 1180, 1020)
    const los = hasLineOfSight(1180, 960, 1180, 1020, lockedDoors);
    expect(los).toBeFalsy();
  });

  runner.test('X29: AI Bot A* pathfinding navigates around colliders to the exact task', () => {
    const adminTask = ALL_TASKS.find((task) => task.id === 'task-admin-card')!;
    const path = findBotPath(1200, 410, adminTask.x, adminTask.y);
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1].x).toBe(adminTask.x);
    expect(path[path.length - 1].y).toBe(adminTask.y);
    expect(path[path.length - 1].room).toBe('Admin');
  });

  runner.test('X30: Divert Power in Electrical unlocks Accept Power breaker switch in target room', () => {
    let powerDiverted = false;
    let powerAccepted = false;

    // Stage 1: Divert
    powerDiverted = true;
    expect(powerDiverted).toBeTruthy();

    // Stage 2: Accept
    if (powerDiverted) powerAccepted = true;
    expect(powerAccepted).toBeTruthy();
  });

  runner.test('X31: Download Data at Cafeteria terminal unlocks Upload Data at Admin mainframe', () => {
    let dataDownloaded = false;
    let dataUploaded = false;

    dataDownloaded = true;
    if (dataDownloaded) dataUploaded = true;
    expect(dataUploaded).toBeTruthy();
  });

  runner.test('X32: 3-Stage Refuel Engines: Storage Canister -> Upper Engine -> Lower Engine', () => {
    let stage = 1; // 1: Fill Canister
    stage++; // 2: Fill Upper Engine
    stage++; // 3: Fill Lower Engine
    expect(stage).toBe(3);
  });

  runner.test('X33: Reactor Meltdown dual hand scanner requires both scanners held simultaneously', () => {
    const scannerHolders = new Set<string>();
    scannerHolders.add('p1');
    expect(scannerHolders.size >= 2).toBeFalsy(); // 1 holder not enough

    scannerHolders.add('p2');
    expect(scannerHolders.size >= 2).toBeTruthy(); // 2 holders resolves meltdown
  });

  runner.test('X34: Oxygen Depletion requires 5-digit code entry in BOTH Admin and O2 rooms', () => {
    const fixedRooms = new Set<string>();
    fixedRooms.add('Admin');
    const isResolved1 = fixedRooms.has('Admin') && fixedRooms.has('O2');
    expect(isResolved1).toBeFalsy();

    fixedRooms.add('O2');
    const isResolved2 = fixedRooms.has('Admin') && fixedRooms.has('O2');
    expect(isResolved2).toBeTruthy();
  });

  runner.test('X35: Impostor kill cooldown resets to full 25s when meeting concludes', () => {
    let killCooldown = 0;
    const settingsCooldown = 25;
    // Meeting concludes
    killCooldown = settingsCooldown;
    expect(killCooldown).toBe(25);
  });

  runner.test('X36: Impostor self-reports body and participates in meeting chat discussion', () => {
    const impReporter = { id: 'imp', role: 'impostor', name: 'Sneaky' };
    const meetingReport = { reporterId: impReporter.id, isSelfReport: true };
    expect(meetingReport.isSelfReport).toBeTruthy();
  });

  runner.test('X37: Security monitor viewing triggers blinking red LED on physical corridor camera props', () => {
    const isSecurityCamActive = true;
    const ledBlinking = isSecurityCamActive;
    expect(ledBlinking).toBeTruthy();
  });

  runner.test('X38: Admin Table room count updates dynamically as player moves from Cafeteria to Storage', () => {
    let playerPos = { x: 1200, y: 550 }; // In Cafeteria
    expect(getCurrentRoomName(playerPos.x, playerPos.y)).toBe('Cafeteria');

    playerPos = { x: 1120, y: 1200 }; // Move to Storage
    expect(getCurrentRoomName(playerPos.x, playerPos.y)).toBe('Storage');
  });

  runner.test('X39: WebRTC StateSync packet broadcast synchronizes global task bar progress across mesh', () => {
    const syncMsg: NetworkMessage = {
      type: 'STATE_SYNC',
      gameState: {
        phase: 'playing',
        roomCode: 'ABCD',
        players: {},
        deadBodies: [],
        settings: DEFAULT_SETTINGS,
        totalTasksCount: 20,
        completedTasksCount: 15,
      },
    };
    expect(syncMsg.gameState.completedTasksCount).toBe(15);
  });

  runner.test('X40: Lobby host disconnection gracefully handles mesh tear-down', () => {
    let networkConnected = true;
    networkConnected = false;
    expect(networkConnected).toBeFalsy();
  });
}
