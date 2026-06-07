/**
 * constants.js
 * Centralized module for all shared constants, configuration objects,
 * and pure utility functions used across the MVC layers.
 *
 * Import from this file. Never redefine these elsewhere.
 */

// ─── SCENE / ENDING IDENTIFIERS ────────────────────────────────────────────

/** All terminal ending scene IDs. Used to gate saves, audio, and HUD updates. */
export const ENDING_IDS = Object.freeze([
  'ending_bad',
  'ending_normal',
  'ending_best',
  'ending_fatal',
  'ending_secret_best',
  'ending_secret_bad',
  'ending_stranded_bad',
  'ending_near_miss',
]);

// ─── SURVIVAL SYSTEM CONFIGURATION ─────────────────────────────────────────

/**
 * Named constants for all survival stat calculations.
 * Changing a value here propagates to every consumer automatically.
 */
export const SURVIVAL = Object.freeze({
  /** Stat decay is calculated once per this many elapsed in-game hours. */
  DECAY_INTERVAL_HOURS: 6,

  /** Hunger points lost per DECAY_INTERVAL_HOURS of elapsed time. */
  HUNGER_DECAY_PER_INTERVAL: 18,

  /** Thirst points lost per DECAY_INTERVAL_HOURS of elapsed time. */
  THIRST_DECAY_PER_INTERVAL: 20,

  /** Health points lost per DECAY_INTERVAL_HOURS when hunger reaches zero. */
  HEALTH_PENALTY_HUNGER: 10,

  /** Health points lost per DECAY_INTERVAL_HOURS when thirst reaches zero. */
  HEALTH_PENALTY_THIRST: 15,

  /** Health damage applied to the player for choosing to panic-exit. */
  PANIC_HEALTH_PENALTY: 30,

  /** Max knowledge score cap. */
  KNOWLEDGE_MAX: 15,

  /** Default starting stat values for a new game. */
  DEFAULTS: Object.freeze({
    knowledge: 5,
    hunger: 100,
    thirst: 100,
    health: 100,
    inventory: Object.freeze({ food: 2, drink: 2, kit: 1 }),
  }),
});

/** Evaluation matrix for post-game analytics mapping choices to quality levels. */
export const CHOICE_QUALITY_MAP = Object.freeze({
  // Day 1
  'c_day1_lock_auto': 'Acceptable',
  'c_day1_lock_open': 'Risky',
  'c_day1_lock_manual': 'Optimal',
  'c_day1_air_noinspect': 'Risky',
  'c_day1_air_newseal': 'Optimal',
  'c_day1_air_wetmask': 'Acceptable',
  'c_day1_water_waste': 'Risky',
  'c_day1_water_rational': 'Optimal',
  'c_day1_water_noschedule': 'Acceptable',
  'c_day1_sanitation_good': 'Optimal',
  'c_day1_sanitation_door': 'Risky',
  'c_day1_sanitation_corner': 'Risky',
  'c_day1_rest_good': 'Optimal',
  'c_day1_rest_bad': 'Risky',

  // Day 2
  'c_day2_panic_exit': 'Risky',
  'c_day2_shelter_bed': 'Acceptable',
  'c_day2_hydraulic': 'Optimal',
  'c_day2_leak_cloth': 'Risky',
  'c_day2_leak_sealant': 'Optimal',
  'c_day2_leak_fan': 'Risky',
  'c_day2_smoke_water': 'Risky',
  'c_day2_smoke_firstaid': 'Optimal',
  'c_day2_smoke_chemical': 'Risky',
  'c_day2_radio_always_on': 'Risky',
  'c_day2_radio_schedule': 'Optimal',
  'c_day2_radio_generator': 'Acceptable',
  'c_day2_power_save': 'Optimal',
  'c_day2_power_alllight': 'Risky',
  'c_day2_power_modify': 'Risky',
  'c_day2_power_save_drain': 'Optimal',
  'c_day2_drain_alllight': 'Risky',
  'c_day2_drain_modify': 'Risky',

  // Day 3
  'c_day3_water_boil': 'Risky',
  'c_day3_water_filter': 'Optimal',
  'c_day3_water_settle': 'Risky',
  'c_day3_signal_knock': 'Risky',
  'c_day3_signal_cloth': 'Optimal',
  'c_day3_signal_fire': 'Risky',
  'c_day3_filter_signal_knock': 'Risky',
  'c_day3_filter_signal_cloth': 'Optimal',
  'c_day3_filter_signal_fire': 'Risky',
  'c_day3_door_open': 'Risky',
  'c_day3_door_verify': 'Optimal',
  'c_day3_door_ignore': 'Acceptable',
  'c_day3_pinch_focus_water': 'Acceptable',
  'c_day3_pinch_inspect_vent': 'Optimal',

  // Day 4
  'c_day4_oxygen_rest': 'Acceptable',
  'c_day4_oxygen_vent': 'Risky',
  'c_day4_oxygen_tank': 'Optimal',
  'c_day4_looters_shock': 'Optimal',
  'c_day4_looters_intercom': 'Acceptable',
  'c_day4_looters_barter': 'Risky'
});

// ─── POWER STATUS TIME THRESHOLDS ──────────────────────────────────────────

/**
 * In-game hour thresholds that determine the HUD power readout text.
 * Used exclusively by GameView.renderHud().
 */
export const POWER_THRESHOLDS = Object.freeze({
  EMERGENCY_CUTOFF: 78,  // After this hour, power status depends on power_saved flag
  EMERGENCY_START: 54,   // After this hour, power is at DARURAT
  ECONOMY_START: 44,     // After this hour, power is at HEMAT
});

// ─── SAVE SYSTEM ───────────────────────────────────────────────────────────

/** localStorage key for the primary game save slot. */
export const SAVE_KEY = 'bunker72_save_v1';

// ─── PURE UTILITY FUNCTIONS ─────────────────────────────────────────────────

/**
 * Clamps a numeric value between a minimum and maximum (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Extracts the leading integer from an hour string like "12 Jam" → 12.
 * Returns 0 if no integer is found.
 * @param {string|number} hourText
 * @returns {number}
 */
export function parseHour(hourText) {
  const match = String(hourText ?? '0').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/**
 * Maps an hour to its corresponding daily phase block (Morning, Afternoon, Evening, Night).
 * @param {number} hour
 * @returns {string}
 */
export function getTimePhase(hour) {
  const modHour = hour % 24;
  if (modHour === 0) return 'PAGI';
  if (modHour === 6) return 'SIANG';
  if (modHour === 12) return 'SORE';
  if (modHour === 18) return 'MALAM';
  return '';
}
