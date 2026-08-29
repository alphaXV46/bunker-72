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
  // Prologue
  'c_prolog_talk_ibu': 'Optimal',
  'c_prolog_play_anak': 'Optimal',
  'c_prolog_tune_radio': 'Optimal',
  'c_prolog_ibu_comfort': 'Optimal',
  'c_prolog_ibu_prepare': 'Optimal',
  'c_prolog_anak_promise': 'Optimal',
  'c_prolog_anak_snack': 'Optimal',
  'c_prolog_listen_careful': 'Optimal',
  'c_prolog_prepare_bag': 'Optimal',
  'c_prolog_foreshadow_check': 'Optimal',
  'c_prolog_skip': 'Optimal',

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
  'c_day3_final_vigil_embrace': 'Optimal',

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
  'c_day1_lock_open': 'Menunda penutupan pintu bunker memungkinkan abu Krakatau dan gas belerang masuk. Pintu harus langsung ditutup.',
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
  'c_day3_water_boil': 'Merebus air hanya membunuh bakteri, tapi memusatkan mineral vulkanik dan endapan abu. Air keruh wajib difilter karbon aktif.',
  'c_day3_water_settle': 'Mengendapkan air tanpa filter karbon aktif tidak menetralisir partikel halus dan kontaminan vulkanik terlarut.',
  'c_day3_signal_knock': 'Membuat suara bising dengan memukul pipa bisa mengundang penjarah atau hewan liar, kompromi pertahanan bunker.',
  'c_day3_signal_fire': 'Menyalakan api sekecil apapun di dalam bunker tertutup mengonsumsi oksigen berharga dan menghasilkan karbon monoksida mematikan.',
  'c_day3_filter_signal_knock': 'Sinyal suara sangat berisiko membongkar lokasi persembunyian Anda.',
  'c_day3_filter_signal_fire': 'Api dalam ruang tertutup adalah racun pembunuh diam-diam.',
  'c_day3_door_open': 'Membuka pintu sebelum memverifikasi identitas dan kode sandi resmi bisa menyebabkan bunker diinvasi.',
  'c_day4_oxygen_vent': 'Menyalakan ventilasi paksa tanpa filter menyedot gas beracun dari luar, mempercepat keracunan.',
  'c_day4_looters_barter': 'Negosiasi dengan penjarah saat pertahanan sudah bocor memberi celah mereka untuk menyerang langsung.',
  'c_day4_triage_save': 'Menyimpan seluruh persediaan saat kondisi kritis menyebabkan penurunan stamina ekstrem seluruh keluarga.',
  'c_day2_stranger_hostile': 'Menyerang atau mengusir penyintas lain yang tidak bersenjata secara agresif merusak peluang solidaritas sosial darurat.',
  'c_day1_maya_harsh': 'Menekan mental anak di tengah trauma bencana meningkatkan risiko histeria dan penurunan daya tahan tubuh.',
  'c_day4_scavenge_reckless': 'Menerobos reruntuhan yang tidak stabil tanpa perhitungan memperbesar risiko cedera fraktur dan terjebak debu panas.'
});

// ─── BNPB DISASTER MITIGATION EVALUATION ─────────────────────────────────────
export const BNPB_EVALUATION = Object.freeze({
  GRADES: Object.freeze({
    S: Object.freeze({ minScore: 85, badge: 'GRADE S', label: 'PROTOKOL ELITE BNPB', desc: 'Keputusan tanggap darurat sempurna sesuai standar mitigasi profesional. Keluarga terlindungi maksimal.' }),
    A: Object.freeze({ minScore: 70, badge: 'GRADE A', label: 'TANGGAP BENCANA UNGGUL', desc: 'Pemahaman keselamatan tinggi dengan mitigasi risiko yang sangat baik.' }),
    B: Object.freeze({ minScore: 55, badge: 'GRADE B', label: 'SIAGA MEMADAI', desc: 'Keluarga bertahan hidup, meski beberapa prosedur isolasi dan keselamatan kurang optimal.' }),
    C: Object.freeze({ minScore: 40, badge: 'GRADE C', label: 'WASPADA MINIMAL', desc: 'Banyak protokol keselamatan dilanggar; keluarga menanggung risiko infeksi dan trauma tinggi.' }),
    D: Object.freeze({ minScore: 0,  badge: 'GRADE D', label: 'KRITIS / GAGAL PROSEDUR', desc: 'Pelanggaran fatal prosedur isolasi darurat membahayakan kelangsungan hidup bunker.' }),
  }),
  getGrade(score) {
    if (score >= 85) return this.GRADES.S;
    if (score >= 70) return this.GRADES.A;
    if (score >= 55) return this.GRADES.B;
    if (score >= 40) return this.GRADES.C;
    return this.GRADES.D;
  }
});

// ─── MAJOR DECISIONS METADATA (TELLTALE-STYLE RECAP) ─────────────────────────
export const MAJOR_DECISIONS_META = Object.freeze([
  {
    id: 'decision_door_sealing',
    title: 'Penyegelan Palka Masuk (Hari 1)',
    choiceMap: {
      'c_day1_lock_manual': { label: 'Kunci Palang Baja Manual', outcome: 'Palka terkunci kokoh dari guncangan seismik awal.', karma: 'positive' },
      'c_day1_lock_auto':   { label: 'Kunci Otomatis Cepat', outcome: 'Palka tertutup aman meski mekanisme cadangan belum diperkuat.', karma: 'neutral' },
      'c_day1_lock_open':   { label: 'Buka Celah Mengamati Luar', outcome: 'Abu vulkanik dan gas asam merembes masuk ke ruang dek.', karma: 'negative' },
    }
  },
  {
    id: 'decision_maya_comfort',
    title: 'Kepanikan Maya di Ruang Gelap (Hari 1)',
    choiceMap: {
      'c_day1_maya_light':  { label: 'Nyalakan Lampu Darurat & Dekap Maya', outcome: 'Maya tenang dan merasa aman di tengah gempa susulan.', karma: 'positive' },
      'c_day1_maya_toy':    { label: 'Berikan Mainan Mobil & Kisah Harapan', outcome: 'Moral Maya pulih tanpa memboroskan daya baterai.', karma: 'positive' },
      'c_day1_maya_strict': { label: 'Tegur Maya Demi Penghematan Udara', outcome: 'Maya tertekan dan merasa terisolasi dalam gulita.', karma: 'negative' },
    }
  },
  {
    id: 'decision_stranger_day2',
    title: 'Kontak Penyintas Luar di Palka (Hari 2)',
    choiceMap: {
      'c_day2_stranger_airlock':  { label: 'Bantu Lewat Kotak Airlock (Masker & Air)', outcome: 'Penyintas terselamatkan; mereka mengingat kebaikan keluarga Anda.', karma: 'positive' },
      'c_day2_stranger_intercom': { label: 'Beri Petunjuk Posko BNPB via Interkom', outcome: 'Penyintas diarahkan ke posko resmi tanpa membuka pintu bunker.', karma: 'neutral' },
      'c_day2_stranger_harsh':    { label: 'Gertak & Usir Secara Kasar', outcome: 'Penyintas pergi dengan rasa dendam dan putus asa.', karma: 'negative' },
    }
  },
  {
    id: 'decision_radio_management',
    title: 'Manajemen Radio Komunikasi (Hari 2)',
    choiceMap: {
      'c_day2_radio_schedule':   { label: 'Jadwal Siar Teratur (10 Menit / 6 Jam)', outcome: 'Koordinat bunker tertangkap oleh posko SAR BNPB.', karma: 'positive' },
      'c_day2_radio_always_on':  { label: 'Nyalakan Radio Nonstop Mencari Sinyal', outcome: 'Baterai radio habis sebelum pesan balasan SAR diterima.', karma: 'negative' },
      'c_day2_radio_generator':  { label: 'Hubungkan Radio ke Bus Generator', outcome: 'Fluktuasi voltase merusak frekuensi receiver radio.', karma: 'negative' },
    }
  },
  {
    id: 'decision_water_filtration',
    title: 'Pencemaran Air Pipa Endapan (Hari 3)',
    choiceMap: {
      'c_day3_water_filter': { label: 'Filtrasi Karbon Aktif & Klorin', outcome: 'Air steril dan bebas mineral endapan abu vulkanik.', karma: 'positive' },
      'c_day3_water_boil':   { label: 'Rebus Langsung Air Keruh', outcome: 'Bakteri mati tetapi konsentrasi mineral asam merusak pencernaan.', karma: 'negative' },
      'c_day3_water_settle': { label: 'Endapkan Semalaman Tanpa Filter', outcome: 'Partikel halus vulkanik terminum oleh keluarga.', karma: 'negative' },
    }
  },
  {
    id: 'decision_day4_scavenge',
    title: 'Ekspedisi Scavenge Permukaan (Hari 4)',
    choiceMap: {
      'c_day4_scavenge_cooperate': { label: 'Bekerja Sama & Berbagi di Reruntuhan', outcome: 'Mendapat logistik air & makanan serta teman bertahan hidup.', karma: 'positive' },
      'c_day4_scavenge_cautious':  { label: 'Geledah Reruntuhan Aman & Segera Balik', outcome: 'Membawa ransum darurat secukupnya dengan aman ke bunker.', karma: 'neutral' },
      'c_day4_scavenge_reckless':  { label: 'Terobos Gudang & Ambil Semua Barang', outcome: 'Mendapat ransum melimpah tetapi menderita luka fisik serius.', karma: 'negative' },
    }
  }
]);

