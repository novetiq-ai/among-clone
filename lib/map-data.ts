import { TaskDefinition, VentDefinition } from '@/types/game';

export interface RoomArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface CorridorArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WallBox {
  x: number;
  y: number;
  width: number;
  height: number;
  isObstacle?: boolean;
}

export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1600;

export const SPAWN_POSITION = { x: 1200, y: 540 };
export const EMERGENCY_BUTTON_POS = { x: 1200, y: 640, radius: 48 };

// Designated safe spawn slots around the Cafeteria meeting table (away from collision bounds)
export const SPAWN_SLOTS = [
  { x: 1200, y: 510 }, // Top
  { x: 1040, y: 550 }, // Top-Left
  { x: 1360, y: 550 }, // Top-Right
  { x: 980, y: 640 },  // Left
  { x: 1420, y: 640 }, // Right
  { x: 1040, y: 750 }, // Bottom-Left
  { x: 1360, y: 750 }, // Bottom-Right
  { x: 1200, y: 790 }, // Bottom
  { x: 1120, y: 500 },
  { x: 1280, y: 500 },
  { x: 1120, y: 790 },
  { x: 1280, y: 790 },
];

export function getSpawnPosition(index: number) {
  return SPAWN_SLOTS[index % SPAWN_SLOTS.length] || SPAWN_POSITION;
}

// 14 Skeld Rooms with Exact Bounds (Airtight, Non-Overlapping)
export const ROOMS: RoomArea[] = [
  { id: 'cafeteria', name: 'Cafeteria', x: 920, y: 420, width: 560, height: 440, color: '#1e293b' },
  { id: 'weapons', name: 'Weapons', x: 1600, y: 340, width: 380, height: 300, color: '#1e293b' },
  { id: 'o2', name: 'O2', x: 1540, y: 680, width: 280, height: 200, color: '#1e293b' },
  { id: 'navigation', name: 'Navigation', x: 1980, y: 660, width: 380, height: 380, color: '#1e293b' },
  { id: 'shields', name: 'Shields', x: 1620, y: 1180, width: 360, height: 280, color: '#1e293b' },
  { id: 'communications', name: 'Communications', x: 1300, y: 1240, width: 260, height: 220, color: '#1e293b' },
  { id: 'storage', name: 'Storage', x: 920, y: 1020, width: 360, height: 440, color: '#1e293b' },
  { id: 'admin', name: 'Admin', x: 1500, y: 920, width: 320, height: 220, color: '#1e293b' },
  { id: 'electrical', name: 'Electrical', x: 620, y: 920, width: 300, height: 340, color: '#1e293b' },
  { id: 'lower_engine', name: 'Lower Engine', x: 260, y: 1080, width: 340, height: 340, color: '#1e293b' },
  { id: 'security', name: 'Security', x: 620, y: 640, width: 280, height: 240, color: '#1e293b' },
  { id: 'reactor', name: 'Reactor', x: 80, y: 620, width: 340, height: 440, color: '#1e293b' },
  { id: 'upper_engine', name: 'Upper Engine', x: 260, y: 340, width: 340, height: 280, color: '#1e293b' },
  { id: 'medbay', name: 'MedBay', x: 620, y: 360, width: 300, height: 260, color: '#1e293b' },
];

// Hallways seamlessly connecting all rooms
export const CORRIDORS: CorridorArea[] = [
  // Cafeteria <-> MedBay (NW Hallway)
  { id: 'corr-caf-med', name: 'Flur (Cafeteria ➔ MedBay)', x: 900, y: 460, width: 40, height: 140 },
  { id: 'corr-med-upper', name: 'Flur (MedBay ➔ Upper Engine)', x: 580, y: 440, width: 60, height: 140 },
  // West Corridor (MedBay <-> Security <-> Electrical)
  { id: 'corr-med-sec', name: 'Flur (MedBay ➔ Security)', x: 680, y: 600, width: 160, height: 60 },
  { id: 'corr-sec-elec', name: 'Flur (Security ➔ Electrical)', x: 680, y: 860, width: 160, height: 80 },
  // Reactor Hallways
  { id: 'corr-react-upper', name: 'Flur (Reactor ➔ Upper Engine)', x: 200, y: 560, width: 140, height: 100 },
  { id: 'corr-react-lower', name: 'Flur (Reactor ➔ Lower Engine)', x: 200, y: 1020, width: 140, height: 100 },
  { id: 'corr-react-sec', name: 'Flur (Reactor ➔ Security)', x: 400, y: 720, width: 240, height: 120 },
  // Electrical <-> Lower Engine & Storage
  { id: 'corr-elec-lower', name: 'Flur (Electrical ➔ Lower Engine)', x: 560, y: 1140, width: 80, height: 120 },
  { id: 'corr-elec-stor', name: 'Flur (Electrical ➔ Storage)', x: 880, y: 1120, width: 40, height: 140 },
  // Central Hallway (Cafeteria <-> Storage)
  { id: 'corr-center-main', name: 'Zentralflur (Cafeteria ➔ Storage)', x: 1080, y: 840, width: 200, height: 200 },
  // Storage <-> Admin & Comms
  { id: 'corr-stor-admin', name: 'Flur (Storage ➔ Admin)', x: 1260, y: 960, width: 260, height: 120 },
  { id: 'corr-stor-comms', name: 'Flur (Storage ➔ Comms)', x: 1260, y: 1280, width: 60, height: 120 },
  // Cafeteria <-> Weapons (NE Hallway)
  { id: 'corr-caf-weap', name: 'Flur (Cafeteria ➔ Weapons)', x: 1460, y: 460, width: 160, height: 140 },
  // Weapons <-> O2 <-> Navigation
  { id: 'corr-weap-nav', name: 'Flur (Weapons ➔ Navigation)', x: 1720, y: 620, width: 280, height: 140 },
  // O2 <-> Navigation
  { id: 'corr-o2-nav', name: 'Flur (O2 ➔ Navigation)', x: 1800, y: 740, width: 200, height: 120 },
  // Navigation <-> Shields
  { id: 'corr-nav-shield', name: 'Flur (Navigation ➔ Shields)', x: 1800, y: 1020, width: 200, height: 180 },
  // Shields <-> Comms
  { id: 'corr-shield-comms', name: 'Flur (Shields ➔ Comms)', x: 1540, y: 1280, width: 100, height: 120 },
  // Admin <-> Shields/Hallway
  { id: 'corr-admin-hall', name: 'Flur (Admin ➔ Shields)', x: 1620, y: 1120, width: 140, height: 80 },
];

// Complete Tasks Definitions (28 Authentic Tasks across all rooms)
export const ALL_TASKS: TaskDefinition[] = [
  // Admin
  { id: 'task-admin-card', type: 'swipe_card', name: 'Karte durchziehen', room: 'Admin', x: 1700, y: 960 },
  { id: 'task-wires-admin', type: 'wires', name: 'Drähte verbinden', room: 'Admin', x: 1540, y: 1040 },

  // Cafeteria
  { id: 'task-cafeteria-garbage', type: 'empty_garbage', name: 'Müll entsorgen', room: 'Cafeteria', x: 1420, y: 450 },
  { id: 'task-cafeteria-download', type: 'download_data', name: 'Daten herunterladen', room: 'Cafeteria', x: 980, y: 450 },
  { id: 'task-wires-cafeteria', type: 'wires', name: 'Drähte verbinden', room: 'Cafeteria', x: 1420, y: 800 },

  // Shields
  { id: 'task-shields-prime', type: 'prime_shields', name: 'Schilde aktivieren', room: 'Shields', x: 1840, y: 1240 },
  { id: 'task-shields-divert', type: 'divert_power', name: 'Energie umleiten', room: 'Shields', x: 1680, y: 1380 },

  // Weapons
  { id: 'task-weapons-asteroids', type: 'clear_asteroids', name: 'Asteroiden abschießen', room: 'Weapons', x: 1860, y: 400 },
  { id: 'task-weapons-download', type: 'download_data', name: 'Daten herunterladen', room: 'Weapons', x: 1680, y: 580 },

  // Electrical
  { id: 'task-calibrate-distributor', type: 'calibrate_distributor', name: 'Verteiler kalibrieren', room: 'Electrical', x: 840, y: 980 },
  { id: 'task-wires-electrical', type: 'wires', name: 'Drähte verbinden', room: 'Electrical', x: 670, y: 960 },
  { id: 'task-electrical-power', type: 'divert_power', name: 'Energie umleiten', room: 'Electrical', x: 740, y: 1200 },

  // O2
  { id: 'task-o2-filter', type: 'clean_o2_filter', name: 'O2 Filter reinigen', room: 'O2', x: 1740, y: 740 },
  { id: 'task-o2-garbage', type: 'empty_garbage', name: 'Müllschacht leeren', room: 'O2', x: 1740, y: 840 },

  // Navigation
  { id: 'task-chart-course', type: 'chart_course', name: 'Kurs festlegen', room: 'Navigation', x: 2260, y: 760 },
  { id: 'task-nav-download', type: 'download_data', name: 'Daten übertragen', room: 'Navigation', x: 2060, y: 960 },

  // Reactor
  { id: 'task-start-reactor', type: 'start_reactor', name: 'Reaktor starten (Simon Says)', room: 'Reactor', x: 140, y: 720 },
  { id: 'task-reactor-manifolds', type: 'manifolds', name: 'Manifolds entsperren (1-10)', room: 'Reactor', x: 140, y: 940 },

  // MedBay
  { id: 'task-medbay-scan', type: 'medbay_scan', name: 'MedBay Körperscan', room: 'MedBay', x: 860, y: 500 },
  { id: 'task-medbay-inspect', type: 'inspect_sample', name: 'Proben analysieren', room: 'MedBay', x: 680, y: 540 },

  // Upper Engine
  { id: 'task-upper-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Upper Engine', x: 380, y: 400 },
  { id: 'task-upper-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Upper Engine', x: 320, y: 580 },

  // Lower Engine
  { id: 'task-lower-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Lower Engine', x: 380, y: 1360 },
  { id: 'task-lower-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Lower Engine', x: 320, y: 1140 },

  // Storage
  { id: 'task-storage-refuel', type: 'refuel_engines', name: 'Kanister auftanken', room: 'Storage', x: 1180, y: 1380 },
  { id: 'task-storage-garbage', type: 'empty_garbage', name: 'Müllpresse leeren', room: 'Storage', x: 1220, y: 1400 },
  { id: 'task-wires-storage', type: 'wires', name: 'Drähte verbinden', room: 'Storage', x: 1040, y: 1060 },

  // Communications
  { id: 'task-comms-download', type: 'download_data', name: 'Daten herunterladen', room: 'Communications', x: 1480, y: 1380 },
];

// Impostor Vents: Authentic 14-Vent Skeld Network
export const VENTS: VentDefinition[] = [
  // Triangle 1: MedBay <-> Security <-> Electrical
  { id: 'vent-medbay', room: 'MedBay', x: 680, y: 420, connectedVents: ['vent-security', 'vent-electrical'] },
  { id: 'vent-security', room: 'Security', x: 680, y: 820, connectedVents: ['vent-medbay', 'vent-electrical'] },
  { id: 'vent-electrical', room: 'Electrical', x: 670, y: 970, connectedVents: ['vent-medbay', 'vent-security'] },

  // Triangle 2: Cafeteria (Top-Right) <-> Admin <-> Hallway
  { id: 'vent-cafeteria', room: 'Cafeteria', x: 1420, y: 480, connectedVents: ['vent-admin', 'vent-hallway-admin'] },
  { id: 'vent-admin', room: 'Admin', x: 1760, y: 1040, connectedVents: ['vent-cafeteria', 'vent-hallway-admin'] },
  { id: 'vent-hallway-admin', room: 'Flur (Admin/Shields)', x: 1680, y: 1150, connectedVents: ['vent-cafeteria', 'vent-admin'] },

  // Pair 3: Reactor Top <-> Upper Engine
  { id: 'vent-reactor-top', room: 'Reactor (Oben)', x: 140, y: 670, connectedVents: ['vent-upper-engine'] },
  { id: 'vent-upper-engine', room: 'Upper Engine', x: 320, y: 400, connectedVents: ['vent-reactor-top'] },

  // Pair 4: Reactor Bottom <-> Lower Engine
  { id: 'vent-reactor-bottom', room: 'Reactor (Unten)', x: 140, y: 1010, connectedVents: ['vent-lower-engine'] },
  { id: 'vent-lower-engine', room: 'Lower Engine', x: 320, y: 1360, connectedVents: ['vent-reactor-bottom'] },

  // Pair 5: Weapons <-> Navigation Top
  { id: 'vent-weapons', room: 'Weapons', x: 1880, y: 400, connectedVents: ['vent-nav-top'] },
  { id: 'vent-nav-top', room: 'Navigation (Oben)', x: 2280, y: 710, connectedVents: ['vent-weapons'] },

  // Pair 6: Shields <-> Navigation Bottom
  { id: 'vent-shields', room: 'Shields', x: 1900, y: 1380, connectedVents: ['vent-nav-bottom'] },
  { id: 'vent-nav-bottom', room: 'Navigation (Unten)', x: 2280, y: 990, connectedVents: ['vent-shields'] },
];

// CCTV Security Camera Positions (Physical props mounted on corridor bulkheads)
export const SECURITY_CAMERAS = [
  { id: 'cam-medbay', name: 'MedBay Flur', x: 900, y: 450, facing: 'right' },
  { id: 'cam-admin', name: 'Admin Flur', x: 1420, y: 960, facing: 'left' },
  { id: 'cam-nav', name: 'Navigation Flur', x: 1940, y: 760, facing: 'left' },
  { id: 'cam-reactor', name: 'Reaktor Flur', x: 440, y: 780, facing: 'right' },
];

// ============================================================================
// EXHAUSTIVE, AIRTIGHT COLLISION GEOMETRY
// Thick, solid wall boundaries and interior furniture hitboxes.
// Zero gaps into outer space. Zero tunneling.
// ============================================================================
export const WALLS: WallBox[] = [
  // ----------------------------------------------------
  // OUTER SHIP HULL BOUNDARIES (Space Vacuum Barriers)
  // ----------------------------------------------------
  { x: 0, y: 0, width: MAP_WIDTH, height: 320 }, // North space void
  { x: 0, y: 1480, width: MAP_WIDTH, height: 120 }, // South space void
  { x: 0, y: 0, width: 60, height: MAP_HEIGHT }, // Far West space void
  { x: 2380, y: 0, width: 40, height: MAP_HEIGHT }, // Far East space void

  // Outer Engine Pod Hull Cutouts
  { x: 0, y: 320, width: 240, height: 260 }, // Upper left void
  { x: 0, y: 1080, width: 240, height: 400 }, // Lower left void

  // ----------------------------------------------------
  // 1. CAFETERIA WALLS
  // ----------------------------------------------------
  { x: 920, y: 380, width: 560, height: 40 }, // North Wall
  { x: 880, y: 580, width: 40, height: 280 }, // West Wall (opening at y: 460..580)
  { x: 1480, y: 580, width: 40, height: 280 }, // East Wall (opening at y: 460..580)
  { x: 920, y: 860, width: 160, height: 40 }, // South Wall Left Wing
  { x: 1280, y: 860, width: 200, height: 40 }, // South Wall Right Wing (opening x: 1080..1280)

  // ----------------------------------------------------
  // 2. WEAPONS WALLS
  // ----------------------------------------------------
  { x: 1600, y: 300, width: 380, height: 40 }, // North Wall
  { x: 1560, y: 300, width: 40, height: 160 }, // West Wall Top
  { x: 1560, y: 580, width: 40, height: 60 }, // West Wall Bottom (opening y: 460..580)
  { x: 1980, y: 300, width: 40, height: 360 }, // East Outer Wall
  { x: 1600, y: 640, width: 120, height: 40 }, // South Wall Left (opening x: 1720..1980)

  // ----------------------------------------------------
  // 3. O2 WALLS
  // ----------------------------------------------------
  { x: 1540, y: 640, width: 280, height: 40 }, // North Wall
  { x: 1500, y: 640, width: 40, height: 240 }, // West Wall
  { x: 1540, y: 880, width: 280, height: 40 }, // South Wall
  { x: 1820, y: 640, width: 40, height: 100 }, // East Wall Top
  { x: 1820, y: 860, width: 40, height: 60 }, // East Wall Bottom (opening y: 740..860)

  // ----------------------------------------------------
  // 4. NAVIGATION WALLS (Pointy Cockpit Nose)
  // ----------------------------------------------------
  { x: 1980, y: 620, width: 380, height: 40 }, // North Wall
  { x: 2360, y: 620, width: 40, height: 440 }, // Far East Cockpit Nose
  { x: 1980, y: 1040, width: 380, height: 40 }, // South Wall
  { x: 1940, y: 800, width: 40, height: 100 }, // West Wall Middle (openings y: 700..800 and y: 900..1000)

  // ----------------------------------------------------
  // 5. SHIELDS WALLS
  // ----------------------------------------------------
  { x: 1760, y: 1140, width: 220, height: 40 }, // North Wall Right (openings x: 1620..1760 to Admin and x: 1800..1980 to Nav)
  { x: 1980, y: 1140, width: 40, height: 340 }, // East Outer Wall
  { x: 1620, y: 1460, width: 400, height: 40 }, // South Outer Wall
  { x: 1580, y: 1140, width: 40, height: 140 }, // West Wall Top (opening y: 1280..1400)
  { x: 1580, y: 1400, width: 40, height: 60 }, // West Wall Bottom

  // ----------------------------------------------------
  // 6. COMMUNICATIONS WALLS
  // ----------------------------------------------------
  { x: 1300, y: 1200, width: 260, height: 40 }, // North Wall
  { x: 1300, y: 1460, width: 260, height: 40 }, // South Wall
  { x: 1260, y: 1200, width: 40, height: 80 }, // West Wall Top (opening y: 1280..1400)
  { x: 1260, y: 1400, width: 40, height: 60 }, // West Wall Bottom

  // ----------------------------------------------------
  // 7. STORAGE WALLS
  // ----------------------------------------------------
  { x: 900, y: 980, width: 180, height: 40 }, // North Wall Left Wing
  { x: 1280, y: 980, width: 40, height: 40 }, // North Wall Right Wing (opening x: 1080..1280)
  { x: 860, y: 980, width: 40, height: 140 }, // West Wall Top (opening y: 1120..1240)
  { x: 860, y: 1240, width: 40, height: 240 }, // West Wall Bottom
  { x: 900, y: 1460, width: 360, height: 40 }, // South Wall (opening x: 1260..1360 to comms)
  { x: 1280, y: 1080, width: 40, height: 200 }, // East Wall (opening y: 960..1080 to admin)

  // ----------------------------------------------------
  // 8. ADMIN WALLS
  // ----------------------------------------------------
  { x: 1500, y: 880, width: 320, height: 40 }, // North Wall
  { x: 1500, y: 1140, width: 120, height: 40 }, // South Wall Left (opening x: 1620..1760 to Shields)
  { x: 1760, y: 1140, width: 60, height: 40 }, // South Wall Right
  { x: 1820, y: 880, width: 40, height: 280 }, // East Wall
  { x: 1460, y: 880, width: 40, height: 80 }, // West Wall Top
  { x: 1460, y: 1080, width: 40, height: 80 }, // West Wall Bottom (opening y: 960..1080)

  // ----------------------------------------------------
  // 9. ELECTRICAL WALLS
  // ----------------------------------------------------
  { x: 620, y: 880, width: 60, height: 40 }, // North Wall Left
  { x: 840, y: 880, width: 80, height: 40 }, // North Wall Right (opening x: 680..840)
  { x: 580, y: 880, width: 40, height: 260 }, // West Wall Top (opening y: 1140..1240)
  { x: 620, y: 1260, width: 300, height: 40 }, // South Wall
  { x: 920, y: 880, width: 40, height: 240 }, // East Wall Top (opening y: 1120..1240)

  // ----------------------------------------------------
  // 10. SECURITY WALLS
  // ----------------------------------------------------
  { x: 620, y: 600, width: 60, height: 40 }, // North Wall Left
  { x: 840, y: 600, width: 60, height: 40 }, // North Wall Right (opening x: 680..840)
  { x: 900, y: 600, width: 40, height: 300 }, // East Wall
  { x: 580, y: 600, width: 40, height: 120 }, // West Wall Top
  { x: 580, y: 820, width: 40, height: 80 }, // West Wall Bottom (opening y: 720..820)
  { x: 620, y: 880, width: 60, height: 40 }, // South Wall Left
  { x: 840, y: 880, width: 60, height: 40 }, // South Wall Right (opening x: 680..840)

  // ----------------------------------------------------
  // 11. REACTOR WALLS
  // ----------------------------------------------------
  { x: 60, y: 580, width: 140, height: 40 }, // North Wall
  { x: 60, y: 580, width: 40, height: 500 }, // West Outer Hull
  { x: 60, y: 1060, width: 140, height: 40 }, // South Wall
  { x: 420, y: 580, width: 40, height: 140 }, // East Wall Top
  { x: 420, y: 840, width: 40, height: 240 }, // East Wall Bottom (opening y: 720..840)

  // ----------------------------------------------------
  // 12. UPPER ENGINE WALLS
  // ----------------------------------------------------
  { x: 260, y: 300, width: 340, height: 40 }, // North Wall
  { x: 220, y: 300, width: 40, height: 260 }, // West Wall Top (opening y: 560..660)
  { x: 600, y: 300, width: 40, height: 140 }, // East Wall Top
  { x: 600, y: 560, width: 40, height: 120 }, // East Wall Bottom (opening y: 440..560)
  { x: 260, y: 660, width: 340, height: 40 }, // South Wall

  // ----------------------------------------------------
  // 13. LOWER ENGINE WALLS
  // ----------------------------------------------------
  { x: 260, y: 1040, width: 340, height: 40 }, // North Wall
  { x: 220, y: 1220, width: 40, height: 220 }, // West Wall Bottom (opening y: 1020..1220)
  { x: 600, y: 1040, width: 40, height: 100 }, // East Wall Top
  { x: 600, y: 1260, width: 40, height: 180 }, // East Wall Bottom (opening y: 1140..1260)
  { x: 260, y: 1420, width: 340, height: 40 }, // South Wall

  // ----------------------------------------------------
  // 14. MEDBAY WALLS
  // ----------------------------------------------------
  { x: 620, y: 320, width: 300, height: 40 }, // North Wall
  { x: 580, y: 320, width: 40, height: 120 }, // West Wall Top (opening y: 440..560)
  { x: 920, y: 320, width: 40, height: 140 }, // East Wall Top (opening y: 460..580)
  { x: 920, y: 580, width: 40, height: 60 }, // East Wall Bottom

  // ====================================================
  // ROOM FURNITURE & OBSTACLE COLLIDERS
  // ====================================================

  // --- CAFETERIA ---
  // Large Central Meeting Table & chairs
  { x: 1110, y: 590, width: 180, height: 100, isObstacle: true },
  // Side Dining Tables
  { x: 980, y: 560, width: 60, height: 35, isObstacle: true },
  { x: 1360, y: 560, width: 60, height: 35, isObstacle: true },
  // Vending Machine (North Wall Left)
  { x: 960, y: 430, width: 36, height: 24, isObstacle: true },
  // Vending Machine (North Wall Right)
  { x: 1400, y: 430, width: 36, height: 24, isObstacle: true },
  // Food Counter (South-West near exit)
  { x: 940, y: 790, width: 70, height: 28, isObstacle: true },

  // --- REACTOR ---
  // Reactor Core & Containment Ring
  { x: 195, y: 785, width: 110, height: 110, isObstacle: true },
  // Left Hand-Scanner Station (Upper)
  { x: 120, y: 660, width: 40, height: 30, isObstacle: true },
  // Right Hand-Scanner Station (Lower)
  { x: 120, y: 990, width: 40, height: 30, isObstacle: true },

  // --- UPPER ENGINE ---
  // Engine Turbine
  { x: 405, y: 465, width: 60, height: 70, isObstacle: true },
  // Engine Control Panel
  { x: 300, y: 355, width: 55, height: 22, isObstacle: true },

  // --- LOWER ENGINE ---
  // Engine Turbine
  { x: 405, y: 1205, width: 60, height: 70, isObstacle: true },
  // Engine Control Panel
  { x: 300, y: 1385, width: 55, height: 22, isObstacle: true },

  // --- MEDBAY ---
  // Scanner Platform
  { x: 760, y: 470, width: 50, height: 26, isObstacle: true },
  // Hospital Bed Cluster
  { x: 650, y: 350, width: 70, height: 40, isObstacle: true },
  // Medicine Cabinet (East Wall)
  { x: 890, y: 420, width: 22, height: 50, isObstacle: true },

  // --- ADMIN ---
  // Large Hologram Map Table
  { x: 1610, y: 1000, width: 80, height: 40, isObstacle: true },
  // Card Swipe Terminal (East Wall)
  { x: 1780, y: 940, width: 22, height: 36, isObstacle: true },

  // --- ELECTRICAL ---
  // Central Transformer Generator
  { x: 730, y: 1040, width: 55, height: 60, isObstacle: true },
  // Electrical Panel Row (North Wall)
  { x: 650, y: 930, width: 200, height: 18, isObstacle: true },

  // --- SECURITY ---
  // CCTV Desk
  { x: 740, y: 720, width: 60, height: 24, isObstacle: true },
  // Filing Cabinet (Corner)
  { x: 860, y: 660, width: 22, height: 40, isObstacle: true },

  // --- STORAGE ---
  // Crate Stack (Center-Left)
  { x: 990, y: 1090, width: 75, height: 75, isObstacle: true },
  // Crate Stack (Center-Right)
  { x: 1080, y: 1160, width: 50, height: 50, isObstacle: true },
  // Fuel Canister Station (South-East)
  { x: 1200, y: 1360, width: 50, height: 40, isObstacle: true },
  // Garbage Compactor (Bottom)
  { x: 1140, y: 1400, width: 45, height: 35, isObstacle: true },

  // --- O2 ---
  // Greenhouse Dome (Main)
  { x: 1640, y: 760, width: 44, height: 44, isObstacle: true },
  // Plant Pots Row (South Wall)
  { x: 1580, y: 840, width: 80, height: 18, isObstacle: true },

  // --- SHIELDS ---
  // Shield Energy Generator Core
  { x: 1755, y: 1280, width: 50, height: 50, isObstacle: true },

  // --- NAVIGATION ---
  // Steering Consoles (Far East)
  { x: 2300, y: 810, width: 30, height: 70, isObstacle: true },
  // Pilot Seat Left
  { x: 2200, y: 730, width: 28, height: 28, isObstacle: true },
  // Pilot Seat Right
  { x: 2200, y: 930, width: 28, height: 28, isObstacle: true },

  // --- WEAPONS ---
  // Asteroid Shooter Console
  { x: 1850, y: 470, width: 45, height: 36, isObstacle: true },
  // Weapon Rack (West Wall)
  { x: 1620, y: 365, width: 18, height: 60, isObstacle: true },

  // --- COMMUNICATIONS ---
  // Radio Console (Center)
  { x: 1395, y: 1330, width: 55, height: 40, isObstacle: true },
];

// ============================================================================
// LOCKED DOOR COLLIDERS (during Door Sabotage)
// ============================================================================
export const LOCKED_DOOR_WALLS: Record<string, WallBox[]> = {
  cafeteria: [
    { x: 880, y: 460, width: 40, height: 120, isObstacle: true }, // NW doorway
    { x: 1480, y: 460, width: 40, height: 120, isObstacle: true }, // NE doorway
    { x: 1080, y: 860, width: 200, height: 40, isObstacle: true }, // South doorway
  ],
  medbay: [
    { x: 880, y: 460, width: 40, height: 120, isObstacle: true },
    { x: 680, y: 600, width: 160, height: 40, isObstacle: true },
  ],
  security: [
    { x: 580, y: 720, width: 40, height: 120, isObstacle: true },
    { x: 680, y: 600, width: 160, height: 40, isObstacle: true },
    { x: 680, y: 880, width: 160, height: 40, isObstacle: true },
  ],
  electrical: [
    { x: 680, y: 880, width: 160, height: 40, isObstacle: true },
    { x: 920, y: 1120, width: 40, height: 140, isObstacle: true },
    { x: 580, y: 1140, width: 40, height: 120, isObstacle: true },
  ],
  storage: [
    { x: 1080, y: 980, width: 200, height: 40, isObstacle: true },
    { x: 1260, y: 960, width: 40, height: 120, isObstacle: true },
    { x: 860, y: 1120, width: 40, height: 140, isObstacle: true },
  ],
  admin: [
    { x: 1460, y: 960, width: 40, height: 120, isObstacle: true },
  ],
  reactor: [
    { x: 200, y: 560, width: 140, height: 40, isObstacle: true },
    { x: 200, y: 1020, width: 140, height: 40, isObstacle: true },
    { x: 420, y: 720, width: 40, height: 120, isObstacle: true },
  ],
  upper_engine: [
    { x: 600, y: 440, width: 40, height: 120, isObstacle: true },
    { x: 220, y: 560, width: 40, height: 100, isObstacle: true },
  ],
  lower_engine: [
    { x: 600, y: 1140, width: 40, height: 120, isObstacle: true },
    { x: 220, y: 1020, width: 40, height: 120, isObstacle: true },
  ],
};

// ============================================================================
// CONTINUOUS COLLISION CHECK & MOVEMENT RESOLVER
// ============================================================================

/**
 * Checks if a circle at (x, y) with radius overlaps ANY solid wall, obstacle or locked door.
 * Dead ghosts (isGhost = true) bypass collision.
 */
export function checkCollision(
  x: number,
  y: number,
  radius = 16,
  isGhost = false,
  lockedDoors?: Record<string, number>
): boolean {
  if (isGhost) return false;

  const now = Date.now();

  // Test static structural walls and obstacles
  for (const wall of WALLS) {
    const nearestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const nearestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));

    const dx = x - nearestX;
    const dy = y - nearestY;

    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }

  // Test active locked doors
  if (lockedDoors) {
    for (const [roomKey, expiry] of Object.entries(lockedDoors)) {
      if (expiry > now) {
        const normalizedKey = roomKey.toLowerCase().replace(/\s+/g, '_');
        const doorList = LOCKED_DOOR_WALLS[normalizedKey] || LOCKED_DOOR_WALLS[roomKey.toLowerCase()];
        if (doorList) {
          for (const doorWall of doorList) {
            const nearestX = Math.max(doorWall.x, Math.min(x, doorWall.x + doorWall.width));
            const nearestY = Math.max(doorWall.y, Math.min(y, doorWall.y + doorWall.height));

            const dx = x - nearestX;
            const dy = y - nearestY;

            if (dx * dx + dy * dy < radius * radius) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Resolves player movement with sub-stepping, axis-independent sliding, and locked door blocking.
 * Prevents tunneling through walls at any speed, even with frame rate drops.
 */
export function resolvePlayerMovement(
  currentX: number,
  currentY: number,
  moveDx: number,
  moveDy: number,
  radius = 16,
  isGhost = false,
  lockedDoors?: Record<string, number>
): { x: number; y: number; moved: boolean } {
  if (isGhost) {
    return {
      x: Math.max(60, Math.min(MAP_WIDTH - 60, currentX + moveDx)),
      y: Math.max(340, Math.min(MAP_HEIGHT - 120, currentY + moveDy)),
      moved: moveDx !== 0 || moveDy !== 0,
    };
  }

  const totalDist = Math.hypot(moveDx, moveDy);
  if (totalDist === 0) return { x: currentX, y: currentY, moved: false };

  // Sub-step movement into max 3px increments
  const maxStep = 3;
  const steps = Math.max(1, Math.ceil(totalDist / maxStep));
  const stepX = moveDx / steps;
  const stepY = moveDy / steps;

  let px = currentX;
  let py = currentY;

  for (let s = 0; s < steps; s++) {
    // Try moving in X axis
    const nextX = px + stepX;
    if (!checkCollision(nextX, py, radius, false, lockedDoors)) {
      px = Math.max(60, Math.min(MAP_WIDTH - 60, nextX));
    }

    // Try moving in Y axis
    const nextY = py + stepY;
    if (!checkCollision(px, nextY, radius, false, lockedDoors)) {
      py = Math.max(340, Math.min(MAP_HEIGHT - 120, nextY));
    }
  }

  // Anti-trap pushout: If somehow inside a wall, nudge towards nearest safe position
  if (checkCollision(px, py, radius - 2, false, lockedDoors)) {
    const safePos = getNearestSafePosition(px, py);
    px = safePos.x;
    py = safePos.y;
  }

  return {
    x: px,
    y: py,
    moved: px !== currentX || py !== currentY,
  };
}

/**
 * Safe pushout for players caught in a collider (e.g. after emergency meeting spawn)
 */
export function getNearestSafePosition(x: number, y: number): { x: number; y: number } {
  // Test radial directions in 10px rings up to 60px
  for (let dist = 10; dist <= 60; dist += 10) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const testX = x + Math.cos(a) * dist;
      const testY = y + Math.sin(a) * dist;
      if (!checkCollision(testX, testY, 14, false)) {
        return { x: testX, y: testY };
      }
    }
  }
  return SPAWN_POSITION;
}

export function getCurrentRoomName(x: number, y: number): string {
  for (const room of ROOMS) {
    if (
      x >= room.x &&
      x <= room.x + room.width &&
      y >= room.y &&
      y <= room.y + room.height
    ) {
      return room.name;
    }
  }
  for (const corr of CORRIDORS) {
    if (
      x >= corr.x &&
      x <= corr.x + corr.width &&
      y >= corr.y &&
      y <= corr.y + corr.height
    ) {
      return corr.name;
    }
  }
  return 'Flur';
}

// ============================================================================
// WAYPOINT GRAPH FOR BOT PATHFINDING (NavMesh)
// ============================================================================
export interface Waypoint {
  id: string;
  x: number;
  y: number;
  room: string;
  neighbors: string[];
}

export const WAYPOINTS: Waypoint[] = [
  // Cafeteria
  { id: 'wp-caf-center', x: 1200, y: 510, room: 'Cafeteria', neighbors: ['wp-caf-nw', 'wp-caf-ne', 'wp-caf-s'] },
  { id: 'wp-caf-nw', x: 1000, y: 490, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-medbay'] },
  { id: 'wp-caf-ne', x: 1400, y: 490, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-weapons'] },
  { id: 'wp-caf-s', x: 1180, y: 820, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-storage-n'] },

  // Medbay & Upper Engine
  { id: 'wp-medbay', x: 840, y: 500, room: 'MedBay', neighbors: ['wp-caf-nw', 'wp-upper-engine', 'wp-security'] },
  { id: 'wp-upper-engine', x: 500, y: 440, room: 'Upper Engine', neighbors: ['wp-medbay', 'wp-reactor-top'] },

  // Reactor
  { id: 'wp-reactor-top', x: 220, y: 640, room: 'Reactor', neighbors: ['wp-upper-engine', 'wp-reactor-mid'] },
  { id: 'wp-reactor-mid', x: 360, y: 780, room: 'Reactor', neighbors: ['wp-reactor-top', 'wp-reactor-bot', 'wp-security'] },
  { id: 'wp-reactor-bot', x: 220, y: 1000, room: 'Reactor', neighbors: ['wp-reactor-mid', 'wp-lower-engine'] },

  // Security & Electrical
  { id: 'wp-security', x: 680, y: 740, room: 'Security', neighbors: ['wp-medbay', 'wp-reactor-mid', 'wp-electrical'] },
  { id: 'wp-electrical', x: 720, y: 980, room: 'Electrical', neighbors: ['wp-security', 'wp-storage-w', 'wp-lower-engine'] },

  // Lower Engine
  { id: 'wp-lower-engine', x: 500, y: 1200, room: 'Lower Engine', neighbors: ['wp-reactor-bot', 'wp-electrical'] },

  // Storage
  { id: 'wp-storage-n', x: 1180, y: 1060, room: 'Storage', neighbors: ['wp-caf-s', 'wp-storage-center'] },
  { id: 'wp-storage-center', x: 1120, y: 1240, room: 'Storage', neighbors: ['wp-storage-n', 'wp-storage-w', 'wp-storage-e', 'wp-comms'] },
  { id: 'wp-storage-w', x: 940, y: 1180, room: 'Storage', neighbors: ['wp-storage-center', 'wp-electrical'] },
  { id: 'wp-storage-e', x: 1240, y: 1040, room: 'Storage', neighbors: ['wp-storage-center', 'wp-admin'] },

  // Admin
  { id: 'wp-admin', x: 1560, y: 1020, room: 'Admin', neighbors: ['wp-storage-e', 'wp-o2', 'wp-shields'] },

  // Communications
  { id: 'wp-comms', x: 1420, y: 1340, room: 'Communications', neighbors: ['wp-storage-center', 'wp-shields'] },

  // Shields
  { id: 'wp-shields', x: 1700, y: 1240, room: 'Shields', neighbors: ['wp-comms', 'wp-nav-s', 'wp-admin'] },

  // O2
  { id: 'wp-o2', x: 1600, y: 780, room: 'O2', neighbors: ['wp-admin', 'wp-weapons', 'wp-nav-n'] },

  // Weapons
  { id: 'wp-weapons', x: 1760, y: 480, room: 'Weapons', neighbors: ['wp-caf-ne', 'wp-o2', 'wp-nav-n'] },

  // Navigation
  { id: 'wp-nav-n', x: 2100, y: 760, room: 'Navigation', neighbors: ['wp-weapons', 'wp-o2', 'wp-nav-s'] },
  { id: 'wp-nav-s', x: 2100, y: 960, room: 'Navigation', neighbors: ['wp-nav-n', 'wp-shields'] },
];

/**
 * Finds the nearest waypoint to any coordinate
 */
export function getNearestWaypoint(x: number, y: number): Waypoint {
  let closest = WAYPOINTS[0];
  let minDist = Infinity;
  for (const wp of WAYPOINTS) {
    const d = Math.hypot(x - wp.x, y - wp.y);
    if (d < minDist) {
      minDist = d;
      closest = wp;
    }
  }
  return closest;
}

/**
 * Simple Dijkstra Pathfinding between waypoints for Bot navigation
 */
export function findBotPath(startX: number, startY: number, targetX: number, targetY: number): Waypoint[] {
  const startWp = getNearestWaypoint(startX, startY);
  const targetWp = getNearestWaypoint(targetX, targetY);

  if (startWp.id === targetWp.id) return [targetWp];

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const wp of WAYPOINTS) {
    distances[wp.id] = Infinity;
    previous[wp.id] = null;
    unvisited.add(wp.id);
  }
  distances[startWp.id] = 0;

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let shortest = Infinity;

    for (const id of unvisited) {
      if (distances[id] < shortest) {
        shortest = distances[id];
        currentId = id;
      }
    }

    if (!currentId || shortest === Infinity) break;
    if (currentId === targetWp.id) break;

    unvisited.delete(currentId);
    const currentWp = WAYPOINTS.find((w) => w.id === currentId)!;

    for (const neighborId of currentWp.neighbors) {
      if (!unvisited.has(neighborId)) continue;
      const neighborWp = WAYPOINTS.find((w) => w.id === neighborId)!;
      const weight = Math.hypot(currentWp.x - neighborWp.x, currentWp.y - neighborWp.y);
      const alt = distances[currentId] + weight;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
      }
    }
  }

  const path: Waypoint[] = [];
  let curr: string | null = targetWp.id;
  while (curr) {
    const wp = WAYPOINTS.find((w) => w.id === curr);
    if (wp) path.unshift(wp);
    curr = previous[curr];
  }
  return path;
}
