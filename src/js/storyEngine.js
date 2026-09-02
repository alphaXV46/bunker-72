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
import { BunkerMinigame } from './bunkerMinigame.js';
import { ENDING_IDS, parseHour } from './constants.js';
import { getExpeditionConfig, EXPEDITION_CONFIGS } from './expeditionConfig.js';

// ─── RADIO SCENES ───────────────────────────────────────────────────────────
// Scenes during which the radio SFX should play on entry.
const RADIO_SCENES = new Set(['day3_start', 'day3_radio_rescue']);
const DAY1_HOTSPOTS = Object.freeze([
  { id: 'supply', flag: 'inspected_supply', label: 'Lemari Persediaan', x: 29, y: 23, w: 24, h: 34, text: 'Rak persediaan masih tertata. Satu kaleng makanan dan botol air bisa dipindahkan ke meja kerja tanpa mengusik cadangan utama.', reward: { item: 'food', amount: 1 } },
  { id: 'medical', flag: 'inspected_medical', label: 'Loker Medis', x: 58, y: 45, w: 12, h: 19, text: 'Loker P3K berisi kasa dan antiseptik yang masih kering. Kotak ini mudah dijangkau bila ada yang terluka.', reward: { item: 'kit', amount: 1 } },
  { id: 'ventilation', flag: 'inspected_ventilation', label: 'Ventilasi', x: 57, y: 18, w: 12, h: 20, text: 'Kisi ventilasi berdebu, tetapi di balik panel ada filter cadangan yang belum terpasang. Pengetahuan teknis +1.', knowledge: 1, setFlags: ['found_spare_filter'] },
  { id: 'power', flag: 'inspected_power', label: 'Panel Daya', x: 25, y: 24, w: 6, h: 14, text: 'Panel daya menyala stabil. Menandai sakelar pemutus utama akan mempercepat respons jika arus kembali melonjak. Pengetahuan teknis +1.', knowledge: 1 },
  { id: 'radio', flag: 'inspected_radio', label: 'Radio VHF', x: 34, y: 62, w: 13, h: 12, text: 'Radio VHF masih menerima dengung statik. Frekuensi darurat bisa dicari nanti, setelah udara benar-benar aman.' },
  { id: 'family_storage', flag: 'inspected_family_storage', label: 'Penyimpanan Keluarga', x: 84, y: 73, w: 13, h: 18, text: 'Kotak penyimpanan keluarga berisi selimut dan foto lama. Menaruhnya dekat dipan membuat malam pertama terasa sedikit lebih manusiawi.' },
]);
const EXPEDITION_LOCATIONS = Object.freeze(Object.values(EXPEDITION_CONFIGS).map(({ id, label, risk, resourceHint }) => ({ id, label, risk, resourceHint })));

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
    this.pendingClickNextSceneId = null;
    this.pendingBunkerEntryChoice = null;
    this.pendingMinigameChoice = null;
    this.bunkerEntryUnlocked = false;
    this._unlockedMinigameChoiceIds = new Set();

    this.bunkerMinigame = new BunkerMinigame({
      root: this.dom.bunkerMinigame,
      onComplete: () => this.finishBunkerEntry(),
    });

    this._journalSetup = false;
    this._volumeSetup  = false;
    this._debugBypassSave = false;

    this.view.init(this);
  }

  /**
   * Initializes the model and begins rendering from the given scene.
   * Called for both new games and save-file loads.
   */
  start(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health, expeditionVisitedLocations = []) {
    this.model.init(sceneId, knowledge, history, flags, inventory, hunger, thirst, health, expeditionVisitedLocations);
    this.pendingClickNextSceneId = null;
    this.pendingBunkerEntryChoice = null;
    this.pendingMinigameChoice = null;
    this.bunkerEntryUnlocked = false;
    this._unlockedMinigameChoiceIds?.clear();
    this.bunkerMinigame?.close();
    this.radioMiniGame?.resetFinalResult();

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
    if (sceneId === 'ending_eval' || sceneId === 'trigger_ending_eval') {
      this.renderScene(this.model.evaluateEnding());
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

    if (elapsed > 0 && !isEnding) {
      this.model.updateSurvivalStats(elapsed);
      if (this._checkFatalCondition(sceneId)) return;
    }

    // Commit new scene to model.
    this.model.currentSceneId = sceneId;

    // ── Audio ──
    const isDomestic = ['prolog_home', 'prolog_with_ibu', 'prolog_with_anak'].includes(sceneId);
    if (isDomestic) {
      this.audio.playDomesticPeace();
      this.audio.playClockTick();
    } else if (sceneId === 'prolog_radio_peaceful') {
      this.audio.playDomesticPeace();
      this.audio.playRadioChime();
    } else {
      this.audio.stopDomesticPeace();
    }

    if (sceneId === 'prolog_foreshadow') {
      this.audio.playRadioStatic();
      this.audio.playForeshadowTremor();
    }

    if (!isEnding && RADIO_SCENES.has(sceneId)) {
      this.audio.playRadioSound();
    } else {
      this.audio.stopRadioSound();
    }

    if (scene.background === 'prolog4' || sceneId === 'day2_start') {
      this.audio.playEarthquake();
    }

    if (['prolog_alert', 'prolog_question'].includes(sceneId) || this.model.knowledge <= 4 || isEnding && this._isCollapseEnding(sceneId) || scene.alert === true) {
      this.audio.playAlarm();
    }

    // ── Save ──
    if (!isEnding && this.onSave && !this._debugBypassSave) {
      // ✅ Single-object save: model serializes itself via toSaveData().
      this.onSave(this.model.toSaveData());
    }

    // ── Ending path ──
    if (isEnding) {
      this.view.renderSystemAlert(null);
      // Persist game completed state to unlock NG+
      localStorage.setItem('bunker72_game_completed', 'true');
      // Preserve the player's full decision record without scoring it morally.
      this.view.renderProtocolLog(this.model.history, true);
      // Auto-open journal panel so player immediately views analytics
      this.view.openJournal();

      if (this.onEnd) {
        const modular = this.model.evaluateModularEnding();
        this.onEnd(sceneId, modular.bnpbScore, scene.text, this.model.getEndingSummary(), this.model.flags, this.model.history, modular);
      }
      return;
    }

    // ── View updates ──
    const isDisabledScene = this.model.isInventoryDisabledScene(sceneId);

    this.view.renderHud(scene, this.model.knowledge, sceneId, this.model.flags,
      this.model.hunger, this.model.thirst, this.model.health);

    // Pass pre-computed boolean — View does not need the model reference.
    this.view.updateInventoryUI(isDisabledScene, this.model.inventory);
    this.view.renderSceneArt(scene, this.model.flags, sceneId);
    this.view.renderSpeaker(scene);
    this.view.renderSystemAlert(alertTag);

    // Build choices payload for use by typeText and skipTyping.
    const choicesPayload = {
      choices:       this._prepareSceneChoices(scene.choices),
      currentSceneId: sceneId,
      flags:         this.model.flags,
      onChoiceClick: (choice) => this.handleChoiceSelect(choice),
    };

    // Process text narrative modifications
    const modifiedText = this.processNarrativeText(sceneId, dialogueText, scene.speaker);
    const canReviewThisScene = scene.choices?.length > 0 && !sceneId.startsWith('prolog_') && sceneId !== 'prolog_title';
    this.view.captureNarrative(scene, modifiedText, sceneId, canReviewThisScene);

    this.view.dom.choicesPanel.innerHTML = '';
    this.pendingClickNextSceneId = null;

    if (sceneId === 'prolog_packing') {
      this.view.dom.dialogueText.textContent = '';
      this.view.isTyping = false;
      this.view.startScavengerMinigame((result) => this.handleScavengerComplete(result));
      return;
    }

    if (sceneId === 'day1_inspection') {
      const showInspection = () => this.view.renderDay1Hotspots(
        DAY1_HOTSPOTS,
        this.model.flags,
        (hotspotId) => this.handleDay1Inspection(hotspotId),
        () => this.renderScene('day1_lockdoor')
      );
      this.view.typeText(modifiedText, showInspection, { ...choicesPayload, choices: [], inspectionReady: showInspection });
      return;
    }

    if (sceneId === 'day2_expedition_map') {
      const showMap = () => this.view.renderExpeditionMap(
        EXPEDITION_LOCATIONS,
        this.model.expeditionVisitedLocations,
        Math.max(0, 2 - this.model.expeditionVisitedLocations.length),
        (locationId) => this.startExpedition(locationId)
      );
      this.view.typeText(modifiedText, showMap, { ...choicesPayload, choices: [], expeditionMapReady: showMap });
      return;
    }

    if (scene.autoNextSceneId) {
      const isClickToContinueProlog = sceneId.startsWith('prolog_') && sceneId !== 'prolog_title';
      if (isClickToContinueProlog) {
        this.view.typeText(modifiedText, () => {
          this.pendingClickNextSceneId = scene.autoNextSceneId;
        }, {
          ...choicesPayload,
          choices: [],
          clickNextSceneId: scene.autoNextSceneId,
        });
        return;
      }

      const delay = typeof scene.autoAdvanceDelay === 'number' ? scene.autoAdvanceDelay : 1100;
      const autoAdvance = () => {
        window.setTimeout(() => this.renderScene(scene.autoNextSceneId), delay);
      };
      this.view.typeText(modifiedText, autoAdvance, {
        ...choicesPayload,
        choices: [],
        autoAdvance,
      });
      return;
    }

    // Pass choicesPayload so skipTyping can render choices without model access.
    this.view.typeText(modifiedText, () => {
      this.view.renderChoices(
        choicesPayload.choices, sceneId, this.model.flags,
        (choice) => this.handleChoiceSelect(choice)
      );

      if (scene.autoTriggerRadio === true) {
        setTimeout(() => {
          this.radioMiniGame?.open();
        }, 400);
      }
    }, choicesPayload);
  }

  // ─── USER EVENT HANDLERS ──────────────────────────────────────────────────

  /**
   * Handles completion of 2D Top-Down Scavenger Minigame.
   * @param {object} result - { collectedItems: string[], reason: string }
   */
  handleScavengerComplete(result) {
    const items = result?.collectedItems || [];
    const fallbackCounts = {
      food: items.filter((id) => id === 'food').length,
      drink: items.filter((id) => id === 'drink').length,
      kit: items.filter((id) => id === 'kit').length,
      radio: items.filter((id) => id === 'radio').length,
      battery: items.filter((id) => id === 'battery').length,
      toy: items.filter((id) => id === 'toy').length,
      snack: items.filter((id) => id === 'snack').length,
    };
    const rawResourceCounts = result?.resourceCounts || {};
    const resourceCounts = Object.fromEntries(Object.keys(fallbackCounts).map((key) => {
      const value = rawResourceCounts[key] ?? fallbackCounts[key];
      return [key, Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0];
    }));
    const isLate = Boolean(result?.lateEvacuation || result?.reason === 'time_out');
    const lostItem = result?.lostItem || null;

    // Reset packed flags
    this.model.flags.food_packed = (resourceCounts.food || 0) > 0;
    this.model.flags.drink_packed = (resourceCounts.drink || 0) > 0;
    this.model.flags.kit_packed = (resourceCounts.kit || 0) > 0;
    this.model.flags.has_radio = (resourceCounts.radio || 0) > 0;
    this.model.flags.radio_packed = (resourceCounts.radio || 0) > 0;
    this.model.flags.extra_battery = (resourceCounts.battery || 0) > 0;
    this.model.flags.battery_packed = (resourceCounts.battery || 0) > 0;
    this.model.flags.toy_packed = (resourceCounts.toy || 0) > 0;
    this.model.flags.snack_packed = (resourceCounts.snack || 0) > 0;
    this.model.flags.late_evacuation = isLate;

    // Reset inventory to bunker starter base (1 food, 1 drink) + exact collected items
    this.model.inventory = {
      food: 1 + (resourceCounts.food || 0) + (resourceCounts.snack || 0),
      drink: 1 + (resourceCounts.drink || 0),
      kit: (resourceCounts.kit || 0),
    };

    // Update UI inventory drawer immediately
    const isDisabledScene = this.model.isInventoryDisabledScene('prolog_intro');
    this.view.updateInventoryUI(isDisabledScene, this.model.inventory);

    // Persist the exact stackable payoff and independent radio/battery/toy
    // flags before the next scene renders. Older saves remain valid because
    // this uses the existing inventory and flag schema.
    this.onSave?.(this.model.toSaveData());

    const summary = {
      ...(result?.summary || {}),
      itemCount: items.length,
      lateEvacuation: isLate,
      lostItem,
      timeRemaining: Number.isFinite(Number(result?.timeRemaining)) ? Math.max(0, Number(result.timeRemaining)) : 0,
      reason: isLate ? 'WAKTU HABIS' : (result?.reason === 'entered_hatch' ? 'PALKA TERKUNCI' : 'RUTE SELESAI'),
      title: isLate ? 'EVAKUASI TERLAMBAT' : 'EVAKUASI SELESAI',
    };
    if (this.view.showScavengerResult) {
      this.view.showScavengerResult({ ...result, collectedItems: items, resourceCounts, summary });
    } else if (this.view.showTelltaleToast) {
      this.view.showTelltaleToast(`${summary.title}: ${items.length} barang diamankan.`);
    }

    // Advance to evacuation intro
    this.renderScene('prolog_intro');
  }

  handleDay1Inspection(hotspotId) {
    const hotspot = DAY1_HOTSPOTS.find((spot) => spot.id === hotspotId);
    if (!hotspot || this.model.flags[hotspot.flag]) return;
    const inspectionCount = DAY1_HOTSPOTS.filter((spot) => this.model.flags[spot.flag]).length;
    if (inspectionCount >= 3) return;

    this.model.setFlag(hotspot.flag);
    hotspot.setFlags?.forEach((flag) => this.model.setFlag(flag));
    if (hotspot.reward?.item) this.model.addInventoryItem(hotspot.reward.item, hotspot.reward.amount || 1);
    const knowledge = hotspot.knowledge || 0;
    if (knowledge) {
      this.model.modifyKnowledge(knowledge);
      this.view.pulseKnowledge(knowledge);
    }

    this.model.history.push({
      hour: this.storyData.scenes[this.model.currentSceneId]?.hour ?? '6 Jam',
      text: `[INSPEKSI] ${hotspot.label}: ${hotspot.text}`,
      choiceId: `inspection_${hotspot.id}`,
      effect: knowledge,
    });
    this.view.renderProtocolLog(this.model.history);
    this.view.showDay1InspectionFeedback(hotspot.text);
    this.view.renderHud(this.storyData.scenes[this.model.currentSceneId], this.model.knowledge, this.model.currentSceneId, this.model.flags,
      this.model.hunger, this.model.thirst, this.model.health);
    this.view.updateInventoryUI(this.model.isInventoryDisabledScene(this.model.currentSceneId), this.model.inventory);
    this.view.renderDay1Hotspots(DAY1_HOTSPOTS, this.model.flags,
      (id) => this.handleDay1Inspection(id),
      () => this.renderScene('day1_lockdoor'));
    this.onSave?.(this.model.toSaveData());
  }

  startExpedition(locationId) {
    const config = getExpeditionConfig(locationId);
    if (!config || this.model.expeditionVisitedLocations.includes(locationId) || this.model.expeditionVisitedLocations.length >= 2) return;
    this.view.dom.choicesPanel.innerHTML = '';
    this.view.dom.storyBox.classList.remove('has-interactive-choices');
    this.view.startScavengerMinigame(
      (result) => this.handleExpeditionComplete({ ...result, locationId }),
      config
    );
  }

  _applyExpeditionResult(result) {
    const collectedItems = Array.isArray(result?.collectedItems) ? result.collectedItems : [];
    collectedItems.forEach((itemId) => {
      if (itemId === 'food') this.model.addInventoryItem('food', 1);
      if (itemId === 'drink') this.model.addInventoryItem('drink', 1);
      if (itemId === 'kit') this.model.addInventoryItem('kit', 1);
      if (itemId === 'snack') this.model.addInventoryItem('food', 1);
      if (itemId === 'battery') this.model.setFlag('extra_battery');
      if (itemId === 'mask') this.model.setFlag('medical_mask_ready');
    });
  }

  handleExpeditionComplete(result) {
    const locationId = result?.locationId;
    if (!getExpeditionConfig(locationId) || this.model.expeditionVisitedLocations.includes(locationId)) return;
    this.model.expeditionVisitedLocations.push(locationId);
    this._applyExpeditionResult(result);
    const config = getExpeditionConfig(locationId);
    this.model.history.push({
      hour: this.storyData.scenes[this.model.currentSceneId]?.hour ?? '30 Jam',
      text: `[EKSPEDISI] ${config.label}: ${result.collectedItems?.length || 0} unit dibawa pulang (${result.reason || 'returned'}).`,
      choiceId: `expedition_${locationId}`,
      effect: 0,
    });
    this.view.renderProtocolLog(this.model.history);
    this.view.updateInventoryUI(false, this.model.inventory);
    this.onSave?.(this.model.toSaveData());

    if (!this.model.flags.hendra_encountered) {
      this.renderScene('day2_hendra_encounter');
    } else if (this.model.expeditionVisitedLocations.length >= 2) {
      this.renderScene('day2_expedition_return');
    } else {
      this.renderScene('day2_expedition_map');
    }
  }

  /** Stores the one final radio grade, saves it, then returns to the story. */
  handleFinalRadioResult(result) {
    const requestedQuality = result?.quality;
    const committed = this.model.setRadioQuality(requestedQuality);
    const quality = committed ? requestedQuality : this.model.flags.radio_quality;
    if (!['clear', 'weak', 'failed'].includes(quality)) return;

    const scene = this.storyData.scenes[this.model.currentSceneId];
    if (committed) {
      this.model.history.push({
        hour: scene?.hour ?? '68 Jam',
        text: `[RADIO SAR] Transmisi akhir ${quality.toUpperCase()} pada ${Number(result.frequency).toFixed(1)} MHz (${result.strength}% sinyal).`,
        choiceId: `radio_${quality}`,
        effect: 0,
      });
      this.view.renderProtocolLog(this.model.history);
      this.onSave?.(this.model.toSaveData());
    }
    this.renderScene(`day3_radio_${quality}`);
  }

  /**
   * Handles a player's choice selection.
   * If text is still typing, skip it and defer the actual choice.
   * @param {object} choice - Choice object from story.json.
   */
  handleChoiceSelect(choice) {
    if (this._inventoryReactionTimeout) {
      clearTimeout(this._inventoryReactionTimeout);
      this._inventoryReactionTimeout = null;
    }

    if (this.view.isTyping) {
      this.view.skipTyping();
      return;
    }

    if (choice.disabled) return;

    if (choice.id === 'c_day2_hendra_help' && this.model.inventory.drink <= 0 && this.model.inventory.food <= 0) {
      this.view.showTelltaleToast('AIR & MAKANAN HABIS: Aris tidak bisa membagi persediaan.');
      return;
    }

    // Check if the selected choice triggers a standalone bunker crisis minigame station
    const stationTrigger = choice.triggerBunkerStation || null;
    if (stationTrigger && !this._unlockedMinigameChoiceIds?.has(choice.id) && !this.bunkerEntryUnlocked) {
      this.pendingMinigameChoice = choice;
      this.pendingBunkerEntryChoice = choice;
      this.bunkerMinigame.openStation(stationTrigger, {
        onComplete: () => {
          if (!this._unlockedMinigameChoiceIds) this._unlockedMinigameChoiceIds = new Set();
          this._unlockedMinigameChoiceIds.add(choice.id);
          this.pendingMinigameChoice = null;
          this.pendingBunkerEntryChoice = null;
          this.bunkerEntryUnlocked = true;
          this.handleChoiceSelect(choice);
        },
      });
      return;
    }

    if (this._unlockedMinigameChoiceIds?.has(choice.id)) {
      this._unlockedMinigameChoiceIds.delete(choice.id);
    }
    this.bunkerEntryUnlocked = false;

    // Trigger Telltale notification banner if choice declares telltaleNotice
    if (choice.telltaleNotice) {
      this.view.showTelltaleToast(choice.telltaleNotice);
    }

    // Day 1 Maya comfort dilemmata
    if (choice.id === 'c_day1_maya_light') {
      this.model.setFlag('maya_comforted');
    }
    if (choice.id === 'c_day1_maya_toy') {
      this.model.setFlag('maya_comforted');
      this.model.setFlag('toy_bonded');
    }
    if (choice.id === 'c_day1_maya_strict') {
      this.model.setFlag('maya_sad');
    }
    if (choice.id === 'c_day1_air_fix') {
      this.model.deleteFlag('air_uninspected');
      this.model.setFlag('air_remedied');
    }

    // Day 2 Hendra encounter: exactly one narrative outcome.
    if (choice.id === 'c_day2_hendra_help') {
      this.model.deleteFlag('stranger_guided');
      this.model.deleteFlag('stranger_family_first');
      this.model.setFlag('helped_stranger');
      if (this.model.inventory.drink > 0) {
        this.model.addInventoryItem('drink', -1);
      } else if (this.model.inventory.food > 0) {
        this.model.addInventoryItem('food', -1);
      }
    }
    if (choice.id === 'c_day2_hendra_guide') {
      this.model.deleteFlag('helped_stranger');
      this.model.deleteFlag('stranger_family_first');
      this.model.setFlag('stranger_guided');
    }
    if (choice.id === 'c_day2_hendra_family') {
      this.model.deleteFlag('helped_stranger');
      this.model.deleteFlag('stranger_guided');
      this.model.setFlag('stranger_family_first');
    }

    // Day 3 keeps resource consequences small and explicit rather than adding
    // another subsystem. The choices below alter the later available options.
    if (choice.id === 'c_day3_water_reserve') {
      this.model.addInventoryItem('drink', -1);
      this.model.modifyThirst(12);
      this.model.setFlag('water_reserve_used');
    }
    if (choice.id === 'c_day3_water_filter') {
      this.model.setFlag('water_filtered');
      this.model.setFlag('power_strained');
    }
    if (choice.id === 'c_day3_water_ration') {
      this.model.modifyThirst(-12);
      this.model.setFlag('water_rationed');
    }
    if (choice.id === 'c_day3_power_radio') {
      this.model.setFlag('power_radio_priority');
      this.model.setFlag('radio_power_stable');
    }
    if (choice.id === 'c_day3_power_air') {
      this.model.setFlag('power_saved');
      this.model.setFlag('radio_power_limited');
    }
    if (choice.id === 'c_day3_power_dual') {
      this.model.setFlag('power_saved');
      this.model.setFlag('radio_power_stable');
      this.model.setFlag('battery_committed');
    }
    if (choice.id === 'c_day3_power_route') {
      this.model.setFlag('power_saved');
      this.model.setFlag('radio_power_stable');
      this.model.setFlag('power_routed');
    }
    if (choice.id === 'c_day2_hendra_help' || choice.id === 'c_day2_hendra_guide' || choice.id === 'c_day2_hendra_family') {
      this.model.setFlag('hendra_encountered');
    }

    const prevHealth = this.model.health;

    // Apply knowledge effect (clamped to [0, KNOWLEDGE_MAX]).
    const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
    this.model.modifyKnowledge(effect);
    this.view.pulseKnowledge(effect);

    // Record decision in history.
    const historyEntry = {
      hour:     this.storyData.scenes[this.model.currentSceneId]?.hour ?? '--',
      text:     choice.log || choice.text,
      choiceId: choice.id  ?? null,
      effect,
    };
    this.model.history.push(historyEntry);

    // Activate any flags declared on this choice.
    if (choice.setFlags?.length) {
      choice.setFlags.forEach((f) => { this.model.setFlag(f); });
    }

    this.view.renderProtocolLog(this.model.history);

    const healthDelta = prevHealth - this.model.health;
    if (healthDelta > 15) {
      this.view.triggerShake();
      this.audio.playDamageAlert();
    }

    const isBadChoice = effect < 0
      || (choice.nextSceneId?.includes('bad') ?? false);
    isBadChoice ? this.audio.playBadChoice() : this.audio.playClick();

    if (choice.id === 'c_day3_radio_attempt') {
      const existingQuality = this.model.flags.radio_quality;
      if (['clear', 'weak', 'failed'].includes(existingQuality)) {
        this.renderScene(`day3_radio_${existingQuality}`);
        return;
      }
      const opened = this.radioMiniGame?.open({
        finalAttempt: true,
        inspectedRadio: this.model.flags.inspected_radio === true,
        extraBattery: this.model.flags.extra_battery === true,
      });
      if (!opened) this.handleFinalRadioResult({ quality: 'failed', frequency: 0, strength: 0 });
      return;
    }

    if (choice.triggerRadioMiniGame === true) {
      setTimeout(() => {
        this.radioMiniGame?.open();
      }, 300);
    }

    this.renderScene(choice.nextSceneId);
  }

  /** Continue the story choice after a minigame station is complete. */
  finishBunkerEntry() {
    const choice = this.pendingMinigameChoice || this.pendingBunkerEntryChoice;
    this.pendingMinigameChoice = null;
    this.pendingBunkerEntryChoice = null;
    if (!choice) return;

    this.bunkerMinigame.close();
    this.bunkerEntryUnlocked = true;
    this.handleChoiceSelect(choice);
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
      this.audio.playRadioSound();
      if (this.radioMiniGame) {
        this.radioMiniGame.open();
      }
      return;
    }

    const hungerVal = this.model.hunger;
    const thirstVal = this.model.thirst;
    const healthVal = this.model.health;

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

    const reactions = {
      food:  {
        speaker: "Anak",
        avatar: "anak",
        text: hungerVal <= 30
          ? "Terima kasih, Ayah... perutku sangat perih tadi. Akhirnya kita bisa makan..."
          : "Nyam! Makanannya enak sekali. Terima kasih, Ayah!"
      },
      drink: {
        speaker: "Ibu",
        avatar: "ibu",
        text: thirstVal <= 30
          ? "Terima kasih, Ayah... tenggorokan saya sangat kering seperti terbakar. Ini menyelamatkan saya."
          : "Tenggorokan saya rasanya jauh lebih segar sekarang. Terima kasih."
      },
      kit:   {
        speaker: "Ayah",
        avatar: "ayah",
        text: healthVal <= 40
          ? "Nyeri dadaku mulai mereda... obat ini bekerja cepat. Terima kasih."
          : "Stamina saya mulai pulih. Obat-obatan ini sangat krusial."
      }
    };
    const react = reactions[key];
    if (react) {
      if (this._inventoryReactionTimeout) {
        clearTimeout(this._inventoryReactionTimeout);
        this._inventoryReactionTimeout = null;
      }
      this.view.renderSpeaker(react);
      this.view.typeText(react.text, () => {
        const currentScene = this.storyData.scenes[this.model.currentSceneId];
        this._inventoryReactionTimeout = setTimeout(() => {
          this.restoreSceneDialogue(currentScene);
        }, 3000);
      });
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
    if (this.model.health <= 0 && sceneId !== 'ending_bad') {
      this.model.health = 0;
      this.renderScene('ending_bad');
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
    return sceneId === 'ending_bad';
  }

  _prepareSceneChoices(choices = []) {
    return choices.map((choice) => {
      const isDirectHendraHelp = choice.id === 'c_day2_hendra_help';
      if (isDirectHendraHelp && this.model.inventory.drink <= 0 && this.model.inventory.food <= 0) {
        return { ...choice, disabled: true, disabledReason: 'Persediaan habis — pilih arah atau lanjutkan ke bunker.' };
      }
      if (choice.id === 'c_day3_water_reserve' && this.model.inventory.drink <= 0) {
        return { ...choice, disabled: true, disabledReason: 'Tidak ada air aman tersisa untuk dipakai sekarang.' };
      }
      return { ...choice };
    });
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

    // Dynamic narrative adaptation for prologue evacuation
    if (sceneId === 'prolog_threshold') {
      const hasSupplies = this.model.flags.food_packed || this.model.flags.drink_packed ||
        this.model.flags.kit_packed || this.model.flags.has_radio || this.model.flags.extra_battery || this.model.flags.toy_packed;

      if (this.model.flags.late_evacuation) {
        processedText = 'Ayah: "Pintu dibanting di detik terakhir saat gempa merontokkan atap teras! Napas kita masih terengah-engah, tapi seluruh anggota keluarga sudah berada di dalam lorong. Begitu tuas hidrolik ini ditarik dan segel terkunci, kita bertahan dengan apa pun yang sempat kita bawa."';
      } else if (!hasSupplies) {
        processedText = 'Ayah: "Ransel perbekalan kosong—tak ada waktu untuk mengais barang di dalam rumah! Yang terpenting seluruh anggota keluarga selamat di dalam lorong. Begitu tuas hidrolik ini ditarik dan pintu terkunci, kita harus mengandalkan apa yang tersisa di dalam bunker."';
      }
    }

    return processedText;
  }

  handleDialogueClick() {
    if (this.pendingClickNextSceneId) {
      const nextSceneId = this.pendingClickNextSceneId;
      this.pendingClickNextSceneId = null;
      this.renderScene(nextSceneId);
      return;
    }

    if (this._inventoryReactionTimeout) {
      clearTimeout(this._inventoryReactionTimeout);
      this._inventoryReactionTimeout = null;
      const currentScene = this.storyData.scenes[this.model.currentSceneId];
      if (currentScene) {
        this.restoreSceneDialogue(currentScene);
      }
    }
  }

  restoreSceneDialogue(scene) {
    this.view.renderSpeaker(scene);
    let dialogueText = scene.text || '';
    const alertMatch = dialogueText.match(/^\[([^\]]+)\]/);
    if (alertMatch) {
      dialogueText = dialogueText.slice(alertMatch[0].length).trim();
    }
    const modifiedText = this.processNarrativeText(this.model.currentSceneId, dialogueText, scene.speaker);
    this.view.dom.dialogueText.textContent = modifiedText;
    this.view.isTyping = false;
    if (this.view.typingRafId) {
      cancelAnimationFrame(this.view.typingRafId);
      this.view.typingRafId = null;
    }
    if (this.model.currentSceneId === 'day2_expedition_map') {
      this.view.renderExpeditionMap(
        EXPEDITION_LOCATIONS,
        this.model.expeditionVisitedLocations,
        Math.max(0, 2 - this.model.expeditionVisitedLocations.length),
        (locationId) => this.startExpedition(locationId)
      );
    } else {
      this.view.renderChoices(
        this._prepareSceneChoices(scene.choices), this.model.currentSceneId, this.model.flags,
        (choice) => this.handleChoiceSelect(choice)
      );
    }
  }

  // ─── DEVELOPER CONSOLE & DEBUG HOOKS ────────────────────────────────────

  debugJumpToScene(sceneId) {
    if (!this.storyData.scenes[sceneId] && sceneId !== 'ending_eval' && sceneId !== 'trigger_ending_eval') {
      console.warn(`[StoryEngine] Invalid debug scene ID: "${sceneId}"`);
      return false;
    }

    this.view.destroyScavengerMinigame();
    this.bunkerMinigame?.close();
    this.radioMiniGame?.close();
    this.pendingClickNextSceneId = null;
    this.pendingBunkerEntryChoice = null;
    this.pendingMinigameChoice = null;
    this._unlockedMinigameChoiceIds?.clear();

    const prevBypass = this._debugBypassSave;
    this._debugBypassSave = true;
    try {
      this.renderScene(sceneId);
    } finally {
      this._debugBypassSave = prevBypass;
    }
    return true;
  }

  debugEvaluateEnding() {
    return this.model.getEndingResult();
  }

  debugSetTimeScale(scale = 1.0) {
    if (this.view?.scavengerGame) {
      this.view.scavengerGame.setTimeScale(scale);
    }
  }
}
