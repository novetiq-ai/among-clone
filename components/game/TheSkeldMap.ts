import { ROOMS, CORRIDORS, WALLS, ALL_TASKS, VENTS, EMERGENCY_BUTTON_POS, SECURITY_CAMERAS, LOCKED_DOOR_WALLS } from '@/lib/map-data';
import { Player, DeadBody, ActiveSabotage, HatType, PLAYER_COLORS } from '@/types/game';

function drawGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  blur = 20
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): boolean {
  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // X slab
  if (Math.abs(dx) < 1e-8) {
    if (x1 < boxX || x1 > boxX + boxW) return false;
  } else {
    let t1 = (boxX - x1) / dx;
    let t2 = (boxX + boxW - x1) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  // Y slab
  if (Math.abs(dy) < 1e-8) {
    if (y1 < boxY || y1 > boxY + boxH) return false;
  } else {
    let t1 = (boxY - y1) / dy;
    let t2 = (boxY + boxH - y1) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  return true;
}

export function hasLineOfSight(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  lockedDoors?: Record<string, number>
): boolean {
  for (const wall of WALLS) {
    if (wall.isObstacle) continue;
    if (lineIntersectsBox(fromX, fromY, toX, toY, wall.x, wall.y, wall.width, wall.height)) {
      return false;
    }
  }

  if (lockedDoors) {
    const now = Date.now();
    for (const [roomKey, expiry] of Object.entries(lockedDoors)) {
      if (expiry > now) {
        const normalizedKey = roomKey.toLowerCase().replace(/\s+/g, '_');
        const doorList = LOCKED_DOOR_WALLS[normalizedKey] || LOCKED_DOOR_WALLS[roomKey.toLowerCase()];
        if (doorList) {
          for (const doorWall of doorList) {
            if (lineIntersectsBox(fromX, fromY, toX, toY, doorWall.x, doorWall.y, doorWall.width, doorWall.height)) {
              return false;
            }
          }
        }
      }
    }
  }

  return true;
}

export function drawTheSkeld(
  ctx: CanvasRenderingContext2D,
  viewX: number,
  viewY: number,
  canvasWidth: number,
  canvasHeight: number,
  localPlayer: Player,
  players: Record<string, Player>,
  deadBodies: DeadBody[],
  activeTaskId: string | null,
  activeSabotage?: ActiveSabotage | null,
  isSecurityCamActive?: boolean,
  lockedDoors?: Record<string, number>
) {
  ctx.save();

  // 1. Clear space background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const time = typeof performance !== 'undefined' ? performance.now() : 0;

  // 2. Parallax Space Environment
  ctx.save();
  ctx.translate(-viewX * 0.15, -viewY * 0.15);
  drawDeepSpace(ctx, time);
  ctx.restore();

  // Camera translation for The Skeld interior
  ctx.translate(-viewX, -viewY);

  // 3. Outer Spaceship Hull Blueprint Silhouette
  drawShipHull(ctx, time);

  // 4. Room Floors & Hallways
  drawShipFloors(ctx, time, activeSabotage);

  // 5. Hazard Stripes & Corridor Details
  drawRoomDecals(ctx, time);
  drawCorridorDetails(ctx, time);

  // 6. Detailed Room Furniture & Machines
  drawDetailedRoomObjects(ctx, time, localPlayer);

  // 7. Vents
  drawVents(ctx, localPlayer, time);

  // 8. Security Cameras
  drawSecurityCameras(ctx, isSecurityCamActive || false, time);

  // 9. Locked Doors
  if (lockedDoors) {
    drawLockedDoors(ctx, lockedDoors, time);
  }

  // 10. Task Stations
  drawTaskStations(ctx, localPlayer, activeTaskId, time);

  // 11. Cafeteria Emergency Button
  drawEmergencyButton(ctx, localPlayer, time);

  // 12. Dead Bodies
  drawDeadBodies(ctx, deadBodies, localPlayer, time, activeSabotage, lockedDoors);

  // 13. Players
  drawPlayers(ctx, players, localPlayer, time, activeSabotage, lockedDoors);

  // 14. Solid Walls & Bulkheads (2.5D Occlusion)
  drawWallsAndBulkheads(ctx, time);

  // 15. Sabotage Beacons
  drawSabotageBeacons(ctx, activeSabotage, time);

  // 16. Dynamic Lighting & Fog of War (Centered in world coordinates directly around player)
  drawDynamicLighting(ctx, localPlayer, activeSabotage, time);

  ctx.restore();

  // 17. Screen-Space Directional Sabotage Arrows
  drawSabotageDirectionalArrows(ctx, canvasWidth, canvasHeight, localPlayer, activeSabotage, time);
}

function drawDeepSpace(ctx: CanvasRenderingContext2D, time: number) {
  // Distant Nebula Clouds
  const grad1 = ctx.createRadialGradient(800, 600, 100, 800, 600, 900);
  grad1.addColorStop(0, 'rgba(56, 189, 248, 0.06)');
  grad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.03)');
  grad1.addColorStop(1, 'transparent');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, 3200, 2200);

  const grad2 = ctx.createRadialGradient(2000, 1100, 150, 2000, 1100, 800);
  grad2.addColorStop(0, 'rgba(236, 72, 153, 0.05)');
  grad2.addColorStop(0.6, 'rgba(168, 85, 247, 0.02)');
  grad2.addColorStop(1, 'transparent');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, 3200, 2200);

  // Twinkling Starfield
  for (let i = 0; i < 180; i++) {
    const starX = (i * 137.5) % 2800;
    const starY = (i * 269.3) % 2000;
    const size = (i % 3 === 0) ? 2.5 : (i % 2 === 0) ? 1.5 : 1;
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin((time / 1500) + i));

    ctx.fillStyle = i % 5 === 0 ? `rgba(186, 230, 253, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(starX, starY, size, size);
  }
}

function drawShipHull(ctx: CanvasRenderingContext2D, time: number) {
  // Outer Spaceship Hull silhouette
  ctx.save();
  ctx.fillStyle = '#060c18';
  ctx.beginPath();
  ctx.moveTo(60, 580);
  ctx.lineTo(240, 260);
  ctx.lineTo(600, 260);
  ctx.lineTo(960, 250);
  ctx.lineTo(1440, 250);
  ctx.lineTo(1560, 250);
  ctx.lineTo(1860, 250);
  ctx.lineTo(1960, 590);
  ctx.lineTo(2320, 620);
  ctx.lineTo(2320, 950);
  ctx.lineTo(1960, 970);
  ctx.lineTo(1930, 1330);
  ctx.lineTo(1540, 1450);
  ctx.lineTo(1250, 1450);
  ctx.lineTo(920, 1370);
  ctx.lineTo(570, 1350);
  ctx.lineTo(220, 1350);
  ctx.lineTo(40, 1030);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Engine Pod Nozzles (Far Left)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(10, 360, 210, 140);
  ctx.strokeRect(10, 360, 210, 140);
  ctx.fillRect(10, 1080, 210, 140);
  ctx.strokeRect(10, 1080, 210, 140);

  // Engine Plasma Flames
  const flamePulse = Math.sin(time / 80) * 12;
  const flameGradTop = ctx.createLinearGradient(10, 430, -70 - flamePulse, 430);
  flameGradTop.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
  flameGradTop.addColorStop(0.5, 'rgba(2, 132, 199, 0.5)');
  flameGradTop.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGradTop;
  ctx.beginPath();
  ctx.moveTo(10, 380);
  ctx.lineTo(-60 - flamePulse, 430);
  ctx.lineTo(10, 480);
  ctx.closePath();
  ctx.fill();

  const flameGradBot = ctx.createLinearGradient(10, 1150, -70 - flamePulse, 1150);
  flameGradBot.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
  flameGradBot.addColorStop(0.5, 'rgba(2, 132, 199, 0.5)');
  flameGradBot.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGradBot;
  ctx.beginPath();
  ctx.moveTo(10, 1100);
  ctx.lineTo(-60 - flamePulse, 1150);
  ctx.lineTo(10, 1200);
  ctx.closePath();
  ctx.fill();

  // Weapons Cannon Barrels (Top-Right)
  ctx.fillStyle = '#334155';
  ctx.fillRect(1840, 290, 70, 16);
  ctx.fillRect(1840, 360, 70, 16);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1840, 290, 70, 16);
  ctx.strokeRect(1840, 360, 70, 16);

  // Periodic Laser Blasts from Weapons
  const laserCycle = Math.floor(time / 2200) % 2 === 0;
  if (laserCycle && (time % 2200) < 320) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(1910, 298); ctx.lineTo(2300, 298);
    ctx.moveTo(1910, 368); ctx.lineTo(2300, 368);
    ctx.stroke();
    drawGlowCircle(ctx, 1910, 298, 12, 'rgba(239, 68, 68, 0.85)', 18);
    drawGlowCircle(ctx, 1910, 368, 12, 'rgba(239, 68, 68, 0.85)', 18);
  }
  ctx.restore();
}

function drawShipFloors(ctx: CanvasRenderingContext2D, time: number, activeSabotage?: ActiveSabotage | null) {
  // 1. Draw Corridors
  for (const corr of CORRIDORS) {
    ctx.fillStyle = '#1c2638';
    ctx.fillRect(corr.x, corr.y, corr.width, corr.height);

    ctx.strokeStyle = '#151e2d';
    ctx.lineWidth = 1.5;
    const tileSize = 50;

    for (let x = corr.x; x < corr.x + corr.width; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, corr.y); ctx.lineTo(x, corr.y + corr.height); ctx.stroke();
    }
    for (let y = corr.y; y < corr.y + corr.height; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(corr.x, y); ctx.lineTo(corr.x + corr.width, y); ctx.stroke();
    }

    // Floor Center Guide Line
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    if (corr.width >= corr.height) {
      ctx.fillRect(corr.x + 10, corr.y + corr.height / 2 - 2, corr.width - 20, 4);
    } else {
      ctx.fillRect(corr.x + corr.width / 2 - 2, corr.y + 10, 4, corr.height - 20);
    }
  }

  // 2. Draw Rooms with authentic Skeld colors
  for (const room of ROOMS) {
    ctx.fillStyle = room.color || '#212d40';
    ctx.fillRect(room.x, room.y, room.width, room.height);

    ctx.strokeStyle = '#172233';
    ctx.lineWidth = 2;
    const tileSize = 60;

    if (room.id === 'admin') {
      // Diamond tiling
      for (let x = room.x; x < room.x + room.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x + 40, room.y + 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 40, room.y); ctx.lineTo(x, room.y + 40); ctx.stroke();
      }
    } else if (room.id.includes('engine')) {
      // Grating lines
      ctx.strokeStyle = '#111827';
      for (let x = room.x; x < room.x + room.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.height); ctx.stroke();
      }
    } else {
      for (let x = room.x; x < room.x + room.width; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.height); ctx.stroke();
      }
      for (let y = room.y; y < room.y + room.height; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(room.x, y); ctx.lineTo(room.x + room.width, y); ctx.stroke();
      }
    }

    // Room Rivets
    ctx.fillStyle = '#0f172a';
    for (let x = room.x + 8; x < room.x + room.width; x += tileSize) {
      for (let y = room.y + 8; y < room.y + room.height; y += tileSize) {
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // Big Stencil Room Name on floor
    ctx.save();
    ctx.font = '900 24px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + room.height / 2 + 10);
    ctx.restore();
  }
}

function drawRoomDecals(ctx: CanvasRenderingContext2D, time: number) {
  const drawHazardTape = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#0f172a';
    for (let i = -h; i < w + h; i += 16) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + 8, y);
      ctx.lineTo(x + i + 8 - h, y + h);
      ctx.lineTo(x + i - h, y + h);
      ctx.fill();
    }
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  };

  // Doorway Hazard Stripes matching all 1:1 room openings
  drawHazardTape(930, 410, 40, 14); // Cafeteria West
  drawHazardTape(1430, 380, 40, 14); // Cafeteria East
  drawHazardTape(1160, 710, 80, 14); // Cafeteria South
  drawHazardTape(750, 490, 80, 14); // MedBay North
  drawHazardTape(360, 590, 80, 14); // Upper Engine South
  drawHazardTape(270, 770, 40, 14); // Reactor East
  drawHazardTape(560, 780, 40, 14); // Security West
  drawHazardTape(360, 1010, 80, 14); // Lower Engine North
  drawHazardTape(720, 1130, 80, 14); // Electrical South
  drawHazardTape(890, 1210, 40, 14); // Storage West
  drawHazardTape(1160, 930, 80, 14); // Storage North
  drawHazardTape(1290, 1110, 40, 14); // Storage East
  drawHazardTape(1320, 840, 40, 14); // Admin West
}

function drawCorridorDetails(ctx: CanvasRenderingContext2D, time: number) {
  for (const corr of CORRIDORS) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 3;

    if (corr.width > corr.height) {
      ctx.beginPath();
      ctx.moveTo(corr.x, corr.y + 8);
      ctx.lineTo(corr.x + corr.width, corr.y + 8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(corr.x + 8, corr.y);
      ctx.lineTo(corr.x + 8, corr.y + corr.height);
      ctx.stroke();
    }
  }
}

function drawDetailedRoomObjects(ctx: CanvasRenderingContext2D, time: number, localPlayer: Player) {
  // 1. CAFETERIA (Center: 1200, 500)
  // Large Central Meeting Table
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath(); ctx.ellipse(1200, 506, 95, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.beginPath(); ctx.ellipse(1200, 500, 90, 48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.ellipse(1200, 500, 70, 36, 0, 0, Math.PI * 2); ctx.fill();

  // 4 Dining Tables with chairs
  const drawDiningTable = (tx: number, ty: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath(); ctx.ellipse(tx, ty + 4, 38, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.ellipse(tx, ty, 35, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2; ctx.stroke();

    // Chairs around dining table
    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2;
      const cx = tx + Math.cos(angle) * 44;
      const cy = ty + Math.sin(angle) * 26;
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawDiningTable(1070, 380);
  drawDiningTable(1330, 380);
  drawDiningTable(1070, 610);
  drawDiningTable(1330, 610);

  // Vending Machines on Cafeteria North Wall
  ctx.fillStyle = '#dc2626'; ctx.fillRect(1120, 285, 36, 24); ctx.strokeRect(1120, 285, 36, 24);
  ctx.fillStyle = '#16a34a'; ctx.fillRect(1240, 285, 36, 24); ctx.strokeRect(1240, 285, 36, 24);

  // 2. WEAPONS (1560, 280, 280, 280)
  // Large Viewport Window into Space
  ctx.fillStyle = '#020617'; ctx.fillRect(1660, 285, 140, 18);
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = '#fff'; ctx.fillRect(1665 + Math.sin(i * 99) * 60 + 60, 288 + (i % 12), 2, 2);
  }
  // Dual Gunner Seats
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.arc(1740, 360, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(1740, 420, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Targeting Hologram Reticle
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(1800, 390, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1770, 390); ctx.lineTo(1830, 390); ctx.moveTo(1800, 360); ctx.lineTo(1800, 420); ctx.stroke();

  // 3. O2 (1460, 580, 200, 180)
  // Greenhouse Terrarium Dome
  const o2X = 1560; const o2Y = 670;
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(o2X, o2Y + 6, 46, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'; ctx.beginPath(); ctx.arc(o2X, o2Y, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.arc(o2X - 10, o2Y + 4, 14, 0, Math.PI * 2); ctx.arc(o2X + 10, o2Y + 2, 16, 0, Math.PI * 2); ctx.arc(o2X, o2Y - 10, 15, 0, Math.PI * 2); ctx.fill();

  // 4. NAVIGATION (1960, 620, 340, 320)
  // Celestial Galaxy Hologram in Center
  const navX = 2120; const navY = 780;
  const galaxyPulse = Math.sin(time / 300) * 0.2 + 0.8;
  ctx.strokeStyle = `rgba(168, 85, 247, ${galaxyPulse})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(navX, navY, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.translate(navX, navY); ctx.rotate(time / 900);
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 16, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Pilot Seats
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.ellipse(2240, 720, 16, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2240, 840, 16, 24, 0, 0, Math.PI * 2); ctx.fill();

  // 5. SHIELDS (1620, 1040, 300, 260)
  // Hexagonal Energy Shield Core
  const shX = 1770; const shY = 1170;
  ctx.fillStyle = '#0f172a'; ctx.beginPath();
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2; const hx = shX + Math.cos(angle) * 44; const hy = shY + Math.sin(angle) * 44;
    if (a === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const shieldGlow = Math.sin(time / 350) * 0.25 + 0.75;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.5 * shieldGlow})`;
  ctx.beginPath();
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2; const hx = shX + Math.cos(angle) * 32; const hy = shY + Math.sin(angle) * 32;
    if (a === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
  }
  ctx.closePath(); ctx.fill();

  // 6. COMMUNICATIONS (1280, 1240, 240, 180)
  // Radio Console & Audio Wave Display
  ctx.fillStyle = '#334155'; ctx.fillRect(1380, 1310, 80, 50); ctx.strokeRect(1380, 1310, 80, 50);
  ctx.fillStyle = '#022c22'; ctx.fillRect(1386, 1316, 68, 24); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let ox = 0; ox < 60; ox += 5) {
    const waveY = 1328 + Math.sin((time / 150) + ox * 0.3) * 6;
    if (ox === 0) ctx.moveTo(1390 + ox, waveY); else ctx.lineTo(1390 + ox, waveY);
  }
  ctx.stroke();

  // 7. STORAGE (920, 960, 380, 380)
  // Pile of shipping crates in Center
  const crates = [
    { x: 1060, y: 1100, w: 44, h: 44, col: '#78350f' },
    { x: 1110, y: 1100, w: 40, h: 40, col: '#92400e' },
    { x: 1080, y: 1148, w: 48, h: 44, col: '#78350f' },
    { x: 1040, y: 1190, w: 42, h: 42, col: '#475569' },
    { x: 1090, y: 1190, w: 40, h: 40, col: '#0284c7' },
  ];
  for (const c of crates) {
    ctx.fillStyle = c.col; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = '#0f172a'; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h); ctx.stroke();
  }
  // Fuel canisters
  ctx.fillStyle = '#eab308'; ctx.fillRect(1220, 1240, 24, 30); ctx.fillRect(1250, 1240, 24, 30);

  // 8. ADMIN (1340, 780, 300, 220)
  // Hologram Map Conference Table
  const adminTableX = 1490; const adminTableY = 890;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; ctx.beginPath(); ctx.ellipse(adminTableX, adminTableY + 6, 68, 36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(adminTableX, adminTableY, 65, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#064e3b'; ctx.beginPath(); ctx.ellipse(adminTableX, adminTableY, 48, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const radarAngle = (time / 1000) % (Math.PI * 2);
  ctx.strokeStyle = '#34d399'; ctx.beginPath(); ctx.moveTo(adminTableX, adminTableY); ctx.lineTo(adminTableX + Math.cos(radarAngle) * 44, adminTableY + Math.sin(radarAngle) * 18); ctx.stroke();

  // 9. ELECTRICAL (640, 920, 240, 220)
  // Central Transformer
  const elecX = 730; const elecY = 1000;
  ctx.fillStyle = '#334155'; ctx.fillRect(elecX, elecY, 60, 60); ctx.strokeRect(elecX, elecY, 60, 60);
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(elecX + 30, elecY + 10); ctx.lineTo(elecX + 50, elecY + 40); ctx.lineTo(elecX + 10, elecY + 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡', elecX + 30, elecY + 35);
  // Fuse boxes on North Wall
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#475569'; ctx.fillRect(660 + i * 45, 925, 30, 25); ctx.strokeRect(660 + i * 45, 925, 30, 25);
  }

  // 10 & 13. ENGINES (Upper: 240, 320 / Lower: 240, 1040)
  const drawEngineTurbine = (x: number, y: number) => {
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(x - 35, y - 40, 70, 80, 16); ctx.fill(); ctx.stroke();
    const enginePulse = Math.sin(time / 200 + x) * 0.2 + 0.8;
    const plasmaGrad = ctx.createRadialGradient(x, y, 5, x, y, 30);
    plasmaGrad.addColorStop(0, `rgba(56, 189, 248, ${0.95 * enginePulse})`);
    plasmaGrad.addColorStop(0.7, `rgba(2, 132, 199, ${0.55 * enginePulse})`);
    plasmaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plasmaGrad; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
  };
  drawEngineTurbine(400, 460);
  drawEngineTurbine(400, 1180);

  // 11. SECURITY (580, 720, 200, 200)
  // CCTV Monitoring Desk
  const secX = 640; const secY = 760;
  ctx.fillStyle = '#334155'; ctx.fillRect(secX - 30, secY, 70, 26); ctx.strokeRect(secX - 30, secY, 70, 26);
  const screens = [
    { x: secX - 25, y: secY - 22, w: 24, h: 16 }, { x: secX + 5, y: secY - 22, w: 24, h: 16 },
    { x: secX - 25, y: secY - 42, w: 24, h: 16 }, { x: secX + 5, y: secY - 42, w: 24, h: 16 },
  ];
  for (let sIdx = 0; sIdx < screens.length; sIdx++) {
    const scr = screens[sIdx];
    ctx.fillStyle = '#064e3b'; ctx.fillRect(scr.x, scr.y, scr.w, scr.h); ctx.strokeRect(scr.x, scr.y, scr.w, scr.h);
  }

  // 12. REACTOR (60, 640, 220, 360)
  // Antimatter Core in Center
  const reactorX = 170; const reactorY = 820;
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(reactorX, reactorY, 68, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const reactorPulse = Math.sin(time / 250) * 0.2 + 0.8;
  const coreGrad = ctx.createRadialGradient(reactorX, reactorY, 10, reactorX, reactorY, 60);
  coreGrad.addColorStop(0, `rgba(56, 189, 248, ${0.95 * reactorPulse})`);
  coreGrad.addColorStop(0.6, `rgba(14, 165, 233, ${0.65 * reactorPulse})`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(reactorX, reactorY, 60, 0, Math.PI * 2); ctx.fill();

  // 14. MEDBAY (680, 500, 260, 260)
  // Hologram Scan Pad at Bottom-Right
  const scanPadX = 840; const scanPadY = 680;
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(scanPadX, scanPadY, 40, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const medbayPulse = Math.sin(time / 250) * 0.25 + 0.75;
  ctx.strokeStyle = `rgba(52, 211, 153, ${medbayPulse})`; ctx.beginPath(); ctx.ellipse(scanPadX, scanPadY, 30, 16, 0, 0, Math.PI * 2); ctx.stroke();
  // 3 Hospital Beds along West Wall (leaves doorway completely open)
  const beds = [{ x: 700, y: 560 }, { x: 700, y: 620 }, { x: 700, y: 680 }];
  for (const bed of beds) {
    ctx.fillStyle = '#334155'; ctx.fillRect(bed.x - 18, bed.y - 14, 36, 28); ctx.strokeRect(bed.x - 18, bed.y - 14, 36, 28);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(bed.x - 10, bed.y - 12, 26, 24);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(bed.x - 16, bed.y - 10, 8, 20);
  }
}

function drawEmergencyButton(ctx: CanvasRenderingContext2D, localPlayer: Player, time: number) {
  const { x, y, radius } = EMERGENCY_BUTTON_POS;
  const dist = Math.hypot(localPlayer.x - x, localPlayer.y - y);
  const isNearby = dist <= radius + 55;

  ctx.save();
  // Button Base
  ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = isNearby ? '#ef4444' : '#0f172a'; ctx.lineWidth = isNearby ? 4 : 2; ctx.stroke();

  // Glass Dome
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'; ctx.beginPath(); ctx.arc(x, y, radius - 6, 0, Math.PI * 2); ctx.fill();

  // Red Center Plunger Button
  const btnPulse = isNearby ? Math.sin(time / 150) * 2 : 0;
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x, y, radius - 16 + btnPulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2; ctx.stroke();

  if (isNearby) {
    drawGlowCircle(ctx, x, y, radius - 16, 'rgba(239, 68, 68, 0.4)', 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('USE [SPACE]', x, y - radius - 12);
  }
  ctx.restore();
}

function drawVents(ctx: CanvasRenderingContext2D, localPlayer: Player, time: number) {
  const isImpostor = localPlayer.role === 'impostor';

  for (const vent of VENTS) {
    const dist = Math.hypot(localPlayer.x - vent.x, localPlayer.y - vent.y);
    const isNearby = dist <= 60;

    ctx.save();
    // Metal Rim
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.roundRect(vent.x - 22, vent.y - 15, 44, 30, 4); ctx.fill();
    ctx.strokeStyle = isImpostor && isNearby ? '#ef4444' : '#0f172a'; ctx.lineWidth = isImpostor && isNearby ? 3 : 1.5; ctx.stroke();

    // Dark Vent Slits
    ctx.fillStyle = '#0f172a';
    for (let i = -10; i <= 10; i += 7) {
      ctx.fillRect(vent.x - 16, vent.y + i - 1.5, 32, 3);
    }

    if (isImpostor && isNearby) {
      drawGlowCircle(ctx, vent.x, vent.y, 22, 'rgba(239, 68, 68, 0.35)', 12);
    }
    ctx.restore();
  }
}

function drawTaskStations(
  ctx: CanvasRenderingContext2D,
  localPlayer: Player,
  activeTaskId: string | null,
  time: number
) {
  const isAlive = localPlayer.isAlive;

  for (const task of ALL_TASKS) {
    const dist = Math.hypot(localPlayer.x - task.x, localPlayer.y - task.y);
    const isNearby = dist <= 65;

    ctx.save();
    // Glowing task pedestal indicator
    const pulse = Math.sin(time / 200) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(234, 179, 8, ${0.35 * pulse})`;
    ctx.beginPath(); ctx.arc(task.x, task.y, 16, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(task.x, task.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2; ctx.stroke();

    if (isNearby && isAlive) {
      drawGlowCircle(ctx, task.x, task.y, 14, 'rgba(234, 179, 8, 0.8)', 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(task.name, task.x, task.y - 18);
    }
    ctx.restore();
  }
}

function drawSecurityCameras(ctx: CanvasRenderingContext2D, isSecurityCamActive: boolean, time: number) {
  for (const cam of SECURITY_CAMERAS) {
    ctx.save();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();

    // Red Blinking Lens when watched
    if (isSecurityCamActive) {
      const blink = Math.sin(time / 150) > 0;
      if (blink) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2); ctx.fill();
        drawGlowCircle(ctx, cam.x, cam.y, 5, 'rgba(239, 68, 68, 0.8)', 10);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.beginPath(); ctx.arc(cam.x, cam.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawLockedDoors(ctx: CanvasRenderingContext2D, lockedDoors: Record<string, number>, time: number) {
  const now = Date.now();
  for (const [roomKey, expiry] of Object.entries(lockedDoors)) {
    if (expiry > now) {
      const normalizedKey = roomKey.toLowerCase().replace(/\s+/g, '_');
      const doorList = LOCKED_DOOR_WALLS[normalizedKey] || LOCKED_DOOR_WALLS[roomKey.toLowerCase()];
      if (doorList) {
        for (const door of doorList) {
          ctx.save();
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(door.x, door.y, door.width, door.height);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(door.x, door.y, door.width, door.height);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('LOCKED', door.x + door.width / 2, door.y + door.height / 2 + 3);
          ctx.restore();
        }
      }
    }
  }
}

function drawDeadBodies(
  ctx: CanvasRenderingContext2D,
  deadBodies: DeadBody[],
  localPlayer: Player,
  time: number,
  activeSabotage?: ActiveSabotage | null,
  lockedDoors?: Record<string, number>
) {
  const isLocalGhost = !localPlayer.isAlive;
  const isLightsOut = activeSabotage?.type === 'lights';
  const visionRadius = localPlayer.role === 'impostor' ? 380 : isLightsOut ? 110 : 280;

  for (const body of deadBodies) {
    if (body.reported) continue;

    const dist = Math.hypot(body.x - localPlayer.x, body.y - localPlayer.y);
    if (!isLocalGhost) {
      if (dist > visionRadius) continue;
      if (!hasLineOfSight(localPlayer.x, localPlayer.y, body.x, body.y, lockedDoors)) continue;
    }

    const colInfo = PLAYER_COLORS.find((c) => c.id === body.color) || PLAYER_COLORS[0];

    ctx.save();
    ctx.translate(body.x, body.y);

    // Blood Pool
    ctx.fillStyle = 'rgba(185, 28, 28, 0.8)';
    ctx.beginPath(); ctx.ellipse(0, 10, 24, 14, 0, 0, Math.PI * 2); ctx.fill();

    // Lower half of body
    ctx.fillStyle = colInfo.hex;
    ctx.beginPath(); ctx.roundRect(-14, -6, 28, 20, [0, 0, 8, 8]); ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5; ctx.stroke();

    // Bone sticking out
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-3, -16, 6, 12);
    ctx.beginPath(); ctx.arc(-3, -16, 4, 0, Math.PI * 2); ctx.arc(3, -16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  players: Record<string, Player>,
  localPlayer: Player,
  time: number,
  activeSabotage?: ActiveSabotage | null,
  lockedDoors?: Record<string, number>
) {
  const isLocalGhost = !localPlayer.isAlive;
  const isLightsOut = activeSabotage?.type === 'lights';
  const visionRadius = localPlayer.role === 'impostor' ? 380 : isLightsOut ? 110 : 280;

  const sortedPlayers = Object.values(players).sort((a, b) => a.y - b.y);

  for (const player of sortedPlayers) {
    if (player.inVent) continue;

    const isSelf = player.id === localPlayer.id;
    const dist = Math.hypot(player.x - localPlayer.x, player.y - localPlayer.y);

    // Ghost visibility: only other ghosts can see ghosts (and self)
    if (!player.isAlive) {
      if (!isLocalGhost && !isSelf) continue;
    } else {
      // Living player visibility by LOS
      if (!isLocalGhost && !isSelf) {
        if (dist > visionRadius) continue;
        if (!hasLineOfSight(localPlayer.x, localPlayer.y, player.x, player.y, lockedDoors)) continue;
      }
    }

    const colInfo = PLAYER_COLORS.find((c) => c.id === player.color) || PLAYER_COLORS[0];

    ctx.save();
    ctx.translate(player.x, player.y);

    if (!player.isAlive) {
      ctx.globalAlpha = 0.55;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath(); ctx.ellipse(0, 18, 14, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Backpack
    ctx.fillStyle = colInfo.shadow;
    ctx.beginPath(); ctx.roundRect(-18, -8, 8, 18, 4); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.stroke();

    // Crewmate Body
    ctx.fillStyle = colInfo.hex;
    ctx.beginPath(); ctx.roundRect(-12, -18, 24, 32, [12, 12, 6, 6]); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.stroke();

    // Visor Glass
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath(); ctx.roundRect(2, -12, 14, 10, 5); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(6, -10, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();

    // Hat
    if (player.hat && player.hat !== 'none') {
      drawPlayerCanvasHat(ctx, player.hat, !player.isAlive);
    }

    // Player Name Tag
    ctx.fillStyle = player.role === 'impostor' && localPlayer.role === 'impostor' ? '#ef4444' : '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, 0, -26);

    ctx.restore();
  }
}

function drawPlayerCanvasHat(ctx: CanvasRenderingContext2D, hat?: HatType, isGhost?: boolean) {
  if (!hat || hat === 'none') return;
  ctx.save();
  ctx.translate(0, -18);

  if (hat === 'party') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -18); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (hat === 'beanie') {
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(0, -2, 12, Math.PI, 0); ctx.fill();
    ctx.stroke();
  } else if (hat === 'crown') {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-10, -12); ctx.lineTo(-5, -6); ctx.lineTo(0, -14); ctx.lineTo(5, -6); ctx.lineTo(10, -12); ctx.lineTo(10, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (hat === 'tophat') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, -2, 24, 4); ctx.fillRect(-8, -16, 16, 14); ctx.stroke();
  } else if (hat === 'viking') {
    ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-16, -10); ctx.lineTo(-8, -4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(16, -10); ctx.lineTo(8, -4); ctx.fill();
  } else {
    // Default cap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.lineTo(12, 0); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawWallsAndBulkheads(ctx: CanvasRenderingContext2D, time: number) {
  for (const wall of WALLS) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(wall.x, wall.y + 8, wall.width, wall.height);

    ctx.fillStyle = wall.isObstacle ? '#273549' : '#1e293b';
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

    ctx.fillStyle = wall.isObstacle ? '#3b4c63' : '#334155';
    ctx.fillRect(wall.x, wall.y, wall.width, Math.min(6, wall.height));

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

    if (wall.width > 30 && wall.height > 30) {
      // Rivets on structural pillars
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wall.x + 4, wall.y + 10, 2, 2);
      ctx.fillRect(wall.x + wall.width - 6, wall.y + 10, 2, 2);
      ctx.fillRect(wall.x + 4, wall.y + wall.height - 6, 2, 2);
      ctx.fillRect(wall.x + wall.width - 6, wall.y + wall.height - 6, 2, 2);
    }
  }
}

function drawDynamicLighting(
  ctx: CanvasRenderingContext2D,
  localPlayer: Player,
  activeSabotage: ActiveSabotage | null | undefined,
  time: number
) {
  const isGhost = !localPlayer.isAlive;
  if (isGhost) return; // Ghosts see all

  const isLightsOut = activeSabotage?.type === 'lights';
  const isImpostor = localPlayer.role === 'impostor';
  const visionRadius = isImpostor ? 400 : isLightsOut ? 120 : 300;

  ctx.save();
  // Draw gradient perfectly centered on player in world space
  const vignette = ctx.createRadialGradient(
    localPlayer.x,
    localPlayer.y,
    visionRadius * 0.45,
    localPlayer.x,
    localPlayer.y,
    visionRadius * 1.25
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.75, 'rgba(0, 0, 0, 0.45)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.96)');

  ctx.fillStyle = vignette;
  ctx.fillRect(-2000, -2000, 6400, 5600);

  // Red Crisis Alarm Strobe during critical sabotage
  if (activeSabotage && (activeSabotage.type === 'reactor' || activeSabotage.type === 'o2')) {
    const strobe = (Math.sin(time / 180) + 1) / 2;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.15 * strobe})`;
    ctx.fillRect(-2000, -2000, 6400, 5600);
  }
  ctx.restore();
}

interface SabotageTarget {
  name: string;
  x: number;
  y: number;
  label: string;
  isCritical: boolean;
}

function getSabotageTargets(activeSabotage?: ActiveSabotage | null): SabotageTarget[] {
  if (!activeSabotage) return [];

  if (activeSabotage.type === 'reactor') {
    return [
      { name: 'Reaktor (Oben)', x: 100, y: 720, label: 'REAKTOR (OBEN)', isCritical: true },
      { name: 'Reaktor (Unten)', x: 100, y: 920, label: 'REAKTOR (UNTEN)', isCritical: true },
    ];
  }

  if (activeSabotage.type === 'o2') {
    return [
      { name: 'O2 Raum', x: 1520, y: 620, label: 'O2 RAUM', isCritical: true },
      { name: 'Admin Raum', x: 1590, y: 820, label: 'ADMIN O2', isCritical: true },
    ];
  }

  if (activeSabotage.type === 'lights') {
    return [
      { name: 'Elektrik', x: 760, y: 1080, label: 'LICHTER REPARIEREN', isCritical: false },
    ];
  }

  if (activeSabotage.type === 'comms') {
    return [
      { name: 'Funkraum', x: 1450, y: 1350, label: 'FUNK REPARIEREN', isCritical: false },
    ];
  }

  return [];
}

function drawSabotageBeacons(
  ctx: CanvasRenderingContext2D,
  activeSabotage: ActiveSabotage | null | undefined,
  time: number
) {
  const targets = getSabotageTargets(activeSabotage);
  for (const tgt of targets) {
    ctx.save();
    const pulse = (time / 600) % 1;
    const radius = 10 + pulse * 45;
    const alpha = (1 - pulse) * 0.85;

    ctx.strokeStyle = tgt.isCritical ? `rgba(239, 68, 68, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, radius, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = tgt.isCritical ? '#ef4444' : '#f59e0b';
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawSabotageDirectionalArrows(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  localPlayer: Player,
  activeSabotage: ActiveSabotage | null | undefined,
  time: number
) {
  const targets = getSabotageTargets(activeSabotage);
  if (targets.length === 0) return;

  const screenCenterX = canvasWidth / 2;
  const screenCenterY = canvasHeight / 2;

  for (const tgt of targets) {
    const dx = tgt.x - localPlayer.x;
    const dy = tgt.y - localPlayer.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 150) continue;

    const angle = Math.atan2(dy, dx);
    const arrowMargin = 60;
    const arrowDist = Math.min(canvasWidth / 2 - arrowMargin, canvasHeight / 2 - arrowMargin, 260);

    const arrowX = screenCenterX + Math.cos(angle) * arrowDist;
    const arrowY = screenCenterY + Math.sin(angle) * arrowDist;

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);

    ctx.fillStyle = tgt.isCritical ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
