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
  'c_day2_scavenge_bypass': 'Risky',
  'c_day2_scavenge_slow': 'Optimal',
  'c_day2_scavenge_ignore': 'Acceptable',

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
  'c_day4_looters_barter': 'Risky',
  'c_day4_triage_food': 'Optimal',
  'c_day4_triage_drink': 'Optimal',
  'c_day4_triage_kit': 'Optimal',
  'c_day4_triage_save': 'Risky',
  'c_prolog_pack_food': 'Optimal',
  'c_prolog_pack_drink': 'Optimal',
  'c_prolog_pack_kit': 'Optimal',
  'c_prolog_pack_battery': 'Optimal',
  'c_prolog_pack_snack': 'Acceptable',
  'c_prolog_pack_toy': 'Acceptable',
  'c_day2_radio_battery': 'Optimal'
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

export function getKnowledgeLabel(k) {
  if (k <= 3) return "Belum Siap";
  if (k <= 7) return "Waspada Dasar";
  if (k <= 11) return "Terlatih";
  return "Protokol Elite";
}

export const FACTS_MAP = Object.freeze({
  'c_day1_lock_open': 'Menunda penutupan pintu bunker memungkinkan partikel PM2.5 dan gas mematikan masuk. Pintu harus langsung ditutup.',
  'c_day1_air_noinspect': 'Sistem filtrasi udara tanpa pengecekan katup dapat bocor. Inspeksi visual wajib dilakukan sebelum pengaktifan.',
  'c_day1_water_waste': 'Air adalah sumber daya paling berharga. Konsumsi berlebihan di jam pertama mempercepat dehidrasi kronis pada hari berikutnya.',
  'c_day1_sanitation_door': 'Menyimpan limbah tanpa wadah tertutup dekat akses utama memicu penyakit menular dalam ruang tertutup.',
  'c_day1_sanitation_corner': 'Penumpukan limbah sembarangan meningkatkan bakteri patogen udara.',
  'c_day1_rest_bad': 'Mengabaikan kebersihan area tidur akan menurunkan kekebalan tubuh drastis akibat paparan kotoran langsung.',
  'c_day2_panic_exit': 'Membuka pintu segel saat panik adalah penyebab kematian utama di bunker karena membiarkan paparan mematikan masuk seketika.',
  'c_day2_leak_cloth': 'Kain basah hanya menyaring partikel besar, tidak efektif menahan gas beracun. Selalu gunakan sealant khusus.',
  'c_day2_leak_fan': 'Meniup asap tidak menghilangkan racun, hanya memindahkannya. Retakan harus segera ditutup.',
  'c_day2_smoke_water': 'Membuang air untuk membilas asap hanya memboroskan ransum kritis. Gunakan P3K atau masker bersih.',
  'c_day2_smoke_chemical': 'Menyemprotkan disinfektan konsentrasi tinggi untuk asap justru meracuni udara ruangan lebih cepat.',
  'c_day2_radio_always_on': 'Radio menyala terus menerus adalah pemborosan energi fatal. Dalam bencana, atur jadwal menyimak siaran darurat.',
  'c_day2_power_alllight': 'Mempertahankan penerangan terang terus menerus menguras baterai utama. Biasakan hidup dengan lampu darurat minimalis.',
  'c_day2_power_modify': 'Memodifikasi paksa sirkuit listrik bisa merusak generator, menyebabkan mati total atau kebakaran internal.',
  'c_day2_drain_alllight': 'Tidak mematikan daya saat darurat berujung pada hilangnya seluruh fungsi elektronik vital.',
  'c_day2_drain_modify': 'Bypass listrik darurat sangat dilarang dalam SOP keselamatan bunker manapun.',
  'c_day2_scavenge_bypass': 'Mem-bypass kunci solenoid generator tanpa alat pelindung diri dapat memicu sengatan listrik tegangan tinggi dan kerusakan regulator daya.',
  'c_day3_water_boil': 'Merebus air hanya membunuh bakteri, tapi memusatkan racun kimia seperti logam berat. Air keruh logam wajib difilter.',
  'c_day3_water_settle': 'Mengendapkan air tanpa filter kimiawi tidak menetralisir polutan mikroskopis atau racun industri.',
  'c_day3_signal_knock': 'Membuat suara bising dengan memukul pipa bisa mengundang penjarah atau hewan liar, kompromi pertahanan bunker.',
  'c_day3_signal_fire': 'Menyalakan api sekecil apapun di dalam bunker tertutup mengonsumsi oksigen berharga dan menghasilkan karbon monoksida mematikan.',
  'c_day3_filter_signal_knock': 'Sinyal suara sangat berisiko membongkar lokasi persembunyian Anda.',
  'c_day3_filter_signal_fire': 'Api dalam ruang tertutup adalah racun pembunuh diam-diam.',
  'c_day3_door_open': 'Membuka pintu sebelum memverifikasi identitas dan kode sandi resmi bisa menyebabkan bunker diinvasi.',
  'c_day4_oxygen_vent': 'Menyalakan ventilasi paksa tanpa filter menyedot gas beracun dari luar, mempercepat keracunan.',
  'c_day4_looters_barter': 'Negosiasi dengan penjarah saat pertahanan sudah bocor memberi celah mereka untuk menyerang langsung.',
  'c_day4_triage_save': 'Menyimpan seluruh persediaan saat kondisi kritis menyebabkan penurunan stamina ekstrem seluruh keluarga.'
});

