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

export const SPAWN_POSITION = { x: 1200, y: 480 };
export const EMERGENCY_BUTTON_POS = { x: 1200, y: 500, radius: 48 };

// Designated safe spawn slots around the Cafeteria meeting table (away from collision bounds)
export const SPAWN_SLOTS = [
  { x: 1200, y: 410 }, // Top
  { x: 1100, y: 440 }, // Top-Left
  { x: 1300, y: 440 }, // Top-Right
  { x: 1040, y: 500 }, // Left
  { x: 1360, y: 500 }, // Right
  { x: 1100, y: 580 }, // Bottom-Left
  { x: 1300, y: 580 }, // Bottom-Right
  { x: 1200, y: 620 }, // Bottom
  { x: 1150, y: 410 },
  { x: 1250, y: 410 },
  { x: 1150, y: 620 },
  { x: 1250, y: 620 },
];

export function getSpawnPosition(index: number) {
  return SPAWN_SLOTS[index % SPAWN_SLOTS.length] || SPAWN_POSITION;
}

// 14 Skeld Rooms matching the authentic Among Us blueprint
export const ROOMS: RoomArea[] = [
  // 1. Cafeteria (Large Center-Top room)
  { id: 'cafeteria', name: 'Cafeteria', x: 960, y: 280, width: 480, height: 440, color: '#263040' },
  // 2. Weapons (Top-Right room)
  { id: 'weapons', name: 'Weapons', x: 1560, y: 280, width: 280, height: 280, color: '#2a3545' },
  // 3. O2 (Right-Center room)
  { id: 'o2', name: 'O2', x: 1460, y: 580, width: 200, height: 180, color: '#1e3328' },
  // 4. Navigation (Far Right Cockpit)
  { id: 'navigation', name: 'Navigation', x: 1960, y: 620, width: 340, height: 320, color: '#1a2842' },
  // 5. Shields (Bottom-Right room)
  { id: 'shields', name: 'Shields', x: 1620, y: 1040, width: 300, height: 260, color: '#1e2d3d' },
  // 6. Communications (Bottom-Center room)
  { id: 'communications', name: 'Communications', x: 1280, y: 1240, width: 240, height: 180, color: '#252d38' },
  // 7. Storage (Large Bottom-Center room)
  { id: 'storage', name: 'Storage', x: 920, y: 960, width: 380, height: 380, color: '#2a3040' },
  // 8. Admin (Right of Central Hallway, below Cafeteria)
  { id: 'admin', name: 'Admin', x: 1340, y: 780, width: 300, height: 220, color: '#242c38' },
  // 9. Electrical (Below Security, left of Storage)
  { id: 'electrical', name: 'Electrical', x: 640, y: 920, width: 240, height: 220, color: '#181c24' },
  // 10. Lower Engine (Bottom-Left Engine Pod)
  { id: 'lower_engine', name: 'Lower Engine', x: 240, y: 1040, width: 320, height: 280, color: '#222c3a' },
  // 11. Security (Right of West Cross, above Electrical)
  { id: 'security', name: 'Security', x: 580, y: 720, width: 200, height: 200, color: '#1c2630' },
  // 12. Reactor (Far-Left Core Room)
  { id: 'reactor', name: 'Reactor', x: 60, y: 640, width: 220, height: 360, color: '#281a1e' },
  // 13. Upper Engine (Top-Left Engine Pod)
  { id: 'upper_engine', name: 'Upper Engine', x: 240, y: 320, width: 320, height: 280, color: '#222c3a' },
  // 14. MedBay (Below Upper Hallway, above Security)
  { id: 'medbay', name: 'MedBay', x: 680, y: 500, width: 260, height: 260, color: '#1a2a26' },
];

// Hallways seamlessly connecting all rooms
export const CORRIDORS: CorridorArea[] = [
  // 1. Upper Hallway (Upper Engine ➔ MedBay ➔ Cafeteria)
  { id: 'corr-upper-hall', name: 'Oberer Flur (Upper Engine ➔ Cafeteria)', x: 540, y: 400, width: 440, height: 100 },
  // 2. West Cross - Vertical (Upper Engine ➔ Lower Engine)
  { id: 'corr-west-cross-vert', name: 'Reaktor-Kreuzung (Nord-Süd)', x: 350, y: 580, width: 100, height: 480 },
  // 3. West Cross - Horizontal (Reactor ➔ Security)
  { id: 'corr-west-cross-horiz', name: 'Reaktor-Kreuzung (Ost-West)', x: 260, y: 760, width: 340, height: 100 },
  // 4. Lower Hallway (Lower Engine ➔ Electrical ➔ Storage)
  { id: 'corr-lower-hall', name: 'Unterer Flur (Lower Engine ➔ Storage)', x: 540, y: 1200, width: 400, height: 100 },
  // 5. Electrical Entrance (from Lower Hallway into Electrical)
  { id: 'corr-elec-entry', name: 'Elektrik Eingang', x: 710, y: 1120, width: 100, height: 100 },
  // 6. Central Hallway (Cafeteria ➔ Storage)
  { id: 'corr-center-main', name: 'Zentralflur (Cafeteria ➔ Storage)', x: 1150, y: 700, width: 100, height: 280 },
  // 7. Admin Entrance Branch (from Central Hallway into Admin)
  { id: 'corr-admin-branch', name: 'Admin Eingang', x: 1230, y: 830, width: 130, height: 100 },
  // 8. Cafeteria to Weapons (NE Hallway)
  { id: 'corr-caf-weap', name: 'Flur (Cafeteria ➔ Weapons)', x: 1420, y: 370, width: 160, height: 100 },
  // 9. East Hallway Hub - Vertical (Weapons ➔ O2 ➔ Shields)
  { id: 'corr-east-hub-vert', name: 'Östlicher Flur (Weapons ➔ Shields)', x: 1640, y: 540, width: 100, height: 520 },
  // 10. East Hallway to Navigation (Top entrance)
  { id: 'corr-east-nav-top', name: 'Flur (O2 ➔ Navigation)', x: 1720, y: 660, width: 260, height: 100 },
  // 11. Navigation to Shields (Bottom entrance)
  { id: 'corr-nav-shield', name: 'Flur (Navigation ➔ Shields)', x: 1840, y: 880, width: 180, height: 180 },
  // 12. Storage to Shields & Comms Hallway
  { id: 'corr-stor-shields', name: 'Flur (Storage ➔ Shields)', x: 1280, y: 1100, width: 360, height: 100 },
  // 13. Communications Entrance Branch
  { id: 'corr-comms-branch', name: 'Funkraum Eingang', x: 1350, y: 1180, width: 100, height: 80 },
];

// Complete Tasks Definitions (Authentic Tasks across all rooms)
export const ALL_TASKS: TaskDefinition[] = [
  // Admin
  { id: 'task-admin-card', type: 'swipe_card', name: 'Karte durchziehen', room: 'Admin', x: 1590, y: 820 },
  { id: 'task-wires-admin', type: 'wires', name: 'Drähte verbinden', room: 'Admin', x: 1380, y: 950 },

  // Cafeteria
  { id: 'task-cafeteria-garbage', type: 'empty_garbage', name: 'Müll entsorgen', room: 'Cafeteria', x: 1380, y: 330 },
  { id: 'task-cafeteria-download', type: 'download_data', name: 'Daten herunterladen', room: 'Cafeteria', x: 1090, y: 330 },
  { id: 'task-wires-cafeteria', type: 'wires', name: 'Drähte verbinden', room: 'Cafeteria', x: 1000, y: 330 },

  // Shields
  { id: 'task-shields-prime', type: 'prime_shields', name: 'Schilde aktivieren', room: 'Shields', x: 1770, y: 1170 },
  { id: 'task-shields-divert', type: 'divert_power', name: 'Energie umleiten', room: 'Shields', x: 1670, y: 1240 },

  // Weapons
  { id: 'task-weapons-asteroids', type: 'clear_asteroids', name: 'Asteroiden abschießen', room: 'Weapons', x: 1770, y: 330 },
  { id: 'task-weapons-download', type: 'download_data', name: 'Daten herunterladen', room: 'Weapons', x: 1630, y: 500 },

  // Electrical
  { id: 'task-calibrate-distributor', type: 'calibrate_distributor', name: 'Verteiler kalibrieren', room: 'Electrical', x: 820, y: 960 },
  { id: 'task-wires-electrical', type: 'wires', name: 'Drähte verbinden', room: 'Electrical', x: 680, y: 960 },
  { id: 'task-electrical-power', type: 'divert_power', name: 'Energie umleiten', room: 'Electrical', x: 760, y: 1080 },

  // O2
  { id: 'task-o2-filter', type: 'clean_o2_filter', name: 'O2 Filter reinigen', room: 'O2', x: 1520, y: 620 },
  { id: 'task-o2-garbage', type: 'empty_garbage', name: 'Müllschacht leeren', room: 'O2', x: 1610, y: 700 },

  // Navigation
  { id: 'task-chart-course', type: 'chart_course', name: 'Kurs festlegen', room: 'Navigation', x: 2240, y: 780 },
  { id: 'task-nav-download', type: 'download_data', name: 'Daten übertragen', room: 'Navigation', x: 2060, y: 880 },

  // Reactor
  { id: 'task-start-reactor', type: 'start_reactor', name: 'Reaktor starten (Simon Says)', room: 'Reactor', x: 100, y: 720 },
  { id: 'task-reactor-manifolds', type: 'manifolds', name: 'Manifolds entsperren (1-10)', room: 'Reactor', x: 100, y: 920 },

  // MedBay
  { id: 'task-medbay-scan', type: 'medbay_scan', name: 'MedBay Körperscan', room: 'MedBay', x: 840, y: 680 },
  { id: 'task-medbay-inspect', type: 'inspect_sample', name: 'Proben analysieren', room: 'MedBay', x: 720, y: 620 },

  // Upper Engine
  { id: 'task-upper-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Upper Engine', x: 360, y: 380 },
  { id: 'task-upper-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Upper Engine', x: 290, y: 530 },

  // Lower Engine
  { id: 'task-lower-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Lower Engine', x: 360, y: 1250 },
  { id: 'task-lower-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Lower Engine', x: 290, y: 1100 },

  // Storage
  { id: 'task-storage-refuel', type: 'refuel_engines', name: 'Kanister auftanken', room: 'Storage', x: 1220, y: 1270 },
  { id: 'task-storage-garbage', type: 'empty_garbage', name: 'Müllpresse leeren', room: 'Storage', x: 1120, y: 1290 },
  { id: 'task-wires-storage', type: 'wires', name: 'Drähte verbinden', room: 'Storage', x: 970, y: 1020 },

  // Communications
  { id: 'task-comms-download', type: 'download_data', name: 'Daten herunterladen', room: 'Communications', x: 1450, y: 1350 },
];

// Impostor Vents: Authentic 14-Vent Skeld Network from reference diagram
export const VENTS: VentDefinition[] = [
  // Triangle 1: MedBay <-> Security <-> Electrical
  { id: 'vent-medbay', room: 'MedBay', x: 720, y: 710, connectedVents: ['vent-security', 'vent-electrical'] },
  { id: 'vent-security', room: 'Security', x: 630, y: 870, connectedVents: ['vent-medbay', 'vent-electrical'] },
  { id: 'vent-electrical', room: 'Electrical', x: 680, y: 970, connectedVents: ['vent-medbay', 'vent-security'] },

  // Triangle 2: Cafeteria (Top-Right) <-> Admin <-> Hallway (Outside Shields)
  { id: 'vent-cafeteria', room: 'Cafeteria', x: 1380, y: 360, connectedVents: ['vent-admin', 'vent-hallway-shields'] },
  { id: 'vent-admin', room: 'Admin', x: 1380, y: 950, connectedVents: ['vent-cafeteria', 'vent-hallway-shields'] },
  { id: 'vent-hallway-shields', room: 'Flur (O2/Shields)', x: 1720, y: 680, connectedVents: ['vent-cafeteria', 'vent-admin'] },

  // Pair 3: Reactor Top <-> Upper Engine
  { id: 'vent-reactor-top', room: 'Reactor (Oben)', x: 110, y: 690, connectedVents: ['vent-upper-engine'] },
  { id: 'vent-upper-engine', room: 'Upper Engine', x: 290, y: 370, connectedVents: ['vent-reactor-top'] },

  // Pair 4: Reactor Bottom <-> Lower Engine
  { id: 'vent-reactor-bottom', room: 'Reactor (Unten)', x: 110, y: 950, connectedVents: ['vent-lower-engine'] },
  { id: 'vent-lower-engine', room: 'Lower Engine', x: 290, y: 1270, connectedVents: ['vent-reactor-bottom'] },

  // Pair 5: Weapons <-> Navigation Top
  { id: 'vent-weapons', room: 'Weapons', x: 1780, y: 340, connectedVents: ['vent-nav-top'] },
  { id: 'vent-nav-top', room: 'Navigation (Oben)', x: 2240, y: 670, connectedVents: ['vent-weapons'] },

  // Pair 6: Shields <-> Navigation Bottom
  { id: 'vent-shields', room: 'Shields', x: 1860, y: 1240, connectedVents: ['vent-nav-bottom'] },
  { id: 'vent-nav-bottom', room: 'Navigation (Unten)', x: 2240, y: 890, connectedVents: ['vent-shields'] },
];

// CCTV Security Camera Positions (Physical props mounted on corridor bulkheads)
export const SECURITY_CAMERAS = [
  { id: 'cam-medbay', name: 'MedBay Flur', x: 900, y: 420, facing: 'right' },
  { id: 'cam-admin', name: 'Admin Flur', x: 1190, y: 860, facing: 'left' },
  { id: 'cam-nav', name: 'Navigation Flur', x: 1740, y: 740, facing: 'left' },
  { id: 'cam-reactor', name: 'Reaktor Flur', x: 450, y: 800, facing: 'right' },
];

// ============================================================================
// EXHAUSTIVE, AIRTIGHT COLLISION GEOMETRY
// Zero gaps into outer space. Zero tunneling.
// ============================================================================
export const WALLS: WallBox[] = [
  // ----------------------------------------------------
  // OUTER SHIP HULL BOUNDARIES (Space Vacuum Barriers)
  // ----------------------------------------------------
  { x: 0, y: 0, width: MAP_WIDTH, height: 260 }, // North space void
  { x: 0, y: 1440, width: MAP_WIDTH, height: 160 }, // South space void
  { x: 0, y: 0, width: 40, height: MAP_HEIGHT }, // Far West space void
  { x: 2320, y: 0, width: 80, height: MAP_HEIGHT }, // Far East space void

  // Outer Engine Pod & Cockpit Hull Cutouts
  { x: 0, y: 260, width: 220, height: 360 }, // Upper left engine void
  { x: 0, y: 1020, width: 220, height: 440 }, // Lower left engine void
  { x: 560, y: 0, width: 400, height: 380 }, // Upper space void between Upper Engine & Cafeteria
  { x: 1430, y: 0, width: 140, height: 350 }, // Upper space void between Cafeteria & Weapons
  { x: 1830, y: 0, width: 500, height: 600 }, // Outer space void above Navigation
  { x: 1920, y: 970, width: 400, height: 480 }, // Outer space void below Navigation
  { x: 540, y: 1330, width: 400, height: 270 }, // Lower space void below Lower Hallway
  { x: 1540, y: 1330, width: 400, height: 270 }, // Lower space void below Shields

  // ----------------------------------------------------
  // 1. CAFETERIA WALLS (x: 960..1440, y: 280..720)
  // ----------------------------------------------------
  { x: 960, y: 250, width: 480, height: 40 }, // North Wall
  { x: 930, y: 280, width: 40, height: 130 }, // West Wall Top
  { x: 930, y: 490, width: 40, height: 230 }, // West Wall Bottom (opening y: 410..490 to Upper Hallway)
  { x: 1430, y: 280, width: 40, height: 100 }, // East Wall Top
  { x: 1430, y: 460, width: 40, height: 260 }, // East Wall Bottom (opening y: 380..460 to Weapons)
  { x: 960, y: 710, width: 200, height: 40 }, // South Wall Left
  { x: 1240, y: 710, width: 200, height: 40 }, // South Wall Right (opening x: 1160..1240 to Central Hallway)

  // ----------------------------------------------------
  // 2. UPPER HALLWAY WALLS (x: 540..980, y: 400..500)
  // ----------------------------------------------------
  { x: 540, y: 370, width: 440, height: 40 }, // North Wall
  { x: 540, y: 490, width: 210, height: 40 }, // South Wall Left
  { x: 830, y: 490, width: 150, height: 40 }, // South Wall Right (opening x: 750..830 down to MedBay)

  // ----------------------------------------------------
  // 3. MEDBAY WALLS (x: 680..940, y: 500..760)
  // ----------------------------------------------------
  { x: 650, y: 490, width: 100, height: 40 }, // North Wall Left
  { x: 830, y: 490, width: 130, height: 40 }, // North Wall Right (opening x: 750..830 to Upper Hallway)
  { x: 650, y: 500, width: 40, height: 270 }, // West Wall
  { x: 680, y: 750, width: 260, height: 40 }, // South Wall
  { x: 930, y: 500, width: 40, height: 270 }, // East Wall

  // ----------------------------------------------------
  // 4. UPPER ENGINE WALLS (x: 240..560, y: 320..600)
  // ----------------------------------------------------
  { x: 220, y: 290, width: 350, height: 40 }, // North Wall
  { x: 210, y: 320, width: 40, height: 290 }, // West Wall
  { x: 550, y: 320, width: 40, height: 90 }, // East Wall Top
  { x: 550, y: 490, width: 40, height: 120 }, // East Wall Bottom (opening y: 410..490 to Upper Hallway)
  { x: 240, y: 590, width: 120, height: 40 }, // South Wall Left
  { x: 440, y: 590, width: 130, height: 40 }, // South Wall Right (opening x: 360..440 to West Cross)

  // ----------------------------------------------------
  // 5. WEST CROSS JUNCTION WALLS
  // ----------------------------------------------------
  { x: 260, y: 620, width: 100, height: 150 }, // NW corner block
  { x: 260, y: 850, width: 100, height: 200 }, // SW corner block
  { x: 440, y: 620, width: 150, height: 150 }, // NE corner block
  { x: 440, y: 850, width: 150, height: 200 }, // SE corner block

  // ----------------------------------------------------
  // 6. REACTOR WALLS (x: 60..280, y: 640..1000)
  // ----------------------------------------------------
  { x: 40, y: 610, width: 240, height: 40 }, // North Wall
  { x: 40, y: 640, width: 40, height: 370 }, // West Wall
  { x: 40, y: 990, width: 240, height: 40 }, // South Wall
  { x: 270, y: 640, width: 40, height: 130 }, // East Wall Top
  { x: 270, y: 850, width: 40, height: 150 }, // East Wall Bottom (opening y: 770..850 to West Cross)

  // ----------------------------------------------------
  // 7. SECURITY WALLS (x: 580..780, y: 720..920)
  // ----------------------------------------------------
  { x: 570, y: 690, width: 230, height: 40 }, // North Wall
  { x: 770, y: 720, width: 40, height: 210 }, // East Wall
  { x: 570, y: 910, width: 230, height: 40 }, // South Wall
  { x: 560, y: 720, width: 40, height: 60 }, // West Wall Top
  { x: 560, y: 850, width: 40, height: 80 }, // West Wall Bottom (opening y: 780..850 to West Cross)

  // ----------------------------------------------------
  // 8. LOWER ENGINE WALLS (x: 240..560, y: 1040..1320)
  // ----------------------------------------------------
  { x: 240, y: 1010, width: 120, height: 40 }, // North Wall Left
  { x: 440, y: 1010, width: 130, height: 40 }, // North Wall Right (opening x: 360..440 to West Cross)
  { x: 210, y: 1040, width: 40, height: 290 }, // West Wall
  { x: 220, y: 1310, width: 350, height: 40 }, // South Wall
  { x: 550, y: 1040, width: 40, height: 170 }, // East Wall Top
  { x: 550, y: 1290, width: 40, height: 40 }, // East Wall Bottom (opening y: 1210..1290 to Lower Hallway)

  // ----------------------------------------------------
  // 9. LOWER HALLWAY & ELECTRICAL WALLS
  // ----------------------------------------------------
  { x: 540, y: 1290, width: 400, height: 40 }, // Lower Hallway South Wall
  { x: 550, y: 1170, width: 170, height: 40 }, // Lower Hallway North Wall Left
  { x: 800, y: 1170, width: 140, height: 40 }, // Lower Hallway North Wall Right (opening x: 720..800 to Electrical)
  { x: 620, y: 890, width: 280, height: 40 }, // Electrical North Wall
  { x: 610, y: 920, width: 40, height: 270 }, // Electrical West Wall
  { x: 870, y: 920, width: 40, height: 270 }, // Electrical East Wall
  { x: 640, y: 1130, width: 80, height: 40 }, // Electrical South Wall Left
  { x: 800, y: 1130, width: 90, height: 40 }, // Electrical South Wall Right (opening x: 720..800)

  // ----------------------------------------------------
  // 10. STORAGE WALLS (x: 920..1300, y: 960..1340)
  // ----------------------------------------------------
  { x: 890, y: 960, width: 40, height: 250 }, // West Wall Top
  { x: 890, y: 1290, width: 40, height: 60 }, // West Wall Bottom (opening y: 1210..1290 to Lower Hallway)
  { x: 920, y: 930, width: 240, height: 40 }, // North Wall Left
  { x: 1240, y: 930, width: 80, height: 40 }, // North Wall Right (opening x: 1160..1240 to Central Hallway)
  { x: 1290, y: 960, width: 40, height: 150 }, // East Wall Top
  { x: 1290, y: 1190, width: 40, height: 160 }, // East Wall Bottom (opening y: 1110..1190 to Shields Hallway)
  { x: 920, y: 1330, width: 380, height: 40 }, // South Wall

  // ----------------------------------------------------
  // 11. CENTRAL HALLWAY & ADMIN WALLS
  // ----------------------------------------------------
  { x: 1120, y: 710, width: 40, height: 270 }, // Central Hallway West Wall
  { x: 1240, y: 710, width: 40, height: 130 }, // Central Hallway East Wall Top
  { x: 1240, y: 920, width: 40, height: 60 }, // Central Hallway East Wall Bottom (opening y: 840..920 to Admin)
  { x: 1340, y: 750, width: 320, height: 40 }, // Admin North Wall
  { x: 1340, y: 990, width: 320, height: 40 }, // Admin South Wall
  { x: 1630, y: 780, width: 40, height: 230 }, // Admin East Wall
  { x: 1320, y: 780, width: 40, height: 60 }, // Admin West Wall Top
  { x: 1320, y: 920, width: 40, height: 80 }, // Admin West Wall Bottom (opening y: 840..920)

  // ----------------------------------------------------
  // 12. WEAPONS & O2 & EAST HALLWAY & NAV CORRIDOR WALLS
  // ----------------------------------------------------
  { x: 1560, y: 250, width: 300, height: 40 }, // Weapons North Wall
  { x: 1830, y: 280, width: 40, height: 300 }, // Weapons East Wall
  { x: 1540, y: 280, width: 40, height: 100 }, // Weapons West Wall Top
  { x: 1540, y: 460, width: 40, height: 110 }, // Weapons West Wall Bottom (opening y: 380..460 to Cafeteria)
  { x: 1560, y: 550, width: 90, height: 40 }, // Weapons South Wall Left
  { x: 1730, y: 550, width: 120, height: 40 }, // Weapons South Wall Right (opening x: 1650..1730 to East Hub)
  { x: 1440, y: 550, width: 210, height: 40 }, // O2 North Wall
  { x: 1430, y: 580, width: 40, height: 190 }, // O2 West Wall
  { x: 1440, y: 750, width: 210, height: 40 }, // O2 South Wall
  { x: 1640, y: 580, width: 40, height: 50 }, // O2 East Wall Top
  { x: 1640, y: 710, width: 40, height: 60 }, // O2 East Wall Bottom (opening y: 630..710 to East Hub)

  // East Corridor branches into Navigation
  { x: 1730, y: 630, width: 240, height: 40 }, // North Wall of Nav Top Hallway (closes upper space gap!)
  { x: 1730, y: 750, width: 240, height: 40 }, // South Wall of Nav Top Hallway
  { x: 1730, y: 850, width: 240, height: 40 }, // North Wall of Nav Bottom Hallway
  { x: 1730, y: 1010, width: 240, height: 40 }, // South Wall of Nav Bottom Hallway

  // ----------------------------------------------------
  // 13. NAVIGATION WALLS (x: 1960..2300, y: 620..940)
  // ----------------------------------------------------
  { x: 1960, y: 590, width: 350, height: 40 }, // North Wall
  { x: 2280, y: 620, width: 40, height: 330 }, // Far East Pointed Cockpit Nose
  { x: 1960, y: 930, width: 350, height: 40 }, // South Wall
  { x: 1940, y: 620, width: 40, height: 50 }, // West Wall Top
  { x: 1940, y: 750, width: 40, height: 110 }, // West Wall Middle (between top and bottom entrance)
  { x: 1940, y: 890, width: 40, height: 50 }, // West Wall Bottom

  // ----------------------------------------------------
  // 14. SHIELDS & COMMS & STORAGE-SHIELDS HALLWAY WALLS
  // ----------------------------------------------------
  { x: 1600, y: 1010, width: 50, height: 40 }, // Shields North Wall Left
  { x: 1730, y: 1010, width: 200, height: 40 }, // Shields North Wall Right (opening x: 1650..1730 to East Hub)
  { x: 1900, y: 1040, width: 40, height: 50 }, // Shields East Wall Top
  { x: 1900, y: 1170, width: 40, height: 140 }, // Shields East Wall Bottom (opening y: 1090..1170 to Nav branch)
  { x: 1600, y: 1290, width: 330, height: 40 }, // Shields South Wall
  { x: 1600, y: 1040, width: 40, height: 70 }, // Shields West Wall Top
  { x: 1600, y: 1190, width: 40, height: 110 }, // Shields West Wall Bottom (opening y: 1110..1190 to Storage Hallway)
  { x: 1280, y: 1070, width: 360, height: 40 }, // Storage-Shields Hallway North Wall
  { x: 1260, y: 1210, width: 100, height: 40 }, // Communications North Wall Left
  { x: 1440, y: 1210, width: 100, height: 40 }, // Communications North Wall Right (opening x: 1360..1440)
  { x: 1260, y: 1410, width: 280, height: 40 }, // Communications South Wall
  { x: 1250, y: 1240, width: 40, height: 180 }, // Communications West Wall
  { x: 1510, y: 1240, width: 40, height: 180 }, // Communications East Wall

  // ====================================================
  // ROOM FURNITURE & OBSTACLE COLLIDERS
  // ====================================================

  // --- CAFETERIA ---
  // Large Central Meeting Table & chairs
  { x: 1120, y: 460, width: 160, height: 80, isObstacle: true },
  // 4 Outer Dining Tables
  { x: 1040, y: 380, width: 60, height: 35, isObstacle: true },
  { x: 1300, y: 380, width: 60, height: 35, isObstacle: true },
  { x: 1040, y: 580, width: 60, height: 35, isObstacle: true },
  { x: 1300, y: 580, width: 60, height: 35, isObstacle: true },

  // --- REACTOR ---
  // Reactor Core Pillar & Containment
  { x: 120, y: 770, width: 100, height: 100, isObstacle: true },
  // Left Hand-Scanner Station (Upper)
  { x: 90, y: 680, width: 40, height: 30, isObstacle: true },
  // Right Hand-Scanner Station (Lower)
  { x: 90, y: 930, width: 40, height: 30, isObstacle: true },

  // --- UPPER ENGINE ---
  { x: 370, y: 430, width: 60, height: 70, isObstacle: true },

  // --- LOWER ENGINE ---
  { x: 370, y: 1150, width: 60, height: 70, isObstacle: true },

  // --- MEDBAY ---
  { x: 680, y: 530, width: 45, height: 180, isObstacle: true }, // Beds on West wall
  { x: 830, y: 650, width: 50, height: 30, isObstacle: true }, // Scan Pad

  // --- ADMIN ---
  { x: 1440, y: 870, width: 90, height: 45, isObstacle: true }, // Hologram Map Table

  // --- ELECTRICAL ---
  { x: 730, y: 1000, width: 60, height: 60, isObstacle: true }, // Generator

  // --- SECURITY ---
  { x: 610, y: 740, width: 60, height: 30, isObstacle: true }, // Desk

  // --- STORAGE ---
  { x: 1050, y: 1100, width: 90, height: 90, isObstacle: true }, // Central Crates
  { x: 1220, y: 1240, width: 50, height: 40, isObstacle: true }, // Fuel Station

  // --- O2 ---
  { x: 1530, y: 650, width: 50, height: 50, isObstacle: true }, // Greenhouse Dome

  // --- SHIELDS ---
  { x: 1740, y: 1140, width: 60, height: 60, isObstacle: true }, // Shield Generator

  // --- NAVIGATION ---
  { x: 2200, y: 750, width: 30, height: 70, isObstacle: true }, // Steering Consoles
];

// ============================================================================
// LOCKED DOOR COLLIDERS (during Door Sabotage)
// ============================================================================
export const LOCKED_DOOR_WALLS: Record<string, WallBox[]> = {
  cafeteria: [
    { x: 930, y: 410, width: 40, height: 80, isObstacle: true }, // West doorway
    { x: 1430, y: 380, width: 40, height: 80, isObstacle: true }, // East doorway
    { x: 1160, y: 710, width: 80, height: 40, isObstacle: true }, // South doorway
  ],
  medbay: [
    { x: 750, y: 490, width: 80, height: 40, isObstacle: true },
  ],
  security: [
    { x: 560, y: 780, width: 40, height: 70, isObstacle: true },
  ],
  electrical: [
    { x: 720, y: 1130, width: 80, height: 40, isObstacle: true },
  ],
  storage: [
    { x: 890, y: 1210, width: 40, height: 80, isObstacle: true },
    { x: 1160, y: 930, width: 80, height: 40, isObstacle: true },
    { x: 1290, y: 1110, width: 40, height: 80, isObstacle: true },
  ],
  admin: [
    { x: 1320, y: 840, width: 40, height: 80, isObstacle: true },
  ],
  reactor: [
    { x: 270, y: 770, width: 40, height: 80, isObstacle: true },
  ],
  upper_engine: [
    { x: 550, y: 410, width: 40, height: 80, isObstacle: true },
    { x: 360, y: 590, width: 80, height: 40, isObstacle: true },
  ],
  lower_engine: [
    { x: 360, y: 1010, width: 80, height: 40, isObstacle: true },
    { x: 550, y: 1210, width: 40, height: 80, isObstacle: true },
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
      y: Math.max(280, Math.min(MAP_HEIGHT - 120, currentY + moveDy)),
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
      py = Math.max(280, Math.min(MAP_HEIGHT - 120, nextY));
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
  { id: 'wp-caf-center', x: 1200, y: 480, room: 'Cafeteria', neighbors: ['wp-caf-nw', 'wp-caf-ne', 'wp-caf-s'] },
  { id: 'wp-caf-nw', x: 1040, y: 450, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-upper-hall-e'] },
  { id: 'wp-caf-ne', x: 1360, y: 430, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-caf-weap'] },
  { id: 'wp-caf-s', x: 1200, y: 680, room: 'Cafeteria', neighbors: ['wp-caf-center', 'wp-center-hall'] },

  // Upper Hallway & MedBay
  { id: 'wp-upper-hall-e', x: 900, y: 450, room: 'Oberer Flur', neighbors: ['wp-caf-nw', 'wp-upper-hall-m'] },
  { id: 'wp-upper-hall-m', x: 780, y: 450, room: 'Oberer Flur', neighbors: ['wp-upper-hall-e', 'wp-upper-hall-w', 'wp-medbay'] },
  { id: 'wp-upper-hall-w', x: 600, y: 450, room: 'Oberer Flur', neighbors: ['wp-upper-hall-m', 'wp-upper-engine-e'] },
  { id: 'wp-medbay', x: 780, y: 640, room: 'MedBay', neighbors: ['wp-upper-hall-m'] },

  // Upper Engine
  { id: 'wp-upper-engine-e', x: 480, y: 450, room: 'Upper Engine', neighbors: ['wp-upper-hall-w', 'wp-upper-engine-s'] },
  { id: 'wp-upper-engine-s', x: 400, y: 560, room: 'Upper Engine', neighbors: ['wp-upper-engine-e', 'wp-west-cross-mid'] },

  // West Cross Junction
  { id: 'wp-west-cross-mid', x: 400, y: 810, room: 'Reaktor-Kreuzung', neighbors: ['wp-upper-engine-s', 'wp-lower-engine-n', 'wp-reactor', 'wp-security'] },
  { id: 'wp-reactor', x: 180, y: 810, room: 'Reactor', neighbors: ['wp-west-cross-mid'] },
  { id: 'wp-security', x: 660, y: 810, room: 'Security', neighbors: ['wp-west-cross-mid'] },

  // Lower Engine
  { id: 'wp-lower-engine-n', x: 400, y: 1080, room: 'Lower Engine', neighbors: ['wp-west-cross-mid', 'wp-lower-engine-e'] },
  { id: 'wp-lower-engine-e', x: 480, y: 1250, room: 'Lower Engine', neighbors: ['wp-lower-engine-n', 'wp-lower-hall-w'] },

  // Lower Hallway & Electrical
  { id: 'wp-lower-hall-w', x: 640, y: 1250, room: 'Unterer Flur', neighbors: ['wp-lower-engine-e', 'wp-lower-hall-m'] },
  { id: 'wp-lower-hall-m', x: 760, y: 1250, room: 'Unterer Flur', neighbors: ['wp-lower-hall-w', 'wp-electrical', 'wp-lower-hall-e'] },
  { id: 'wp-electrical', x: 760, y: 1040, room: 'Electrical', neighbors: ['wp-lower-hall-m'] },
  { id: 'wp-lower-hall-e', x: 880, y: 1250, room: 'Unterer Flur', neighbors: ['wp-lower-hall-m', 'wp-storage-w'] },

  // Storage
  { id: 'wp-storage-w', x: 1000, y: 1250, room: 'Storage', neighbors: ['wp-lower-hall-e', 'wp-storage-center'] },
  { id: 'wp-storage-center', x: 1110, y: 1100, room: 'Storage', neighbors: ['wp-storage-w', 'wp-storage-n', 'wp-storage-e', 'wp-storage-s'] },
  { id: 'wp-storage-n', x: 1200, y: 1000, room: 'Storage', neighbors: ['wp-storage-center', 'wp-center-hall'] },
  { id: 'wp-storage-e', x: 1260, y: 1150, room: 'Storage', neighbors: ['wp-storage-center', 'wp-stor-shields-m'] },
  { id: 'wp-storage-s', x: 1200, y: 1300, room: 'Storage', neighbors: ['wp-storage-center'] },

  // Central Hallway & Admin
  { id: 'wp-center-hall', x: 1200, y: 850, room: 'Zentralflur', neighbors: ['wp-caf-s', 'wp-storage-n', 'wp-admin'] },
  { id: 'wp-admin', x: 1460, y: 880, room: 'Admin', neighbors: ['wp-center-hall'] },

  // Communications & Shields-Storage Hallway
  { id: 'wp-stor-shields-m', x: 1400, y: 1150, room: 'Flur (Storage ➔ Shields)', neighbors: ['wp-storage-e', 'wp-comms', 'wp-shields-w'] },
  { id: 'wp-comms', x: 1400, y: 1320, room: 'Communications', neighbors: ['wp-stor-shields-m'] },
  { id: 'wp-shields-w', x: 1680, y: 1150, room: 'Shields', neighbors: ['wp-stor-shields-m', 'wp-shields-center'] },

  // Shields
  { id: 'wp-shields-center', x: 1770, y: 1170, room: 'Shields', neighbors: ['wp-shields-w', 'wp-east-hub-s', 'wp-shields-e'] },
  { id: 'wp-shields-e', x: 1880, y: 1150, room: 'Shields', neighbors: ['wp-shields-center', 'wp-nav-s'] },

  // Weapons & East Hub
  { id: 'wp-caf-weap', x: 1500, y: 420, room: 'Flur (Cafeteria ➔ Weapons)', neighbors: ['wp-caf-ne', 'wp-weapons'] },
  { id: 'wp-weapons', x: 1680, y: 420, room: 'Weapons', neighbors: ['wp-caf-weap', 'wp-east-hub-n'] },
  { id: 'wp-east-hub-n', x: 1690, y: 600, room: 'Östlicher Flur', neighbors: ['wp-weapons', 'wp-o2', 'wp-east-hub-mid'] },
  { id: 'wp-o2', x: 1560, y: 670, room: 'O2', neighbors: ['wp-east-hub-n'] },
  { id: 'wp-east-hub-mid', x: 1690, y: 710, room: 'Östlicher Flur', neighbors: ['wp-east-hub-n', 'wp-nav-n', 'wp-east-hub-s'] },
  { id: 'wp-east-hub-s', x: 1690, y: 980, room: 'Östlicher Flur', neighbors: ['wp-east-hub-mid', 'wp-shields-center'] },

  // Navigation
  { id: 'wp-nav-n', x: 2060, y: 710, room: 'Navigation', neighbors: ['wp-east-hub-mid', 'wp-nav-center'] },
  { id: 'wp-nav-s', x: 2000, y: 920, room: 'Navigation', neighbors: ['wp-shields-e', 'wp-nav-center'] },
  { id: 'wp-nav-center', x: 2160, y: 780, room: 'Navigation', neighbors: ['wp-nav-n', 'wp-nav-s'] },
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
 * Dijkstra Pathfinding between waypoints for Bot navigation
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
