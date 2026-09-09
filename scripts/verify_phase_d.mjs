import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

console.log('--- RUNNING PHASE D VERIFICATION SUITE ---');

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};
globalThis.window = {
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
};

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const {
    ENDING_IDS,
    STORY_REVISIONS,
    SAVE_SCHEMA_VERSION,
    parseHour,
  } = await vite.ssrLoadModule('/src/js/constants.js');

  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
  const scenes = storyData.scenes;

  const noop = () => {};
  const mockView = new Proxy({
    isTyping: false,
    dom: {
      choicesPanel: { innerHTML: '', classList: { remove: noop } },
      dialogueText: { textContent: '' },
      storyBox: { classList: { remove: noop } },
    },
    typeText(text, done, payload) { done?.(); },
  }, {
    get: (target, key) => target[key] ?? noop,
  });

  // =========================================================================
  // 1. SAVE SCHEMA AND STORY REVISION BASELINE
  // =========================================================================
  console.log('[1/12] Checking save schema version and story revision baseline...');
  assert.equal(SAVE_SCHEMA_VERSION, 4, 'SAVE_SCHEMA_VERSION must remain 4');
  assert.equal(STORY_REVISIONS.SEALED72, 'sealed72');
  assert.equal(STORY_REVISIONS.LEGACY_PHASE7, 'legacy_phase7');

  // =========================================================================
  // 2. DAY 2 SCENES IN SEALED72 AND TIMELINE MONOTONICITY
  // =========================================================================
  console.log('[2/12] Checking Day 2 scenes in sealed72 story.json and timeline hours...');
  const day2Scenes = [
    'day2_start',
    'day2_systems_check',
    'day2_air_response',
    'day2_power_response',
    'day2_family_check',
    'day2_stabilized',
  ];
  for (const id of day2Scenes) {
    assert(scenes[id], `Scene "${id}" must exist in sealed72 story.json`);
  }

  assert.equal(parseHour(scenes.day2_start.hour), 30);
  assert.equal(parseHour(scenes.day2_systems_check.hour), 36);
  assert.equal(parseHour(scenes.day2_air_response.hour), 42);
  assert.equal(parseHour(scenes.day2_power_response.hour), 42);
  assert.equal(parseHour(scenes.day2_family_check.hour), 48);
  assert.equal(parseHour(scenes.day2_stabilized.hour), 54);
  assert.equal(parseHour(scenes.day3_start.hour), 54);

  // Verify non-decreasing monotonic timeline across Day 2
  assert(parseHour(scenes.day2_start.hour) <= parseHour(scenes.day2_systems_check.hour));
  assert(parseHour(scenes.day2_systems_check.hour) <= parseHour(scenes.day2_air_response.hour));
  assert(parseHour(scenes.day2_air_response.hour) <= parseHour(scenes.day2_family_check.hour));
  assert(parseHour(scenes.day2_family_check.hour) <= parseHour(scenes.day2_stabilized.hour));
  assert(parseHour(scenes.day2_stabilized.hour) <= parseHour(scenes.day3_start.hour));

  // Verify Day 2 outside expedition is NOT in sealed72
  assert(!scenes.day2_expedition_map, 'day2_expedition_map must NOT exist in sealed72 story.json');
  assert(!scenes.day2_hendra_encounter, 'day2_hendra_encounter must NOT exist in sealed72 story.json');

  // =========================================================================
  // 3. FILTER SINGLE-USE DEFINITIONS AND FORBIDDEN FLAGS
  // =========================================================================
  console.log('[3/12] Checking filter single-use definitions in story choices and conditional text...');
  const day1FilterChoice = scenes.day1_lockdoor.choices.find(c => c.id === 'c_day1_air_spare_filter');
  assert(day1FilterChoice, 'c_day1_air_spare_filter must exist in day1_lockdoor');
  assert(day1FilterChoice.requireFlags?.includes('found_spare_filter'));
  assert(day1FilterChoice.forbiddenFlags?.includes('spare_filter_used'));
  assert(day1FilterChoice.setFlags?.includes('spare_filter_used'));

  const day2FilterChoice = scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_use_spare_filter');
  assert(day2FilterChoice, 'c_day2_air_use_spare_filter must exist in day2_air_response');
  assert(day2FilterChoice.requireFlags?.includes('found_spare_filter'));
  assert(day2FilterChoice.forbiddenFlags?.includes('spare_filter_used'));
  assert(day2FilterChoice.setFlags?.includes('spare_filter_used'));

  const day3FilterChoice = scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_keep_air');
  assert(day3FilterChoice, 'c_day3_final_keep_air must exist in day3_final_dilemma');
  assert(day3FilterChoice.requireFlags?.includes('found_spare_filter'));
  assert(day3FilterChoice.forbiddenFlags?.includes('spare_filter_used'));
  assert(day3FilterChoice.setFlags?.includes('spare_filter_used'));

  const day3PowerCond = scenes.day3_power_pressure.conditionalText.find(c => c.requiredFlag === 'found_spare_filter');
  assert(day3PowerCond, 'Conditional text for spare filter must exist in day3_power_pressure');
  assert.equal(day3PowerCond.forbiddenFlag, 'spare_filter_used');

  // =========================================================================
  // 4. QA ROUTE A: Help Hendra + Minimarket -> Focus Air (Manual Clean) -> Keep Air on Day 3 -> Good Ending
  // =========================================================================
  console.log('[4/12] Testing Route A: Minimarket -> Help Hendra -> Day 2 Manual Clean -> Day 3 Keep Air -> Good Ending...');
  {
    const model = new GameModel();
    model.init('day1_lockdoor', 6, [], {
      found_spare_filter: true,
      inspected_ventilation: true,
      inspected_power: true,
      inspected_radio: true,
      helped_stranger: true,
      hendra_encountered: true,
      prolog_minimarket_visited: true,
      prolog_minimarket_claimed: true,
      extra_battery: true,
      battery_packed: true,
      food_packed: true,
      drink_packed: true,
      day1_water_rational: true,
    }, { food: 2, drink: 1, kit: 0 }, 75, 75, 85);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    // Day 1: Do NOT use spare filter; use carbon seal
    engine.handleChoiceSelect(scenes.day1_lockdoor.choices.find(c => c.id === 'c_day1_air_newseal'));
    assert.equal(model.flags.air_seal_good, true);
    assert.equal(model.flags.spare_filter_used, false);

    // Advance to Day 2
    engine.renderScene('day2_start');
    assert.equal(model.currentSceneId, 'day2_start');
    engine.handleChoiceSelect(scenes.day2_start.choices.find(c => c.id === 'c_day2_assess_systems'));
    assert.equal(model.currentSceneId, 'day2_systems_check');

    // Focus Air
    engine.handleChoiceSelect(scenes.day2_systems_check.choices.find(c => c.id === 'c_day2_focus_air'));
    assert.equal(model.currentSceneId, 'day2_air_response');

    // Clean manually to save filter for Day 3
    engine.handleChoiceSelect(scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_clean_manual'));
    assert.equal(model.flags.day2_air_cleared, true);
    assert.equal(model.flags.day2_power_draw_heavy, true);
    assert.equal(model.flags.spare_filter_used, false);
    assert.equal(model.currentSceneId, 'day2_family_check');

    // Family check -> Day 2 stabilized
    engine.handleChoiceSelect(scenes.day2_family_check.choices.find(c => c.id === 'c_day2_finalize_day'));
    assert.equal(model.currentSceneId, 'day2_stabilized');

    // Advance to Day 3
    engine.handleChoiceSelect(scenes.day2_stabilized.choices.find(c => c.id === 'c_day2_return_day3'));
    assert.equal(model.currentSceneId, 'day3_start');

    // Water filter on Day 3
    engine.handleChoiceSelect(scenes.day3_start.choices[0]);
    engine.handleChoiceSelect(scenes.day3_water_pressure.choices.find(c => c.id === 'c_day3_water_filter'));
    assert.equal(model.flags.water_filtered, true);

    // Power dual using extra battery
    engine.handleChoiceSelect(scenes.day3_power_pressure.choices.find(c => c.id === 'c_day3_power_dual'));
    assert.equal(model.flags.battery_committed, true);
    assert.equal(model.flags.radio_power_stable, true);

    // Radio attempt -> clear
    engine.handleFinalRadioResult({ quality: 'clear', frequency: 98.4, strength: 90 });
    assert.equal(model.currentSceneId, 'day3_radio_clear');
    engine.handleChoiceSelect(scenes.day3_radio_clear.choices[0]);
    assert.equal(model.currentSceneId, 'day3_final_dilemma');

    // Spare filter is still UNUSED -> install on Day 3
    const keepAir = scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_keep_air');
    assert(keepAir, 'c_day3_final_keep_air must be present');
    engine.handleChoiceSelect(keepAir);
    assert.equal(model.flags.final_air_protected, true);
    assert.equal(model.flags.spare_filter_used, true);

    // Evaluate Ending
    const endRes = model.getEndingResult();
    assert.equal(endRes.endingId, 'ending_good', 'Route A must reach Good Ending');
    assert(endRes.preparedness.score >= 60, 'Preparedness score must be >= 60');
    assert(model.health >= 55, 'Health must be >= 55');
  }

  // =========================================================================
  // 5. QA ROUTE B: Medical Post + Family First -> Focus Air (Spare Filter on Day 2) -> Good Ending
  // =========================================================================
  console.log('[5/12] Testing Route B: Medical Post -> Family First -> Day 2 Spare Filter -> Day 3 Conserve -> Good Ending...');
  {
    const model = new GameModel();
    model.init('day1_lockdoor', 6, [], {
      found_spare_filter: true,
      inspected_ventilation: true,
      inspected_power: true,
      inspected_radio: true,
      stranger_family_first: true,
      hendra_encountered: true,
      prolog_medical_visited: true,
      prolog_medical_claimed: true,
      kit_packed: true,
      medical_mask_ready: true,
      day1_water_rational: true,
    }, { food: 2, drink: 2, kit: 1 }, 75, 75, 90);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    // Day 1: carbon seal
    engine.handleChoiceSelect(scenes.day1_lockdoor.choices.find(c => c.id === 'c_day1_air_newseal'));
    assert.equal(model.flags.spare_filter_used, false);

    // Day 2: Focus Air -> Use Spare Filter
    engine.renderScene('day2_start');
    engine.handleChoiceSelect(scenes.day2_start.choices.find(c => c.id === 'c_day2_assess_systems'));
    engine.handleChoiceSelect(scenes.day2_systems_check.choices.find(c => c.id === 'c_day2_focus_air'));
    engine.handleChoiceSelect(scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_use_spare_filter'));
    assert.equal(model.flags.day2_air_cleared, true);
    assert.equal(model.flags.spare_filter_used, true);

    // Family check -> Day 2 stabilized -> Day 3
    engine.handleChoiceSelect(scenes.day2_family_check.choices.find(c => c.id === 'c_day2_finalize_day'));
    engine.handleChoiceSelect(scenes.day2_stabilized.choices.find(c => c.id === 'c_day2_return_day3'));
    assert.equal(model.currentSceneId, 'day3_start');

    // Day 3 water & power
    engine.handleChoiceSelect(scenes.day3_start.choices[0]);
    engine.handleChoiceSelect(scenes.day3_water_pressure.choices.find(c => c.id === 'c_day3_water_filter'));
    engine.handleChoiceSelect(scenes.day3_power_pressure.choices.find(c => c.id === 'c_day3_power_route'));
    assert.equal(model.flags.power_routed, true);

    engine.handleFinalRadioResult({ quality: 'clear', frequency: 98.4, strength: 90 });
    engine.handleChoiceSelect(scenes.day3_radio_clear.choices[0]);
    assert.equal(model.currentSceneId, 'day3_final_dilemma');

    // Spare filter is already used -> cannot use keep_air
    const keepAir = scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_keep_air');
    assert(keepAir.forbiddenFlags.includes('spare_filter_used'));

    // Choose final conserve
    engine.handleChoiceSelect(scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_conserve'));
    assert.equal(model.flags.final_power_conserved, true);

    // Good Ending result
    const endRes = model.getEndingResult();
    assert.equal(endRes.endingId, 'ending_good', 'Route B must reach Good Ending');
  }

  // =========================================================================
  // 6. QA ROUTE C: Focus Power -> Use Mask on Day 2
  // =========================================================================
  console.log('[6/12] Testing Route C: Medical Post -> Focus Power (Use Mask on Day 2) -> Good Ending...');
  {
    const model = new GameModel();
    model.init('day2_start', 6, [], {
      found_spare_filter: true,
      inspected_ventilation: true,
      inspected_power: true,
      inspected_radio: true,
      medical_mask_ready: true,
      day1_water_rational: true,
    }, { food: 2, drink: 2, kit: 1 }, 75, 75, 85);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    engine.renderScene('day2_start');
    engine.handleChoiceSelect(scenes.day2_start.choices.find(c => c.id === 'c_day2_assess_systems'));
    engine.handleChoiceSelect(scenes.day2_systems_check.choices.find(c => c.id === 'c_day2_focus_power'));
    assert.equal(model.currentSceneId, 'day2_power_response');

    // Use Mask
    engine.handleChoiceSelect(scenes.day2_power_response.choices.find(c => c.id === 'c_day2_power_use_mask'));
    assert.equal(model.flags.day2_power_conserved, true);
    assert.equal(model.flags.medical_mask_used, true);
    assert.equal(model.currentSceneId, 'day2_family_check');
  }

  // =========================================================================
  // 7. QA ROUTE D: Focus Power -> Endure (-5 hp fatigue)
  // =========================================================================
  console.log('[7/12] Testing Route D: Focus Power (Endure, -5 health fatigue penalty)...');
  {
    const model = new GameModel();
    model.init('day2_power_response', 6, [], {}, { food: 2, drink: 2, kit: 0 }, 75, 75, 80);
    const initialHealth = model.health;

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    engine.handleChoiceSelect(scenes.day2_power_response.choices.find(c => c.id === 'c_day2_power_endure'));
    assert.equal(model.flags.day2_power_conserved, true);
    assert.equal(model.flags.day2_fatigue_applied, true);
    assert.equal(model.health, initialHealth - 5, 'Endure choice must apply -5 health penalty');

    // Re-invoking choice (idempotency check) must NOT re-apply -5 health
    engine.handleChoiceSelect(scenes.day2_power_response.choices.find(c => c.id === 'c_day2_power_endure'));
    assert.equal(model.health, initialHealth - 5, 'Penalty must be idempotent');
  }

  // =========================================================================
  // 8. QA ROUTE E: Uninspected Air from Day 1 is Cured by Day 2 Air Response
  // =========================================================================
  console.log('[8/12] Testing Route E: Uninspected Air from Day 1 is cured by Day 2 Focus Air...');
  {
    const model = new GameModel();
    model.init('day2_start', 4, [], {
      air_uninspected: true,
      found_spare_filter: true,
    });
    assert.equal(model.flags.air_uninspected, true);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    engine.renderScene('day2_start');
    engine.handleChoiceSelect(scenes.day2_start.choices.find(c => c.id === 'c_day2_assess_systems'));
    engine.handleChoiceSelect(scenes.day2_systems_check.choices.find(c => c.id === 'c_day2_focus_air'));
    engine.handleChoiceSelect(scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_clean_manual'));

    assert.equal(model.flags.day2_air_cleared, true);
    assert.equal(model.flags.air_uninspected, undefined, 'air_uninspected must be removed when Day 2 air is cleared');
  }

  // =========================================================================
  // 9. QA ROUTE F & G: Double-Spend Prevention Across Days 1, 2, and 3
  // =========================================================================
  console.log('[9/12] Testing Route F & G: Filter double-spend prevention across Days 1, 2, and 3...');
  {
    // If used on Day 1
    const model1 = new GameModel();
    model1.init('day1_lockdoor', 6, [], { found_spare_filter: true });
    const engine1 = Object.create(StoryEngine.prototype);
    Object.assign(engine1, {
      model: model1, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    engine1.handleChoiceSelect(scenes.day1_lockdoor.choices.find(c => c.id === 'c_day1_air_spare_filter'));
    assert.equal(model1.flags.spare_filter_used, true);

    // Verify Day 2 spare filter choice is blocked
    const day2Filter = scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_use_spare_filter');
    assert(day2Filter.forbiddenFlags.includes('spare_filter_used'));
    assert(day2Filter.forbiddenFlags.some(f => model1.flags[f] === true), 'Choice must be forbidden on Day 2');

    // Verify Day 3 spare filter choice is blocked
    const day3Filter = scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_keep_air');
    assert(day3Filter.forbiddenFlags.includes('spare_filter_used'));
    assert(day3Filter.forbiddenFlags.some(f => model1.flags[f] === true), 'Choice must be forbidden on Day 3');

    // If used on Day 2
    const model2 = new GameModel();
    model2.init('day2_air_response', 6, [], { found_spare_filter: true, spare_filter_used: false });
    const engine2 = Object.create(StoryEngine.prototype);
    Object.assign(engine2, {
      model: model2, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    engine2.handleChoiceSelect(scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_use_spare_filter'));
    assert.equal(model2.flags.spare_filter_used, true);
    assert(day3Filter.forbiddenFlags.some(f => model2.flags[f] === true), 'Choice must be forbidden on Day 3 after Day 2 use');
  }

  // =========================================================================
  // 10. QA ROUTE H & I: Conditional Text and Save/Load Round-Trip
  // =========================================================================
  console.log('[10/12] Testing Route H & I: Conditional text filtering and Save/Load round-trip...');
  {
    const model = new GameModel();
    model.init('day2_family_check', 6, [], {
      day1_water_rational: true,
      toy_packed: true,
      sarah_warning_response: 'escalate',
      extra_battery: true,
      helped_stranger: true,
    });

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model, storyData, legacyStoryData, view: mockView,
      audio: new Proxy({}, { get: () => noop }), onSave: noop, bunkerMinigame: { close: noop },
    });

    // Check conditional text evaluation with forbiddenFlag
    const powerText = engine.processNarrativeText('day3_power_pressure', scenes.day3_power_pressure.text, 'Aris');
    assert(!powerText.includes('Filter cadangan membuat ventilasi'), 'Text should not mention spare filter when not found');

    model.flags.found_spare_filter = true;
    model.flags.spare_filter_used = false;
    const powerTextWithFilter = engine.processNarrativeText('day3_power_pressure', scenes.day3_power_pressure.text, 'Aris');
    assert(powerTextWithFilter.includes('Filter cadangan membuat ventilasi'), 'Text should mention spare filter when found and unused');

    model.flags.spare_filter_used = true;
    const powerTextUsed = engine.processNarrativeText('day3_power_pressure', scenes.day3_power_pressure.text, 'Aris');
    assert(!powerTextUsed.includes('Filter cadangan membuat ventilasi'), 'Text must NOT mention spare filter when forbiddenFlag spare_filter_used is true');

    // Save/Load serialization round-trip
    const saveData = model.toSaveData();
    const loadedModel = new GameModel();
    loadedModel.init(
      saveData.sceneId, saveData.knowledge, saveData.history, saveData.flags,
      saveData.inventory, saveData.hunger, saveData.thirst, saveData.health,
      saveData.expeditionVisitedLocations, saveData.storyRevision, saveData.houseScavengeResult
    );
    assert.deepEqual(loadedModel.flags, model.flags, 'Loaded flags must exactly match saved flags');
    assert.equal(loadedModel.flags.spare_filter_used, true);
  }

  // =========================================================================
  // 11. QA ROUTE J & K: History Reconstruction and Bad Ending Thresholds
  // =========================================================================
  console.log('[11/12] Testing Route J & K: History flag reconstruction and Bad Ending triggers...');
  {
    const history = [
      { choiceId: 'c_day1_air_spare_filter' },
      { choiceId: 'c_day2_power_endure' },
      { choiceId: 'c_day2_power_use_mask' },
    ];
    const model = new GameModel();
    model.init('day3_start', 6, history, null);
    assert.equal(model.flags.spare_filter_used, true, 'spare_filter_used must be reconstructed from history');
    assert.equal(model.flags.day2_fatigue_applied, true, 'day2_fatigue_applied must be reconstructed from history');
    assert.equal(model.flags.medical_mask_used, true, 'medical_mask_used must be reconstructed from history');

    // Critical rescue trigger when health reaches 0
    model.health = 0;
    assert.equal(model.evaluateEnding(), 'ending_bad', 'Zero health must trigger Bad Ending');
  }

  // =========================================================================
  // 12. QA ROUTE L: Legacy Revision Isolation
  // =========================================================================
  console.log('[12/12] Testing Route L: Legacy revision preservation and strict isolation...');
  {
    assert(legacyStoryData.scenes.day2_expedition_map, 'day2_expedition_map must exist in legacy');
    assert(legacyStoryData.scenes.day2_hendra_encounter, 'day2_hendra_encounter must exist in legacy');
    assert(legacyStoryData.scenes.day2_expedition_return, 'day2_expedition_return must exist in legacy');

    const legacyModel = new GameModel();
    legacyModel.init('day2_start', 5, [], null, null, 70, 70, 70, [], STORY_REVISIONS.LEGACY_PHASE7);
    assert.equal(legacyModel.storyRevision, STORY_REVISIONS.LEGACY_PHASE7);
  }

} finally {
  await vite.close();
}

console.log('\n========================================');
console.log('ALL PHASE D VERIFICATION TESTS PASSED!');
console.log('========================================\n');
