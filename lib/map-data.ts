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

export const SPAWN_POSITION = { x: 1200, y: 580 };
export const EMERGENCY_BUTTON_POS = { x: 1200, y: 730, radius: 48 };

// Designated safe spawn slots around the Cafeteria meeting table (away from collision bounds)
export const SPAWN_SLOTS = [
  { x: 1200, y: 560 }, // Top
  { x: 1040, y: 600 }, // Top-Left
  { x: 1360, y: 600 }, // Top-Right
  { x: 960, y: 730 },  // Left
  { x: 1440, y: 730 }, // Right
  { x: 1040, y: 860 }, // Bottom-Left
  { x: 1360, y: 860 }, // Bottom-Right
  { x: 1200, y: 890 }, // Bottom
  { x: 1120, y: 550 },
  { x: 1280, y: 550 },
  { x: 1120, y: 890 },
  { x: 1280, y: 890 },
];

export function getSpawnPosition(index: number) {
  return SPAWN_SLOTS[index % SPAWN_SLOTS.length] || SPAWN_POSITION;
}

// 14 Skeld Rooms with Exact Bounds
export const ROOMS: RoomArea[] = [
  { id: 'cafeteria', name: 'Cafeteria', x: 920, y: 460, width: 560, height: 440, color: '#1e293b' },
  { id: 'weapons', name: 'Weapons', x: 1600, y: 360, width: 380, height: 320, color: '#1e293b' },
  { id: 'o2', name: 'O2', x: 1540, y: 720, width: 280, height: 260, color: '#1e293b' },
  { id: 'navigation', name: 'Navigation', x: 1960, y: 660, width: 380, height: 380, color: '#1e293b' },
  { id: 'shields', name: 'Shields', x: 1600, y: 1060, width: 360, height: 320, color: '#1e293b' },
  { id: 'communications', name: 'Communications', x: 1280, y: 1220, width: 300, height: 260, color: '#1e293b' },
  { id: 'storage', name: 'Storage', x: 900, y: 1020, width: 500, height: 440, color: '#1e293b' },
  { id: 'admin', name: 'Admin', x: 1480, y: 920, width: 340, height: 260, color: '#1e293b' },
  { id: 'electrical', name: 'Electrical', x: 620, y: 920, width: 320, height: 340, color: '#1e293b' },
  { id: 'lower_engine', name: 'Lower Engine', x: 260, y: 1080, width: 340, height: 340, color: '#1e293b' },
  { id: 'security', name: 'Security', x: 620, y: 640, width: 280, height: 260, color: '#1e293b' },
  { id: 'reactor', name: 'Reactor', x: 80, y: 620, width: 340, height: 440, color: '#1e293b' },
  { id: 'upper_engine', name: 'Upper Engine', x: 260, y: 360, width: 340, height: 320, color: '#1e293b' },
  { id: 'medbay', name: 'MedBay', x: 620, y: 360, width: 320, height: 260, color: '#1e293b' },
];

// Hallways seamlessly connecting all rooms
export const CORRIDORS: CorridorArea[] = [
  // Cafeteria <-> MedBay (NW Hallway)
  { id: 'corr-caf-med', name: 'Flur (Cafeteria ➔ MedBay)', x: 900, y: 460, width: 60, height: 160 },
  { id: 'corr-med-upper', name: 'Flur (MedBay ➔ Upper Engine)', x: 560, y: 440, width: 100, height: 140 },
  // West Corridor (MedBay <-> Security <-> Electrical)
  { id: 'corr-med-sec', name: 'Flur (MedBay ➔ Security)', x: 680, y: 580, width: 140, height: 100 },
  { id: 'corr-sec-elec', name: 'Flur (Security ➔ Electrical)', x: 680, y: 860, width: 140, height: 100 },
  // Reactor Hallways
  { id: 'corr-react-upper', name: 'Flur (Reactor ➔ Upper Engine)', x: 200, y: 580, width: 160, height: 120 },
  { id: 'corr-react-lower', name: 'Flur (Reactor ➔ Lower Engine)', x: 200, y: 1020, width: 160, height: 120 },
  { id: 'corr-react-sec', name: 'Flur (Reactor ➔ Security)', x: 380, y: 760, width: 280, height: 140 },
  // Electrical <-> Lower Engine & Storage
  { id: 'corr-elec-lower', name: 'Flur (Electrical ➔ Lower Engine)', x: 540, y: 1140, width: 120, height: 140 },
  { id: 'corr-elec-stor', name: 'Flur (Electrical ➔ Storage)', x: 880, y: 1060, width: 80, height: 160 },
  // Central Hallway (Cafeteria <-> Storage)
  { id: 'corr-center-main', name: 'Zentralflur (Cafeteria ➔ Storage)', x: 1060, y: 880, width: 200, height: 160 },
  // Storage <-> Admin & Comms
  { id: 'corr-stor-admin', name: 'Flur (Storage ➔ Admin)', x: 1360, y: 1000, width: 140, height: 140 },
  { id: 'corr-stor-comms', name: 'Flur (Storage ➔ Comms)', x: 1240, y: 1240, width: 100, height: 140 },
  // Cafeteria <-> Weapons (NE Hallway)
  { id: 'corr-caf-weap', name: 'Flur (Cafeteria ➔ Weapons)', x: 1440, y: 460, width: 180, height: 140 },
  // Weapons <-> O2 <-> Navigation
  { id: 'corr-weap-nav', name: 'Flur (Weapons ➔ Navigation)', x: 1720, y: 640, width: 260, height: 140 },
  { id: 'corr-o2-nav', name: 'Flur (O2 ➔ Navigation)', x: 1800, y: 780, width: 180, height: 120 },
  // Navigation <-> Shields
  { id: 'corr-nav-shield', name: 'Flur (Navigation ➔ Shields)', x: 1780, y: 980, width: 200, height: 140 },
  // Shields <-> Comms
  { id: 'corr-shield-comms', name: 'Flur (Shields ➔ Comms)', x: 1540, y: 1200, width: 100, height: 140 },
];

// Complete Tasks Definitions
export const ALL_TASKS: TaskDefinition[] = [
  // Admin
  { id: 'task-admin-card', type: 'swipe_card', name: 'Karte durchziehen', room: 'Admin', x: 1720, y: 1080 },
  { id: 'task-wires-admin', type: 'wires', name: 'Drähte verbinden', room: 'Admin', x: 1520, y: 1140 },

  // Cafeteria
  { id: 'task-cafeteria-garbage', type: 'empty_garbage', name: 'Müll entsorgen', room: 'Cafeteria', x: 1400, y: 500 },
  { id: 'task-cafeteria-download', type: 'download_data', name: 'Daten herunterladen', room: 'Cafeteria', x: 1000, y: 500 },
  { id: 'task-wires-cafeteria', type: 'wires', name: 'Drähte verbinden', room: 'Cafeteria', x: 1420, y: 840 },

  // Shields
  { id: 'task-shields-prime', type: 'prime_shields', name: 'Schilde aktivieren', room: 'Shields', x: 1840, y: 1220 },
  { id: 'task-shields-divert', type: 'divert_power', name: 'Energie umleiten', room: 'Shields', x: 1640, y: 1320 },

  // Weapons
  { id: 'task-weapons-asteroids', type: 'clear_asteroids', name: 'Asteroiden abschießen', room: 'Weapons', x: 1860, y: 400 },
  { id: 'task-weapons-download', type: 'download_data', name: 'Daten herunterladen', room: 'Weapons', x: 1680, y: 620 },

  // Electrical
  { id: 'task-calibrate-distributor', type: 'calibrate_distributor', name: 'Verteiler kalibrieren', room: 'Electrical', x: 860, y: 980 },
  { id: 'task-wires-electrical', type: 'wires', name: 'Drähte verbinden', room: 'Electrical', x: 670, y: 960 },
  { id: 'task-electrical-power', type: 'divert_power', name: 'Energie umleiten', room: 'Electrical', x: 740, y: 1200 },

  // O2
  { id: 'task-o2-filter', type: 'clean_o2_filter', name: 'O2 Filter reinigen', room: 'O2', x: 1740, y: 800 },
  { id: 'task-o2-garbage', type: 'empty_garbage', name: 'Müllschacht leeren', room: 'O2', x: 1760, y: 940 },

  // Navigation
  { id: 'task-chart-course', type: 'chart_course', name: 'Kurs festlegen', room: 'Navigation', x: 2240, y: 740 },
  { id: 'task-nav-download', type: 'download_data', name: 'Daten übertragen', room: 'Navigation', x: 2040, y: 960 },

  // Reactor
  { id: 'task-start-reactor', type: 'start_reactor', name: 'Reaktor starten (Simon Says)', room: 'Reactor', x: 140, y: 720 },
  { id: 'task-reactor-manifolds', type: 'manifolds', name: 'Manifolds entsperren (1-10)', room: 'Reactor', x: 140, y: 940 },

  // MedBay
  { id: 'task-medbay-scan', type: 'medbay_scan', name: 'MedBay Körperscan', room: 'MedBay', x: 800, y: 510 },
  { id: 'task-medbay-inspect', type: 'inspect_sample', name: 'Proben analysieren', room: 'MedBay', x: 700, y: 560 },

  // Upper Engine
  { id: 'task-upper-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Upper Engine', x: 380, y: 400 },
  { id: 'task-upper-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Upper Engine', x: 320, y: 620 },

  // Lower Engine
  { id: 'task-lower-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Lower Engine', x: 380, y: 1360 },
  { id: 'task-lower-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Lower Engine', x: 320, y: 1140 },

  // Storage
  { id: 'task-storage-refuel', type: 'refuel_engines', name: 'Kanister auftanken', room: 'Storage', x: 1180, y: 1380 },
  { id: 'task-storage-garbage', type: 'empty_garbage', name: 'Müllpresse leeren', room: 'Storage', x: 1240, y: 1400 },
  { id: 'task-wires-storage', type: 'wires', name: 'Drähte verbinden', room: 'Storage', x: 1040, y: 1060 },

  // Communications
  { id: 'task-comms-download', type: 'download_data', name: 'Daten herunterladen', room: 'Communications', x: 1480, y: 1400 },
];

// Impostor Vents
export const VENTS: VentDefinition[] = [
  { id: 'vent-medbay', room: 'MedBay', x: 680, y: 420, connectedVents: ['vent-electrical', 'vent-security'] },
  { id: 'vent-electrical', room: 'Electrical', x: 680, y: 1200, connectedVents: ['vent-medbay', 'vent-security'] },
  { id: 'vent-security', room: 'Security', x: 680, y: 860, connectedVents: ['vent-medbay', 'vent-electrical'] },

  { id: 'vent-reactor-top', room: 'Reactor (Oben)', x: 140, y: 670, connectedVents: ['vent-upper-engine'] },
  { id: 'vent-upper-engine', room: 'Upper Engine', x: 540, y: 420, connectedVents: ['vent-reactor-top'] },

  { id: 'vent-reactor-bottom', room: 'Reactor (Unten)', x: 140, y: 1010, connectedVents: ['vent-lower-engine'] },
  { id: 'vent-lower-engine', room: 'Lower Engine', x: 540, y: 1360, connectedVents: ['vent-reactor-bottom'] },

  { id: 'vent-nav-top', room: 'Navigation (Oben)', x: 2240, y: 710, connectedVents: ['vent-weapons'] },
  { id: 'vent-weapons', room: 'Weapons', x: 1660, y: 410, connectedVents: ['vent-nav-top'] },

  { id: 'vent-nav-bottom', room: 'Navigation (Unten)', x: 2240, y: 990, connectedVents: ['vent-shields'] },
  { id: 'vent-shields', room: 'Shields', x: 1660, y: 1330, connectedVents: ['vent-nav-bottom'] },

  { id: 'vent-admin', room: 'Admin', x: 1760, y: 1130, connectedVents: ['vent-cafeteria-hall'] },
  { id: 'vent-cafeteria-hall', room: 'Flur', x: 1440, y: 880, connectedVents: ['vent-admin'] },
];

// CCTV Security Camera Positions (Physical props mounted on corridor bulkheads)
export const SECURITY_CAMERAS = [
  { id: 'cam-medbay', name: 'MedBay Flur', x: 880, y: 450, facing: 'right' },
  { id: 'cam-admin', name: 'Admin Flur', x: 1420, y: 980, facing: 'left' },
  { id: 'cam-nav', name: 'Navigation Flur', x: 1940, y: 760, facing: 'left' },
  { id: 'cam-reactor', name: 'Reaktor Flur', x: 440, y: 800, facing: 'right' },
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
  { x: 0, y: 0, width: MAP_WIDTH, height: 340 }, // North space void
  { x: 0, y: 1480, width: MAP_WIDTH, height: 120 }, // South space void
  { x: 0, y: 0, width: 60, height: MAP_HEIGHT }, // Far West space void
  { x: 2360, y: 0, width: 40, height: MAP_HEIGHT }, // Far East space void

  // Outer Engine Pod Hull Cutouts
  { x: 0, y: 340, width: 240, height: 260 }, // Upper left void
  { x: 0, y: 1080, width: 240, height: 400 }, // Lower left void

  // ----------------------------------------------------
  // 1. CAFETERIA WALLS
  // ----------------------------------------------------
  // North Wall (solid except observation window sill)
  { x: 920, y: 420, width: 560, height: 40 },
  // West Wall (opening to NW Hallway at y: 460..580)
  { x: 880, y: 580, width: 40, height: 320 },
  // East Wall (opening to NE Hallway at y: 460..580)
  { x: 1480, y: 580, width: 40, height: 320 },
  // South Wall (Left Wing & Right Wing, opening to Central corridor x: 1060..1260)
  { x: 920, y: 880, width: 140, height: 40 },
  { x: 1260, y: 880, width: 220, height: 40 },

  // ----------------------------------------------------
  // 2. WEAPONS WALLS
  // ----------------------------------------------------
  // North Wall & Hull
  { x: 1600, y: 320, width: 380, height: 40 },
  // West Wall (opening to Cafeteria hall at y: 460..580)
  { x: 1560, y: 320, width: 40, height: 140 },
  { x: 1560, y: 580, width: 40, height: 100 },
  // East Outer Wall
  { x: 1980, y: 320, width: 40, height: 360 },
  // South Wall (opening to Nav corridor x: 1720..1980)
  { x: 1600, y: 660, width: 120, height: 40 },

  // ----------------------------------------------------
  // 3. O2 WALLS
  // ----------------------------------------------------
  { x: 1540, y: 680, width: 280, height: 40 }, // North Wall
  { x: 1500, y: 680, width: 40, height: 300 }, // West Wall (blocks Admin/hall)
  { x: 1540, y: 960, width: 280, height: 40 }, // South Wall
  // East Wall has opening to Nav corridor at y: 780..900
  { x: 1820, y: 680, width: 40, height: 100 },
  { x: 1820, y: 900, width: 40, height: 80 },

  // ----------------------------------------------------
  // 4. NAVIGATION WALLS (Pointy Cockpit Nose)
  // ----------------------------------------------------
  { x: 1960, y: 620, width: 380, height: 40 }, // North Wall
  { x: 2340, y: 620, width: 40, height: 440 }, // Far East Cockpit Nose
  { x: 1960, y: 1020, width: 380, height: 40 }, // South Wall
  // West Wall (openings to Weapons/O2 corridor at y:640..780 and Shields at y:940..1020)
  { x: 1940, y: 780, width: 40, height: 160 },

  // ----------------------------------------------------
  // 5. SHIELDS WALLS
  // ----------------------------------------------------
  // North Wall (opening to Nav corridor x: 1780..1980)
  { x: 1600, y: 1020, width: 180, height: 40 },
  // East Outer Wall
  { x: 1960, y: 1020, width: 40, height: 360 },
  // South Outer Wall
  { x: 1600, y: 1360, width: 400, height: 40 },
  // West Wall (opening to Comms corridor y: 1200..1340)
  { x: 1580, y: 1020, width: 40, height: 180 },

  // ----------------------------------------------------
  // 6. COMMUNICATIONS WALLS
  // ----------------------------------------------------
  { x: 1280, y: 1180, width: 300, height: 40 }, // North Wall
  { x: 1280, y: 1460, width: 300, height: 40 }, // South Wall
  // West Wall has opening to Storage at y: 1240..1380
  { x: 1260, y: 1180, width: 40, height: 60 },
  { x: 1260, y: 1380, width: 40, height: 100 },

  // ----------------------------------------------------
  // 7. STORAGE WALLS
  // ----------------------------------------------------
  // North Wall (Left & Right of central hall x: 1060..1260)
  { x: 900, y: 1000, width: 160, height: 40 },
  { x: 1260, y: 1000, width: 140, height: 40 },
  // West Wall (opening to Electrical at y: 1060..1220)
  { x: 860, y: 1220, width: 40, height: 260 },
  // South Wall (opening to Comms at x: 1240..1340)
  { x: 900, y: 1440, width: 340, height: 40 },
  // East Wall (opening to Admin hall at y: 1000..1140)
  { x: 1380, y: 1140, width: 40, height: 320 },

  // ----------------------------------------------------
  // 8. ADMIN WALLS
  // ----------------------------------------------------
  { x: 1480, y: 880, width: 340, height: 40 }, // North Wall
  { x: 1480, y: 1160, width: 340, height: 40 }, // South Wall
  { x: 1800, y: 880, width: 40, height: 300 }, // East Wall
  // West Wall has opening to Storage hall at y: 1000..1140
  { x: 1460, y: 880, width: 40, height: 120 },
  { x: 1460, y: 1140, width: 40, height: 40 },

  // ----------------------------------------------------
  // 9. ELECTRICAL WALLS
  // ----------------------------------------------------
  // North Wall (opening to Security at x: 680..820)
  { x: 620, y: 880, width: 60, height: 40 },
  { x: 820, y: 880, width: 120, height: 40 },
  // West Wall (opening to Lower Engine at y: 1140..1260)
  { x: 580, y: 880, width: 40, height: 260 },
  // South Wall
  { x: 620, y: 1240, width: 320, height: 40 },
  // East Wall (opening to Storage at y: 1060..1220)
  { x: 920, y: 880, width: 40, height: 180 },

  // ----------------------------------------------------
  // 10. SECURITY WALLS
  // ----------------------------------------------------
  // North Wall (opening to Medbay at x: 680..820)
  { x: 620, y: 600, width: 60, height: 40 },
  { x: 820, y: 600, width: 120, height: 40 },
  // East Wall
  { x: 880, y: 600, width: 40, height: 300 },
  // West Wall (opening to Reactor hall at y: 740..880)
  { x: 600, y: 600, width: 40, height: 140 },

  // ----------------------------------------------------
  // 11. REACTOR WALLS
  // ----------------------------------------------------
  // North Wall (opening to Upper Engine at x: 200..360)
  { x: 60, y: 580, width: 140, height: 40 },
  // West Outer Hull
  { x: 60, y: 580, width: 40, height: 520 },
  // South Wall (opening to Lower Engine at x: 200..360)
  { x: 60, y: 1040, width: 140, height: 40 },
  // East Wall (opening to Security hall at y: 760..900)
  { x: 400, y: 580, width: 40, height: 180 },
  { x: 400, y: 900, width: 40, height: 180 },

  // ----------------------------------------------------
  // 12. UPPER ENGINE WALLS
  // ----------------------------------------------------
  { x: 260, y: 320, width: 340, height: 40 }, // North Wall
  // West Wall (opening to Reactor at y: 580..680)
  { x: 220, y: 320, width: 40, height: 260 },
  // East Wall (opening to Medbay/NW hall at y: 440..580)
  { x: 580, y: 320, width: 40, height: 120 },
  { x: 580, y: 580, width: 40, height: 120 },
  // South Wall
  { x: 260, y: 660, width: 340, height: 40 },

  // ----------------------------------------------------
  // 13. LOWER ENGINE WALLS
  // ----------------------------------------------------
  // North Wall
  { x: 260, y: 1040, width: 340, height: 40 },
  // West Wall (opening to Reactor at y: 1040..1160)
  { x: 220, y: 1160, width: 40, height: 280 },
  // East Wall (opening to Electrical hall at y: 1140..1280)
  { x: 580, y: 1040, width: 40, height: 100 },
  { x: 580, y: 1280, width: 40, height: 160 },
  // South Wall
  { x: 260, y: 1400, width: 340, height: 40 },

  // ----------------------------------------------------
  // 14. MEDBAY WALLS
  // ----------------------------------------------------
  { x: 620, y: 320, width: 320, height: 40 }, // North Wall
  // West Wall (opening to Upper Engine at y: 440..580)
  { x: 580, y: 320, width: 40, height: 120 },
  // East Wall (opening to Cafeteria at y: 460..580)
  { x: 920, y: 320, width: 40, height: 140 },

  // ====================================================
  // ROOM FURNITURE & OBSTACLE COLLIDERS
  // ====================================================
  // Cafeteria Meeting Table (Center table & chairs)
  { x: 1110, y: 680, width: 180, height: 100, isObstacle: true },
  // Cafeteria Dining Tables
  { x: 955, y: 585, width: 60, height: 35, isObstacle: true },
  { x: 1385, y: 585, width: 60, height: 35, isObstacle: true },
  // Reactor Core & Cooling Columns
  { x: 185, y: 775, width: 130, height: 130, isObstacle: true },
  { x: 238, y: 620, width: 24, height: 155, isObstacle: true },
  { x: 238, y: 905, width: 24, height: 155, isObstacle: true },
  // Upper & Lower Engine Turbines
  { x: 395, y: 475, width: 75, height: 90, isObstacle: true },
  { x: 395, y: 1205, width: 75, height: 90, isObstacle: true },
  // MedBay Beds & Scanner Platform
  { x: 650, y: 360, width: 100, height: 60, isObstacle: true },
  { x: 770, y: 495, width: 60, height: 30, isObstacle: true },
  // Admin Hologram Map Table
  { x: 1600, y: 1015, width: 100, height: 50, isObstacle: true },
  // Electrical Central Transformer Generator
  { x: 720, y: 1020, width: 65, height: 80, isObstacle: true },
  // Security CCTV Desk
  { x: 730, y: 750, width: 80, height: 30, isObstacle: true },
  // Storage Crates & Fuel Station
  { x: 990, y: 1090, width: 85, height: 85, isObstacle: true },
  { x: 1290, y: 1330, width: 85, height: 75, isObstacle: true },
  { x: 1150, y: 1365, width: 60, height: 40, isObstacle: true },
  // O2 Greenhouse Dome
  { x: 1655, y: 830, width: 50, height: 50, isObstacle: true },
  // Shields Energy Generator
  { x: 1745, y: 1190, width: 70, height: 70, isObstacle: true },
  // Navigation Steering Consoles
  { x: 2280, y: 810, width: 40, height: 80, isObstacle: true },
];

// ============================================================================
// BULLETPROOF CONTINUOUS COLLISION CHECK & MOVEMENT RESOLVER
// ============================================================================

/**
 * Checks if a circle at (x, y) with radius overlaps ANY solid wall or obstacle.
 * Dead ghosts (isGhost = true) bypass collision.
 */
export function checkCollision(x: number, y: number, radius = 16, isGhost = false): boolean {
  if (isGhost) return false;

  for (const wall of WALLS) {
    // Nearest point on AABB box to circle center
    const nearestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const nearestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));

    const dx = x - nearestX;
    const dy = y - nearestY;

    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves player movement with sub-stepping and axis-independent sliding.
 * Prevents tunneling through walls at any speed, even with frame rate drops.
 */
export function resolvePlayerMovement(
  currentX: number,
  currentY: number,
  moveDx: number,
  moveDy: number,
  radius = 16,
  isGhost = false
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
    if (!checkCollision(nextX, py, radius, false)) {
      px = Math.max(60, Math.min(MAP_WIDTH - 60, nextX));
    }

    // Try moving in Y axis
    const nextY = py + stepY;
    if (!checkCollision(px, nextY, radius, false)) {
      py = Math.max(340, Math.min(MAP_HEIGHT - 120, nextY));
    }
  }

  // Anti-trap pushout: If somehow inside a wall, nudge towards room center
  if (checkCollision(px, py, radius - 2, false)) {
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
  { id: 'wp-caf-center', x: 1200, y: 600, room: 'Cafeteria', neighbors: ['wp-caf-nw', 'wp-caf-ne', 'wp-caf-s'] },
  { id: 'wp-caf-nw', x: 960, y: 520, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-medbay'] },
  { id: 'wp-caf-ne', x: 1440, y: 520, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-weapons'] },
  { id: 'wp-caf-s', x: 1200, y: 860, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-storage-n'] },

  // Medbay & Upper Engine
  { id: 'wp-medbay', x: 780, y: 500, room: 'MedBay', neighbors: ['wp-caf-nw', 'wp-upper-engine', 'wp-security'] },
  { id: 'wp-upper-engine', x: 440, y: 440, room: 'Upper Engine', neighbors: ['wp-medbay', 'wp-reactor-top'] },

  // Reactor
  { id: 'wp-reactor-top', x: 240, y: 660, room: 'Reactor', neighbors: ['wp-upper-engine', 'wp-reactor-mid'] },
  { id: 'wp-reactor-mid', x: 360, y: 840, room: 'Reactor', neighbors: ['wp-reactor-top', 'wp-reactor-bot', 'wp-security'] },
  { id: 'wp-reactor-bot', x: 240, y: 1000, room: 'Reactor', neighbors: ['wp-reactor-mid', 'wp-lower-engine'] },

  // Security & Electrical
  { id: 'wp-security', x: 740, y: 760, room: 'Security', neighbors: ['wp-medbay', 'wp-reactor-mid', 'wp-electrical'] },
  { id: 'wp-electrical', x: 740, y: 1000, room: 'Electrical', neighbors: ['wp-security', 'wp-storage-w', 'wp-lower-engine'] },

  // Lower Engine
  { id: 'wp-lower-engine', x: 440, y: 1240, room: 'Lower Engine', neighbors: ['wp-reactor-bot', 'wp-electrical'] },

  // Storage
  { id: 'wp-storage-n', x: 1160, y: 1060, room: 'Storage', neighbors: ['wp-caf-s', 'wp-storage-center'] },
  { id: 'wp-storage-center', x: 1160, y: 1240, room: 'Storage', neighbors: ['wp-storage-n', 'wp-storage-w', 'wp-storage-e', 'wp-comms'] },
  { id: 'wp-storage-w', x: 940, y: 1140, room: 'Storage', neighbors: ['wp-storage-center', 'wp-electrical'] },
  { id: 'wp-storage-e', x: 1360, y: 1100, room: 'Storage', neighbors: ['wp-storage-center', 'wp-admin'] },

  // Admin
  { id: 'wp-admin', x: 1600, y: 1040, room: 'Admin', neighbors: ['wp-storage-e', 'wp-o2'] },

  // Communications
  { id: 'wp-comms', x: 1400, y: 1340, room: 'Communications', neighbors: ['wp-storage-center', 'wp-shields'] },

  // Shields
  { id: 'wp-shields', x: 1760, y: 1200, room: 'Shields', neighbors: ['wp-comms', 'wp-nav-s'] },

  // O2
  { id: 'wp-o2', x: 1680, y: 840, room: 'O2', neighbors: ['wp-admin', 'wp-weapons', 'wp-nav-n'] },

  // Weapons
  { id: 'wp-weapons', x: 1760, y: 520, room: 'Weapons', neighbors: ['wp-caf-ne', 'wp-o2', 'wp-nav-n'] },

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
