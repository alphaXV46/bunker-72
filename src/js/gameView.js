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

import { clamp, parseHour, POWER_THRESHOLDS, CHOICE_QUALITY_MAP } from './constants.js';

// ─── AVATAR ASSET MAP ───────────────────────────────────────────────────────
const AVATARS = {
  ayah:     new URL('../assets/avatar_ayah.png',     import.meta.url).href,
  ibu:      new URL('../assets/avatar_ibu.png',      import.meta.url).href,
  anak:     new URL('../assets/avatar_anak.png',     import.meta.url).href,
  narrator: new URL('../assets/avatar_narrator.png', import.meta.url).href,
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
    this.activeText     = '';
    this._pendingChoicesPayload = null; // stored so skipTyping can re-render
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
  }

  // ─── LISTENER SETUP (private) ─────────────────────────────────────────────

  _setupDialogueClickListener() {
    const dialogueOverlay = this.dom.storyBox.querySelector('.dialogue-overlay');
    if (!dialogueOverlay) return;
    dialogueOverlay.addEventListener('click', () => {
      if (this.isTyping) this.skipTyping();
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
      item.addEventListener('click', () => {
        const key = item.dataset.resource;
        // Controller decides whether the click is valid for the current scene.
        this.controller.handleInventoryClick(key);
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
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn      = document.getElementById('mute-btn');
    const muteIcon     = document.getElementById('mute-icon');

    if (!volumeSlider || !muteBtn) return;

    let isMuted     = false;
    let lastVolume  = 0.6;

    // Restore persisted volume before attaching listeners
    const savedVolume = parseFloat(localStorage.getItem('bunker72_volume'));
    if (!isNaN(savedVolume)) {
      lastVolume            = savedVolume;
      volumeSlider.value    = savedVolume;
      audio._lastVolume     = savedVolume;
    }

    volumeSlider.addEventListener('input', () => {
      lastVolume        = parseFloat(volumeSlider.value);
      audio._lastVolume = lastVolume;
      // ✅ No audio.init() here — context is already running.
      audio.setVolume(lastVolume);
      isMuted           = lastVolume === 0;
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
      localStorage.setItem('bunker72_volume', lastVolume);
    });

    muteBtn.addEventListener('click', () => {
      isMuted              = !isMuted;
      audio._lastVolume    = lastVolume;
      audio.setMuted(isMuted);
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
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
    const isDay4  = hour > 72 || currentSceneId.startsWith('day4');
    const maxHour = isDay4 ? 96 : 72;
    const day     = clamp(Math.floor(hour / 24) + 1, 1, 4);
    const progress = clamp((hour / maxHour) * 100, 0, 100);

    this.dom.statusTime.textContent      = scene.hour;
    this.dom.statusDay.textContent       = day;
    this.dom.statusKnowledge.textContent = knowledge;

    if (this.dom.statusHunger) this.dom.statusHunger.textContent = Math.round(hunger);
    if (this.dom.statusThirst) this.dom.statusThirst.textContent = Math.round(thirst);
    if (this.dom.statusHealth) this.dom.statusHealth.textContent = Math.round(health);

    this.dom.statusProgressBar.style.width   = `${progress}%`;
    this.dom.statusObjective.textContent     = scene.objective || 'Ambil keputusan paling aman untuk keluarga.';
    this.dom.statusAir.textContent           = knowledge <= 4 ? 'KRITIS' : knowledge <= 8 ? 'WASPADA' : 'STABIL';

    // Structure status
    let structureText = 'AMAN';
    if (currentSceneId === 'ending_secret_bad' || currentSceneId === 'ending_fatal') {
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
  renderSceneArt(scene) {
    const bgClassMap = { prolog: 'bg-prolog', hari1: 'bg-hari1', normal: 'bg-hari1', rusak: 'bg-rusak' };

    this.dom.storyBox.classList.remove('bg-prolog', 'bg-hari1', 'bg-normal', 'bg-rusak', 'scene-alert',
      'speaker-ayah', 'speaker-ibu', 'speaker-anak', 'speaker-narrator');

    this.dom.storyBox.closest('#game-view')?.classList.toggle('prolog-mode', scene.background === 'prolog');
    document.body.classList.toggle('prolog-active', scene.background === 'prolog');

    this.dom.storyBox.classList.add(bgClassMap[scene.background] || 'bg-hari1');
    if (scene.alert) this.dom.storyBox.classList.add('scene-alert');
  }

  /**
   * Updates speaker name, avatar image, and dialogue box speaker CSS class.
   * @param {object} scene
   */
  renderSpeaker(scene) {
    const avatarKey   = scene.avatar || 'narrator';
    const avatarUrl   = AVATARS[avatarKey];
    const speakerClass = ['ayah', 'ibu', 'anak'].includes(avatarKey) ? `speaker-${avatarKey}` : 'speaker-narrator';

    this.dom.speakerName.textContent = scene.speaker;
    this.dom.storyBox.classList.remove('speaker-ayah', 'speaker-ibu', 'speaker-anak', 'speaker-narrator');
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
        alertEl.style.position = 'absolute';
        alertEl.style.top = '72px';
        alertEl.style.left = '50%';
        alertEl.style.transform = 'translateX(-50%)';
        alertEl.style.backgroundColor = 'rgba(8, 9, 11, 0.95)';
        alertEl.style.border = '2px solid var(--accent-red-border)';
        alertEl.style.color = 'var(--accent-red-border)';
        alertEl.style.padding = '8px 16px';
        alertEl.style.fontFamily = "'Share Tech Mono', 'Courier New', monospace";
        alertEl.style.fontSize = '0.95rem';
        alertEl.style.fontWeight = 'bold';
        alertEl.style.zIndex = '999';
        alertEl.style.textAlign = 'center';
        alertEl.style.boxShadow = '0 0 15px rgba(255, 93, 93, 0.4)';
        alertEl.style.letterSpacing = '1px';
        alertEl.style.pointerEvents = 'none';
        container.appendChild(alertEl);
      }
      alertEl.textContent = `⚠️ PERINGATAN SISTEM: ${alertTag} ⚠️`;
      alertEl.style.display = 'block';
    } else {
      if (alertEl) {
        alertEl.style.display = 'none';
      }
    }
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
    if (!choices?.length) return;

    // Prolog gets a special full-width continue button
    if (currentSceneId === 'prolog_intro') {
      const btn       = document.createElement('button');
      btn.className   = 'prolog-continue';
      btn.textContent = 'Klik untuk masuk ke bunker';
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

      const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;

      // Wire up visual impact class based on knowledge effect
      let impactClass = 'choice-neutral';
      if (effect > 0) impactClass = 'choice-good';
      if (effect < 0) impactClass = 'choice-risk';

      const btn       = document.createElement('button');
      btn.className   = `choice-btn ${impactClass}`;
      btn.innerHTML   = `
        <span class="choice-index">${renderedIndex}</span>
        <span class="choice-copy">${choice.text}</span>
      `;
      renderedIndex++;

      if (choice.item) btn.dataset.item = choice.item;
      btn.addEventListener('click', () => onChoiceClick(choice));
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
      .map(({ hour, text, effect, choiceId }) => {
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

        return `<p class="${itemClass}"><span>[${hour}]</span> <span>${text}</span>${badge}</p>`;
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

    this.activeText           = text;
    this.isTyping             = true;
    this._pendingChoicesPayload = choicesPayload;
    this.dom.dialogueText.textContent = '';

    let currentIndex   = 0;
    let lastTimestamp  = null;
    const CHAR_INTERVAL = 32; // ms per character

    const frame = (timestamp) => {
      if (!this.isTyping) return;

      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed    = timestamp - lastTimestamp;
      const charsToAdd = Math.floor(elapsed / CHAR_INTERVAL);

      if (charsToAdd > 0) {
        lastTimestamp = timestamp - (elapsed % CHAR_INTERVAL);
        for (let i = 0; i < charsToAdd && currentIndex < text.length; i++) {
          const char = text[currentIndex];
          this.dom.dialogueText.textContent += char;
          // Emit a click sound on every other non-whitespace character
          if (char.trim() && currentIndex % 2 === 0) {
            this.controller.audio.playClick();
          }
          currentIndex++;
        }
      }

      if (currentIndex < text.length) {
        this.typingRafId = requestAnimationFrame(frame);
      } else {
        this.isTyping    = false;
        this.typingRafId = null;
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

    this.dom.dialogueText.textContent = this.activeText;
    this.isTyping                     = false;

    // Re-render choices from the payload stored when typeText() was called.
    const p = this._pendingChoicesPayload;
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
  renderEnding(endingId, finalKnowledge, endingText, endingSummary, flags = {}) {
    this.dom.endingKnowledge.textContent = finalKnowledge;
    this.dom.endingDesc.textContent      = endingText;
    this.dom.endingSummary.textContent   = endingSummary;

    this.dom.endingTitle.classList.remove('ending-bad', 'ending-normal', 'ending-best');
    this.dom.endingView.classList.remove('ending-bg-bad', 'ending-bg-normal', 'ending-bg-best', 'ending-bg-fatal');

    const ENDING_CONFIG = {
      ending_bad: {
        title:      'ENDING BURUK: PENYELAMATAN DARURAT KRITIS',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-bad',
        grade:      'PERINGKAT KESIAPSIAGAAN: KURANG (Keluarga Butuh Perawatan Intensif)',
        gradeColor: 'var(--accent-red-border)',
      },
      ending_normal: {
        title:      'ENDING NORMAL: BERTAHAN HIDUP DENGAN LUKA',
        titleClass: 'ending-normal',
        bgClass:    'ending-bg-normal',
        grade:      'PERINGKAT KESIAPSIAGAAN: CUKUP (Keluarga Terluka/Dehidrasi)',
        gradeColor: 'var(--warning-yellow-border)',
      },
      ending_best: {
        title:      'ENDING TERBAIK: SELAMAT & PRIMA',
        titleClass: 'ending-best',
        bgClass:    'ending-bg-best',
        grade:      'PERINGKAT KESIAPSIAGAAN: SANGAT BAIK (Keluarga Sehat & Selamat)',
        gradeColor: 'var(--accent-green-border)',
      },
      ending_fatal: {
        title:      'ENDING FATAL: MAKAM BUNKER 72',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-fatal',
        grade:      'PERINGKAT KESIAPSIAGAAN: SANGAT BURUK (Keluarga Gugur/Bunker Kebobolan)',
        gradeColor: 'var(--accent-red-border)',
      },
      ending_secret_best: {
        title:      'ENDING RAHASIA: PENYELAMATAN SEMPURNA',
        titleClass: 'ending-best',
        bgClass:    'ending-bg-best',
        grade:      'PERINGKAT KESIAPSIAGAAN: LEGENDA (Keluarga Sehat, Aman & Selamat 96 Jam)',
        gradeColor: 'var(--accent-green-border)',
      },
      ending_secret_bad: {
        title:      'ENDING RAHASIA: GUGUR DI GARIS AKHIR',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-fatal',
        grade:      'PERINGKAT KESIAPSIAGAAN: GAGAL (Krisis Hari Ke-4 Melumpuhkan Keluarga)',
        gradeColor: 'var(--accent-red-border)',
      },
    };

    const cfg = ENDING_CONFIG[endingId];
    if (!cfg) return;

    this.dom.endingTitle.textContent         = cfg.title;
    this.dom.endingTitle.classList.add(cfg.titleClass);
    this.dom.endingView.classList.add(cfg.bgClass);
    this.dom.endingGradeText.textContent     = cfg.grade;
    this.dom.endingGradeText.style.color     = cfg.gradeColor;

    // Dynamic debrief list generation based on flag history
    const debriefList = document.getElementById('debrief-list');
    const debriefBox = document.getElementById('debrief-box');
    if (debriefList && debriefBox) {
      debriefList.innerHTML = '';
      const bullets = [];

      if (flags.air_uninspected === true) {
        bullets.push("<strong>Mitigasi Katup Udara:</strong> Inspeksi segel karet katup ventilasi secara fisik sangat krusial pasca-bencana. Menyalakan filtrasi tanpa pengecekan katup bypass menyedot abu PM2.5 beracun langsung dari luar.");
      } else {
        bullets.push("<strong>Optimal - Filtrasi Udara:</strong> Penggantian segel katup secara proaktif berhasil mengisolasi gas permukaan dari ruang utama bunker.");
      }

      if (flags.water_filtered === true && flags.water_ruined !== true) {
        bullets.push("<strong>Optimal - Pemurnian Air:</strong> Penggunaan filter karbon aktif dan tablet klorin terbukti efektif mengendapkan kontaminan logam berat dari tangki air pipa yang tercemar.");
      } else {
        bullets.push("<strong>Mitigasi Kimiawi Air:</strong> Merebus air berbau logam tidak menghilangkan senyawa kimia berat terlarut; penguapan justru memusatkan konsentrasi racunnya. Selalu saring dengan karbon aktif.");
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
  }
}
