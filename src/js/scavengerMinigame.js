/**
 * scavengerMinigame.js — 2D Top-Down Scavenger Minigame for Prologue Packing
 *
 * Simulates a high-tension, 40-second scavenge run in the player's large modern coastal home
 * with camera following, multi-room exploration, tactical radar HUD,
 * and rich high-res pixel art floorplan before diving into the basement bunker hatch.
 */

import { retroAudio } from './retroAudio.js';
import { createScavengerDevTools } from './dev/devRuntime.js';
import {
  getRuntimeCollisionOverride,
  getRuntimeFogOverride,
  getRuntimeItemOverride,
} from './runtime/editorLayoutRuntime.js';

// Assets
const SPRITESHEET_SRC = new URL('../assets/sprites/sheets/spritesheet_father.png', import.meta.url).href;
const MAP_SRC = new URL('../assets/backgrounds/scavenger_house_map.webp', import.meta.url).href;

const ITEM_ASSETS = {
  food:  { image: new URL('../assets/items/food_icon.png',  import.meta.url).href, label: 'Makanan Kaleng', desc: '+15 Makanan' },
  drink: { image: new URL('../assets/items/drink_icon.png', import.meta.url).href, label: 'Air Bersih',     desc: '+15 Air' },
  kit:   { image: new URL('../assets/items/kit_icon.png',   import.meta.url).href, label: 'Kotak P3K',       desc: '+10 Kesehatan' },
  radio: { image: new URL('../assets/items/radio_icon.png', import.meta.url).href, label: 'Radio Portable', desc: 'Info & Sinyal SAR' },
  snack: { image: new URL('../assets/items/snacks.png',     import.meta.url).href, label: 'Snack Darurat',   desc: '+5 Makanan Cepat' },
  toy:   { image: new URL('../assets/items/car_toy.png',    import.meta.url).href, label: 'Mainan Anak',     desc: 'Moral Keluarga' },
  battery: { image: new URL('../assets/items/radio_icon.png', import.meta.url).href, label: 'Baterai Ekstra', desc: 'Cadangan daya' },
  mask: { image: new URL('../assets/items/kit_icon.png', import.meta.url).href, label: 'Masker Medis', desc: 'Perlindungan napas' }
};

// Each pose has different transparent padding inside its 256x256 cell.
// These anchors pin the visible body center and lowest opaque foot pixel to a
// stable world-space pivot, preventing the sprite from jumping between frames.
const FATHER_FRAME_ANCHORS = {
  down: [
    { x: 168, y: 251 },
    { x: 124.5, y: 251 },
    { x: 77.5, y: 251 },
  ],
  left: [
    { x: 169.5, y: 234 },
    { x: 126.5, y: 234 },
    { x: 81.5, y: 233 },
  ],
  right: [
    { x: 167, y: 255 },
    { x: 118, y: 255 },
    { x: 77.5, y: 255 },
  ],
  up: [
    { x: 168, y: 227 },
    { x: 125, y: 226 },
    { x: 82.5, y: 227 },
  ],
};

// The prologue background is the source of truth for the house map. These
// dimensions match the native `scavenger_house_map.webp` asset exactly.
const HOUSE_MAP_DIMENSIONS = Object.freeze({ width: 1672, height: 941 });

// Bounds describe the usable world envelope. The architectural wall segments
// below close the irregular edges and preserve the main entrance opening.
const PROLOGUE_PLAYABLE_BOUNDS = Object.freeze({
  x: 18,
  y: 18,
  w: 1636,
  h: 905,
});

// Every obstacle uses one solid foot-collision rule. The small shared inset
// keeps contact forgiving without needing separate wall/furniture categories.
const SOLID_COLLIDER_TYPE = 'solid';
const SOLID_COLLIDER_INSET = 2;
const normalizeSolidCollider = (collider) => ({
  ...collider,
  type: SOLID_COLLIDER_TYPE,
});

// Rectangular floor-footprint colliders, measured against the native map.
// Decorative objects are intentionally omitted so the player can move close
// to furniture without catching on its elevated/transparent artwork.
const PROLOGUE_COLLIDERS = Object.freeze([
  // ── 1. Outer Perimeter & Exterior Shell ──
  { id: 'WALL_OUTER_WEST',       type: 'solid',      x: 8,    y: 18,  w: 22,  h: 806 },
  { id: 'WALL_OUTER_EAST',       type: 'solid',      x: 1638, y: 18,  w: 24,  h: 806 },
  { id: 'WALL_OUTER_SOUTH_01',   type: 'solid',      x: 8,    y: 824, w: 640, h: 24 },
  { id: 'WALL_OUTER_SOUTH_02',   type: 'solid',      x: 1140, y: 824, w: 522, h: 24 },

  // ── 2. Master Bedroom Shell & Entry ──
  { id: 'WALL_MASTER_TOP',       type: 'solid',      x: 28,   y: 18,  w: 432, h: 22 },
  { id: 'WALL_MASTER_LEFT',      type: 'solid',      x: 28,   y: 18,  w: 22,  h: 270 },
  { id: 'WALL_MASTER_BOTTOM',    type: 'solid',      x: 8,    y: 282, w: 452, h: 24 },
  // East wall: solid from y=18 to y=230, opening at y=230..282 for door to living corridor
  { id: 'WALL_MASTER_RIGHT',     type: 'solid',      x: 450,  y: 18,  w: 22,  h: 212 },
  // North wall of master alcove corridor
  { id: 'WALL_MASTER_ALCOVE_TOP', type: 'solid',     x: 450,  y: 92,  w: 112, h: 22 },

  // Master Bedroom Furniture
  { id: 'BED_MASTER',             type: 'solid', x: 95,  y: 90,  w: 165, h: 155 },
  { id: 'NIGHTSTAND_MASTER_LEFT', type: 'solid', x: 68, y: 105, w: 24,  h: 38 },
  { id: 'NIGHTSTAND_MASTER_RIGHT',type: 'solid', x: 263,y: 105, w: 24,  h: 38 },
  { id: 'DRESSER_MASTER',         type: 'solid', x: 320, y: 55,  w: 65,  h: 75 },
  { id: 'WARDROBE_MASTER',        type: 'solid', x: 385, y: 55,  w: 65,  h: 150 },
  { id: 'PLANT_MASTER',            type: 'solid', x: 35,  y: 55,  w: 30,  h: 35 },

  // ── 3. Bunker 72 Shelter Shell & Equipment ──
  { id: 'WALL_BUNKER_TOP',       type: 'solid',      x: 562, y: 10,  w: 516, h: 26 },
  { id: 'WALL_BUNKER_LEFT',      type: 'solid',      x: 562, y: 10,  w: 22,  h: 225 },
  { id: 'WALL_BUNKER_RIGHT',     type: 'solid',      x: 1056,y: 10,  w: 22,  h: 225 },
  { id: 'WALL_BUNKER_FRONT_01',  type: 'solid',      x: 562, y: 205, w: 170, h: 30 },
  { id: 'WALL_BUNKER_FRONT_02',  type: 'solid',      x: 868, y: 205, w: 210, h: 30 },

  // Bunker Equipment
  { id: 'SHELF_BUNKER',          type: 'solid', x: 585, y: 48,  w: 100, h: 165 },
  { id: 'VAULT_DOOR_BUNKER',     type: 'solid', x: 745, y: 35,  w: 110, h: 125 },
  { id: 'POWER_PANEL_BUNKER',    type: 'solid', x: 880, y: 38,  w: 165, h: 75 },
  { id: 'GENERATOR_BUNKER',      type: 'solid', x: 920, y: 125, w: 115, h: 85 },

  // ── 4. Child Bedroom Shell & Furniture ──
  { id: 'WALL_CHILD_TOP',        type: 'solid',      x: 1155,y: 18,  w: 485, h: 22 },
  { id: 'WALL_CHILD_RIGHT',      type: 'solid',      x: 1620,y: 18,  w: 22,  h: 302 },
  { id: 'WALL_CHILD_BOTTOM',     type: 'solid',      x: 1155,y: 298, w: 485, h: 22 },
  // West wall: solid from y=18 to y=230, opening at y=230..285 for door to living corridor
  { id: 'WALL_CHILD_LEFT',       type: 'solid',      x: 1155,y: 18,  w: 22,  h: 212 },
  // North wall of child alcove corridor
  { id: 'WALL_CHILD_ALCOVE_TOP', type: 'solid',      x: 1078,y: 92,  w: 98,  h: 22 },

  // Child Bedroom Furniture
  { id: 'WARDROBE_CHILD',        type: 'solid', x: 1210,y: 55,  w: 85,  h: 105 },
  { id: 'SHELF_CHILD',           type: 'solid', x: 1300,y: 80,  w: 60,  h: 78 },
  { id: 'DESK_CHILD',            type: 'solid', x: 1370,y: 78,  w: 105, h: 75 },
  { id: 'CHAIR_CHILD',           type: 'solid', x: 1400,y: 155, w: 45,  h: 45 },
  { id: 'BED_CHILD',             type: 'solid', x: 1490,y: 85,  w: 95,  h: 170 },
  { id: 'DRAWER_CHILD',          type: 'solid', x: 1510,y: 260, w: 55,  h: 38 },
  { id: 'PLANT_CHILD',           type: 'solid', x: 1590,y: 195, w: 30,  h: 45 },

  // ── 5. Office / Studio Shell & Furniture ──
  // North wall is completely solid separating office from child bedroom
  { id: 'WALL_OFFICE_TOP',       type: 'solid',      x: 1180,y: 355, w: 460, h: 22 },
  // West wall: top segment above door (y=355..405), opening at y=405..465 (doorway), bottom segment (y=465..804)
  { id: 'WALL_OFFICE_LEFT_01',   type: 'solid',      x: 1180,y: 355, w: 22,  h: 50 },
  { id: 'WALL_OFFICE_LEFT_02',   type: 'solid',      x: 1180,y: 465, w: 22,  h: 343 },

  // Office Furniture
  { id: 'SHELF_OFFICE_TOP',      type: 'solid', x: 1340,y: 445, w: 175, h: 65 },
  { id: 'SHELF_OFFICE_RIGHT',    type: 'solid', x: 1565,y: 440, w: 65,  h: 325 },
  { id: 'DESK_OFFICE_LEFT',      type: 'solid', x: 1290,y: 540, w: 65,  h: 160 },
  { id: 'DESK_OFFICE_BACK',      type: 'solid', x: 1355,y: 565, w: 140, h: 75 },
  { id: 'CHAIR_OFFICE',          type: 'solid', x: 1375,y: 640, w: 48,  h: 48 },
  { id: 'PLANT_OFFICE',          type: 'solid', x: 1195,y: 755, w: 40,  h: 50 },

  // ── 6. Kitchen & Dining Shell & Furniture ──
  { id: 'WALL_KITCHEN_DIVIDER',  type: 'solid',      x: 488, y: 282, w: 22,  h: 158 },
  { id: 'COUNTER_KITCHEN_TOP',   type: 'solid', x: 30,  y: 315, w: 315, h: 75 },
  { id: 'COUNTER_KITCHEN_LEFT',  type: 'solid', x: 30,  y: 390, w: 65,  h: 155 },
  { id: 'FRIDGE_KITCHEN',        type: 'solid', x: 345, y: 320, w: 75,  h: 95 },
  { id: 'PANTRY_KITCHEN',        type: 'solid', x: 445, y: 320, w: 40,  h: 95 },
  { id: 'ISLAND_KITCHEN',        type: 'solid', x: 175, y: 448, w: 190, h: 85 },
  { id: 'TABLE_DINING',          type: 'solid', x: 85,  y: 595, w: 185, h: 145 },
  { id: 'PLANT_DINING',          type: 'solid', x: 30,  y: 740, w: 35,  h: 45 },

  // ── 7. Bathroom Shell & Fixtures ──
  // The latest map shows a fully enclosed bathroom. The old east-side opening
  // belonged to the previous map version and is intentionally not recreated.
  { id: 'WALL_BATHROOM_TOP',     type: 'solid',      x: 325, y: 540, w: 233, h: 22 },
  { id: 'WALL_BATHROOM_LEFT',    type: 'solid',      x: 325, y: 540, w: 20,  h: 290 },
  { id: 'WALL_BATHROOM_BOTTOM',  type: 'solid',      x: 325, y: 810, w: 233, h: 22 },
  { id: 'WALL_BATHROOM_RIGHT',   type: 'solid',      x: 538, y: 540, w: 20,  h: 290 },

  // Bathroom Fixtures
  { id: 'SHOWER_BATHROOM',       type: 'solid', x: 335, y: 555, w: 55,  h: 105 },
  { id: 'TOILET_BATHROOM',       type: 'solid', x: 430, y: 605, w: 25,  h: 40 },
  { id: 'VANITY_BATHROOM',       type: 'solid', x: 455, y: 575, w: 35,  h: 80 },
  { id: 'TUB_BATHROOM',          type: 'solid', x: 335, y: 685, w: 75,  h: 85 },
  { id: 'SHELF_BATHROOM_STORAGE',type: 'solid', x: 500, y: 690, w: 35,  h: 90 },

  // ── 8. Living Room Furniture ──
  { id: 'SOFA_LIVING_LEFT',      type: 'solid', x: 675,  y: 335, w: 55,  h: 245 },
  { id: 'SOFA_LIVING_BOTTOM',    type: 'solid', x: 730,  y: 525, w: 130, h: 55 },
  { id: 'COFFEE_TABLE_LIVING',   type: 'solid', x: 770,  y: 400, w: 80,  h: 90 },
  { id: 'ARMCHAIR_LIVING',       type: 'solid', x: 875,  y: 400, w: 52,  h: 52 },
  { id: 'TV_CONSOLE_LIVING',     type: 'solid', x: 1015, y: 345,  w: 50,  h: 175 },
  { id: 'PLANT_LIVING',          type: 'solid', x: 668,  y: 315, w: 35,  h: 35 },
  { id: 'SIDE_TABLE_LIVING',     type: 'solid', x: 868,  y: 535, w: 38,  h: 35 },

  // ── 9. Foyer / Main Entrance Shell & Furniture ──
  { id: 'WALL_FOYER_TOP_LEFT',   type: 'solid',      x: 648,  y: 680, w: 147, h: 25 },
  { id: 'WALL_FOYER_TOP_RIGHT',  type: 'solid',      x: 953,  y: 680, w: 166, h: 25 },
  { id: 'WALL_FOYER_LEFT',       type: 'solid',      x: 648,  y: 680, w: 22,  h: 250 },
  { id: 'WALL_FOYER_RIGHT',      type: 'solid',      x: 1118, y: 680, w: 22,  h: 250 },

  // Foyer Furniture
  { id: 'CONSOLE_FOYER',         type: 'solid', x: 668,  y: 752, w: 92,  h: 58 },
  { id: 'COAT_PLANT_FOYER',      type: 'solid', x: 955,  y: 750, w: 72,  h: 80 },
]);

// Doorways & Walkable Openings metadata. The collision debug layer intentionally
// does not draw these regions; gameplay/fog logic keeps its own doorway data.
const PROLOGUE_WALKABLE_OPENINGS = Object.freeze([
  { id: 'DOOR_MAIN_ENTRANCE',    name: 'Pintu Utama / Foyer',       x: 795,  y: 680, w: 158, h: 25 },
  { id: 'DOOR_BUNKER_ENTRANCE',  name: 'Ambang Masuk Bunker',       x: 732,  y: 205, w: 136, h: 30 },
  { id: 'DOOR_MASTER',            name: 'Pintu Kamar Utama',         x: 450,  y: 230, w: 22,  h: 52 },
  { id: 'DOOR_CHILD',             name: 'Pintu Kamar Anak',          x: 1155, y: 230, w: 22,  h: 55 },
  { id: 'DOOR_OFFICE',            name: 'Pintu Studio / Kantor',     x: 1180, y: 405, w: 22,  h: 60 },
  { id: 'OPENING_MASTER_ALCOVE',  name: 'Akses Masuk Kamar Utama',   x: 450,  y: 92,  w: 112, h: 138 },
  { id: 'OPENING_CHILD_ALCOVE',   name: 'Akses Masuk Kamar Anak',    x: 1078, y: 92,  w: 98,  h: 138 },
  { id: 'OPENING_KITCHEN_LIVING', name: 'Akses Dapur & Pantry',      x: 470,  y: 440, w: 50,  h: 80 },
]);

const PROLOGUE_ROOMS = Object.freeze([
  {
    id: 'foyer',
    name: 'TERAS DEPAN & PINTU UTAMA',
    adjacent: ['living'],
    rects: [
      { x: 630, y: 680, w: 425, h: 240 }
    ]
  },
  {
    id: 'living',
    name: 'RUANG KELUARGA & TV',
    adjacent: ['foyer', 'bunker', 'master', 'child', 'kitchen', 'office', 'bath'],
    rects: [
      { x: 488, y: 240, w: 690, h: 440 },
      { x: 940, y: 240, w: 240, h: 440 },
      { x: 630, y: 600, w: 425, h: 80 }
    ]
  },
  {
    id: 'bunker',
    name: 'RUANG PALKA BUNKER 72 (DARURAT)',
    adjacent: ['living'],
    rects: [
      { x: 562, y: 10, w: 516, h: 240 }
    ]
  },
  {
    id: 'master',
    name: 'KAMAR TIDUR UTAMA',
    adjacent: ['living'],
    rects: [
      { x: 28, y: 18, w: 432, h: 270 }
    ]
  },
  {
    id: 'child',
    name: 'KAMAR TIDUR ANAK',
    adjacent: ['living'],
    rects: [
      { x: 1155, y: 18, w: 485, h: 280 }
    ]
  },
  {
    id: 'kitchen',
    name: 'DAPUR & RUANG MAKAN',
    adjacent: ['living'],
    rects: [
      { x: 28, y: 282, w: 460, h: 522 }
    ]
  },
  {
    id: 'bath',
    name: 'KAMAR MANDI & GUDANG OBAT',
    adjacent: ['living'],
    rects: [
      { x: 325, y: 545, w: 183, h: 260 }
    ]
  },
  {
    id: 'office',
    name: 'RUANG KERJA / STUDIO',
    adjacent: ['living'],
    rects: [
      { x: 1180, y: 350, w: 460, h: 460 }
    ]
  }
]);

const PROLOGUE_DOORWAYS = Object.freeze([
  {
    id: 'd_foyer_living',
    name: 'Pintu Utama / Foyer',
    rooms: ['foyer', 'living'],
    x: 835,
    y: 692,
    radius: 125,
    rect: { x: 795, y: 680, w: 80, h: 25 }
  },
  {
    id: 'd_living_bunker',
    name: 'Ambang Masuk Bunker',
    rooms: ['living', 'bunker'],
    x: 800,
    y: 220,
    radius: 130,
    rect: { x: 732, y: 205, w: 136, h: 30 }
  },
  {
    id: 'd_living_master',
    name: 'Pintu Kamar Utama',
    rooms: ['living', 'master'],
    x: 461,
    y: 256,
    radius: 115,
    rect: { x: 450, y: 230, w: 22, h: 52 }
  },
  {
    id: 'd_living_child',
    name: 'Pintu Kamar Anak',
    rooms: ['living', 'child'],
    x: 1166,
    y: 256,
    radius: 115,
    rect: { x: 1155, y: 230, w: 22, h: 55 }
  },
  {
    id: 'd_living_office',
    name: 'Pintu Studio / Kantor',
    rooms: ['living', 'office'],
    x: 1190,
    y: 435,
    radius: 115,
    rect: { x: 1180, y: 405, w: 22, h: 60 }
  },
  {
    id: 'd_living_bath',
    name: 'Pintu Kamar Mandi',
    rooms: ['living', 'bath'],
    x: 498,
    y: 745,
    radius: 105,
    rect: { x: 488, y: 715, w: 20, h: 60 }
  },
  {
    id: 'd_living_kitchen',
    name: 'Akses Dapur & Pantry',
    rooms: ['living', 'kitchen'],
    x: 495,
    y: 480,
    radius: 135,
    rect: { x: 470, y: 440, w: 50, h: 80 }
  }
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getRectCenter = (rect) => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

const getRectAngle = (rect) => Number(rect?.angle) || 0;

const rotatePoint = (point, center, degrees) => {
  const radians = (Number(degrees) || 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

const getRectCorners = (rect) => {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
  const angle = getRectAngle(rect);
  if (!angle) return corners;
  const center = getRectCenter(rect);
  return corners.map((corner) => rotatePoint(corner, center, angle));
};

const addRectPath = (ctx, rect) => {
  const corners = getRectCorners(rect);
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
  ctx.closePath();
};

const intersectsPlayerFootHitbox = (x, y, playerWidth, playerHeight, rect) => {
  const angle = getRectAngle(rect);
  const halfPlayer = { x: playerWidth / 2, y: playerHeight / 2 };
  const rectCenter = getRectCenter(rect);
  const playerCenter = { x, y };

  // AABB fast path covers the vast majority of current map colliders and
  // preserves the original strict-edge contact behavior.
  if (!angle) {
    return x - halfPlayer.x < rect.x + rect.w
      && x + halfPlayer.x > rect.x
      && y - halfPlayer.y < rect.y + rect.h
      && y + halfPlayer.y > rect.y;
  }

  // Separating Axis Test: player feet remain an axis-aligned lower-body box,
  // while an editor-rotated collider is treated as an oriented rectangle.
  const radians = angle * Math.PI / 180;
  const boxAxes = [
    { x: Math.cos(radians), y: Math.sin(radians) },
    { x: -Math.sin(radians), y: Math.cos(radians) },
  ];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...boxAxes];
  const centerDelta = {
    x: playerCenter.x - rectCenter.x,
    y: playerCenter.y - rectCenter.y,
  };
  const halfBox = { x: rect.w / 2, y: rect.h / 2 };

  return !axes.some((axis) => {
    const distance = Math.abs(centerDelta.x * axis.x + centerDelta.y * axis.y);
    const playerRadius = halfPlayer.x * Math.abs(axis.x) + halfPlayer.y * Math.abs(axis.y);
    const boxRadius = halfBox.x * Math.abs(axis.x * boxAxes[0].x + axis.y * boxAxes[0].y)
      + halfBox.y * Math.abs(axis.x * boxAxes[1].x + axis.y * boxAxes[1].y);
    return distance >= playerRadius + boxRadius;
  });
};

const cloneFogLayout = () => ({
  rooms: PROLOGUE_ROOMS.map((room) => ({
    ...room,
    adjacent: [...room.adjacent],
    rects: room.rects.map((rect) => ({ ...rect })),
  })),
  doorways: PROLOGUE_DOORWAYS.map((doorway) => ({
    ...doorway,
    rooms: [...doorway.rooms],
    rect: { ...doorway.rect },
  })),
});

const createFogEditorShapes = (layout) => {
  const roomShapes = (layout?.rooms || []).flatMap((room) => room.rects.map((rect, index) => ({
    id: `FOG_ROOM_${String(room.id).toUpperCase()}_${String(index + 1).padStart(2, '0')}`,
    type: 'fog-room',
    roomId: room.id,
    rectIndex: index,
    ...rect,
  })));
  const doorwayShapes = (layout?.doorways || []).map((doorway) => ({
    id: `FOG_DOORWAY_${String(doorway.id).toUpperCase()}`,
    type: 'fog-doorway',
    doorwayId: doorway.id,
    name: doorway.name,
    rooms: Array.isArray(doorway.rooms) ? [...doorway.rooms] : undefined,
    radius: doorway.radius,
    ...doorway.rect,
  }));
  return [...roomShapes, ...doorwayShapes];
};

const getNextEditorId = (colliders, prefix) => {
  const existing = new Set((colliders || [])
    .flatMap((collider) => [collider.id, collider.doorwayId])
    .map((value) => String(value || '').toUpperCase()));
  let index = 1;
  let id = `${prefix}_${String(index).padStart(2, '0')}`;
  while (existing.has(id.toUpperCase())) {
    index += 1;
    id = `${prefix}_${String(index).padStart(2, '0')}`;
  }
  return id;
};

const getNextFogRoomRectIndex = (colliders, roomId) => {
  const indexes = (colliders || [])
    .filter((collider) => collider.type === 'fog-room' && String(collider.roomId) === String(roomId))
    .map((collider) => Number(collider.rectIndex))
    .filter((index) => Number.isFinite(index));
  return indexes.length ? Math.max(...indexes) + 1 : 0;
};

const normalizeFogRoomPair = (rooms, fallback = ['living', 'foyer']) => {
  const normalized = [...new Set((Array.isArray(rooms) ? rooms : fallback)
    .map((roomId) => String(roomId || '').trim())
    .filter(Boolean))];
  return normalized.length >= 2 ? normalized.slice(0, 2) : [...fallback];
};

const createFogEditorCollider = ({ id, type, x, y, w, h, selected, colliders }) => {
  if (type === 'fog-doorway') {
    const sourceRooms = selected?.type === 'fog-doorway'
      ? selected.rooms
      : (selected?.type === 'fog-room' ? [selected.roomId, 'living'] : null);
    const rooms = normalizeFogRoomPair(sourceRooms);
    return {
      id,
      type,
      doorwayId: getNextEditorId(colliders, 'd_custom'),
      name: selected?.type === 'fog-doorway' ? selected.name : 'Custom Fog Doorway',
      rooms,
      radius: Number.isFinite(Number(selected?.radius)) ? Number(selected.radius) : 125,
      x,
      y,
      w,
      h,
    };
  }

  const roomId = selected?.type === 'fog-room' && selected.roomId
    ? String(selected.roomId)
    : 'living';
  return {
    id,
    type: 'fog-room',
    roomId,
    rectIndex: getNextFogRoomRectIndex(colliders, roomId),
    x,
    y,
    w,
    h,
  };
};

const duplicateFogEditorCollider = ({ source, id, x, y, colliders }) => {
  if (source.type === 'fog-doorway') {
    return {
      ...source,
      id,
      doorwayId: getNextEditorId(colliders, 'd_custom'),
      rooms: normalizeFogRoomPair(source.rooms),
      x,
      y,
    };
  }

  if (source.type === 'fog-room') {
    return {
      ...source,
      id,
      roomId: String(source.roomId || 'living'),
      rectIndex: getNextFogRoomRectIndex(colliders, source.roomId || 'living'),
      x,
      y,
    };
  }

  return { ...source, id, x, y };
};

const FOG_DARKNESS = Object.freeze({
  CURRENT: 0.08,             // 100% or near 100% visible (0.05-0.15)
  ADJACENT_DISCOVERED: 0.46, // ~50% visible (0.40-0.50)
  ADJACENT_UNDISCOVERED: 0.56,
  DISTANT_DISCOVERED: 0.66,  // readable silhouette (0.55-0.70)
  DISTANT_UNDISCOVERED: 0.82,// very dark silhouette (0.75-0.88), never pure black
  BASE_OUTER: 0.85
});

// Fog remains room/doorway based, but its final alpha buffer is softened so
// rectangular map zones do not produce harsh square seams on screen.
const FOG_EDGE_BLUR = 14;

// Tension cues are expressed as a fraction of the configured time budget so
// custom expedition-style durations do not silently inherit the prologue's
// 40-second thresholds.
const PROLOGUE_TENSION_EVENTS = Object.freeze([
  { id: 'tension-30', remainingRatio: 0.75, message: 'GEMPA SUSULAN — CEPAT, ARIS!', shake: 3.5, audio: 'playForeshadowTremor' },
  { id: 'tension-20', remainingRatio: 0.50, message: 'ARIS! CEPAT KE BUNKER!', shake: 4.5, audio: 'playAlarm' },
  { id: 'tension-10', remainingRatio: 0.25, message: 'PALKA SEGERA DITUTUP!', shake: 5.5, audio: 'playSiren' },
  { id: 'tension-5',  remainingRatio: 0.125, message: 'DETIK TERAKHIR — MASUK SEKARANG!', shake: 7, audio: 'playDamageAlert' },
]);

const PROLOGUE_ITEMS = Object.freeze([
  { uid: 'food-0',    type: 'food',    id: 'food',    name: 'Makanan Kaleng', x: 485,  y: 450, w: 36, h: 36, roomId: 'kitchen', room: 'Dapur' },
  { uid: 'food-1',    type: 'food',    id: 'food',    name: 'Makanan Kaleng', x: 180,  y: 380, w: 36, h: 36, roomId: 'kitchen', room: 'Dapur' },
  { uid: 'drink-0',   type: 'drink',   id: 'drink',   name: 'Air Bersih',     x: 480,  y: 510, w: 36, h: 36, roomId: 'kitchen', room: 'Dapur' },
  { uid: 'drink-1',   type: 'drink',   id: 'drink',   name: 'Air Bersih',     x: 190,  y: 660, w: 36, h: 36, roomId: 'kitchen', room: 'Ruang Makan' },
  { uid: 'kit-0',     type: 'kit',     id: 'kit',     name: 'Kotak P3K',      x: 350,  y: 215, w: 36, h: 36, roomId: 'master',  room: 'Kamar Utama' },
  { uid: 'radio-0',   type: 'radio',   id: 'radio',   name: 'Radio Portable', x: 1280, y: 650, w: 36, h: 36, roomId: 'office',  room: 'Ruang Kerja' },
  { uid: 'battery-0', type: 'battery', id: 'battery', name: 'Baterai Ekstra', x: 910,  y: 490, w: 36, h: 36, roomId: 'living',  room: 'Ruang Keluarga' },
  { uid: 'toy-0',     type: 'toy',     id: 'toy',     name: 'Mainan Anak',    x: 1465, y: 250, w: 36, h: 36, roomId: 'child',   room: 'Kamar Anak' },
]);

const PROLOGUE_BUNKER_HATCH = Object.freeze({
  x: 720,
  y: 170,
  w: 160,
  h: 48,
  label: 'PALKA BUNKER 72',
});

export class ScavengerMinigame {
  /**
   * @param {HTMLElement} containerEl - Container element (#story-box or dedicated wrapper)
   * @param {Function} onComplete - Callback receiving { collectedItems: string[] }
   */
  constructor(containerEl, onComplete, config = null) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.config = config || null;
    this.mode = config?.mode || 'prologue';
    this.elapsedSeconds = 0;
    this.aftershockTriggered = false;
    this.finishTimeoutId = null;
    this.hazardNoticeIds = new Set();
    this.tensionEvents = PROLOGUE_TENSION_EVENTS;
    this.tensionTriggered = new Set();

    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isActive = false;
    this.renderDirty = true;

    // Viewport and World Map Dimensions (native resolution of the house map)
    this.VIEW_W = 960;
    this.VIEW_H = 540;
    this.MAP_W = HOUSE_MAP_DIMENSIONS.width;
    this.MAP_H = HOUSE_MAP_DIMENSIONS.height;
    this.playableBounds = { ...PROLOGUE_PLAYABLE_BOUNDS };

    // Follow Camera
    this.camera = {
      x: 0,
      y: 0
    };

    // Map Background Image
    this.mapImage = new Image();
    this.mapImage.src = MAP_SRC;
    this.mapLoaded = false;
    this.mapImage.onload = () => { this.mapLoaded = true; };

    // Sprite Sheet
    this.spritesheet = new Image();
    this.spritesheet.src = SPRITESHEET_SRC;
    this.spritesLoaded = false;
    this.spritesheet.onload = () => { this.spritesLoaded = true; };

    // Item Icons preloading
    this.itemImages = {};
    Object.entries(ITEM_ASSETS).forEach(([key, val]) => {
      const img = new Image();
      img.src = val.image;
      this.itemImages[key] = img;
    });

    // Player State (Starts at Main Entrance Foyer on Welcome Mat)
    this.player = {
      x: 830,
      y: 860,
      w: 20, // Compact collision box for smooth navigation
      h: 14,
      // Pixels per second; movement is multiplied by frame delta in _update().
      speed: 264,
      dir: 'up', // Faces inside the house on spawn
      isMoving: false,
      frame: 0,
      animTimer: 0,
      fps: 8
    };

    this.basePlayerState = null;
    this.baseItems = null;
    this.originalItems = null;
    this.baseColliders = null;
    this.originalColliders = null;
    this.runtimeColliderIds = new Set();

    // Solid obstacle colliders are cloned so expedition hazards can safely add
    // temporary blockers without mutating the reusable house layout.
    this.colliders = PROLOGUE_COLLIDERS.map(normalizeSolidCollider);

    // Backpack & Items positioned on visible, reachable floor areas.
    this.maxCapacity = 5;
    this.backpack = []; // Array of item objects { uid, type, id, name }
    this.selectedInventoryIndex = 0;
    this.emptyHatchConfirmUntil = null;
    this.items = PROLOGUE_ITEMS.map((item) => ({ ...item, collected: false, revealed: false }));

    // Interaction zone sits in the floor immediately below the vault door;
    // it is deliberately separate from the vault collider.
    this.bunkerHatch = { ...PROLOGUE_BUNKER_HATCH };

    // Emergency Timer & Tremor
    this.duration = 40; // 40 seconds
    this.timeLeft = this.duration;
    this.timerEnabled = true;
    this.lastTime = 0;
    this.screenShake = 0;
    this.notificationText = '';
    this.notificationTimer = 0;

    // Fog of War / Dynamic Room Visibility (Prologue Mode). Visibility is
    // room/doorway based; there is intentionally no player-following torch.
    this.discoveredRooms = new Set();
    this.currentRoomId = 'foyer';
    this.roomVisibilityStates = {};
    this.fogCanvas = null;
    this.fogCtx = null;
    this.fogSoftCanvas = null;
    this.fogSoftCtx = null;
    this.fogLayout = cloneFogLayout();
    this.fogOriginalShapes = createFogEditorShapes(this.fogLayout);
    this.fogEditorShapes = this.fogOriginalShapes.map((shape) => ({ ...shape }));

    // Developer state is supplied through a no-op gateway in release builds.
    // Keep these public fields as compatibility mirrors for the existing
    // console and HUD contracts; the dev adapter owns their mutations.
    this.debugColliders = false;
    this.collisionEditorRequested = false;
    this.fogEditorRequested = false;
    this.itemEditorRequested = false;
    this.freeCameraRequested = false;
    this.collisionEditor = null;
    this.fogEditor = null;
    this.itemEditor = null;
    this.freeCamera = false;
    this._developerPauseSnapshot = null;
    this.editorHelpHidden = false;

    // Developer Console & Debug States
    this.isPaused = false;
    this.timeScale = 1.0;
    this.godMode = false;
    this.noCollision = false;
    this.fogDisabled = false;
    this.revealAllRooms = false;

    // Controls
    this.keys = {};
    this._eventsBound = false;
    this._bindEvents();
    this._applyConfig(config);
    this.collisionEditorKey = config?.collisionKey || config?.id || (this.mode === 'prologue' ? 'prologue_house' : 'scavenger_map');
    this.normalizeSolidCollider = normalizeSolidCollider;
    this.getNextEditorId = getNextEditorId;
    this.createFogEditorCollider = createFogEditorCollider;
    this.duplicateFogEditorCollider = duplicateFogEditorCollider;

    // Saved layout data is part of the runtime contract. The editor and its
    // file persistence are not: production only applies this normalized data.
    const runtimeCollision = getRuntimeCollisionOverride(this.collisionEditorKey);
    if (Array.isArray(runtimeCollision)) {
      this.colliders = runtimeCollision.map(normalizeSolidCollider);
    }
    const runtimeFog = getRuntimeFogOverride(this.collisionEditorKey);
    if (Array.isArray(runtimeFog)) {
      this.fogEditorShapes = runtimeFog.map((shape) => ({ ...shape }));
      this._applyFogEditorShapes();
    }
    const runtimeItems = getRuntimeItemOverride(this.collisionEditorKey);
    if (Array.isArray(runtimeItems)) {
      this._applyRuntimeItemOverride(runtimeItems);
    }

    this._captureBaseRunState();

    this.devTools = createScavengerDevTools({ host: this });
    this.collisionEditor = this.devTools.collisionEditor;
    this.fogEditor = this.devTools.fogEditor;
    this.itemEditor = this.devTools.itemEditor;
    this.collisionEditorRequested = this.devTools.collisionEditorRequested;
    this.fogEditorRequested = this.devTools.fogEditorRequested;
    this.itemEditorRequested = this.devTools.itemEditorRequested;
    this.freeCameraRequested = this.devTools.freeCameraRequested;
    this.freeCamera = this.devTools.freeCamera;
    this.debugColliders = this.devTools.debugColliders;
    this.editorHelpHidden = this.devTools.editorHelpHidden;
  }

  _applyConfig(config) {
    if (!config) return;
    this.mode = config.mode || this.mode;
    this.MAP_W = config.mapWidth || this.MAP_W;
    this.MAP_H = config.mapHeight || this.MAP_H;
    this.VIEW_W = config.viewport?.width || this.VIEW_W;
    this.VIEW_H = config.viewport?.height || this.VIEW_H;
    this.timerEnabled = config.timerEnabled !== false;
    this.duration = Number.isFinite(config.duration) ? config.duration : this.duration;
    this.maxCapacity = config.capacity || this.maxCapacity;
    this.exits = (config.exits || []).map((exit) => ({ ...exit }));
    this.hazards = (config.hazards || []).map((hazard) => ({ ...hazard }));
    if (config.playableBounds) {
      this.playableBounds = { ...config.playableBounds };
    } else if (this.mode === 'expedition') {
      this.playableBounds = { x: 0, y: 0, w: this.MAP_W, h: this.MAP_H };
    } else {
      this.playableBounds = { ...PROLOGUE_PLAYABLE_BOUNDS };
    }
    if (Array.isArray(config.colliders)) this.colliders = config.colliders.map(normalizeSolidCollider);
    if (Array.isArray(config.items)) this.items = config.items.map((item, index) => ({ ...item, uid: item.uid || `${item.id}-${index}`, collected: false, revealed: false }));
    if (config.bunkerHatch) this.bunkerHatch = { ...this.bunkerHatch, ...config.bunkerHatch };
    if (config.spawnPosition) Object.assign(this.player, config.spawnPosition);
    if (Number.isFinite(config.playerSpeed)) this.player.speed = config.playerSpeed;
    if (config.mapSrc) this.mapImage.src = config.mapSrc;
  }

  _captureBaseRunState() {
    this.runtimeColliderIds.clear();
    this.basePlayerState = {
      x: this.player.x,
      y: this.player.y,
      w: this.player.w,
      h: this.player.h,
      speed: this.player.speed,
      dir: this.player.dir,
      frame: 0,
      animTimer: 0,
      isMoving: false,
    };
    this.baseItems = this.items.map(({ collected, revealed, ...item }) => ({ ...item }));
    this.originalItems = this.baseItems.map((item) => ({ ...item }));
    this.baseColliders = this.colliders.map((collider) => ({ ...collider }));
    this.originalColliders = this.colliders.map((collider) => ({ ...collider }));
  }

  _applyRuntimeItemOverride(overrides) {
    const overrideByUid = new Map(
      overrides
        .filter((item) => item && (item.uid || item.id))
        .map((item) => [String(item.uid || item.id), item])
    );

    this.items.forEach((item) => {
      const override = overrideByUid.get(String(item.uid || item.id));
      if (override) this._applyEditableItemPatch(item, override);
    });
  }

  _applyEditableItemPatch(item, patch = {}) {
    if (!item || !patch) return;

    if (Number.isFinite(Number(patch.x))) item.x = Number(patch.x);
    if (Number.isFinite(Number(patch.y))) item.y = Number(patch.y);
    if (Number.isFinite(Number(patch.w))) item.w = Math.max(4, Number(patch.w));
    if (Number.isFinite(Number(patch.h))) item.h = Math.max(4, Number(patch.h));
    if (Number.isFinite(Number(patch.angle))) item.angle = Number(patch.angle);

    if (this.mode === 'prologue') {
      const roomId = this._getRoomAtPosition(item.x, item.y);
      item.roomId = roomId || null;
      const room = roomId ? this._getFogRooms().find((candidate) => candidate.id === roomId) : null;
      if (room) item.room = room.name;
    }
  }

  applyItemEditorItems(items = []) {
    const patchByUid = new Map(
      items
        .filter((item) => item && (item.uid || item.id))
        .map((item) => [String(item.uid || item.id), item])
    );
    const applyToList = (itemList) => {
      if (!Array.isArray(itemList)) return;
      itemList.forEach((item) => {
        const patch = patchByUid.get(String(item.uid || item.id));
        if (patch) this._applyEditableItemPatch(item, patch);
      });
    };

    applyToList(this.baseItems);
    applyToList(this.items);
    this._requestRender();
  }

  _cloneBaseItems() {
    return (this.baseItems || []).map((item) => ({ ...item, collected: false, revealed: false }));
  }

  _resetRunState() {
    this.backpack = [];
    this.selectedInventoryIndex = 0;
    this.emptyHatchConfirmUntil = null;
    this.items = this._cloneBaseItems();
    this.runtimeColliderIds.clear();
    this.colliders = (this.baseColliders || this.colliders).map(normalizeSolidCollider);
    this.timeLeft = this.duration;
    this.elapsedSeconds = 0;
    this.aftershockTriggered = false;
    this.hazardNoticeIds.clear();
    this.tensionTriggered.clear();
    this.screenShake = 0;
    this.notificationText = '';
    this.notificationTimer = 0;
    this.revealAllRooms = false;
    Object.assign(this.player, this.basePlayerState || {}, {
      isMoving: false,
      frame: 0,
      animTimer: 0,
    });
    Object.keys(this.keys).forEach((key) => { this.keys[key] = false; });

    this._resetCameraToPlayer();
    this._initFogOfWar();
  }

  _bindEvents() {
    if (this._eventsBound) return;
    this._handleKeyDown = (e) => {
      if (!this.isActive) return;
      const k = e.key.toLowerCase();
      const oneShotKey = [' ', 'e', 'q'].includes(k);
      if (e.repeat && oneShotKey) return;

      // All developer shortcuts and editor interaction are owned by the
      // adapter. The game keeps only movement/interact keys below.
      if (this.devTools?.handleKeyDown(e)) {
        e.preventDefault();
        return;
      }

      this.keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'e', 'q', '1', '2', '3', '4', '5'].includes(k)) {
        e.preventDefault();
      }
      if (k === ' ' || k === 'e') {
        this._handleInteract();
      }
      if (k === 'q') {
        this._dropSelectedItem();
      }
      if (['1', '2', '3', '4', '5'].includes(k)) {
        this.selectedInventoryIndex = parseInt(k, 10) - 1;
        this._updateHUD();
      }
    };

    this._handleKeyUp = (e) => {
      if (!this.isActive) return;
      if (this.devTools?.handleKeyUp(e)) {
        e.preventDefault();
        return;
      }
      const k = e.key.toLowerCase();
      this.keys[k] = false;
    };

    this._clearPressedKeys = () => {
      Object.keys(this.keys).forEach((key) => { this.keys[key] = false; });
      this.player.isMoving = false;
      this.devTools?.clearPressedKeys();
    };

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._clearPressedKeys);
    document.addEventListener('visibilitychange', this._clearPressedKeys);
    this._eventsBound = true;
  }

  start() {
    this._bindEvents();
    this.isActive = true;
    this._resetRunState();
    this.lastTime = performance.now();
    this._createDOM();
    void this.devTools?.loadSavedDrafts();
    if (this.devTools?.freeCameraRequested) this.setFreeCamera(true);
    if (this.devTools?.fogEditorRequested) this.setFogEditor(true);
    if (this.devTools?.itemEditorRequested) this.setItemEditor(true);
    this._updateTimerHUD();
    this.animId = requestAnimationFrame((t) => this._loop(t));

    // Audio cue
    retroAudio.playSiren?.();
  }

  _createDOM() {
    // Canvas Container Wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'scavenger-game-wrapper';
    this.wrapper.className = 'scavenger-game-wrapper';

    const timerDefaultStr = `00:${Math.ceil(this.duration) < 10 ? '0' : ''}${Math.ceil(this.duration)}`;

    // HUD Header
    this.hudHeader = document.createElement('div');
    this.hudHeader.className = 'scavenger-hud-header';
    this.hudHeader.innerHTML = `
      <div class="scavenger-timer-badge${this.timerEnabled ? '' : ' no-timer'}" id="scavenger-timer">
        <span class="timer-icon">${this.timerEnabled ? '⚠' : '◷'}</span> ${this.timerEnabled ? 'EVAKUASI:' : 'EKSPEDISI:'} <strong id="timer-val">${this.timerEnabled ? timerDefaultStr : 'TANPA BATAS WAKTU'}</strong>
      </div>
      <div class="scavenger-room-badge" id="scavenger-room" style="background: rgba(14, 18, 26, 0.92); border: 1px solid #5bc0be; color: #5bc0be; font-family: 'Share Tech Mono', monospace; padding: 6px 14px; font-size: clamp(0.85rem, 1.1vw, 1.1rem); letter-spacing: 1px; box-shadow: 0 4px 16px rgba(0,0,0,0.7);">
        📍 <span id="room-name-val">${this.config?.label || 'RUANG KELUARGA'}</span>
      </div>
      ${this.mode === 'expedition' ? `<div class="scavenger-expedition-objective">⌖ ${this.config?.objective || 'Kembali ke titik aman.'}</div>` : ''}
      <div class="scavenger-backpack-badge" id="scavenger-backpack">
        <div class="scavenger-backpack-title">
          <span class="backpack-icon">🎒</span> RANSEL: <strong id="backpack-count">0 / ${this.maxCapacity}</strong>
        </div>
        <div class="scavenger-inventory-slots" id="scavenger-inventory-slots"></div>
        <div class="scavenger-inventory-hint" id="scavenger-inventory-hint">
          <span class="hint-key">[Q]</span> DROP BARANG &bull; <span class="hint-key">[1-5]</span> PILIH SLOT
        </div>
      </div>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'scavenger-canvas';
    this.canvas.className = 'scavenger-canvas';
    this.canvas.width = this.VIEW_W;
    this.canvas.height = this.VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.devTools?.attach(this.canvas);

    // Developer-only guidance/feedback is not even added to the release DOM.
    // The adapter still owns the same host slots when Vite runs in dev mode.
    if (this.devTools?.enabled) {
      this.editorInfo = document.createElement('div');
      this.editorInfo.className = 'scavenger-editor-info';
      this.editorInfo.innerHTML = `
        <strong>EDITOR DEV AKTIF</strong>
        <span><b>[F8]</b> SEMBUNYIKAN / TAMPILKAN BANTUAN EDITOR</span>
        <span><b>[F9]</b> EDITOR POSISI ITEM SCAVENGER</span>
        <span><b>[CTRL+S]</b> SIMPAN PERUBAHAN KE FILE</span>
      `;
      this.editorInfo.hidden = true;

      this.editorFeedback = document.createElement('div');
      this.editorFeedback.className = 'scavenger-editor-feedback';
      this.editorFeedback.setAttribute('role', 'status');
      this.editorFeedback.setAttribute('aria-live', 'polite');
      this.editorFeedback.hidden = true;
    }

    // Desktop Tactical Controls Hint Overlay
    this.desktopHints = document.createElement('div');
    this.desktopHints.className = 'scavenger-desktop-hints';
    this.desktopHints.innerHTML = `
      <span><span class="hint-key">WASD / ARAH</span> Gerak</span>
      <span>•</span>
      <span><span class="hint-key">E / SPASI</span> Ambil / Masuk</span>
      <span>•</span>
      <span><span class="hint-key">1-5</span> Pilih Slot</span>
      <span>•</span>
      <span><span class="hint-key">Q</span> Drop / Buang Barang</span>
      ${this.devTools?.enabled ? `
        <span>•</span>
        <span><span class="hint-key">F3/F4/F7/F9</span> Editor Dev</span>
        <span>•</span>
        <span><span class="hint-key">F8</span> Sembunyikan Bantuan Editor</span>
      ` : ''}
    `;

    // Mobile / Touch D-Pad Overlay
    this.touchControls = document.createElement('div');
    this.touchControls.className = 'scavenger-touch-controls';
    this.touchControls.innerHTML = `
      <div class="touch-dpad">
        <button type="button" class="touch-btn touch-up" data-key="w">▲</button>
        <div class="touch-middle-row">
          <button type="button" class="touch-btn touch-left" data-key="a">◀</button>
          <button type="button" class="touch-btn touch-down" data-key="s">▼</button>
          <button type="button" class="touch-btn touch-right" data-key="d">▶</button>
        </div>
      </div>
      <div class="touch-actions">
        <button type="button" class="touch-action-btn touch-drop-btn" id="touch-drop-btn">BUANG [Q]</button>
        <button type="button" class="touch-action-btn" id="touch-interact-btn">AMBIL / MASUK [E]</button>
      </div>
    `;

    // Assemble
    this.wrapper.appendChild(this.hudHeader);
    this.wrapper.appendChild(this.canvas);
    if (this.editorInfo) this.wrapper.appendChild(this.editorInfo);
    if (this.editorFeedback) this.wrapper.appendChild(this.editorFeedback);
    this.wrapper.appendChild(this.desktopHints);
    this.wrapper.appendChild(this.touchControls);
    this.container.appendChild(this.wrapper);

    this._setupTouchEvents();
    this._updateHUD();
    this.devTools?.updateEditorHelpVisibility();

    if (this.devTools?.collisionEditorRequested) {
      this.setCollisionEditor(true);
    }
  }

  _setupTouchEvents() {
    const bindTouchBtn = (btn, key) => {
      const press = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        this.keys[key] = true;
        btn.classList.add('pressed');
        btn.setPointerCapture?.(e.pointerId);
      };
      const release = (e) => {
        e.preventDefault();
        this.keys[key] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', press, { passive: false });
      btn.addEventListener('pointerup', release, { passive: false });
      btn.addEventListener('pointercancel', release, { passive: false });
      btn.addEventListener('lostpointercapture', release, { passive: false });
    };

    this.touchControls.querySelectorAll('.touch-btn').forEach(btn => {
      bindTouchBtn(btn, btn.dataset.key);
    });

    const bindActionBtn = (btn, action) => {
      let activePointerId = null;
      const press = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        activePointerId = e.pointerId;
        btn.classList.add('pressed');
        btn.setPointerCapture?.(e.pointerId);
      };
      const release = (e) => {
        if (activePointerId === null || e.pointerId !== activePointerId) return;
        e.preventDefault();
        activePointerId = null;
        btn.classList.remove('pressed');
        action();
      };
      const cancel = (e) => {
        if (activePointerId !== null && e.pointerId === activePointerId) {
          activePointerId = null;
          btn.classList.remove('pressed');
        }
      };
      btn.addEventListener('pointerdown', press, { passive: false });
      btn.addEventListener('pointerup', release, { passive: false });
      btn.addEventListener('pointercancel', cancel, { passive: false });
      btn.addEventListener('lostpointercapture', cancel, { passive: false });
    };

    const dropBtn = this.touchControls.querySelector('#touch-drop-btn');
    const interactBtn = this.touchControls.querySelector('#touch-interact-btn');
    if (dropBtn) bindActionBtn(dropBtn, () => this._dropSelectedItem());
    if (interactBtn) bindActionBtn(interactBtn, () => this._handleInteract());
  }

  _getNearestInteractableItem(maxDistance = 70) {
    const currentRoomId = this.mode === 'prologue'
      ? this._getCurrentVisibilityRoom()
      : null;
    return this.items
      .filter((item) => {
        if (item.collected || this._getDist(this.player, item) >= maxDistance) return false;
        if (this.mode === 'prologue' && this._getItemRoomId(item) !== currentRoomId) return false;
        return true;
      })
      .sort((a, b) => this._getDist(this.player, a) - this._getDist(this.player, b))[0] || null;
  }

  _handleInteract() {
    // 1. Proximity item pickup — the same nearest-item contract is also used
    // by tooltips and touch interaction, with a room guard in prologue mode.
    const nearbyItem = this._getNearestInteractableItem();

    if (nearbyItem) {
      if (this.backpack.length >= this.maxCapacity) {
        this._showNotification(`Ransel penuh! Maksimal ${this.maxCapacity} barang.`);
        retroAudio.playBuzz?.();
        return;
      }

      nearbyItem.collected = true;
      this.backpack.push({
        uid: nearbyItem.uid || `${nearbyItem.id}-${Date.now()}`,
        type: nearbyItem.type || nearbyItem.id,
        id: nearbyItem.type || nearbyItem.id,
        name: nearbyItem.name,
      });

      // Auto-select the newly added slot
      this.selectedInventoryIndex = this.backpack.length - 1;

      this._updateHUD();
      this._showNotification(`+ ${nearbyItem.name} dimasukkan! [Tekan Q untuk drop]`);
      retroAudio.playClick?.();
      return;
    }

    // 2. Bunker Hatch / Exit interaction
    const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
    const nearbyExit = exits.find((exit) => {
      const center = { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 };
      return this._getDist(this.player, center) < 85;
    });

    if (nearbyExit) {
      // Empty backpack: require confirmation within 3-second window
      if (this.backpack.length === 0) {
        const now = Date.now();
        if (this.emptyHatchConfirmUntil && now < this.emptyHatchConfirmUntil) {
          this.emptyHatchConfirmUntil = null;
          this._finishMinigame(nearbyExit.reason || 'entered_hatch');
          return;
        }
        this.emptyHatchConfirmUntil = now + 3000;
        this._showNotification('MASUK TANPA PERSEDIAAN? Tekan E / SPASI lagi untuk konfirmasi.');
        retroAudio.playAlert?.();
        return;
      }

      this._finishMinigame(nearbyExit.reason || 'entered_hatch');
    }
  }

  _dropSelectedItem() {
    if (this.selectedInventoryIndex < 0 || this.selectedInventoryIndex >= this.backpack.length) {
      this._showNotification('Pilih slot ransel yang berisi barang untuk membuang.');
      retroAudio.playBuzz?.();
      return;
    }

    const dropped = this.backpack.splice(this.selectedInventoryIndex, 1)[0];
    if (!dropped) return;

    // Find the world item instance by uid
    const worldItem = this.items.find(it => it.uid === dropped.uid);
    if (worldItem) {
      let dropX = this.player.x;
      let dropY = this.player.y + 16;
      const bounds = this._getPlayableBounds();
      dropX = Math.max(bounds.x + 24, Math.min(bounds.x + bounds.w - 24, dropX));
      dropY = Math.max(bounds.y + 24, Math.min(bounds.y + bounds.h - 24, dropY));

      worldItem.x = dropX;
      worldItem.y = dropY;
      worldItem.collected = false;
      worldItem.revealed = true;
      if (this.mode === 'prologue') {
        worldItem.roomId = this.currentRoomId || 'foyer';
      }
    }

    if (this.selectedInventoryIndex >= this.backpack.length && this.backpack.length > 0) {
      this.selectedInventoryIndex = this.backpack.length - 1;
    }

    this._updateHUD();
    this._showNotification(`- ${dropped.name} dikeluarkan dari ransel.`);
    retroAudio.playClick?.();
  }

  _updateHUD() {
    const countEl = document.getElementById('backpack-count');
    if (countEl) {
      countEl.textContent = `${this.backpack.length} / ${this.maxCapacity}`;
    }

    const slotsContainer = document.getElementById('scavenger-inventory-slots');
    if (slotsContainer) {
      slotsContainer.innerHTML = '';
      for (let i = 0; i < this.maxCapacity; i++) {
        const item = this.backpack[i];
        const isSelected = (i === this.selectedInventoryIndex);
        const slotEl = document.createElement('div');
        slotEl.className = `scavenger-inv-slot${item ? ' filled' : ' empty'}${isSelected ? ' selected' : ''}`;
        slotEl.title = item ? `Slot ${i + 1}: ${item.name} [Tekan Q untuk buang]` : `Slot ${i + 1}: Kosong`;

        const keyHint = document.createElement('span');
        keyHint.className = 'slot-key';
        keyHint.textContent = `${i + 1}`;
        slotEl.appendChild(keyHint);

        if (item) {
          const asset = ITEM_ASSETS[item.type || item.id];
          if (asset?.image) {
            const img = document.createElement('img');
            img.src = asset.image;
            img.alt = item.name;
            slotEl.appendChild(img);
          }
        }

        slotEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedInventoryIndex = i;
          this._updateHUD();
        });

        slotsContainer.appendChild(slotEl);
      }
    }

    const hintEl = document.getElementById('scavenger-inventory-hint');
    if (hintEl) {
      const selectedItem = this.backpack[this.selectedInventoryIndex];
      if (selectedItem) {
        hintEl.innerHTML = `<span class="hint-key">[Q]</span> DROP ${selectedItem.name.toUpperCase()} &bull; <span class="hint-key">[1-5]</span> PILIH SLOT`;
      } else {
        hintEl.innerHTML = `<span class="hint-key">[Q]</span> DROP BARANG &bull; <span class="hint-key">[1-5]</span> PILIH SLOT`;
      }
    }
  }

  _showNotification(text) {
    this.notificationText = text;
    this.notificationTimer = 2.5; // seconds
  }

  _triggerTensionEvents() {
    if (this.mode !== 'prologue' || !this.timerEnabled || this.duration <= 0) return;
    this.tensionEvents.forEach((event) => {
      const threshold = this.duration * event.remainingRatio;
      if (this.tensionTriggered.has(event.id) || this.timeLeft > threshold) return;

      this.tensionTriggered.add(event.id);
      this._showNotification(event.message);
      this.screenShake = event.shake;
      const audioMethod = retroAudio[event.audio];
      audioMethod?.call(retroAudio);
    });
  }

  _getDist(p1, p2) {
    const dx = (p1.x || p1.x === 0 ? p1.x : 0) - (p2.x || p2.x === 0 ? p2.x : 0);
    const dy = (p1.y || p1.y === 0 ? p1.y : 0) - (p2.y || p2.y === 0 ? p2.y : 0);
    return Math.hypot(dx, dy);
  }

  _getFogRooms() {
    return this.fogLayout?.rooms || PROLOGUE_ROOMS;
  }

  _getFogDoorways() {
    return this.fogLayout?.doorways || PROLOGUE_DOORWAYS;
  }

  _applyFogEditorShapes() {
    if (!Array.isArray(this.fogEditorShapes)) return;

    const nextLayout = cloneFogLayout();
    const roomShapesById = new Map();
    this.fogEditorShapes
      .filter((shape) => shape.type === 'fog-room' && shape.roomId)
      .forEach((shape) => {
        const roomId = String(shape.roomId);
        const shapes = roomShapesById.get(roomId) || [];
        shapes.push(shape);
        roomShapesById.set(roomId, shapes);
      });

    const toFogRect = (shape, fallback = {}) => ({
      ...fallback,
      x: shape.x,
      y: shape.y,
      w: shape.w,
      h: shape.h,
      angle: shape.angle || 0,
    });

    const sortedRoomShapes = (roomId) => (roomShapesById.get(String(roomId)) || [])
      .slice()
      .sort((a, b) => (Number(a.rectIndex) || 0) - (Number(b.rectIndex) || 0));

    nextLayout.rooms = nextLayout.rooms.map((room) => ({
      ...room,
      rects: sortedRoomShapes(room.id).map((shape) => toFogRect(shape)),
    }));

    // A newly created room zone inherits an existing room's visibility state
    // through its roomId. Keep custom room ids functional as well, so saved
    // editor data never becomes a decorative rectangle that the runtime ignores.
    const knownRoomIds = new Set(nextLayout.rooms.map((room) => String(room.id)));
    roomShapesById.forEach((shapes, roomId) => {
      if (knownRoomIds.has(roomId)) return;
      const sourceRoom = nextLayout.rooms.find((room) => room.id === 'living') || {};
      nextLayout.rooms.push({
        id: roomId,
        name: `FOG ${roomId.toUpperCase()}`,
        adjacent: [...(sourceRoom.adjacent || ['living'])],
        rects: shapes
          .slice()
          .sort((a, b) => (Number(a.rectIndex) || 0) - (Number(b.rectIndex) || 0))
          .map((shape) => toFogRect(shape)),
      });
    });

    const baseDoorways = cloneFogLayout().doorways;
    nextLayout.doorways = this.fogEditorShapes
      .filter((shape) => shape.type === 'fog-doorway' && shape.doorwayId)
      .map((shape) => {
        const source = baseDoorways.find((doorway) => doorway.id === shape.doorwayId);
        const doorwayId = String(shape.doorwayId);
        const rect = toFogRect(shape, source?.rect || {});
        const rooms = normalizeFogRoomPair(shape.rooms, source?.rooms || ['living', 'foyer']);
        return {
          ...(source || {}),
          id: doorwayId,
          name: shape.name || source?.name || `Custom Fog Doorway ${doorwayId}`,
          rooms,
          x: rect.x + rect.w / 2,
          y: rect.y + rect.h / 2,
          radius: Number.isFinite(Number(shape.radius)) ? Number(shape.radius) : (source?.radius || 125),
          rect,
        };
      });

    this.fogLayout = nextLayout;
    this._requestRender();
  }

  _panCameraBy(dx = 0, dy = 0) {
    const maxX = Math.max(0, this.MAP_W - this.VIEW_W);
    const maxY = Math.max(0, this.MAP_H - this.VIEW_H);
    this.camera.x = clamp(this.camera.x + (Number(dx) || 0), 0, maxX);
    this.camera.y = clamp(this.camera.y + (Number(dy) || 0), 0, maxY);
    this._requestRender();
  }

  _resetCameraToPlayer() {
    const maxX = Math.max(0, this.MAP_W - this.VIEW_W);
    const maxY = Math.max(0, this.MAP_H - this.VIEW_H);
    this.camera.x = clamp(this.player.x - this.VIEW_W / 2, 0, maxX);
    this.camera.y = clamp(this.player.y - this.VIEW_H / 2, 0, maxY);
    this._requestRender();
  }

  _requestRender() {
    this.renderDirty = true;
  }

  _initFogOfWar() {
    if (this.mode !== 'prologue') return;
    this.discoveredRooms = new Set();
    this.currentRoomId = this._getCurrentVisibilityRoom();
    this.discoveredRooms.add('foyer');
    if (this.currentRoomId) this.discoveredRooms.add(this.currentRoomId);
    this.roomVisibilityStates = {};
    this._getFogRooms().forEach((r) => {
      this.roomVisibilityStates[r.id] = (r.id === this.currentRoomId) ? FOG_DARKNESS.CURRENT : FOG_DARKNESS.DISTANT_UNDISCOVERED;
    });

    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas');
      this.fogCanvas.width = this.VIEW_W;
      this.fogCanvas.height = this.VIEW_H;
      this.fogCtx = this.fogCanvas.getContext('2d');
      this.fogSoftCanvas = document.createElement('canvas');
      this.fogSoftCanvas.width = this.VIEW_W;
      this.fogSoftCanvas.height = this.VIEW_H;
      this.fogSoftCtx = this.fogSoftCanvas.getContext('2d');
    }
  }

  _getRoomAtPosition(x, y) {
    if (this.mode === 'expedition') {
      const zone = (this.config?.roomZones || []).find((room) =>
        x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h
      );
      return zone?.id || 'expedition';
    }

    // Doorway rectangles intentionally overlap the broad living-room
    // footprint. Specific rooms win first so item ownership stays stable.
    const detectionOrder = [
      'bunker', 'master', 'child', 'bath', 'kitchen', 'office', 'foyer', 'living',
      ...this._getFogRooms()
        .map((room) => room.id)
        .filter((roomId) => !['bunker', 'master', 'child', 'bath', 'kitchen', 'office', 'foyer', 'living'].includes(roomId)),
    ];
    for (const roomId of detectionOrder) {
      const room = this._getFogRooms().find((candidate) => candidate.id === roomId);
      if (room?.rects.some((rect) => {
        const localPoint = getRectAngle(rect)
          ? rotatePoint({ x, y }, getRectCenter(rect), -getRectAngle(rect))
          : { x, y };
        return localPoint.x >= rect.x && localPoint.x <= rect.x + rect.w
          && localPoint.y >= rect.y && localPoint.y <= rect.y + rect.h;
      })) {
        return roomId;
      }
    }
    return 'living';
  }

  _getItemRoomId(item) {
    return item.roomId || this._getRoomAtPosition(item.x, item.y);
  }

  _getCurrentVisibilityRoom() {
    return this._getRoomAtPosition(this.player.x, this.player.y);
  }

  _getCurrentRoomName() {
    if (this.mode === 'expedition') {
      const zone = (this.config?.roomZones || []).find((room) =>
        this.player.x >= room.x && this.player.x <= room.x + room.w && this.player.y >= room.y && this.player.y <= room.y + room.h
      );
      return zone?.name || this.config?.label || 'RUTE EKSPEDISI';
    }
    const roomId = this._getCurrentVisibilityRoom();
    const room = this._getFogRooms().find((r) => r.id === roomId);
    return room ? room.name : 'KORIDOR RUMAH';
  }

  _updateRoomVisibility(dt) {
    if (this.mode !== 'prologue') return;

    if (this.revealAllRooms) {
      this._getFogRooms().forEach((r) => {
        this.discoveredRooms.add(r.id);
        this.roomVisibilityStates[r.id] = FOG_DARKNESS.CURRENT;
      });
      this.items.forEach((it) => { it.revealed = true; });
      return;
    }

    this.currentRoomId = this._getCurrentVisibilityRoom();
    if (this.currentRoomId) {
      this.discoveredRooms.add(this.currentRoomId);
    }

    // Discovery is room-based. An item must not become visible merely because
    // its coordinates are close through a wall.
    this.items.forEach((it) => {
      if (it.collected) return;
      if (!it.revealed && this.discoveredRooms.has(this._getItemRoomId(it))) it.revealed = true;
    });

    const currentRoom = this._getFogRooms().find((r) => r.id === this.currentRoomId);
    const adjacentRoomIds = currentRoom ? currentRoom.adjacent : [];

    // Calculate doorway peeking proximity
    const doorwayPeeks = {};
    this._getFogDoorways().forEach((d) => {
      if (!d.rooms.includes(this.currentRoomId)) return;
      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
      if (dist < d.radius) {
        const peek = 1 - (dist / d.radius); // 0.0 to 1.0
        const otherId = d.rooms[0] === this.currentRoomId ? d.rooms[1] : d.rooms[0];
        doorwayPeeks[otherId] = Math.max(doorwayPeeks[otherId] || 0, peek);
      }
    });

    // Determine target darkness for each room
    this._getFogRooms().forEach((room) => {
      let targetAlpha;
      if (room.id === this.currentRoomId) {
        targetAlpha = FOG_DARKNESS.CURRENT;
      } else if (adjacentRoomIds.includes(room.id)) {
        targetAlpha = this.discoveredRooms.has(room.id)
          ? FOG_DARKNESS.ADJACENT_DISCOVERED
          : FOG_DARKNESS.ADJACENT_UNDISCOVERED;
      } else {
        targetAlpha = this.discoveredRooms.has(room.id)
          ? FOG_DARKNESS.DISTANT_DISCOVERED
          : FOG_DARKNESS.DISTANT_UNDISCOVERED;
      }

      // Doorway peek smoothly illuminates the adjacent room being peeked into
      if (doorwayPeeks[room.id] > 0) {
        const peek = doorwayPeeks[room.id];
        const peekTarget = 0.22;
        targetAlpha = targetAlpha * (1 - peek) + peekTarget * peek;
      }

      // Bunker emergency beacon ambient presence (subtle guidance even from afar)
      if (room.id === 'bunker' && targetAlpha > 0.72) {
        targetAlpha = 0.72;
      }

      // Timer pressure escalation (<= 15s and <= 10s)
      if (this.timerEnabled && this.timeLeft <= 15) {
        const factor = Math.min(1, (15 - this.timeLeft) / 15);
        if (room.id !== this.currentRoomId) {
          targetAlpha += 0.04 * factor;
        }
        if (this.timeLeft <= 10) {
          // Subtle, accessible emergency breathing pulse
          const pulse = Math.sin(Date.now() * 0.003) * 0.02;
          targetAlpha = Math.max(0.05, Math.min(0.89, targetAlpha + pulse));
        }
      }

      // Smooth temporal interpolation (~250-400ms fade)
      const current = this.roomVisibilityStates[room.id] ?? targetAlpha;
      const blendRate = Math.min(1, dt * 4.5);
      this.roomVisibilityStates[room.id] = current + (targetAlpha - current) * blendRate;
    });
  }

  _renderFogOfWar(ctx) {
    if (this.mode !== 'prologue' || !this.fogCanvas || this.fogDisabled) return;

    const fctx = this.fogCtx;
    fctx.clearRect(0, 0, this.VIEW_W, this.VIEW_H);

    fctx.save();
    const camX = Math.round(this.camera.x);
    const camY = Math.round(this.camera.y);
    fctx.translate(-camX + this.screenShake, -camY + this.screenShake * 0.5);

    const bounds = this._getPlayableBounds();
    const baseDarkness = Math.min(
      0.88,
      FOG_DARKNESS.BASE_OUTER + (this.timerEnabled && this.timeLeft <= 15 ? (15 - this.timeLeft) * 0.003 : 0)
    );

    // 1. Draw base outer darkness over the playable bounds
    fctx.fillStyle = `rgba(7, 9, 14, ${baseDarkness})`;
    fctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    // 2. Render each room's dynamic darkness overlay. Specific doorway rooms
    // are stamped after the broad living-room footprint so overlapping floor
    // zones resolve to the same room priority used by _getRoomAtPosition().
    const fogRoomOrder = [
      'living', 'foyer', 'office', 'kitchen', 'bath', 'child', 'master', 'bunker',
      ...this._getFogRooms()
        .map((room) => room.id)
        .filter((roomId) => !['living', 'foyer', 'office', 'kitchen', 'bath', 'child', 'master', 'bunker'].includes(roomId)),
    ];
    fogRoomOrder.forEach((roomId) => {
      const room = this._getFogRooms().find((candidate) => candidate.id === roomId);
      if (!room) return;
      const alpha = this.roomVisibilityStates[room.id] ?? baseDarkness;
      fctx.save();
      fctx.beginPath();
      room.rects.forEach((rect) => addRectPath(fctx, rect));
      fctx.clip();
      fctx.clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
      fctx.fillStyle = `rgba(7, 9, 14, ${alpha})`;
      fctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      fctx.restore();
    });

    // 3. Bunker beacon emergency ambient cutout (soft guide beacon visible through distant darkness)
    const bh = this.bunkerHatch;
    const bcx = bh.x + bh.w / 2;
    const bcy = bh.y + bh.h / 2;
    const bPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    fctx.save();
    fctx.globalCompositeOperation = 'destination-out';
    const bGrad = fctx.createRadialGradient(bcx, bcy, 6, bcx, bcy, 85 + 25 * bPulse);
    bGrad.addColorStop(0, `rgba(0, 0, 0, ${0.40 + 0.15 * bPulse})`);
    bGrad.addColorStop(0.6, `rgba(0, 0, 0, ${0.12 * bPulse})`);
    bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    fctx.fillStyle = bGrad;
    fctx.beginPath();
    fctx.arc(bcx, bcy, 110, 0, Math.PI * 2);
    fctx.fill();
    fctx.restore();

    fctx.restore(); // Restore camera translation on fogCtx

    // Blur only the completed fog buffer. The map and the editor outlines stay
    // crisp, while the darkness transitions around room edges become soft.
    let fogOutput = this.fogCanvas;
    if (this.fogSoftCtx && this.fogSoftCanvas) {
      this.fogSoftCtx.clearRect(0, 0, this.VIEW_W, this.VIEW_H);
      this.fogSoftCtx.save();
      this.fogSoftCtx.imageSmoothingEnabled = true;
      this.fogSoftCtx.filter = `blur(${FOG_EDGE_BLUR}px)`;
      this.fogSoftCtx.drawImage(this.fogCanvas, 0, 0);
      this.fogSoftCtx.restore();
      fogOutput = this.fogSoftCanvas;
    }

    // 4. Stamp the rendered fog buffer over the world canvas in screen coordinates
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fogOutput, 0, 0);
    ctx.restore();
  }

  _renderFogDebug(ctx) {
    if (this.mode !== 'prologue') return;
    ctx.save();

    // Room zones and status; this debug layer deliberately shows room state,
    // not a misleading player-centered flashlight radius.
    const currentRoomId = this.currentRoomId || this._getCurrentVisibilityRoom();
    this._getFogRooms().forEach((room) => {
      const isCurrent = room.id === currentRoomId;
      const isDiscovered = this.discoveredRooms.has(room.id);
      const alpha = (this.roomVisibilityStates[room.id] ?? 0.82).toFixed(2);

      room.rects.forEach((rect, idx) => {
        ctx.strokeStyle = isCurrent ? '#00ff88' : (isDiscovered ? '#38bdf8' : '#64748b');
        ctx.lineWidth = isCurrent ? 2 : 1;
        this._strokeWorldRect(ctx, rect);

        if (idx === 0) {
          ctx.fillStyle = isCurrent
            ? 'rgba(0, 255, 136, 0.12)'
            : (isDiscovered ? 'rgba(56, 189, 248, 0.05)' : 'rgba(100, 116, 139, 0.04)');
          this._fillWorldRect(ctx, rect);

          ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
          ctx.fillStyle = isCurrent ? '#00ff88' : (isDiscovered ? '#38bdf8' : '#94a3b8');
          const statusTag = isCurrent ? '[CURRENT]' : (isDiscovered ? '[DISCOVERED]' : '[UNDISCOVERED]');
          ctx.fillText(`${room.name} (${room.id}) ${statusTag} α:${alpha}`, rect.x + 8, rect.y + 16);
        }
      });
    });

    // Doorways
    this._getFogDoorways().forEach((d) => {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      this._strokeWorldRect(ctx, d.rect);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${d.id} (R:${d.radius})`, d.x - 30, d.y - 4);
    });

    this.devTools?.fogEditor?.render(ctx);

    ctx.restore();
  }

  _fillWorldRect(ctx, rect) {
    const angle = getRectAngle(rect);
    if (!angle) {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    const center = getRectCenter(rect);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }

  _strokeWorldRect(ctx, rect) {
    const angle = getRectAngle(rect);
    if (!angle) {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    const center = getRectCenter(rect);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }

  _loop(timestamp) {
    if (!this.isActive) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Developer camera input must continue while editor mode pauses gameplay.
    this.devTools?.update(dt);
    if (!this.isPaused) {
      this._update(dt * (this.timeScale || 1.0));
    }
    if (!this.isPaused || this.renderDirty) {
      this._render();
      this.renderDirty = false;
    }

    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this._requestRender();
    this.elapsedSeconds += dt;
    if (this.timerEnabled) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        if (!this.godMode) {
          this._finishMinigame('time_out');
          return;
        }
      }
    }

    this._triggerTensionEvents();
    this._updateTimerHUD();

    // Update Room Badge HUD
    const roomEl = document.getElementById('room-name-val');
    if (roomEl) {
      roomEl.textContent = this._getCurrentRoomName();
    }

    // Notification Timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
    }

    // Screen shake is event-driven rather than a random continuous nuisance.
    this.screenShake *= Math.max(0, 1 - dt * 4.5);

    if (this.freeCamera) {
      this.player.isMoving = false;
      this.player.frame = 0;
      this.player.animTimer = 0;
      this._updateRoomVisibility(dt);
      this._updateHazards();
      return;
    }

    // Movement Input
    let vx = 0;
    let vy = 0;
    if (this.keys['w'] || this.keys['arrowup']) vy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) vy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) vx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) vx += 1;

    this.player.isMoving = (vx !== 0 || vy !== 0);

    if (this.player.isMoving) {
      // 4 cardinal directions (standard RPG)
      if (vx < 0 && Math.abs(vx) >= Math.abs(vy)) this.player.dir = 'left';
      else if (vx > 0 && Math.abs(vx) >= Math.abs(vy)) this.player.dir = 'right';
      else if (vy < 0) this.player.dir = 'up';
      else if (vy > 0) this.player.dir = 'down';

      // Diagonal Normalization
      if (vx !== 0 && vy !== 0) {
        vx *= 0.70710678;
        vy *= 0.70710678;
      }

      // Sub-stepped movement resolution guarantees no tunneling or corner clipping
      const totalDist = Math.hypot(vx * this.player.speed * dt, vy * this.player.speed * dt);
      const maxStep = 4.0;
      const numSteps = Math.max(1, Math.ceil(totalDist / maxStep));
      const stepX = (vx * this.player.speed * dt) / numSteps;
      const stepY = (vy * this.player.speed * dt) / numSteps;

      for (let s = 0; s < numSteps; s++) {
        const nextX = this.player.x + stepX;
        const nextY = this.player.y + stepY;

        // Try full move first
        if (this._canMoveTo(nextX, nextY)) {
          this.player.x = nextX;
          this.player.y = nextY;
        } else {
          // Slide along wall: check dominant axis first
          let movedX = false;
          let movedY = false;

          if (Math.abs(stepX) >= Math.abs(stepY)) {
            if (this._canMoveTo(nextX, this.player.y)) {
              this.player.x = nextX;
              movedX = true;
            }
            if (this._canMoveTo(this.player.x, nextY)) {
              this.player.y = nextY;
              movedY = true;
            }
          } else {
            if (this._canMoveTo(this.player.x, nextY)) {
              this.player.y = nextY;
              movedY = true;
            }
            if (this._canMoveTo(nextX, this.player.y)) {
              this.player.x = nextX;
              movedX = true;
            }
          }

          if (!movedX && !movedY) {
            break;
          }
        }
      }

      // Animate 4-step walk cycle ([1, 0, 1, 2] -> Idle -> Left -> Idle -> Right)
      this.player.animTimer += dt;
      if (this.player.animTimer >= 1 / this.player.fps) {
        this.player.animTimer = 0;
        this.player.frame = (this.player.frame + 1) % 4;
      }
    } else {
      this.player.frame = 0;
      this.player.animTimer = 0;
    }

    // Smooth Follow Camera Lerp
    const targetCamX = Math.max(0, Math.min(this.MAP_W - this.VIEW_W, this.player.x - this.VIEW_W / 2));
    const targetCamY = Math.max(0, Math.min(this.MAP_H - this.VIEW_H, this.player.y - this.VIEW_H / 2));
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    this._updateRoomVisibility(dt);
    this._updateHazards();
  }

  _updateHazards() {
    if (this.mode !== 'expedition') return;
    this.hazards.forEach((hazard) => {
      if (hazard.type === 'aftershock' && !this.aftershockTriggered && this.elapsedSeconds >= (hazard.aftershockAt || 0)) {
        this.aftershockTriggered = true;
        if (hazard.blocker) {
          this.colliders.push(normalizeSolidCollider(hazard.blocker));
          this.runtimeColliderIds.add(String(hazard.blocker.id));
        }
        this.screenShake = 8;
        this._showNotification(hazard.message || 'Aftershock mengubah jalur. Cari rute lain.');
        retroAudio.playForeshadowTremor?.();
      }
      if (hazard.type === 'cable' && !this.hazardNoticeIds.has(hazard.id) && this._isNearRect(hazard, 76)) {
        this.hazardNoticeIds.add(hazard.id);
        this._showNotification(hazard.message || 'Kabel menyentuh air. Cari jalur lain.');
      }
      if (hazard.type === 'rubble' && !this.hazardNoticeIds.has(hazard.id) && this._isNearRect(hazard, 76)) {
        this.hazardNoticeIds.add(hazard.id);
        this._showNotification(hazard.message || 'Jalan tertutup puing. Putar melalui sisi lain.');
      }
      if (hazard.type === 'ash' && !this.hazardNoticeIds.has(hazard.id) && this._isNearRect(hazard, 20)) {
        this.hazardNoticeIds.add(hazard.id);
        this._showNotification(hazard.message || 'Abu tebal mengurangi jarak pandang.');
      }
    });
  }

  _isNearRect(rect, padding = 0) {
    const closestX = Math.max(rect.x, Math.min(this.player.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(this.player.y, rect.y + rect.h));
    return Math.hypot(this.player.x - closestX, this.player.y - closestY) <= padding;
  }
  _getPlayableBounds() {
    return this.playableBounds || { x: 0, y: 0, w: this.MAP_W, h: this.MAP_H };
  }

  _canMoveTo(x, y) {
    if (this.noCollision) return true;
    const pw = this.player.w;
    const ph = this.player.h;
    const bounds = this._getPlayableBounds();

    // Keep the entire foot collider inside the usable world envelope. The
    // irregular house edges are then closed by the architectural rectangles.
    if (
      x - pw / 2 < bounds.x ||
      x + pw / 2 > bounds.x + bounds.w ||
      y - ph / 2 < bounds.y ||
      y + ph / 2 > bounds.y + bounds.h
    ) {
      return false;
    }

    // Axis-separated movement calls this once per axis, allowing the player
    // to slide naturally along a wall or furniture footprint.
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      const inset = SOLID_COLLIDER_INSET;
      const collisionBox = inset > 0 && box.w > inset * 2 && box.h > inset * 2
        ? {
          ...box,
          x: box.x + inset,
          y: box.y + inset,
          w: box.w - inset * 2,
          h: box.h - inset * 2,
        }
        : box;
      if (intersectsPlayerFootHitbox(x, y, pw, ph, collisionBox)) {
        return false;
      }
    }

    return true;
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Clear Screen
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, this.VIEW_W, this.VIEW_H);

    // Apply Camera Translation & Screen Shake
    ctx.save();
    const camX = Math.round(this.camera.x);
    const camY = Math.round(this.camera.y);
    ctx.translate(-camX + this.screenShake, -camY + this.screenShake * 0.5);

    if (this.mode === 'expedition') {
      this._renderExpeditionLayout(ctx);
      this._renderExpeditionExits(ctx);
    } else {
      // ── 1. DRAW HOUSE BACKGROUND (OR PROCEDURAL FALLBACK) ──
      if (this.mapLoaded && this.mapImage.complete && this.mapImage.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = false;
        if (this.mapImage.naturalWidth === this.MAP_W && this.mapImage.naturalHeight === this.MAP_H) {
          // Native-size draw keeps the collision coordinates pixel-aligned.
          ctx.drawImage(this.mapImage, 0, 0);
        } else {
          // Custom expedition/config maps may still opt into a different world
          // size; keep the existing fallback behavior for those maps.
          ctx.drawImage(this.mapImage, 0, 0, this.MAP_W, this.MAP_H);
        }
      } else {
        this._renderHouseLayout(ctx);
      }

      // ── 2. DRAW BUNKER ENTRANCE HATCH PULSING BEACON ──
      this._renderBunkerHatch(ctx);
    }

    // ── 3. DRAW COLLECTIBLE ITEMS ──
    const itemEditorActive = Boolean(this.devTools?.itemEditor?.enabled);
    if (!itemEditorActive) this._renderItems(ctx);

    // ── 4. DRAW FOG OF WAR / DYNAMIC ROOM VISIBILITY (PROLOGUE) ──
    if (this.mode === 'prologue') {
      this._renderFogOfWar(ctx);
    }

    // Item authoring needs to remain visible even when the room is covered by
    // gameplay fog. It is still rendered in world coordinates and the editor
    // only exposes the collectible item layer.
    if (itemEditorActive) this._renderItems(ctx, { editorPreview: true });

    // ── 5. DRAW PLAYER CHARACTER ──
    this._renderPlayer(ctx);

    // ── 6. DRAW PROXIMITY TOOLTIPS ──
    this._renderTooltips(ctx);

    // ── DEBUG COLLIDERS & FOG ZONES (F2) ──
    // F8 hides instructional chrome, but the active editor geometry remains
    // visible and interactive so the map can still be edited without the
    // help card covering it.
    this.devTools?.renderDebug(ctx);

    ctx.restore(); // Restore Camera World Coordinates

    if (this.mode === 'expedition') this._renderExpeditionAtmosphere(ctx);
    // ── 6. DRAW FIXED SCREEN HUD OVERLAYS (Minimap Radar & Notifications) ──
    this._renderScreenHUD(ctx);

    ctx.restore();
  }

  _renderDebugColliders(ctx) {
    ctx.save();
    ctx.textAlign = 'left';
    const collisionEditorOnly = this._getActiveEditorMode() === 'collision';

    // 1. Playable Map Bounds
    const pw = this.player.w;
    const ph = this.player.h;
    const bounds = this._getPlayableBounds();
    const minX = bounds.x + pw / 2;
    const maxX = bounds.x + bounds.w - pw / 2;
    const minY = bounds.y + ph / 2;
    const maxY = bounds.y + bounds.h - ph / 2;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);
    ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(`MAP_BOUNDS [${Math.round(bounds.x)},${Math.round(bounds.y)} ${Math.round(bounds.w)}x${Math.round(bounds.h)}]`, minX + 10, minY + 18);

    // 2. Solid obstacle colliders. IDs stay in the source/save payload, while
    // the debug map remains uncluttered and uses one red visual treatment.
    ctx.lineWidth = 1;
    this.colliders.forEach((c) => {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.34)';
      ctx.strokeStyle = '#ef4444';
      this._fillWorldRect(ctx, c);
      this._strokeWorldRect(ctx, c);
    });

    if (!collisionEditorOnly) {
      // 3. Bunker Exit / Hatch Interaction Area & Radius
      const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
      exits.forEach(exit => {
        const cx = exit.x + exit.w / 2;
        const cy = exit.y + exit.h / 2;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);

        ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, 85, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#00ff88';
        ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`EXIT ZONE (R:85)`, cx - 35, cy);
      });

      // 4. Collectible Items Interaction Radius Circles (70px)
      this.items.forEach(it => {
        if (!it.collected) {
          ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(it.x, it.y, 70, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffd166';
          ctx.font = '10px "Segoe UI", Arial, sans-serif';
          ctx.fillText(`${it.name} (R:70)`, it.x - 30, it.y - 22);
        }
      });
    }

    // 5. Player Collision Hitbox & Coordinate Display
    ctx.fillStyle = 'rgba(0, 255, 136, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const pBoxX = this.player.x - this.player.w / 2;
    const pBoxY = this.player.y - this.player.h / 2;
    ctx.fillRect(pBoxX, pBoxY, this.player.w, this.player.h);
    ctx.strokeRect(pBoxX, pBoxY, this.player.w, this.player.h);

    ctx.fillStyle = '#ffff00';
    ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`PLAYER_FEET_HITBOX XY(${Math.round(this.player.x)},${Math.round(this.player.y)}) ${this.player.w}x${this.player.h}`, this.player.x - 75, this.player.y - 14);

    // The editor highlight and resize handles are drawn last so the selected
    // collider remains obvious above the regular red outlines.
    this.devTools?.collisionEditor?.render(ctx);

    ctx.restore();
  }

  _renderExpeditionLayout(ctx) {
    const palette = this.config?.palette || { floor: '#252b32', accent: '#5bc0be', hazard: '#ffd166' };
    ctx.fillStyle = palette.floor;
    ctx.fillRect(0, 0, this.MAP_W, this.MAP_H);

    ctx.strokeStyle = 'rgba(91, 192, 190, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.MAP_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.MAP_H); ctx.stroke(); }
    for (let y = 0; y < this.MAP_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.MAP_W, y); ctx.stroke(); }

    (this.config?.roomZones || []).forEach((zone) => {
      ctx.fillStyle = zone.color || '#263238';
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      ctx.fillStyle = palette.accent;
      ctx.font = 'bold 12px "Share Tech Mono", monospace';
      ctx.fillText(`[ ${zone.name} ]`, zone.x + 12, zone.y + 22);
    });

    this.colliders.forEach((collider) => {
      const colliderId = String(collider.id || '').toLowerCase();
      ctx.fillStyle = colliderId.includes('rubble') || colliderId.includes('cable') || colliderId.includes('debris') ? 'rgba(104, 78, 67, 0.92)' : 'rgba(7, 12, 17, 0.78)';
      this._fillWorldRect(ctx, collider);
      ctx.strokeStyle = colliderId.includes('cable') ? '#e36a5d' : 'rgba(168, 183, 191, 0.6)';
      this._strokeWorldRect(ctx, collider);
    });

    this.hazards.filter((hazard) => hazard.type !== 'aftershock').forEach((hazard) => {
      ctx.save();
      ctx.globalAlpha = hazard.type === 'ash' ? 0.22 : 0.78;
      ctx.fillStyle = hazard.type === 'cable' ? '#e36a5d' : hazard.type === 'ash' ? '#d7dde0' : '#8d6e63';
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.restore();
    });
  }

  _renderExpeditionExits(ctx) {
    const exits = this.exits?.length ? this.exits : [];
    exits.forEach((exit) => {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.006);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 255, 136, 0.12)';
      ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
      ctx.strokeStyle = `rgba(0, 255, 136, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
      ctx.fillStyle = '#8fffc4';
      ctx.font = 'bold 10px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(exit.label || 'KEMBALI', exit.x + exit.w / 2, exit.y + exit.h / 2 + 3);
      ctx.restore();
    });
  }

  _renderExpeditionAtmosphere(ctx) {
    const ash = this.hazards.find((hazard) => hazard.type === 'ash' && this._isNearRect(hazard, 0));
    if (!ash) return;
    const hasMask = this.backpack.includes('mask');
    ctx.save();
    ctx.fillStyle = hasMask ? 'rgba(220, 230, 232, 0.08)' : 'rgba(220, 230, 232, 0.18)';
    ctx.fillRect(0, 0, this.VIEW_W, this.VIEW_H);
    ctx.restore();
  }

  _renderBunkerHatch(ctx) {
    const h = this.bunkerHatch;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.007);

    // Pulsing Hazard Border Aura
    ctx.save();
    ctx.strokeStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(h.x - 4, h.y - 4, h.w + 8, h.h + 8);

    // Green Safe Beacon Light
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, h.y + h.h / 2, 8 + 4 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Beacon Pulse Wave
    ctx.strokeStyle = `rgba(0, 255, 136, ${1 - pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, h.y + h.h / 2, 28 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  _getItemFogAlpha(item) {
    if (this.mode !== 'prologue') return 1;
    if (this.fogDisabled || this.revealAllRooms) return 1;
    const roomId = this._getItemRoomId(item);
    const currentRoom = this._getFogRooms().find((room) => room.id === this.currentRoomId);
    if (roomId === this.currentRoomId) return 1;
    if (currentRoom?.adjacent.includes(roomId)) return 0.72;
    if (this.discoveredRooms.has(roomId) || item.revealed) return 0.32;
    return 0;
  }

  _renderItems(ctx, { editorPreview = false } = {}) {
    const items = editorPreview ? (this.baseItems || this.items) : this.items;
    const nearbyItem = editorPreview ? null : this._getNearestInteractableItem();
    items.forEach((it) => {
      if (!editorPreview && it.collected) return;

      const itemAlpha = editorPreview ? 1 : this._getItemFogAlpha(it);
      if (itemAlpha <= 0) return;
      const dist = this._getDist(this.player, it);
      const isNear = nearbyItem?.uid === it.uid;
      const isCurrentRoom = this.mode !== 'prologue' || this._getItemRoomId(it) === this.currentRoomId;
      const width = Math.max(4, Number(it.w) || 36);
      const height = Math.max(4, Number(it.h) || 36);
      const angle = Number(it.angle) || 0;

      ctx.save();
      ctx.globalAlpha = itemAlpha;
      if (isNear) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 18;
      }
      ctx.translate(it.x, it.y);
      if (angle) ctx.rotate(angle * Math.PI / 180);

      const img = this.itemImages[it.type || it.id];
      if (img && img.complete) {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      } else {
        // Fallback marker
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-width / 2, -height / 2, width, height);
      }

      if (editorPreview) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.82)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        ctx.setLineDash([]);
        ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#fef3c7';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(it.uid || it.id || 'ITEM').toUpperCase(), -width / 2, -height / 2 - 4);
      }

      if (editorPreview) {
        ctx.restore();
        return;
      }

      // Sparkle / Pulsing Ring - distance and room visibility attenuated
      let ringAlpha = 0;
      if (isNear) {
        ringAlpha = 1.0;
      } else if (this.mode === 'prologue') {
        if (isCurrentRoom && dist < 240) {
          ringAlpha = Math.max(0, (240 - dist) / 160) * 0.75;
        }
      } else {
        ringAlpha = 0.6;
      }

      if (ringAlpha > 0.05) {
        ctx.strokeStyle = isNear ? '#ffd166' : `rgba(255, 209, 102, ${ringAlpha})`;
        ctx.lineWidth = isNear ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(it.x, it.y, 22 + 3 * Math.sin(Date.now() * 0.006 + it.x), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  _renderPlayer(ctx) {
    const p = this.player;

    if (this.spritesLoaded && this.spritesheet.complete) {
      // Row Mapping in 3x4 spritesheet (768x1024, 3 cols x 4 rows, each 256x256)
      // Row 0: down, Row 1: left, Row 2: right, Row 3: up
      const dirMap = { down: 0, left: 1, right: 2, up: 3 };
      const row = dirMap[p.dir] !== undefined ? dirMap[p.dir] : 0;

      // 3-frame walk loop: [1, 0, 1, 2] -> Idle -> Left -> Idle -> Right
      const walkFrames = [1, 0, 1, 2];
      const col = p.isMoving ? walkFrames[p.frame % 4] : 1; // 1 is idle center standing pose

      const sw = 256;
      const sh = 256;
      const sx = col * sw;
      const sy = row * sh;

      // Render size on canvas
      const scale = 0.38;
      const dw = sw * scale; // ~97px
      const dh = sh * scale; // ~97px
      const frameAnchors = FATHER_FRAME_ANCHORS[p.dir] || FATHER_FRAME_ANCHORS.down;
      const anchor = frameAnchors[col] || { x: sw / 2, y: sh - 5 };
      const groundOffset = 16;
      const dx = p.x - anchor.x * scale;
      const dy = p.y + groundOffset - anchor.y * scale;

      // Subtle local ambient ground glow (keeps feet and character readable)
      ctx.save();
      const ambGrad = ctx.createRadialGradient(p.x, p.y + 4, 4, p.x, p.y + 4, 34);
      ambGrad.addColorStop(0, 'rgba(255, 220, 160, 0.22)');
      ambGrad.addColorStop(1, 'rgba(255, 220, 160, 0)');
      ctx.fillStyle = ambGrad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 4, 36, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw character sprite
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.spritesheet, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
      // Fallback rectangle if loading
      ctx.fillStyle = '#5bc0be';
      ctx.fillRect(p.x - 16, p.y - 32, 32, 32);
    }
  }

  _renderTooltips(ctx) {
    const nearbyItem = this._getNearestInteractableItem();
    if (nearbyItem) {
      this._drawBadge(ctx, nearbyItem.x, nearbyItem.y - 32, `[ E / SPASI: AMBIL ${nearbyItem.name.toUpperCase()} ]`, '#ffd166');
    }

    const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
    const nearbyExit = exits.find((exit) => this._getDist(this.player, { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 }) < 85);
    if (nearbyExit) {
      const exitCenter = { x: nearbyExit.x + nearbyExit.w / 2, y: nearbyExit.y + nearbyExit.h / 2 };
      let msg = '';
      if (this.emptyHatchConfirmUntil && Date.now() < this.emptyHatchConfirmUntil) {
        msg = '[ TEKAN E / SPASI LAGI: MASUK TANPA BARANG ]';
      } else if (this.backpack.length > 0) {
        msg = `[ E / SPASI: MASUK BUNKER (${this.backpack.length} BARANG) ]`;
      } else {
        msg = '[ E / SPASI: MASUK BUNKER 72 ]';
      }
      this._drawBadge(ctx, exitCenter.x, exitCenter.y - 38, msg, '#00ff88');
    }
  }

  _drawBadge(ctx, x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    const textWidth = ctx.measureText(text).width;
    const padding = 10;
    const bw = textWidth + padding * 2;
    const bh = 26;

    ctx.fillStyle = 'rgba(10, 14, 20, 0.94)';
    ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  _renderScreenHUD(ctx) {
    // 1. Notification Banner
    if (this.notificationTimer > 0) {
      this._renderNotification(ctx);
    }

    // 2. Tactical Radar Minimap (Top-Right Screen Corner)
    this._renderTacticalMinimap(ctx);

    // 3. Debug Mode Status Watermark
    if (this.devTools?.debugColliders && !this.devTools.editorHelpHidden) {
      const activeEditorMode = this._getActiveEditorMode();
      const debugText = activeEditorMode === 'fog'
        ? '[F7] FOG DEBUG: ON | HANYA AREA FOG'
        : activeEditorMode === 'collision'
          ? '[F3] COLLISION DEBUG: ON | HANYA COLLIDER'
          : activeEditorMode === 'items'
            ? '[F9] ITEM DEBUG: ON | HANYA ITEM SCAVENGER'
          : '[F2] DEBUG: ON | FOG + COLLISION';
      const debugColor = activeEditorMode === 'fog'
        ? '#c4b5fd'
        : activeEditorMode === 'items'
          ? '#fbbf24'
          : '#67e8f9';
      ctx.save();
      ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
      const debugWidth = Math.min(this.VIEW_W - 32, Math.max(430, ctx.measureText(debugText).width + 18));
      ctx.fillStyle = 'rgba(10, 14, 20, 0.9)';
      ctx.fillRect(16, 58, debugWidth, 30);
      ctx.strokeStyle = debugColor;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(16, 58, debugWidth, 30);

      ctx.fillStyle = debugColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(debugText, 24, 73);
      ctx.restore();
    }

    this.devTools?.renderHud(ctx);
  }

  _renderItemEditorHUD(ctx) {
    const editor = this.devTools?.itemEditor;
    if (!editor) return;
    const status = editor.getStatus();
    const selected = status.selectedItem;
    const selectedLine = selected
      ? `PILIH: ${String(selected.uid).toUpperCase()}  XY(${selected.x},${selected.y})`
      : 'PILIH ITEM: klik ikon makanan / barang';
    const lines = [
      `[F9] ITEM EDITOR: ON  |  ${this.collisionEditorKey.toUpperCase()}  |  ${status.itemCount} ITEMS`,
      selectedLine,
      'DRAG pindah  •  ARROW nudge  •  CTRL+S simpan ke file  •  ALT+R reset awal',
      '[F4] FREE CAM  •  W/A/S/D geser kamera  •  SHIFT lebih cepat  •  HOME kembali ke player',
      '[F8] sembunyikan bantuan  •  item tidak bisa dibuat/dihapus agar jumlah tetap aman',
      status.statusMessage,
    ];

    ctx.save();
    const x = 16;
    const y = this.debugColliders ? 88 : 58;
    const width = Math.min(this.VIEW_W - 32, 900);
    const lineHeight = 18;
    const height = 18 + lines.length * lineHeight;
    ctx.fillStyle = 'rgba(3, 7, 12, 0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.font = index === 0
        ? '700 12px "Segoe UI", Arial, sans-serif'
        : '11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = index === 0 ? '#fde68a' : (index === lines.length - 1 ? '#fde68a' : '#fef3c7');
      ctx.fillText(line, x + 8, y + 5 + index * lineHeight);
    });
    ctx.restore();
  }

  _renderCollisionEditorHUD(ctx) {
    const editor = this.devTools?.collisionEditor;
    if (!editor) return;
    const status = editor.getStatus();
    const selected = status.selectedRect;
    const selectedLine = selected
      ? `PILIH: SOLID  XY(${selected.x},${selected.y}) ${selected.w}x${selected.h} ROT:${Math.round(selected.angle || 0)}°`
      : (status.createMode ? `TAMBAH: SOLID — DRAG DI AREA KOSONG` : 'PILIH SOLID: klik bentuk merah');
    const lines = [
      `[F3] COLLISION EDITOR: ON  |  ${this.collisionEditorKey.toUpperCase()}  |  ${status.colliderCount} COLLIDERS`,
      selectedLine,
      'DRAG pindah  •  HANDLE resize  •  WHEEL rotasi  •  N / SHIFT+N baru SOLID',
      'CTRL+C/V salin-tempel  •  CTRL+D duplikat  •  CTRL+S simpan  •  CTRL+E export',
      'CTRL+Z undo  •  ALT+R reset awal',
      '[F4] FREE CAM  •  I/J/K/L pan  •  HOME kembali ke player  •  F7 fog',
      status.statusMessage,
    ];

    ctx.save();
    const x = 16;
    const y = this.debugColliders ? 88 : 58;
    const width = Math.min(this.VIEW_W - 32, 900);
    const lineHeight = 18;
    const height = 18 + lines.length * lineHeight;
    ctx.fillStyle = 'rgba(3, 7, 12, 0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.font = index === 0
        ? '700 12px "Segoe UI", Arial, sans-serif'
        : '11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = index === 0 ? '#67e8f9' : (index === lines.length - 1 ? '#fde68a' : '#cffafe');
      ctx.fillText(line, x + 8, y + 5 + index * lineHeight);
    });
    ctx.restore();
  }

  _renderFogEditorHUD(ctx) {
    const editor = this.devTools?.fogEditor;
    if (!editor) return;
    const status = editor.getStatus();
    const selected = status.selectedRect;
    const selectedLine = selected
      ? `PILIH: ${status.selectedLabel}  XY(${selected.x},${selected.y}) ${selected.w}x${selected.h} ROT:${Math.round(selected.angle || 0)}°`
      : (status.createMode ? `TAMBAH: ${status.createMode.toUpperCase()} — DRAG DI AREA KOSONG` : 'PILIH AREA RUANG / DOORWAY');
    const lines = [
      `[F7] FOG EDITOR: ON  |  ${this.collisionEditorKey.toUpperCase()}  |  ${status.colliderCount} AREA`,
      selectedLine,
      'N buat FOG ROOM  •  SHIFT+N buat DOORWAY  •  DELETE hapus area',
      'CTRL+C/V salin-tempel perilaku  •  CTRL+D duplikat fog  •  CTRL+S simpan',
      'CTRL+E export  •  CTRL+Z undo  •  ALT+R reset awal',
      'DRAG pindah  •  HANDLE resize  •  WHEEL rotasi',
      '[F4] FREE CAM  •  I/J/K/L pan  •  HOME kembali ke player',
      status.statusMessage,
    ];

    ctx.save();
    const x = 16;
    const y = this.debugColliders ? 88 : 58;
    const width = Math.min(this.VIEW_W - 32, 900);
    const lineHeight = 18;
    const height = 18 + lines.length * lineHeight;
    ctx.fillStyle = 'rgba(3, 7, 12, 0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.font = index === 0
        ? '700 12px "Segoe UI", Arial, sans-serif'
        : '11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = index === 0 ? '#c4b5fd' : (index === lines.length - 1 ? '#fde68a' : '#ede9fe');
      ctx.fillText(line, x + 8, y + 5 + index * lineHeight);
    });
    ctx.restore();
  }

  _renderFreeCameraHUD(ctx) {
    const lines = [
      '[F4] FREE CAMERA: ON',
      `CAMERA XY(${Math.round(this.camera.x)},${Math.round(this.camera.y)})  •  W/A/S/D geser  •  SHIFT cepat  •  I/J/K/L legacy`,
      'HOME kembali ke player  •  F2 debug  •  F3 collision  •  F7 fog  •  F9 item',
    ];
    ctx.save();
    const x = 16;
    const y = this.debugColliders ? 88 : 58;
    const width = Math.min(this.VIEW_W - 32, 900);
    const lineHeight = 18;
    const height = 18 + lines.length * lineHeight;
    ctx.fillStyle = 'rgba(3, 7, 12, 0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => {
      ctx.font = index === 0
        ? '700 12px "Segoe UI", Arial, sans-serif'
        : '11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = index === 0 ? '#fde68a' : '#fef3c7';
      ctx.fillText(line, x + 8, y + 5 + index * lineHeight);
    });
    ctx.restore();
  }

  _renderTacticalMinimap(ctx) {
    const mw = 160;
    const mh = 90;
    const mx = this.VIEW_W - mw - 16;
    const my = 58;

    ctx.save();
    // Minimap Background Panel
    ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#424a50';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    // Label
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(this.mode === 'expedition' ? 'RADAR RUTE' : 'RADAR RUMAH', mx + 6, my + 11);

    // Scale factors
    const sx = mw / this.MAP_W;
    const sy = mh / this.MAP_H;

    // Viewport camera rect on minimap
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + this.camera.x * sx, my + this.camera.y * sy, this.VIEW_W * sx, this.VIEW_H * sy);

    // Exit indicator
    const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
    exits.forEach((exit) => {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(mx + exit.x * sx, my + exit.y * sy, Math.max(5, exit.w * sx), Math.max(4, exit.h * sy));
    });

    // Items (Yellow dots) - hidden on radar in prologue mode to encourage exploration
    if (this.mode !== 'prologue') {
      this.items.forEach((it) => {
        if (it.collected) return;

        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(mx + it.x * sx, my + it.y * sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Player Pin (Cyan dot)
    ctx.fillStyle = '#5bc0be';
    ctx.beginPath();
    ctx.arc(mx + this.player.x * sx, my + this.player.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderNotification(ctx) {
    ctx.save();
    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    const text = this.notificationText;
    const textWidth = ctx.measureText(text).width;
    const bw = textWidth + 28;
    const bh = 32;
    const x = this.VIEW_W / 2;
    const y = this.VIEW_H - 45;

    ctx.fillStyle = 'rgba(15, 20, 28, 0.95)';
    ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  _renderHouseLayout(ctx) {
    // ── A. PROCEDURAL FALLBACK GRID BASE ──
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, this.MAP_W, this.MAP_H);

    // Architectural Grid Lines
    ctx.strokeStyle = 'rgba(91, 192, 190, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.MAP_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.MAP_H); ctx.stroke();
    }
    for (let y = 0; y < this.MAP_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.MAP_W, y); ctx.stroke();
    }

    // ── B. ROOM FLOOR ZONES (Color Coded & Labeled) ──
    const rooms = [
      { id: 'mb',   name: 'KAMAR TIDUR UTAMA',             color: '#1b2230', border: '#3b82f6', x: 28,   y: 18,  w: 432, h: 270 },
      { id: 'kb',   name: 'KAMAR TIDUR ANAK',              color: '#182836', border: '#38bdf8', x: 1155, y: 18,  w: 485, h: 280 },
      { id: 'bv',   name: 'RUANG PALKA BUNKER 72 (VAULT)', color: '#241a20', border: '#ef4444', x: 562,  y: 10,  w: 516, h: 240 },
      { id: 'kit',  name: 'DAPUR & RUANG MAKAN',           color: '#212938', border: '#10b981', x: 28,   y: 282, w: 460, h: 522 },
      { id: 'lr',   name: 'RUANG KELUARGA & TV',           color: '#1e2633', border: '#f59e0b', x: 488,  y: 240, w: 690, h: 440 },
      { id: 'bath', name: 'KAMAR MANDI & GUDANG OBAT',     color: '#15222b', border: '#06b6d4', x: 325,  y: 545, w: 183, h: 260 },
      { id: 'st',   name: 'RUANG KERJA / STUDIO',          color: '#25201c', border: '#f97316', x: 1180, y: 355, w: 460, h: 450 },
      { id: 'hall', name: 'TERAS DEPAN & PINTU UTAMA',     color: '#1c222c', border: '#ffd166', x: 630,  y: 680, w: 425, h: 240 }
    ];

    rooms.forEach(r => {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.strokeStyle = r.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillStyle = r.border;
      ctx.textAlign = 'left';
      ctx.fillText(`[ ${r.name} ]`, r.x + 10, r.y + 20);
    });

    // ── C. SPECIAL FLOOR ZONES: BUNKER VAULT HAZARD ZONE & LIVING RUG ──
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(580, 50, 500, 240);
    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ZONA EVAKUASI DARURAT - PALKA UTAMA ⚠', 830, 75);
    ctx.restore();

    // Living Room Area Rug
    ctx.fillStyle = '#133842';
    ctx.fillRect(720, 390, 300, 230);
    ctx.strokeStyle = '#5bc0be';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(720, 390, 300, 230);

    // ── D. DRAW ALL SOLID COLLIDERS ──
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    this.colliders.forEach(c => {
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    });

    // ── E. PINTU MASUK UTAMA / TERAS DEPAN (SPAWN POINT ILLUMINATED) ──
    ctx.save();
    ctx.fillStyle = 'rgba(255, 209, 102, 0.15)';
    ctx.fillRect(780, 840, 100, 45);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(780, 840, 100, 45);

    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText('▲ ▲ PINTU MASUK UTAMA ▲ ▲', 830, 858);
    ctx.font = 'bold 9px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[ TITIK AWAL MASUK / SPAWN ]', 830, 874);
    ctx.restore();
  }

  _finishMinigame(reason) {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    let lostItem = null;
    const lateEvacuation = (reason === 'time_out');

    if (lateEvacuation && this.backpack.length > 0) {
      lostItem = this.backpack.pop();
      this._updateHUD();
      this._showNotification(`WAKTU HABIS — EVAKUASI DARURAT! ${lostItem.name} tertinggal di luar!`);
    } else if (lateEvacuation) {
      this._showNotification('WAKTU HABIS — EVAKUASI DARURAT!');
    }

    // Sound effect
    retroAudio.playDoorLock?.();

    const resourceCounts = { food: 0, drink: 0, kit: 0, radio: 0, battery: 0, toy: 0 };
    const collectedTypes = this.backpack.map((it) => {
      const type = typeof it === 'string' ? it : (it.type || it.id);
      if (resourceCounts[type] !== undefined) {
        resourceCounts[type]++;
      }
      return type;
    });

    const timeRemaining = Math.max(0, Math.ceil(this.timeLeft));
    const securedBackpack = [...this.backpack];
    const resultSummary = {
      title: lateEvacuation ? 'EVAKUASI TERLAMBAT' : 'EVAKUASI SELESAI',
      reason: lateEvacuation ? 'WAKTU HABIS' : (reason === 'entered_hatch' ? 'PALKA TERKUNCI' : 'RUTE SELESAI'),
      itemCount: collectedTypes.length,
      timeRemaining,
      lateEvacuation,
      lostItem: lostItem ? { ...lostItem } : null,
    };
    const delay = lateEvacuation ? 1100 : 600;

    // Transition delay
    this.finishTimeoutId = setTimeout(() => {
      this.finishTimeoutId = null;
      this.destroy();
      if (typeof this.onComplete === 'function') {
        this.onComplete({
          collectedItems: collectedTypes,
          backpack: securedBackpack,
          resourceCounts,
          reason,
          timeRemaining,
          lateEvacuation,
          lostItem: lostItem ? { ...lostItem } : null,
          summary: resultSummary,
        });
      }
    }, delay);
  }

  destroy() {
    this.isActive = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.finishTimeoutId) {
      clearTimeout(this.finishTimeoutId);
      this.finishTimeoutId = null;
    }

    Object.keys(this.keys).forEach((key) => { this.keys[key] = false; });

    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._clearPressedKeys);
    document.removeEventListener('visibilitychange', this._clearPressedKeys);
    this._eventsBound = false;

    if (this.wrapper && this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }

    this.devTools?.destroy();
    this.editorInfo?.remove();
    this.editorFeedback?.remove();
    this._developerPauseSnapshot = null;
    this.renderDirty = false;

    this.fogCanvas = null;
    this.fogCtx = null;
    this.fogSoftCanvas = null;
    this.fogSoftCtx = null;
    this.discoveredRooms?.clear();
    this.roomVisibilityStates = {};

  }

  // ─── DEVELOPER CONSOLE & DEBUG HOOKS ────────────────────────────────────

  pause() {
    this.isPaused = true;
    this._requestRender();
  }

  resume() {
    // Developer modes intentionally pause the player/timer, but a normal
    // resume must always release a stale pause left by a previous editor.
    this.isPaused = this._isDeveloperModeActive();
    this._requestRender();
  }

  setTimeScale(scale = 1.0) {
    this.timeScale = Math.max(0.1, Number(scale) || 1.0);
  }

  addTime(seconds) {
    if (!this.timerEnabled) return;
    this.timeLeft = Math.max(0, this.timeLeft + seconds);
    this._updateTimerHUD();
  }

  setTime(seconds) {
    if (!this.timerEnabled) return;
    this.timeLeft = Math.max(0, Number(seconds) || 0);
    this._updateTimerHUD();
  }

  resetTimer() {
    if (!this.timerEnabled) return;
    this.timeLeft = this.duration;
    this._updateTimerHUD();
  }

  _updateTimerHUD() {
    const timerEl = document.getElementById('timer-val');
    if (timerEl && this.timerEnabled) {
      const s = Math.ceil(this.timeLeft);
      timerEl.textContent = `00:${s < 10 ? '0' : ''}${s}`;
      const timerBadge = timerEl.parentElement;
      if (s <= 10) {
        timerBadge?.classList.add('urgent-flash');
      } else {
        timerBadge?.classList.remove('urgent-flash');
      }
      timerBadge?.classList.toggle('critical-flash', s <= 5);
    }
  }

  setGodMode(enabled) {
    this.godMode = Boolean(enabled);
  }

  setNoCollision(enabled) {
    this.noCollision = Boolean(enabled);
  }

  _isDeveloperModeActive() {
    return Boolean(this.devTools?.isDeveloperModeActive());
  }

  _getActiveEditorMode() {
    return this.devTools?.getActiveEditorMode() || null;
  }

  setCollisionEditor(enabled) {
    return this.devTools?.setCollisionEditor(enabled) ?? false;
  }

  setFogEditor(enabled) {
    return this.devTools?.setFogEditor(enabled) ?? false;
  }

  setItemEditor(enabled) {
    return this.devTools?.setItemEditor(enabled) ?? false;
  }

  setFreeCamera(enabled) {
    return this.devTools?.setFreeCamera(enabled) ?? false;
  }

  setEditorHelpHidden(hidden) {
    return this.devTools?.setEditorHelpHidden(hidden) ?? false;
  }

  setDebugColliders(enabled) {
    return this.devTools?.setDebugColliders(enabled);
  }

  setFogDisabled(disabled) {
    this.fogDisabled = Boolean(disabled);
  }

  revealEntireMap() {
    this.revealAllRooms = true;
    this._getFogRooms().forEach((r) => {
      this.discoveredRooms.add(r.id);
      this.roomVisibilityStates[r.id] = FOG_DARKNESS.CURRENT;
    });
    this.items.forEach((it) => {
      it.revealed = true;
    });
  }

  teleportTo(x, y) {
    this.player.x = x;
    this.player.y = y;
    this._resetCameraToPlayer();
    if (this.mode === 'prologue') {
      this.currentRoomId = this._getCurrentVisibilityRoom();
      if (this.currentRoomId) this.discoveredRooms.add(this.currentRoomId);
    }
  }

  instantWin() {
    this._finishMinigame('entered_hatch');
  }

  forceTimeout() {
    this.godMode = false;
    this._finishMinigame('time_out');
  }

  restart() {
    // A restart is a fresh run on the same instance: immutable definitions,
    // player spawn, fog, timer, tension cues and transient input all return to
    // their captured baseline before the loop is resumed.
    if (this.finishTimeoutId) {
      clearTimeout(this.finishTimeoutId);
      this.finishTimeoutId = null;
    }
    this._bindEvents();
    this.isActive = true;
    this._resetRunState();
    this.isPaused = false;
    if (!this._isDeveloperModeActive()) this._developerPauseSnapshot = null;
    this.devTools?.syncDeveloperModePause();
    this.lastTime = performance.now();

    if (!this.wrapper || !this.wrapper.parentElement) {
      this._createDOM();
    } else {
      this._updateHUD();
    }
    this._updateTimerHUD();
    if (!this.animId) this.animId = requestAnimationFrame((t) => this._loop(t));
  }
}
