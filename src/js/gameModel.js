/**
 * gameModel.js — Model Layer (State only)
 *
 * Responsibilities:
 *  - Own and mutate all runtime game state.
 *  - Expose pure transformation methods (no DOM, no audio, no callbacks).
 *
 * Dependencies: constants.js only.
 */

import { clamp, ENDING_IDS, ENDING_RULES, SAVE_SCHEMA_VERSION, SURVIVAL } from './constants.js';

const INITIAL_SCENE_ID = 'prolog_home';
const DEFAULT_FLAGS = Object.freeze({
  promised_maya: false,
  radio_reward_claimed: false,
});

// ─── FLAG RECONSTRUCTION MAP ────────────────────────────────────────────────
// Maps stable Choice IDs → the boolean flags they activate.
// Text-content matching has been fully removed (GDD v2.2 migration complete).
const FLAG_CHOICE_MAP = Object.freeze({
  'c_day1_air_noinspect':    'air_uninspected',
  'c_day2_air_remedy_inspect': 'air_remedied',
  'c_day2_panic_exit':       'structural_damage',
  'c_day2_radio_schedule':   'radio_saved',
  'c_day2_power_save':       'power_saved',
  'c_day2_power_save_drain': 'power_saved',
  'c_day3_water_filter':     'water_filtered',
  'c_day3_door_open':        'door_opened',
  'c_day2_scavenge_trigger': 'scavenged',
  'c_day2_scavenge_bypass': 'scavenged',
  'c_day2_scavenge_slow': 'scavenged',
  'c_day3_pinch_inspect_vent': 'vent_secured',
  'c_prolog_pack_food': 'food_packed',
  'c_prolog_pack_drink': 'drink_packed',
  'c_prolog_pack_kit': 'kit_packed',
  'c_prolog_pack_battery': 'extra_battery',
  'c_prolog_pack_snack': 'snack_packed',
  'c_prolog_pack_toy': 'toy_packed',
  'c_day2_radio_battery': 'radio_saved',
  'c_day1_maya_light': 'maya_comforted',
  'c_day1_maya_toy': 'maya_comforted',
  'c_day1_maya_strict': 'maya_sad',
  'c_day2_stranger_airlock': 'helped_stranger',
  'c_day2_stranger_intercom': 'stranger_guided',
  'c_day2_stranger_harsh': 'stranger_hostile',
  'c_prolog_anak_promise': 'promised_maya',
});

export class GameModel {
  constructor() {
    this.currentSceneId = INITIAL_SCENE_ID;
    this.knowledge     = SURVIVAL.DEFAULTS.knowledge;
    this.hunger        = SURVIVAL.DEFAULTS.hunger;
    this.thirst        = SURVIVAL.DEFAULTS.thirst;
    this.health        = SURVIVAL.DEFAULTS.health;
    this.history       = [];
    this.flags         = {};
    this.inventory     = { ...SURVIVAL.DEFAULTS.inventory };
  }

  getMaxStat(statName) {
    if (this.flags?.near_miss && statName !== 'knowledge') {
      return 85;
    }
    return 100;
  }

  /**
   * Safely mutates knowledge within valid bounds.
   * @param {number} delta
   */
  modifyKnowledge(delta) {
    if (typeof delta !== 'number' || isNaN(delta)) return;
    this.knowledge = clamp(this.knowledge + delta, 0, SURVIVAL.KNOWLEDGE_MAX);
  }

  /**
   * Safely mutates health within valid bounds [0, maxStat].
   * @param {number} delta
   */
  modifyHealth(delta) {
    if (typeof delta !== 'number' || isNaN(delta)) return;
    this.health = clamp(this.health + delta, 0, this.getMaxStat('health'));
  }

  /**
   * Safely mutates hunger within valid bounds [0, maxStat].
   * @param {number} delta
   */
  modifyHunger(delta) {
    if (typeof delta !== 'number' || isNaN(delta)) return;
    this.hunger = clamp(this.hunger + delta, 0, this.getMaxStat('hunger'));
  }

  /**
   * Safely mutates thirst within valid bounds [0, maxStat].
   * @param {number} delta
   */
  modifyThirst(delta) {
    if (typeof delta !== 'number' || isNaN(delta)) return;
    this.thirst = clamp(this.thirst + delta, 0, this.getMaxStat('thirst'));
  }

  /**
   * Adds or removes inventory item quantity safely.
   * @param {'food'|'drink'|'kit'} key
   * @param {number} delta
   */
  addInventoryItem(key, delta = 1) {
    if (typeof this.inventory[key] !== 'number') {
      this.inventory[key] = 0;
    }
    this.inventory[key] = Math.max(0, this.inventory[key] + delta);
  }

  /**
   * Sets a boolean or arbitrary state flag.
   * @param {string} flagKey
   * @param {any} value
   */
  setFlag(flagKey, value = true) {
    if (!flagKey) return;
    this.flags[flagKey] = value;
  }

  /**
   * Deletes a state flag.
   * @param {string} flagKey
   */
  deleteFlag(flagKey) {
    if (!flagKey) return;
    delete this.flags[flagKey];
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
    this.currentSceneId = sceneId || INITIAL_SCENE_ID;
    this.history        = Array.isArray(history) ? history : [];

    const restoredFlags = flags && typeof flags === 'object' && !Array.isArray(flags) ? flags : {};
    this.flags = {
      ...DEFAULT_FLAGS,
      ...this._reconstructFlagsFromHistory(this.history),
      ...restoredFlags,
    };
    if (!Object.prototype.hasOwnProperty.call(restoredFlags, 'radio_reward_claimed')) {
      this.flags.radio_reward_claimed = this.history.some((entry) =>
        typeof entry?.text === 'string' && entry.text.startsWith('[MINI-GAME] Radio VHF Terkunci:')
      );
    }

    this.knowledge      = (typeof knowledge === 'number' && !isNaN(knowledge)) ? clamp(knowledge, 0, SURVIVAL.KNOWLEDGE_MAX) : SURVIVAL.DEFAULTS.knowledge;
    this.hunger         = (typeof hunger    === 'number' && !isNaN(hunger))    ? clamp(hunger, 0, this.getMaxStat('hunger'))    : SURVIVAL.DEFAULTS.hunger;
    this.thirst         = (typeof thirst    === 'number' && !isNaN(thirst))    ? clamp(thirst, 0, this.getMaxStat('thirst'))    : SURVIVAL.DEFAULTS.thirst;
    this.health         = (typeof health    === 'number' && !isNaN(health))    ? clamp(health, 0, this.getMaxStat('health'))    : SURVIVAL.DEFAULTS.health;
    const restoredInventory = inventory && typeof inventory === 'object' && !Array.isArray(inventory)
      ? inventory
      : {};
    this.inventory = Object.fromEntries(
      Object.entries(SURVIVAL.DEFAULTS.inventory).map(([key, defaultValue]) => {
        const value = restoredInventory[key];
        return [key, typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : defaultValue];
      })
    );

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
    if (flags.air_remedied) {
      delete flags.air_uninspected;
    }
    if (history.some(e => e.choiceId === 'c_prolog_pack_battery')) {
      flags.extra_battery = true;
      flags.battery_packed = true;
    }
    if (history.some(e => e.choiceId === 'c_day2_scavenge_bypass' && e.text && e.text.includes("Gagal"))) {
      flags.generator_damaged = true;
    }
    return flags;
  }

  /**
   * Returns true if the inventory panel should be disabled for this scene.
   * @param {string} sceneId
   * @returns {boolean}
   */
  isInventoryDisabledScene(sceneId) {
    const DISABLED_SCENES = ['ending_eval', 'trigger_ending_eval', 'day3_pinch_water_resolved', 'day3_pinch_vent_inspected'];
    return DISABLED_SCENES.includes(sceneId) || ENDING_IDS.includes(sceneId);
  }

  /**
   * Decays hunger, thirst, and health based on elapsed in-game hours.
   * @param {number} elapsedHours
   */
  updateSurvivalStats(elapsedHours) {
    if (typeof elapsedHours !== 'number' || isNaN(elapsedHours) || elapsedHours <= 0) return;

    const { DECAY_INTERVAL_HOURS, HUNGER_DECAY_PER_INTERVAL, THIRST_DECAY_PER_INTERVAL, HEALTH_PENALTY_HUNGER, HEALTH_PENALTY_THIRST } = SURVIVAL;
    
    let hungerDecayRate = HUNGER_DECAY_PER_INTERVAL;
    if (this.flags.air_uninspected) {
      hungerDecayRate += 3;
    }
    
    let thirstDecayRate = THIRST_DECAY_PER_INTERVAL;
    if (this.flags.structural_damage) {
      thirstDecayRate += 3;
    }

    const hungerDecay = (elapsedHours / DECAY_INTERVAL_HOURS) * hungerDecayRate;
    const thirstDecay = (elapsedHours / DECAY_INTERVAL_HOURS) * thirstDecayRate;

    this.hunger = clamp(this.hunger - hungerDecay, 0, this.getMaxStat('hunger'));
    this.thirst = clamp(this.thirst - thirstDecay, 0, this.getMaxStat('thirst'));

    let healthPenalty = 0;
    if (this.hunger <= 0) healthPenalty += (elapsedHours / DECAY_INTERVAL_HOURS) * HEALTH_PENALTY_HUNGER;
    if (this.thirst <= 0) healthPenalty += (elapsedHours / DECAY_INTERVAL_HOURS) * HEALTH_PENALTY_THIRST;

    if (this.flags.smoke_poisoned) {
      healthPenalty += (elapsedHours / DECAY_INTERVAL_HOURS) * 5;
    }

    if (healthPenalty > 0) {
      this.health = clamp(this.health - healthPenalty, 0, this.getMaxStat('health'));
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

    this[effect.stat] = clamp(this[effect.stat] + effect.delta, 0, this.getMaxStat(effect.stat));
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
   * Evaluates the ending route at Hour 72 or endgame.
   * - Bad: Fatal survival state or a catastrophic breach.
   * - Good: Preparedness, health, and critical bunker systems are sufficient.
   * - Normal: The family survives with incomplete preparation or unstable systems.
   * @returns {string} sceneId
   */
  evaluateEnding() {
    const fatalCondition = this.health <= 0
      || this.flags.door_opened === true
      || this.flags.looters_breached === true;
    if (fatalCondition) {
      return 'ending_bad';
    }

    const criticalSystemsAreStable = this.flags.radio_saved === true
      && this.flags.water_filtered === true
      && this.flags.water_poisoned !== true
      && this.flags.air_uninspected !== true
      && this.flags.smoke_poisoned !== true
      && this.flags.power_saved === true
      && this.flags.structural_damage !== true;

    if (
      this.knowledge >= ENDING_RULES.GOOD_PREPAREDNESS_MIN
      && this.health >= ENDING_RULES.GOOD_HEALTH_MIN
      && criticalSystemsAreStable
    ) {
      return 'ending_good';
    }

    return 'ending_normal';
  }

  /**
   * Constructs a comprehensive, modular Telltale-style epilogue for the 3 endings.
   * Evaluates Rescue, Health, Bunker Integrity, Social Karma, and Family State.
   * @returns {object}
   */
  evaluateModularEnding() {
    const endingId = this.evaluateEnding();
    const isFatal = endingId === 'ending_bad';
    const helped = this.flags.helped_stranger === true;

    // 1. Rescue Outcome (3 Core Endings)
    let rescueBadge = 'RESCUE: SELAMAT DENGAN KONSEKUENSI';
    let rescueTitle = 'Selamat dengan Kondisi Belum Stabil';

    if (isFatal) {
      rescueBadge = 'STATUS: GUGUR DI DALAM BUNKER';
      rescueTitle = 'Makam Bunker 72: Tragedi di Perut Bumi';
    } else if (endingId === 'ending_good') {
      rescueBadge = 'RESCUE: KONDISI STABIL';
      rescueTitle = 'Penyelamatan Stabil di Jam ke-72';
    }

    // 2. Health & Physical Condition
    let healthDesc = '';
    if (isFatal) {
      healthDesc = 'Seluruh anggota keluarga gugur di dalam bunker akibat paparan racun mematikan atau pelanggaran segel pelindung sebelum bantuan tiba.';
    } else if (this.health >= 70 && !this.flags.water_poisoned && !this.flags.smoke_poisoned) {
      healthDesc = 'Kondisi fisik seluruh anggota keluarga luar biasa prima. Tidak ada luka bakar asam atau kerusakan organ paru-paru yang berarti.';
    } else if (this.health >= 40) {
      healthDesc = 'Keluarga mengalami dehidrasi moderat dan iritasi pernapasan ringan akibat abu vulkanik, namun tim medis memastikan tidak ada komplikasi permanen.';
    } else {
      healthDesc = 'Keluarga dievakuasi dalam keadaan lemas kritis akibat dehidrasi akut dan keracunan belerang, membutuhkan infus serta perawatan intensif ICU.';
    }

    // 3. Bunker Infrastructure
    let bunkerDesc = '';
    if (this.flags.structural_damage) {
      bunkerDesc = 'Bunker mengalami retakan struktural yang cukup mengkhawatirkan akibat guncangan gempa, namun pilar utama berhasil menahan runtuhan plafon.';
    } else {
      bunkerDesc = 'Integritas struktur Bunker 72 berdiri utuh tanpa retakan berarti—sebuah bukti keberhasilan manajemen peredam hidrolik yang disiplin.';
    }

    // 4. Social Karma & Moral Dilemma Resolution
    let karmaDesc = '';
    if (helped) {
      karmaDesc = 'Solidaritas Anda menolong Hendra di palka airlock membuahkan mukjizat nyata. Hendra memandu langsung tim SAR ke lokasi palka Bunker 72 di tengah pekatnya badai abu!';
    } else if (this.flags.stranger_hostile || this.flags.looters_hostile) {
      karmaDesc = 'Pengusiran kasar terhadap penyintas luar meninggalkan beban emosional bagi keluarga setelah evakuasi.';
    } else {
      karmaDesc = 'Keluarga memprioritaskan keselamatan bunker dan tidak membuka akses, sementara nasib Hendra tetap menjadi pertanyaan setelah evakuasi.';
    }

    // 5. Family Bond & Maya's Morale
    let familyDesc = '';
    if (isFatal) {
      familyDesc = 'Maya terlelap tenang dalam dekapan terakhir kedua orang tuanya di tengah keheningan ruang bawah tanah.';
    } else if (this.flags.maya_comforted || this.flags.toy_bonded) {
      familyDesc = 'Maya tetap dekat dengan kedua orang tuanya sepanjang evakuasi; dukungan yang ia terima membantu meredakan ketakutannya.';
    } else {
      familyDesc = 'Maya selamat, tetapi kelelahan dan ketakutan selama tiga hari meninggalkan jarak emosional yang perlu dipulihkan bersama.';
    }

    const narrativeFull = `${healthDesc} ${bunkerDesc} ${karmaDesc} ${familyDesc}`;

    // 6. Educational BNPB Mitigation Score (0 - 100)
    let bnpbScore = 50;
    bnpbScore += Math.round((this.health / 100) * 20);
    bnpbScore += Math.round((this.hunger / 100) * 10);
    bnpbScore += Math.round((this.thirst / 100) * 10);

    if (this.flags.radio_saved) bnpbScore += 15;
    if (this.flags.water_filtered && !this.flags.water_poisoned) bnpbScore += 15;
    if (!this.flags.air_uninspected) bnpbScore += 10;
    if (!this.flags.structural_damage) bnpbScore += 10;
    if (this.flags.door_opened) bnpbScore -= 40;
    if (this.flags.looters_breached) bnpbScore -= 30;

    bnpbScore = clamp(bnpbScore, 0, 100);

    return {
      endingId,
      rescueBadge,
      rescueTitle,
      healthDesc,
      bunkerDesc,
      karmaDesc,
      familyDesc,
      narrativeFull,
      bnpbScore,
      health: this.health,
      hunger: this.hunger,
      thirst: this.thirst,
      flags: { ...this.flags },
    };
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
      version:   SAVE_SCHEMA_VERSION,
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
