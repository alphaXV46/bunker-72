/** Shared identifiers, configuration, and pure utilities. */

/** Terminal scene IDs. Used to gate saves, audio, and HUD updates. */
export const ENDING_IDS = Object.freeze([
  'ending_bad',
  'ending_normal',
  'ending_good',
]);

/** Thresholds for the single Bad / Normal / Good evaluator. */
export const ENDING_RULES = Object.freeze({
  GOOD_PREPAREDNESS_MIN: 60,
  GOOD_HEALTH_MIN: 55,
});

/**
 * Lightweight narrative-survival tuning. Low hunger/thirst create a small,
 * proportional health cost, but only after crossing the warning threshold.
 */
export const SURVIVAL = Object.freeze({
  DECAY_INTERVAL_HOURS: 6,
  HUNGER_DECAY_PER_INTERVAL: 6,
  THIRST_DECAY_PER_INTERVAL: 7,
  HUNGER_WARNING_THRESHOLD: 30,
  THIRST_WARNING_THRESHOLD: 30,
  HEALTH_PENALTY_HUNGER: 3,
  HEALTH_PENALTY_THIRST: 5,
  HEALTH_PENALTY_LOW_HUNGER: 1,
  HEALTH_PENALTY_LOW_THIRST: 1.5,
  KNOWLEDGE_MAX: 15,
  DEFAULTS: Object.freeze({
    knowledge: 5,
    hunger: 100,
    thirst: 100,
    health: 100,
    inventory: Object.freeze({ food: 3, drink: 3, kit: 1 }),
  }),
});

/** Hour thresholds for the HUD power readout. */
export const POWER_THRESHOLDS = Object.freeze({
  EMERGENCY_CUTOFF: 72,
  EMERGENCY_START: 54,
  ECONOMY_START: 44,
});

export const SAVE_KEY = 'bunker72_save_v1';
export const SAVE_SCHEMA_VERSION = 3;

/** Fresh runs always begin in the pre-disaster narrative. Existing saves retain their scene. */
export const NEW_GAME_START_SCENE_ID = 'backstory_return';

/** Stable Sarah decision IDs allow history-only saves to recover the canonical enum. */
export const SARAH_WARNING_RESPONSE_BY_CHOICE_ID = Object.freeze({
  c_sarah_warning_escalate: 'escalate',
  c_sarah_warning_verify: 'verify',
  c_sarah_warning_maintain: 'maintain',
});

export const SARAH_WARNING_RESPONSES = Object.freeze([
  'escalate',
  'verify',
  'maintain',
]);

/** Reserved for the office interaction phase; saved values are validated now. */
export const SARAH_OFFICE_DOCUMENT_IDS = Object.freeze([
  'earthquake_preparedness',
  'tsunami_evacuation',
  'volcanic_ash_protection',
  'emergency_kit',
  'survival_handbook',
  'sarah_work_notes',
]);

export function normalizeSarahWarningResponse(value) {
  return SARAH_WARNING_RESPONSES.includes(value) ? value : null;
}

export function normalizeSarahOfficeReadIds(value) {
  const validIds = new Set(SARAH_OFFICE_DOCUMENT_IDS);
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && validIds.has(id)))]
    : [];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function parseHour(hourText) {
  const match = String(hourText ?? '0').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function getTimePhase(hour) {
  const modHour = hour % 24;
  if (modHour === 0) return 'PAGI';
  if (modHour === 6) return 'SIANG';
  if (modHour === 12) return 'SORE';
  if (modHour === 18) return 'MALAM';
  return '';
}

export function getKnowledgeLabel(knowledge) {
  if (knowledge <= 3) return 'Belum Siap';
  if (knowledge <= 7) return 'Waspada Dasar';
  if (knowledge <= 11) return 'Terlatih';
  return 'Protokol Elite';
}

/** Player-facing in-game learning summary, never an official assessment. */
export const PREPAREDNESS_EVALUATION = Object.freeze({
  GRADES: Object.freeze({
    S: Object.freeze({ minScore: 85, badge: 'GRADE S', label: 'SIAGA SANGAT KUAT', desc: 'Pilihan teknis memberi keluarga banyak ruang bertahan ketika sistem mulai tertekan.' }),
    A: Object.freeze({ minScore: 70, badge: 'GRADE A', label: 'SIAGA KUAT', desc: 'Mitigasi utama dijalankan dengan baik, meski situasi tetap menuntut kompromi.' }),
    B: Object.freeze({ minScore: 55, badge: 'GRADE B', label: 'SIAGA MEMADAI', desc: 'Dasar kesiapsiagaan cukup menopang keluarga, dengan beberapa celah yang perlu diperbaiki.' }),
    C: Object.freeze({ minScore: 40, badge: 'GRADE C', label: 'SIAGA TERBATAS', desc: 'Beberapa keputusan teknis terlambat atau tidak tersedia saat tekanan meningkat.' }),
    D: Object.freeze({ minScore: 0, badge: 'GRADE D', label: 'KRITIS', desc: 'Banyak perlindungan teknis tidak sempat disiapkan sebelum krisis memuncak.' }),
  }),
  getGrade(score) {
    if (score >= 85) return this.GRADES.S;
    if (score >= 70) return this.GRADES.A;
    if (score >= 55) return this.GRADES.B;
    if (score >= 40) return this.GRADES.C;
    return this.GRADES.D;
  },
});
