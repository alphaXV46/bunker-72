/**
 * storyEngine.js — Controller Layer
 *
 * Responsibilities:
 *  - Orchestrate flow between GameModel (state), GameView (DOM), and RetroAudio (audio).
 *  - Translate user events into model mutations and view updates.
 *  - Never touch the DOM directly — delegate all rendering to GameView.
 *
 * Dependencies: GameModel, GameView, RetroAudio, constants.js.
 */

import { GameModel  } from './gameModel.js';
import { GameView   } from './gameView.js';
import { RetroAudio } from './retroAudio.js';
import { ENDING_IDS, SURVIVAL, parseHour } from './constants.js';

// ─── RADIO SCENES ───────────────────────────────────────────────────────────
// Scenes during which the radio SFX should play on entry.
const RADIO_SCENES = new Set(['day2_radio_setup', 'day2_radio_save', 'day3_signal_bad', 'day3_start', 'day3_water_issue']);

export class StoryEngine {
  /**
   * @param {object}   options
   * @param {object}   options.storyData  - Parsed story.json content.
   * @param {object}   options.dom        - DOM element references passed from main.js.
   * @param {Function} options.onSave     - Callback receiving a single saveData object.
   * @param {Function} options.onEnd      - Callback invoked when the game reaches an ending.
   */
  constructor(options) {
    this.storyData = options.storyData;
    this.dom       = options.dom;
    this.onSave    = options.onSave;
    this.onEnd     = options.onEnd;

    this.model = new GameModel();
    this.view  = new GameView(this.dom);
    this.audio = new RetroAudio();

    this._journalSetup = false;
    this._volumeSetup  = false;

    this.view.init(this);
  }

  /**
   * Initializes the model and begins rendering from the given scene.
   * Called for both new games and save-file loads.
   */
  start(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health) {
    this.model.init(sceneId, knowledge, history, flags, inventory, hunger, thirst, health);

    // One-time UI setups — guarded so restarting doesn't re-bind listeners.
    if (!this._journalSetup) {
      this.view.setupJournalToggle();
      this._journalSetup = true;
    }
    if (!this._volumeSetup) {
      this.view.setupVolumeControl(this.audio);
      this._volumeSetup = true;
    }

    this.view.renderProtocolLog(this.model.history);
    this.renderScene(this.model.currentSceneId);
  }

  // ─── SCENE RENDERING ──────────────────────────────────────────────────────

  /**
   * Resolves trigger scenes, updates model state, fires audio, and commands
   * the view to render the new scene.
   * @param {string} sceneId
   */
  renderScene(sceneId) {
    // Check health-zero fatal condition first, regardless of incoming scene.
    if (this._checkFatalCondition(sceneId)) return;

    // Resolve logic-trigger pseudo-scenes before doing anything else.
    if (sceneId === 'trigger_ending_eval') {
      this.renderScene(this.model.evaluateEnding());
      return;
    }
    if (sceneId === 'trigger_secret_ending_eval') {
      this.renderScene(this.model.evaluateSecretEnding());
      return;
    }
    if (sceneId === 'trigger_scavenge_eval') {
      const success = this.model.evaluateScavenge();
      this.renderScene(success ? 'day2_scavenge_success' : 'day2_scavenge_fail');
      return;
    }
    if (sceneId === 'day3_pinch_water_resolved') {
      const isFiltered = this.model.flags.water_filtered === true;
      const target = (isFiltered && !this.model.flags.water_ruined) ? 'day3_water_filter' : 'day3_water_poisoned';
      this.model.flags.structural_damage = true;
      this.model.health = Math.max(0, this.model.health - 15);
      this.renderScene(target);
      return;
    }
    if (sceneId === 'day3_pinch_vent_inspected') {
      // Optimal choice: vent secured successfully without punishing the player.
      this.renderScene('day3_vent_success_water_check');
      return;
    }

    const scene = this.storyData.scenes[sceneId];
    if (!scene) {
      console.error(`[StoryEngine] Scene "${sceneId}" not found in story data.`);
      return;
    }

    // Parse bracketed system alert prefix at the very start of scene.text
    let alertTag = null;
    let dialogueText = scene.text || '';
    const alertMatch = dialogueText.match(/^\[([^\]]+)\]/);
    if (alertMatch) {
      alertTag = alertMatch[1];
      dialogueText = dialogueText.slice(alertMatch[0].length).trim();
    }

    // Apply time-based survival stat decay for non-ending scenes.
    const prevHour   = parseHour(this.storyData.scenes[this.model.currentSceneId]?.hour);
    const currHour   = parseHour(scene.hour);
    const elapsed    = currHour - prevHour;
    const isEnding   = ENDING_IDS.includes(sceneId);

    if (elapsed > 0 && !isEnding && sceneId !== 'day1_start') {
      this.model.updateSurvivalStats(elapsed);
      if (this._checkFatalCondition(sceneId)) return;
    }

    // Commit new scene to model.
    this.model.currentSceneId = sceneId;

    // ── Audio ──
    if (!isEnding && RADIO_SCENES.has(sceneId)) {
      this.audio.playRadioSound();
    } else {
      this.audio.stopRadioSound();
    }
    if (['day2_start', 'day2_damage_check', 'day4_intro'].includes(sceneId)) {
      this.audio.playRumble();
    }
    if (this.model.knowledge <= 4 || isEnding && this._isCollapseEnding(sceneId) || scene.alert === true) {
      this.audio.playAlarm();
    }

    // ── Save ──
    if (!isEnding && this.onSave) {
      // ✅ Single-object save: model serializes itself via toSaveData().
      this.onSave(this.model.toSaveData());
    }

    // ── Ending path ──
    if (isEnding) {
      this.view.renderSystemAlert(null);
      // Persist game completed state to unlock NG+
      localStorage.setItem('bunker72_game_completed', 'true');
      // Force render of entire protocol log with analytics quality tags
      this.view.renderProtocolLog(this.model.history, true);
      // Auto-open journal panel so player immediately views analytics
      this.view.openJournal();

      if (this.onEnd) {
        let endingText = scene.text;
        if (sceneId === 'ending_secret_bad') {
          endingText = this.model.getSecretBadEndingText();
        }
        this.onEnd(sceneId, this.model.knowledge, endingText, this.model.getEndingSummary(), this.model.flags, this.model.history);
      }
      return;
    }

    // ── View updates ──
    const isDisabledScene = this.model.isInventoryDisabledScene(sceneId);

    this.view.renderHud(scene, this.model.knowledge, sceneId, this.model.flags,
      this.model.hunger, this.model.thirst, this.model.health);

    // Pass pre-computed boolean — View does not need the model reference.
    this.view.updateInventoryUI(isDisabledScene, this.model.inventory);
    this.view.renderSceneArt(scene);
    this.view.renderSpeaker(scene);
    this.view.renderSystemAlert(alertTag);

    // Build choices payload for use by typeText and skipTyping.
    const choicesPayload = {
      choices:       scene.choices,
      currentSceneId: sceneId,
      flags:         this.model.flags,
      onChoiceClick: (choice) => this.handleChoiceSelect(choice),
    };

    // Process text narrative modifications
    const modifiedText = this.processNarrativeText(sceneId, dialogueText, scene.speaker);

    this.view.dom.choicesPanel.innerHTML = '';
    // Pass choicesPayload so skipTyping can render choices without model access.
    this.view.typeText(modifiedText, () => {
      this.view.renderChoices(
        scene.choices, sceneId, this.model.flags,
        (choice) => this.handleChoiceSelect(choice)
      );
    }, choicesPayload);
  }

  // ─── USER EVENT HANDLERS ──────────────────────────────────────────────────

  /**
   * Handles a player's choice selection.
   * If text is still typing, skip it and defer the actual choice.
   * @param {object} choice - Choice object from story.json.
   */
  handleChoiceSelect(choice) {
    if (this.view.isTyping) {
      this.view.skipTyping();
      return;
    }

    const prevHealth = this.model.health;

    // Apply knowledge effect (clamped to [0, KNOWLEDGE_MAX]).
    const effect         = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
    this.model.knowledge = Math.max(0, Math.min(SURVIVAL.KNOWLEDGE_MAX, this.model.knowledge + effect));
    this.view.pulseKnowledge(effect);

    // Severe Choice Consequences mapping
    if (choice.id === 'c_day3_water_boil' || choice.id === 'c_day3_water_settle') {
      this.model.health = Math.max(0, this.model.health - 30);
      this.model.flags.water_poisoned = true;
    }
    if (choice.id === 'c_day2_leak_cloth' || choice.id === 'c_day2_leak_fan') {
      this.model.health = Math.max(0, this.model.health - 20);
      this.model.flags.smoke_poisoned = true;
    }
    if (choice.id === 'c_day4_oxygen_vent') {
      this.model.health = Math.max(0, this.model.health - 30);
      this.model.flags.oxygen_depleted = true;
    }
    if (choice.id === 'c_day4_looters_barter') {
      this.model.flags.looters_breached = true;
    }

    // Panic-exit incurs a direct health penalty.
    if (choice.id === 'c_day2_panic_exit') {
      this.model.health = Math.max(0, this.model.health - SURVIVAL.PANIC_HEALTH_PENALTY);
    }

    // Record decision in history.
    this.model.history.push({
      hour:     this.storyData.scenes[this.model.currentSceneId]?.hour ?? '--',
      text:     choice.log || choice.text,
      choiceId: choice.id  ?? null,
      effect,
    });

    // Activate any flags declared on this choice.
    if (choice.setFlags?.length) {
      choice.setFlags.forEach((f) => { this.model.flags[f] = true; });
    }

    this.view.renderProtocolLog(this.model.history);

    const healthDelta = prevHealth - this.model.health;
    if (healthDelta > 15) {
      this.view.triggerShake();
      this.audio.playDamageAlert();
    }

    // Play appropriate SFX.
    const isBadChoice = effect < 0 || choice.id === 'c_day2_panic_exit'
      || (choice.nextSceneId?.includes('bad') ?? false);
    isBadChoice ? this.audio.playBadChoice() : this.audio.playClick();

    this.renderScene(choice.nextSceneId);
  }

  /**
   * Handles a player clicking an inventory item.
   * Delegates scene-disabled check to the model; view receives results via parameters.
   * @param {string} key - Inventory item key ('food', 'drink', 'kit', 'radio').
   */
  handleInventoryClick(key) {
    // Guard: inventory is disabled during ending/eval scenes.
    if (this.model.isInventoryDisabledScene(this.model.currentSceneId)) return;

    if (key === 'radio') {
      // Radio always plays its sound when clicked — no duplicate branch needed.
      this.audio.playRadioSound();
      return;
    }

    const result = this.model.useInventoryItem(key);
    if (!result) return; // Item not available

    const scene = this.storyData.scenes[this.model.currentSceneId];
    this.model.history.push({
      hour:     scene?.hour ?? '--',
      text:     `Menggunakan ${result.label} dari inventaris: ${result.effectText}`,
      choiceId: null,
      effect:   0,
    });

    this.audio.playClick();
    this.view.renderProtocolLog(this.model.history);

    if (this._checkFatalCondition(this.model.currentSceneId)) return;

    const isDisabledScene = this.model.isInventoryDisabledScene(this.model.currentSceneId);
    if (scene) {
      this.view.renderHud(scene, this.model.knowledge, this.model.currentSceneId, this.model.flags,
        this.model.hunger, this.model.thirst, this.model.health);
      this.view.updateInventoryUI(isDisabledScene, this.model.inventory);
    }

    if (!ENDING_IDS.includes(this.model.currentSceneId) && this.onSave) {
      this.onSave(this.model.toSaveData());
    }
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  /**
   * If health has reached zero, redirect to the fatal ending immediately.
   * @param {string} sceneId
   * @returns {boolean} true if a redirect was triggered.
   * @private
   */
  _checkFatalCondition(sceneId) {
    if (this.model.health <= 0 && sceneId !== 'ending_fatal') {
      this.model.health = 0;
      this.renderScene('ending_fatal');
      return true;
    }
    return false;
  }

  /**
   * Returns true for endings that visually represent structure collapse.
   * Used to conditionally trigger alarm audio.
   * @param {string} sceneId
   * @returns {boolean}
   * @private
   */
  _isCollapseEnding(sceneId) {
    return sceneId === 'ending_secret_bad' || sceneId === 'ending_fatal';
  }

  /**
   * Resolve dynamic state-conditional text blocks defined in story.json.
   * @param {string} sceneId
   * @param {string} rawText
   * @param {string} speaker
   * @returns {string}
   */
  processNarrativeText(sceneId, rawText, speaker) {
    let processedText = rawText;

    const scene = this.storyData.scenes[sceneId];
    if (scene) {
      if (Array.isArray(scene.conditionalText)) {
        scene.conditionalText.forEach((cond) => {
          if (cond.requiredFlag && this.model.flags[cond.requiredFlag] === true) {
            if (cond.position === 'prepend') {
              processedText = cond.text + processedText;
            } else {
              processedText = processedText + cond.text;
            }
          }
        });
      }

      if (Array.isArray(scene.statConditions)) {
        scene.statConditions.forEach((cond) => {
          const actualVal = this.model[cond.stat];
          let met = false;
          switch (cond.operator) {
            case 'lt': met = actualVal < cond.value; break;
            case 'lte': met = actualVal <= cond.value; break;
            case 'gt': met = actualVal > cond.value; break;
            case 'gte': met = actualVal >= cond.value; break;
            case 'eq': met = actualVal === cond.value; break;
          }
          if (met) {
            if (cond.position === 'prepend') {
              processedText = cond.text + processedText;
            } else {
              processedText = processedText + cond.text;
            }
          }
        });
      }
    }

    return processedText;
  }
}
