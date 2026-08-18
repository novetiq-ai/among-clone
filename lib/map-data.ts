import { TaskDefinition, VentDefinition } from '@/types/game';

export interface RoomArea {
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
}

export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1600;

export const SPAWN_POSITION = { x: 1200, y: 580 };
export const EMERGENCY_BUTTON_POS = { x: 1200, y: 730, radius: 55 };

// Designated safe spawn slots around the Cafeteria meeting table
export const SPAWN_SLOTS = [
  { x: 1200, y: 570 }, // Top
  { x: 1060, y: 600 }, // Top-Left
  { x: 1340, y: 600 }, // Top-Right
  { x: 990, y: 730 },  // Left
  { x: 1410, y: 730 }, // Right
  { x: 1060, y: 860 }, // Bottom-Left
  { x: 1340, y: 860 }, // Bottom-Right
  { x: 1200, y: 890 }, // Bottom
  { x: 1130, y: 560 },
  { x: 1270, y: 560 },
  { x: 1130, y: 900 },
  { x: 1270, y: 900 },
];

export function getSpawnPosition(index: number) {
  return SPAWN_SLOTS[index % SPAWN_SLOTS.length] || SPAWN_POSITION;
}

export const ROOMS: RoomArea[] = [
  { name: 'Cafeteria', x: 920, y: 480, width: 560, height: 440, color: '#1e293b' },
  { name: 'Weapons', x: 1600, y: 380, width: 380, height: 320, color: '#1e293b' },
  { name: 'O2', x: 1540, y: 740, width: 280, height: 260, color: '#1e293b' },
  { name: 'Navigation', x: 1960, y: 680, width: 360, height: 360, color: '#1e293b' },
  { name: 'Shields', x: 1600, y: 1080, width: 360, height: 320, color: '#1e293b' },
  { name: 'Communications', x: 1300, y: 1240, width: 300, height: 260, color: '#1e293b' },
  { name: 'Storage', x: 920, y: 1040, width: 480, height: 420, color: '#1e293b' },
  { name: 'Admin', x: 1500, y: 940, width: 340, height: 260, color: '#1e293b' },
  { name: 'Electrical', x: 640, y: 940, width: 320, height: 320, color: '#1e293b' },
  { name: 'Lower Engine', x: 280, y: 1100, width: 340, height: 320, color: '#1e293b' },
  { name: 'Security', x: 640, y: 660, width: 260, height: 260, color: '#1e293b' },
  { name: 'Reactor', x: 100, y: 640, width: 320, height: 420, color: '#1e293b' },
  { name: 'Upper Engine', x: 280, y: 380, width: 340, height: 320, color: '#1e293b' },
  { name: 'MedBay', x: 640, y: 380, width: 320, height: 260, color: '#1e293b' },
];

export const CORRIDORS: CorridorArea[] = [
  // Cafeteria <-> MedBay / Engine (North-West)
  { id: 'corr-caf-med', name: 'Flur (Cafeteria ➔ MedBay)', x: 560, y: 440, width: 380, height: 140 },
  // West Corridor (MedBay <-> Security <-> Electrical)
  { id: 'corr-sec-elec', name: 'Flur (Security ➔ Electrical)', x: 600, y: 560, width: 140, height: 400 },
  // Upper Reactor Corridor
  { id: 'corr-react-upper', name: 'Flur (Reactor ➔ Upper Engine)', x: 140, y: 580, width: 240, height: 120 },
  // Lower Reactor Corridor
  { id: 'corr-react-lower', name: 'Flur (Reactor ➔ Lower Engine)', x: 140, y: 1000, width: 240, height: 120 },
  // Electrical <-> Lower Engine Corridor
  { id: 'corr-elec-lower', name: 'Flur (Electrical ➔ Lower Engine)', x: 480, y: 1140, width: 200, height: 140 },
  // Electrical <-> Storage Corridor
  { id: 'corr-elec-stor', name: 'Flur (Electrical ➔ Storage)', x: 740, y: 1060, width: 200, height: 160 },
  // Central Hallway (Cafeteria <-> Storage)
  { id: 'corr-center-main', name: 'Zentralflur (Cafeteria ➔ Storage)', x: 1040, y: 880, width: 240, height: 200 },
  // Storage <-> Admin Corridor
  { id: 'corr-stor-admin', name: 'Flur (Storage ➔ Admin)', x: 1340, y: 960, width: 200, height: 160 },
  // Storage <-> Communications Corridor
  { id: 'corr-stor-comms', name: 'Flur (Storage ➔ Comms)', x: 1200, y: 1180, width: 180, height: 160 },
  // Cafeteria <-> Weapons (North-East)
  { id: 'corr-caf-weap', name: 'Flur (Cafeteria ➔ Weapons)', x: 1440, y: 440, width: 220, height: 160 },
  // Weapons <-> O2 <-> Navigation Corridor
  { id: 'corr-weap-nav', name: 'Flur (Weapons ➔ O2 ➔ Navigation)', x: 1660, y: 640, width: 320, height: 150 },
  // Navigation <-> Shields Corridor
  { id: 'corr-nav-shield', name: 'Flur (Navigation ➔ Shields)', x: 1740, y: 960, width: 240, height: 160 },
  // Shields <-> Communications Corridor
  { id: 'corr-shield-comms', name: 'Flur (Shields ➔ Comms)', x: 1400, y: 1180, width: 240, height: 160 },
];

export const ALL_TASKS: TaskDefinition[] = [
  // Admin
  { id: 'task-admin-card', type: 'swipe_card', name: 'Karte durchziehen', room: 'Admin', x: 1680, y: 1060 },
  { id: 'task-wires-admin', type: 'wires', name: 'Drähte verbinden', room: 'Admin', x: 1540, y: 1140 },

  // Cafeteria
  { id: 'task-cafeteria-garbage', type: 'empty_garbage', name: 'Müll entsorgen', room: 'Cafeteria', x: 1380, y: 520 },
  { id: 'task-cafeteria-download', type: 'download_data', name: 'Daten herunterladen', room: 'Cafeteria', x: 1040, y: 540 },
  { id: 'task-wires-cafeteria', type: 'wires', name: 'Drähte verbinden', room: 'Cafeteria', x: 1420, y: 840 },

  // Shields
  { id: 'task-shields-prime', type: 'prime_shields', name: 'Schilde aktivieren', room: 'Shields', x: 1800, y: 1240 },
  { id: 'task-shields-divert', type: 'divert_power', name: 'Energie umleiten', room: 'Shields', x: 1680, y: 1320 },

  // Weapons
  { id: 'task-weapons-asteroids', type: 'clear_asteroids', name: 'Asteroiden abschießen', room: 'Weapons', x: 1840, y: 440 },
  { id: 'task-weapons-download', type: 'download_data', name: 'Daten herunterladen', room: 'Weapons', x: 1720, y: 620 },

  // Electrical
  { id: 'task-calibrate-distributor', type: 'calibrate_distributor', name: 'Verteiler kalibrieren', room: 'Electrical', x: 860, y: 1020 },
  { id: 'task-wires-electrical', type: 'wires', name: 'Drähte verbinden', room: 'Electrical', x: 690, y: 970 },
  { id: 'task-electrical-power', type: 'divert_power', name: 'Energie umleiten', room: 'Electrical', x: 780, y: 1200 },

  // O2
  { id: 'task-o2-filter', type: 'clean_o2_filter', name: 'O2 Filter reinigen', room: 'O2', x: 1680, y: 860 },
  { id: 'task-o2-garbage', type: 'empty_garbage', name: 'Müllschacht leeren', room: 'O2', x: 1740, y: 920 },

  // Navigation
  { id: 'task-chart-course', type: 'chart_course', name: 'Kurs festlegen', room: 'Navigation', x: 2180, y: 780 },
  { id: 'task-nav-download', type: 'download_data', name: 'Daten übertragen', room: 'Navigation', x: 2060, y: 940 },

  // Reactor
  { id: 'task-start-reactor', type: 'start_reactor', name: 'Reaktor starten (Simon Says)', room: 'Reactor', x: 160, y: 720 },
  { id: 'task-reactor-manifolds', type: 'manifolds', name: 'Manifolds entsperren (1-10)', room: 'Reactor', x: 160, y: 920 },

  // MedBay
  { id: 'task-medbay-scan', type: 'medbay_scan', name: 'MedBay Körperscan', room: 'MedBay', x: 800, y: 510 },
  { id: 'task-medbay-inspect', type: 'inspect_sample', name: 'Proben analysieren', room: 'MedBay', x: 700, y: 560 },

  // Upper Engine
  { id: 'task-upper-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Upper Engine', x: 420, y: 440 },
  { id: 'task-upper-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Upper Engine', x: 340, y: 620 },

  // Lower Engine
  { id: 'task-lower-engine-align', type: 'align_engine', name: 'Triebwerk ausrichten', room: 'Lower Engine', x: 420, y: 1320 },
  { id: 'task-lower-engine-refuel', type: 'refuel_engines', name: 'Triebwerk betanken', room: 'Lower Engine', x: 340, y: 1180 },

  // Storage
  { id: 'task-storage-refuel', type: 'refuel_engines', name: 'Kanister auftanken', room: 'Storage', x: 1040, y: 1360 },
  { id: 'task-storage-garbage', type: 'empty_garbage', name: 'Müllpresse leeren', room: 'Storage', x: 1240, y: 1400 },
  { id: 'task-wires-storage', type: 'wires', name: 'Drähte verbinden', room: 'Storage', x: 1100, y: 1100 },

  // Communications
  { id: 'task-comms-download', type: 'download_data', name: 'Daten herunterladen', room: 'Communications', x: 1450, y: 1380 },
];

export const VENTS: VentDefinition[] = [
  { id: 'vent-medbay', room: 'MedBay', x: 700, y: 430, connectedVents: ['vent-electrical', 'vent-security'] },
  { id: 'vent-electrical', room: 'Electrical', x: 700, y: 1210, connectedVents: ['vent-medbay', 'vent-security'] },
  { id: 'vent-security', room: 'Security', x: 700, y: 870, connectedVents: ['vent-medbay', 'vent-electrical'] },

  { id: 'vent-reactor-top', room: 'Reactor (Oben)', x: 160, y: 680, connectedVents: ['vent-upper-engine'] },
  { id: 'vent-upper-engine', room: 'Upper Engine', x: 540, y: 430, connectedVents: ['vent-reactor-top'] },

  { id: 'vent-reactor-bottom', room: 'Reactor (Unten)', x: 160, y: 1010, connectedVents: ['vent-lower-engine'] },
  { id: 'vent-lower-engine', room: 'Lower Engine', x: 540, y: 1360, connectedVents: ['vent-reactor-bottom'] },

  { id: 'vent-nav-top', room: 'Navigation (Oben)', x: 2220, y: 730, connectedVents: ['vent-weapons'] },
  { id: 'vent-weapons', room: 'Weapons', x: 1660, y: 430, connectedVents: ['vent-nav-top'] },

  { id: 'vent-nav-bottom', room: 'Navigation (Unten)', x: 2220, y: 990, connectedVents: ['vent-shields'] },
  { id: 'vent-shields', room: 'Shields', x: 1660, y: 1340, connectedVents: ['vent-nav-bottom'] },

  { id: 'vent-admin', room: 'Admin', x: 1760, y: 1140, connectedVents: ['vent-cafeteria-hall'] },
  { id: 'vent-cafeteria-hall', room: 'Flur', x: 1440, y: 880, connectedVents: ['vent-admin'] },
];

// Structural walls with collision blocking
export const WALLS: WallBox[] = [
  // Outer boundary walls
  { x: 0, y: 0, width: MAP_WIDTH, height: 60 },
  { x: 0, y: MAP_HEIGHT - 60, width: MAP_WIDTH, height: 60 },
  { x: 0, y: 0, width: 60, height: MAP_HEIGHT },
  { x: MAP_WIDTH - 60, y: 0, width: 60, height: MAP_HEIGHT },

  // Cafeteria top & side walls (doorway open to MedBay and Weapons)
  { x: 900, y: 460, width: 600, height: 25 },
  { x: 900, y: 460, width: 25, height: 300 },
  { x: 1475, y: 460, width: 25, height: 180 },

  // MedBay walls (doorway open to Cafeteria hallway)
  { x: 620, y: 360, width: 340, height: 25 },
  { x: 620, y: 360, width: 25, height: 280 },
  { x: 940, y: 360, width: 25, height: 150 },

  // Upper Engine & Reactor hallway
  { x: 260, y: 360, width: 380, height: 25 },
  { x: 260, y: 360, width: 25, height: 320 },
  { x: 80, y: 620, width: 200, height: 25 },
  { x: 80, y: 620, width: 25, height: 460 },
  { x: 80, y: 1060, width: 200, height: 25 },

  // Lower Engine
  { x: 260, y: 1100, width: 25, height: 320 },
  { x: 260, y: 1420, width: 380, height: 25 },

  // Electrical walls (doorway on right side)
  { x: 620, y: 920, width: 25, height: 340 },
  { x: 620, y: 920, width: 320, height: 25 },
  { x: 620, y: 1260, width: 320, height: 25 },

  // Storage top wall with central doorway (left & right wings)
  { x: 900, y: 1020, width: 170, height: 25 },
  { x: 1250, y: 1020, width: 170, height: 25 },
  { x: 900, y: 1460, width: 520, height: 25 },

  // Admin & Comms
  { x: 1500, y: 920, width: 340, height: 25 },
  { x: 1840, y: 920, width: 25, height: 280 },

  // Weapons & Nav
  { x: 1580, y: 360, width: 400, height: 25 },
  { x: 1980, y: 360, width: 25, height: 320 },
  { x: 1940, y: 660, width: 400, height: 25 },
  { x: 1940, y: 1040, width: 400, height: 25 },
  { x: 1680, y: 1060, width: 280, height: 25 },
  { x: 1680, y: 1400, width: 280, height: 25 },
];

export function checkCollision(x: number, y: number, radius = 16): boolean {
  for (const wall of WALLS) {
    if (
      x + radius > wall.x &&
      x - radius < wall.x + wall.width &&
      y + radius > wall.y &&
      y - radius < wall.y + wall.height
    ) {
      return true;
    }
  }
  return false;
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
