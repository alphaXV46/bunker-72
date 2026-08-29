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
  'c_day4_scavenge_cooperate': 'scavenge_success',
  'c_day4_scavenge_cautious': 'scavenge_success',
  'c_day4_scavenge_reckless': 'scavenge_injured',
  'c_day4_looters_shock': 'looters_repelled',
  'c_day4_looters_intercom': 'looters_repelled',
  'c_day4_looters_barter': 'looters_breached',
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
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge      = (typeof knowledge === 'number' && !isNaN(knowledge)) ? clamp(knowledge, 0, SURVIVAL.KNOWLEDGE_MAX) : SURVIVAL.DEFAULTS.knowledge;
    this.hunger         = (typeof hunger    === 'number' && !isNaN(hunger))    ? clamp(hunger, 0, this.getMaxStat('hunger'))    : SURVIVAL.DEFAULTS.hunger;
    this.thirst         = (typeof thirst    === 'number' && !isNaN(thirst))    ? clamp(thirst, 0, this.getMaxStat('thirst'))    : SURVIVAL.DEFAULTS.thirst;
    this.health         = (typeof health    === 'number' && !isNaN(health))    ? clamp(health, 0, this.getMaxStat('health'))    : SURVIVAL.DEFAULTS.health;
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
   * Evaluates the ending route at Hour 72.
   * If radio is active, rescues directly at 72h.
   * If radio failed, transitions to Day 4 as a narrative second chance.
   * @returns {string} sceneId
   */
  evaluateEnding() {
    const doorOpened = this.flags.door_opened === true;
    if (this.health <= 0 || doorOpened) return 'ending_fatal';

    // If radio communication succeeded, BNPB arrives on schedule at Hour 72
    if (this.flags.radio_saved) {
      if (this.health >= 60 && !this.flags.water_poisoned && !this.flags.smoke_poisoned) {
        return 'ending_best';
      }
      return 'ending_normal';
    }

    // Radio failed or not scheduled: SAR cannot locate bunker yet -> continue to Day 4
    return 'day4_intro';
  }

  /**
   * Evaluates the outcome of surviving to Day 4 (96 Hours).
   * @returns {string} sceneId
   */
  evaluateSecretEnding() {
    if (this.health <= 0 || this.flags.looters_breached) {
      return 'ending_secret_bad';
    }
    if (!this.flags.structural_damage && this.health >= 50) {
      return 'ending_secret_best';
    }
    return 'ending_normal';
  }

  /**
   * Constructs a comprehensive, modular Telltale-style epilogue.
   * Evaluates Rescue, Health, Bunker Integrity, Social Karma, and Family State.
   * @returns {object}
   */
  evaluateModularEnding() {
    const isFatal = this.health <= 0 || this.flags.door_opened === true || this.flags.looters_breached === true;
    const isDay4 = this.currentSceneId.startsWith('day4_') || this.currentSceneId === 'day4_eval';

    // 1. Rescue Outcome
    let endingId = 'ending_best';
    let rescueBadge = 'RESCUE: EVAKUASI HELIKOPTER (72 JAM)';
    let rescueTitle = 'Penyelamatan Sempurna Selat Sunda';

    if (isFatal) {
      endingId = 'ending_fatal';
      rescueBadge = 'STATUS: GUGUR DI DALAM BUNKER';
      rescueTitle = 'Makam Bunker 72: Keheningan di Perut Bumi';
    } else if (isDay4) {
      if (this.health > 0) {
        endingId = 'ending_secret_best';
        rescueBadge = 'RESCUE: TIM PENYISIRAN DARAT (96 JAM)';
        rescueTitle = 'Bertahan 96 Jam: Fajar Kemenangan Sejati';
      } else {
        endingId = 'ending_secret_bad';
        rescueBadge = 'STATUS: GUGUR DI GARIS AKHIR';
        rescueTitle = 'Tragedi 96 Jam: Kelelahan Menjelang Fajar';
      }
    } else if (this.health < 60 || this.flags.water_poisoned || this.flags.smoke_poisoned) {
      endingId = 'ending_normal';
      rescueBadge = 'RESCUE: EVAKUASI MEDIS DARURAT (72 JAM)';
      rescueTitle = 'Bertahan Hidup dengan Luka & Trauma';
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

    // 4. Social Karma & External Relationships
    let karmaDesc = '';
    if (this.flags.helped_stranger) {
      karmaDesc = 'Solidaritas Anda menolong penyintas lain membuahkan berkah tak terduga; kebaikan Anda diingat dan memperkuat kerja sama di sektor pengungsian.';
    } else if (this.flags.stranger_hostile || this.flags.looters_hostile) {
      karmaDesc = 'Sikap defensif yang keras meninggalkan trauma dan ketegangan di antara para penyintas di sekitar sektor pengungsian.';
    } else {
      karmaDesc = 'Keluarga berhasil menjaga kerahasiaan tempat perlindungan secara disiplin tanpa memicu insiden dengan pihak luar.';
    }

    // 5. Family Bond & Maya's Morale
    let familyDesc = '';
    if (this.flags.maya_comforted || this.flags.toy_packed) {
      familyDesc = 'Maya memeluk erat mobil-mobilan merahnya di atas tandu evakuasi, menatap hangat wajah Ayah dan Ibu dengan senyuman yang melegakan.';
    } else {
      familyDesc = 'Maya meringkuk dalam dekapan Ibu, matanya masih dibayangi ketakutan akan kegelapan ruang isolasi.';
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
    if (this.flags.helped_stranger) bnpbScore += 5;
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
   * Returns a dynamically constructed text describing reasons for failing Day 4.
   * @returns {string}
   */
  getSecretBadEndingText() {
    const reasons = [];
    if (this.flags.structural_damage) {
      reasons.push("bunker mengalami kerusakan struktural parah akibat guncangan gempa yang tidak diredam");
    }
    if (this.flags.oxygen_depleted) {
      reasons.push("kegagalan fatal dalam sirkulasi oksigen darurat (membuka ventilasi luar saat udara beracun)");
    }
    if (this.flags.looters_breached) {
      reasons.push("penjarah berhasil menerobos masuk ke dalam palka bunker");
    }
    if (this.health <= 0) {
      reasons.push("kondisi stamina fisik keluarga yang terkuras habis hingga batas akhir");
    }

    const reasonStr = reasons.length > 0 
      ? reasons.join(", serta ")
      : "kelelahan fisik dan isolasi berkepanjangan di bawah tanah";

    return `Gugur di Garis Akhir. Bencana melanda di jam-jam penentuan karena ${reasonStr}. Ketika regu SAR tiba di jam ke-96, Bunker 72 hanya menyisakan keheningan.`;
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
