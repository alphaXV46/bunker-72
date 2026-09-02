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
import { EXPEDITION_CONFIGS } from './expeditionConfig.js';

const INITIAL_SCENE_ID = 'prolog_home';
const DEFAULT_FLAGS = Object.freeze({
  promised_maya: false,
  radio_reward_claimed: false,
  radio_quality: null,
  water_reserve_used: false,
  water_rationed: false,
  power_radio_priority: false,
  radio_power_stable: false,
  power_routed: false,
  battery_committed: false,
  final_air_protected: false,
  final_power_conserved: false,
  medical_mask_used: false,
  inspected_supply: false,
  inspected_medical: false,
  inspected_ventilation: false,
  inspected_power: false,
  inspected_radio: false,
  inspected_family_storage: false,
  found_spare_filter: false,
  maya_toy_callback: false,
  sarah_comforted_maya: false,
  hendra_encountered: false,
  stranger_family_first: false,
  medical_mask_ready: false,
  has_radio: false,
  radio_packed: false,
  extra_battery: false,
  battery_packed: false,
  food_packed: false,
  drink_packed: false,
  kit_packed: false,
  snack_packed: false,
  toy_packed: false,
  late_evacuation: false,
});

// ─── FLAG RECONSTRUCTION MAP ────────────────────────────────────────────────
// Maps stable Choice IDs → the boolean flags they activate.
// Text-content matching has been fully removed (GDD v2.2 migration complete).
const FLAG_CHOICE_MAP = Object.freeze({
  'c_day1_air_noinspect':    'air_uninspected',
  'c_day1_air_fix':          'air_remedied',
  'c_day1_air_spare_filter': 'air_seal_good',
  'c_day3_water_filter':     'water_filtered',
  'c_day3_water_reserve': 'water_reserve_used',
  'c_day3_water_ration': 'water_rationed',
  'c_day3_power_radio': 'power_radio_priority',
  'c_day3_power_air': 'power_saved',
  'c_day3_power_dual': 'power_saved',
  'c_day3_power_route': 'power_saved',
  'c_day3_final_keep_air': 'final_air_protected',
  'c_day3_final_conserve': 'final_power_conserved',
  'c_day3_final_mask': 'medical_mask_used',
  'c_prolog_pack_food': 'food_packed',
  'c_prolog_pack_drink': 'drink_packed',
  'c_prolog_pack_kit': 'kit_packed',
  'c_prolog_pack_battery': 'extra_battery',
  'c_prolog_pack_radio': 'radio_packed',
  'c_prolog_pack_snack': 'snack_packed',
  'c_prolog_pack_toy': 'toy_packed',
  'c_day1_maya_light': 'maya_comforted',
  'c_day1_maya_toy': 'maya_comforted',
  'c_day1_maya_strict': 'sarah_comforted_maya',
  'c_day2_hendra_help': 'helped_stranger',
  'c_day2_hendra_guide': 'stranger_guided',
  'c_day2_hendra_family': 'stranger_family_first',
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
    this.expeditionVisitedLocations = [];
    this.inventory     = { ...SURVIVAL.DEFAULTS.inventory };
  }

  getMaxStat(statName) {
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

  /** Commits the one canonical Day 3 rescue result exactly once. */
  setRadioQuality(quality) {
    if (!['clear', 'weak', 'failed'].includes(quality) || this.flags.radio_quality) return false;
    this.flags.radio_quality = quality;
    return true;
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
  init(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health, expeditionVisitedLocations = []) {
    this.currentSceneId = sceneId || INITIAL_SCENE_ID;
    this.history        = Array.isArray(history) ? history : [];
    const validExpeditionIds = new Set(Object.keys(EXPEDITION_CONFIGS));
    this.expeditionVisitedLocations = Array.isArray(expeditionVisitedLocations)
      ? [...new Set(expeditionVisitedLocations.filter((id) => typeof id === 'string' && validExpeditionIds.has(id)))]
      : [];

    const restoredFlags = flags && typeof flags === 'object' && !Array.isArray(flags) ? flags : {};
    this.flags = {
      ...DEFAULT_FLAGS,
      ...this._reconstructFlagsFromHistory(this.history),
      ...restoredFlags,
    };

    // Keep the Hendra decision as one mutually-exclusive outcome even when a
    // legacy save contains more than one stale social flag.
    const hendraOutcomeFlags = ['helped_stranger', 'stranger_guided', 'stranger_family_first'];
    const latestHendraChoice = [...this.history].reverse().find((entry) => [
      'c_day2_hendra_help', 'c_day2_hendra_guide', 'c_day2_hendra_family',
      'c_day2_stranger_airlock', 'c_day2_stranger_intercom', 'c_day2_stranger_harsh',
    ].includes(entry?.choiceId));
    const historyOutcome = latestHendraChoice && (
      latestHendraChoice.choiceId === 'c_day2_hendra_help' || latestHendraChoice.choiceId === 'c_day2_stranger_airlock' ? 'helped_stranger' :
      latestHendraChoice.choiceId === 'c_day2_hendra_guide' || latestHendraChoice.choiceId === 'c_day2_stranger_intercom' ? 'stranger_guided' :
      'stranger_family_first'
    );
    const activeHendraOutcomes = hendraOutcomeFlags.filter((flag) => this.flags[flag] === true);
    const chosenHendraOutcome = historyOutcome || activeHendraOutcomes[0];
    if (chosenHendraOutcome) {
      hendraOutcomeFlags.forEach((flag) => { this.flags[flag] = flag === chosenHendraOutcome; });
      this.flags.hendra_encountered = true;
    }
    if (!Object.prototype.hasOwnProperty.call(restoredFlags, 'radio_reward_claimed')) {
      this.flags.radio_reward_claimed = this.history.some((entry) =>
        typeof entry?.text === 'string' && entry.text.startsWith('[MINI-GAME] Radio VHF Terkunci:')
      );
    }
    const legacyRadioSaved = this.flags.radio_saved === true;
    if (!['clear', 'weak', 'failed'].includes(this.flags.radio_quality)) {
      // Older builds only recorded that a scheduled radio contact was kept.
      // Treat it as usable-but-imperfect, never as a retroactive clear result.
      this.flags.radio_quality = legacyRadioSaved ? 'weak' : null;
    }
    // radio_saved is read only for legacy-save migration; the active game has
    // one canonical communication state: radio_quality.
    delete this.flags.radio_saved;

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
    if (history.some(e => e.choiceId === 'c_prolog_pack_radio')) {
      // Legacy history records only carried the packing choice; restore the
      // independent possession flag without implying a battery or power route.
      flags.has_radio = true;
      flags.radio_packed = true;
    }
    // A history-only save may not carry the flags object. Reconstruct the
    // single latest Hendra outcome so the encounter cannot repeat on resume.
    const latestHendra = [...history].reverse().find((entry) => [
      'c_day2_hendra_help', 'c_day2_hendra_guide', 'c_day2_hendra_family',
      'c_day2_stranger_airlock', 'c_day2_stranger_intercom', 'c_day2_stranger_harsh',
    ].includes(entry?.choiceId));
    if (latestHendra) {
      flags.hendra_encountered = true;
      delete flags.helped_stranger;
      delete flags.stranger_guided;
      delete flags.stranger_family_first;
      if (latestHendra.choiceId === 'c_day2_hendra_help' || latestHendra.choiceId === 'c_day2_stranger_airlock') flags.helped_stranger = true;
      if (latestHendra.choiceId === 'c_day2_hendra_guide' || latestHendra.choiceId === 'c_day2_stranger_intercom') flags.stranger_guided = true;
      if (latestHendra.choiceId === 'c_day2_hendra_family' || latestHendra.choiceId === 'c_day2_stranger_harsh') flags.stranger_family_first = true;
    }
    return flags;
  }

  /**
   * Returns true if the inventory panel should be disabled for this scene.
   * @param {string} sceneId
   * @returns {boolean}
   */
  isInventoryDisabledScene(sceneId) {
    const DISABLED_SCENES = ['ending_eval', 'trigger_ending_eval'];
    return DISABLED_SCENES.includes(sceneId) || ENDING_IDS.includes(sceneId);
  }

  /**
   * Decays hunger, thirst, and health based on elapsed in-game hours.
   * @param {number} elapsedHours
   */
  updateSurvivalStats(elapsedHours) {
    if (typeof elapsedHours !== 'number' || isNaN(elapsedHours) || elapsedHours <= 0) return;

    const {
      DECAY_INTERVAL_HOURS,
      HUNGER_DECAY_PER_INTERVAL,
      THIRST_DECAY_PER_INTERVAL,
      HUNGER_WARNING_THRESHOLD,
      THIRST_WARNING_THRESHOLD,
      HEALTH_PENALTY_HUNGER,
      HEALTH_PENALTY_THIRST,
      HEALTH_PENALTY_LOW_HUNGER,
      HEALTH_PENALTY_LOW_THIRST,
    } = SURVIVAL;
    
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
    const intervalFraction = elapsedHours / DECAY_INTERVAL_HOURS;
    if (this.hunger > 0 && this.hunger <= HUNGER_WARNING_THRESHOLD) healthPenalty += intervalFraction * HEALTH_PENALTY_LOW_HUNGER;
    if (this.thirst > 0 && this.thirst <= THIRST_WARNING_THRESHOLD) healthPenalty += intervalFraction * HEALTH_PENALTY_LOW_THIRST;
    if (this.hunger <= 0) healthPenalty += intervalFraction * HEALTH_PENALTY_HUNGER;
    if (this.thirst <= 0) healthPenalty += intervalFraction * HEALTH_PENALTY_THIRST;

    if (this.flags.smoke_poisoned) {
      healthPenalty += intervalFraction * 5;
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

  /** Builds the deterministic, technical-only 72-hour preparedness report. */
  calculatePreparednessReport() {
    const radioQuality = ['clear', 'weak', 'failed'].includes(this.flags.radio_quality)
      ? this.flags.radio_quality
      : 'failed';
    const categories = [];
    const addCategory = (id, label, score, max, detail) => categories.push({
      id,
      label,
      score: clamp(score, 0, max),
      max,
      detail,
    });

    const airFailure = this.flags.air_uninspected === true || this.flags.smoke_poisoned === true;
    const airPrepared = this.flags.air_seal_good === true || this.flags.air_remedied === true
      || this.flags.final_air_protected === true || this.flags.found_spare_filter === true;
    addCategory('air', 'Udara & Shelter', airFailure ? 0 : airPrepared ? 20 : 10, 20,
      airFailure ? 'Perlindungan udara tidak cukup aman saat krisis meningkat.' : airPrepared ? 'Ventilasi atau perlindungan shelter dipersiapkan sebelum tekanan memuncak.' : 'Shelter bertahan, tetapi perlindungan udara hanya berada pada tingkat dasar.');

    const waterFailure = this.flags.water_poisoned === true || this.flags.water_ruined === true;
    const waterSafe = this.flags.water_filtered === true && !waterFailure;
    addCategory('water', 'Air Bersih', waterFailure ? 0 : waterSafe ? 15 : 7, 15,
      waterFailure ? 'Keamanan air tidak dapat dipertahankan sampai akhir.' : waterSafe ? 'Air dipulihkan dengan prosedur aman sebelum persediaan kritis.' : 'Keluarga mengelola cadangan air, tetapi tidak memperoleh lapisan perlindungan penyaringan penuh.');

    const powerStable = this.flags.power_saved === true || this.flags.power_routed === true || this.flags.battery_committed === true;
    const powerSupported = this.flags.radio_power_stable === true || this.flags.extra_battery === true;
    addCategory('power', 'Daya Darurat', powerStable ? 15 : powerSupported ? 10 : 5, 15,
      powerStable ? 'Daya dialokasikan sehingga fungsi bunker penting bertahan.' : powerSupported ? 'Cadangan daya membantu, tetapi distribusinya tetap terbatas.' : 'Cadangan daya hanya cukup untuk fungsi dasar.');

    const communicationScores = { clear: 15, weak: 12, failed: 5 };
    const communicationDetails = {
      clear: 'Posisi bunker diterima jelas oleh Basarnas/SAR.',
      weak: 'Komunikasi dapat dipakai, tetapi pencarian perlu diperluas.',
      failed: 'Komunikasi tidak dapat dipastikan; keluarga bergantung pada pencarian sektor yang lebih luas.',
    };
    addCategory('communication', 'Komunikasi SAR', communicationScores[radioQuality], 15, communicationDetails[radioQuality]);

    const technicalInspections = ['inspected_ventilation', 'inspected_power', 'inspected_radio']
      .filter((flag) => this.flags[flag] === true).length;
    addCategory('inspection', 'Inspeksi Teknis', technicalInspections * 5, 15,
      technicalInspections === 3 ? 'Tiga pemeriksaan teknis memberi Aris pilihan saat sistem mulai gagal.' : technicalInspections > 0 ? 'Sebagian pemeriksaan teknis memberi informasi yang berguna di akhir.' : 'Tidak ada pemeriksaan teknis yang memberi keunggulan langsung di akhir.');

    const resourceReadiness = [
      ['food_packed', 2], ['drink_packed', 2], ['kit_packed', 3], ['snack_packed', 1],
      ['radio_packed', 2], ['extra_battery', 4], ['medical_mask_ready', 4], ['inspected_medical', 2], ['inspected_supply', 2],
    ].reduce((total, [flag, value]) => total + (this.flags[flag] === true ? value : 0), 0);
    addCategory('resources', 'Logistik & Medis', resourceReadiness, 20,
      resourceReadiness >= 14 ? 'Logistik dan perlengkapan medis memberi cadangan yang berarti.' : resourceReadiness >= 7 ? 'Sebagian logistik penting berhasil diamankan.' : 'Cadangan logistik dan medis terbatas ketika tekanan akhir datang.');

    const score = categories.reduce((total, category) => total + category.score, 0);
    return {
      score,
      maxScore: 100,
      radioQuality,
      categories,
      debriefItems: categories.map((category) => ({
        ...category,
        positive: category.score >= Math.ceil(category.max * 0.7),
      })),
    };
  }

  /** The one authoritative ending decision. No social or emotional flag is read here. */
  getEndingResult() {
    const preparedness = this.calculatePreparednessReport();
    const fatalCondition = this.health <= 0;
    const criticalSurvivalStable = this.health >= ENDING_RULES.GOOD_HEALTH_MIN
      && this.flags.air_uninspected !== true
      && this.flags.smoke_poisoned !== true
      && this.flags.water_poisoned !== true
      && this.flags.water_ruined !== true;
    const endingId = fatalCondition
      ? 'ending_bad'
      : criticalSurvivalStable && preparedness.score >= ENDING_RULES.GOOD_PREPAREDNESS_MIN
        ? 'ending_good'
        : 'ending_normal';
    return { endingId, preparedness, fatalCondition, criticalSurvivalStable };
  }

  evaluateEnding() {
    return this.getEndingResult().endingId;
  }

  /** Constructs 4–6 deterministic, state-driven epilogue cards. */
  evaluateModularEnding() {
    const result = this.getEndingResult();
    const { endingId, preparedness } = result;
    const isFatal = endingId === 'ending_bad';
    const modules = [];
    const hendraOutcome = this.flags.helped_stranger ? 'helped'
      : this.flags.stranger_guided ? 'guided'
        : this.flags.stranger_family_first ? 'family_first' : null;

    const hendraRescueNote = hendraOutcome === 'helped'
      ? ' Hendra kemudian menguatkan petunjuk sektor yang sudah diterima tim.'
      : hendraOutcome === 'guided'
        ? ' Petunjuk yang pernah Aris berikan membantu Hendra mencapai perlindungan lain.'
        : '';

    if (isFatal) {
      modules.push(
        { id: 'rescue', icon: '◈', title: 'PENUTUPAN KRISIS', tone: 'rescue', body: 'Tim pencari akhirnya menjangkau Bunker 72 setelah kondisi di dalam tidak lagi dapat dipulihkan. Tidak ada perayaan—hanya catatan tentang perlindungan yang habis terlalu cepat.' },
        { id: 'bunker', icon: '◫', title: 'KONDISI BUNKER', tone: 'bunker', body: 'Kegagalan kondisi vital menutup pilihan keluarga sebelum jendela penyelamatan selesai.' },
        { id: 'preparedness', icon: '⌁', title: 'CATATAN KESIAPSIAGAAN', tone: 'preparedness', body: 'Laporan ini menyoroti perlindungan teknis yang perlu diprioritaskan lebih awal pada situasi serupa.' },
      );
    } else {
      const rescueBodies = {
        clear: `Transmisi jelas membuat Basarnas/SAR mengidentifikasi Bunker 72 dengan cepat.${hendraRescueNote}`,
        weak: `Koordinat yang terputus-putus membuat Basarnas/SAR memperluas pola pencarian sebelum menemukan bunker.${hendraRescueNote}`,
        failed: `Panggilan radio tidak dapat dipastikan. Bunker akhirnya ditemukan melalui penyisiran sektor dan pencatatan shelter, bukan karena transmisi yang sempurna.${hendraRescueNote}`,
      };
      modules.push({ id: 'rescue', icon: '⌁', title: 'OPERASI PENYELAMATAN', tone: 'rescue', body: rescueBodies[preparedness.radioQuality] });

      const familyBody = this.flags.sarah_comforted_maya
        ? 'Sarah menjaga Maya tetap tenang ketika Aris menyelesaikan tugas teknis. Di luar bunker, mereka kembali membagi tanggung jawab yang sama.'
        : this.flags.maya_comforted
          ? 'Aris tidak mengabaikan ketakutan Maya. Dukungan singkat yang ia berikan tetap terasa saat keluarga keluar bersama.'
          : 'Aris dan Sarah bertahan dengan cara mereka sendiri, lalu menemukan ruang untuk saling menopang setelah pintu bunker terbuka.';
      modules.push({ id: 'family', icon: '◌', title: 'ARIS & SARAH', tone: 'family', body: familyBody });

      const mayaBody = this.flags.maya_toy_callback && this.flags.promised_maya
        ? 'Mobil merah itu masih ada di tangan Maya. Janji kecil yang dibuat sebelum bencana akhirnya mendapat jawaban: Ayah benar-benar pulang.'
        : this.flags.maya_toy_callback || this.flags.toy_bonded
          ? 'Maya membawa mainannya keluar dari bunker, sebuah benda kecil yang membuat malam panjang terasa tidak sepenuhnya asing.'
          : this.flags.maya_comforted
            ? 'Maya mengingat bahwa Aris tinggal bersamanya saat bunker terasa paling gelap.'
            : this.flags.sarah_comforted_maya
              ? 'Maya melewati malam-malam sulit dekat Sarah, sementara Aris menjaga fungsi bunker yang tersisa.'
              : 'Maya selamat bersama keluarganya; pemulihan dari tiga hari yang menegangkan akan membutuhkan waktu.';
      modules.push({ id: 'maya', icon: '◇', title: 'MAYA', tone: 'maya', body: mayaBody });

      if (hendraOutcome) {
        const hendraBodies = {
          helped: 'Hendra mengingat bantuan Aris di perjalanan ekspedisi. Pertemuan itu menjadi bagian dari cerita para penyintas setelah evakuasi.',
          guided: 'Arahan Aris membantu Hendra memilih jalur perlindungan yang lebih aman. Mereka bertemu lagi sebagai dua penyintas yang sama-sama berhasil keluar.',
          family_first: 'Aris memilih kembali kepada Sarah dan Maya ketika persediaan serta kondisi luar tidak memungkinkan berhenti. Nasib Hendra tidak dijadikan vonis atas keputusan itu.',
        };
        modules.push({ id: 'hendra', icon: '◍', title: 'HENDRA', tone: 'hendra', body: hendraBodies[hendraOutcome] });
      }

      const bunkerParts = [];
      if (this.flags.structural_damage) bunkerParts.push('Retakan struktur meninggalkan pekerjaan besar bagi tim setelah evakuasi.');
      else bunkerParts.push('Struktur Bunker 72 menahan tekanan terburuk hingga tim tiba.');
      if (this.flags.battery_committed) bunkerParts.push('Baterai ekstra benar-benar menjaga radio dan ventilasi hidup bersama pada jam-jam terakhir.');
      else if (this.flags.power_saved || this.flags.power_routed) bunkerParts.push('Pengaturan sirkuit memberi daya cukup untuk fungsi yang paling penting.');
      if (this.flags.medical_mask_used) bunkerParts.push('Masker medis tetap siap sebagai perlindungan singkat saat blower melemah.');
      modules.push({ id: 'bunker', icon: '▣', title: 'BUNKER 72', tone: 'bunker', body: bunkerParts.join(' ') });

      const preparationBody = preparedness.score >= 75
        ? 'Kesiapsiagaan teknis yang kuat memberi keluarga lebih banyak pilihan ketika semua sistem mulai terbatas.'
        : preparedness.score >= ENDING_RULES.GOOD_PREPAREDNESS_MIN
          ? 'Dasar kesiapsiagaan cukup kuat untuk menopang keluarga, meski tidak semua langkah dapat dilakukan sempurna.'
          : 'Keluarga tetap selamat, tetapi beberapa perlindungan teknis yang terlambat membuat jam-jam terakhir jauh lebih berat.';
      modules.push({ id: 'preparedness', icon: '⌂', title: 'KESIAPSIAGAAN', tone: 'preparedness', body: preparationBody });
    }

    const rescueTitle = endingId === 'ending_good'
      ? 'GOOD ENDING — BERTAHAN DENGAN STABIL'
      : endingId === 'ending_normal'
        ? 'NORMAL ENDING — SELAMAT DENGAN KONSEKUENSI'
        : 'BAD ENDING — KRISIS TIDAK TERATASI';
    return {
      ...result,
      rescueTitle,
      rescueBadge: isFatal ? 'STATUS: KRISIS FATAL' : `RESCUE: RADIO ${preparedness.radioQuality.toUpperCase()}`,
      modules,
      narrativeFull: modules.map((module) => module.body).join(' '),
      preparednessScore: preparedness.score,
      bnpbScore: preparedness.score,
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
      expeditionVisitedLocations: [...this.expeditionVisitedLocations],
    };
  }
}
