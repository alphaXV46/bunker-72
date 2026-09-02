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

    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isActive = false;

    // Viewport and World Map Dimensions
    this.VIEW_W = 960;
    this.VIEW_H = 540;
    this.MAP_W = 1376;
    this.MAP_H = 768;

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

    // Player State (Starts at Main Entrance / Teras Depan)
    this.player = {
      x: 840,
      y: 650,
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

    // Solid Obstacle Colliders (Pixel-aligned architectural walls & furniture)
    this.colliders = [
      // 1. Outer House Boundary
      { id: 'outer_top',         x: 100,  y: 40,   w: 1170, h: 20 },
      { id: 'outer_left',        x: 100,  y: 40,   w: 20,   h: 680 },
      { id: 'outer_right',       x: 1250, y: 40,   w: 20,   h: 680 },
      { id: 'outer_bot_l',       x: 100,  y: 700,  w: 680,  h: 20 },
      { id: 'outer_bot_r',       x: 900,  y: 700,  w: 370,  h: 20 },
      // Main Entrance door gap at x: 780..900, y: 700

      // 2. Master Bedroom (Top-Left: x 120..510, y 60..320)
      { id: 'mb_wall_r_top',     x: 510,  y: 60,   w: 18,   h: 90 },
      { id: 'mb_wall_r_bot',     x: 510,  y: 250,  w: 18,   h: 70 },  // Pintu at y: 150..250
      { id: 'mb_wall_b',         x: 120,  y: 320,  w: 408,  h: 18 },
      { id: 'mb_bed',            x: 230,  y: 80,   w: 140,  h: 130 },
      { id: 'mb_wardrobe',       x: 130,  y: 80,   w: 70,   h: 110 },

      // 3. Kid's Bedroom (Top-Right: x 920..1250, y 60..320)
      { id: 'kb_wall_l_top',     x: 920,  y: 60,   w: 18,   h: 90 },
      { id: 'kb_wall_l_bot',     x: 920,  y: 250,  w: 18,   h: 70 },  // Pintu at y: 150..250
      { id: 'kb_wall_b',         x: 920,  y: 320,  w: 330,  h: 18 },
      { id: 'kb_bunk_bed',       x: 960,  y: 80,   w: 120,  h: 110 },
      { id: 'kb_desk',           x: 1160, y: 210,  w: 80,   h: 70 },

      // 4. RUANG PALKA BUNKER DARURAT (Top-Center / Ujung Rumah: x 528..920, y 60..320)
      { id: 'bv_wall_b_l',       x: 510,  y: 320,  w: 140,  h: 18 },
      { id: 'bv_wall_b_r',       x: 780,  y: 320,  w: 140,  h: 18 }, // Pintu Segel Bunker at 650..780
      { id: 'bv_gen_l',          x: 540,  y: 80,   w: 80,   h: 70 },
      { id: 'bv_gen_r',          x: 810,  y: 80,   w: 80,   h: 70 },

      // 5. Kitchen & Dining (Center-Left: x 120..510, y 338..580)
      { id: 'k_wall_r_top',      x: 510,  y: 338,  w: 18,   h: 40 },
      { id: 'k_wall_r_bot',      x: 510,  y: 470,  w: 18,   h: 110 }, // Pintu Dapur at 378..470
      { id: 'k_wall_b_l',        x: 120,  y: 580,  w: 240,  h: 18 },
      { id: 'k_wall_b_r',        x: 460,  y: 580,  w: 50,   h: 18 },  // Pintu Kamar Mandi at 360..460
      { id: 'k_counter',         x: 130,  y: 345,  w: 210,  h: 55 },
      { id: 'k_fridge',          x: 350,  y: 345,  w: 60,   h: 65 },
      { id: 'k_island',          x: 210,  y: 450,  w: 120,  h: 55 },
      { id: 'k_dining',          x: 400,  y: 450,  w: 75,   h: 80 },

      // 6. Bathroom (Bottom-Left: x 120..510, y 598..700)
      { id: 'bath_shower',       x: 130,  y: 610,  w: 80,   h: 70 },
      { id: 'bath_sink',         x: 250,  y: 610,  w: 70,   h: 35 },

      // 7. Study / Office (Bottom-Right: x 920..1250, y 460..700)
      { id: 'st_wall_l_top',     x: 920,  y: 460,  w: 18,   h: 60 },
      { id: 'st_wall_l_bot',     x: 920,  y: 620,  w: 18,   h: 80 },  // Pintu Studio at 520..620
      { id: 'st_wall_t',         x: 920,  y: 460,  w: 330,  h: 18 },
      { id: 'st_shelves',        x: 960,  y: 485,  w: 220,  h: 50 },
      { id: 'st_desk',           x: 1160, y: 610,  w: 80,   h: 70 },

      // 8. Living Room & TV (Center: x 528..920, y 338..580)
      { id: 'lr_tv',             x: 540,  y: 345,  w: 90,   h: 35 },
      { id: 'lr_sofa_left',      x: 600,  y: 420,  w: 40,   h: 100 },
      { id: 'lr_sofa_bot',       x: 600,  y: 490,  w: 130,  h: 30 },
      { id: 'lr_table',          x: 670,  y: 425,  w: 50,   h: 30 }
    ];

    // Backpack & Items across the large modern house
    this.maxCapacity = 5;
    this.backpack = []; // Array of item keys
    this.items = [
      { id: 'food',  name: 'Makanan Kaleng', x: 260,  y: 430, w: 36, h: 36, collected: false, room: 'Dapur' },
      { id: 'drink', name: 'Air Bersih',     x: 360,  y: 510, w: 36, h: 36, collected: false, room: 'Dapur' },
      { id: 'kit',   name: 'Kotak P3K',       x: 270,  y: 660, w: 36, h: 36, collected: false, room: 'Kamar Mandi' },
      { id: 'radio', name: 'Radio Portable', x: 1080, y: 640, w: 36, h: 36, collected: false, room: 'Ruang Kerja' },
      { id: 'snack', name: 'Snack Darurat',   x: 800,  y: 450, w: 36, h: 36, collected: false, room: 'Ruang Keluarga' },
      { id: 'toy',   name: 'Mainan Anak',     x: 1080, y: 230, w: 36, h: 36, collected: false, room: 'Kamar Anak' }
    ];

    // Bunker Hatch Zone (Inside the Dedicated Top Bunker Vault Room at Far End)
    this.bunkerHatch = {
      x: 665,
      y: 135,
      w: 100,
      h: 90,
      label: 'PALKA BUNKER 72'
    };

    // Emergency Timer & Tremor
    this.duration = 40; // 40 seconds
    this.timeLeft = this.duration;
    this.timerEnabled = true;
    this.lastTime = 0;
    this.screenShake = 0;
    this.notificationText = '';
    this.notificationTimer = 0;

    // Debug mode (Press F2 in-game to see colliders)
    this.debugColliders = false;

    // Controls
    this.keys = {};
    this._bindEvents();
    this._applyConfig(config);
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
    if (Array.isArray(config.colliders)) this.colliders = config.colliders.map((collider) => ({ ...collider }));
    if (Array.isArray(config.items)) this.items = config.items.map((item, index) => ({ ...item, uid: `${item.id}-${index}`, collected: false }));
    if (config.spawnPosition) Object.assign(this.player, config.spawnPosition);
    if (Number.isFinite(config.playerSpeed)) this.player.speed = config.playerSpeed;
    if (config.mapSrc) this.mapImage.src = config.mapSrc;
  }

  _bindEvents() {
    this._handleKeyDown = (e) => {
      if (!this.isActive) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'f2') {
        this.debugColliders = !this.debugColliders;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'e'].includes(k)) {
        e.preventDefault();
      }
      if (k === ' ' || k === 'e') {
        this._handleInteract();
      }
    };

    this._handleKeyUp = (e) => {
      if (!this.isActive) return;
      const k = e.key.toLowerCase();
      this.keys[k] = false;
    };

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
  }

  start() {
    this.isActive = true;
    this.backpack = [];
    this.timeLeft = this.duration;
    this.elapsedSeconds = 0;
    this.aftershockTriggered = false;
    this.hazardNoticeIds.clear();
    this.lastTime = performance.now();

    // Initial camera position centered on player
    this.camera.x = Math.max(0, Math.min(this.MAP_W - this.VIEW_W, this.player.x - this.VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(this.MAP_H - this.VIEW_H, this.player.y - this.VIEW_H / 2));

    this._createDOM();
    this.animId = requestAnimationFrame((t) => this._loop(t));

    // Audio cue
    retroAudio.playSiren?.();
  }

  _createDOM() {
    // Canvas Container Wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'scavenger-game-wrapper';
    this.wrapper.className = 'scavenger-game-wrapper';

    // HUD Header
    this.hudHeader = document.createElement('div');
    this.hudHeader.className = 'scavenger-hud-header';
    this.hudHeader.innerHTML = `
      <div class="scavenger-timer-badge${this.timerEnabled ? '' : ' no-timer'}" id="scavenger-timer">
        <span class="timer-icon">${this.timerEnabled ? '⚠' : '◷'}</span> ${this.timerEnabled ? 'EVAKUASI:' : 'EKSPEDISI:'} <strong id="timer-val">${this.timerEnabled ? '00:40' : 'TANPA BATAS WAKTU'}</strong>
      </div>
      <div class="scavenger-room-badge" id="scavenger-room" style="background: rgba(14, 18, 26, 0.92); border: 1px solid #5bc0be; color: #5bc0be; font-family: 'Share Tech Mono', monospace; padding: 6px 14px; font-size: clamp(0.85rem, 1.1vw, 1.1rem); letter-spacing: 1px; box-shadow: 0 4px 16px rgba(0,0,0,0.7);">
        📍 <span id="room-name-val">${this.config?.label || 'RUANG KELUARGA'}</span>
      </div>
      ${this.mode === 'expedition' ? `<div class="scavenger-expedition-objective">⌖ ${this.config?.objective || 'Kembali ke titik aman.'}</div>` : ''}
      <div class="scavenger-backpack-badge" id="scavenger-backpack">
        <span class="backpack-icon">🎒</span> RANSEL: <strong id="backpack-count">0 / ${this.maxCapacity}</strong>
      </div>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'scavenger-canvas';
    this.canvas.className = 'scavenger-canvas';
    this.canvas.width = this.VIEW_W;
    this.canvas.height = this.VIEW_H;
    this.ctx = this.canvas.getContext('2d');

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
        <button type="button" class="touch-action-btn" id="touch-interact-btn">AMBIL / MASUK [E]</button>
      </div>
    `;

    // Assemble
    this.wrapper.appendChild(this.hudHeader);
    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.touchControls);
    this.container.appendChild(this.wrapper);

    this._setupTouchEvents();
  }

  _setupTouchEvents() {
    const bindTouchBtn = (btn, key) => {
      const press = (e) => { e.preventDefault(); this.keys[key] = true; };
      const release = (e) => { e.preventDefault(); this.keys[key] = false; };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    };

    this.touchControls.querySelectorAll('.touch-btn').forEach(btn => {
      bindTouchBtn(btn, btn.dataset.key);
    });

    const actBtn = this.touchControls.querySelector('#touch-interact-btn');
    if (actBtn) {
      actBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleInteract();
      });
      actBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._handleInteract();
      }, { passive: false });
    }
  }

  _handleInteract() {
    // Check if near an item
    const nearbyItem = this.items.find(it => !it.collected && this._getDist(this.player, it) < 70);
    if (nearbyItem) {
      if (this.backpack.length >= this.maxCapacity) {
        this._showNotification(`Ransel penuh! Maksimal ${this.maxCapacity} barang.`);
        retroAudio.playBuzz?.();
        return;
      }

      nearbyItem.collected = true;
      this.backpack.push(nearbyItem.id);
      this._updateHUD();
      this._showNotification(`+ ${nearbyItem.name} dimasukkan ke ransel!`);
      retroAudio.playClick?.();
      return;
    }

    const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
    const nearbyExit = exits.find((exit) => {
      const center = { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 };
      return this._getDist(this.player, center) < 85;
    });
    if (nearbyExit) this._finishMinigame(nearbyExit.reason || 'entered_hatch');
  }

  _updateHUD() {
    const countEl = document.getElementById('backpack-count');
    if (countEl) {
      countEl.textContent = `${this.backpack.length} / ${this.maxCapacity}`;
    }
  }

  _showNotification(text) {
    this.notificationText = text;
    this.notificationTimer = 2.5; // seconds
  }

  _getDist(p1, p2) {
    const dx = (p1.x || p1.x === 0 ? p1.x : 0) - (p2.x || p2.x === 0 ? p2.x : 0);
    const dy = (p1.y || p1.y === 0 ? p1.y : 0) - (p2.y || p2.y === 0 ? p2.y : 0);
    return Math.hypot(dx, dy);
  }

  _getCurrentRoomName() {
    if (this.mode === 'expedition') {
      const zone = (this.config?.roomZones || []).find((room) =>
        this.player.x >= room.x && this.player.x <= room.x + room.w && this.player.y >= room.y && this.player.y <= room.y + room.h
      );
      return zone?.name || this.config?.label || 'RUTE EKSPEDISI';
    }
    const px = this.player.x;
    const py = this.player.y;

    if (px >= 760 && px <= 920 && py >= 580 && py <= 720) return 'TERAS DEPAN & PINTU UTAMA';
    if (px >= 510 && px <= 920 && py >= 40 && py <= 320) return 'RUANG PALKA BUNKER 72 (DARURAT)';
    if (px >= 100 && px <= 510 && py >= 40 && py <= 320) return 'KAMAR TIDUR UTAMA';
    if (px >= 920 && px <= 1260 && py >= 40 && py <= 320) return 'KAMAR TIDUR ANAK';
    if (px >= 100 && px <= 510 && py > 320 && py <= 580) return 'DAPUR & RUANG MAKAN';
    if (px >= 100 && px <= 510 && py > 580 && py <= 720) return 'KAMAR MANDI & GUDANG OBAT';
    if (px >= 920 && px <= 1260 && py > 320 && py <= 720) return 'RUANG KERJA / STUDIO';
    if (px > 510 && px < 920 && py > 320 && py < 600) return 'RUANG KELUARGA & TV';

    return 'KORIDOR TENGAH RUMAH';
  }

  _loop(timestamp) {
    if (!this.isActive) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this._update(dt);
    this._render();

    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.elapsedSeconds += dt;
    if (this.timerEnabled) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this._finishMinigame('time_out');
        return;
      }
    }

    // Update Timer HUD
    const timerEl = document.getElementById('timer-val');
    if (timerEl && this.timerEnabled) {
      const s = Math.ceil(this.timeLeft);
      timerEl.textContent = `00:${s < 10 ? '0' : ''}${s}`;
      if (s <= 10) {
        timerEl.parentElement.classList.add('urgent-flash');
      }
    }

    // Update Room Badge HUD
    const roomEl = document.getElementById('room-name-val');
    if (roomEl) {
      roomEl.textContent = this._getCurrentRoomName();
    }

    // Notification Timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
    }

    // Tremor intensity
    const elapsedRatio = this.timerEnabled && this.duration > 0 ? 1 - (this.timeLeft / this.duration) : 0;
    if (Math.random() < 0.15 + elapsedRatio * 0.25) {
      this.screenShake = (1.2 + elapsedRatio * 4.5) * (Math.random() - 0.5);
    } else {
      this.screenShake *= 0.88;
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

  _canMoveTo(x, y) {
    const pw = this.player.w; // 24
    const ph = this.player.h; // 16
    const px = x;
    const py = y;

    // Check collision against all registered solid obstacle bounding boxes
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (
        px - pw / 2 < box.x + box.w &&
        px + pw / 2 > box.x &&
        py - ph / 2 < box.y + box.h &&
        py + ph / 2 > box.y
      ) {
        return false; // Solid collision! Movement blocked.
      }
    }

    return true; // Walkable area
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
      // ── 1. DRAW PROCEDURAL SCHEMATIC HOUSE BLUEPRINT ──
      this._renderHouseLayout(ctx);
      // ── 2. DRAW BUNKER ENTRANCE HATCH PULSING BEACON ──
      this._renderBunkerHatch(ctx);
    }

    // ── 3. DRAW COLLECTIBLE ITEMS ──
    this._renderItems(ctx);

    // ── 4. DRAW PLAYER CHARACTER ──
    this._renderPlayer(ctx);

    // ── 5. DRAW PROXIMITY TOOLTIPS ──
    this._renderTooltips(ctx);

    // ── DEBUG COLLIDERS (F2) ──
    if (this.debugColliders) {
      this._renderDebugColliders(ctx);
    }

    ctx.restore(); // Restore Camera World Coordinates

    if (this.mode === 'expedition') this._renderExpeditionAtmosphere(ctx);
    // ── 6. DRAW FIXED SCREEN HUD OVERLAYS (Minimap Radar & Notifications) ──
    this._renderScreenHUD(ctx);

    ctx.restore();
  }

  _renderDebugColliders(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 1;
    this.colliders.forEach(c => {
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    });
    // Draw player feet collision box
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.strokeStyle = '#00ff88';
    ctx.fillRect(this.player.x - this.player.w / 2, this.player.y - this.player.h / 2, this.player.w, this.player.h);
    ctx.strokeRect(this.player.x - this.player.w / 2, this.player.y - this.player.h / 2, this.player.w, this.player.h);
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

  _renderItems(ctx) {
    this.items.forEach(it => {
      if (it.collected) return;

      const dist = this._getDist(this.player, it);
      const isNear = dist < 70;

      ctx.save();
      if (isNear) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 18;
      }

      const img = this.itemImages[it.id];
      if (img && img.complete) {
        ctx.drawImage(img, it.x - 18, it.y - 18, 36, 36);
      } else {
        // Fallback marker
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(it.x - 14, it.y - 14, 28, 28);
      }

      // Sparkle / Pulsing Ring
      ctx.strokeStyle = isNear ? '#ffd166' : 'rgba(255, 209, 102, 0.6)';
      ctx.lineWidth = isNear ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 22 + 3 * Math.sin(Date.now() * 0.006 + it.x), 0, Math.PI * 2);
      ctx.stroke();

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
    // Proximity item tooltip
    const nearbyItem = this.items.find(it => !it.collected && this._getDist(this.player, it) < 70);
    if (nearbyItem) {
      this._drawBadge(ctx, nearbyItem.x, nearbyItem.y - 32, `[ SPASI / KLIK: AMBIL ${nearbyItem.name.toUpperCase()} ]`, '#ffd166');
    }

    const exits = this.exits?.length ? this.exits : [this.bunkerHatch];
    const nearbyExit = exits.find((exit) => this._getDist(this.player, { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 }) < 85);
    if (nearbyExit) {
      const exitCenter = { x: nearbyExit.x + nearbyExit.w / 2, y: nearbyExit.y + nearbyExit.h / 2 };
      const msg = this.backpack.length > 0
        ? `[ SPASI / KLIK: KEMBALI DENGAN ${this.backpack.length} BARANG ]`
        : '[ SPASI / KLIK: KEMBALI KE TITIK AMAN ]';
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
    const mw = 140;
    const mh = 78;
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
      ctx.fillRect(mx + exit.x * sx, my + exit.y * sy, 7, 5);
    });

    // Items (Yellow dots)
    this.items.forEach(it => {
      if (!it.collected) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(mx + it.x * sx, my + it.y * sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

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
    // ── A. TACTICAL BLUEPRINT GRID BASE ──
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
      { id: 'mb',   name: 'KAMAR TIDUR UTAMA',             color: '#1b2230', border: '#3b82f6', x: 120, y: 55,  w: 390, h: 265 },
      { id: 'kb',   name: 'KAMAR TIDUR ANAK',              color: '#182836', border: '#38bdf8', x: 920, y: 55,  w: 330, h: 265 },
      { id: 'bv',   name: 'RUANG PALKA BUNKER 72 (VAULT)', color: '#241a20', border: '#ef4444', x: 510, y: 55,  w: 410, h: 265 },
      { id: 'kit',  name: 'DAPUR & RUANG MAKAN',           color: '#212938', border: '#10b981', x: 120, y: 320, w: 390, h: 260 },
      { id: 'lr',   name: 'RUANG KELUARGA & TV',           color: '#1e2633', border: '#f59e0b', x: 510, y: 320, w: 410, h: 260 },
      { id: 'bath', name: 'KAMAR MANDI & GUDANG OBAT',     color: '#15222b', border: '#06b6d4', x: 120, y: 580, w: 390, h: 120 },
      { id: 'st',   name: 'RUANG KERJA / STUDIO',          color: '#25201c', border: '#f97316', x: 920, y: 460, w: 330, h: 240 },
      { id: 'hall', name: 'TERAS DEPAN & PINTU UTAMA',     color: '#1c222c', border: '#ffd166', x: 740, y: 580, w: 180, h: 120 }
    ];

    rooms.forEach(r => {
      // Floor Fill
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // Floor Border Outline
      ctx.strokeStyle = r.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // Room Title Banner
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillStyle = r.border;
      ctx.textAlign = 'left';
      ctx.fillText(`[ ${r.name} ]`, r.x + 10, r.y + 20);
    });

    // ── C. SPECIAL FLOOR ZONES: BUNKER VAULT HAZARD ZONE & LIVING RUG ──
    // 1. Bunker Vault Room Hazard Alert & Frame
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(530, 75, 370, 225);
    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ZONA EVAKUASI DARURAT - PALKA UTAMA ⚠', 715, 95);
    ctx.restore();

    // 2. Living Room Area Rug
    ctx.fillStyle = '#133842';
    ctx.fillRect(590, 410, 250, 150);
    ctx.strokeStyle = '#5bc0be';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(590, 410, 250, 150);

    // ── D. DRAW ALL SOLID WALL COLLIDERS (Clean Architectural Walls) ──
    ctx.fillStyle = '#0a0d14';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;

    this.colliders.forEach(c => {
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);

      // Furniture labeling
      if (c.id.startsWith('mb_') || c.id.startsWith('kb_') || c.id.startsWith('k_') ||
          c.id.startsWith('lr_') || c.id.startsWith('bath_') || c.id.startsWith('st_') || c.id.startsWith('bv_')) {
        if (!c.id.includes('wall') && !c.id.includes('outer')) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(c.x, c.y, c.w, c.h);

          ctx.font = 'bold 9px "Share Tech Mono", monospace';
          ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'center';
          const label = c.id.replace(/^[a-z]+_/, '').replace(/_/g, ' ').toUpperCase();
          ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 3);
          ctx.fillStyle = '#0a0d14';
        }
      }
    });

    // ── E. DRAW DOORWAYS (CLEAR "PINTU" LABELS & PASSAGE BOXES) ──
    const doors = [
      { name: '🚪 PINTU UTAMA',      x: 510, y: 150, w: 18,  h: 100, color: '#3b82f6' },
      { name: '🚪 PINTU ANAK',       x: 920, y: 150, w: 18,  h: 100, color: '#38bdf8' },
      { name: '🚪 PINTU DAPUR',      x: 510, y: 378, w: 18,  h: 92,  color: '#10b981' },
      { name: '🚪 PINTU MANDI',      x: 360, y: 580, w: 100, h: 18,  color: '#06b6d4' },
      { name: '🚪 PINTU STUDIO',     x: 920, y: 520, w: 18,  h: 100, color: '#f97316' },
      { name: '🚨 PINTU SEGEL BUNKER', x: 650, y: 320, w: 130, h: 18,  color: '#ef4444' }
    ];

    doors.forEach(d => {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(d.x, d.y, d.w, d.h);

      ctx.font = 'bold 9px "Share Tech Mono", monospace';
      ctx.fillStyle = d.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.name, d.x + d.w / 2, d.y + d.h / 2);
      ctx.restore();
    });

    // ── F. PINTU MASUK UTAMA / TERAS DEPAN (SPAWN POINT ILLUMINATED) ──
    ctx.save();
    // Welcome Porch threshold
    ctx.fillStyle = 'rgba(255, 209, 102, 0.15)';
    ctx.fillRect(780, 680, 120, 38);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(780, 680, 120, 38);

    // Glowing arrows pointing inside
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText('▲ ▲ PINTU MASUK UTAMA ▲ ▲', 840, 696);
    ctx.font = 'bold 9px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[ TITIK AWAL MASUK / SPAWN ]', 840, 710);
    ctx.restore();
  }

  _finishMinigame(reason) {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    // Sound effect
    retroAudio.playDoorLock?.();

    // Transition delay
    this.finishTimeoutId = setTimeout(() => {
      this.finishTimeoutId = null;
      this.destroy();
      if (typeof this.onComplete === 'function') {
        this.onComplete({
          collectedItems: [...this.backpack],
          reason
        });
      }
    }, 600);
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

    if (this.wrapper && this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }
  }
}
