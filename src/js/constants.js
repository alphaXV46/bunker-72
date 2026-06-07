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
  HUNGER_DECAY_PER_INTERVAL: 5,

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
