/**
 * saveMigration.js — Save Data Migration and Normalization Layer
 *
 * Responsibilities:
 *  - Pure, deterministic, idempotent migration of player save data across schema versions.
 *  - Story revision classification: decoupling narrative timeline (sealed72 vs legacy_phase7)
 *    from physical serialization format (schema version).
 *  - Safe backup creation before first structural upgrade.
 *  - Protection of future schema versions (no downward normalization or overwrites).
 *  - Tolerant normalization of inventory, stats, flags, and scenes without narrative rewinds.
 */

import {
  clamp,
  CURRENT_STORY_REVISION,
  NEW_GAME_START_SCENE_ID,
  normalizeSarahOfficeReadIds,
  normalizeSarahWarningResponse,
  SAVE_BACKUP_KEY,
  SAVE_SCHEMA_VERSION,
  STORY_REVISIONS,
  SURVIVAL,
} from './constants.js';
import { EXPEDITION_CONFIGS } from './expeditionConfig.js';

export const SUPPORTED_RUNTIME_SCENES = Object.freeze(new Set([
  'ending_eval',
  'trigger_ending_eval',
]));

export const LEGACY_DAY4_IDS = Object.freeze(new Set([
  'ending_fatal',
  'trigger_secret_ending_eval',
  'ending_best',
  'ending_secret_best',
  'ending_secret_bad',
  'ending_stranded_bad',
  'ending_near_miss',
]));

export const LEGACY_DAY2_EXPEDITION_SCENES = Object.freeze(new Set([
  'day2_expedition_setup',
  'day2_damage_check',
  'day2_panic_exit',
  'day2_calm_check',
  'day2_find_leak',
  'day2_leak_poor_fix',
  'day2_remedy_air',
  'day2_remedy_air_success',
  'day2_seal_leak',
  'day2_stranger_knock',
  'day2_stranger_resolved',
  'day2_radio_setup',
  'day2_radio_save',
  'day2_radio_drain',
  'day2_power_good',
  'day2_power_bad',
  'day2_scavenge_check',
  'day2_scavenge_success',
  'day2_scavenge_fail',
  'day2_scavenge_bypass_fail',
  'day2_scavenge_slow_success',
  'trigger_scavenge_eval',
]));

export const LEGACY_DAY3_CONSEQUENCE_SCENES = Object.freeze(new Set([
  'day3_water_issue',
  'day3_pressure_pinch',
  'day3_pinch_water_resolved',
  'day3_pinch_vent_inspected',
  'day3_water_poisoned',
  'day3_water_boil',
  'day3_water_filter',
  'day3_signal_bad',
  'day3_signal_good',
  'day3_knock_hear',
  'day3_knock_verify',
  'day3_knock_open',
  'day3_final_vigil',
]));

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates and normalizes expedition visited location IDs against known configs.
 * @param {any} value
 * @returns {string[]}
 */
export function normalizeExpeditionLocations(value) {
  const validIds = new Set(Object.keys(EXPEDITION_CONFIGS));
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && validIds.has(id)))]
    : [];
}

/**
 * Validates and normalizes Sarah's state flags while preserving other flags.
 * @param {any} value
 * @returns {object}
 */
export function normalizeFlags(value) {
  if (!isPlainObject(value)) return {};
  const flags = { ...value };
  flags.sarah_warning_response = normalizeSarahWarningResponse(flags.sarah_warning_response);
  flags.sarah_office_read_ids = normalizeSarahOfficeReadIds(flags.sarah_office_read_ids);
  flags.sarah_baseline_reviewed = flags.sarah_baseline_reviewed === true;
  flags.sarah_update_reviewed = flags.sarah_update_reviewed === true;
  return flags;
}

/**
 * Normalizes Sarah house scavenger result contract for idempotency and reload safety.
 * @param {any} result
 * @returns {object|null}
 */
export function normalizeHouseScavengeResult(result) {
  if (!isPlainObject(result)) return null;
  const items = Array.isArray(result.collectedItems)
    ? result.collectedItems.filter((x) => typeof x === 'string')
    : [];
  const resourceCounts = isPlainObject(result.resourceCounts)
    ? Object.fromEntries(
        Object.entries(result.resourceCounts).map(([k, v]) => [
          k,
          Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0,
        ])
      )
    : {};
  return {
    reason: typeof result.reason === 'string' ? result.reason : 'completed',
    collectedItems: items,
    resourceCounts,
    lateEvacuation: Boolean(result.lateEvacuation),
    lostItem: typeof result.lostItem === 'string' ? result.lostItem : null,
    committedAtSceneId: typeof result.committedAtSceneId === 'string' ? result.committedAtSceneId : 'prolog_expedition_call',
  };
}

/**
 * Backs up raw save string to a stable key once before structural upgrade.
 * Never overwrites an existing backup.
 * @param {string} rawString
 * @param {Storage|object|null} storage
 * @returns {boolean} true if backup was written, false otherwise
 */
export function backupRawSave(rawString, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage || typeof rawString !== 'string' || !rawString.trim()) return false;
  try {
    if (typeof storage.getItem === 'function') {
      const existing = storage.getItem(SAVE_BACKUP_KEY);
      if (existing !== null) return false;
    }
    if (typeof storage.setItem === 'function') {
      storage.setItem(SAVE_BACKUP_KEY, rawString);
      return true;
    }
  } catch (err) {
    console.warn('[saveMigration] Failed to write save backup:', err);
  }
  return false;
}

/**
 * Creates fresh default save data container.
 * @param {string|null} loadNotice
 * @param {string} storyRevision
 * @returns {object}
 */
export function createFreshSave(loadNotice = null, storyRevision = CURRENT_STORY_REVISION) {
  return {
    version: SAVE_SCHEMA_VERSION,
    storyRevision,
    sceneId: NEW_GAME_START_SCENE_ID,
    knowledge: SURVIVAL.DEFAULTS.knowledge,
    history: [],
    flags: {},
    inventory: { food: 0, drink: 0, kit: 0 },
    hunger: SURVIVAL.DEFAULTS.hunger,
    thirst: SURVIVAL.DEFAULTS.thirst,
    health: SURVIVAL.DEFAULTS.health,
    expeditionVisitedLocations: [],
    houseScavengeResult: null,
    loadNotice,
  };
}

/**
 * Pure, deterministic, idempotent migration function.
 *
 * @param {string|object} rawInput - JSON string or parsed object from localStorage.
 * @param {object} [options]
 * @param {object} [options.storyData] - Optional story data object containing scenes.
 * @param {object} [options.legacyStoryData] - Optional legacy story data object containing scenes.
 * @param {Storage|object|null} [options.storage] - Storage object for backup creation.
 * @param {boolean} [options.backupOldSave=true] - Whether to attempt backup of pre-schema-4 data.
 * @returns {{ success: boolean, data: object|null, reason?: string, isFutureVersion?: boolean, migrated?: boolean }}
 */
export function migrateSaveData(rawInput, options = {}) {
  let parsed = rawInput;
  let rawString = null;

  if (typeof rawInput === 'string') {
    rawString = rawInput;
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        success: false,
        reason: 'corrupted_json',
        isFutureVersion: false,
        data: null,
      };
    }
  }

  if (!isPlainObject(parsed)) {
    return {
      success: false,
      reason: 'invalid_data_shape',
      isFutureVersion: false,
      data: null,
    };
  }

  const rawVersion = typeof parsed.version === 'number' && Number.isFinite(parsed.version)
    ? parsed.version
    : 1;

  // Protect future save versions: do NOT normalize downward or overwrite.
  if (rawVersion > SAVE_SCHEMA_VERSION) {
    return {
      success: false,
      reason: 'unsupported_future_version',
      isFutureVersion: true,
      data: null,
      raw: parsed,
    };
  }

  // Backup pre-schema-4 raw saves before first upgrade.
  if (rawVersion < SAVE_SCHEMA_VERSION && options.backupOldSave !== false && rawString) {
    backupRawSave(rawString, options.storage);
  }

  // Deterministic Story Revision classification:
  // Schema <= 3 saves belong to the frozen legacy narrative timeline.
  // Schema 4 saves retain their assigned revision (or default to current).
  let storyRevision;
  if (rawVersion < SAVE_SCHEMA_VERSION) {
    storyRevision = STORY_REVISIONS.LEGACY_PHASE7;
  } else if (
    parsed.storyRevision === STORY_REVISIONS.SEALED72 ||
    parsed.storyRevision === STORY_REVISIONS.LEGACY_PHASE7
  ) {
    storyRevision = parsed.storyRevision;
  } else {
    storyRevision = CURRENT_STORY_REVISION;
  }

  // Scene validation & legacy scene translation
  const storedSceneId = typeof parsed.sceneId === 'string' ? parsed.sceneId : '';
  const isLegacyDay4 = storedSceneId.startsWith('day4_') || LEGACY_DAY4_IDS.has(storedSceneId);
  const isLegacyDay2 = LEGACY_DAY2_EXPEDITION_SCENES.has(storedSceneId);
  const isLegacyDay3 = LEGACY_DAY3_CONSEQUENCE_SCENES.has(storedSceneId);

  let activeStoryData = null;
  if (storyRevision === STORY_REVISIONS.LEGACY_PHASE7) {
    activeStoryData = options.legacyStoryData || null;
  } else if (storyRevision === STORY_REVISIONS.SEALED72) {
    activeStoryData = options.storyData || null;
  }
  const availableScenes = activeStoryData?.scenes || {};
  const hasSceneRegistry = Object.keys(availableScenes).length > 0;
  const isValidScene = hasSceneRegistry
    ? Boolean(availableScenes[storedSceneId]) || SUPPORTED_RUNTIME_SCENES.has(storedSceneId)
    : storedSceneId.length > 0 && !isLegacyDay4 && !isLegacyDay2 && !isLegacyDay3;

  if (!isValidScene && !isLegacyDay4 && !isLegacyDay2 && !isLegacyDay3) {
    const fallback = createFreshSave(
      'Save lama menunjuk adegan yang sudah tidak tersedia. Permainan dimulai kembali dengan aman.',
      storyRevision
    );
    return {
      success: true,
      data: fallback,
      migrated: true,
    };
  }

  const resolvedSceneId = isLegacyDay4
    ? 'ending_eval'
    : isLegacyDay2
      ? 'day2_expedition_map'
      : isLegacyDay3
        ? 'day3_start'
        : storedSceneId;

  const loadNotice = isLegacyDay4
    ? 'Save Day 4 lama dipindahkan ke evaluasi akhir jam ke-72.'
    : isLegacyDay2
      ? 'Save Day 2 lama dipindahkan ke peta rute ekspedisi.'
      : isLegacyDay3
        ? 'Save Day 3 lama dipindahkan ke awal rangkaian konsekuensi baru.'
        : (typeof parsed.loadNotice === 'string' ? parsed.loadNotice : null);

  // Normalize stats safely within numeric boundaries
  const knowledge = typeof parsed.knowledge === 'number' && Number.isFinite(parsed.knowledge)
    ? clamp(parsed.knowledge, 0, SURVIVAL.KNOWLEDGE_MAX)
    : SURVIVAL.DEFAULTS.knowledge;

  const hunger = typeof parsed.hunger === 'number' && Number.isFinite(parsed.hunger)
    ? clamp(parsed.hunger, 0, 100)
    : SURVIVAL.DEFAULTS.hunger;

  const thirst = typeof parsed.thirst === 'number' && Number.isFinite(parsed.thirst)
    ? clamp(parsed.thirst, 0, 100)
    : SURVIVAL.DEFAULTS.thirst;

  const health = typeof parsed.health === 'number' && Number.isFinite(parsed.health)
    ? clamp(parsed.health, 0, 100)
    : SURVIVAL.DEFAULTS.health;

  // Normalize inventory safely
  const rawInventory = isPlainObject(parsed.inventory) ? parsed.inventory : {};
  const inventory = {
    food: typeof rawInventory.food === 'number' && Number.isFinite(rawInventory.food)
      ? Math.max(0, Math.floor(rawInventory.food))
      : 0,
    drink: typeof rawInventory.drink === 'number' && Number.isFinite(rawInventory.drink)
      ? Math.max(0, Math.floor(rawInventory.drink))
      : 0,
    kit: typeof rawInventory.kit === 'number' && Number.isFinite(rawInventory.kit)
      ? Math.max(0, Math.floor(rawInventory.kit))
      : 0,
  };

  // Preserve other resource keys if present in inventory object
  Object.keys(rawInventory).forEach((k) => {
    if (!['food', 'drink', 'kit'].includes(k) && typeof rawInventory[k] === 'number' && Number.isFinite(rawInventory[k])) {
      inventory[k] = Math.max(0, Math.floor(rawInventory[k]));
    }
  });

  const history = Array.isArray(parsed.history)
    ? parsed.history.filter((entry) => isPlainObject(entry))
    : [];

  const flags = normalizeFlags(parsed.flags);
  const expeditionVisitedLocations = normalizeExpeditionLocations(parsed.expeditionVisitedLocations);
  const houseScavengeResult = normalizeHouseScavengeResult(parsed.houseScavengeResult);

  const migrated = rawVersion < SAVE_SCHEMA_VERSION || parsed.storyRevision !== storyRevision;

  const normalizedData = {
    version: SAVE_SCHEMA_VERSION,
    storyRevision,
    sceneId: resolvedSceneId,
    knowledge,
    history,
    flags,
    inventory,
    hunger,
    thirst,
    health,
    expeditionVisitedLocations,
    houseScavengeResult,
    loadNotice,
  };

  return {
    success: true,
    data: normalizedData,
    migrated,
  };
}
