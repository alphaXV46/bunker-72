/**
 * devConfig.js — Configuration and Constants for Bunker 72 Developer Console
 *
 * Dedicated developer tools configuration. Stripped/unused in production builds.
 */

export const IS_DEV = Boolean(import.meta.env?.DEV);

/**
 * Safe teleport coordinates inside the prologue house map (1672x941).
 * Verified against architectural colliders to prevent stuck player positions.
 */
export const HOUSE_TELEPORT_LOCATIONS = Object.freeze([
  { id: 'foyer',       name: 'Teras Depan (Spawn)',     x: 830,  y: 860 },
  { id: 'living',      name: 'Ruang Keluarga & TV',     x: 830,  y: 480 },
  { id: 'kitchen',     name: 'Dapur (Barat)',           x: 230,  y: 480 },
  { id: 'dining',      name: 'Ruang Makan',             x: 180,  y: 660 },
  { id: 'bath',        name: 'Kamar Mandi',             x: 400,  y: 650 },
  { id: 'master',      name: 'Kamar Tidur Utama',       x: 250,  y: 180 },
  { id: 'child',       name: 'Kamar Tidur Anak',        x: 1380, y: 180 },
  { id: 'office',      name: 'Ruang Kerja / Studio',    x: 1380, y: 520 },
  { id: 'bunker',      name: 'Palka Bunker (Vault)',    x: 800,  y: 200 },
]);

/**
 * Narrative scene milestones grouped by narrative phase.
 */
export const STORY_SCENE_CATALOG = Object.freeze([
  // Prologue
  { id: 'prolog_home',           phase: 'Prolog', label: 'Prolog 01 — Rumah Sebelum Gempa' },
  { id: 'prolog_with_ibu',       phase: 'Prolog', label: 'Prolog 02 — Percakapan Sarah' },
  { id: 'prolog_with_anak',      phase: 'Prolog', label: 'Prolog 03 — Janji dengan Maya' },
  { id: 'prolog_alert',          phase: 'Prolog', label: 'Prolog 04 — Sirene & Gempa Awal' },
  { id: 'prolog_packing',        phase: 'Prolog', label: 'Prolog 05 — Scavenger Evakuasi (40s)' },
  { id: 'prolog_threshold',      phase: 'Prolog', label: 'Prolog 06 — Menutup Palka Bunker' },
  { id: 'prolog_title',          phase: 'Prolog', label: 'Prolog 07 — Judul Bunker 72' },

  // Day 1
  { id: 'day1_power_boot',       phase: 'Day 1', label: 'Hari 1 — Booting Panel Daya' },
  { id: 'day1_inspection',       phase: 'Day 1', label: 'Hari 1 — Inspeksi Bunker (Interactive)' },
  { id: 'day1_lockdoor',         phase: 'Day 1', label: 'Hari 1 — Pintu Segel Utama' },
  { id: 'day1_air_safe',         phase: 'Day 1', label: 'Hari 1 — Masalah Filter Udara' },
  { id: 'day1_supplies',         phase: 'Day 1', label: 'Hari 1 — Ransum & Logistik' },
  { id: 'day1_maya_fear',        phase: 'Day 1', label: 'Hari 1 — Malam Pertama Maya' },

  // Day 2
  { id: 'day2_start',            phase: 'Day 2', label: 'Hari 2 — Gempa Susulan Subuh' },
  { id: 'day2_expedition_setup', phase: 'Day 2', label: 'Hari 2 — Persiapan Ekspedisi' },
  { id: 'day2_expedition_map',   phase: 'Day 2', label: 'Hari 2 — Peta Rute Ekspedisi' },
  { id: 'day2_hendra_encounter', phase: 'Day 2', label: 'Hari 2 — Pertemuan Hendra' },
  { id: 'day2_expedition_return',phase: 'Day 2', label: 'Hari 2 — Kembali ke Bunker' },

  // Day 3
  { id: 'day3_start',            phase: 'Day 3', label: 'Hari 3 — Pagi Hari Terakhir' },
  { id: 'day3_water_pressure',   phase: 'Day 3', label: 'Hari 3 — Kontaminasi Air' },
  { id: 'day3_power_pressure',   phase: 'Day 3', label: 'Hari 3 — Alokasi Arus Terakhir' },
  { id: 'day3_radio_rescue',     phase: 'Day 3', label: 'Hari 3 — Sinyal Radio VHF SAR' },
  { id: 'day3_final_dilemma',    phase: 'Day 3', label: 'Hari 3 — Dilema Jam ke-70' },
  { id: 'day3_final_hours',      phase: 'Day 3', label: 'Hari 3 — Menunggu Tim Evakuasi' },

  // Endings
  { id: 'ending_eval',           phase: 'Ending', label: 'Evaluasi Jam ke-72 (Auto Evaluator)' },
  { id: 'ending_bad',            phase: 'Ending', label: 'Ending Bad — Penutupan Krisis' },
  { id: 'ending_normal',         phase: 'Ending', label: 'Ending Normal — Penyelamatan Standar' },
  { id: 'ending_good',           phase: 'Ending', label: 'Ending Good — Evakuasi Optimal' },
]);
