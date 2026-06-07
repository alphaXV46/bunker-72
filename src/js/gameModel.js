/**
 * gameModel.js — Model Layer (State only)
 *
 * Responsibilities:
 *  - Own and mutate all runtime game state.
 *  - Expose pure transformation methods (no DOM, no audio, no callbacks).
 *
 * Dependencies: constants.js only.
 */

import { clamp, ENDING_IDS, SURVIVAL } from './constants.js';

// ─── FLAG RECONSTRUCTION MAP ────────────────────────────────────────────────
// Maps stable Choice IDs → the boolean flags they activate.
// Text-content matching has been fully removed (GDD v2.2 migration complete).
const FLAG_CHOICE_MAP = Object.freeze({
  'c_day1_air_noinspect':    'air_uninspected',
  'c_day2_panic_exit':       'structural_damage',
  'c_day2_radio_schedule':   'radio_saved',
  'c_day2_power_save':       'power_saved',
  'c_day2_power_save_drain': 'power_saved',
  'c_day3_water_filter':     'water_filtered',
  'c_day3_door_open':        'door_opened',
  'c_day2_scavenge_trigger': 'scavenged',
  'c_day3_pinch_inspect_vent': 'vent_secured',
});

export class GameModel {
  constructor() {
    this.currentSceneId = 'day1_start';
    this.knowledge     = SURVIVAL.DEFAULTS.knowledge;
    this.hunger        = SURVIVAL.DEFAULTS.hunger;
    this.thirst        = SURVIVAL.DEFAULTS.thirst;
    this.health        = SURVIVAL.DEFAULTS.health;
    this.history       = [];
    this.flags         = {};
    this.inventory     = { ...SURVIVAL.DEFAULTS.inventory };
  }

  /**
   * Initializes or re-initializes model state.
   * Used for both new games and loading a save.
   *
   * @param {string}   sceneId
   * @param {number}   knowledge
   * @param {Array}    history
   * @param {object|null} flags    - Pre-built flags object, or null to reconstruct from history.
   * @param {object|null} inventory
   * @param {number}   hunger
   * @param {number}   thirst
   * @param {number}   health
   */
  init(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health) {
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge      = (typeof knowledge === 'number' && !isNaN(knowledge)) ? clamp(knowledge, 0, SURVIVAL.KNOWLEDGE_MAX) : SURVIVAL.DEFAULTS.knowledge;
    this.hunger         = (typeof hunger    === 'number' && !isNaN(hunger))    ? clamp(hunger, 0, 100)    : SURVIVAL.DEFAULTS.hunger;
    this.thirst         = (typeof thirst    === 'number' && !isNaN(thirst))    ? clamp(thirst, 0, 100)    : SURVIVAL.DEFAULTS.thirst;
    this.health         = (typeof health    === 'number' && !isNaN(health))    ? clamp(health, 0, 100)    : SURVIVAL.DEFAULTS.health;
    this.history        = Array.isArray(history) ? history : [];
    this.inventory      = inventory ? { ...inventory } : { ...SURVIVAL.DEFAULTS.inventory };

    // Use provided flags directly, or reconstruct them from history via Choice IDs.
    this.flags = flags ?? this._reconstructFlagsFromHistory(this.history);

    // Dynamic New Game+ progression check.
    this.flags.ng_plus = localStorage.getItem('bunker72_game_completed') === 'true';
  }

  /**
   * Reconstructs flags from a history array using only stable Choice IDs.
   * This replaces the removed text-matching approach.
   * @param {Array} history
   * @returns {object}
   * @private
   */
  _reconstructFlagsFromHistory(history) {
    const flags = {};
    history.forEach((entry) => {
      if (entry.choiceId && FLAG_CHOICE_MAP[entry.choiceId]) {
        flags[FLAG_CHOICE_MAP[entry.choiceId]] = true;
      }
    });
    return flags;
  }

  /**
   * Returns true if the inventory panel should be disabled for this scene.
   * @param {string} sceneId
   * @returns {boolean}
   */
  isInventoryDisabledScene(sceneId) {
    const DISABLED_SCENES = ['ending_eval', 'day4_eval', 'trigger_ending_eval', 'trigger_secret_ending_eval', 'day3_pinch_water_resolved', 'day3_pinch_vent_inspected'];
    return DISABLED_SCENES.includes(sceneId) || ENDING_IDS.includes(sceneId);
  }

  /**
   * Decays hunger, thirst, and health based on elapsed in-game hours.
   * @param {number} elapsedHours
   */
  updateSurvivalStats(elapsedHours) {
    if (typeof elapsedHours !== 'number' || isNaN(elapsedHours) || elapsedHours <= 0) return;

    const { DECAY_INTERVAL_HOURS, HUNGER_DECAY_PER_INTERVAL, THIRST_DECAY_PER_INTERVAL, HEALTH_PENALTY_HUNGER, HEALTH_PENALTY_THIRST } = SURVIVAL;
    const hungerDecay = (elapsedHours / DECAY_INTERVAL_HOURS) * HUNGER_DECAY_PER_INTERVAL;
    const thirstDecay = (elapsedHours / DECAY_INTERVAL_HOURS) * THIRST_DECAY_PER_INTERVAL;

    this.hunger = clamp(this.hunger - hungerDecay, 0, 100);
    this.thirst = clamp(this.thirst - thirstDecay, 0, 100);

    let healthPenalty = 0;
    if (this.hunger <= 0) healthPenalty += (elapsedHours / DECAY_INTERVAL_HOURS) * HEALTH_PENALTY_HUNGER;
    if (this.thirst <= 0) healthPenalty += (elapsedHours / DECAY_INTERVAL_HOURS) * HEALTH_PENALTY_THIRST;

    if (healthPenalty > 0) {
      this.health = clamp(this.health - healthPenalty, 0, 100);
    }
  }

  /**
   * Consumes one unit of an inventory item and returns its effect metadata.
   * Returns null if the item is unavailable.
   * @param {'food'|'drink'|'kit'} key
   * @returns {{ label: string, effectText: string }|null}
   */
  useInventoryItem(key) {
    if (!this.inventory[key] || this.inventory[key] <= 0) return null;

    this.inventory[key] -= 1;

    let kitDelta = 40;
    let kitText = '+40 Kesehatan';
    if (key === 'kit' && this.health >= 70) {
      kitDelta = 20;
      kitText = '+20 Kesehatan (Penalti Pemulihan)';
    }

    const ITEM_EFFECTS = {
      food:  { stat: 'hunger', delta: 30, label: 'Makanan', effectText: '+30 Lapar'    },
      drink: { stat: 'thirst', delta: 30, label: 'Air',     effectText: '+30 Dahaga'   },
      kit:   { stat: 'health', delta: kitDelta, label: 'P3K',     effectText: kitText },
    };

    const effect = ITEM_EFFECTS[key];
    if (!effect) return null;

    this[effect.stat] = clamp(this[effect.stat] + effect.delta, 0, 100);
    return { label: effect.label, effectText: effect.effectText };
  }

  /**
   * Awards +1 food and +1 drink if knowledge >= 8 and scavenged flag is not set.
   * Sets scavenged flag to true if successful.
   * @returns {boolean} True if scavenge succeeded, false otherwise.
   */
  evaluateScavenge() {
    if (this.knowledge >= 8 && !this.flags.scavenged) {
      this.inventory.food += 1;
      this.inventory.drink += 1;
      this.flags.scavenged = true;
      return true;
    }
    return false;
  }

  /**
   * Determines which ending or Day 4 scene the player routes to.
   * Called from StoryEngine when sceneId === 'trigger_ending_eval'.
   * @returns {string} sceneId
   */
  evaluateEnding() {
    const doorOpened = this.flags.door_opened === true;
    if (this.knowledge === 0 || doorOpened || this.health <= 0) return 'ending_fatal';

    const hasKnowledge   = this.knowledge >= 8;
    const hasRadioSave   = this.flags.radio_saved    === true;
    const hasWaterFilter = this.flags.water_filtered === true;

    const conditionsMet = (hasKnowledge ? 1 : 0) + (hasRadioSave ? 1 : 0) + (hasWaterFilter ? 1 : 0);

    // Day 4 Secret Gate Evaluation
    if (conditionsMet === 3) {
      return 'day4_intro'; // Gate success
    }

    // Near Miss Gate Evaluation (exactly 2 conditions met)
    if (conditionsMet === 2) {
      if (!hasRadioSave) {
        this.flags.near_miss_radio = true;
      } else if (!hasWaterFilter) {
        this.flags.near_miss_water = true;
      } else if (!hasKnowledge) {
        this.flags.near_miss_knowledge = true;
      }
      return 'ending_near_miss';
    }

    // Standard Ending Matrix based on knowledge score
    if (this.knowledge >= 8) return 'ending_best';
    if (this.knowledge >= 4) return 'ending_normal';
    return 'ending_bad';
  }

  /**
   * Determines which secret ending the player routes to.
   * Called from StoryEngine when sceneId === 'trigger_secret_ending_eval'.
   * @returns {string} sceneId
   */
  evaluateSecretEnding() {
    const hasStructuralDamage = this.flags.structural_damage === true;
    return (this.knowledge >= 12 && !hasStructuralDamage && this.health > 0)
      ? 'ending_secret_best'
      : 'ending_secret_bad';
  }

  /**
   * Returns a dynamically constructed text describing the specific reasons for failing Day 4.
   * @returns {string}
   */
  getSecretBadEndingText() {
    const reasons = [];
    if (this.flags.structural_damage) {
      reasons.push("bunker mengalami kerusakan struktural parah akibat guncangan hari kedua yang tidak diantisipasi dengan baik");
    }
    if (this.flags.oxygen_depleted) {
      reasons.push("kegagalan fatal dalam mengelola sirkulasi oksigen darurat (membuka ventilasi luar saat udara luar masih beracun)");
    }
    if (this.flags.looters_breached) {
      reasons.push("penjarah berhasil menerobos masuk karena keputusan membuka pintu untuk barter makanan");
    }
    if (this.knowledge < 12) {
      reasons.push("tingkat kesiapsiagaan keluarga yang kurang memadai untuk menghadapi prosedur evakuasi akhir");
    }
    if (this.health <= 50) {
      reasons.push("kondisi fisik keluarga yang sangat kritis dan cedera parah");
    }

    const reasonStr = reasons.length > 0 
      ? reasons.join(", serta ")
      : "kombinasi kelelahan fisik dan kegagalan protokol darurat di saat-saat terakhir";

    return `Gugur di Garis Akhir. Bencana melanda di saat-saat terakhir karena ${reasonStr}. Ketika tim penyelamat tiba di jam ke-96, Bunker 72 hanya menyisakan kegelapan dan keheningan.`;
  }

  /**
   * Produces a human-readable summary string of the player's decision history.
   * @returns {string}
   */
  getEndingSummary() {
    const good  = this.history.filter((e) => e.effect > 0).length;
    const risky = this.history.filter((e) => e.effect < 0).length;
    const path  = this.history.map((e) => e.hour).join(' > ') || 'tidak ada log';
    return `Keputusan aman: ${good}. Keputusan berisiko: ${risky}. Jalur terakhir: ${path}.`;
  }

  /**
   * Serializes mutable state into a plain object suitable for JSON.stringify.
   * This is the canonical save data shape — consumed by StoryEngine's onSave callback.
   * @returns {object}
   */
  toSaveData() {
    return {
      sceneId:   this.currentSceneId,
      knowledge: this.knowledge,
      history:   this.history,
      flags:     this.flags,
      inventory: this.inventory,
      hunger:    this.hunger,
      thirst:    this.thirst,
      health:    this.health,
    };
  }
}
