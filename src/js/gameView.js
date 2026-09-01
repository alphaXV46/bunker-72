/**
 * gameView.js — View Layer (DOM rendering only)
 *
 * Responsibilities:
 *  - Read from the DOM and write to the DOM.
 *  - Accept all data as explicit parameters from the Controller.
 *  - Never navigate the controller's object graph (no this.controller.model.*).
 *
 * Dependencies: constants.js only (for POWER_THRESHOLDS and parseHour/clamp).
 */

import { clamp, parseHour, POWER_THRESHOLDS, CHOICE_QUALITY_MAP, getTimePhase, getKnowledgeLabel, FACTS_MAP, BNPB_EVALUATION, MAJOR_DECISIONS_META } from './constants.js';
import { ScavengerMinigame } from './scavengerMinigame.js';

// ─── AVATAR ASSET MAP ───────────────────────────────────────────────────────
const AVATARS = {
  ayah:        new URL('../assets/avatars/ayah/ayah_serius.png', import.meta.url).href,
  ayah_serius: new URL('../assets/avatars/ayah/ayah_serius.png', import.meta.url).href,
  ayah_senyum: new URL('../assets/avatars/ayah/ayah_senyum.png', import.meta.url).href,
  ayah_cemas:  new URL('../assets/avatars/ayah/ayah_cemas.png',  import.meta.url).href,
  ibu:         new URL('../assets/avatars/ibu/ibu_serius.png',   import.meta.url).href,
  ibu_serius:  new URL('../assets/avatars/ibu/ibu_serius.png',   import.meta.url).href,
  ibu_senyum:  new URL('../assets/avatars/ibu/ibu_senyum.png',   import.meta.url).href,
  ibu_cemas:   new URL('../assets/avatars/ibu/ibu_cemas.png',    import.meta.url).href,
  anak:        new URL('../assets/avatars/avatar_anak.png',      import.meta.url).href,
  narrator:    new URL('../assets/avatars/avatar_narrator.png',  import.meta.url).href,
  penyintas:   new URL('../assets/avatars/avatar_penyintas.png', import.meta.url).href,
  penjarah:    new URL('../assets/avatars/avatar_penjarah.png',  import.meta.url).href,
  sar:         new URL('../assets/avatars/avatar_sar.png',       import.meta.url).href,
};

const PACKING_ITEMS = {
  food:  { image: new URL('../assets/items/food_icon.png',  import.meta.url).href, label: 'Makanan Kaleng' },
  drink: { image: new URL('../assets/items/drink_icon.png', import.meta.url).href, label: 'Air Bersih' },
  kit:   { image: new URL('../assets/items/kit_icon.png',   import.meta.url).href, label: 'Kotak P3K' },
  radio: { image: new URL('../assets/items/radio_icon.png', import.meta.url).href, label: 'Radio Portable' },
  snack: { image: new URL('../assets/items/snacks.png',     import.meta.url).href, label: 'Snack' },
  toy:   { image: new URL('../assets/items/car_toy.png',    import.meta.url).href, label: 'Mainan Anak' },
};

export class GameView {
  /**
   * @param {object} dom - Object map of pre-selected DOM element references.
   */
  constructor(dom) {
    this.dom            = dom;
    this.controller     = null;
    this.isTyping       = false;
    this.typingTimeoutId = null;
    this.typingRafId    = null;
    this.scavengerGame  = null;
    this.activeText     = '';
    this._pendingChoicesPayload = null; // stored so skipTyping can re-render
    this.narrativeHistory = [];
    this.currentNarrative = null;
    this.currentChoicesPayload = null;
    this.isReviewingNarrative = false;
    this.canReviewNarrative = false;
    this.backButton = null;
  }

  /**
   * Wires the view to its controller and initializes all UI listeners.
   * @param {object} controller - The StoryEngine instance.
   */
  init(controller) {
    this.controller = controller;
    this._setupDialogueClickListener();
    this._setupKeyboardShortcuts();
    this._setupInventoryListeners();
    this._setupSettingsModal();
    this._setupFullscreenControls();
    this._setupCardAndDrawerListeners();
  }

  // ─── LISTENER SETUP (private) ─────────────────────────────────────────────

  _setupFullscreenControls() {
    const fullscreenBtn    = document.getElementById('fullscreen-btn');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const expandIcon       = fullscreenBtn?.querySelector('.expand-icon');
    const compressIcon     = fullscreenBtn?.querySelector('.compress-icon');

    const isFullscreen = () => Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    const updateFullscreenUI = () => {
      const active = isFullscreen();
      if (expandIcon && compressIcon) {
        expandIcon.classList.toggle('hidden', active);
        compressIcon.classList.toggle('hidden', !active);
      }
      if (fullscreenBtn) {
        fullscreenBtn.title = active ? 'Keluar Layar Penuh (F / Esc)' : 'Mode Layar Penuh (F)';
        fullscreenBtn.setAttribute('aria-label', fullscreenBtn.title);
      }
      if (fullscreenToggle) {
        fullscreenToggle.checked = active;
      }
    };

    const toggleFullscreen = async () => {
      try {
        if (!isFullscreen()) {
          const elem = document.documentElement;
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
          } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('[gameView] Fullscreen toggle error:', err);
      }
      updateFullscreenUI();
    };

    fullscreenBtn?.addEventListener('click', toggleFullscreen);
    fullscreenToggle?.addEventListener('change', toggleFullscreen);

    document.addEventListener('fullscreenchange', updateFullscreenUI);
    document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
    document.addEventListener('mozfullscreenchange', updateFullscreenUI);
    document.addEventListener('MSFullscreenChange', updateFullscreenUI);

    // Shortcut 'F' key to toggle fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleFullscreen();
      }
    });

    updateFullscreenUI();
  }

  _setupDialogueClickListener() {
    const dialogueOverlay = this.dom.storyBox.querySelector('.dialogue-overlay');
    const advance = () => {
      if (this.isTyping) {
        this.skipTyping();
      } else {
        this.controller.handleDialogueClick();
      }
    };

    if (dialogueOverlay) {
      dialogueOverlay.addEventListener('click', (event) => {
        event.stopPropagation();
        advance();
      });
    }

    this.dom.storyBox.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      advance();
    });
  }

  _setupKeyboardShortcuts() {
    window.addEventListener('keydown', (event) => {
      if (!this.dom.choicesPanel?.children.length) return;
      const keyNumber = Number(event.key);
      if (!Number.isInteger(keyNumber) || keyNumber < 1 || keyNumber > 3) return;
      const button = this.dom.choicesPanel.children[keyNumber - 1];
      if (button) button.click();
    });
  }

  _setupInventoryListeners() {
    this.dom.resourceItems.forEach((item) => {
      const activate = () => {
        const key = item.dataset.resource;
        this.controller.handleInventoryClick(key);
      };

      item.addEventListener('click', activate);
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  _setupSettingsModal() {
    const settingsBtn      = document.getElementById('settings-btn');
    const settingsModal    = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const crtToggle        = document.getElementById('crt-toggle');

    if (!settingsBtn || !settingsModal || !settingsCloseBtn || !crtToggle) return;

    settingsBtn.addEventListener('click',      () => settingsModal.classList.remove('hidden'));
    settingsCloseBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Restore persisted CRT preference
    if (localStorage.getItem('bunker72_crt_disabled') === 'true') {
      crtToggle.checked = false;
      document.body.classList.add('disable-crt');
    }

    crtToggle.addEventListener('change', () => {
      const disabled = !crtToggle.checked;
      document.body.classList.toggle('disable-crt', disabled);
      localStorage.setItem('bunker72_crt_disabled', String(disabled));
    });
  }

  _setupCardAndDrawerListeners() {
    const card = document.getElementById('floating-interactive-card');
    const toggleBtn = document.getElementById('card-nav-toggle-btn');
    const toggleLabel = document.getElementById('toggle-btn-label');

    const drawerBtn = document.getElementById('drawer-toggle-btn');
    const drawer = document.getElementById('side-tactical-drawer');
    const drawerCloseBtn = document.getElementById('drawer-close-btn');

    if (toggleBtn && card && toggleLabel) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (card.classList.contains('show-choices')) {
          card.classList.remove('show-choices');
          card.classList.add('show-dialogue');
          toggleLabel.textContent = 'PILIHAN AKSI';
        } else {
          card.classList.remove('show-dialogue');
          card.classList.add('show-choices');
          toggleLabel.textContent = 'BACA CERITA';
        }
      });
    }

    if (drawerBtn && drawer) {
      drawerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('drawer-open');
        drawer.setAttribute('aria-hidden', drawer.classList.contains('drawer-open') ? 'false' : 'true');
      });
    }

    if (drawerCloseBtn && drawer) {
      drawerCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.remove('drawer-open');
        drawer.setAttribute('aria-hidden', 'true');
      });
    }
  }

  // ─── ONE-TIME SETUPS (called by StoryEngine.start) ───────────────────────

  setupJournalToggle() {
    const journalBtn      = document.getElementById('journal-btn');
    const journalPanel    = document.getElementById('journal-panel');
    const journalCloseBtn = document.getElementById('journal-close-btn');

    if (!journalBtn || !journalPanel) return;

    const open  = () => {
      journalPanel.classList.add('journal-open');
      journalPanel.setAttribute('aria-hidden', 'false');
      journalBtn.style.opacity       = '0';
      journalBtn.style.pointerEvents = 'none';
      journalBtn.classList.remove('flash-alert');
    };
    const close = () => {
      journalPanel.classList.remove('journal-open');
      journalPanel.setAttribute('aria-hidden', 'true');
      journalBtn.style.opacity       = '1';
      journalBtn.style.pointerEvents = 'auto';
    };

    journalBtn.addEventListener('click', () => {
      journalPanel.classList.contains('journal-open') ? close() : open();
    });
    if (journalCloseBtn) journalCloseBtn.addEventListener('click', close);
  }

  /**
   * Wires volume slider and mute button to the audio engine.
   * Audio init is NOT called here — the AudioContext is guaranteed to already
   * exist via the first-interaction handler in main.js before this UI is opened.
   * @param {object} audio - The RetroAudio instance.
   */
  setupVolumeControl(audio) {
    if (this._volumeControlsInitialized) return;
    this._volumeControlsInitialized = true;

    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn      = document.getElementById('mute-btn');
    const muteIcon     = document.getElementById('mute-icon');

    if (!volumeSlider || !muteBtn) return;

    let isMuted     = false;
    let lastVolume  = 0.6;

    const SVG_UNMUTED = `<svg class="speaker-pixel-icon" viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M2 7h4l5-5v16l-5-5H2V7z" /><path d="M14 6v2h2V6h-2z M16 8v4h2V8h-2z M14 12v2h2v-2h-2z" /></svg>`;
    const SVG_MUTED   = `<svg class="speaker-pixel-icon muted" viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M2 7h4l5-5v16l-5-5H2V7z" opacity="0.4" /><path d="M13 7l5 6 M18 7l-5 6" stroke="#ff5d5d" stroke-width="2.2" stroke-linecap="square" /></svg>`;

    const updateIcon = (muted) => {
      if (muteIcon) muteIcon.innerHTML = muted ? SVG_MUTED : SVG_UNMUTED;
      muteBtn.classList.toggle('is-muted', muted);
    };

    // Restore persisted volume before attaching listeners
    const savedVolume = parseFloat(localStorage.getItem('bunker72_volume'));
    if (!isNaN(savedVolume)) {
      lastVolume         = savedVolume;
      volumeSlider.value = savedVolume;
      audio._lastVolume  = savedVolume;
    }

    const savedMuted = localStorage.getItem('bunker72_muted') === 'true';
    if (savedMuted || savedVolume === 0) {
      isMuted = true;
      audio.setMuted(true);
      updateIcon(true);
    } else {
      updateIcon(false);
    }

    volumeSlider.addEventListener('input', () => {
      const val = parseFloat(volumeSlider.value);
      audio.init();
      if (val === 0) {
        isMuted = true;
        audio.setMuted(true);
        updateIcon(true);
      } else {
        lastVolume        = val;
        isMuted           = false;
        audio._lastVolume = val;
        audio.setVolume(val);
        audio.setMuted(false);
        updateIcon(false);
      }
      localStorage.setItem('bunker72_volume', lastVolume);
      localStorage.setItem('bunker72_muted', String(isMuted));
    });

    muteBtn.addEventListener('click', () => {
      audio.init();
      isMuted = !isMuted;
      if (isMuted) {
        audio.setMuted(true);
        volumeSlider.value = 0;
        updateIcon(true);
      } else {
        if (lastVolume === 0) lastVolume = 0.6;
        audio.setVolume(lastVolume);
        audio.setMuted(false);
        volumeSlider.value = lastVolume;
        updateIcon(false);
      }
      localStorage.setItem('bunker72_muted', String(isMuted));
      localStorage.setItem('bunker72_volume', lastVolume);
    });
  }

  // ─── RENDER METHODS ───────────────────────────────────────────────────────

  /**
   * Updates all HUD status bar values.
   * Receives all data it needs as explicit parameters — no model access.
   *
   * @param {object} scene           - Current scene data object from story.json.
   * @param {number} knowledge
   * @param {string} currentSceneId
   * @param {object} flags
   * @param {number} hunger
   * @param {number} thirst
   * @param {number} health
   */
  renderHud(scene, knowledge, currentSceneId, flags, hunger = 100, thirst = 100, health = 100) {
    const hour    = parseHour(scene.hour);
    const day      = clamp(Math.floor(hour / 24) + 1, 1, 3);
    const progress = clamp((hour / 72) * 100, 0, 100);

    this.dom.statusTime.textContent      = `${scene.hour} (${getTimePhase(hour)})`;
    this.dom.statusDay.textContent       = day;
    this.dom.statusKnowledge.textContent = `${knowledge}`;
    const knowledgeMuted = this.dom.statusKnowledge.nextElementSibling;
    if (knowledgeMuted) {
      knowledgeMuted.textContent = `/15 [${getKnowledgeLabel(knowledge)}]`;
    }

    if (this.dom.statusHunger) this.dom.statusHunger.textContent = Math.round(hunger);
    if (this.dom.statusThirst) this.dom.statusThirst.textContent = Math.round(thirst);
    if (this.dom.statusHealth) this.dom.statusHealth.textContent = Math.round(health);

    this.dom.statusProgressBar.style.width   = `${progress}%`;
    this.dom.statusObjective.textContent     = scene.objective || 'Ambil keputusan paling aman untuk keluarga.';

    const airStatus = knowledge <= 4 ? 'KRITIS' : knowledge <= 8 ? 'WASPADA' : 'STABIL';
    this.dom.statusAir.textContent           = airStatus;

    this.updateStatusVisuals(hunger, thirst, health, airStatus);

    // Structure status
    let structureText = 'AMAN';
    if (currentSceneId === 'ending_bad' || currentSceneId === 'ending_fatal') {
      structureText = 'RUNTUH';
    } else if (flags.structural_damage === true || scene.background === 'rusak') {
      structureText = 'RETAK';
    }
    this.dom.statusStructure.textContent = structureText;

    // Power status — thresholds sourced from constants, not magic numbers
    const { EMERGENCY_CUTOFF, EMERGENCY_START, ECONOMY_START } = POWER_THRESHOLDS;
    let powerText = 'NORMAL';
    if (hour >= EMERGENCY_CUTOFF) {
      powerText = flags.power_saved === true ? 'DARURAT' : 'PADAM';
    } else if (hour >= EMERGENCY_START) {
      powerText = 'DARURAT';
    } else if (hour >= ECONOMY_START) {
      powerText = 'HEMAT';
    }
    this.dom.statusPower.textContent = powerText;
  }

  /**
   * Updates status visual classes (low, warning) for HUD items.
   *
   * @param {number} hunger
   * @param {number} thirst
   * @param {number} health
   * @param {string} airStatus
   */
  updateStatusVisuals(hunger, thirst, health, airStatus) {
    const hungerEl = document.getElementById('hud-hunger');
    const thirstEl = document.getElementById('hud-thirst');
    const healthEl = document.getElementById('hud-health');
    const airEl    = document.getElementById('hud-air');

    // Hunger
    if (hungerEl) {
      hungerEl.classList.toggle('status-low', hunger <= 20);
      hungerEl.classList.toggle('status-warning', hunger > 20 && hunger <= 40);
    }

    // Thirst
    if (thirstEl) {
      thirstEl.classList.toggle('status-low', thirst <= 20);
      thirstEl.classList.toggle('status-warning', thirst > 20 && thirst <= 40);
    }

    // Health
    if (healthEl) {
      healthEl.classList.toggle('status-low', health <= 30);
      healthEl.classList.toggle('status-warning', health > 30 && health <= 60);
    }

    // Air
    if (airEl) {
      airEl.classList.toggle('status-low', airStatus === 'KRITIS');
      airEl.classList.toggle('status-warning', airStatus === 'WASPADA');
    }
  }

  /**
   * Applies a visual pulse effect to the knowledge score element.
   * @param {number} effect 
   */
  pulseKnowledge(effect) {
    if (effect === 0 || !this.dom.statusKnowledge) return;
    const pulseClass = effect > 0 ? 'pulse-score-good' : 'pulse-score-risk';
    
    this.dom.statusKnowledge.classList.remove('pulse-score-good', 'pulse-score-risk');
    // Force DOM reflow to restart animation
    void this.dom.statusKnowledge.offsetWidth;
    this.dom.statusKnowledge.classList.add(pulseClass);
    
    setTimeout(() => {
      if (this.dom.statusKnowledge) {
        this.dom.statusKnowledge.classList.remove(pulseClass);
      }
    }, 1000);
  }

  triggerShake() {
    const container = document.getElementById('game-container');
    if (!container) return;
    container.classList.remove('shake-effect');
    void container.offsetWidth; // force reflow
    container.classList.add('shake-effect');
    setTimeout(() => {
      container.classList.remove('shake-effect');
    }, 900);
  }

  /**
   * Updates inventory UI slots.
   * Receives `isDisabledScene` as a pre-computed boolean — no model access.
   *
   * @param {boolean} isDisabledScene
   * @param {object}  inventory
   */
  updateInventoryUI(isDisabledScene, inventory) {
    if (!this.dom.resourceItems) return;

    this.dom.resourceItems.forEach((item) => {
      const key      = item.dataset.resource;
      const countEl  = document.getElementById(`count-${key}`);

      if (key === 'radio') {
        if (countEl) countEl.textContent = '∞';
        item.classList.toggle('disabled', isDisabledScene);
        return;
      }

      const count = inventory[key] ?? 0;
      if (countEl) countEl.textContent = count;
      item.classList.toggle('disabled', isDisabledScene || count <= 0);
    });
  }

  /** Delegates to updateInventoryUI — kept for call-site compatibility in StoryEngine. */
  renderResources(isDisabledScene, inventory) {
    this.updateInventoryUI(isDisabledScene, inventory);
  }

  /**
   * Applies background and alert CSS classes to the story box.
   * @param {object} scene
   */
  renderSceneArt(scene, flags = {}, sceneId = '') {
    const hour = parseHour(scene.hour);
    const gameplayDayBg = hour >= 48 ? 'bg-day3' : hour >= 24 ? 'bg-day2' : 'bg-day1';
    const damagedBg = hour >= 48 ? 'bg-day3' : 'bg-rusak';
    const bgClassMap = {
      peaceful: 'bg-prolog-peaceful',
      prolog_peaceful: 'bg-prolog-peaceful',
      window: 'bg-prolog-window',
      prolog_window: 'bg-prolog-window',
      packing: 'bg-prolog-1',
      prolog: 'bg-prolog-1',
      prolog1: 'bg-prolog-1',
      prolog2: 'bg-prolog-2',
      prolog3: 'bg-prolog-3',
      prolog4: 'bg-prolog-4',
      titlecard: 'bg-titlecard',
      hari1: 'bg-day1',
      normal: gameplayDayBg,
      rusak: damagedBg,
    };

    const ENV_CLASSES = ['env-dusty', 'env-smoky', 'env-damaged', 'env-dim'];
    Array.from(this.dom.storyBox.classList)
      .filter((className) => className.startsWith('scene-id-'))
      .forEach((className) => this.dom.storyBox.classList.remove(className));

    this.dom.storyBox.classList.remove(
      'bg-prolog-peaceful', 'bg-prolog-window',
      'bg-prolog', 'bg-prolog-1', 'bg-prolog-2', 'bg-prolog-3', 'bg-prolog-4',
      'bg-titlecard', 'bg-hari1', 'bg-day1', 'bg-day2', 'bg-day3', 'bg-normal', 'bg-rusak', 'scene-alert',
      'speaker-ayah', 'speaker-ibu', 'speaker-anak', 'speaker-narrator', 'has-interactive-choices',
      ...ENV_CLASSES
    );

    const isProlog = String(scene.background || '').startsWith('prolog');
    const isPacking = sceneId === 'prolog_packing';
    const isTitleCard = scene.background === 'titlecard';
    const gameView = this.dom.storyBox.closest('#game-view');
    gameView?.classList.toggle('prolog-mode', isProlog);
    gameView?.classList.toggle('packing-mode', isPacking);
    gameView?.classList.toggle('title-card-mode', isTitleCard);
    document.body.classList.toggle('prolog-active', isProlog);
    document.body.classList.toggle('packing-active', isPacking);
    document.body.classList.toggle('title-card-active', isTitleCard);

    if (!isPacking) {
      this.destroyScavengerMinigame();
    }

    this.dom.storyBox.classList.add(bgClassMap[scene.background] || 'bg-day1');
    this.dom.storyBox.classList.add(`scene-id-${sceneId}`);
    if (scene.alert) this.dom.storyBox.classList.add('scene-alert');

    // ── Environmental visual filters based on active flags ──────────────────
    // Only apply during non-prolog gameplay scenes
    const isGameplay = !isProlog && !isPacking && !isTitleCard;
    if (isGameplay) {
      // Dusty/sepia tint — unfiltered air contaminates the environment
      if (flags.air_uninspected && !flags.air_remedied) {
        this.dom.storyBox.classList.add('env-dusty');
      }
      // Smoky haze — lingering gas from a bad smoke decision
      if (flags.smoke_poisoned) {
        this.dom.storyBox.classList.add('env-smoky');
      }
      // Structural crack tint — debris, dust, and low-light damage
      if (flags.structural_damage) {
        this.dom.storyBox.classList.add('env-damaged');
      }
      // Dim flicker — power not saved means unstable emergency lighting
      // Only meaningful from hour 44+ (economy mode threshold)
      const hour = parseInt(scene.hour) || 0;
      if (hour >= 44 && !flags.power_saved) {
        this.dom.storyBox.classList.add('env-dim');
      }
    }
  }

  /**
   * Updates speaker name, avatar image, and dialogue box speaker CSS class.
   * @param {object} scene
   */
  renderSpeaker(scene) {
    const avatarKey   = scene.avatar || 'narrator';
    const avatarUrl   = AVATARS[avatarKey] || (avatarKey.startsWith('ayah') ? AVATARS.ayah : AVATARS.narrator);
    const baseSpeaker = avatarKey.startsWith('ayah') ? 'ayah'
      : avatarKey.startsWith('ibu') ? 'ibu'
      : avatarKey.startsWith('anak') ? 'anak'
      : avatarKey;
    const speakerClass = ['ayah', 'ibu', 'anak', 'penyintas', 'penjarah', 'sar'].includes(baseSpeaker) ? `speaker-${baseSpeaker}` : 'speaker-narrator';

    this.dom.speakerName.textContent = scene.speaker;
    this.dom.storyBox.classList.remove('speaker-ayah', 'speaker-ibu', 'speaker-anak', 'speaker-narrator', 'speaker-penyintas', 'speaker-penjarah', 'speaker-sar');
    this.dom.storyBox.classList.add(speakerClass);

    if (avatarUrl) {
      this.dom.speakerAvatar.src        = avatarUrl;
      this.dom.speakerAvatar.alt        = `${scene.speaker} Avatar`;
      this.dom.avatarContainer.style.display = 'flex';
    } else {
      this.dom.avatarContainer.style.display = 'none';
    }
  }

  /**
   * Renders or updates the system alert banner inside '#game-container'.
   * @param {string|null} alertTag - The tag/message to display, or null to hide it.
   */
  renderSystemAlert(alertTag) {
    const container = document.getElementById('game-container');
    if (!container) return;

    let alertEl = container.querySelector('.system-alert-banner');

    if (alertTag) {
      if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.className = 'system-alert-banner';
        container.appendChild(alertEl);
      }
      alertEl.textContent = `[PERINGATAN SISTEM: ${alertTag}]`;
      alertEl.style.display = 'block';
    } else {
      if (alertEl) {
        alertEl.style.display = 'none';
      }
    }
  }

  /**
   * Displays an atmospheric retro Telltale-style notification toast.
   * e.g., "[SARAH AKAN MENGINGAT INI]", "[KARMA BAIK TERCATAT]"
   * @param {string} text
   */
  showTelltaleToast(text) {
    if (!text) return;
    const container = document.getElementById('telltale-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'telltale-toast';
    toast.innerHTML = `<span class="telltale-toast-bracket">▰▰</span> <span class="telltale-toast-text">${text}</span> <span class="telltale-toast-bracket">▰▰</span>`;
    container.appendChild(toast);

    // Force reflow for CSS transition
    void toast.offsetWidth;
    toast.classList.add('active');

    setTimeout(() => {
      toast.classList.remove('active');
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 3800);
  }

  /**
   * Renders interactive choice buttons.
   * Receives all data as parameters — no internal story data or model access.
   *
   * @param {Array}    choices
   * @param {string}   currentSceneId
   * @param {object}   flags
   * @param {Function} onChoiceClick
   */
  renderChoices(choices, currentSceneId, flags, onChoiceClick) {
    this.dom.choicesPanel.innerHTML = '';
    this.dom.choicesPanel.classList.remove('packing-grid');
    this.currentChoicesPayload = { choices, currentSceneId, flags, onChoiceClick };
    this.isReviewingNarrative = false;
    this.canReviewNarrative = choices?.length > 0 && !currentSceneId.startsWith('prolog_') && currentSceneId !== 'prolog_title';
    this.updateBackButton();

    const hasInteractiveChoices = choices?.length > 0 && currentSceneId !== 'prolog_packing' && currentSceneId !== 'prolog_title';
    this.dom.storyBox.classList.toggle('has-interactive-choices', !!hasInteractiveChoices);

    const card = document.getElementById('floating-interactive-card');
    const toggleLabel = document.getElementById('toggle-btn-label');
    if (card && toggleLabel && choices?.length && !currentSceneId.startsWith('prolog_') && currentSceneId !== 'prolog_title') {
      card.classList.remove('show-dialogue');
      card.classList.add('show-choices');
      toggleLabel.textContent = 'BACA CERITA';
    }

    if (!choices?.length) {
      this.dom.storyBox.classList.remove('has-interactive-choices');
      return;
    }

    if (currentSceneId === 'prolog_packing') {
      this.renderPackingChoices(choices, flags, onChoiceClick);
      return;
    }

    if (currentSceneId === 'prolog_title') {
      const btn = document.createElement('button');
      btn.className = 'title-continue';
      btn.type = 'button';
      btn.textContent = choices[0].text;
      btn.addEventListener('click', () => onChoiceClick(choices[0]));
      this.dom.choicesPanel.appendChild(btn);
      return;
    }

    let renderedIndex = 1;
    choices.forEach((choice) => {
      // Skip choices gated behind unmet flags
      if (choice.requireFlags?.length) {
        const meetsAll = choice.requireFlags.every((f) => flags[f] === true);
        if (!meetsAll) return;
      }

      if (choice.forbiddenFlags?.length) {
        const hasForbidden = choice.forbiddenFlags.some((f) => flags[f] === true);
        if (hasForbidden) return;
      }

      const btn       = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'choice-btn choice-neutral';
      btn.innerHTML   = `
        <span class="choice-index">${String(renderedIndex).padStart(2, '0')}</span>
        <span class="choice-copy">${choice.text}</span>
        <span class="choice-arrow" aria-hidden="true">›</span>
      `;
      renderedIndex++;

      if (choice.item) btn.dataset.item = choice.item;

      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          this.controller?.audio?.playHover?.();
        }
      });

      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          this.controller?.audio?.playClick?.();
          onChoiceClick(choice);
        }
      });

      this.dom.choicesPanel.appendChild(btn);
    });
  }

  /**
   * Renders the protocol log entries into the journal panel.
   * If isPostGame is true, renders all history with analytical badges.
   *
   * @param {Array} history
   * @param {boolean} isPostGame
   */
  renderProtocolLog(history, isPostGame = false) {
    if (!this.dom.protocolLogList) return;

    if (!history?.length) {
      this.dom.protocolLogList.innerHTML = '<p>Menunggu keputusan pertama...</p>';
      return;
    }

    const items = isPostGame ? history : history.slice(-5);

    this.dom.protocolLogList.innerHTML = items
      .map(({ hour, text, effect, choiceId, fact }) => {
        let badge = '';
        let itemClass = '';

        if (isPostGame && choiceId && CHOICE_QUALITY_MAP[choiceId]) {
          const qual = CHOICE_QUALITY_MAP[choiceId];
          if (qual === 'Optimal') {
            badge = ' <span class="badge badge-opt">✓ Optimal</span>';
            itemClass = 'log-good';
          } else if (qual === 'Acceptable') {
            badge = ' <span class="badge badge-acc">~ Acceptable</span>';
            itemClass = 'log-neutral';
          } else if (qual === 'Risky') {
            badge = ' <span class="badge badge-risk">✗ Risky</span>';
            itemClass = 'log-risk';
          }
        } else {
          itemClass = effect > 0 ? 'log-good' : effect < 0 ? 'log-risk' : '';
        }

        let factHtml = '';
        if (fact) {
          factHtml = `<br><span class="log-fact" style="color: var(--warning-yellow-border); font-size: 0.82rem; padding-left: 10px; display: inline-block; font-style: italic;">[MITIGASI] ${fact}</span>`;
        }
        return `<p class="${itemClass}"><span>[${hour}]</span> <span>${text}</span>${badge}${factHtml}</p>`;
      })
      .join('');
  }

  /**
   * Opens the journal panel directly (used for post-game log analytics).
   */
  openJournal() {
    const journalPanel = document.getElementById('journal-panel');
    const journalBtn      = document.getElementById('journal-btn');
    if (journalPanel && journalBtn) {
      journalPanel.classList.add('journal-open');
      journalPanel.setAttribute('aria-hidden', 'false');
      journalBtn.style.opacity       = '0';
      journalBtn.style.pointerEvents = 'none';
      journalBtn.classList.remove('flash-alert');
    }
  }

  notifyJournal() {
    const journalBtn = document.getElementById('journal-btn');
    if (journalBtn) {
      journalBtn.classList.add('flash-alert');
    }
  }

  // ─── TYPEWRITER ───────────────────────────────────────────────────────────

  /**
   * Types `text` character-by-character using requestAnimationFrame + delta time.
   * Stores the choices payload so skipTyping() can render them immediately.
   *
   * @param {string}   text
   * @param {Function} callback - Called when typing completes naturally.
   * @param {object}   choicesPayload - { choices, currentSceneId, flags, onChoiceClick }
   */
  typeText(text, callback, choicesPayload = null) {
    if (this.typingRafId)     cancelAnimationFrame(this.typingRafId);
    if (this.typingTimeoutId) clearTimeout(this.typingTimeoutId);

    this.activeText             = text;
    this.isTyping               = true;
    this._pendingChoicesPayload = choicesPayload;

    const card = document.getElementById('floating-interactive-card');
    const toggleLabel = document.getElementById('toggle-btn-label');
    if (card && toggleLabel) {
      card.classList.remove('show-choices');
      card.classList.add('show-dialogue');
      toggleLabel.textContent = 'PILIHAN AKSI';
    }
    
    // Create/reuse TextNode to avoid repeated DOM layout thrashing & string allocations
    let textNode = this.dom.dialogueText.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      textNode = document.createTextNode('');
      this.dom.dialogueText.replaceChildren(textNode);
    } else {
      textNode.nodeValue = '';
    }

    this.updateBackButton();

    let currentIndex   = 0;
    let lastTimestamp  = null;
    let lastAudioTime  = 0;
    const CHAR_INTERVAL = 28; // ms per character (standard dramatic VN pacing, ~35 chars/sec)
    const AUDIO_INTERVAL = 70; // ms minimum gap between audio clicks

    const frame = (timestamp) => {
      if (!this.isTyping) return;

      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed    = timestamp - lastTimestamp;
      const charsToAdd = Math.floor(elapsed / CHAR_INTERVAL);

      if (charsToAdd > 0) {
        lastTimestamp = timestamp - (elapsed % CHAR_INTERVAL);
        const prevIndex = currentIndex;
        currentIndex = Math.min(text.length, currentIndex + charsToAdd);

        textNode.nodeValue = text.slice(0, currentIndex);

        const currentChar = text[currentIndex - 1];
        if (currentChar && currentChar.trim() && (timestamp - lastAudioTime >= AUDIO_INTERVAL)) {
          this.controller?.audio?.playClick();
          lastAudioTime = timestamp;
        }
      }

      if (currentIndex < text.length) {
        this.typingRafId = requestAnimationFrame(frame);
      } else {
        this.isTyping    = false;
        this.typingRafId = null;
        this.updateBackButton();
        if (callback) callback();
      }
    };

    this.typingRafId = requestAnimationFrame(frame);
  }

  /**
   * Instantly completes any in-progress typewriter animation and renders
   * the pending choices using the payload stored at typeText() call time.
   * No controller or model traversal required.
   */
  skipTyping() {
    if (this.typingRafId)     { cancelAnimationFrame(this.typingRafId); this.typingRafId = null; }
    if (this.typingTimeoutId) { clearTimeout(this.typingTimeoutId);      this.typingTimeoutId = null; }

    let textNode = this.dom.dialogueText.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      this.dom.dialogueText.textContent = this.activeText;
    } else {
      textNode.nodeValue = this.activeText;
    }
    this.isTyping                     = false;
    this.updateBackButton();

    // Re-render choices from the payload stored when typeText() was called.
    const p = this._pendingChoicesPayload;
    if (p?.autoAdvance) {
      p.autoAdvance();
      this._pendingChoicesPayload = null;
      return;
    }

    if (p?.clickNextSceneId && this.controller) {
      this.controller.pendingClickNextSceneId = p.clickNextSceneId;
      this._pendingChoicesPayload = null;
      return;
    }

    if (p) {
      this.renderChoices(p.choices, p.currentSceneId, p.flags, p.onChoiceClick);
    }
    this._pendingChoicesPayload = null;
  }

  // ─── ENDING SCREEN ────────────────────────────────────────────────────────

  /**
   * Renders the ending screen with all outcome data and dynamic debrief analytics.
   * All data is passed as explicit parameters — no controller callback required.
   *
   * @param {string} endingId
   * @param {number} finalKnowledge
   * @param {string} endingText
   * @param {string} endingSummary    - Pre-computed by GameModel.getEndingSummary().
   * @param {object} flags            - Player state flags reconstructed from history.
   */
  renderEnding(endingId, finalKnowledge, endingText, endingSummary, flags = {}, history = [], modularData = null) {
    const score = typeof modularData?.bnpbScore === 'number' ? modularData.bnpbScore : Math.min(100, Math.round((finalKnowledge / 15) * 100));
    const grade = BNPB_EVALUATION.getGrade(score);

    this.dom.endingTitle.classList.remove('ending-bad', 'ending-normal', 'ending-best');
    this.dom.endingView.classList.remove('ending-bg-bad', 'ending-bg-normal', 'ending-bg-best', 'ending-bg-fatal');

    const ENDING_CONFIG = {
      ending_bad: {
        title:      modularData?.rescueTitle || 'ENDING: MAKAM BUNKER 72 (TRAGEDI DI PERUT BUMI)',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-fatal',
      },
      ending_normal: {
        title:      modularData?.rescueTitle || 'NORMAL ENDING: SELAMAT DENGAN KONSEKUENSI',
        titleClass: 'ending-normal',
        bgClass:    'ending-bg-normal',
      },
      ending_good: {
        title:      modularData?.rescueTitle || 'GOOD ENDING: PENYELAMATAN STABIL',
        titleClass: 'ending-best',
        bgClass:    'ending-bg-best',
      },
      ending_fatal: {
        title:      modularData?.rescueTitle || 'ENDING: MAKAM BUNKER 72 (TRAGEDI DI PERUT BUMI)',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-fatal',
      },
    };

    const cfg = ENDING_CONFIG[endingId] || ENDING_CONFIG.ending_normal;

    this.dom.endingTitle.textContent = cfg.title;
    this.dom.endingTitle.classList.add(cfg.titleClass);
    this.dom.endingView.classList.add(cfg.bgClass);

    // Format Modular Epilogue
    if (modularData && modularData.healthDesc) {
      this.dom.endingDesc.innerHTML = `
        <div class="epilogue-modular-grid">
          <div class="epilogue-card epilogue-medical">
            <div class="epilogue-card-header">
              <span class="epilogue-icon">🩺</span>
              <h4 class="epilogue-card-title">KONDISI MEDIS KELUARGA</h4>
            </div>
            <p class="epilogue-card-body">${modularData.healthDesc}</p>
          </div>
          <div class="epilogue-card epilogue-bunker">
            <div class="epilogue-card-header">
              <span class="epilogue-icon">🛡️</span>
              <h4 class="epilogue-card-title">INTEGRITAS BUNKER 72</h4>
            </div>
            <p class="epilogue-card-body">${modularData.bunkerDesc}</p>
          </div>
          <div class="epilogue-card epilogue-social">
            <div class="epilogue-card-header">
              <span class="epilogue-icon">🤝</span>
              <h4 class="epilogue-card-title">SOLIDARITAS & KARMA SOSIAL</h4>
            </div>
            <p class="epilogue-card-body">${modularData.karmaDesc}</p>
          </div>
          <div class="epilogue-card epilogue-family">
            <div class="epilogue-card-header">
              <span class="epilogue-icon">🧸</span>
              <h4 class="epilogue-card-title">IKATAN MORAL & MAYA</h4>
            </div>
            <p class="epilogue-card-body">${modularData.familyDesc}</p>
          </div>
        </div>
      `;
    } else {
      this.dom.endingDesc.textContent = endingText;
    }

    // Single Long-Scroll: Telltale-style Major Choices Recap
    let recapContainer = document.getElementById('telltale-recap-container');
    if (!recapContainer) {
      recapContainer = document.createElement('div');
      recapContainer.id = 'telltale-recap-container';
      recapContainer.className = 'telltale-recap-container';
      this.dom.endingDesc.parentNode.insertBefore(recapContainer, this.dom.endingDesc.nextSibling);
    }

    // Build choice cards from history matching MAJOR_DECISIONS_META
    const historyChoiceIds = new Set(history.map(h => h.choiceId).filter(Boolean));
    const majorCardsHtml = MAJOR_DECISIONS_META.map((meta) => {
      let chosenKey = null;
      for (const [cId] of Object.entries(meta.choiceMap)) {
        if (historyChoiceIds.has(cId)) {
          chosenKey = cId;
          break;
        }
      }
      if (!chosenKey) return '';

      const decision = meta.choiceMap[chosenKey];
      const karmaBadgeClass = decision.karma === 'positive' ? 'badge-karma-pos' : (decision.karma === 'negative' ? 'badge-karma-neg' : 'badge-karma-neu');
      const karmaText = decision.karma === 'positive' ? 'KARMA POSITIF' : (decision.karma === 'negative' ? 'BERISIKO' : 'NETRAL');

      return `
        <div class="recap-decision-card">
          <div class="recap-card-top">
            <span class="recap-decision-title">${meta.title}</span>
            <span class="recap-karma-badge ${karmaBadgeClass}">${karmaText}</span>
          </div>
          <div class="recap-chosen-label">Pilihan Anda: <strong>${decision.label}</strong></div>
          <div class="recap-chosen-outcome">${decision.outcome}</div>
        </div>
      `;
    }).filter(Boolean).join('');

    if (majorCardsHtml) {
      recapContainer.innerHTML = `
        <div class="telltale-recap-section">
          <h3 class="recap-section-header">PILIHAN-PILIHAN KRUSIAL ANDA</h3>
          <div class="recap-cards-grid">${majorCardsHtml}</div>
        </div>
      `;
    } else {
      recapContainer.innerHTML = '';
    }

    // Single Long-Scroll: BNPB Disaster Mitigation Scorecard
    const statsContainer = this.dom.endingStats || document.querySelector('.ending-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="bnpb-scorecard-box">
          <div class="bnpb-scorecard-header">
            <div class="bnpb-grade-pill grade-${grade.badge.split(' ')[1].toLowerCase()}">${grade.badge}</div>
            <div class="bnpb-score-title-group">
              <h3 class="bnpb-grade-label">${grade.label}</h3>
              <div class="bnpb-score-val">Skor Mitigasi Bencana: <strong>${score}</strong> / 100</div>
            </div>
          </div>
          <p class="bnpb-grade-explanation">${grade.desc}</p>
        </div>
      `;
    }

    // Dynamic debrief list generation based on flag history
    const debriefList = document.getElementById('debrief-list');
    const debriefBox = document.getElementById('debrief-box');
    if (debriefList && debriefBox) {
      debriefList.innerHTML = '';
      const bullets = [];

      if (flags.air_uninspected === true) {
        bullets.push("<strong>Mitigasi Katup Udara:</strong> Inspeksi segel karet katup ventilasi secara fisik sangat krusial pasca-bencana. Menyalakan filtrasi tanpa pengecekan katup bypass menyedot abu Krakatau dan gas belerang langsung dari luar.");
      } else {
        bullets.push("<strong>Optimal - Filtrasi Udara:</strong> Penggantian segel katup secara proaktif berhasil mengisolasi gas permukaan dari ruang utama bunker.");
      }

      if (flags.water_filtered === true && flags.water_ruined !== true) {
        bullets.push("<strong>Optimal - Pemurnian Air:</strong> Penggunaan filter karbon aktif dan tablet klorin terbukti efektif mengurangi kontaminan abu, belerang, dan mineral halus dari tangki air pipa yang tercemar.");
      } else {
        bullets.push("<strong>Mitigasi Air Vulkanik:</strong> Merebus air keruh tidak menghilangkan mineral vulkanik terlarut; penguapan justru memusatkan kontaminannya. Selalu saring dengan karbon aktif.");
      }

      if (flags.radio_saved === true) {
        bullets.push("<strong>Optimal - Manajemen Baterai:</strong> Penjadwalan transmisi radio (10 menit per 6 jam) sukses menghemat daya sel baterai kritis untuk menangkap sinyal evakuasi.");
      } else {
        bullets.push("<strong>Manajemen Daya Radio:</strong> Batasi operasional penerima VHF dengan jadwal transmisi ketat agar baterai tidak habis sebelum pesan koordinat Satgas BNPB diterima.");
      }

      if (flags.door_opened === true) {
        bullets.push("<strong>Keamanan Sosial Darurat:</strong> Menjaga pintu keluar tetap tertutup rapat dari pihak tak dikenal mencegah penyusupan dan penjarahan logistik kritis keluarga.");
      } else {
        bullets.push("<strong>Optimal - Protokol Keamanan:</strong> Menolak membuka pintu untuk suara tak dikenal and memverifikasi sandi evakuasi resmi BNPB (GARUDA-72) menjamin pertahanan fisik keluarga.");
      }

      if (flags.structural_damage === true) {
        bullets.push("<strong>Integritas Struktur:</strong> Saat gempa melanda, memicu hidrolik penopang atau berlindung di bawah ranjang baja melindungi tubuh. Panik berlari ke pintu keluar melemahkan struktur pintu.");
      } else {
        bullets.push("<strong>Optimal - Respon Gempa:</strong> Aktivasi hidrolik penopang struktural berhasil meredam getaran seismik and mencegah retakan fatal di dinding ventilasi.");
      }

      debriefList.innerHTML = bullets.map(b => `<li>${b}</li>`).join('');
      debriefBox.classList.remove('hidden');
    }

    this.renderEducationalDebrief(history);
  }

  /**
   * Parses the 3 lowest-quality choices from the history and displays real-world safety facts.
   * @param {Array} history
   */
  renderEducationalDebrief(history) {
    const container = document.getElementById('educational-debrief-container');
    if (!container) return;

    if (!history || !history.length) {
      container.innerHTML = '';
      return;
    }

    const optimalChoices = [];
    const riskyChoices = [];

    history.forEach((item) => {
      if (item.choiceId && CHOICE_QUALITY_MAP[item.choiceId]) {
        const quality = CHOICE_QUALITY_MAP[item.choiceId];
        const choiceData = {
          id: item.choiceId,
          text: item.text,
          hour: item.hour,
          fact: FACTS_MAP[item.choiceId] || '',
        };
        if (quality === 'Optimal') {
          optimalChoices.push(choiceData);
        } else if (quality === 'Risky') {
          riskyChoices.push(choiceData);
        }
      }
    });

    const renderList = (items, emptyText, includeFact = false) => {
      if (!items.length) return `<p class="empty-note">${emptyText}</p>`;
      return `
        <ul>
          ${items.map((c) => {
            const body = includeFact ? c.fact : c.text;
            return `<li><strong>[${c.hour}]</strong> ${body}</li>`;
          }).join('')}
        </ul>
      `;
    };

    const riskyFacts = riskyChoices.filter((c) => c.fact);
    const html = `
      <div class="educational-debrief-box">
        <h3>EVALUASI DETAIL KEPUTUSAN & MITIGASI</h3>
        <section>
          <h4 class="debrief-good">KEPUTUSAN TEPAT</h4>
          ${renderList(optimalChoices, 'Tidak ada keputusan optimal yang tercatat.')}
        </section>
        <section>
          <h4 class="debrief-risk">KEPUTUSAN BERISIKO</h4>
          ${renderList(riskyChoices, 'Tidak ada keputusan berisiko yang tercatat.')}
        </section>
        <section>
          <h4 class="debrief-guide">PANDUAN PERBAIKAN MITIGASI</h4>
          ${renderList(riskyFacts, 'Tidak ada panduan mitigasi khusus yang diperlukan.', true)}
        </section>
      </div>
    `;

    container.innerHTML = html;
  }

  renderPackingChoices(choices, flags, onChoiceClick) {
    this.dom.choicesPanel.classList.add('packing-grid');

    const packedCount = ['food_packed', 'drink_packed', 'kit_packed', 'battery_packed', 'snack_packed', 'toy_packed']
      .filter((flag) => flags[flag] === true).length;

    const hint = document.createElement('div');
    hint.className = 'packing-hint';
    hint.innerHTML = `
      <strong>Pilih 5 barang untuk dibawa ke bunker</strong>
      <span>${packedCount}/5 masuk tas</span>
    `;
    this.dom.choicesPanel.appendChild(hint);

    choices.forEach((choice) => {
      if (choice.forbiddenFlags?.some((f) => flags[f] === true)) return;

      const item = PACKING_ITEMS[choice.item] || PACKING_ITEMS.food;
      const btn = document.createElement('button');
      btn.className = `packing-item packing-item-${choice.item}`;
      btn.type = 'button';
      btn.innerHTML = `
        <img src="${item.image}" alt="${item.label}">
        <span>${item.label}</span>
      `;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('packing-picked')) return;
        btn.classList.add('packing-picked');
        onChoiceClick(choice);
      });
      this.dom.choicesPanel.appendChild(btn);
    });
  }

  captureNarrative(scene, text, sceneId, reviewable = false) {
    if (!text) return;
    if (this.currentNarrative?.sceneId !== sceneId && this.currentNarrative?.text && this.currentNarrative.reviewable) {
      this.narrativeHistory.push(this.currentNarrative);
      if (this.narrativeHistory.length > 12) this.narrativeHistory.shift();
    }

    this.currentNarrative = {
      sceneId,
      speaker: scene.speaker,
      avatar: scene.avatar,
      text,
      reviewable,
    };
  }

  _ensureBackButton() {
    if (this.backButton) return this.backButton;
    const button = document.createElement('button');
    button.className = 'narrative-back-btn';
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.isReviewingNarrative) {
        this.restoreCurrentNarrative();
      } else {
        this.showPreviousNarrative();
      }
    });
    this.dom.storyBox.querySelector('.dialogue-overlay')?.appendChild(button);
    this.backButton = button;
    return button;
  }

  updateBackButton() {
    if (this.backButton) {
      this.backButton.disabled = true;
      this.backButton.classList.add('is-hidden');
      this.backButton.style.display = 'none';
    }
  }

  showPreviousNarrative() {
    if (!this.narrativeHistory.length) return;
    if (this.typingRafId) { cancelAnimationFrame(this.typingRafId); this.typingRafId = null; }
    if (this.typingTimeoutId) { clearTimeout(this.typingTimeoutId); this.typingTimeoutId = null; }

    const previous = this.narrativeHistory[this.narrativeHistory.length - 1];
    this.isReviewingNarrative = true;
    this.renderSpeaker(previous);
    this.dom.dialogueText.textContent = previous.text;
    this.dom.choicesPanel.innerHTML = '';
    this.dom.choicesPanel.classList.remove('packing-grid');
    this.isTyping = false;
    this._pendingChoicesPayload = null;
    this.updateBackButton();
  }

  restoreCurrentNarrative() {
    if (!this.currentNarrative) return;
    this.isReviewingNarrative = false;
    this.renderSpeaker(this.currentNarrative);
    this.dom.dialogueText.textContent = this.currentNarrative.text;

    const p = this.currentChoicesPayload;
    if (p) {
      this.renderChoices(p.choices, p.currentSceneId, p.flags, p.onChoiceClick);
    }
    this.updateBackButton();
  }

  /**
   * Starts the 2D Top-Down Scavenger Minigame for Prologue Packing.
   * @param {Function} onComplete - Callback receiving { collectedItems: string[] }
   */
  startScavengerMinigame(onComplete) {
    this.destroyScavengerMinigame();
    this.scavengerGame = new ScavengerMinigame(this.dom.storyBox, (result) => {
      this.scavengerGame = null;
      if (typeof onComplete === 'function') {
        onComplete(result);
      }
    });
    this.scavengerGame.start();
  }

  /**
   * Destroys active Scavenger Minigame if running.
   */
  destroyScavengerMinigame() {
    if (this.scavengerGame) {
      this.scavengerGame.destroy();
      this.scavengerGame = null;
    }
  }
}

