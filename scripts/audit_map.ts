import {
  ROOMS,
  CORRIDORS,
  WALLS,
  ALL_TASKS,
  VENTS,
  WAYPOINTS,
  LOCKED_DOOR_WALLS,
  checkCollision,
  resolvePlayerMovement,
  getCurrentRoomName,
} from '../lib/map-data';

console.log('=====================================================');
console.log('       THE SKELD MAP & GEOMETRY COMPREHENSIVE AUDIT   ');
console.log('=====================================================');

let errors = 0;
let warnings = 0;

// 1. Audit Rooms
console.log('\n--- 1. ROOMS AUDIT (' + ROOMS.length + ' rooms) ---');
ROOMS.forEach((r) => {
  console.log(
    `[Room: ${r.id.padEnd(14)}] ${r.name.padEnd(16)} (x: ${r.x}..${r.x + r.width}, y: ${r.y}..${r.y + r.height}) Size: ${r.width}x${r.height}`
  );
  // Check for overlap with any other room
  for (const other of ROOMS) {
    if (other.id === r.id) continue;
    const overlapX = Math.max(0, Math.min(r.x + r.width, other.x + other.width) - Math.max(r.x, other.x));
    const overlapY = Math.max(0, Math.min(r.y + r.height, other.y + other.height) - Math.max(r.y, other.y));
    if (overlapX > 0 && overlapY > 0) {
      console.error(`  ❌ ERROR: Room ${r.name} overlaps with ${other.name} by ${overlapX}x${overlapY}px!`);
      errors++;
    }
  }
});

// 2. Audit Corridors
console.log('\n--- 2. CORRIDORS AUDIT (' + CORRIDORS.length + ' corridors) ---');
CORRIDORS.forEach((c) => {
  console.log(
    `[Corr: ${c.id.padEnd(18)}] ${c.name.padEnd(35)} (x: ${c.x}..${c.x + c.width}, y: ${c.y}..${c.y + c.height}) Size: ${c.width}x${c.height}`
  );
});

// 3. Audit Vents & Networks
console.log('\n--- 3. VENTS & NETWORKS AUDIT (' + VENTS.length + ' vents) ---');
VENTS.forEach((v) => {
  const roomFound = getCurrentRoomName(v.x, v.y);
  const collides = checkCollision(v.x, v.y, 14);
  if (collides) {
    console.error(`  ❌ ERROR: Vent ${v.id} collides with wall!`, collides);
    errors++;
  }
  console.log(
    `[Vent: ${v.id.padEnd(20)}] Room: "${v.room.padEnd(16)}" at (${v.x}, ${v.y}) -> in room: "${roomFound}" -> Connected: [${v.connectedVents.join(', ')}]`
  );
  v.connectedVents.forEach((targetId) => {
    const target = VENTS.find((o) => o.id === targetId);
    if (!target) {
      console.error(`  ❌ ERROR: Vent ${v.id} points to non-existent vent ${targetId}!`);
      errors++;
    } else if (!target.connectedVents.includes(v.id)) {
      console.warn(`  ⚠️ WARNING: Asymmetric connection: ${v.id} -> ${targetId}`);
      warnings++;
    }
  });
});

// 4. Audit Tasks
console.log('\n--- 4. TASKS AUDIT (' + ALL_TASKS.length + ' tasks) ---');
ALL_TASKS.forEach((t) => {
  const roomFound = getCurrentRoomName(t.x, t.y);
  const collides = checkCollision(t.x, t.y, 14);
  const status = collides ? '❌ COLLIDES WITH WALL' : '✅ OK';
  if (collides) {
    console.error(`  ❌ ERROR: Task ${t.id} collides with wall!`, collides);
    errors++;
  }
  if (roomFound.toLowerCase() !== t.room.toLowerCase() && !roomFound.toLowerCase().includes(t.room.toLowerCase())) {
    console.warn(`  ⚠️ WARNING: Task ${t.id} in room "${t.room}" detected as "${roomFound}"!`);
    warnings++;
  }
  console.log(
    `[Task: ${t.id.padEnd(26)}] (${t.type.padEnd(20)}) in "${t.room.padEnd(14)}" at (${t.x}, ${t.y}) -> in room: "${roomFound}" -> ${status}`
  );
});

// 5. Audit Waypoints for Bots
console.log('\n--- 5. WAYPOINTS & BOT PATHFINDING (' + WAYPOINTS.length + ' waypoints) ---');
WAYPOINTS.forEach((w) => {
  const collides = checkCollision(w.x, w.y, 14);
  const status = collides ? '❌ COLLIDES WITH WALL' : '✅ OK';
  if (collides) {
    console.error(`  ❌ ERROR: Waypoint ${w.id} collides with wall!`, collides);
    errors++;
  }
  console.log(`[Waypoint: ${w.id.padEnd(18)}] in "${w.room.padEnd(14)}" at (${w.x}, ${w.y}) -> ${status}`);
  w.neighbors.forEach((nId) => {
    const n = WAYPOINTS.find((o) => o.id === nId);
    if (!n) {
      console.error(`  ❌ ERROR: Waypoint ${w.id} has invalid neighbor ${nId}!`);
      errors++;
    } else if (!n.neighbors.includes(w.id)) {
      console.warn(`  ⚠️ WARNING: Asymmetric waypoint edge: ${w.id} -> ${nId}`);
      warnings++;
    }
  });
});

// 6. Test Collision Solver (sub-stepping movement through walls)
console.log('\n--- 6. TESTING WALL COLLISION INTEGRITY (Raycasting / Walking against walls) ---');
// Test trying to walk North into Cafeteria wall from (1200, 480)
const testWalk1 = resolvePlayerMovement(1200, 480, 0, -100);
const blocked1 = testWalk1.y >= 436;
console.log(`Walk North into Cafeteria wall: Start (1200, 480) -> End (${testWalk1.x}, ${testWalk1.y}) [Blocked: ${blocked1 ? '✅' : '❌'}]`);
if (!blocked1) errors++;

// Test trying to walk West into Reactor outer hull
const testWalk2 = resolvePlayerMovement(100, 800, -100, 0);
const blocked2 = testWalk2.x >= 100;
console.log(`Walk West into Reactor outer wall: Start (100, 800) -> End (${testWalk2.x}, ${testWalk2.y}) [Blocked: ${blocked2 ? '✅' : '❌'}]`);
if (!blocked2) errors++;

// Test trying to walk into Cafeteria table
const testWalk3 = resolvePlayerMovement(1200, 540, 0, 100);
const blocked3 = testWalk3.y < 590;
console.log(`Walk South into Cafeteria table: Start (1200, 540) -> End (${testWalk3.x}, ${testWalk3.y}) [Blocked: ${blocked3 ? '✅' : '❌'}]`);
if (!blocked3) errors++;

console.log(`\n=====================================================`);
console.log(` AUDIT SUMMARY: ${errors} Errors, ${warnings} Warnings`);
console.log(`=====================================================`);

if (errors > 0) {
  process.exit(1);
}
