/**
 * scavengerMinigame.js — 2D Top-Down Scavenger Minigame for Prologue Packing
 *
 * Simulates a high-tension, 40-second scavenge run in the player's modern coastal home
 * before diving into the basement bunker hatch.
 */

import { retroAudio } from './retroAudio.js';

// Assets
const SPRITESHEET_SRC = new URL('../assets/sprites/sheets/spritesheet_all.png', import.meta.url).href;

const ITEM_ASSETS = {
  food:  { image: new URL('../assets/food_icon.png',  import.meta.url).href, label: 'Makanan Kaleng', desc: '+15 Makanan' },
  drink: { image: new URL('../assets/drink_icon.png', import.meta.url).href, label: 'Air Bersih',     desc: '+15 Air' },
  kit:   { image: new URL('../assets/kit_icon.png',   import.meta.url).href, label: 'Kotak P3K',       desc: '+10 Kesehatan' },
  radio: { image: new URL('../assets/radio_icon.png', import.meta.url).href, label: 'Radio Portable', desc: 'Info & Sinyal SAR' },
  snack: { image: new URL('../assets/snacks.png',     import.meta.url).href, label: 'Snack Darurat',   desc: '+5 Makanan Cepat' },
  toy:   { image: new URL('../assets/car_toy.png',    import.meta.url).href, label: 'Mainan Anak',     desc: 'Moral Keluarga' }
};

export class ScavengerMinigame {
  /**
   * @param {HTMLElement} containerEl - Container element (#story-box or dedicated wrapper)
   * @param {Function} onComplete - Callback receiving { collectedItems: string[] }
   */
  constructor(containerEl, onComplete) {
    this.container = containerEl;
    this.onComplete = onComplete;

    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.isActive = false;

    // Dimensions
    this.MAP_W = 960;
    this.MAP_H = 540;

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

    // Player State
    this.player = {
      x: 480,
      y: 320,
      w: 36,
      h: 24, // Collision box
      speed: 3.8,
      dir: 'down',
      isMoving: false,
      frame: 0,
      animTimer: 0,
      fps: 8
    };

    // Backpack & Items
    this.maxCapacity = 5;
    this.backpack = []; // Array of item keys
    this.items = [
      { id: 'food',  name: 'Makanan Kaleng', x: 190, y: 140, w: 32, h: 32, collected: false, room: 'Dapur' },
      { id: 'drink', name: 'Air Bersih',     x: 100, y: 220, w: 32, h: 32, collected: false, room: 'Dapur' },
      { id: 'radio', name: 'Radio Portable', x: 260, y: 440, w: 32, h: 32, collected: false, room: 'Ruang Kerja' },
      { id: 'kit',   name: 'Kotak P3K',       x: 100, y: 420, w: 32, h: 32, collected: false, room: 'Ruang Kerja' },
      { id: 'snack', name: 'Snack Darurat',   x: 540, y: 230, w: 32, h: 32, collected: false, room: 'Ruang Tengah' },
      { id: 'toy',   name: 'Mainan Anak',     x: 620, y: 350, w: 32, h: 32, collected: false, room: 'Ruang Tamu' }
    ];

    // Bunker Hatch Zone (Top-Right Utility Corridor)
    this.bunkerHatch = {
      x: 820,
      y: 110,
      w: 80,
      h: 70,
      label: 'PALKA BUNKER'
    };

    // Emergency Timer & Tremor
    this.duration = 40; // 40 seconds
    this.timeLeft = this.duration;
    this.lastTime = 0;
    this.screenShake = 0;
    this.notificationText = '';
    this.notificationTimer = 0;

    // Controls
    this.keys = {};
    this._bindEvents();
  }

  _bindEvents() {
    this._handleKeyDown = (e) => {
      if (!this.isActive) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
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
    this.lastTime = performance.now();

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
      <div class="scavenger-timer-badge" id="scavenger-timer">
        <span class="timer-icon">⚠</span> EVAKUASI: <strong id="timer-val">00:40</strong>
      </div>
      <div class="scavenger-backpack-badge" id="scavenger-backpack">
        <span class="backpack-icon">🎒</span> RANSEL: <strong id="backpack-count">0 / 5</strong>
      </div>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'scavenger-canvas';
    this.canvas.className = 'scavenger-canvas';
    this.canvas.width = this.MAP_W;
    this.canvas.height = this.MAP_H;
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
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
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
    const nearbyItem = this.items.find(it => !it.collected && this._getDist(this.player, it) < 65);
    if (nearbyItem) {
      if (this.backpack.length >= this.maxCapacity) {
        this._showNotification('Ransel penuh! Maksimal 5 barang.');
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

    // Check if near Bunker Hatch
    const hatchCenter = { x: this.bunkerHatch.x + this.bunkerHatch.w / 2, y: this.bunkerHatch.y + this.bunkerHatch.h / 2 };
    if (this._getDist(this.player, hatchCenter) < 80) {
      this._finishMinigame('entered_hatch');
    }
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

  _loop(timestamp) {
    if (!this.isActive) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this._update(dt);
    this._render();

    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    // Timer Countdown
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._finishMinigame('time_out');
      return;
    }

    // Update Timer HUD
    const timerEl = document.getElementById('timer-val');
    if (timerEl) {
      const s = Math.ceil(this.timeLeft);
      timerEl.textContent = `00:${s < 10 ? '0' : ''}${s}`;
      if (s <= 10) {
        timerEl.parentElement.classList.add('urgent-flash');
      }
    }

    // Notification Timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
    }

    // Tremor intensity (increases as time runs down)
    const elapsedRatio = 1 - (this.timeLeft / this.duration);
    if (Math.random() < 0.15 + elapsedRatio * 0.25) {
      this.screenShake = (1 + elapsedRatio * 4) * (Math.random() - 0.5);
    } else {
      this.screenShake *= 0.9;
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
      // Set Direction
      if (vy > 0 && vx < 0) this.player.dir = 'front_left';
      else if (vy > 0) this.player.dir = 'down';
      else if (vy < 0) this.player.dir = 'up';
      else if (vx < 0) this.player.dir = 'left';
      else if (vx > 0) this.player.dir = 'right';

      // Diagonal Normalization
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      const nextX = this.player.x + vx * this.player.speed;
      const nextY = this.player.y + vy * this.player.speed;

      // Map bounds & Wall collisions
      if (this._canMoveTo(nextX, this.player.y)) this.player.x = nextX;
      if (this._canMoveTo(this.player.x, nextY)) this.player.y = nextY;

      // Animate Walk Frames
      this.player.animTimer += dt;
      if (this.player.animTimer >= 1 / this.player.fps) {
        this.player.animTimer = 0;
        this.player.frame = (this.player.frame + 1) % 5;
      }
    } else {
      this.player.frame = 0;
      this.player.animTimer = 0;
    }
  }

  _canMoveTo(x, y) {
    const pad = 28;
    // Outer walls
    if (x < 50 + pad || x > this.MAP_W - 50 - pad) return false;
    if (y < 60 + pad || y > this.MAP_H - 40 - pad) return false;

    // Room Partition Walls (Interior Wall Collisions)
    // Wall 1: Between Kitchen & Living Room (vertical wall x: 380, y: 60..250)
    if (x > 365 && x < 395 && y > 60 && y < 240) return false;
    // Wall 2: Between Study & Living Room (horizontal wall y: 350, x: 60..380)
    if (x > 50 && x < 380 && y > 335 && y < 365) return false;
    // Wall 3: Between Living Room & Utility Corridor (vertical wall x: 740, y: 60..250)
    if (x > 725 && x < 755 && y > 60 && y < 230) return false;

    return true;
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Clear
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, this.MAP_W, this.MAP_H);

    // Apply Screen Shake
    if (Math.abs(this.screenShake) > 0.1) {
      ctx.translate(this.screenShake, this.screenShake * 0.5);
    }

    // ── 1. DRAW HOUSE FLOOR & ROOMS ──
    this._renderHouseLayout(ctx);

    // ── 2. DRAW BUNKER ENTRANCE HATCH ──
    this._renderBunkerHatch(ctx);

    // ── 3. DRAW ITEMS ──
    this._renderItems(ctx);

    // ── 4. DRAW PLAYER CHARACTER ──
    this._renderPlayer(ctx);

    // ── 5. DRAW PROXIMITY TOOLTIPS & OVERLAYS ──
    this._renderTooltips(ctx);

    // ── 6. DRAW NOTIFICATION BANNER ──
    if (this.notificationTimer > 0) {
      this._renderNotification(ctx);
    }

    ctx.restore();
  }

  _renderHouseLayout(ctx) {
    // Outer House Floor (Modern Parquet & Tiles)
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(50, 60, this.MAP_W - 100, this.MAP_H - 100);

    // Room 1: Kitchen (Top-Left) - Ceramic Checkerboard Tiles
    ctx.fillStyle = '#283142';
    ctx.fillRect(50, 60, 330, 290);
    // Tile Grid
    ctx.strokeStyle = '#323d50';
    ctx.lineWidth = 1;
    for (let x = 50; x <= 380; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 350); ctx.stroke();
    }
    for (let y = 60; y <= 350; y += 40) {
      ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(380, y); ctx.stroke();
    }

    // Room 2: Study / Bedroom (Bottom-Left) - Deep Oak Wood
    ctx.fillStyle = '#2a221b';
    ctx.fillRect(50, 350, 330, 150);

    // Room 3: Living Room (Center-Bottom) - Warm Wood + Teal Rug
    ctx.fillStyle = '#26201a';
    ctx.fillRect(380, 60, 360, 440);
    // Center Rug
    ctx.fillStyle = '#1d3e45';
    ctx.fillRect(440, 200, 240, 200);
    ctx.strokeStyle = '#5bc0be';
    ctx.lineWidth = 2;
    ctx.strokeRect(440, 200, 240, 200);

    // Room 4: Utility Corridor / Bunker Access (Top-Right) - Concrete / Hazard
    ctx.fillStyle = '#181b22';
    ctx.fillRect(740, 60, 170, 440);

    // Wall Partitions (Dark Charcoal Beveled Walls)
    ctx.fillStyle = '#0f131a';
    ctx.fillRect(40, 50, this.MAP_W - 80, 14); // Top outer wall
    ctx.fillRect(40, 50, 14, this.MAP_H - 80); // Left outer wall
    ctx.fillRect(this.MAP_W - 54, 50, 14, this.MAP_H - 80); // Right outer wall
    ctx.fillRect(40, this.MAP_H - 44, this.MAP_W - 80, 14); // Bottom outer wall

    // Interior dividing walls
    ctx.fillRect(374, 60, 12, 190); // Kitchen wall
    ctx.fillRect(50, 344, 330, 12);  // Study wall
    ctx.fillRect(734, 60, 12, 180);  // Utility wall

    // Room Labels
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('[ DAPUR & PANTRY ]', 70, 85);
    ctx.fillText('[ RUANG KERJA ]', 70, 375);
    ctx.fillText('[ RUANG KELUARGA ]', 460, 85);
    ctx.fillText('[ LORONG UTILITAS ]', 760, 85);

    // Furniture: Kitchen Island
    ctx.fillStyle = '#3a4454';
    ctx.fillRect(160, 120, 80, 50);
    ctx.strokeStyle = '#5a6b82';
    ctx.strokeRect(160, 120, 80, 50);

    // Furniture: Study Desk
    ctx.fillStyle = '#423326';
    ctx.fillRect(220, 420, 90, 45);
    ctx.strokeStyle = '#6e5641';
    ctx.strokeRect(220, 420, 90, 45);

    // Furniture: Living Room Sofa
    ctx.fillStyle = '#3d2d2a';
    ctx.fillRect(460, 280, 80, 40);
    ctx.strokeStyle = '#6e4f4a';
    ctx.strokeRect(460, 280, 80, 40);
  }

  _renderBunkerHatch(ctx) {
    const h = this.bunkerHatch;
    // Glowing Pulse Hatch Base
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);

    // Hazard Stripes border
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(h.x - 4, h.y - 4, h.w + 8, h.h + 8);
    ctx.fillStyle = '#11141c';
    ctx.fillRect(h.x - 2, h.y - 2, h.w + 4, h.h + 4);

    // Heavy Steel Door
    ctx.fillStyle = '#232a36';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.strokeStyle = `rgba(91, 192, 190, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(h.x, h.y, h.w, h.h);

    // Hatch Wheel
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, h.y + h.h / 2, 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Status Light
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(h.x + h.w - 12, h.y + 12, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText('PALKA BUNKER', h.x + h.w / 2, h.y + h.h + 16);
    ctx.textAlign = 'left';
  }

  _renderItems(ctx) {
    this.items.forEach(it => {
      if (it.collected) return;

      const dist = this._getDist(this.player, it);
      const isNear = dist < 65;

      // Glow beacon
      ctx.save();
      if (isNear) {
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 14;
      }

      const img = this.itemImages[it.id];
      if (img && img.complete) {
        ctx.drawImage(img, it.x - 16, it.y - 16, 32, 32);
      } else {
        // Fallback marker
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(it.x - 12, it.y - 12, 24, 24);
      }

      // Sparkle / Pulsing Ring
      ctx.strokeStyle = isNear ? '#ffd166' : 'rgba(255, 209, 102, 0.4)';
      ctx.lineWidth = isNear ? 2 : 1;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 20 + 2 * Math.sin(Date.now() * 0.006), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  _renderPlayer(ctx) {
    const p = this.player;

    if (this.spritesLoaded && this.spritesheet.complete) {
      // Row Mapping in spritesheet_all.png (640x1280, 5 cols x 5 rows, each 128x256)
      const dirMap = { down: 0, right: 1, up: 2, front_left: 3, left: 4 };
      const row = dirMap[p.dir] !== undefined ? dirMap[p.dir] : 0;
      const col = p.frame;

      const sw = 128;
      const sh = 256;
      const sx = col * sw;
      const sy = row * sh;

      // Render size on canvas (scaled down to fit 2D top-down perspective)
      const scale = 0.36;
      const dw = sw * scale; // ~46px
      const dh = sh * scale; // ~92px
      const dx = p.x - dw / 2;
      const dy = p.y - dh + 10;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw character sprite
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.spritesheet, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
      // Fallback rectangle if loading
      ctx.fillStyle = '#5bc0be';
      ctx.fillRect(p.x - 14, p.y - 30, 28, 30);
    }
  }

  _renderTooltips(ctx) {
    // Proximity item tooltip
    const nearbyItem = this.items.find(it => !it.collected && this._getDist(this.player, it) < 65);
    if (nearbyItem) {
      this._drawBadge(ctx, nearbyItem.x, nearbyItem.y - 28, `[ SPASI / KLIK: AMBIL ${nearbyItem.name.toUpperCase()} ]`, '#ffd166');
    }

    // Proximity hatch tooltip
    const hatchCenter = { x: this.bunkerHatch.x + this.bunkerHatch.w / 2, y: this.bunkerHatch.y + this.bunkerHatch.h / 2 };
    if (this._getDist(this.player, hatchCenter) < 80) {
      const msg = this.backpack.length > 0
        ? `[ SPASI / KLIK: MASUK KE BUNKER DENGAN ${this.backpack.length} BARANG ]`
        : `[ SPASI / KLIK: MASUK KE BUNKER ]`;
      this._drawBadge(ctx, hatchCenter.x, hatchCenter.y - 35, msg, '#00ff88');
    }
  }

  _drawBadge(ctx, x, y, text, color) {
    ctx.save();
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    const textWidth = ctx.measureText(text).width;
    const padding = 8;
    const bw = textWidth + padding * 2;
    const bh = 24;

    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
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

  _renderNotification(ctx) {
    ctx.save();
    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    const text = this.notificationText;
    const textWidth = ctx.measureText(text).width;
    const bw = textWidth + 24;
    const bh = 30;
    const x = this.MAP_W / 2;
    const y = 490;

    ctx.fillStyle = 'rgba(15, 20, 28, 0.94)';
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

  _finishMinigame(reason) {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    // Sound effect
    retroAudio.playDoorLock?.();

    // Small delay for clean transition
    setTimeout(() => {
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

    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);

    if (this.wrapper && this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }
  }
}
