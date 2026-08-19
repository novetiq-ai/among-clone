import { ROOMS, CORRIDORS, WALLS, ALL_TASKS, VENTS, EMERGENCY_BUTTON_POS, SECURITY_CAMERAS, LOCKED_DOOR_WALLS } from '@/lib/map-data';
import { Player, DeadBody, PLAYER_COLORS, ActiveSabotage, HatType } from '@/types/game';

// Helper for rendering glowing circular items
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

/**
 * 2D Raycast Line-Of-Sight Helper:
 * Tests if the straight line between (x1, y1) and (x2, y2) intersects any solid structural wall.
 */
function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  // Fast AABB bounding check
  if (maxX < bx || minX > bx + bw || maxY < by || minY > by + bh) {
    return false;
  }

  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);

  const intersect = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number
  ) =>
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);

  return (
    intersect(x1, y1, x2, y2, bx, by, bx + bw, by) ||
    intersect(x1, y1, x2, y2, bx + bw, by, bx + bw, by + bh) ||
    intersect(x1, y1, x2, y2, bx + bw, by + bh, bx, by + bh) ||
    intersect(x1, y1, x2, y2, bx, by + bh, bx, by)
  );
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lockedDoors?: Record<string, number>
): boolean {
  for (const wall of WALLS) {
    if (wall.isObstacle) continue; // Furniture doesn't block LOS
    if (lineIntersectsBox(x1, y1, x2, y2, wall.x, wall.y, wall.width, wall.height)) {
      return false;
    }
  }

  // Active locked doors also block line of sight
  if (lockedDoors) {
    const now = Date.now();
    for (const [roomKey, expiry] of Object.entries(lockedDoors)) {
      if (expiry > now) {
        const normalizedKey = roomKey.toLowerCase().replace(/\s+/g, '_');
        const doorList = LOCKED_DOOR_WALLS[normalizedKey] || LOCKED_DOOR_WALLS[roomKey.toLowerCase()];
        if (doorList) {
          for (const doorWall of doorList) {
            if (lineIntersectsBox(x1, y1, x2, y2, doorWall.x, doorWall.y, doorWall.width, doorWall.height)) {
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
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const time = typeof performance !== 'undefined' ? performance.now() : 0;

  // 2. Draw Space Environment with Parallax (0.2x translation for deep cosmic depth)
  ctx.save();
  ctx.translate(-viewX * 0.2, -viewY * 0.2);
  drawDeepSpace(ctx, time);
  ctx.restore();

  // Apply Camera translation for The Skeld ship interior
  ctx.translate(-viewX, -viewY);

  // 3. Draw Outer Spaceship Hull & Silhouette
  drawShipHull(ctx, time);

  // 4. Draw Room Floors & Hallways with authentic Skeld panels
  drawShipFloors(ctx, time, activeSabotage);

  // 5. Draw Hazard Stripes & Room Decals
  drawRoomDecals(ctx, time);

  // 6. Draw Detailed Room Furniture & Machines (Cafeteria, Reactor, Engines, Admin, Medbay, Shields, etc.)
  drawDetailedRoomObjects(ctx, time, localPlayer);

  // 7. Draw Vents
  drawVents(ctx, localPlayer, time);

  // 8. Draw Security Cameras on Hallway Walls
  drawSecurityCameras(ctx, isSecurityCamActive || false, time);

  // 9. Draw Locked Doors (if door sabotage active)
  if (lockedDoors) {
    drawLockedDoors(ctx, lockedDoors, time);
  }

  // 10. Draw Task Stations with Glowing Interactive Prompts
  drawTaskStations(ctx, localPlayer, activeTaskId, time);

  // 11. Draw Emergency Button in Cafeteria
  drawEmergencyButton(ctx, localPlayer, time);

  // 12. Draw Dead Bodies on the floor (filtered by Line of Sight)
  drawDeadBodies(ctx, deadBodies, localPlayer, time, activeSabotage, lockedDoors);

  // 13. Draw Players (Living & Ghost Crewmates, filtered by Line of Sight)
  drawPlayers(ctx, players, localPlayer, time, activeSabotage, lockedDoors);


  // 14. Draw Solid Ship Walls & Structural Bulkheads (drawn over players for realistic 2.5D occlusion)
  drawWallsAndBulkheads(ctx, time);

  // 15. Dynamic Vision & Lighting (Fog of War / Flashlight Vignette / Alarm Strobes)
  ctx.restore(); // Restore camera translation to screen space
  drawDynamicLighting(ctx, canvasWidth, canvasHeight, localPlayer, activeSabotage, time);
}

// Deep Space starfield with nebulae, floating asteroids & twinkling stars
function drawDeepSpace(ctx: CanvasRenderingContext2D, time: number) {
  // Nebula gas glows
  const nebulae = [
    { x: 350, y: 180, r: 350, col: 'rgba(56, 189, 248, 0.06)' },
    { x: 2150, y: 250, r: 400, col: 'rgba(168, 85, 247, 0.07)' },
    { x: 1200, y: 1550, r: 320, col: 'rgba(236, 72, 153, 0.05)' },
    { x: 120, y: 1150, r: 300, col: 'rgba(59, 130, 246, 0.06)' },
    { x: 1800, y: 1450, r: 350, col: 'rgba(20, 184, 166, 0.05)' },
  ];

  for (const n of nebulae) {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    grad.addColorStop(0, n.col);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Multi-layered Stars
  const stars = [
    [80, 120, 1.5, 0.6], [320, 70, 2, 0.8], [720, 160, 1, 0.5], [1120, 80, 2.5, 0.9],
    [1620, 200, 1.5, 0.7], [2020, 110, 2, 0.6], [2280, 230, 1, 0.4], [40, 420, 2, 0.7],
    [2360, 460, 1.5, 0.8], [50, 1120, 1.5, 0.5], [2330, 1160, 2, 0.7], [320, 1530, 1, 0.4],
    [720, 1490, 2.5, 0.9], [1320, 1550, 1.5, 0.6], [1820, 1510, 2, 0.7], [2260, 1430, 1.5, 0.5],
    [480, 40, 1, 0.5], [1420, 50, 2, 0.8], [1920, 70, 1, 0.4], [90, 780, 2.5, 0.9],
    [2390, 830, 1.5, 0.7], [980, 1570, 1, 0.6], [1580, 1580, 2, 0.8], [1250, 220, 1.5, 0.5],
    [1750, 120, 1, 0.6], [2100, 540, 2, 0.8], [2300, 950, 1.5, 0.6]
  ];

  for (let i = 0; i < stars.length; i++) {
    const [sx, sy, size, baseAlpha] = stars[i];
    const twinkle = Math.sin((time / 500) + i * 1.6) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha * twinkle})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating asteroids outside the ship
  const asteroidTime = time * 0.015;
  const asteroids = [
    { baseX: 1800, baseY: 180, r: 24, speed: 0.8, rot: asteroidTime * 0.05 },
    { baseX: 2200, baseY: 420, r: 16, speed: 1.2, rot: -asteroidTime * 0.08 },
    { baseX: 200, baseY: 220, r: 28, speed: 0.6, rot: asteroidTime * 0.03 },
    { baseX: 1600, baseY: 1520, r: 20, speed: 0.9, rot: -asteroidTime * 0.04 },
  ];

  for (const a of asteroids) {
    const curX = ((a.baseX + asteroidTime * a.speed) % 2600) - 100;
    const curY = a.baseY + Math.sin(asteroidTime * 0.05 + a.r) * 12;

    ctx.save();
    ctx.translate(curX, curY);
    ctx.rotate(a.rot);

    // Asteroid Body
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(a.r, 0);
    ctx.lineTo(a.r * 0.7, a.r * 0.8);
    ctx.lineTo(-a.r * 0.4, a.r * 0.9);
    ctx.lineTo(-a.r * 0.9, a.r * 0.3);
    ctx.lineTo(-a.r * 0.8, -a.r * 0.7);
    ctx.lineTo(a.r * 0.3, -a.r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Asteroid Craters
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(a.r * 0.2, a.r * 0.2, a.r * 0.25, 0, Math.PI * 2);
    ctx.arc(-a.r * 0.3, -a.r * 0.2, a.r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Outer Ship Hull Silhouette & Realistic Spaceship Outlines
function drawShipHull(ctx: CanvasRenderingContext2D, time: number) {
  // Deep Navy Exterior Armor Plate
  ctx.fillStyle = '#0b1120';
  ctx.beginPath();
  // Complex spaceship contour
  ctx.roundRect(50, 320, 2300, 1220, 48);
  ctx.fill();

  // Left Rear Thruster Engine Pods
  ctx.fillStyle = '#1e293b';
  // Top Engine Nozzle
  ctx.beginPath();
  ctx.roundRect(10, 420, 60, 160, [16, 0, 0, 16]);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bottom Engine Nozzle
  ctx.beginPath();
  ctx.roundRect(10, 1140, 60, 160, [16, 0, 0, 16]);
  ctx.fill();
  ctx.stroke();

  // Engine exhaust flame plumes
  const flamePulse = Math.sin(time / 100) * 8;
  const flameGradTop = ctx.createLinearGradient(10, 500, -50 - flamePulse, 500);
  flameGradTop.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
  flameGradTop.addColorStop(0.5, 'rgba(2, 132, 199, 0.4)');
  flameGradTop.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGradTop;
  ctx.beginPath();
  ctx.moveTo(10, 440);
  ctx.lineTo(-40 - flamePulse, 500);
  ctx.lineTo(10, 560);
  ctx.closePath();
  ctx.fill();

  const flameGradBottom = ctx.createLinearGradient(10, 1220, -50 - flamePulse, 1220);
  flameGradBottom.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
  flameGradBottom.addColorStop(0.5, 'rgba(2, 132, 199, 0.4)');
  flameGradBottom.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGradBottom;
  ctx.beginPath();
  ctx.moveTo(10, 1160);
  ctx.lineTo(-40 - flamePulse, 1220);
  ctx.lineTo(10, 1280);
  ctx.closePath();
  ctx.fill();

  // Weapons Cannon Barrels outside the ship hull (Top-Right)
  ctx.fillStyle = '#334155';
  ctx.fillRect(1980, 460, 70, 14);
  ctx.fillRect(1980, 530, 70, 14);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1980, 460, 70, 14);
  ctx.strokeRect(1980, 530, 70, 14);

  // Periodic laser blast from Weapons
  const laserCycle = Math.floor(time / 2000) % 2 === 0;
  if (laserCycle && (time % 2000) < 300) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2050, 467);
    ctx.lineTo(2350, 467);
    ctx.moveTo(2050, 537);
    ctx.lineTo(2350, 537);
    ctx.stroke();
    drawGlowCircle(ctx, 2050, 467, 10, 'rgba(239, 68, 68, 0.8)', 15);
    drawGlowCircle(ctx, 2050, 537, 10, 'rgba(239, 68, 68, 0.8)', 15);
  }
}

// Floors & Room Panels
function drawShipFloors(ctx: CanvasRenderingContext2D, time: number, activeSabotage?: ActiveSabotage | null) {
  // 1. Draw Hallway connections from CORRIDORS
  for (const corr of CORRIDORS) {
    ctx.fillStyle = '#1c2638';
    ctx.fillRect(corr.x, corr.y, corr.width, corr.height);

    // Floor tile grid on corridors
    ctx.strokeStyle = '#151e2d';
    ctx.lineWidth = 1.5;
    const tileSize = 50;

    for (let x = corr.x; x < corr.x + corr.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, corr.y);
      ctx.lineTo(x, corr.y + corr.height);
      ctx.stroke();
    }
    for (let y = corr.y; y < corr.y + corr.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(corr.x, y);
      ctx.lineTo(corr.x + corr.width, y);
      ctx.stroke();
    }

    // Corridor centerline guidance lights
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    if (corr.width >= corr.height) {
      // Horizontal corridor light strip
      ctx.fillRect(corr.x + 10, corr.y + corr.height / 2 - 2, corr.width - 20, 4);
    } else {
      // Vertical corridor light strip
      ctx.fillRect(corr.x + corr.width / 2 - 2, corr.y + 10, 4, corr.height - 20);
    }
  }

  // 2. Render Rooms
  for (const room of ROOMS) {
    // Room base floor
    ctx.fillStyle = '#212d40';
    ctx.fillRect(room.x, room.y, room.width, room.height);

    // Floor tile grid (metallic floor plates)
    ctx.strokeStyle = '#172233';
    ctx.lineWidth = 2;
    const tileSize = 60;

    for (let x = room.x; x < room.x + room.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, room.y);
      ctx.lineTo(x, room.y + room.height);
      ctx.stroke();
    }
    for (let y = room.y; y < room.y + room.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(room.x, y);
      ctx.lineTo(room.x + room.width, y);
      ctx.stroke();
    }

    // Floor Plate Rivets
    ctx.fillStyle = '#111927';
    for (let x = room.x + 8; x < room.x + room.width; x += tileSize) {
      for (let y = room.y + 8; y < room.y + room.height; y += tileSize) {
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // Room Label on the floor (authentic subtle stencil typography)
    ctx.save();
    ctx.font = '900 24px ui-monospace, SFMono-Regular, "Courier New", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText(room.name.toUpperCase(), room.x + room.width / 2, room.y + room.height / 2 + 10);
    ctx.restore();
  }
}

// Hazard stripes & room decals
function drawRoomDecals(ctx: CanvasRenderingContext2D, time: number) {
  // Function to draw hazard tape (Yellow & Black diagonal stripes)
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

  // Hazard stripes at Reactor entrances
  drawHazardTape(100, 640, 90, 14);
  drawHazardTape(100, 1046, 90, 14);

  // Hazard stripes at Electrical entrance
  drawHazardTape(640, 940, 90, 14);

  // Hazard stripes at Storage thresholds
  drawHazardTape(920, 1040, 100, 14);
  drawHazardTape(1300, 1040, 100, 14);

  // Hazard stripes at Shields
  drawHazardTape(1600, 1080, 90, 14);

  // Hazard stripes at Navigation
  drawHazardTape(1960, 680, 80, 14);
}

// Detailed Room Objects (Cafeteria, Reactor, Engines, Admin, Medbay, Shields, etc.)
function drawDetailedRoomObjects(ctx: CanvasRenderingContext2D, time: number, localPlayer: Player) {
  // ----------------------------------------------------
  // 1. CAFETERIA: Iconic Large Table & Observation Windows
  // ----------------------------------------------------
  // Observation Window looking into space at top of Cafeteria
  ctx.fillStyle = '#040714';
  ctx.fillRect(1080, 430, 240, 20);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(1080, 430, 240, 20);
  // Window Glass shine
  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.fillRect(1080, 430, 240, 20);

  // Drop shadow of cafeteria table
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(1200, 648, 98, 56, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer Table Surface (metallic dark slate)
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(1200, 640, 95, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Inner Table Inset (cyan-tinted metallic core)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(1200, 640, 75, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 10 Round Metal Chairs around Cafeteria Table
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const cx = 1200 + Math.cos(angle) * 122;
    const cy = 640 + Math.sin(angle) * 68;

    // Chair shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chair cushion
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 2 Side Cafeteria Dining Tables
  const drawSideTable = (tx: number, ty: number) => {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(tx - 30, ty - 18, 60, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Drinks / plates
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(tx - 12, ty - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(tx + 10, ty + 2, 6, 0, Math.PI * 2);
    ctx.fill();
  };
  drawSideTable(980, 560);
  drawSideTable(1360, 560);

  // ----------------------------------------------------
  // 2. REACTOR: Giant Pulsing Core & Manifolds
  // ----------------------------------------------------
  const reactorX = 250;
  const reactorY = 840;

  // Reactor Outer Chamber Housing
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(reactorX, reactorY, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Pulsing Antimatter Core Glow
  const reactorPulse = Math.sin(time / 250) * 0.2 + 0.8;
  const coreGrad = ctx.createRadialGradient(reactorX, reactorY, 10, reactorX, reactorY, 68);
  coreGrad.addColorStop(0, `rgba(56, 189, 248, ${0.95 * reactorPulse})`);
  coreGrad.addColorStop(0.6, `rgba(14, 165, 233, ${0.65 * reactorPulse})`);
  coreGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(reactorX, reactorY, 68, 0, Math.PI * 2);
  ctx.fill();

  // Rotating Containment Ring
  ctx.save();
  ctx.translate(reactorX, reactorY);
  ctx.rotate(time / 1200);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(-6, -45, 12, 6);
  ctx.fillRect(-6, 39, 12, 6);
  ctx.restore();

  // High-Voltage Cooling Pipes
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(reactorX, reactorY - 78);
  ctx.lineTo(reactorX, 640);
  ctx.moveTo(reactorX, reactorY + 78);
  ctx.lineTo(reactorX, 1040);
  ctx.stroke();

  // ----------------------------------------------------
  // 3. UPPER & LOWER ENGINES: Plasma Turbines
  // ----------------------------------------------------
  const drawEngineTurbine = (x: number, y: number) => {
    // Outer Engine Housing
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x - 35, y - 40, 70, 80, 16);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Plasma Chamber Glow
    const enginePulse = Math.sin(time / 200 + x) * 0.2 + 0.8;
    const plasmaGrad = ctx.createRadialGradient(x, y, 5, x, y, 30);
    plasmaGrad.addColorStop(0, `rgba(56, 189, 248, ${0.95 * enginePulse})`);
    plasmaGrad.addColorStop(0.7, `rgba(2, 132, 199, ${0.55 * enginePulse})`);
    plasmaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plasmaGrad;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Spinning steel turbine fins
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const rotAngle = a + (time / 600);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(rotAngle) * 26, y + Math.sin(rotAngle) * 26);
      ctx.stroke();
    }
  };

  drawEngineTurbine(435, 500); // Upper Engine
  drawEngineTurbine(435, 1240); // Lower Engine

  // ----------------------------------------------------
  // 4. MEDBAY: Holographic Medical Scanner Platform & Beds
  // ----------------------------------------------------
  const scanPadX = 860;
  const scanPadY = 500;

  // Platform Base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(scanPadX, scanPadY, 44, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Animated Concentric Hologram Rings & Scanning Laser
  const medbayPulse = Math.sin(time / 250) * 0.25 + 0.75;
  ctx.strokeStyle = `rgba(52, 211, 153, ${medbayPulse})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(scanPadX, scanPadY, 34, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(scanPadX, scanPadY, 18, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Vertical Holo-Light Scanning Column
  const scanGrad = ctx.createLinearGradient(scanPadX, scanPadY - 40, scanPadX, scanPadY);
  scanGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
  scanGrad.addColorStop(1, `rgba(52, 211, 153, ${0.35 * medbayPulse})`);
  ctx.fillStyle = scanGrad;
  ctx.fillRect(scanPadX - 25, scanPadY - 40, 50, 40);

  // 2 Hospital Examination Beds
  const beds = [
    { x: 670, y: 380 },
    { x: 740, y: 380 },
  ];
  for (const bed of beds) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(bed.x - 16, bed.y - 20, 32, 40);
    ctx.fillStyle = '#0284c7'; // Blue sheets
    ctx.fillRect(bed.x - 14, bed.y - 8, 28, 26);
    ctx.fillStyle = '#f8fafc'; // Pillow
    ctx.fillRect(bed.x - 12, bed.y - 18, 24, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(bed.x - 16, bed.y - 20, 32, 40);
  }

  // ----------------------------------------------------
  // 5. ADMIN: Large Oval Map Table & Status Display
  // ----------------------------------------------------
  const adminTableX = 1650;
  const adminTableY = 1020;

  // Admin Table Shadow & Body
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(adminTableX, adminTableY + 6, 68, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(adminTableX, adminTableY, 65, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Table screen (Green radar map)
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.ellipse(adminTableX, adminTableY, 48, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Radar sweep line on admin table
  const radarAngle = (time / 1000) % (Math.PI * 2);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(adminTableX, adminTableY);
  ctx.lineTo(adminTableX + Math.cos(radarAngle) * 44, adminTableY + Math.sin(radarAngle) * 18);
  ctx.stroke();

  // ----------------------------------------------------
  // 6. SHIELDS: Glowing Hexagonal Energy Shield Core
  // ----------------------------------------------------
  const shieldsX = 1780;
  const shieldsY = 1305;

  // Shield Hexagon Base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2;
    const hx = shieldsX + Math.cos(angle) * 44;
    const hy = shieldsY + Math.sin(angle) * 44;
    if (a === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Glowing Shield Panels
  const shieldGlow = Math.sin(time / 350) * 0.2 + 0.8;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.45 * shieldGlow})`;
  ctx.beginPath();
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2;
    const hx = shieldsX + Math.cos(angle) * 32;
    const hy = shieldsY + Math.sin(angle) * 32;
    if (a === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();

  // ----------------------------------------------------
  // 7. WEAPONS: Dual Laser Gunner Control Pods
  // ----------------------------------------------------
  const wepX = 1780;
  const wepY = 480;
  // Gunner Chair 1
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(wepX, wepY - 26, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Gunner Chair 2
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(wepX, wepY + 26, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Holographic targeting reticle HUD
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(wepX + 54, wepY, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wepX + 30, wepY);
  ctx.lineTo(wepX + 78, wepY);
  ctx.moveTo(wepX + 54, wepY - 24);
  ctx.lineTo(wepX + 54, wepY + 24);
  ctx.stroke();

  // ----------------------------------------------------
  // 8. O2: Oxygen Greenhouse Plant in Glass Dome
  // ----------------------------------------------------
  const o2X = 1660;
  const o2Y = 780;
  // Glass dome pedestal
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(o2X, o2Y + 10, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Glass Dome (Greenhouse)
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.beginPath();
  ctx.arc(o2X, o2Y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Green space plant inside dome
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(o2X - 5, o2Y + 3, 8, 0, Math.PI * 2);
  ctx.arc(o2X + 6, o2Y + 2, 10, 0, Math.PI * 2);
  ctx.arc(o2X, o2Y - 6, 9, 0, Math.PI * 2);
  ctx.fill();

  // ----------------------------------------------------
  // 9. NAVIGATION: Holographic Galaxy Star Globe & Steering Wheels
  // ----------------------------------------------------
  const navX = 2140;
  const navY = 840;

  // Steering Consoles
  ctx.fillStyle = '#334155';
  ctx.fillRect(navX + 40, navY - 45, 26, 90);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(navX + 40, navY - 45, 26, 90);

  // Rotating Celestial Galaxy Hologram
  const galaxyPulse = Math.sin(time / 300) * 0.2 + 0.8;
  ctx.strokeStyle = `rgba(168, 85, 247, ${galaxyPulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(navX - 20, navY, 26, 0, Math.PI * 2);
  ctx.stroke();

  // Galaxy Rings
  ctx.save();
  ctx.translate(navX - 20, navY);
  ctx.rotate(time / 800);
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ----------------------------------------------------
  // 10. STORAGE: Cargo Crates & Fuel Jerry Cans
  // ----------------------------------------------------
  const crates = [
    { x: 1000, y: 1100, w: 44, h: 44, col: '#78350f' },
    { x: 1050, y: 1100, w: 40, h: 40, col: '#92400e' },
    { x: 1020, y: 1148, w: 48, h: 44, col: '#78350f' },
    { x: 1240, y: 1360, w: 42, h: 42, col: '#475569' },
  ];
  for (const c of crates) {
    ctx.fillStyle = c.col;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // Crate cross-brace
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y);
    ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
  }

  // Fuel Jerry Cans (Gas refill task station)
  ctx.fillStyle = '#eab308';
  ctx.fillRect(1160, 1370, 22, 28);
  ctx.fillRect(1186, 1370, 22, 28);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1160, 1370, 22, 28);
  ctx.strokeRect(1186, 1370, 22, 28);

  // ----------------------------------------------------
  // 11. ELECTRICAL: High-Voltage Transformers & Electric Sparks
  // ----------------------------------------------------
  const elecX = 730;
  const elecY = 1040;
  // Generator block
  ctx.fillStyle = '#334155';
  ctx.fillRect(elecX, elecY, 65, 75);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(elecX, elecY, 65, 75);

  // Electrical warning sign
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(elecX + 32, elecY + 12);
  ctx.lineTo(elecX + 52, elecY + 44);
  ctx.lineTo(elecX + 12, elecY + 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡', elecX + 32, elecY + 38);

  // Dynamic Electric Sparks on Transformer
  if (Math.sin(time / 80) > 0.6) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(elecX + 32, elecY + 54);
    ctx.lineTo(elecX + 42, elecY + 60);
    ctx.lineTo(elecX + 28, elecY + 66);
    ctx.lineTo(elecX + 36, elecY + 70);
    ctx.stroke();
    drawGlowCircle(ctx, elecX + 32, elecY + 62, 6, 'rgba(56, 189, 248, 0.8)', 12);
  }

  // ----------------------------------------------------
  // 12. SECURITY: CCTV Surveillance Monitors
  // ----------------------------------------------------
  const secX = 760;
  const secY = 740;
  // Desk
  ctx.fillStyle = '#334155';
  ctx.fillRect(secX - 40, secY, 80, 30);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(secX - 40, secY, 80, 30);

  // 4 Security Screens
  const screens = [
    { x: secX - 34, y: secY - 24, w: 28, h: 18 },
    { x: secX + 6, y: secY - 24, w: 28, h: 18 },
    { x: secX - 34, y: secY - 46, w: 28, h: 18 },
    { x: secX + 6, y: secY - 46, w: 28, h: 18 },
  ];

  for (let sIdx = 0; sIdx < screens.length; sIdx++) {
    const scr = screens[sIdx];
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(scr.x, scr.y, scr.w, scr.h);

    // Static scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(scr.x, scr.y + ((time / 30 + sIdx * 5) % scr.h), scr.w, 2);
  }

  // Flashing Red Recording Dot
  if (Math.sin(time / 200) > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(secX + 30, secY - 50, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ----------------------------------------------------
  // 13. COMMUNICATIONS: Oscilloscope Sound Waves & Antenna
  // ----------------------------------------------------
  const commsX = 1430;
  const commsY = 1350;
  // Radio Console
  ctx.fillStyle = '#334155';
  ctx.fillRect(commsX - 35, commsY - 25, 70, 50);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(commsX - 35, commsY - 25, 70, 50);

  // Green Oscilloscope Screen
  ctx.fillStyle = '#022c22';
  ctx.fillRect(commsX - 28, commsY - 18, 56, 22);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let ox = 0; ox < 50; ox += 5) {
    const waveY = commsY - 7 + Math.sin((time / 150) + ox * 0.3) * 6;
    if (ox === 0) ctx.moveTo(commsX - 25 + ox, waveY);
    else ctx.lineTo(commsX - 25 + ox, waveY);
  }
  ctx.stroke();
}

// Emergency Button in Cafeteria (Authentic red dome with glass lid)
function drawEmergencyButton(ctx: CanvasRenderingContext2D, localPlayer: Player, time: number) {
  const dist = Math.hypot(localPlayer.x - EMERGENCY_BUTTON_POS.x, localPlayer.y - EMERGENCY_BUTTON_POS.y);
  const isNear = dist < 90 && localPlayer.isAlive && !localPlayer.inVent;

  const bx = EMERGENCY_BUTTON_POS.x;
  const by = EMERGENCY_BUTTON_POS.y;

  // Base Pedestal
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(bx, by, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Glass Case Outer Ring
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.beginPath();
  ctx.arc(bx, by, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Big Red Button Dome
  const buttonPulse = isNear ? Math.sin(time / 150) * 0.15 + 0.85 : 1;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(bx, by, 19 * buttonPulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(bx - 3, by - 3, 13 * buttonPulse, 0, Math.PI * 2);
  ctx.fill();

  // Button Top Highlight
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.ellipse(bx - 4, by - 6, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nearby Interactive Glow & Floating Prompt
  if (isNear) {
    drawGlowCircle(ctx, bx, by, 34, 'rgba(239, 68, 68, 0.45)', 25);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(bx, by, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    ctx.fillText('MEETING [SPACE]', bx, by - 42);
    ctx.restore();
  }
}

// Impostor Vents
function drawVents(ctx: CanvasRenderingContext2D, localPlayer: Player, time: number) {
  const isImpostor = localPlayer.role === 'impostor' && localPlayer.isAlive;
  const isLocalInVent = isImpostor && !!localPlayer.inVent;
  const currentVent = isLocalInVent && localPlayer.ventId ? VENTS.find((v) => v.id === localPlayer.ventId) : null;

  for (const vent of VENTS) {
    const isCurrentVent = isLocalInVent && vent.id === localPlayer.ventId;
    const isConnectedToCurrent = isLocalInVent && currentVent?.connectedVents.includes(vent.id);
    const dist = Math.hypot(localPlayer.x - vent.x, localPlayer.y - vent.y);
    const isNear = !isLocalInVent && dist < 85 && isImpostor;

    // Vent Outer Steel Plate
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(vent.x - 24, vent.y - 18, 48, 36, 6);
    ctx.fill();
    ctx.strokeStyle = isCurrentVent || isConnectedToCurrent || isNear ? '#ef4444' : '#0f172a';
    ctx.lineWidth = isCurrentVent ? 4 : isConnectedToCurrent || isNear ? 3.5 : 2.5;
    ctx.stroke();

    // Dark Vent Cavity
    ctx.fillStyle = isCurrentVent ? '#3b0707' : '#090d16';
    ctx.fillRect(vent.x - 20, vent.y - 14, 40, 28);

    // Metal Grate Slats
    ctx.strokeStyle = isCurrentVent ? '#fca5a5' : isConnectedToCurrent || isNear ? '#f87171' : '#475569';
    ctx.lineWidth = 2.5;
    for (let dy = -10; dy <= 10; dy += 5) {
      ctx.beginPath();
      ctx.moveTo(vent.x - 18, vent.y + dy);
      ctx.lineTo(vent.x + 18, vent.y + dy);
      ctx.stroke();
    }

    // Interactive Visual Highlights & Prompts
    if (isCurrentVent) {
      // Glow under player in vent
      drawGlowCircle(ctx, vent.x, vent.y, 30, 'rgba(239, 68, 68, 0.5)', 20);
      ctx.save();
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
      ctx.fillText('EXIT [V / ESC]', vent.x, vent.y - 26);
      ctx.restore();
    } else if (isConnectedToCurrent) {
      // Flashing directional marker for travel targets
      const pulse = Math.sin(time / 150) * 0.2 + 0.8;
      drawGlowCircle(ctx, vent.x, vent.y, 24, `rgba(239, 68, 68, ${0.4 * pulse})`, 16);
      ctx.save();
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
      ctx.fillText(`➔ ${vent.room}`, vent.x, vent.y - 26);
      ctx.restore();
    } else if (isNear) {
      drawGlowCircle(ctx, vent.x, vent.y, 26, 'rgba(239, 68, 68, 0.35)', 16);
      ctx.save();
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
      ctx.fillText('VENT [V]', vent.x, vent.y - 26);
      ctx.restore();
    }
  }
}

// Task Interactive Stations
function drawTaskStations(
  ctx: CanvasRenderingContext2D,
  localPlayer: Player,
  activeTaskId: string | null,
  time: number
) {
  for (const task of ALL_TASKS) {
    const isAssigned = localPlayer.assignedTasks.includes(task.id);
    const isDone = localPlayer.completedTasks.includes(task.id);
    const dist = Math.hypot(localPlayer.x - task.x, localPlayer.y - task.y);
    const isNear = dist < 75 && localPlayer.isAlive && !localPlayer.inVent;

    // Terminal Panel Box
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(task.x - 18, task.y - 18, 36, 36, 6);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Terminal Screen
    let screenColor = '#475569'; // Default inactive gray
    if (isDone) {
      screenColor = '#10b981'; // Green completed
    } else if (isAssigned) {
      screenColor = localPlayer.role === 'impostor' ? '#f87171' : '#fbbf24'; // Yellow assigned / Red fake
    }

    ctx.fillStyle = screenColor;
    ctx.fillRect(task.x - 13, task.y - 13, 26, 26);

    // Screen Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(task.x - 13, task.y - 7, 26, 2);
    ctx.fillRect(task.x - 13, task.y + 1, 26, 2);
    ctx.fillRect(task.x - 13, task.y + 9, 26, 2);

    // Nearby Prompt & Glow
    if (isNear && isAssigned && !isDone) {
      const pulse = Math.sin(time / 200) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(task.x - 20, task.y - 20, 40, 40);

      // Yellow Glowing Exclamation Mark
      ctx.save();
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('!', task.x, task.y - 28);

      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
      ctx.fillText('USE [SPACE]', task.x, task.y - 44);
      ctx.restore();
    }
  }
}

// Security Cameras mounted on the corridor bulkheads
function drawSecurityCameras(ctx: CanvasRenderingContext2D, isSecurityCamActive: boolean, time: number) {
  for (const cam of SECURITY_CAMERAS) {
    ctx.save();
    ctx.translate(cam.x, cam.y);

    // Wall Mount Bracket
    ctx.fillStyle = '#334155';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);

    // Camera Lens Body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Red blinking LED when someone is in Security viewing CCTV!
    const isBlinking = isSecurityCamActive && Math.sin(time / 150) > 0;
    ctx.fillStyle = isSecurityCamActive ? (isBlinking ? '#ef4444' : '#7f1d1d') : '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    if (isSecurityCamActive && isBlinking) {
      drawGlowCircle(ctx, 0, 0, 7, 'rgba(239, 68, 68, 0.85)', 12);
    }

    ctx.restore();
  }
}

// Locked Doors (during Impostor Door Sabotage)
function drawLockedDoors(ctx: CanvasRenderingContext2D, lockedDoors: Record<string, number>, time: number) {
  const now = Date.now();
  const roomDoorways: Record<string, Array<{ x: number; y: number; w: number; h: number }>> = {
    cafeteria: [
      { x: 890, y: 460, w: 25, h: 120 },
      { x: 1475, y: 460, w: 25, h: 120 },
      { x: 1060, y: 890, w: 200, h: 25 },
    ],
    medbay: [
      { x: 930, y: 460, w: 25, h: 100 },
      { x: 670, y: 610, w: 120, h: 25 },
    ],
    security: [
      { x: 670, y: 630, w: 120, h: 25 },
      { x: 670, y: 890, w: 120, h: 25 },
      { x: 610, y: 740, w: 25, h: 120 },
    ],
    electrical: [
      { x: 670, y: 910, w: 120, h: 25 },
      { x: 930, y: 1080, w: 25, h: 120 },
    ],
    storage: [
      { x: 1060, y: 1010, w: 200, h: 25 },
      { x: 890, y: 1080, w: 25, h: 120 },
      { x: 1390, y: 1020, w: 25, h: 120 },
    ],
    admin: [
      { x: 1460, y: 960, w: 25, h: 120 },
    ],
    reactor: [
      { x: 200, y: 560, w: 140, h: 25 },
      { x: 200, y: 1020, w: 140, h: 25 },
      { x: 420, y: 720, w: 25, h: 120 },
    ],
    upper_engine: [
      { x: 600, y: 440, w: 25, h: 120 },
      { x: 220, y: 560, w: 25, h: 100 },
    ],
    lower_engine: [
      { x: 600, y: 1080, w: 25, h: 120 },
      { x: 220, y: 980, w: 25, h: 100 },
    ],
  };

  for (const [room, expiry] of Object.entries(lockedDoors)) {
    const normalized = room.toLowerCase().replace(/\s+/g, '_');
    const doors = roomDoorways[normalized] || roomDoorways[room.toLowerCase()];
    if (expiry > now && doors) {
      for (const door of doors) {
        // Red blast door bulkheads
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x, door.y, door.w, door.h);

        // Hazard diagonal stripes on locked door
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', door.x + door.w / 2, door.y + door.h / 2 + 4);
      }
    }
  }
}

// Dead Bodies on the floor (filtered by Line of Sight & Distance)
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

    // Line of sight check for living players
    if (!isLocalGhost) {
      if (dist > visionRadius) continue;
      if (!hasLineOfSight(localPlayer.x, localPlayer.y, body.x, body.y, lockedDoors)) continue;
    }

    const colInfo = PLAYER_COLORS.find((c) => c.id === body.color) || PLAYER_COLORS[0];

    ctx.save();
    ctx.translate(body.x, body.y);

    // Blood Pool on Floor
    ctx.fillStyle = 'rgba(185, 28, 28, 0.8)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary blood splatters
    ctx.fillStyle = 'rgba(153, 27, 27, 0.65)';
    ctx.beginPath();
    ctx.arc(-24, 14, 6, 0, Math.PI * 2);
    ctx.arc(26, 6, 7, 0, Math.PI * 2);
    ctx.arc(10, 24, 5, 0, Math.PI * 2);
    ctx.fill();

    // Body Lower Half (Pants & Stubby Legs)
    ctx.fillStyle = colInfo.hex;
    ctx.beginPath();
    ctx.roundRect(-16, -2, 32, 18, [0, 0, 6, 6]);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Cut Meat Surface (Red slice)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, -2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Protruding Vertebra Bone
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-3, -18, 6, 16);
    ctx.beginPath();
    ctx.arc(-3, -18, 4, 0, Math.PI * 2);
    ctx.arc(3, -18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Floating Reportable Tag
    ctx.font = '900 11px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    ctx.fillText(`${body.playerName.toUpperCase()} [TOT]`, 0, 36);

    ctx.restore();
  }
}

// Draw Players (filtered by Line of Sight & Distance for true stealth)
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
  const visionRadius = (localPlayer.role === 'impostor' || isLocalGhost) ? 380 : isLightsOut ? 110 : 280;

  // 1. Y-Sort all players so players lower on screen render in front
  const sortedPlayers = Object.values(players).sort((a, b) => a.y - b.y);

  for (const p of sortedPlayers) {
    // If player is in vent, only draw for self or other Impostors
    if (p.inVent && p.id !== localPlayer.id && localPlayer.role !== 'impostor') continue;

    // Ghosts are only visible to other ghosts, or local player to themselves
    if (!p.isAlive && !isLocalGhost && p.id !== localPlayer.id) continue;

    const isLocal = p.id === localPlayer.id;
    const dist = Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y);

    // Line of Sight & Distance check for living crewmates
    if (!isLocal && !isLocalGhost) {
      if (dist > visionRadius) continue;
      if (!hasLineOfSight(localPlayer.x, localPlayer.y, p.x, p.y, lockedDoors)) continue;
    }


    ctx.save();
    ctx.translate(p.x, p.y);

    const isGhost = !p.isAlive;
    const isLeft = p.facing === 'left';
    const isMoving = p.isMoving;

    if (p.inVent) {
      ctx.globalAlpha = 0.5;
    } else if (isGhost) {
      // Ghosts are translucent
      ctx.globalAlpha = 0.55;
    }

    const col = PLAYER_COLORS.find((c) => c.id === p.color) || PLAYER_COLORS[0];

    // Flip horizontal if facing left
    if (isLeft) {
      ctx.scale(-1, 1);
    }

    // Walking bobbing motion (up & down)
    const walkBob = isMoving && !isGhost ? Math.abs(Math.sin(time / 80)) * 4 : 0;
    const ghostFloat = isGhost ? Math.sin(time / 300 + p.x) * 6 : 0;

    ctx.translate(0, -walkBob + ghostFloat);

    // 1. Drop Shadow under player (unless ghost)
    if (!isGhost) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 22 + walkBob, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!isGhost) {
      // ----------------------------------------------------
      // LIVING CREWMATE (Authentic Egg-Bean Shape + 2-tone Shading)
      // ----------------------------------------------------
      // Oxygen Tank / Backpack
      ctx.fillStyle = col.hex;
      ctx.beginPath();
      ctx.roundRect(-22, -12, 12, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Backpack bottom shadow
      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      ctx.roundRect(-22, 2, 12, 14, [0, 0, 6, 6]);
      ctx.fill();

      // Legs Animation (Walking Swing)
      const legSwing = isMoving ? Math.sin(time / 80) * 6 : 0;

      // Left Leg
      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      ctx.roundRect(-12 - legSwing, 14, 10, 14, 5);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Right Leg
      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      ctx.roundRect(4 + legSwing, 14, 10, 14, 5);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Main Bean Body
      ctx.fillStyle = col.hex;
      ctx.beginPath();
      ctx.roundRect(-16, -24, 34, 42, 15);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Body 2-Tone Shadow (Bottom belly curve)
      ctx.fillStyle = col.shadow;
      ctx.beginPath();
      ctx.roundRect(-16, 2, 34, 16, [0, 0, 15, 15]);
      ctx.fill();

      // Visor (Cyan / Sky-Blue Oval)
      ctx.fillStyle = col.visor;
      ctx.beginPath();
      ctx.roundRect(2, -16, 20, 14, 7);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Visor Top Glass Reflection (Pure White curved gleam)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(5, -14, 11, 4, 2);
      ctx.fill();

      // Custom Hat on Player Head
      drawPlayerCanvasHat(ctx, p.hat, isGhost);
    } else {
      // ----------------------------------------------------
      // GHOST CREWMATE (Translucent wavy ghost bean)
      // ----------------------------------------------------
      ctx.fillStyle = col.hex;
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.bezierCurveTo(-16, -26, 16, -26, 16, -10);
      ctx.lineTo(16, 12);
      // Wavy ghost tail
      const wave = Math.sin(time / 150) * 4;
      ctx.quadraticCurveTo(8 + wave, 22, 0, 14);
      ctx.quadraticCurveTo(-8 - wave, 22, -16, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Ghost Visor
      ctx.fillStyle = col.visor;
      ctx.beginPath();
      ctx.roundRect(2, -16, 18, 12, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }


    // ----------------------------------------------------
    // Player Name Tag & Impostor Recognition
    // ----------------------------------------------------
    if (isLeft) {
      ctx.scale(-1, 1);
    }

    ctx.font = '900 12px ui-monospace, SFMono-Regular, sans-serif';
    const isLocalImpostor = localPlayer.role === 'impostor';
    const isPlayerImpostor = p.role === 'impostor';

    // Impostors see fellow impostors in bold red
    const isRedName = isLocalImpostor && isPlayerImpostor;

    // Text Shadow
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, 1, -31);
    ctx.fillText(p.name, -1, -31);
    ctx.fillText(p.name, 0, -30);

    // Text Foreground
    ctx.fillStyle = isRedName ? '#ef4444' : isGhost ? '#94a3b8' : '#f8fafc';
    ctx.fillText(p.name, 0, -32);

    // "DU" (YOU) indicator on local player
    if (isLocal) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('▼', 0, -44);
    }

    ctx.restore();
  }
}

// ----------------------------------------------------
// Draw 2D Canvas Hats on Players
// ----------------------------------------------------
function drawPlayerCanvasHat(ctx: CanvasRenderingContext2D, hat?: HatType, isGhost?: boolean) {
  if (!hat || hat === 'none' || isGhost) return;

  ctx.save();
  switch (hat) {
    case 'tophat':
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(2, -26, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6, -42, 16, 16);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-6, -30, 16, 4);
      break;
    case 'crown':
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -26);
      ctx.lineTo(-12, -38);
      ctx.lineTo(-4, -30);
      ctx.lineTo(2, -42);
      ctx.lineTo(8, -30);
      ctx.lineTo(16, -38);
      ctx.lineTo(14, -26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'sprout':
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.quadraticCurveTo(4, -36, 2, -42);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(-3, -42, 6, 3, -0.5, 0, Math.PI * 2);
      ctx.ellipse(7, -40, 6, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'party':
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(2, -48);
      ctx.lineTo(12, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(2, -48, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'knife':
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.fillRect(-18, -28, 28, 5);
      ctx.strokeRect(-18, -28, 28, 5);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, -29, 8, 7);
      break;
    case 'dum':
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.fillRect(0, -22, 16, 12);
      ctx.strokeRect(0, -22, 16, 12);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('DUM', 8, -13);
      break;
    case 'devil':
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(-14, -38);
      ctx.lineTo(-2, -30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -26);
      ctx.lineTo(14, -38);
      ctx.lineTo(2, -30);
      ctx.closePath();
      ctx.fill();
      break;
    case 'halo':
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(2, -36, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'goggles':
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -26, 20, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-1, -23, 4, 0, Math.PI * 2);
      ctx.arc(9, -23, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'viking':
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(2, -26, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-10, -26);
      ctx.lineTo(-18, -38);
      ctx.lineTo(-6, -30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -26);
      ctx.lineTo(22, -38);
      ctx.lineTo(10, -30);
      ctx.closePath();
      ctx.fill();
      break;
    case 'beanie':
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(2, -26, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2, -38, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cap':
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(2, -26, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, -28, 8, 3);
      break;
    case 'egg':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(2, -26, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(2, -28, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cheese':
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(12, -26);
      ctx.lineTo(4, -38);
      ctx.closePath();
      ctx.fill();
      break;
    case 'cat':
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(-10, -36);
      ctx.lineTo(-2, -30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -26);
      ctx.lineTo(10, -36);
      ctx.lineTo(2, -30);
      ctx.closePath();
      ctx.fill();
      break;
    case 'plague':
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -28, 16, 6);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(8, -22);
      ctx.lineTo(22, -14);
      ctx.lineTo(8, -16);
      ctx.closePath();
      ctx.fill();
      break;
    case 'straw':
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(2, -26, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-4, -34, 12, 8);
      break;
    case 'cowboy':
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(2, -26, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-4, -36, 12, 10);
      break;
    case 'santa':
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(8, -38);
      ctx.lineTo(14, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -28, 22, 4);
      ctx.beginPath();
      ctx.arc(10, -38, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

// Ship Walls & Structural Bulkheads (Solid barrier blocks)
function drawWallsAndBulkheads(ctx: CanvasRenderingContext2D, time: number) {

  for (const wall of WALLS) {
    // 1. Wall Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(wall.x, wall.y + 8, wall.width, wall.height);

    // 2. Wall Main Face (Deep Navy-Slate: #1e293b)
    ctx.fillStyle = wall.isObstacle ? '#273549' : '#1e293b';
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

    // 3. Wall Top Face / Rim Highlight (#334155 / #475569)
    ctx.fillStyle = wall.isObstacle ? '#3b4c63' : '#334155';
    ctx.fillRect(wall.x, wall.y, wall.width, Math.min(6, wall.height));

    // 4. Wall Dark Border Stroke (#0f172a)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  }
}

// Dynamic Vision & Lighting (Dramatic Fog of War + Flashlight cone + Crisis Strobes)
function drawDynamicLighting(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  localPlayer: Player,
  activeSabotage?: ActiveSabotage | null,
  time = 0
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const isGhost = !localPlayer.isAlive;
  const isLightsOut = activeSabotage?.type === 'lights';
  const isAlarm = activeSabotage?.type === 'reactor' || activeSabotage?.type === 'o2';

  // Vision Radius (Ghosts & Impostors have full vision!)
  const visionRadius = (localPlayer.role === 'impostor' || isGhost)
    ? 380
    : isLightsOut
    ? 110
    : 280;

  // Create soft radial vignette mask
  const grad = ctx.createRadialGradient(
    centerX,
    centerY,
    visionRadius * 0.45,
    centerX,
    centerY,
    visionRadius * 1.25
  );

  if (isAlarm) {
    // Red pulsing alarm strobe
    const strobe = (Math.sin(time / 200) + 1) * 0.5;
    grad.addColorStop(0, `rgba(239, 68, 68, ${0.12 * strobe})`);
    grad.addColorStop(0.7, `rgba(127, 29, 29, ${0.4 + 0.25 * strobe})`);
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
  } else if (isLightsOut && localPlayer.role !== 'impostor' && !isGhost) {
    // Heavy black darkness during blackout for living crewmates
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.6, 'rgba(2, 6, 23, 0.85)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.7, 'rgba(3, 7, 18, 0.45)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.94)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}
