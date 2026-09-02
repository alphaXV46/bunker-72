/**
 * developerConsole.js — Developer Console & In-Game Debug Tools for Bunker 72
 *
 * Modular developer tools overlay.
 * Gated by IS_DEV — 100% stripped / inactive in production builds.
 */

import { IS_DEV, HOUSE_TELEPORT_LOCATIONS, STORY_SCENE_CATALOG } from './devConfig.js';
import { SURVIVAL } from '../constants.js';

class DeveloperConsole {
  constructor({ storyEngine, dom }) {
    this.storyEngine = storyEngine;
    this.dom = dom;

    this.isOpen = false;
    this.isGamePaused = false;
    this.currentTimeScale = 1.0;
    this.pollInterval = null;

    // References to DOM elements
    this.container = null;
    this.floatingPill = null;

    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  init() {
    if (!IS_DEV) return;

    this._injectStyles();
    this._createFloatingPill();
    this._createConsoleUI();
    this._bindKeyboardShortcut();
  }

  // ─── UI INJECTION & STYLING ─────────────────────────────────────────────

  _injectStyles() {
    if (document.getElementById('bunker72-dev-console-styles')) return;

    const style = document.createElement('style');
    style.id = 'bunker72-dev-console-styles';
    style.textContent = `
      #bunker72-dev-pill {
        position: fixed;
        bottom: 12px;
        left: 12px;
        z-index: 999999;
        background: rgba(10, 14, 22, 0.88);
        border: 1px solid #5bc0be;
        color: #5bc0be;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        letter-spacing: 1px;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        transition: all 0.2s ease;
        user-select: none;
      }
      #bunker72-dev-pill:hover {
        background: #5bc0be;
        color: #0a0e16;
        box-shadow: 0 0 16px rgba(91, 192, 190, 0.7);
      }

      #bunker72-dev-console {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 440px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
        background: rgba(9, 13, 20, 0.96);
        border: 1px solid #5bc0be;
        border-radius: 6px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(91, 192, 190, 0.2);
        color: #e2e8f0;
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        z-index: 1000000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        backdrop-filter: blur(8px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      #bunker72-dev-console.hidden {
        display: none !important;
      }

      .bdc-header {
        background: #141c2b;
        padding: 10px 14px;
        border-bottom: 1px solid #2d3748;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .bdc-title {
        color: #5bc0be;
        font-weight: bold;
        font-size: 13px;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bdc-badge-dev {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid #ef4444;
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 2px;
      }
      .bdc-close-btn {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
        transition: color 0.15s ease;
      }
      .bdc-close-btn:hover {
        color: #ef4444;
      }

      .bdc-body {
        padding: 12px 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .bdc-body::-webkit-scrollbar {
        width: 6px;
      }
      .bdc-body::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 3px;
      }

      .bdc-section {
        background: rgba(18, 24, 38, 0.7);
        border: 1px solid #233044;
        border-radius: 4px;
        padding: 10px;
      }
      .bdc-section-title {
        font-size: 11px;
        color: #ffd166;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .bdc-status-chip {
        font-size: 10px;
        color: #94a3b8;
      }

      .bdc-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }
      .bdc-row:last-child {
        margin-bottom: 0;
      }

      .bdc-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #475569;
        border-radius: 3px;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
      }
      .bdc-btn:hover {
        background: #334155;
        border-color: #5bc0be;
        color: #5bc0be;
      }
      .bdc-btn.active {
        background: rgba(91, 192, 190, 0.2);
        border-color: #5bc0be;
        color: #5bc0be;
        font-weight: bold;
      }
      .bdc-btn.btn-warn:hover {
        border-color: #ffd166;
        color: #ffd166;
      }
      .bdc-btn.btn-danger:hover {
        border-color: #ef4444;
        color: #ef4444;
      }

      .bdc-select, .bdc-input {
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 3px;
        padding: 4px 6px;
        font-family: inherit;
        font-size: 11px;
      }
      .bdc-select:focus, .bdc-input:focus {
        outline: none;
        border-color: #5bc0be;
      }

      .bdc-info-box {
        background: #0c1017;
        border: 1px solid #1e293b;
        padding: 6px 8px;
        border-radius: 3px;
        font-size: 10px;
        color: #94a3b8;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);
  }

  _createFloatingPill() {
    this.floatingPill = document.createElement('div');
    this.floatingPill.id = 'bunker72-dev-pill';
    this.floatingPill.title = 'Tekan Backquote ( ` ) untuk buka/tutup console';
    this.floatingPill.innerHTML = `⚙ DEV CONSOLE [ <span style="color:#ffd166;">\`</span> ]`;
    this.floatingPill.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.floatingPill);
  }

  _createConsoleUI() {
    this.container = document.createElement('div');
    this.container.id = 'bunker72-dev-console';
    this.container.className = 'hidden';

    // Prevent typing inside dev console from triggering game hotkeys (e.g. Space, F)
    this.container.addEventListener('keydown', (e) => e.stopPropagation());

    this.container.innerHTML = `
      <div class="bdc-header">
        <div class="bdc-title">
          <span>BUNKER 72</span>
          <span class="bdc-badge-dev">DEV TOOLS</span>
        </div>
        <button type="button" class="bdc-close-btn" id="bdc-close-btn" title="Tutup Console">✕</button>
      </div>

      <div class="bdc-body">
        <!-- 1. GAME & TIME SYSTEM -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>⏱ SISTEM GAME & WAKTU</span>
            <span class="bdc-status-chip" id="bdc-pause-status">RUNNING (1.0x)</span>
          </div>
          <div class="bdc-row">
            <button type="button" class="bdc-btn" id="bdc-btn-pause">⏸ Pause</button>
            <button type="button" class="bdc-btn active" id="bdc-btn-resume">▶ Resume</button>
            <span style="color:#64748b; margin: 0 4px;">|</span>
            <button type="button" class="bdc-btn" data-scale="0.5">0.5x</button>
            <button type="button" class="bdc-btn active" data-scale="1.0">1.0x</button>
            <button type="button" class="bdc-btn" data-scale="2.0">2.0x</button>
            <button type="button" class="bdc-btn" data-scale="5.0">5.0x</button>
          </div>
        </div>

        <!-- 2. SCAVENGER MINIGAME -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>🎒 SCAVENGER MINIGAME</span>
            <span class="bdc-status-chip" id="bdc-scavenger-status">TIDAK AKTIF</span>
          </div>

          <!-- Timer Controls -->
          <div class="bdc-row">
            <span style="color:#94a3b8; font-size:10px;">TIMER:</span>
            <span id="bdc-timer-display" style="color:#ffd166; font-weight:bold; font-size:11px;">--</span>
            <button type="button" class="bdc-btn" id="bdc-btn-time-minus5">-5s</button>
            <button type="button" class="bdc-btn" id="bdc-btn-time-plus5">+5s</button>
            <button type="button" class="bdc-btn" id="bdc-btn-time-reset">Reset 40s</button>
            <button type="button" class="bdc-btn" id="bdc-btn-time-set10">Set 10s</button>
          </div>

          <!-- Completion Controls -->
          <div class="bdc-row">
            <button type="button" class="bdc-btn btn-warn" id="bdc-btn-instant-win">⚡ Instant Win</button>
            <button type="button" class="bdc-btn btn-danger" id="bdc-btn-force-timeout">💀 Force Timeout</button>
            <button type="button" class="bdc-btn" id="bdc-btn-restart-scavenger">↺ Restart Minigame</button>
          </div>

          <!-- Player & Collision Controls -->
          <div class="bdc-row" style="margin-top:6px;">
            <button type="button" class="bdc-btn" id="bdc-toggle-godmode">God Mode: OFF</button>
            <button type="button" class="bdc-btn" id="bdc-toggle-nocollision">No Collision: OFF</button>
            <button type="button" class="bdc-btn" id="bdc-toggle-colliders">Colliders & Zones (F2): OFF</button>
          </div>

          <!-- Fog of War Controls -->
          <div class="bdc-row" style="margin-top:6px;">
            <button type="button" class="bdc-btn" id="bdc-toggle-fog">Disable Fog: OFF</button>
            <button type="button" class="bdc-btn" id="bdc-btn-reveal-map">👁 Reveal Entire Map</button>
          </div>

          <!-- Teleport Picker -->
          <div class="bdc-row" style="margin-top:6px;">
            <span style="color:#94a3b8; font-size:10px;">TELEPORT:</span>
            <select class="bdc-select" id="bdc-teleport-select" style="flex:1;">
              ${HOUSE_TELEPORT_LOCATIONS.map((loc) => `<option value="${loc.id}">${loc.name}</option>`).join('')}
            </select>
            <button type="button" class="bdc-btn" id="bdc-btn-teleport">Teleport</button>
          </div>
        </div>

        <!-- 3. INVENTORY & SURVIVAL -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>📦 INVENTORY & SURVIVAL</span>
            <span class="bdc-status-chip" id="bdc-stats-status">HP: -- | Makan: -- | Minum: --</span>
          </div>
          <div class="bdc-row">
            <button type="button" class="bdc-btn" id="bdc-btn-give-all">🎁 Berikan Semua Barang</button>
            <button type="button" class="bdc-btn btn-danger" id="bdc-btn-clear-inv">🗑 Kosongkan Tas</button>
            <button type="button" class="bdc-btn" id="bdc-btn-max-stats">💚 Max Stats (100)</button>
          </div>
          <div class="bdc-row">
            <button type="button" class="bdc-btn" id="bdc-btn-add-food">+1 Makanan</button>
            <button type="button" class="bdc-btn" id="bdc-btn-add-drink">+1 Minuman</button>
            <button type="button" class="bdc-btn" id="bdc-btn-add-kit">+1 Medkit</button>
            <button type="button" class="bdc-btn btn-danger" id="bdc-btn-damage-hp">-20 HP</button>
          </div>
        </div>

        <!-- 4. STORY NAVIGATION -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>📖 NAVIGASI CERITA</span>
            <span class="bdc-status-chip" id="bdc-current-scene">SCENE: --</span>
          </div>
          <div class="bdc-row">
            <select class="bdc-select" id="bdc-scene-select" style="flex:1;">
              ${STORY_SCENE_CATALOG.map((sc) => `<option value="${sc.id}">[${sc.phase}] ${sc.label}</option>`).join('')}
            </select>
            <button type="button" class="bdc-btn" id="bdc-btn-jump-scene">Lompat</button>
          </div>
        </div>

        <!-- 5. ENDING EVALUATOR -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>⚖ EVALUATOR AKHIR (JAM KE-72)</span>
          </div>
          <div class="bdc-row">
            <button type="button" class="bdc-btn" id="bdc-btn-eval-now">🔍 Evaluasi State Sekarang</button>
            <button type="button" class="bdc-btn btn-danger" id="bdc-btn-force-bad">Force Bad</button>
            <button type="button" class="bdc-btn btn-warn" id="bdc-btn-force-normal">Force Normal</button>
            <button type="button" class="bdc-btn active" id="bdc-btn-force-good">Force Good</button>
          </div>
          <div class="bdc-info-box" id="bdc-eval-result" style="display:none; margin-top:6px;">
            <!-- Live evaluation result populated dynamically -->
          </div>
        </div>

        <!-- 6. MINIGAMES (BUNKER & RADIO) -->
        <div class="bdc-section">
          <div class="bdc-section-title">
            <span>📻 MINIGAME LAIN</span>
          </div>
          <div class="bdc-row">
            <span style="color:#94a3b8; font-size:10px;">BUNKER:</span>
            <select class="bdc-select" id="bdc-bunker-station-select">
              <option value="card">Card Key</option>
              <option value="power">Power Station</option>
              <option value="rotor">Rotor Station</option>
              <option value="wires">Wire Splicing</option>
            </select>
            <button type="button" class="bdc-btn" id="bdc-btn-open-bunker">Buka</button>
            <button type="button" class="bdc-btn btn-warn" id="bdc-btn-solve-bunker">Instant Solve</button>
          </div>
          <div class="bdc-row">
            <span style="color:#94a3b8; font-size:10px;">RADIO:</span>
            <button type="button" class="bdc-btn" id="bdc-btn-open-radio">Buka Radio</button>
            <button type="button" class="bdc-btn" id="bdc-btn-tune-radio">Auto-Tune (98.4)</button>
            <button type="button" class="bdc-btn btn-warn" id="bdc-btn-lock-radio">Instant Lock</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this._bindUIEvents();
  }

  // ─── EVENT BINDINGS ─────────────────────────────────────────────────────

  _bindKeyboardShortcut() {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  _handleKeyDown(e) {
    if (e.code === 'Backquote' || e.key === '`') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.closest('#bunker72-dev-console') === null) {
        return; // Don't steal backquote if player is typing in an external input
      }
      e.preventDefault();
      this.toggle();
    }
  }

  _bindUIEvents() {
    const el = (id) => this.container.querySelector(`#${id}`);

    // Close Button
    el('bdc-close-btn')?.addEventListener('click', () => this.close());

    // ── 1. Pause & Time Scale ──
    el('bdc-btn-pause')?.addEventListener('click', () => this.pauseGame());
    el('bdc-btn-resume')?.addEventListener('click', () => this.resumeGame());

    this.container.querySelectorAll('[data-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scale = parseFloat(btn.dataset.scale);
        this.setTimeScale(scale);
      });
    });

    // ── 2. Scavenger Controls ──
    el('bdc-btn-time-minus5')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.addTime(-5);
      this._updateDisplay();
    });
    el('bdc-btn-time-plus5')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.addTime(5);
      this._updateDisplay();
    });
    el('bdc-btn-time-reset')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.resetTimer();
      this._updateDisplay();
    });
    el('bdc-btn-time-set10')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.setTime(10);
      this._updateDisplay();
    });
    el('bdc-btn-instant-win')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.instantWin();
      this._updateDisplay();
    });
    el('bdc-btn-force-timeout')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.forceTimeout();
      this._updateDisplay();
    });
    el('bdc-btn-restart-scavenger')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.restart();
      this._updateDisplay();
    });

    // Toggles
    const godBtn = el('bdc-toggle-godmode');
    godBtn?.addEventListener('click', () => {
      const sc = this.storyEngine.view?.scavengerGame;
      if (!sc) return;
      sc.setGodMode(!sc.godMode);
      godBtn.textContent = `God Mode: ${sc.godMode ? 'ON' : 'OFF'}`;
      godBtn.classList.toggle('active', sc.godMode);
    });

    const noCollBtn = el('bdc-toggle-nocollision');
    noCollBtn?.addEventListener('click', () => {
      const sc = this.storyEngine.view?.scavengerGame;
      if (!sc) return;
      sc.setNoCollision(!sc.noCollision);
      noCollBtn.textContent = `No Collision: ${sc.noCollision ? 'ON' : 'OFF'}`;
      noCollBtn.classList.toggle('active', sc.noCollision);
    });

    const colBtn = el('bdc-toggle-colliders');
    colBtn?.addEventListener('click', () => {
      const sc = this.storyEngine.view?.scavengerGame;
      if (!sc) return;
      sc.setDebugColliders(!sc.debugColliders);
      colBtn.textContent = `Colliders & Zones (F2): ${sc.debugColliders ? 'ON' : 'OFF'}`;
      colBtn.classList.toggle('active', sc.debugColliders);
    });

    const fogBtn = el('bdc-toggle-fog');
    fogBtn?.addEventListener('click', () => {
      const sc = this.storyEngine.view?.scavengerGame;
      if (!sc) return;
      sc.setFogDisabled(!sc.fogDisabled);
      fogBtn.textContent = `Disable Fog: ${sc.fogDisabled ? 'ON' : 'OFF'}`;
      fogBtn.classList.toggle('active', sc.fogDisabled);
    });

    el('bdc-btn-reveal-map')?.addEventListener('click', () => {
      this.storyEngine.view?.scavengerGame?.revealEntireMap();
    });

    // Teleport
    el('bdc-btn-teleport')?.addEventListener('click', () => {
      const locId = el('bdc-teleport-select')?.value;
      const target = HOUSE_TELEPORT_LOCATIONS.find((l) => l.id === locId);
      if (target && this.storyEngine.view?.scavengerGame) {
        this.storyEngine.view.scavengerGame.teleportTo(target.x, target.y);
      }
    });

    // ── 3. Inventory & Survival ──
    el('bdc-btn-give-all')?.addEventListener('click', () => {
      const model = this.storyEngine.model;
      model.addInventoryItem('food', 4);
      model.addInventoryItem('drink', 4);
      model.addInventoryItem('kit', 3);
      model.setFlag('extra_battery', true);
      model.setFlag('battery_packed', true);
      model.setFlag('has_radio', true);
      model.setFlag('radio_packed', true);
      model.setFlag('medical_mask_ready', true);
      model.setFlag('food_packed', true);
      model.setFlag('drink_packed', true);
      model.setFlag('kit_packed', true);
      model.setFlag('toy_packed', true);
      this._syncHUD();
    });

    el('bdc-btn-clear-inv')?.addEventListener('click', () => {
      const model = this.storyEngine.model;
      model.inventory = { food: 0, drink: 0, kit: 0 };
      this._syncHUD();
    });

    el('bdc-btn-max-stats')?.addEventListener('click', () => {
      const model = this.storyEngine.model;
      model.health = 100;
      model.hunger = 100;
      model.thirst = 100;
      model.knowledge = 10;
      this._syncHUD();
    });

    el('bdc-btn-add-food')?.addEventListener('click', () => {
      this.storyEngine.model.addInventoryItem('food', 1);
      this._syncHUD();
    });
    el('bdc-btn-add-drink')?.addEventListener('click', () => {
      this.storyEngine.model.addInventoryItem('drink', 1);
      this._syncHUD();
    });
    el('bdc-btn-add-kit')?.addEventListener('click', () => {
      this.storyEngine.model.addInventoryItem('kit', 1);
      this._syncHUD();
    });
    el('bdc-btn-damage-hp')?.addEventListener('click', () => {
      this.storyEngine.model.modifyHealth(-20);
      this._syncHUD();
    });

    // ── 4. Story Navigation ──
    el('bdc-btn-jump-scene')?.addEventListener('click', () => {
      const sceneId = el('bdc-scene-select')?.value;
      if (sceneId) {
        this.storyEngine.debugJumpToScene(sceneId);
        this._updateDisplay();
      }
    });

    // ── 5. Ending Evaluator ──
    el('bdc-btn-eval-now')?.addEventListener('click', () => {
      const res = this.storyEngine.debugEvaluateEnding();
      const box = el('bdc-eval-result');
      if (box) {
        box.style.display = 'block';
        box.innerHTML = `
          <div style="font-weight:bold; color:${res.endingId === 'ending_good' ? '#00ff88' : res.endingId === 'ending_bad' ? '#ef4444' : '#ffd166'}; margin-bottom:4px;">
            RESULT: ${res.endingId.toUpperCase()} (Skor BNPB: ${res.preparedness?.score}/${res.preparedness?.maxScore})
          </div>
          <div>Kondisi Fatal (HP <= 0): <b>${res.fatalCondition ? 'YA' : 'TIDAK'}</b></div>
          <div>Kebutuhan Kritis Stabil: <b>${res.criticalSurvivalStable ? 'YA' : 'TIDAK'}</b></div>
          <div>Radio VHF: <b>${res.preparedness?.radioQuality?.toUpperCase()}</b></div>
          <div style="margin-top:4px; border-top:1px dashed #334155; padding-top:4px;">
            ${(res.preparedness?.categories || [])
              .map((c) => `<div>• ${c.label}: <b>${c.score}/${c.max}</b></div>`)
              .join('')}
          </div>
        `;
      }
    });

    el('bdc-btn-force-bad')?.addEventListener('click', () => {
      this.storyEngine.model.health = 0;
      this.storyEngine.debugJumpToScene('ending_bad');
    });

    el('bdc-btn-force-normal')?.addEventListener('click', () => {
      this.storyEngine.debugJumpToScene('ending_normal');
    });

    el('bdc-btn-force-good')?.addEventListener('click', () => {
      const model = this.storyEngine.model;
      model.health = 100;
      model.flags.air_uninspected = false;
      model.flags.smoke_poisoned = false;
      model.flags.water_poisoned = false;
      model.flags.water_ruined = false;
      model.flags.water_filtered = true;
      model.flags.air_seal_good = true;
      model.flags.power_saved = true;
      model.flags.radio_quality = 'clear';
      model.flags.extra_battery = true;
      model.flags.medical_mask_ready = true;
      this.storyEngine.debugJumpToScene('ending_good');
    });

    // ── 6. Minigames (Bunker & Radio) ──
    el('bdc-btn-open-bunker')?.addEventListener('click', () => {
      const station = el('bdc-bunker-station-select')?.value || 'card';
      this.storyEngine.bunkerMinigame?.openStation(station);
    });
    el('bdc-btn-solve-bunker')?.addEventListener('click', () => {
      const bm = this.storyEngine.bunkerMinigame;
      if (bm && bm.currentStationId) {
        bm.finishStation(bm.currentStationId);
      }
    });

    el('bdc-btn-open-radio')?.addEventListener('click', () => {
      this.storyEngine.radioMiniGame?.open();
    });
    el('bdc-btn-tune-radio')?.addEventListener('click', () => {
      const rm = this.storyEngine.radioMiniGame;
      if (rm) {
        rm.currentFreq = rm.targetFreq;
        if (rm.dom?.slider) rm.dom.slider.value = rm.targetFreq;
        rm.updateTuning();
      }
    });
    el('bdc-btn-lock-radio')?.addEventListener('click', () => {
      const rm = this.storyEngine.radioMiniGame;
      if (rm) {
        rm.currentFreq = rm.targetFreq;
        rm.updateTuning();
        rm.attemptLock();
      }
    });
  }

  // ─── DISPLAY REFRESH & SYNC ─────────────────────────────────────────────

  _syncHUD() {
    const sceneId = this.storyEngine.model?.currentSceneId || 'prolog_home';
    const scene = this.storyEngine.storyData?.scenes[sceneId] || {};
    this.storyEngine.view?.renderHud(
      scene,
      this.storyEngine.model.knowledge,
      sceneId,
      this.storyEngine.model.flags,
      this.storyEngine.model.hunger,
      this.storyEngine.model.thirst,
      this.storyEngine.model.health
    );
    this.storyEngine.view?.updateInventoryUI(
      this.storyEngine.model.isInventoryDisabledScene(sceneId),
      this.storyEngine.model.inventory
    );
    this._updateDisplay();
  }

  _updateDisplay() {
    if (!this.isOpen || !this.container) return;

    const el = (id) => this.container.querySelector(`#${id}`);
    const sc = this.storyEngine.view?.scavengerGame;
    const model = this.storyEngine.model;

    // Game Pause Status
    const pauseEl = el('bdc-pause-status');
    if (pauseEl) {
      pauseEl.textContent = this.isGamePaused ? 'PAUSED' : `RUNNING (${this.currentTimeScale}x)`;
      pauseEl.style.color = this.isGamePaused ? '#ef4444' : '#5bc0be';
    }

    // Scavenger Status
    const scavStatusEl = el('bdc-scavenger-status');
    const timerDisplay = el('bdc-timer-display');
    if (sc && sc.isActive) {
      if (scavStatusEl) {
        scavStatusEl.textContent = `AKTIF [${sc.currentRoomId?.toUpperCase() || 'WORLD'}] (${sc.backpack.length}/${sc.maxCapacity})`;
        scavStatusEl.style.color = '#00ff88';
      }
      if (timerDisplay) {
        timerDisplay.textContent = `${sc.timeLeft.toFixed(1)}s`;
      }
    } else {
      if (scavStatusEl) {
        scavStatusEl.textContent = 'TIDAK AKTIF';
        scavStatusEl.style.color = '#94a3b8';
      }
      if (timerDisplay) {
        timerDisplay.textContent = '--';
      }
    }

    // Stats Status
    const statsEl = el('bdc-stats-status');
    if (statsEl && model) {
      statsEl.textContent = `HP: ${model.health} | Makan: ${model.hunger} | Minum: ${model.thirst}`;
    }

    // Current Scene
    const sceneEl = el('bdc-current-scene');
    if (sceneEl && model) {
      sceneEl.textContent = `SCENE: ${model.currentSceneId}`;
    }
  }

  // ─── PUBLIC ACTIONS ─────────────────────────────────────────────────────

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.container?.classList.remove('hidden');
    this._updateDisplay();

    // Start 400ms polling to keep status fields fresh while console is visible
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => this._updateDisplay(), 400);
    }
  }

  close() {
    this.isOpen = false;
    this.container?.classList.add('hidden');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  pauseGame() {
    this.isGamePaused = true;
    if (this.storyEngine.view?.scavengerGame) {
      this.storyEngine.view.scavengerGame.pause();
    }
    this.container?.querySelector('#bdc-btn-pause')?.classList.add('active');
    this.container?.querySelector('#bdc-btn-resume')?.classList.remove('active');
    this._updateDisplay();
  }

  resumeGame() {
    this.isGamePaused = false;
    if (this.storyEngine.view?.scavengerGame) {
      this.storyEngine.view.scavengerGame.resume();
    }
    this.container?.querySelector('#bdc-btn-pause')?.classList.remove('active');
    this.container?.querySelector('#bdc-btn-resume')?.classList.add('active');
    this._updateDisplay();
  }

  setTimeScale(scale) {
    this.currentTimeScale = scale;
    this.storyEngine.debugSetTimeScale(scale);

    this.container?.querySelectorAll('[data-scale]').forEach((btn) => {
      btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scale);
    });
    this._updateDisplay();
  }

  destroy() {
    window.removeEventListener('keydown', this._handleKeyDown);
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    if (this.floatingPill && this.floatingPill.parentElement) {
      this.floatingPill.parentElement.removeChild(this.floatingPill);
    }
  }
}

/**
 * Factory function to instantiate the developer console.
 * Safe no-op in production.
 */
export function initDeveloperConsole(options) {
  if (!IS_DEV) return null;
  const devConsole = new DeveloperConsole(options);
  devConsole.init();
  return devConsole;
}
