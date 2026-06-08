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

import { clamp, parseHour, POWER_THRESHOLDS, CHOICE_QUALITY_MAP, getTimePhase, getKnowledgeLabel, FACTS_MAP } from './constants.js';

// ─── AVATAR ASSET MAP ───────────────────────────────────────────────────────
const AVATARS = {
  ayah:     new URL('../assets/avatar_ayah.png',     import.meta.url).href,
  ibu:      new URL('../assets/avatar_ibu.png',      import.meta.url).href,
  anak:     new URL('../assets/avatar_anak.png',     import.meta.url).href,
  narrator: new URL('../assets/avatar_narrator.png', import.meta.url).href,
};

const PACKING_ITEMS = {
  food:  { image: new URL('../assets/food_icon.png',  import.meta.url).href, label: 'Makanan Kaleng' },
  drink: { image: new URL('../assets/drink_icon.png', import.meta.url).href, label: 'Air Bersih' },
  kit:   { image: new URL('../assets/kit_icon.png',   import.meta.url).href, label: 'Kotak P3K' },
  radio: { image: new URL('../assets/radio_icon.png', import.meta.url).href, label: 'Radio Portable' },
  snack: { image: new URL('../assets/snacks.png',     import.meta.url).href, label: 'Snack' },
  toy:   { image: new URL('../assets/car_toy.png',    import.meta.url).href, label: 'Mainan Anak' },
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
      if (this.isTyping) {
        this.skipTyping();
      } else {
        this.controller.handleDialogueClick();
      }
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
    const bgClassMap = {
      packing: 'bg-prolog-1',
      prolog: 'bg-prolog-1',
      prolog1: 'bg-prolog-1',
      prolog2: 'bg-prolog-2',
      prolog3: 'bg-prolog-3',
      prolog4: 'bg-prolog-4',
      titlecard: 'bg-titlecard',
      hari1: 'bg-day1',
      normal: 'bg-day1',
      rusak: 'bg-rusak',
    };

    const ENV_CLASSES = ['env-dusty', 'env-smoky', 'env-damaged', 'env-dim'];
    Array.from(this.dom.storyBox.classList)
      .filter((className) => className.startsWith('scene-id-'))
      .forEach((className) => this.dom.storyBox.classList.remove(className));

    this.dom.storyBox.classList.remove(
      'bg-prolog', 'bg-prolog-1', 'bg-prolog-2', 'bg-prolog-3', 'bg-prolog-4',
      'bg-titlecard', 'bg-hari1', 'bg-day1', 'bg-normal', 'bg-rusak', 'scene-alert',
      'speaker-ayah', 'speaker-ibu', 'speaker-anak', 'speaker-narrator',
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
    this.dom.choicesPanel.classList.remove('packing-grid');
    if (!choices?.length) return;

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

      const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;

      // Wire up visual impact class based on knowledge effect
      const impactClass = 'choice-neutral';

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
          factHtml = `<br><span class="log-fact" style="color: var(--warning-yellow-border); font-size: 0.82rem; padding-left: 10px; display: inline-block; font-style: italic;">⚠️ Mitigasi: ${fact}</span>`;
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
    if (p?.autoAdvance) {
      p.autoAdvance();
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
  renderEnding(endingId, finalKnowledge, endingText, endingSummary, flags = {}, history = []) {
    const endingKnowledgeParent = this.dom.endingKnowledge.parentElement;
    if (endingKnowledgeParent) {
      endingKnowledgeParent.innerHTML = `Skor Kesiapsiagaan Bencana: <span id="ending-knowledge" class="highlight-val">${finalKnowledge}</span> / 15 [${getKnowledgeLabel(finalKnowledge)}]`;
      this.dom.endingKnowledge = document.getElementById('ending-knowledge');
    }
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
      ending_near_miss: {
        title:      'ENDING NYARIS: SATU KESALAHAN FATAL',
        titleClass: 'ending-normal',
        bgClass:    'ending-bg-normal',
        grade:      'PERINGKAT KESIAPSIAGAAN: CUKUP (Dievakuasi Dengan Cedera Parah)',
        gradeColor: 'var(--warning-yellow-border)',
      },
      ending_stranded_bad: {
        title:      'ENDING BURUK: TERDAMPAR TANPA HARAPAN',
        titleClass: 'ending-bad',
        bgClass:    'ending-bg-fatal',
        grade:      'PERINGKAT KESIAPSIAGAAN: GAGAL (Keluarga Terdampar & Gugur)',
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
        <span class="packing-item-glow"></span>
        <img src="${item.image}" alt="${item.label}">
        <span>${item.label}</span>
      `;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('packing-picked')) return;
        btn.classList.add('packing-picked');
        window.setTimeout(() => onChoiceClick(choice), 420);
      });
      this.dom.choicesPanel.appendChild(btn);
    });
  }
}
