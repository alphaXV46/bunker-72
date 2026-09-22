/**
 * gameModel.js — Model Layer (State only)
 *
 * Responsibilities:
 *  - Own and mutate all runtime game state.
 *  - Expose pure transformation methods (no DOM, no audio, no callbacks).
 *
 * Dependencies: constants.js only.
 */

import {
  clamp,
  CURRENT_STORY_REVISION,
  ENDING_IDS,
  ENDING_RULES,
  NEW_GAME_START_SCENE_ID,
  normalizeSarahOfficeReadIds,
  normalizeSarahWarningResponse,
  SARAH_WARNING_RESPONSE_BY_CHOICE_ID,
  SAVE_SCHEMA_VERSION,
  STORY_REVISIONS,
  SURVIVAL,
} from './constants.js';
import { EXPEDITION_CONFIGS } from './expeditionConfig.js';

const DEFAULT_FLAGS = Object.freeze({
  bunker_card_access_complete: false,
  day1_power_online: false,
  sarah_warning_response: null,
  sarah_office_read_ids: [],
  sarah_baseline_reviewed: false,
  sarah_update_reviewed: false,
  promised_maya: false,
  radio_reward_claimed: false,
  radio_quality: null,
  water_rational_good: false,
  water_used_freely: false,
  sanitation_secured: false,
  sanitation_exposed: false,
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
  helped_stranger: false,
  stranger_guided: false,
  stranger_family_first: false,
  prolog_minimarket_visited: false,
  prolog_medical_visited: false,
  prolog_minimarket_claimed: false,
  prolog_medical_claimed: false,
  prolog_opt2_consumed: false,
  bunker_plan_confirmed: false,
  day2_internal_bridge_complete: false,
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
  spare_filter_used: false,
  day2_crisis_applied: false,
  day2_diagnostic_air: false,
  day2_diagnostic_power: false,
  day2_diagnostic_structure: false,
  day2_diagnostic_supplies: false,
  day2_diagnostic_radio: false,
  day2_diagnostic_medical: false,
  day2_diagnostics_complete: false,
  day2_rotor_aligned: false,
  day2_service_hatch_open: false,
  day2_air_cleared: false,
  day2_power_conserved: false,
  day2_power_draw_heavy: false,
  day2_fatigue_applied: false,
  day3_wiring_complete: false,
});

// ─── FLAG RECONSTRUCTION MAP ────────────────────────────────────────────────
// Maps stable Choice IDs → the boolean flags they activate.
// Text-content matching has been fully removed (GDD v2.2 migration complete).
const FLAG_CHOICE_MAP = Object.freeze({
  'c_day1_air_noinspect':    'air_uninspected',
  'c_day1_air_wetmask':      'air_uninspected',
  'c_day1_air_newseal':      'air_seal_good',
  'c_day1_air_fix':          'air_remedied',
  'c_day1_air_spare_filter': 'air_seal_good',
  'c_day1_water_rational': 'water_rational_good',
  'c_day1_water_waste': 'water_used_freely',
  'c_day1_sanitation_good': 'sanitation_secured',
  'c_day1_waterwaste_sanitation_good': 'sanitation_secured',
  'c_day1_sanitation_door': 'sanitation_exposed',
  'c_day1_waterwaste_sanitation_door': 'sanitation_exposed',
  'c_day2_assess_systems': 'day2_crisis_applied',
  'c_day2_focus_air': 'day2_crisis_applied',
  'c_day2_focus_power': 'day2_crisis_applied',
  'c_day2_air_use_spare_filter': 'day2_air_cleared',
  'c_day2_air_clean_manual': 'day2_air_cleared',
  'c_day2_power_use_mask': 'day2_power_conserved',
  'c_day2_power_endure': 'day2_power_conserved',
  'diagnostic_day2_ventilation': 'day2_diagnostic_air',
  'diagnostic_day2_power_panel': 'day2_diagnostic_power',
  'diagnostic_day2_structure': 'day2_diagnostic_structure',
  'diagnostic_day2_supply_rack': 'day2_diagnostic_supplies',
  'diagnostic_day2_radio': 'day2_diagnostic_radio',
  'diagnostic_day2_medical_counter': 'day2_diagnostic_medical',
  'required_rotor': 'day2_rotor_aligned',
  'required_service_hatch': 'day2_service_hatch_open',
  'required_wires': 'day3_wiring_complete',
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
  'c_prolog_choose_minimarket': 'prolog_minimarket_visited',
  'c_prolog_choose_medical': 'prolog_medical_visited',
  'c_prolog_minimarket_take': 'prolog_minimarket_visited',
  'c_prolog_medical_take': 'prolog_medical_visited',
  'c_prolog_minimarket_second_take': 'prolog_minimarket_visited',
  'c_prolog_medical_second_take': 'prolog_medical_visited',
  'c_prolog_hendra_help': 'helped_stranger',
  'c_prolog_hendra_family': 'stranger_family_first',
  'c_prolog_opt2_skip_home': 'prolog_opt2_consumed',
  'c_prolog_confirm_bunker_plan': 'bunker_plan_confirmed',
  'c_day2_internal_bridge': 'day2_internal_bridge_complete',
  'c_day1_maya_light': 'maya_comforted',
  'c_day1_maya_toy': 'maya_comforted',
  'c_day1_maya_strict': 'sarah_comforted_maya',
  'c_day2_hendra_help': 'helped_stranger',
  'c_day2_hendra_guide': 'stranger_guided',
  'c_day2_hendra_family': 'stranger_family_first',
  'c_prolog_anak_promise': 'promised_maya',
});

const SARAH_PUBLIC_IMPACT_BODIES = Object.freeze({
  escalate: 'Karena Sarah mendorong koordinasi lebih awal, beberapa wilayah memperoleh waktu tambahan untuk mengaktifkan titik kumpul dan memeriksa jalur evakuasi. Setelah keadaan mulai stabil, pesan dari sejumlah keluarga mencatat bahwa waktu itu membantu mereka bergerak lebih cepat. Sarah tahu hasil tersebut lahir dari kerja banyak pihak, tetapi lega rekomendasinya ikut membuka ruang untuk bersiap.',
  verify: 'Keputusan Sarah untuk menunggu verifikasi menghasilkan informasi lintas instansi yang lebih lengkap sebelum tindak lanjut diperluas. Namun, waktu persiapan menjadi lebih sempit dan beberapa jalur sudah padat ketika warga mulai bergerak. Sebagian keluarga sempat terpisah sebelum akhirnya dipertemukan kembali di posko; bagi Sarah, hasil itu tetap menyimpan lega sekaligus beban.',
  maintain: 'Karena respons saat itu dipertahankan sambil menunggu evaluasi berikutnya, sebagian wilayah hanya memiliki waktu persiapan yang pendek ketika kondisi memburuk. Beberapa akses sudah sulit dilalui, sementara posko masih mencatat warga yang belum kembali atau belum ditemukan. Pencarian terus dilakukan, dan Sarah menyimpan catatan itu sebagai pengingat tentang beratnya keputusan di tengah ketidakpastian.',
});

export class GameModel {
  constructor() {
    this.currentSceneId = NEW_GAME_START_SCENE_ID;
    this.storyRevision = CURRENT_STORY_REVISION;
    this.knowledge     = SURVIVAL.DEFAULTS.knowledge;
    this.hunger        = SURVIVAL.DEFAULTS.hunger;
    this.thirst        = SURVIVAL.DEFAULTS.thirst;
    this.health        = SURVIVAL.DEFAULTS.health;
    this.history       = [];
    this.flags         = {};
    this.expeditionVisitedLocations = [];
    this.houseScavengeResult = null;
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

  /** Commits a scene-level required interaction exactly once. */
  completeRequiredInteraction(completionFlag) {
    if (!completionFlag || this.flags[completionFlag] === true) return false;
    this.flags[completionFlag] = true;
    return true;
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

  /** Commits Sarah's one canonical professional response. */
  setSarahWarningResponse(response) {
    const normalized = normalizeSarahWarningResponse(response);
    if (!normalized || this.flags.sarah_warning_response !== null) return false;
    this.flags.sarah_warning_response = normalized;
    return true;
  }

  /** Records one validated Sarah office document without duplicates. */
  markSarahOfficeDocumentRead(documentId) {
    const previous = normalizeSarahOfficeReadIds(this.flags.sarah_office_read_ids);
    const next = normalizeSarahOfficeReadIds([...previous, documentId]);
    this.flags.sarah_office_read_ids = next;
    return next.length > previous.length;
  }

  /** Commits completion only at the end of Sarah's baseline review. */
  completeSarahBaselineReview() {
    if (this.flags.sarah_baseline_reviewed === true) return false;
    this.flags.sarah_baseline_reviewed = true;
    return true;
  }

  /** Commits the later cross-agency data review exactly once. */
  completeSarahUpdateReview() {
    if (this.flags.sarah_update_reviewed === true) return false;
    this.flags.sarah_update_reviewed = true;
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
   * @param {Array}    expeditionVisitedLocations
   * @param {string}   storyRevision
   * @param {object|null} houseScavengeResult
   */
  init(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health, expeditionVisitedLocations = [], storyRevision = CURRENT_STORY_REVISION, houseScavengeResult = null) {
    this.currentSceneId = sceneId || NEW_GAME_START_SCENE_ID;
    this.storyRevision  = (storyRevision === STORY_REVISIONS.SEALED72 || storyRevision === STORY_REVISIONS.LEGACY_PHASE7)
      ? storyRevision
      : CURRENT_STORY_REVISION;
    this.houseScavengeResult = houseScavengeResult && typeof houseScavengeResult === 'object'
      ? { ...houseScavengeResult }
      : null;
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
    this.flags.sarah_warning_response = normalizeSarahWarningResponse(this.flags.sarah_warning_response);
    this.flags.sarah_office_read_ids = normalizeSarahOfficeReadIds(this.flags.sarah_office_read_ids);
    this.flags.sarah_baseline_reviewed = this.flags.sarah_baseline_reviewed === true;
    this.flags.sarah_update_reviewed = this.flags.sarah_update_reviewed === true;

    // Keep the Hendra decision as one mutually-exclusive outcome even when a
    // legacy save contains more than one stale social flag.
    const hendraOutcomeFlags = ['helped_stranger', 'stranger_guided', 'stranger_family_first'];
    const latestHendraChoice = [...this.history].reverse().find((entry) => [
      'c_day2_hendra_help', 'c_day2_hendra_guide', 'c_day2_hendra_family',
      'c_day2_stranger_airlock', 'c_day2_stranger_intercom', 'c_day2_stranger_harsh',
      'c_prolog_hendra_help', 'c_prolog_hendra_family',
    ].includes(entry?.choiceId));
    const historyOutcome = latestHendraChoice && (
      latestHendraChoice.choiceId === 'c_day2_hendra_help' || latestHendraChoice.choiceId === 'c_day2_stranger_airlock' || latestHendraChoice.choiceId === 'c_prolog_hendra_help' ? 'helped_stranger' :
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
    if (this.flags.air_remedied === true || this.flags.day2_air_cleared === true) {
      delete this.flags.air_uninspected;
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
    // Older sealed72 saves recorded this choice but did not spend a bottle.
    // A new save carries the flag, so the migration runs only once.
    if (this.storyRevision === STORY_REVISIONS.SEALED72
      && !Object.prototype.hasOwnProperty.call(restoredFlags, 'water_used_freely')
      && this.history.some((entry) => entry?.choiceId === 'c_day1_water_waste')) {
      this.inventory.drink = Math.max(0, this.inventory.drink - 1);
    }

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
      const sarahResponse = SARAH_WARNING_RESPONSE_BY_CHOICE_ID[entry?.choiceId];
      if (sarahResponse) flags.sarah_warning_response = sarahResponse;
    });
    if (flags.air_remedied || flags.day2_air_cleared) {
      delete flags.air_uninspected;
    }
    if (history.some(e => e.choiceId === 'c_day1_air_spare_filter' || e.choiceId === 'c_day2_air_use_spare_filter' || e.choiceId === 'c_day3_final_keep_air')) {
      flags.spare_filter_used = true;
    }
    if (history.some(e => e.choiceId === 'c_day2_power_endure')) {
      flags.day2_fatigue_applied = true;
    }
    if (history.some(e => e.choiceId === 'c_day2_power_use_mask')) {
      flags.medical_mask_used = true;
    }
    const primaryDay2Diagnostics = [
      'day2_diagnostic_air',
      'day2_diagnostic_power',
      'day2_diagnostic_structure',
      'day2_diagnostic_supplies',
    ];
    if (primaryDay2Diagnostics.filter((flag) => flags[flag] === true).length >= 3) {
      flags.day2_diagnostics_complete = true;
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
    if (history.some(e => e.choiceId === 'c_prolog_minimarket_take' || e.choiceId === 'c_prolog_minimarket_second_take')) {
      flags.prolog_minimarket_visited = true;
      flags.prolog_minimarket_claimed = true;
      flags.extra_battery = true;
      flags.battery_packed = true;
      flags.food_packed = true;
      flags.drink_packed = true;
    }
    if (history.some(e => e.choiceId === 'c_prolog_medical_take' || e.choiceId === 'c_prolog_medical_second_take')) {
      flags.prolog_medical_visited = true;
      flags.prolog_medical_claimed = true;
      flags.kit_packed = true;
      flags.medical_mask_ready = true;
    }
    if (history.some(e => e.choiceId === 'c_prolog_hendra_help' || e.choiceId === 'c_prolog_opt2_medical' || e.choiceId === 'c_prolog_opt2_minimarket' || e.choiceId === 'c_prolog_opt2_skip_home')) {
      flags.prolog_opt2_consumed = true;
    }
    // A history-only save may not carry the flags object. Reconstruct the
    // single latest Hendra outcome so the encounter cannot repeat on resume.
    const latestHendra = [...history].reverse().find((entry) => [
      'c_day2_hendra_help', 'c_day2_hendra_guide', 'c_day2_hendra_family',
      'c_day2_stranger_airlock', 'c_day2_stranger_intercom', 'c_day2_stranger_harsh',
      'c_prolog_hendra_help', 'c_prolog_hendra_family',
    ].includes(entry?.choiceId));
    if (latestHendra) {
      flags.hendra_encountered = true;
      delete flags.helped_stranger;
      delete flags.stranger_guided;
      delete flags.stranger_family_first;
      if (latestHendra.choiceId === 'c_day2_hendra_help' || latestHendra.choiceId === 'c_day2_stranger_airlock' || latestHendra.choiceId === 'c_prolog_hendra_help') flags.helped_stranger = true;
      if (latestHendra.choiceId === 'c_day2_hendra_guide' || latestHendra.choiceId === 'c_day2_stranger_intercom') flags.stranger_guided = true;
      if (latestHendra.choiceId === 'c_day2_hendra_family' || latestHendra.choiceId === 'c_day2_stranger_harsh' || latestHendra.choiceId === 'c_prolog_hendra_family') flags.stranger_family_first = true;
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
      || this.flags.final_air_protected === true || this.flags.found_spare_filter === true
      || this.flags.day2_air_cleared === true;
    addCategory('air', 'Udara & Shelter', airFailure ? 0 : airPrepared ? 20 : 10, 20,
      airFailure ? 'Perlindungan udara tidak memadai saat tekanan memuncak; sirkulasi udara sempat terganggu.' : airPrepared ? 'Sirkulasi udara dan integritas shelter sudah mendukung perlindungan keluarga.' : 'Shelter bertahan pada tingkat dasar, meski margin sirkulasi sempat menipis.');

    const waterFailure = this.flags.water_poisoned === true || this.flags.water_ruined === true;
    const waterSafe = this.flags.water_filtered === true && !waterFailure;
    addCategory('water', 'Air Bersih', waterFailure ? 0 : waterSafe ? 15 : 7, 15,
      waterFailure ? 'Cadangan air bersih tidak dapat dipertahankan aman hingga akhir.' : waterSafe ? 'Pengelolaan dan penyaringan air sudah mendukung kebutuhan cairan keluarga.' : 'Cadangan air membantu bertahan, namun perlindungan filtrasi masih perlu diperkuat.');

    const powerStable = this.flags.power_saved === true || this.flags.power_routed === true || this.flags.battery_committed === true || this.flags.day2_power_conserved === true;
    const powerSupported = this.flags.radio_power_stable === true || this.flags.extra_battery === true;
    addCategory('power', 'Daya Darurat', powerStable ? 15 : powerSupported ? 10 : 5, 15,
      powerStable ? 'Distribusi daya darurat sudah mendukung keberlangsungan fungsi penting bunker.' : powerSupported ? 'Cadangan daya membantu operasional dasar, meski margin sempat menipis.' : 'Daya darurat terbatas pada fungsi dasar; cadangan masih perlu diperkuat.');

    const communicationScores = { clear: 15, weak: 12, failed: 5 };
    const communicationDetails = {
      clear: 'Posisi bunker terkonfirmasi jelas dan presisi oleh Basarnas/SAR.',
      weak: 'Sinyal radio terputus-putus tetapi membantu mempersempit sektor pencarian.',
      failed: 'Sinyal radio tidak dapat dipastikan; pencarian bergantung pada penyisiran sektor bertahap.',
    };
    addCategory('communication', 'Komunikasi SAR', communicationScores[radioQuality], 15, communicationDetails[radioQuality]);

    const technicalInspections = ['inspected_ventilation', 'inspected_power', 'inspected_radio']
      .filter((flag) => this.flags[flag] === true).length;
    addCategory('inspection', 'Inspeksi Teknis', technicalInspections * 5, 15,
      technicalInspections === 3 ? 'Pemeriksaan teknis menyeluruh sudah mendukung kejelasan operasional saat sistem terganggu.' : technicalInspections > 0 ? 'Sebagian pemeriksaan teknis membantu mengenali kondisi sistem bunker.' : 'Pemeriksaan teknis belum dilakukan; pemahaman batas instrumen masih perlu diperkuat.');

    const resourceReadiness = [
      ['food_packed', 2], ['drink_packed', 2], ['kit_packed', 3], ['snack_packed', 1],
      ['radio_packed', 2], ['extra_battery', 4], ['medical_mask_ready', 4], ['inspected_medical', 2], ['inspected_supply', 2],
    ].reduce((total, [flag, value]) => total + (this.flags[flag] === true ? value : 0), 0);
    addCategory('resources', 'Logistik & Medis', resourceReadiness, 20,
      resourceReadiness >= 14 ? 'Cadangan logistik dan medis sudah mendukung ketahanan keluarga selama isolasi.' : resourceReadiness >= 7 ? 'Sebagian cadangan logistik membantu memenuhi kebutuhan pokok keluarga.' : 'Cadangan logistik dan medis terbatas; margin persediaan sempat menipis.');

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
    const criticalRescueCondition = this.health <= 0;
    const criticalSurvivalStable = this.health >= ENDING_RULES.GOOD_HEALTH_MIN
      && this.flags.air_uninspected !== true
      && this.flags.smoke_poisoned !== true
      && this.flags.water_poisoned !== true
      && this.flags.water_ruined !== true;
    const endingId = criticalRescueCondition
      ? 'ending_bad'
      : criticalSurvivalStable && preparedness.score >= ENDING_RULES.GOOD_PREPAREDNESS_MIN
        ? 'ending_good'
        : 'ending_normal';
    return { endingId, preparedness, criticalRescueCondition, criticalSurvivalStable };
  }

  evaluateEnding() {
    return this.getEndingResult().endingId;
  }

  /** Constructs deterministic, state-driven epilogue cards. */
  evaluateModularEnding() {
    const result = this.getEndingResult();
    const { endingId, preparedness } = result;
    const isCriticalRescue = endingId === 'ending_bad';
    const modules = [];
    const hendraOutcome = this.flags.helped_stranger ? 'helped'
      : this.flags.stranger_guided ? 'guided'
        : this.flags.stranger_family_first ? 'family_first' : null;

    const isSealed72 = this.storyRevision === STORY_REVISIONS.SEALED72;
    const hendraRescueNote = !isSealed72
      ? (hendraOutcome === 'helped'
          ? ' Hendra kemudian menguatkan petunjuk sektor yang sudah diterima tim.'
          : hendraOutcome === 'guided'
            ? ' Petunjuk yang pernah Aris berikan membantu Hendra mencapai perlindungan lain.'
            : '')
      : '';
    const sarahPublicImpactBody = SARAH_PUBLIC_IMPACT_BODIES[this.flags.sarah_warning_response] || null;
    const sarahPublicImpactModule = sarahPublicImpactBody
      ? { id: 'sarah_public_impact', icon: '◎', title: 'DAMPAK PUBLIK — SARAH', tone: 'sarah', body: sarahPublicImpactBody }
      : null;

    if (isCriticalRescue) {
      // 1. Critical Rescue
      modules.push({
        id: 'rescue',
        icon: '◈',
        title: 'PENYELAMATAN KRITIS',
        tone: 'rescue',
        body: 'Tim SAR menjangkau shelter dan mengevakuasi Aris, Sarah, dan Maya dalam kondisi sangat lemah. Ketiganya selamat dan segera mendapat penanganan medis; pemulihan mereka membutuhkan waktu.',
      });
      // 2. Sarah Public Impact
      if (sarahPublicImpactModule) modules.push(sarahPublicImpactModule);
      // 3. Family Condition / Recovery
      modules.push({
        id: 'family',
        icon: '◌',
        title: 'KONDISI KELUARGA',
        tone: 'family',
        body: 'Aris, Sarah, dan Maya bertahan bersama melewati batas daya tahan fisik mereka. Di posko darurat, perawatan intensif segera diberikan untuk memulai pemulihan panjang mereka.',
      });
      // 4. Bunker / System Condition
      modules.push({
        id: 'bunker',
        icon: '◫',
        title: 'KONDISI BUNKER',
        tone: 'bunker',
        body: 'Beberapa sistem perlindungan gagal bertahan dan beroperasi melampaui batas toleransi. Keluarga harus meninggalkan perlengkapan saat dievakuasi; bunker perlu diperiksa petugas sebelum dapat digunakan kembali.',
      });
      // 5. Preparedness Debrief
      modules.push({
        id: 'preparedness',
        icon: '⌁',
        title: 'CATATAN KESIAPSIAGAAN',
        tone: 'preparedness',
        body: 'Evaluasi teknis ini menggarisbawahi pentingnya inspeksi awal dan cadangan logistik untuk memperlebar batas bertahan keluarga saat krisis serupa terjadi.',
      });
      // 6. Hendra (brief acknowledgment without delaying medical care)
      if (isSealed72 && hendraOutcome === 'helped') {
        modules.push({
          id: 'hendra',
          icon: '◍',
          title: 'HENDRA',
          tone: 'hendra',
          body: 'Di area transit evakuasi, Hendra yang berhasil mencapai posko bukit sempat mengenali Aris di sisi barat rekahan. Ia menyampaikan terima kasih singkat sebelum tim medis melanjutkan penanganan darurat bagi keluarga.',
        });
      }
    } else {
      // 1. Rescue / Immediate survival outcome
      const rescueBodies = isSealed72
        ? {
            clear: 'Transmisi jelas membuat Basarnas/SAR mengidentifikasi Bunker 72 dengan cepat.',
            weak: 'Koordinat yang terputus-putus membuat Basarnas/SAR memperluas pola pencarian sebelum menemukan bunker.',
            failed: 'Panggilan radio tidak dapat dipastikan. Lokasi keluarga akhirnya ditemukan melalui penyisiran sektor bertahap dan pendataan warga di kawasan pemukiman, bukan karena transmisi yang sempurna.',
          }
        : {
            clear: `Transmisi jelas membuat Basarnas/SAR mengidentifikasi Bunker 72 dengan cepat.${hendraRescueNote}`,
            weak: `Koordinat yang terputus-putus membuat Basarnas/SAR memperluas pola pencarian sebelum menemukan bunker.${hendraRescueNote}`,
            failed: `Panggilan radio tidak dapat dipastikan. Lokasi keluarga akhirnya ditemukan melalui penyisiran sektor bertahap dan pendataan warga di kawasan pemukiman, bukan karena transmisi yang sempurna.${hendraRescueNote}`,
          };
      modules.push({ id: 'rescue', icon: '⌁', title: 'OPERASI PENYELAMATAN', tone: 'rescue', body: rescueBodies[preparedness.radioQuality] });

      // 2. Sarah Public Impact
      if (sarahPublicImpactModule) modules.push(sarahPublicImpactModule);

      // 3. Aris & Sarah (Joint effort)
      const familyBody = this.flags.sarah_comforted_maya
        ? 'Sarah menjaga ketenangan keluarga dan memantau perkembangan situasi, sementara Aris mengendalikan fungsi teknis bunker. Keduanya saling menopang hingga pintu palka dibuka.'
        : this.flags.maya_comforted
          ? 'Kombinasi keteguhan Sarah mendampingi keluarga dan kesiapan teknis Aris memastikan bunker tetap bertahan. Keduanya berbagi beban hingga bantuan tiba.'
          : 'Aris dan Sarah saling melengkapi peran penting mereka: kesiapan teknis bunker berpadu dengan keteguhan menjaga ketenangan keluarga hingga pintu terbuka.';
      modules.push({ id: 'family', icon: '◌', title: 'ARIS & SARAH', tone: 'family', body: familyBody });

      // 4. Maya (Emotional payoff)
      const hasToy = this.flags.toy_packed === true || this.flags.maya_toy_callback === true || this.flags.toy_bonded === true;
      const mayaBody = hasToy && this.flags.promised_maya
        ? 'Mobil merah itu masih berada di genggaman Maya. Janji kecil sebelum bencana akhirnya terjawab utuh: Ayah benar-benar pulang.'
        : hasToy
          ? 'Maya membawa mainan mobil merahnya keluar dari bunker—sebuah benda kecil yang membuat malam panjang terasa tidak sepenuhnya asing.'
          : this.flags.maya_comforted
            ? 'Maya mengingat bahwa Aris mendampinginya saat bunker terasa paling gelap, membantunya tetap tabah.'
            : this.flags.sarah_comforted_maya
              ? 'Maya melewati malam-malam sulit dekat Sarah, sementara Aris menjaga fungsi bunker yang tersisa.'
              : 'Maya selamat bersama keluarganya; kehangatan keluarga tetap utuh meski pemulihan dari tiga hari yang menegangkan akan membutuhkan waktu.';
      modules.push({ id: 'maya', icon: '◇', title: 'MAYA', tone: 'maya', body: mayaBody });

      // 5. Hendra (IF helped in sealed72; or all 3 in legacy)
      if (hendraOutcome) {
        if (isSealed72) {
          if (hendraOutcome === 'helped') {
            modules.push({
              id: 'hendra',
              icon: '◍',
              title: 'HENDRA',
              tone: 'hendra',
              body: 'Di dekat posko tanggap darurat, Hendra yang berhasil mencapai bukit evakuasi mengenali Aris dan menghampirinya. Ucapan terima kasihnya sederhana namun tulus—pertolongan Aris saat gempa susulan di sisi barat rekahan memberinya kesempatan selamat sampai ke posko bukit.',
            });
          }
        } else {
          const hendraBodies = {
            helped: 'Hendra mengingat bantuan Aris di perjalanan ekspedisi. Pertemuan itu menjadi bagian dari cerita para penyintas setelah evakuasi.',
            guided: 'Arahan Aris membantu Hendra memilih jalur perlindungan yang lebih aman. Mereka bertemu lagi sebagai dua penyintas yang sama-sama berhasil keluar.',
            family_first: 'Aris memilih kembali kepada Sarah dan Maya ketika persediaan serta kondisi luar tidak memungkinkan berhenti. Nasib Hendra tidak dijadikan vonis atas keputusan itu.',
          };
          modules.push({ id: 'hendra', icon: '◍', title: 'HENDRA', tone: 'hendra', body: hendraBodies[hendraOutcome] });
        }
      }

      // 6. Bunker / Technical Aftermath
      const bunkerParts = [];
      if (this.flags.structural_damage) bunkerParts.push('Retakan struktur meninggalkan pekerjaan besar bagi tim setelah evakuasi.');
      else bunkerParts.push('Struktur Bunker 72 menahan tekanan terburuk hingga tim tiba.');
      if (isSealed72) {
        if (this.flags.day2_air_cleared) {
          if (this.flags.spare_filter_used && !this.flags.final_air_protected) {
            bunkerParts.push('Penggantian filter pada Hari 2 memulihkan sirkulasi udara lebih cepat, meski cadangan filter habis sebelum jam terakhir.');
          } else if (this.flags.day2_power_draw_heavy) {
            bunkerParts.push('Pembersihan blower manual memulihkan sirkulasi, meski beban motor menyerap margin daya darurat bunker.');
          } else {
            bunkerParts.push('Penanganan ventilasi pada krisis Hari 2 menjaga sirkulasi udara tetap aman.');
          }
        } else if (this.flags.day2_power_conserved) {
          if (this.flags.day2_fatigue_applied) {
            bunkerParts.push('Penghematan daya darurat menjaga cadangan daya bunker bertahan, meski keluarga harus menahan kelelahan di udara pengap.');
          } else {
            bunkerParts.push('Penyesuaian beban listrik darurat berhasil menghemat daya hingga fase akhir.');
          }
        }
      }
      if (this.flags.battery_committed) bunkerParts.push('Baterai ekstra menopang pemancar radio VHF secara mandiri tanpa membebani daya darurat bunker.');
      else if (this.flags.power_saved || this.flags.power_routed) bunkerParts.push('Pengaturan sirkuit memberi daya cukup untuk fungsi yang paling penting.');
      if (this.flags.final_power_conserved) bunkerParts.push('Pada jam terakhir, sirkuit tambahan dimatikan sehingga indikator dasar bunker tetap menyala saat tim tiba.');
      if (this.flags.medical_mask_used) bunkerParts.push('Masker disiapkan untuk mengurangi paparan debu; masker tidak menyediakan oksigen atau menggantikan ventilasi.');
      modules.push({ id: 'bunker', icon: '▣', title: 'BUNKER 72', tone: 'bunker', body: bunkerParts.join(' ') });

      // 7. Preparedness Debrief
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
        : 'BAD ENDING — PENYELAMATAN KRITIS';
    return {
      ...result,
      rescueTitle,
      rescueBadge: isCriticalRescue ? 'STATUS: EVAKUASI & PERAWATAN MEDIS' : `RESCUE: RADIO ${preparedness.radioQuality.toUpperCase()}`,
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
    const data = {
      version:       SAVE_SCHEMA_VERSION,
      storyRevision: this.storyRevision,
      sceneId:       this.currentSceneId,
      knowledge:     this.knowledge,
      history:       this.history,
      flags:         this.flags,
      inventory:     this.inventory,
      hunger:        this.hunger,
      thirst:        this.thirst,
      health:        this.health,
      expeditionVisitedLocations: [...this.expeditionVisitedLocations],
    };
    if (this.houseScavengeResult) {
      data.houseScavengeResult = { ...this.houseScavengeResult };
    }
    return data;
  }
}
