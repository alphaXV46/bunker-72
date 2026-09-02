/**
 * scavengerMinigame.js — 2D Top-Down Scavenger Minigame for Prologue Packing
 *
 * Simulates a high-tension, 40-second scavenge run in the player's large modern coastal home
 * with camera following, multi-room exploration, tactical radar HUD,
 * and rich high-res pixel art floorplan before diving into the basement bunker hatch.
 */

import { retroAudio } from './retroAudio.js';

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

// Rectangular floor-footprint colliders, measured against the native map.
// Decorative objects are intentionally omitted so the player can move close
// to furniture without catching on its elevated/transparent artwork.
const PROLOGUE_COLLIDERS = Object.freeze([
  // ── Architecture / outer perimeter ──
  { id: 'house_outer_left',       type: 'wall',      x: 0,    y: 18,  w: 28,  h: 792 },
  { id: 'house_outer_right',      type: 'wall',      x: 1640, y: 18,  w: 32,  h: 792 },
  { id: 'house_bottom_left',      type: 'wall',      x: 0,    y: 804, w: 650, h: 32 },
  { id: 'house_bottom_right',     type: 'wall',      x: 1065, y: 804, w: 607, h: 32 },

  // ── Master bedroom shell and entry ──
  { id: 'master_wall_top',        type: 'wall',      x: 33,   y: 24,  w: 449, h: 20 },
  { id: 'master_wall_left',       type: 'wall',      x: 33,   y: 24,  w: 23,  h: 270 },
  { id: 'master_wall_right_upper', type: 'wall',     x: 462,  y: 24,  w: 23,  h: 86 },
  { id: 'master_wall_right_lower', type: 'wall',     x: 462,  y: 215, w: 23,  h: 79 },
  { id: 'master_entry_wall_top',  type: 'wall',      x: 475,  y: 90,  w: 95,  h: 18 },
  { id: 'master_entry_wall_right',type: 'wall',      x: 550,  y: 90,  w: 20,  h: 205 },
  { id: 'master_kitchen_wall',    type: 'wall',      x: 0,    y: 285, w: 500, h: 28 },
  { id: 'master_bed',             type: 'furniture', x: 120,  y: 100, w: 165, h: 160 },
  { id: 'master_dresser',         type: 'furniture', x: 333,  y: 70,  w: 60,  h: 80 },
  { id: 'master_wardrobe',        type: 'furniture', x: 392,  y: 55,  w: 68,  h: 105 },

  // ── Bunker room shell and equipment ──
  { id: 'bunker_wall_top',         type: 'wall',      x: 568,  y: 0,   w: 520, h: 29 },
  { id: 'bunker_wall_left',        type: 'wall',      x: 568,  y: 0,   w: 23,  h: 208 },
  { id: 'bunker_wall_right',       type: 'wall',      x: 1064, y: 0,   w: 25,  h: 208 },
  { id: 'bunker_wall_bottom_left', type: 'wall',      x: 568,  y: 205, w: 175, h: 61 },
  { id: 'bunker_wall_bottom_right',type: 'wall',      x: 875,  y: 205, w: 214, h: 61 },
  { id: 'bunker_shelves',          type: 'furniture', x: 590,  y: 28,  w: 108, h: 180 },
  { id: 'bunker_vault',            type: 'furniture', x: 660,  y: 48,  w: 180, h: 122 },
  { id: 'bunker_equipment_east',   type: 'furniture', x: 1005, y: 35,  w: 60,  h: 100 },
  { id: 'bunker_generator',        type: 'furniture', x: 930,  y: 90,  w: 115, h: 125 },

  // ── Child bedroom shell and entry ──
  { id: 'child_wall_top',          type: 'wall',      x: 1160, y: 24,  w: 480, h: 20 },
  { id: 'child_wall_left_upper',   type: 'wall',      x: 1155, y: 24,  w: 25,  h: 92 },
  { id: 'child_wall_left_lower',   type: 'wall',      x: 1155, y: 220, w: 25,  h: 94 },
  { id: 'child_entry_wall_top',    type: 'wall',      x: 1090, y: 90,  w: 90,  h: 18 },
  { id: 'child_wall_bottom',       type: 'wall',      x: 1260, y: 295, w: 385, h: 25 },
  { id: 'child_wall_right',        type: 'wall',      x: 1620, y: 24,  w: 35,  h: 300 },
  { id: 'child_wardrobe',          type: 'furniture', x: 1210, y: 70,  w: 90,  h: 105 },
  { id: 'child_bookshelf',         type: 'furniture', x: 1300, y: 85,  w: 65,  h: 90 },
  { id: 'child_desk',              type: 'furniture', x: 1365, y: 85,  w: 105, h: 75 },
  { id: 'child_bed',               type: 'furniture', x: 1495, y: 105, w: 105, h: 175 },

  // ── Kitchen / dining and bathroom ──
  { id: 'kitchen_wall_east',       type: 'wall',      x: 500,  y: 292, w: 24,  h: 145 },
  { id: 'kitchen_counter_north',   type: 'furniture', x: 35,   y: 315, w: 275, h: 95 },
  { id: 'kitchen_counter_left',    type: 'furniture', x: 28,   y: 315, w: 72,  h: 245 },
  { id: 'kitchen_fridge',          type: 'furniture', x: 318,  y: 315, w: 78,  h: 115 },
  { id: 'kitchen_pantry',          type: 'furniture', x: 442,  y: 315, w: 52,  h: 110 },
  { id: 'kitchen_island',          type: 'furniture', x: 165,  y: 450, w: 200, h: 80 },
  { id: 'dining_table',            type: 'furniture', x: 115,  y: 610, w: 190, h: 110 },
  { id: 'bath_wall_left',          type: 'wall',      x: 325,  y: 545, w: 20,  h: 270 },
  { id: 'bath_wall_right',         type: 'wall',      x: 495,  y: 545, w: 20,  h: 270 },
  { id: 'bath_wall_top_left',      type: 'wall',      x: 325,  y: 545, w: 70,  h: 20 },
  // The broad opening on the east side is the practical bathroom doorway and
  // also keeps the living-room route from pinching against the sofa.
  { id: 'bath_wall_top_right',     type: 'wall',      x: 500,  y: 545, w: 15,  h: 20 },
  { id: 'bath_wall_bottom',        type: 'wall',      x: 325,  y: 790, w: 190, h: 25 },

  // ── Living room ──
  // The south sofa rectangle owns the lower corner; ending this box above it
  // leaves a small floor lane instead of trapping the kitchen side of the map.
  { id: 'living_sofa_west',        type: 'furniture', x: 395,  y: 330, w: 65,  h: 160 },
  { id: 'living_sofa_south',      type: 'furniture', x: 440,  y: 510, w: 325, h: 62 },
  { id: 'living_coffee_table',    type: 'furniture', x: 700,  y: 395, w: 110, h: 100 },
  { id: 'living_media_unit',     type: 'furniture', x: 1030, y: 315, w: 65,  h: 270 },

  // ── Office / studio ──
  { id: 'office_wall_west_upper',  type: 'wall',      x: 1165, y: 300, w: 30,  h: 55 },
  { id: 'office_wall_west_lower',  type: 'wall',      x: 1165, y: 380, w: 30,  h: 430 },
  { id: 'office_wall_north',       type: 'wall',      x: 1280, y: 375, w: 365, h: 28 },
  { id: 'office_shelves_north',    type: 'furniture', x: 1365, y: 405, w: 190, h: 95 },
  { id: 'office_storage_east',     type: 'furniture', x: 1585, y: 410, w: 55,  h: 395 },
  { id: 'office_desk_main',        type: 'furniture', x: 1325, y: 510, w: 125, h: 190 },
  { id: 'office_desk_return',      type: 'furniture', x: 1440, y: 530, w: 140, h: 120 },

  // ── Entrance foyer ──
  { id: 'foyer_wall_left',         type: 'wall',      x: 630,  y: 410, w: 25,  h: 505 },
  { id: 'foyer_wall_right',        type: 'wall',      x: 1040, y: 410, w: 25,  h: 505 },
  { id: 'foyer_wall_top_left',     type: 'wall',      x: 630,  y: 410, w: 150, h: 27 },
  { id: 'foyer_wall_top_right',    type: 'wall',      x: 900,  y: 410, w: 165, h: 27 },
  { id: 'foyer_bottom_wall',       type: 'wall',      x: 650,  y: 912, w: 400, h: 29 },
  { id: 'foyer_console',           type: 'furniture', x: 660,  y: 735, w: 115, h: 75 },
  { id: 'foyer_coat_plant',        type: 'furniture', x: 885,  y: 720, w: 155, h: 90 },
]);

const PROLOGUE_ROOMS = Object.freeze([
  {
    id: 'foyer',
    name: 'TERAS DEPAN & PINTU UTAMA',
    adjacent: ['living'],
    rects: [
      { x: 630, y: 690, w: 425, h: 230 }
    ]
  },
  {
    id: 'living',
    name: 'RUANG KELUARGA & TV',
    adjacent: ['foyer', 'bunker', 'master', 'child', 'kitchen', 'office'],
    rects: [
      { x: 490, y: 265, w: 685, h: 480 },
      { x: 1055, y: 410, w: 120, h: 400 },
      { x: 740, y: 390, w: 200, h: 40 }
    ]
  },
  {
    id: 'bunker',
    name: 'RUANG PALKA BUNKER 72 (DARURAT)',
    adjacent: ['living'],
    rects: [
      { x: 568, y: 15, w: 520, h: 255 }
    ]
  },
  {
    id: 'master',
    name: 'KAMAR TIDUR UTAMA',
    adjacent: ['living'],
    rects: [
      { x: 28, y: 18, w: 450, h: 275 },
      { x: 465, y: 95, w: 95, h: 125 }
    ]
  },
  {
    id: 'child',
    name: 'KAMAR TIDUR ANAK',
    adjacent: ['living'],
    rects: [
      { x: 1165, y: 18, w: 480, h: 290 },
      { x: 1090, y: 95, w: 90, h: 125 }
    ]
  },
  {
    id: 'kitchen',
    name: 'DAPUR & RUANG MAKAN',
    adjacent: ['living', 'bath'],
    rects: [
      { x: 25, y: 290, w: 310, h: 520 },
      { x: 335, y: 290, w: 185, h: 260 },
      { x: 495, y: 430, w: 35, h: 290 }
    ]
  },
  {
    id: 'bath',
    name: 'KAMAR MANDI & GUDANG OBAT',
    adjacent: ['kitchen'],
    rects: [
      { x: 335, y: 550, w: 170, h: 250 }
    ]
  },
  {
    id: 'office',
    name: 'RUANG KERJA / STUDIO',
    adjacent: ['living'],
    rects: [
      { x: 1170, y: 300, w: 475, h: 515 }
    ]
  }
]);

const PROLOGUE_DOORWAYS = Object.freeze([
  {
    id: 'd_foyer_living',
    rooms: ['foyer', 'living'],
    x: 840,
    y: 690,
    radius: 125,
    rect: { x: 775, y: 660, w: 130, h: 60 }
  },
  {
    id: 'd_living_bunker',
    rooms: ['living', 'bunker'],
    x: 810,
    y: 235,
    radius: 125,
    rect: { x: 740, y: 205, w: 140, h: 65 }
  },
  {
    id: 'd_living_master',
    rooms: ['living', 'master'],
    x: 505,
    y: 160,
    radius: 115,
    rect: { x: 460, y: 100, w: 100, h: 120 }
  },
  {
    id: 'd_living_child',
    rooms: ['living', 'child'],
    x: 1135,
    y: 165,
    radius: 115,
    rect: { x: 1080, y: 100, w: 100, h: 120 }
  },
  {
    id: 'd_living_kitchen',
    rooms: ['living', 'kitchen'],
    x: 510,
    y: 530,
    radius: 135,
    rect: { x: 480, y: 430, w: 60, h: 220 }
  },
  {
    id: 'd_kitchen_bath',
    rooms: ['kitchen', 'bath'],
    x: 440,
    y: 555,
    radius: 90,
    rect: { x: 395, y: 535, w: 90, h: 40 }
  },
  {
    id: 'd_living_office',
    rooms: ['living', 'office'],
    x: 1170,
    y: 365,
    radius: 105,
    rect: { x: 1145, y: 340, w: 55, h: 55 }
  }
]);

const FOG_DARKNESS = Object.freeze({
  CURRENT: 0.08,             // 100% or near 100% visible (0.05-0.15)
  ADJACENT_DISCOVERED: 0.46, // ~50% visible (0.40-0.50)
  ADJACENT_UNDISCOVERED: 0.56,
  DISTANT_DISCOVERED: 0.66,  // readable silhouette (0.55-0.70)
  DISTANT_UNDISCOVERED: 0.82,// very dark silhouette (0.75-0.88), never pure black
  BASE_OUTER: 0.85
});

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
    this.baseColliders = null;

    // Solid obstacle colliders are cloned so expedition hazards can safely add
    // temporary blockers without mutating the reusable house layout.
    this.colliders = PROLOGUE_COLLIDERS.map((collider) => ({ ...collider }));

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

    // Debug mode (Press F2 in-game to see colliders and fog zones)
    this.debugColliders = false;

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
    this._captureBaseRunState();
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
    if (Array.isArray(config.colliders)) this.colliders = config.colliders.map((collider) => ({ ...collider }));
    if (Array.isArray(config.items)) this.items = config.items.map((item, index) => ({ ...item, uid: item.uid || `${item.id}-${index}`, collected: false, revealed: false }));
    if (config.bunkerHatch) this.bunkerHatch = { ...this.bunkerHatch, ...config.bunkerHatch };
    if (config.spawnPosition) Object.assign(this.player, config.spawnPosition);
    if (Number.isFinite(config.playerSpeed)) this.player.speed = config.playerSpeed;
    if (config.mapSrc) this.mapImage.src = config.mapSrc;
  }

  _captureBaseRunState() {
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
    this.baseColliders = this.colliders.map((collider) => ({ ...collider }));
  }

  _cloneBaseItems() {
    return (this.baseItems || []).map((item) => ({ ...item, collected: false, revealed: false }));
  }

  _resetRunState() {
    this.backpack = [];
    this.selectedInventoryIndex = 0;
    this.emptyHatchConfirmUntil = null;
    this.items = this._cloneBaseItems();
    this.colliders = (this.baseColliders || this.colliders).map((collider) => ({ ...collider }));
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

    this.camera.x = Math.max(0, Math.min(this.MAP_W - this.VIEW_W, this.player.x - this.VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(this.MAP_H - this.VIEW_H, this.player.y - this.VIEW_H / 2));
    this._initFogOfWar();
  }

  _bindEvents() {
    if (this._eventsBound) return;
    this._handleKeyDown = (e) => {
      if (!this.isActive) return;
      const k = e.key.toLowerCase();
      const oneShotKey = [' ', 'e', 'q'].includes(k);
      if (e.repeat && oneShotKey) return;
      this.keys[k] = true;
      if (k === 'f2') {
        this.debugColliders = !this.debugColliders;
      }
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
      const k = e.key.toLowerCase();
      this.keys[k] = false;
    };

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    this._eventsBound = true;
  }

  start() {
    this._bindEvents();
    this.isActive = true;
    this._resetRunState();
    this.lastTime = performance.now();
    this._createDOM();
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
    this.wrapper.appendChild(this.desktopHints);
    this.wrapper.appendChild(this.touchControls);
    this.container.appendChild(this.wrapper);

    this._setupTouchEvents();
    this._updateHUD();
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

  _initFogOfWar() {
    if (this.mode !== 'prologue') return;
    this.discoveredRooms = new Set();
    this.currentRoomId = this._getCurrentVisibilityRoom();
    this.discoveredRooms.add('foyer');
    if (this.currentRoomId) this.discoveredRooms.add(this.currentRoomId);
    this.roomVisibilityStates = {};
    PROLOGUE_ROOMS.forEach((r) => {
      this.roomVisibilityStates[r.id] = (r.id === this.currentRoomId) ? FOG_DARKNESS.CURRENT : FOG_DARKNESS.DISTANT_UNDISCOVERED;
    });

    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas');
      this.fogCanvas.width = this.VIEW_W;
      this.fogCanvas.height = this.VIEW_H;
      this.fogCtx = this.fogCanvas.getContext('2d');
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
    const detectionOrder = ['bunker', 'master', 'child', 'bath', 'kitchen', 'office', 'foyer', 'living'];
    for (const roomId of detectionOrder) {
      const room = PROLOGUE_ROOMS.find((candidate) => candidate.id === roomId);
      if (room?.rects.some((rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h)) {
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
    const room = PROLOGUE_ROOMS.find((r) => r.id === roomId);
    return room ? room.name : 'KORIDOR RUMAH';
  }

  _updateRoomVisibility(dt) {
    if (this.mode !== 'prologue') return;

    if (this.revealAllRooms) {
      PROLOGUE_ROOMS.forEach((r) => {
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

    const currentRoom = PROLOGUE_ROOMS.find((r) => r.id === this.currentRoomId);
    const adjacentRoomIds = currentRoom ? currentRoom.adjacent : [];

    // Calculate doorway peeking proximity
    const doorwayPeeks = {};
    PROLOGUE_DOORWAYS.forEach((d) => {
      if (!d.rooms.includes(this.currentRoomId)) return;
      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
      if (dist < d.radius) {
        const peek = 1 - (dist / d.radius); // 0.0 to 1.0
        const otherId = d.rooms[0] === this.currentRoomId ? d.rooms[1] : d.rooms[0];
        doorwayPeeks[otherId] = Math.max(doorwayPeeks[otherId] || 0, peek);
      }
    });

    // Determine target darkness for each room
    PROLOGUE_ROOMS.forEach((room) => {
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
    const fogRoomOrder = ['living', 'foyer', 'office', 'kitchen', 'bath', 'child', 'master', 'bunker'];
    fogRoomOrder.forEach((roomId) => {
      const room = PROLOGUE_ROOMS.find((candidate) => candidate.id === roomId);
      if (!room) return;
      const alpha = this.roomVisibilityStates[room.id] ?? baseDarkness;
      fctx.save();
      fctx.beginPath();
      room.rects.forEach((r) => fctx.rect(r.x, r.y, r.w, r.h));
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

    // 4. Stamp the rendered fog buffer over the world canvas in screen coordinates
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.fogCanvas, 0, 0);
    ctx.restore();
  }

  _renderFogDebug(ctx) {
    if (this.mode !== 'prologue') return;
    ctx.save();

    // Room zones and status; this debug layer deliberately shows room state,
    // not a misleading player-centered flashlight radius.
    const currentRoomId = this.currentRoomId || this._getCurrentVisibilityRoom();
    PROLOGUE_ROOMS.forEach((room) => {
      const isCurrent = room.id === currentRoomId;
      const isDiscovered = this.discoveredRooms.has(room.id);
      const alpha = (this.roomVisibilityStates[room.id] ?? 0.82).toFixed(2);

      room.rects.forEach((rect, idx) => {
        ctx.strokeStyle = isCurrent ? '#00ff88' : (isDiscovered ? '#38bdf8' : '#64748b');
        ctx.lineWidth = isCurrent ? 2 : 1;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        if (idx === 0) {
          ctx.fillStyle = isCurrent
            ? 'rgba(0, 255, 136, 0.12)'
            : (isDiscovered ? 'rgba(56, 189, 248, 0.05)' : 'rgba(100, 116, 139, 0.04)');
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = isCurrent ? '#00ff88' : (isDiscovered ? '#38bdf8' : '#94a3b8');
          const statusTag = isCurrent ? '[CURRENT]' : (isDiscovered ? '[DISCOVERED]' : '[UNDISCOVERED]');
          ctx.fillText(`${room.name} (${room.id}) ${statusTag} α:${alpha}`, rect.x + 8, rect.y + 16);
        }
      });
    });

    // Doorways
    PROLOGUE_DOORWAYS.forEach((d) => {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px monospace';
      ctx.fillText(`${d.id} (R:${d.radius})`, d.x - 30, d.y - 4);
    });

    ctx.restore();
  }

  _loop(timestamp) {
    if (!this.isActive) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.isPaused) {
      this._update(dt * (this.timeScale || 1.0));
    }
    this._render();

    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
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
        vx *= 0.7071;
        vy *= 0.7071;
      }

      const nextX = this.player.x + vx * this.player.speed * dt;
      const nextY = this.player.y + vy * this.player.speed * dt;

      // Map bounds & Wall collisions
      if (this._canMoveTo(nextX, this.player.y)) this.player.x = nextX;
      if (this._canMoveTo(this.player.x, nextY)) this.player.y = nextY;

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
        if (hazard.blocker) this.colliders.push({ ...hazard.blocker });
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
      if (
        x - pw / 2 < box.x + box.w &&
        x + pw / 2 > box.x &&
        y - ph / 2 < box.y + box.h &&
        y + ph / 2 > box.y
      ) {
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
    this._renderItems(ctx);

    // ── 4. DRAW FOG OF WAR / DYNAMIC ROOM VISIBILITY (PROLOGUE) ──
    if (this.mode === 'prologue') {
      this._renderFogOfWar(ctx);
    }

    // ── 5. DRAW PLAYER CHARACTER ──
    this._renderPlayer(ctx);

    // ── 6. DRAW PROXIMITY TOOLTIPS ──
    this._renderTooltips(ctx);

    // ── DEBUG COLLIDERS & FOG ZONES (F2) ──
    if (this.debugColliders) {
      this._renderDebugColliders(ctx);
      if (this.mode === 'prologue') {
        this._renderFogDebug(ctx);
      }
    }

    ctx.restore(); // Restore Camera World Coordinates

    if (this.mode === 'expedition') this._renderExpeditionAtmosphere(ctx);
    // ── 6. DRAW FIXED SCREEN HUD OVERLAYS (Minimap Radar & Notifications) ──
    this._renderScreenHUD(ctx);

    ctx.restore();
  }

  _renderDebugColliders(ctx) {
    ctx.save();

    // 1. Playable Map Bounds
    const pw = this.player.w;
    const ph = this.player.h;
    const bounds = this._getPlayableBounds();
    const minX = bounds.x + pw / 2;
    const maxX = bounds.x + bounds.w - pw / 2;
    const minY = bounds.y + ph / 2;
    const maxY = bounds.y + bounds.h - ph / 2;

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('[ MAP BOUNDS ]', minX + 10, minY + 18);

    // 2. Solid obstacle colliders. Walls and furniture use separate colors so
    // F2 can be used for quick visual tuning against the background.
    ctx.lineWidth = 1;
    this.colliders.forEach(c => {
      const isWall = c.type === 'wall' || c.id.includes('wall') || c.id.includes('outer');
      ctx.fillStyle = isWall ? 'rgba(255, 40, 40, 0.28)' : 'rgba(255, 166, 0, 0.28)';
      ctx.strokeStyle = isWall ? '#ff3333' : '#ffad33';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '9px monospace';
      ctx.fillText(c.id, c.x + 3, c.y + 11);
    });

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
      ctx.font = 'bold 10px monospace';
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
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${it.name} (R:70)`, it.x - 30, it.y - 22);
      }
    });

    // 5. Player Feet Collision Box & Coordinate Display
    ctx.fillStyle = 'rgba(0, 255, 136, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const pBoxX = this.player.x - this.player.w / 2;
    const pBoxY = this.player.y - this.player.h / 2;
    ctx.fillRect(pBoxX, pBoxY, this.player.w, this.player.h);
    ctx.strokeRect(pBoxX, pBoxY, this.player.w, this.player.h);

    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`P: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, this.player.x - 35, this.player.y - 14);

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
      ctx.fillStyle = collider.id.includes('rubble') || collider.id.includes('cable') ? 'rgba(104, 78, 67, 0.92)' : 'rgba(7, 12, 17, 0.78)';
      ctx.fillRect(collider.x, collider.y, collider.w, collider.h);
      ctx.strokeStyle = collider.id.includes('cable') ? '#e36a5d' : 'rgba(168, 183, 191, 0.6)';
      ctx.strokeRect(collider.x, collider.y, collider.w, collider.h);
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
    const currentRoom = PROLOGUE_ROOMS.find((room) => room.id === this.currentRoomId);
    if (roomId === this.currentRoomId) return 1;
    if (currentRoom?.adjacent.includes(roomId)) return 0.72;
    if (this.discoveredRooms.has(roomId) || item.revealed) return 0.32;
    return 0;
  }

  _renderItems(ctx) {
    const nearbyItem = this._getNearestInteractableItem();
    this.items.forEach((it) => {
      if (it.collected) return;

      const itemAlpha = this._getItemFogAlpha(it);
      if (itemAlpha <= 0) return;
      const dist = this._getDist(this.player, it);
      const isNear = nearbyItem?.uid === it.uid;
      const isCurrentRoom = this.mode !== 'prologue' || this._getItemRoomId(it) === this.currentRoomId;

      ctx.save();
      ctx.globalAlpha = itemAlpha;
      if (isNear) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 18;
      }

      const img = this.itemImages[it.type || it.id];
      if (img && img.complete) {
        ctx.drawImage(img, it.x - 18, it.y - 18, 36, 36);
      } else {
        // Fallback marker
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(it.x - 14, it.y - 14, 28, 28);
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
      { id: 'mb',   name: 'KAMAR TIDUR UTAMA',             color: '#1b2230', border: '#3b82f6', x: 45,   y: 60,  w: 440, h: 250 },
      { id: 'kb',   name: 'KAMAR TIDUR ANAK',              color: '#182836', border: '#38bdf8', x: 1180, y: 60,  w: 435, h: 255 },
      { id: 'bv',   name: 'RUANG PALKA BUNKER 72 (VAULT)', color: '#241a20', border: '#ef4444', x: 570,  y: 40,  w: 520, h: 255 },
      { id: 'kit',  name: 'DAPUR & RUANG MAKAN',           color: '#212938', border: '#10b981', x: 45,   y: 310, w: 465, h: 540 },
      { id: 'lr',   name: 'RUANG KELUARGA & TV',           color: '#1e2633', border: '#f59e0b', x: 520,  y: 295, w: 660, h: 430 },
      { id: 'bath', name: 'KAMAR MANDI & GUDANG OBAT',     color: '#15222b', border: '#06b6d4', x: 325,  y: 575, w: 190, h: 290 },
      { id: 'st',   name: 'RUANG KERJA / STUDIO',          color: '#25201c', border: '#f97316', x: 1185, y: 335, w: 430, h: 515 },
      { id: 'hall', name: 'TERAS DEPAN & PINTU UTAMA',     color: '#1c222c', border: '#ffd166', x: 640,  y: 735, w: 420, h: 180 }
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

    // ── D. DRAW ALL SOLID WALL COLLIDERS ──
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    this.colliders.forEach(c => {
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);

      // Furniture labels make the procedural fallback useful for tuning too.
      if (c.type === 'furniture') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(c.x, c.y, c.w, c.h);

        ctx.font = 'bold 9px "Share Tech Mono", monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        const label = c.id.replace(/_/g, ' ').toUpperCase();
        ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 3);
        ctx.fillStyle = '#0a0d14';
      }
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
    this._eventsBound = false;

    if (this.wrapper && this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }

    this.fogCanvas = null;
    this.fogCtx = null;
    this.discoveredRooms?.clear();
    this.roomVisibilityStates = {};
  }

  // ─── DEVELOPER CONSOLE & DEBUG HOOKS ────────────────────────────────────

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
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

  setDebugColliders(enabled) {
    this.debugColliders = Boolean(enabled);
  }

  setFogDisabled(disabled) {
    this.fogDisabled = Boolean(disabled);
  }

  revealEntireMap() {
    this.revealAllRooms = true;
    PROLOGUE_ROOMS.forEach((r) => {
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
    this.camera.x = Math.max(0, Math.min(this.MAP_W - this.VIEW_W, this.player.x - this.VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(this.MAP_H - this.VIEW_H, this.player.y - this.VIEW_H / 2));
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
