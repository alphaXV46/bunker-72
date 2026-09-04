/**
 * gameView.js — View Layer (DOM rendering only)
 *
 * Responsibilities:
 *  - Read from the DOM and write to the DOM.
 *  - Accept all data as explicit parameters from the Controller.
 *  - Never navigate the controller's object graph (no this.controller.model.*).
 *
 * Dependencies: constants.js, scavenger minigame, runtime layout data, and a
 * small developer-tools gateway. The gateway stays a no-op in release builds.
 */

import { clamp, parseHour, POWER_THRESHOLDS, getTimePhase, getKnowledgeLabel, PREPAREDNESS_EVALUATION } from './constants.js';
import { ScavengerMinigame } from './scavengerMinigame.js';
import { createLayoutDevTools, DEV_TOOLS_ENABLED } from './dev/devRuntime.js';
import { getRuntimeUILayout } from './runtime/editorLayoutRuntime.js';
import { applyRuntimeUILayout } from './runtime/uiLayoutRuntime.js';

const GOOD_ENDING_BACKGROUNDS = {
  opening: new URL('../assets/backgrounds/bg_good_end.webp', import.meta.url).href,
  one: new URL('../assets/backgrounds/bg_good_end_1.webp', import.meta.url).href,
  two: new URL('../assets/backgrounds/bg_good_end_2.webp', import.meta.url).href,
  three: new URL('../assets/backgrounds/bg_good_end_3.webp', import.meta.url).href,
};

const BAD_ENDING_BACKGROUNDS = {
  opening: new URL('../assets/backgrounds/bg_bad_end.webp', import.meta.url).href,
  rescue: new URL('../assets/backgrounds/bg_bad_end_2.webp', import.meta.url).href,
  final: new URL('../assets/backgrounds/bg_bad_end_3.webp', import.meta.url).href,
};

// ─── AVATAR ASSET MAP ───────────────────────────────────────────────────────
const AVATARS = {
  ayah:        new URL('../assets/avatars/ayah/ayah_serius.png', import.meta.url).href,
  ayah_serius: new URL('../assets/avatars/ayah/ayah_serius.png', import.meta.url).href,
  ayah_senyum: new URL('../assets/avatars/ayah/ayah_senyum.png', import.meta.url).href,
  ayah_cemas:  new URL('../assets/avatars/ayah/ayah_cemas.png',  import.meta.url).href,
  ibu:         new URL('../assets/avatars/ibu/ibu_serius.png',   import.meta.url).href,
  ibu_serius:  new URL('../assets/avatars/ibu/ibu_serius.png',   import.meta.url).href,
  ibu_senyum:  new URL('../assets/avatars/ibu/ibu_senyum.png',   import.meta.url).href,
  anak:        new URL('../assets/avatars/anak/anak_senyum.png', import.meta.url).href,
  anak_senyum: new URL('../assets/avatars/anak/anak_senyum.png', import.meta.url).href,
  anak_serius: new URL('../assets/avatars/anak/anak_serius.png', import.meta.url).href,
  anak_cemas:  new URL('../assets/avatars/anak/anak_cemas.png',  import.meta.url).href,
  narrator:    new URL('../assets/avatars/avatar_narrator.png',  import.meta.url).href,
  penyintas:   new URL('../assets/avatars/avatar_penyintas.png', import.meta.url).href,
  penjarah:    new URL('../assets/avatars/avatar_penjarah.png',  import.meta.url).href,
  sar:         new URL('../assets/avatars/avatar_sar.png',       import.meta.url).href,
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
    this.goodEndingCutsceneStep = 0;
    this.badEndingCutsceneStep = 0;

    // The real editor is registered only by the development bootstrap. The
    // release build receives a no-op adapter with the same small contract.
    this.layoutEditor = createLayoutDevTools({
      root: this.dom.storyBox,
      canToggle: () => !this.scavengerGame,
    });
    this.layoutEditorRequested = DEV_TOOLS_ENABLED
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('layoutEditor') === '1';
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
    this._setupGoodEndingCutscene();
    this._setupBadEndingCutscene();
    if (this.layoutEditorRequested) this.layoutEditor.setEnabled(true);
  }

  _setupGoodEndingCutscene() {
    const cutscene = document.getElementById('good-ending-cutscene');
    const nextButton = document.getElementById('good-ending-next');
    if (!cutscene || !nextButton) return;

    nextButton.addEventListener('click', () => this._advanceGoodEndingCutscene());
    cutscene.addEventListener('click', (event) => {
      if (event.target === cutscene) this._advanceGoodEndingCutscene();
    });
  }

  _setupBadEndingCutscene() {
    const cutscene = document.getElementById('bad-ending-cutscene');
    const nextButton = document.getElementById('bad-ending-next');
    if (!cutscene || !nextButton) return;
    nextButton.addEventListener('click', () => this._advanceBadEndingCutscene());
    cutscene.addEventListener('click', (event) => {
      if (event.target === cutscene) this._advanceBadEndingCutscene();
    });
  }

  _renderBadEndingBeat() {
    const cutscene = document.getElementById('bad-ending-cutscene');
    const speaker = document.getElementById('bad-ending-speaker');
    const dialogue = document.getElementById('bad-ending-dialogue-text');
    const step = document.getElementById('bad-ending-step');
    const nextButton = document.getElementById('bad-ending-next');
    if (!cutscene || !speaker || !dialogue || !step || !nextButton) return;

    const beats = [
      {
        background: 'opening', speaker: 'NARATOR',
        text: 'Sirene terdengar di balik hujan. Bunker runtuh, tetapi sinyal darurat akhirnya tertangkap. Tim SAR menemukan pintu masuk yang masih bisa dibuka.',
      },
      {
        background: 'rescue', speaker: 'PETUGAS SAR',
        text: '“Tetap sadar. Oksigen sudah kami pasang.” Masker menutup wajah mereka satu per satu. “Kalian selamat, tapi tubuh kalian butuh pertolongan segera.”',
      },
      {
        background: 'final', speaker: 'NARATOR',
        text: 'Mereka berhasil dievakuasi, namun harus meninggalkan bunker dan sebagian besar persediaan. Selamat—tetapi dengan harga yang tidak kecil.',
      },
    ];
    const beat = beats[this.badEndingCutsceneStep];
    cutscene.classList.remove('ending-cutscene-bg-opening', 'ending-cutscene-bg-rescue', 'ending-cutscene-bg-final', 'is-changing');
    void cutscene.offsetWidth;
    cutscene.classList.add(`ending-cutscene-bg-${beat.background}`, 'is-changing');
    cutscene.style.setProperty('--cutscene-bg', `url("${BAD_ENDING_BACKGROUNDS[beat.background]}")`);
    speaker.textContent = beat.speaker;
    dialogue.textContent = beat.text;
    step.textContent = `0${this.badEndingCutsceneStep + 1} / 03`;
    nextButton.textContent = this.badEndingCutsceneStep === 2 ? 'LIHAT HASIL AKHIR' : 'LANJUTKAN';
  }

  _startBadEndingCutscene() {
    const cutscene = document.getElementById('bad-ending-cutscene');
    if (!cutscene) return;
    this.badEndingCutsceneStep = 0;
    this.dom.endingView.classList.remove('ending-bg-fatal');
    cutscene.classList.add('is-active');
    cutscene.setAttribute('aria-hidden', 'false');
    this._renderBadEndingBeat();
  }

  _advanceBadEndingCutscene() {
    const cutscene = document.getElementById('bad-ending-cutscene');
    if (!cutscene?.classList.contains('is-active')) return;
    if (this.badEndingCutsceneStep < 2) {
      this.badEndingCutsceneStep += 1;
      this._renderBadEndingBeat();
      return;
    }
    cutscene.classList.remove('is-active', 'ending-cutscene-bg-opening', 'ending-cutscene-bg-rescue', 'ending-cutscene-bg-final');
    cutscene.setAttribute('aria-hidden', 'true');
    this.dom.endingView.classList.add('ending-bg-fatal');
  }

  _renderGoodEndingBeat() {
    const cutscene = document.getElementById('good-ending-cutscene');
    const speaker = document.getElementById('good-ending-speaker');
    const dialogue = document.getElementById('good-ending-dialogue-text');
    const step = document.getElementById('good-ending-step');
    const nextButton = document.getElementById('good-ending-next');
    if (!cutscene || !speaker || !dialogue || !step || !nextButton) return;

    const beats = [
      {
        background: 'opening',
        speaker: 'IBU',
        text: '“Lihat... langitnya sudah mulai terang.” Ibu menggenggam tangan mereka. “Kita benar-benar berhasil melewati malam ini. Terima kasih karena tidak pernah menyerah.”',
      },
      {
        background: 'one',
        speaker: 'AYAH',
        text: '“Kita berhasil...” Ayah menarik napas panjang. “Terima kasih sudah tetap bersama. Sekarang kita bisa keluar dengan tenang—dan mulai lagi dari sana.”',
      },
      {
        background: 'two',
        speaker: 'MAYA',
        text: '“Ayah... Ibu... terima kasih sudah melindungiku.” Maya memeluk mereka erat. “Aku takut, tapi karena kita bersama, aku tidak merasa sendirian.”',
      },
      {
        background: 'three',
        speaker: 'NARATOR',
        text: 'Pintu bunker terbuka. Cahaya pagi menyambut keluarga itu—sebuah awal baru setelah 72 jam bertahan hidup.',
      },
    ];
    const beat = beats[this.goodEndingCutsceneStep];
    cutscene.classList.remove('ending-cutscene-bg-one', 'ending-cutscene-bg-two', 'ending-cutscene-bg-three', 'is-changing');
    void cutscene.offsetWidth;
    cutscene.classList.add(`ending-cutscene-bg-${beat.background}`, 'is-changing');
    cutscene.style.setProperty('--cutscene-bg', `url("${GOOD_ENDING_BACKGROUNDS[beat.background]}")`);
    speaker.textContent = beat.speaker;
    dialogue.textContent = beat.text;
    step.textContent = `0${this.goodEndingCutsceneStep + 1} / 04`;
    nextButton.textContent = this.goodEndingCutsceneStep === 3 ? 'LIHAT HASIL AKHIR' : 'LANJUTKAN';
  }

  _startGoodEndingCutscene() {
    const cutscene = document.getElementById('good-ending-cutscene');
    if (!cutscene) return;
    this.goodEndingCutsceneStep = 0;
    this.dom.endingView.classList.remove('ending-bg-best');
    cutscene.classList.add('is-active');
    cutscene.setAttribute('aria-hidden', 'false');
    this._renderGoodEndingBeat();
  }

  _advanceGoodEndingCutscene() {
    const cutscene = document.getElementById('good-ending-cutscene');
    if (!cutscene?.classList.contains('is-active')) return;
    if (this.goodEndingCutsceneStep < 3) {
      this.goodEndingCutsceneStep += 1;
      this._renderGoodEndingBeat();
      return;
    }

    cutscene.classList.remove('is-active', 'ending-cutscene-bg-one', 'ending-cutscene-bg-two', 'ending-cutscene-bg-three');
    cutscene.setAttribute('aria-hidden', 'true');
    this.dom.endingView.classList.add('ending-bg-best');
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
      if (this.layoutEditor?.handleKeyDown(event)) {
        event.preventDefault();
        return;
      }

      if (event.code === 'Space' && !event.repeat) {
        const minigameOpen = this.dom.bunkerMinigame && !this.dom.bunkerMinigame.hidden;
        const gameScreenActive = this.dom.storyBox
          ?.closest('#game-view')
          ?.classList.contains('active');
        const choicesVisible = this.dom.choicesPanel?.children.length > 0;

        if (gameScreenActive && !minigameOpen) {
          event.preventDefault();
          if (this.isTyping) {
            this.skipTyping();
          } else if (choicesVisible) {
            // The prolog's single "continue" choice is also keyboard accessible.
            const continueButton = this.dom.choicesPanel.querySelector('.title-continue');
            if (continueButton) continueButton.click();
          } else {
            this.controller.handleDialogueClick();
          }
          return;
        }
      }

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
    if (currentSceneId === 'ending_bad') {
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
    if (sceneId !== 'day1_inspection') this.clearDay1Hotspots();
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

    // F6 edits the persistent layout for the current narrative scene. The
    // packing scene belongs to the canvas minigame, so its DOM editor is
    // hidden while that minigame owns the interaction surface.
    if (isPacking) {
      this.layoutEditor.setEnabled(false);
    } else if (this.layoutEditorRequested) {
      this.layoutEditor.setEnabled(true);
    }
    const activeSceneKey = sceneId || 'global';
    void this.layoutEditor.setScene(activeSceneKey);
    applyRuntimeUILayout(this.dom.storyBox, getRuntimeUILayout(activeSceneKey));

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
    this.layoutEditor?.refresh();
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
   * Displays the compact diegetic summary emitted by the scavenger run.
   * Structured DOM nodes keep item names safe while preserving the existing
   * toast lifecycle and story flow.
   * @param {object} result
   */
  showScavengerResult(result) {
    if (!result) return;
    const container = document.getElementById('telltale-toast-container');
    if (!container) return;

    const summary = result.summary || {};
    const toast = document.createElement('div');
    toast.className = 'telltale-toast scavenger-result-toast';

    const bracketStart = document.createElement('span');
    bracketStart.className = 'telltale-toast-bracket';
    bracketStart.textContent = '▰▰';

    const content = document.createElement('div');
    content.className = 'scavenger-result-content';

    const title = document.createElement('strong');
    title.className = 'scavenger-result-title';
    title.textContent = summary.title || 'HASIL EVAKUASI';
    content.appendChild(title);

    const detail = document.createElement('span');
    detail.className = 'scavenger-result-detail';
    const count = Number.isFinite(summary.itemCount) ? summary.itemCount : (result.collectedItems?.length || 0);
    detail.textContent = `${count} barang diamankan · ${summary.reason || (result.reason || 'RUTE SELESAI').toUpperCase()}`;
    content.appendChild(detail);

    const time = document.createElement('span');
    time.className = 'scavenger-result-time';
    const seconds = Math.max(0, Math.ceil(Number(summary.timeRemaining ?? result.timeRemaining ?? 0)));
    time.textContent = `SISA WAKTU 00:${seconds < 10 ? '0' : ''}${seconds}`;
    content.appendChild(time);

    if (summary.lostItem?.name || result.lostItem?.name) {
      const lost = document.createElement('span');
      lost.className = 'scavenger-result-lost';
      lost.textContent = `TERTINGGAL: ${summary.lostItem?.name || result.lostItem.name}`;
      content.appendChild(lost);
    }

    const bracketEnd = bracketStart.cloneNode(true);
    toast.append(bracketStart, content, bracketEnd);
    container.appendChild(toast);

    void toast.offsetWidth;
    toast.classList.add('active');

    setTimeout(() => {
      toast.classList.remove('active');
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 4800);
  }

  clearDay1Hotspots() {
    this.dom.storyBox?.querySelector('.day1-hotspot-layer')?.remove();
  }

  renderDay1Hotspots(hotspots, flags = {}, onInspect, onFinish) {
    this.clearDay1Hotspots();
    const layer = document.createElement('div');
    layer.className = 'day1-hotspot-layer';
    layer.setAttribute('role', 'group');
    layer.setAttribute('aria-label', 'Titik inspeksi bunker');

    const inspectedCount = hotspots.filter((spot) => flags[spot.flag]).length;
    const status = document.createElement('div');
    status.className = 'day1-hotspot-status';
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = `<strong>INSPEKSI BUNKER</strong><span>${inspectedCount}/3 titik diperiksa</span>`;
    layer.appendChild(status);

    hotspots.forEach((spot) => {
      const inspected = flags[spot.flag] === true;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `day1-hotspot${inspected ? ' is-inspected' : ''}`;
      button.style.left = `${spot.x}%`;
      button.style.top = `${spot.y}%`;
      button.style.width = `${spot.w || 8}%`;
      button.style.height = `${spot.h || 8}%`;
      button.disabled = inspected;
      button.setAttribute('aria-label', `${spot.label}${inspected ? ' (sudah diperiksa)' : ''}`);
      button.innerHTML = `<span class="hotspot-marker" aria-hidden="true">${inspected ? '✓' : '+'}</span><span class="hotspot-label">${spot.label}</span>`;
      if (!inspected) button.addEventListener('click', () => onInspect?.(spot.id));
      layer.appendChild(button);
    });

    const finish = document.createElement('button');
    finish.type = 'button';
    finish.className = 'day1-hotspot-finish';
    finish.textContent = inspectedCount >= 3 ? 'LANJUTKAN KE SISTEM UDARA' : 'SELESAIKAN PEMERIKSAAN';
    finish.disabled = inspectedCount === 0;
    finish.addEventListener('click', () => onFinish?.());
    layer.appendChild(finish);
    this.dom.storyBox.appendChild(layer);
  }

  showDay1InspectionFeedback(text) {
    if (!this.dom.dialogueText) return;
    this.dom.dialogueText.textContent = text;
    this.activeText = text;
    this.isTyping = false;
    this.updateBackButton();
  }

  renderExpeditionMap(locations, visited = [], remainingVisits = 0, onSelect) {
    this.clearDay1Hotspots();
    this.dom.choicesPanel.innerHTML = '';
    this.dom.storyBox.classList.add('has-interactive-choices');
    this.currentChoicesPayload = null;

    const panel = document.createElement('div');
    panel.className = 'expedition-map-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Peta tujuan ekspedisi');
    panel.innerHTML = `
      <div class="expedition-map-header"><strong>PETA RUTE EKSPEDISI</strong><span>${remainingVisits} dari 2 kunjungan tersisa</span></div>
      <div class="expedition-map-route" aria-hidden="true">
        <span class="route-node route-north">POS KESEHATAN</span>
        <div class="route-crossing"><span class="route-node">RUMAH TETANGGA</span><b>INTERSECTION</b><span class="route-node">MINIMARKET</span></div>
        <i class="route-stem"></i>
        <span class="route-node route-south">BUNKER 72</span>
      </div>
      <div class="expedition-map-locations"></div>
    `;
    const list = panel.querySelector('.expedition-map-locations');
    locations.forEach((location) => {
      const isVisited = visited.includes(location.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `expedition-location-card${isVisited ? ' is-visited' : ''}`;
      button.disabled = isVisited || remainingVisits <= 0;
      button.setAttribute('aria-label', `${location.label}${isVisited ? ' (sudah dikunjungi)' : ''}`);
      button.innerHTML = `<span class="location-card-title">${location.label}</span><span class="location-card-risk">${location.risk}</span><span class="location-card-resource">${location.resourceHint}</span><span class="location-card-state">${isVisited ? '✓ SUDAH DIKUNJUNGI' : 'PILIH RUTE'}</span>`;
      if (!isVisited && remainingVisits > 0) button.addEventListener('click', () => onSelect?.(location.id));
      list.appendChild(button);
    });
    this.dom.choicesPanel.appendChild(panel);
    this.updateBackButton();
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
    this.clearDay1Hotspots();
    this.dom.choicesPanel.innerHTML = '';
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
      this.layoutEditor?.refresh();
      return;
    }

    if (currentSceneId === 'prolog_title') {
      const btn = document.createElement('button');
      btn.className = 'title-continue';
      btn.type = 'button';
      btn.textContent = choices[0].text;
      btn.addEventListener('click', () => onChoiceClick(choices[0]));
      this.dom.choicesPanel.appendChild(btn);
      this.layoutEditor?.refresh();
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
      btn.disabled    = choice.disabled === true;
      btn.className   = 'choice-btn choice-neutral';
      btn.innerHTML   = `
        <span class="choice-index">${String(renderedIndex).padStart(2, '0')}</span>
        <span class="choice-copy">${choice.text}</span>
        <span class="choice-arrow" aria-hidden="true">›</span>
      `;
      if (choice.disabledReason) btn.setAttribute('aria-label', `${choice.text} — ${choice.disabledReason}`);
      if (choice.disabledReason) btn.title = choice.disabledReason;
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
    this.layoutEditor?.refresh();
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
      .map(({ hour, text, effect }) => {
        const itemClass = effect > 0 ? 'log-good' : effect < 0 ? 'log-risk' : '';
        return `<p class="${itemClass}"><span>[${hour}]</span> <span>${text}</span></p>`;
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

    if (p?.inspectionReady) {
      p.inspectionReady();
      this._pendingChoicesPayload = null;
      return;
    }

    if (p?.expeditionMapReady) {
      p.expeditionMapReady();
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
    const cutscene = document.getElementById('good-ending-cutscene');
    if (cutscene) {
      cutscene.classList.remove('is-active', 'ending-cutscene-bg-one', 'ending-cutscene-bg-two', 'ending-cutscene-bg-three');
      cutscene.setAttribute('aria-hidden', 'true');
    }
    const badCutscene = document.getElementById('bad-ending-cutscene');
    if (badCutscene) {
      badCutscene.classList.remove('is-active', 'ending-cutscene-bg-opening', 'ending-cutscene-bg-rescue', 'ending-cutscene-bg-final');
      badCutscene.setAttribute('aria-hidden', 'true');
    }
    const score = typeof modularData?.preparednessScore === 'number' ? modularData.preparednessScore : Math.min(100, Math.round((finalKnowledge / 15) * 100));
    const grade = PREPAREDNESS_EVALUATION.getGrade(score);

    this.dom.endingTitle.classList.remove('ending-bad', 'ending-normal', 'ending-best');
    this.dom.endingView.classList.remove('ending-bg-bad', 'ending-bg-normal', 'ending-bg-best', 'ending-bg-fatal');
    this.dom.endingView.classList.remove('ending-single-card');

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
    };

    const cfg = ENDING_CONFIG[endingId] || ENDING_CONFIG.ending_normal;

    this.dom.endingTitle.textContent = cfg.title;
    this.dom.endingTitle.classList.add(cfg.titleClass);
    this.dom.endingView.classList.add(cfg.bgClass);
    if (endingId === 'ending_good') this.dom.endingView.classList.add('ending-single-card');

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[character]));
    const modules = Array.isArray(modularData?.modules) ? modularData.modules : [];

    if (endingId === 'ending_good' && modules.length) {
      this.dom.endingDesc.innerHTML = `
        <article class="good-ending-final-card">
          <div class="good-ending-final-card__eyebrow">HASIL EVAKUASI // PROTOKOL 72</div>
          <h3 class="good-ending-final-card__title">GOOD ENDING — BERTAHAN DENGAN STABIL</h3>
          <div class="good-ending-final-card__body">
            ${modules.map((module) => `<p><strong>${escapeHtml(module.title)}:</strong> ${escapeHtml(module.body)}</p>`).join('')}
          </div>
          <div class="good-ending-final-card__readiness">
            <div class="good-ending-final-card__readiness-label">KESIAPSIAGAAN TEKNIS</div>
            <strong>${score} / 100</strong>
            <span>${escapeHtml(grade.label)}</span>
          </div>
          <div class="good-ending-final-card__score">${escapeHtml(grade.desc)} Ini adalah ringkasan permainan, bukan penilaian resmi.</div>
        </article>
      `;
    } else if (modules.length) {
      this.dom.endingDesc.innerHTML = `
        <div class="epilogue-modular-grid">
          ${modules.map((module) => `
            <section class="epilogue-card epilogue-${escapeHtml(module.tone || 'default')}">
              <div class="epilogue-card-header">
                <span class="epilogue-icon" aria-hidden="true">${escapeHtml(module.icon || '•')}</span>
                <h4 class="epilogue-card-title">${escapeHtml(module.title)}</h4>
              </div>
              <p class="epilogue-card-body">${escapeHtml(module.body)}</p>
            </section>
          `).join('')}
        </div>
      `;
    } else {
      this.dom.endingDesc.textContent = endingText;
    }

    // Technical report only: no morality, relationship, or survival-stat points.
    const statsContainer = this.dom.endingStats || document.querySelector('.ending-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="preparedness-scorecard-box">
          <div class="preparedness-scorecard-header">
            <div class="preparedness-grade-pill grade-${grade.badge.split(' ')[1].toLowerCase()}">${escapeHtml(grade.badge)}</div>
            <div class="preparedness-score-title-group">
              <h3 class="preparedness-grade-label">${escapeHtml(grade.label)}</h3>
              <div class="preparedness-score-val">Skor Kesiapsiagaan Teknis: <strong>${score}</strong> / 100</div>
            </div>
          </div>
          <p class="preparedness-grade-explanation">${escapeHtml(grade.desc)} Ini adalah ringkasan permainan, bukan penilaian resmi.</p>
        </div>
      `;
    }

    if (this.dom.endingKnowledge) this.dom.endingKnowledge.textContent = score;
    if (this.dom.endingGradeText) this.dom.endingGradeText.textContent = `Status kesiapsiagaan: ${grade.label}`;
    if (this.dom.endingSummary) this.dom.endingSummary.textContent = modularData?.narrativeFull || endingSummary;

    // Dynamic debrief list generation based on flag history
    const debriefList = document.getElementById('debrief-list');
    const debriefBox = document.getElementById('debrief-box');
    if (debriefList && debriefBox) {
      const items = modularData?.preparedness?.debriefItems || [];
      debriefList.innerHTML = items.map((item) => `
        <li class="preparedness-debrief-item">
          <strong>${escapeHtml(item.label)} — ${item.score}/${item.max}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </li>
      `).join('');
      debriefBox.classList.remove('hidden');
    }

    if (endingId === 'ending_good') this._startGoodEndingCutscene();
    if (endingId === 'ending_bad') this._startBadEndingCutscene();

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
  startScavengerMinigame(onComplete, config = null) {
    this.layoutEditor.setEnabled(false);
    this.destroyScavengerMinigame();
    this.scavengerGame = new ScavengerMinigame(this.dom.storyBox, (result) => {
      this.scavengerGame = null;
      if (typeof onComplete === 'function') {
        onComplete(result);
      }
    }, config);
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

