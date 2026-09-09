/**
 * verify_phase_a.mjs — Phase A Automated Test Suite
 *
 * Covers:
 *  - Save migration fixtures A through P (schema 1–4, legacy mappings, corruption, future version)
 *  - Single-shot backup creation to bunker72_save_v1_backup
 *  - Narrative timeline classification (sealed72 vs legacy_phase7)
 *  - Prohibition of narrative rewinds on legacy saves
 *  - Atomic minigame result transaction verification (scavenger, expedition, radio)
 *  - Idempotency of minigame completion and result handlers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = { setTimeout: (fn) => fn(), clearTimeout: () => {} };

try {
  const {
    CURRENT_STORY_REVISION,
    NEW_GAME_START_SCENE_ID,
    SAVE_BACKUP_KEY,
    SAVE_SCHEMA_VERSION,
    STORY_REVISIONS,
    SURVIVAL,
  } = await vite.ssrLoadModule('/src/js/constants.js');

  const {
    backupRawSave,
    createFreshSave,
    migrateSaveData,
    normalizeExpeditionLocations,
    normalizeFlags,
    normalizeHouseScavengeResult,
  } = await vite.ssrLoadModule('/src/js/saveMigration.js');

  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');

  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));

  console.log('--- RUNNING PHASE A TESTS ---');

  // Helper to create in-memory storage mocking localStorage
  function createMockStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
      getItem(key) { return map.has(key) ? map.get(key) : null; },
      setItem(key, val) { map.set(key, String(val)); },
      removeItem(key) { map.delete(key); },
      clear() { map.clear(); },
      has(key) { return map.has(key); },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: MIGRATION FIXTURES (A THROUGH P)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('[1/4] Testing Migration Fixtures A-P...');

  // A. Current schema 3 fresh-like save
  {
    const fixtureA = {
      version: 3,
      sceneId: 'backstory_return',
      knowledge: 5,
      history: [],
      flags: {},
      inventory: { food: 0, drink: 0, kit: 0 },
      hunger: 100,
      thirst: 100,
      health: 100,
      expeditionVisitedLocations: [],
    };
    const res = migrateSaveData(fixtureA, { storyData, legacyStoryData });
    assert.equal(res.success, true);
    assert.equal(res.data.version, SAVE_SCHEMA_VERSION);
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(res.data.sceneId, 'backstory_return');
    assert.deepEqual(res.data.inventory, { food: 0, drink: 0, kit: 0 });
  }

  // B. Schema 3 Sarah backstory save
  {
    const fixtureB = {
      version: 3,
      sceneId: 'backstory_sarah_office',
      knowledge: 5,
      history: [],
      flags: { sarah_office_read_ids: ['work_notes'] },
      inventory: { food: 0, drink: 0, kit: 0 },
      hunger: 100,
      thirst: 100,
      health: 100,
      expeditionVisitedLocations: [],
    };
    const res = migrateSaveData(fixtureB, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'backstory_sarah_office');
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.deepEqual(res.data.flags.sarah_office_read_ids, ['work_notes']);
  }

  // C. Schema 3 prologue save
  {
    const fixtureC = {
      version: 3,
      sceneId: 'prolog_home',
      knowledge: 5,
      history: [],
      flags: { promised_maya: true },
      inventory: { food: 0, drink: 0, kit: 0 },
      hunger: 100,
      thirst: 100,
      health: 100,
      expeditionVisitedLocations: [],
    };
    const res = migrateSaveData(fixtureC, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'prolog_home');
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(res.data.flags.promised_maya, true);
  }

  // D. Schema 3 Day 1 save
  {
    const fixtureD = {
      version: 3,
      sceneId: 'day1_lockdoor',
      knowledge: 7,
      history: [{ hour: '6 Jam', text: 'Inspeksi', choiceId: 'inspection_ventilation', effect: 1 }],
      flags: { inspected_ventilation: true, found_spare_filter: true },
      inventory: { food: 2, drink: 2, kit: 1 },
      hunger: 94,
      thirst: 93,
      health: 100,
      expeditionVisitedLocations: [],
    };
    const res = migrateSaveData(fixtureD, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'day1_lockdoor');
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(res.data.flags.inspected_ventilation, true);
    assert.equal(res.data.knowledge, 7);
  }

  // E. Schema 3 Day 2 expedition map save (NEVER REWOUND)
  {
    const fixtureE = {
      version: 3,
      sceneId: 'day2_expedition_map',
      knowledge: 7,
      history: [],
      flags: {},
      inventory: { food: 2, drink: 2, kit: 1 },
      hunger: 80,
      thirst: 75,
      health: 90,
      expeditionVisitedLocations: [],
    };
    const res = migrateSaveData(fixtureE, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'day2_expedition_map');
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(res.data.sceneId, 'day2_expedition_map', 'Day 2 save must NOT rewind to prologue');
  }

  // F. Schema 3 mid-expedition save with visited locations
  {
    const fixtureF = {
      version: 3,
      sceneId: 'day2_expedition_map',
      knowledge: 7,
      history: [{ hour: '30 Jam', text: 'Rumah tetangga dikunjungi', choiceId: 'expedition_neighbor_house', effect: 0 }],
      flags: {},
      inventory: { food: 3, drink: 3, kit: 1 },
      hunger: 70,
      thirst: 65,
      health: 85,
      expeditionVisitedLocations: ['neighbor_house'],
    };
    const res = migrateSaveData(fixtureF, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'day2_expedition_map');
    assert.deepEqual(res.data.expeditionVisitedLocations, ['neighbor_house']);
  }

  // G. Schema 3 Hendra encounter/outcome
  {
    const fixtureG = {
      version: 3,
      sceneId: 'day2_hendra_encounter',
      knowledge: 7,
      history: [],
      flags: { helped_stranger: true, hendra_encountered: true },
      inventory: { food: 2, drink: 1, kit: 1 },
      hunger: 70,
      thirst: 65,
      health: 85,
      expeditionVisitedLocations: ['neighbor_house'],
    };
    const res = migrateSaveData(fixtureG, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'day2_hendra_encounter');
    assert.equal(res.data.flags.helped_stranger, true);
    assert.equal(res.data.flags.hendra_encountered, true);
  }

  // H. Schema 3 Day 3 save
  {
    const fixtureH = {
      version: 3,
      sceneId: 'day3_start',
      knowledge: 9,
      history: [],
      flags: { water_filtered: true, power_saved: true },
      inventory: { food: 1, drink: 2, kit: 1 },
      hunger: 60,
      thirst: 55,
      health: 80,
      expeditionVisitedLocations: ['neighbor_house', 'medical_post'],
    };
    const res = migrateSaveData(fixtureH, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'day3_start');
    assert.equal(res.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
  }

  // I. Schema 3 ending save
  {
    const fixtureI = {
      version: 3,
      sceneId: 'ending_good',
      knowledge: 12,
      history: [],
      flags: { radio_quality: 'clear' },
      inventory: { food: 1, drink: 1, kit: 1 },
      hunger: 50,
      thirst: 50,
      health: 90,
      expeditionVisitedLocations: ['neighbor_house', 'medical_post'],
    };
    const res = migrateSaveData(fixtureI, { storyData, legacyStoryData });
    assert.equal(res.data.sceneId, 'ending_good');
  }

  // J. null Sarah warning state
  {
    const fixtureJ = {
      version: 3,
      sceneId: 'day1_lockdoor',
      flags: { sarah_warning_response: null },
    };
    const res = migrateSaveData(fixtureJ, { storyData, legacyStoryData });
    assert.equal(res.data.flags.sarah_warning_response, null);
  }

  // K. invalid duplicate arrays
  {
    const fixtureK = {
      version: 3,
      sceneId: 'day1_lockdoor',
      flags: { sarah_office_read_ids: ['work_notes', 'work_notes', 'tsunami_route', 'invalid_xyz'] },
      expeditionVisitedLocations: ['neighbor_house', 'neighbor_house', 'non_existent_loc'],
    };
    const res = migrateSaveData(fixtureK, { storyData, legacyStoryData });
    assert.deepEqual(res.data.flags.sarah_office_read_ids, ['work_notes', 'tsunami_route']);
    assert.deepEqual(res.data.expeditionVisitedLocations, ['neighbor_house']);
  }

  // L. invalid enum
  {
    const fixtureL = {
      version: 3,
      sceneId: 'day1_lockdoor',
      flags: { sarah_warning_response: 'illegal_value_not_enum' },
    };
    const res = migrateSaveData(fixtureL, { storyData, legacyStoryData });
    assert.equal(res.data.flags.sarah_warning_response, null);
  }

  // M. malformed numeric inventory
  {
    const fixtureM = {
      version: 3,
      sceneId: 'day1_lockdoor',
      inventory: { food: 'three', drink: -99, kit: NaN },
    };
    const res = migrateSaveData(fixtureM, { storyData, legacyStoryData });
    assert.equal(res.data.inventory.food, 0);
    assert.equal(res.data.inventory.drink, 0);
    assert.equal(res.data.inventory.kit, 0);
  }

  // N. already-migrated schema 4 save
  {
    const fixtureN = {
      version: 4,
      storyRevision: 'sealed72',
      sceneId: 'backstory_return',
      knowledge: 5,
      history: [],
      flags: {},
      inventory: { food: 0, drink: 0, kit: 0 },
      hunger: 100,
      thirst: 100,
      health: 100,
      expeditionVisitedLocations: [],
      houseScavengeResult: null,
      loadNotice: null,
    };
    const res = migrateSaveData(fixtureN, { storyData, legacyStoryData });
    assert.equal(res.migrated, false);
    assert.equal(res.data.version, 4);
    assert.equal(res.data.storyRevision, 'sealed72');
  }

  // O. migration run twice produces identical output (Idempotency)
  {
    const fixtureO = {
      version: 2,
      sceneId: 'day2_start',
      knowledge: 5,
      history: [],
      flags: { helped_stranger: true },
      inventory: { food: 2, drink: 2, kit: 1 },
      hunger: 80,
      thirst: 75,
      health: 80,
      expeditionVisitedLocations: [],
    };
    const pass1 = migrateSaveData(fixtureO, { storyData, legacyStoryData });
    const pass2 = migrateSaveData(pass1.data, { storyData, legacyStoryData });
    assert.deepEqual(pass2.data, pass1.data, 'Migration must be strictly idempotent');
  }

  // P. unsupported future schema
  {
    const fixtureP = {
      version: 99,
      storyRevision: 'unknown_future',
      sceneId: 'some_future_scene',
    };
    const res = migrateSaveData(fixtureP, { storyData, legacyStoryData });
    assert.equal(res.success, false);
    assert.equal(res.isFutureVersion, true);
    assert.equal(res.reason, 'unsupported_future_version');
  }

  console.log('✓ All 16 Migration Fixtures (A-P) PASSED');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: BACKUP BEHAVIOR
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('[2/4] Testing Save Backup Behavior...');

  {
    const storage = createMockStorage();
    const rawSaveV3 = JSON.stringify({ version: 3, sceneId: 'day2_start', health: 80 });

    // First migration should back up raw data
    const res1 = migrateSaveData(rawSaveV3, { storyData, legacyStoryData, storage, backupOldSave: true });
    assert.equal(res1.success, true);
    assert.equal(storage.getItem(SAVE_BACKUP_KEY), rawSaveV3);

    // Subsequent migration or autosave must NOT overwrite the backup
    const rawSaveV4 = JSON.stringify({ version: 4, sceneId: 'day3_start', health: 50 });
    backupRawSave(rawSaveV4, storage);
    assert.equal(storage.getItem(SAVE_BACKUP_KEY), rawSaveV3, 'Backup must not be overwritten');
  }

  console.log('✓ Save Backup Behavior PASSED');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: ATOMIC RESULT TRANSACTIONS & IDEMPOTENCY
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('[3/4] Testing Atomic Result Transactions & Idempotency...');

  // 3A. House Scavenger Transaction & Idempotency
  {
    const noop = () => {};
    const view = new Proxy({
      isTyping: false,
      dom: { choicesPanel: { innerHTML: '', classList: { remove: noop } }, dialogueText: { textContent: '' } },
      typeText(text, done) { done?.(); },
    }, { get: (target, key) => target[key] ?? noop });

    const model = new GameModel();
    model.init('prolog_packing', 5, [], {}, { food: 0, drink: 0, kit: 0 }, 100, 100, 100, []);

    const saves = [];
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view,
      audio: new Proxy({}, { get: () => noop }),
      onSave: (s) => saves.push(structuredClone(s)),
      onEnd: noop,
      bunkerMinigame: { close: noop },
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      _unlockedMinigameChoiceIds: new Set(),
    });

    // 1. First completion: rewards applied, canonical result stored, next scene committed
    engine.handleScavengerComplete({
      collectedItems: ['food', 'drink', 'kit', 'radio', 'battery', 'toy'],
      reason: 'entered_hatch',
    });

    assert.equal(model.currentSceneId, 'prolog_expedition_call');
    assert.equal(model.inventory.food, 2); // 1 base + 1 food
    assert.equal(model.inventory.drink, 2); // 1 base + 1 drink
    assert.equal(model.inventory.kit, 1);
    assert.equal(model.flags.food_packed, true);
    assert.equal(model.flags.extra_battery, true);
    assert.notEqual(model.houseScavengeResult, null);
    assert.equal(model.houseScavengeResult.reason, 'entered_hatch');

    // Verify the save committed the next scene checkpoint atomically with the result
    const lastSave = saves.at(-1);
    assert.equal(lastSave.sceneId, 'prolog_expedition_call', 'Save checkpoint must be the destination scene');
    assert.equal(lastSave.inventory.food, 2);
    assert.notEqual(lastSave.houseScavengeResult, null);

    const saveCountBeforeDuplicate = saves.length;

    // 2. Duplicate call: must be strictly idempotent
    engine.handleScavengerComplete({
      collectedItems: ['food', 'drink'],
      reason: 'entered_hatch',
    });
    assert.equal(model.inventory.food, 2, 'Duplicate scavenger complete must NOT add duplicate items');
    assert.equal(saves.length, saveCountBeforeDuplicate, 'Duplicate complete must not trigger extra saves');

    // 3. Reload simulation after commit: if rendered at prolog_packing, advances immediately
    engine.renderScene('prolog_packing');
    assert.equal(model.currentSceneId, 'prolog_expedition_call', 'Reload at prolog_packing with committed result must advance');
  }

  // 3B. Day 2 Expedition Transaction & Idempotency
  {
    const noop = () => {};
    const view = new Proxy({
      isTyping: false,
      dom: { choicesPanel: { innerHTML: '', classList: { remove: noop } }, dialogueText: { textContent: '' } },
      typeText(text, done) { done?.(); },
    }, { get: (target, key) => target[key] ?? noop });

    const model = new GameModel();
    model.init('day2_expedition_map', 5, [], {}, { food: 2, drink: 2, kit: 1 }, 80, 80, 80, [], STORY_REVISIONS.LEGACY_PHASE7);

    const saves = [];
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view,
      audio: new Proxy({}, { get: () => noop }),
      onSave: (s) => saves.push(structuredClone(s)),
      onEnd: noop,
      bunkerMinigame: { close: noop },
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      _unlockedMinigameChoiceIds: new Set(),
    });

    // 1. Complete first location
    engine.handleExpeditionComplete({
      locationId: 'neighbor_house',
      collectedItems: ['food', 'drink'],
    });

    assert.equal(model.inventory.food, 3);
    assert.equal(model.inventory.drink, 3);
    assert.deepEqual(model.expeditionVisitedLocations, ['neighbor_house']);
    assert.equal(model.currentSceneId, 'day2_hendra_encounter', 'Must transition to Hendra encounter');
    assert.equal(saves.at(-1).sceneId, 'day2_hendra_encounter', 'Save must be destination scene');

    const foodAfterExpedition = model.inventory.food;
    const savesAfterExpedition = saves.length;

    // 2. Duplicate callback with same locationId: must be rejected
    engine.handleExpeditionComplete({
      locationId: 'neighbor_house',
      collectedItems: ['food', 'drink'],
    });
    assert.equal(model.inventory.food, foodAfterExpedition, 'Duplicate location callback must not grant rewards');
    assert.equal(saves.length, savesAfterExpedition);
  }

  // 3C. Day 3 Radio Result Transaction & Idempotency
  {
    const noop = () => {};
    const view = new Proxy({
      isTyping: false,
      dom: { choicesPanel: { innerHTML: '', classList: { remove: noop } }, dialogueText: { textContent: '' } },
      typeText(text, done) { done?.(); },
    }, { get: (target, key) => target[key] ?? noop });

    const model = new GameModel();
    model.init('day3_radio_rescue', 8, [], {}, { food: 1, drink: 1, kit: 1 }, 60, 60, 80, []);

    const saves = [];
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view,
      audio: new Proxy({}, { get: () => noop }),
      onSave: (s) => saves.push(structuredClone(s)),
      onEnd: noop,
      bunkerMinigame: { close: noop },
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      _unlockedMinigameChoiceIds: new Set(),
    });

    engine.handleFinalRadioResult({ quality: 'clear', frequency: 98.4, strength: 80 });
    assert.equal(model.flags.radio_quality, 'clear');
    assert.equal(model.currentSceneId, 'day3_radio_clear');
    assert.equal(saves.at(-1).sceneId, 'day3_radio_clear');

    // Duplicate call with different quality: cannot overwrite canonical committed quality
    engine.handleFinalRadioResult({ quality: 'weak', frequency: 98.4, strength: 40 });
    assert.equal(model.flags.radio_quality, 'clear', 'Canonical radio quality must remain clear');
  }

  console.log('✓ Atomic Result Transactions & Idempotency PASSED');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: INVENTORY BASELINE VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('[4/4] Testing Inventory Baseline Contract...');

  {
    // 1. SURVIVAL default constant: 3/3/1
    assert.deepEqual(SURVIVAL.DEFAULTS.inventory, { food: 3, drink: 3, kit: 1 });

    // 2. Fresh GameModel instance: 3/3/1
    const m = new GameModel();
    assert.deepEqual(m.inventory, { food: 3, drink: 3, kit: 1 });

    // 3. createFreshSave in saveMigration: 0/0/0
    const freshSave = createFreshSave();
    assert.deepEqual(freshSave.inventory, { food: 0, drink: 0, kit: 0 });

    // 4. Model init with null inventory falls back to SURVIVAL.DEFAULTS
    const m2 = new GameModel();
    m2.init('backstory_return');
    assert.deepEqual(m2.inventory, { food: 3, drink: 3, kit: 1 });

    // 5. Model init with explicit 0/0/0 (from main.js new game) stays 0/0/0
    const m3 = new GameModel();
    m3.init('backstory_return', 5, [], {}, { food: 0, drink: 0, kit: 0 });
    assert.deepEqual(m3.inventory, { food: 0, drink: 0, kit: 0 });
  }

  console.log('✓ Inventory Baseline Contract PASSED');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: STRICT REVISION ISOLATION & RECOVERY TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('[5/5] Testing Strict Revision Isolation & Recovery...');

  {
    const noop = () => {};
    const view = new Proxy({
      isTyping: false,
      dom: { choicesPanel: { innerHTML: '', classList: { remove: noop } }, dialogueText: { textContent: '' } },
      typeText(text, done) { done?.(); },
    }, { get: (target, key) => target[key] ?? noop });

    const testLegacyData = {
      scenes: {
        ...legacyStoryData.scenes,
        scene_legacy_only: { id: 'scene_legacy_only', text: 'Hanya ada di legacy Phase 7', hour: '30 Jam' },
      },
    };
    const testSealedData = {
      scenes: {
        ...storyData.scenes,
        scene_sealed72_only: { id: 'scene_sealed72_only', text: 'Hanya ada di Sealed 72', hour: '30 Jam' },
      },
    };

    const saves = [];
    const engine = Object.create(StoryEngine.prototype);
    const model = new GameModel();
    Object.assign(engine, {
      model,
      storyData: testSealedData,
      legacyStoryData: testLegacyData,
      view,
      audio: new Proxy({}, { get: () => noop }),
      onSave: (s) => saves.push(structuredClone(s)),
      onEnd: noop,
      bunkerMinigame: { close: noop },
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      _unlockedMinigameChoiceIds: new Set(),
    });

    // 1. legacy_phase7 + legacyStoryData = null MUST NOT resolve a sealed72 scene
    const engineNoLegacy = Object.create(StoryEngine.prototype);
    Object.assign(engineNoLegacy, {
      storyData: testSealedData,
      legacyStoryData: null,
    });
    assert.equal(
      engineNoLegacy.getStoryData(STORY_REVISIONS.LEGACY_PHASE7),
      null,
      'legacy_phase7 with null legacyStoryData must return null'
    );
    assert.equal(
      engineNoLegacy.getScene('backstory_return', STORY_REVISIONS.LEGACY_PHASE7),
      null,
      'legacy_phase7 with null legacyStoryData must NOT resolve a sealed72 scene'
    );

    // 2. sealed72 does not read legacy data
    assert.equal(
      engine.getScene('scene_legacy_only', STORY_REVISIONS.SEALED72),
      null,
      'sealed72 must not resolve scenes exclusive to legacy dataset'
    );

    // 3. unknown revision does not silently resolve either timeline
    assert.equal(
      engine.getStoryData('unknown_timeline'),
      null,
      'unknown revision must return null storyData'
    );
    assert.equal(
      engine.getScene('backstory_return', 'unknown_timeline'),
      null,
      'unknown revision must not resolve scenes from either timeline'
    );
    assert.equal(
      engine.getScene('scene_legacy_only', 'unknown_timeline'),
      null
    );
    assert.equal(
      engine.getScene('scene_sealed72_only', 'unknown_timeline'),
      null
    );

    // 4. legacy_phase7 cannot resolve a scene that exists only in sealed72 data
    assert.equal(
      engine.getScene('scene_sealed72_only', STORY_REVISIONS.LEGACY_PHASE7),
      null,
      'legacy_phase7 must not resolve scenes exclusive to sealed72 dataset'
    );

    // 5. valid scenes resolve normally from their respective revisions
    const validSealed = engine.getScene('scene_sealed72_only', STORY_REVISIONS.SEALED72);
    assert.notEqual(validSealed, null);
    assert.equal(validSealed.id, 'scene_sealed72_only');

    const validLegacy = engine.getScene('scene_legacy_only', STORY_REVISIONS.LEGACY_PHASE7);
    assert.notEqual(validLegacy, null);
    assert.equal(validLegacy.id, 'scene_legacy_only');

    assert.notEqual(engine.getScene('backstory_return', STORY_REVISIONS.SEALED72), null);
    assert.notEqual(engine.getScene('backstory_return', STORY_REVISIONS.LEGACY_PHASE7), null);
    assert.notEqual(engine.getScene('day2_expedition_map', STORY_REVISIONS.LEGACY_PHASE7), null);

    // 6. a missing scene does not mutate storyRevision
    model.init('backstory_return', 5, [], {}, { food: 1, drink: 1, kit: 1 }, 100, 100, 100, [], STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(model.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);

    // Attempting to render an invalid scene fails safely without changing model state or revision
    engine.renderScene('completely_non_existent_scene');
    assert.equal(model.storyRevision, STORY_REVISIONS.LEGACY_PHASE7, 'storyRevision must NOT mutate on missing scene');
    assert.equal(model.currentSceneId, 'backstory_return', 'currentSceneId must NOT change on missing scene');

    // Starting with an invalid scene safely recovers to NEW_GAME_START_SCENE_ID without altering revision
    engine.start(
      'completely_non_existent_scene',
      5,
      [],
      {},
      { food: 1, drink: 1, kit: 1 },
      100,
      100,
      100,
      [],
      STORY_REVISIONS.LEGACY_PHASE7
    );
    assert.equal(model.storyRevision, STORY_REVISIONS.LEGACY_PHASE7, 'storyRevision must be preserved during recovery');
    assert.equal(model.currentSceneId, NEW_GAME_START_SCENE_ID, 'Must recover to canonical NEW_GAME_START_SCENE_ID');

    // Starting with an unknown revision safely recovers to CURRENT_STORY_REVISION
    engine.start(
      'backstory_return',
      5,
      [],
      {},
      { food: 1, drink: 1, kit: 1 },
      100,
      100,
      100,
      [],
      'corrupt_custom_revision'
    );
    assert.equal(model.storyRevision, CURRENT_STORY_REVISION, 'unknown revision in start() must recover safely to CURRENT_STORY_REVISION');
    assert.equal(model.currentSceneId, NEW_GAME_START_SCENE_ID);

    // 5. a missing scene does not overwrite the user's save with another timeline
    const savesCountBeforeInvalid = saves.length;
    engine.renderScene('completely_non_existent_scene');
    assert.equal(saves.length, savesCountBeforeInvalid, 'Missing scene must not trigger onSave or overwrite save data');

    // 6. migrated legacy Day 2 saves still load correctly
    const legacyDay2Save = {
      version: 3,
      sceneId: 'day2_expedition_map',
      knowledge: 7,
      history: [],
      flags: {},
      inventory: { food: 2, drink: 2, kit: 1 },
      hunger: 80,
      thirst: 75,
      health: 90,
      expeditionVisitedLocations: [],
    };
    const migRes = migrateSaveData(legacyDay2Save, { storyData: testSealedData, legacyStoryData: testLegacyData });
    assert.equal(migRes.success, true);
    assert.equal(migRes.data.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(migRes.data.sceneId, 'day2_expedition_map');
    assert.notEqual(engine.getScene(migRes.data.sceneId, migRes.data.storyRevision), null);

    engine.start(
      migRes.data.sceneId,
      migRes.data.knowledge,
      migRes.data.history,
      migRes.data.flags,
      migRes.data.inventory,
      migRes.data.hunger,
      migRes.data.thirst,
      migRes.data.health,
      migRes.data.expeditionVisitedLocations,
      migRes.data.storyRevision
    );
    assert.equal(model.currentSceneId, 'day2_expedition_map');
    assert.equal(model.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);

    // 7. fresh New Game still works
    const freshSave = createFreshSave();
    assert.equal(freshSave.version, 4);
    assert.equal(freshSave.storyRevision, STORY_REVISIONS.SEALED72);
    assert.equal(freshSave.sceneId, NEW_GAME_START_SCENE_ID);
    assert.notEqual(engine.getScene(freshSave.sceneId, freshSave.storyRevision), null);

    engine.start(
      freshSave.sceneId,
      freshSave.knowledge,
      [],
      null,
      { food: 0, drink: 0, kit: 0 },
      freshSave.hunger,
      freshSave.thirst,
      freshSave.health,
      [],
      CURRENT_STORY_REVISION
    );
    assert.equal(model.currentSceneId, NEW_GAME_START_SCENE_ID);
    assert.equal(model.storyRevision, STORY_REVISIONS.SEALED72);
  }

  console.log('✓ Strict Revision Isolation & Recovery PASSED');

  console.log('\n========================================');
  console.log('ALL PHASE A VERIFICATION TESTS PASSED!');
  console.log('========================================\n');
} finally {
  await vite.close();
}
