import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

// Exercise actual sealed72 choices from New Game through hour 72.
// Minigame completion is supplied at the controller boundary; puzzle skill is
// outside this ending-balance check.
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { setTimeout: (fn) => fn() };

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { NEW_GAME_START_SCENE_ID, STORY_REVISIONS } = await vite.ssrLoadModule('/src/js/constants.js');
  const { SARAH_ANALYSIS_SECTION_IDS } = await vite.ssrLoadModule('/src/js/sarahAnalysisConfig.js');
  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const scenes = storyData.scenes;
  const noop = () => {};

  const profiles = [
    {
      name: 'first-time: sensible but incomplete preparation',
      expected: 'ending_normal',
      packed: ['food', 'drink', 'radio'],
      location: 'minimarket',
      inspections: ['supply', 'ventilation', 'radio'],
      day1: ['c_day1_air_newseal', 'c_day1_air_safe_inventory', 'c_day1_water_rational',
        'c_day1_sanitation_good', 'c_day1_rest_good', 'c_day1_maya_light'],
      day2: ['c_day2_focus_air', 'c_day2_air_clean_manual', 'c_day2_finalize_day'],
      day3: ['c_day3_water_filter', 'c_day3_power_radio'],
      radio: 'weak',
      useSupplies: true,
    },
    {
      name: 'careful: balanced preparation and supplies',
      expected: 'ending_good',
      packed: ['food', 'drink', 'kit', 'radio', 'battery', 'snack'],
      location: 'minimarket',
      inspections: ['ventilation', 'power', 'radio'],
      day1: ['c_day1_air_newseal', 'c_day1_air_safe_inventory', 'c_day1_water_rational',
        'c_day1_sanitation_good', 'c_day1_rest_good', 'c_day1_maya_light'],
      day2: ['c_day2_focus_air', 'c_day2_air_use_spare_filter', 'c_day2_finalize_day'],
      day3: ['c_day3_water_filter', 'c_day3_power_dual'],
      radio: 'clear',
      useSupplies: true,
    },
    {
      name: 'careful: failed radio remains recoverable',
      expected: 'ending_good',
      packed: ['food', 'drink', 'kit', 'radio', 'battery', 'snack'],
      location: 'minimarket',
      inspections: ['ventilation', 'power', 'radio'],
      day1: ['c_day1_air_newseal', 'c_day1_air_safe_inventory', 'c_day1_water_rational',
        'c_day1_sanitation_good', 'c_day1_rest_good', 'c_day1_maya_light'],
      day2: ['c_day2_focus_air', 'c_day2_air_use_spare_filter', 'c_day2_finalize_day'],
      day3: ['c_day3_water_filter', 'c_day3_power_dual'],
      radio: 'failed',
      useSupplies: true,
    },
    {
      name: 'strong technical work without basic self-care: normal',
      expected: 'ending_normal',
      packed: ['food', 'drink', 'kit', 'radio', 'battery', 'snack'],
      location: 'minimarket',
      inspections: ['ventilation', 'power', 'radio'],
      day1: ['c_day1_air_newseal', 'c_day1_air_safe_inventory', 'c_day1_water_rational',
        'c_day1_sanitation_good', 'c_day1_rest_good', 'c_day1_maya_light'],
      day2: ['c_day2_focus_air', 'c_day2_air_use_spare_filter', 'c_day2_finalize_day'],
      day3: ['c_day3_water_filter', 'c_day3_power_dual'],
      radio: 'clear',
    },
    {
      name: 'compounding neglect: critical rescue',
      expected: 'ending_bad',
      packed: [],
      location: 'medical',
      inspections: ['supply'],
      day1: ['c_day1_air_noinspect', 'c_day1_air_fix', 'c_day1_airfix_inventory',
        'c_day1_water_waste', 'c_day1_waterwaste_sanitation_door', 'c_day1_rest_bad',
        'c_day1_maya_strict'],
      day2: ['c_day2_focus_power', 'c_day2_power_endure', 'c_day2_finalize_day'],
      day3: ['c_day3_water_ration', 'c_day3_power_radio'],
      radio: 'failed',
    },
    {
      name: 'one mistake and low supplies: still normal',
      expected: 'ending_normal',
      packed: [],
      location: 'medical',
      inspections: ['supply'],
      day1: ['c_day1_air_newseal', 'c_day1_air_safe_inventory', 'c_day1_water_waste',
        'c_day1_waterwaste_sanitation_good', 'c_day1_rest_good', 'c_day1_maya_light'],
      day2: ['c_day2_focus_air', 'c_day2_air_clean_manual', 'c_day2_finalize_day'],
      day3: ['c_day3_water_ration', 'c_day3_power_radio'],
      radio: 'weak',
    },
  ];

  function run(profile) {
    const view = new Proxy({
      isTyping: false,
      dom: { choicesPanel: { innerHTML: '', classList: { remove: noop } }, dialogueText: { textContent: '' } },
      typeText(_text, done) { done?.(); },
    }, { get: (target, key) => target[key] ?? noop });
    const model = new GameModel();
    model.init(NEW_GAME_START_SCENE_ID);
    const engine = Object.create(StoryEngine.prototype);
    let ending = null;
    let modularEnding = null;
    Object.assign(engine, {
      model, storyData, view,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      onEnd: (id, _score, _text, _summary, _flags, _history, modular) => {
        ending = id;
        modularEnding = modular;
      },
      bunkerMinigame: { close: noop, openStation: (_station, options) => options.onComplete({ success: true }) },
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      _unlockedMinigameChoiceIds: new Set(),
    });

    function choice(id) {
      const scene = scenes[model.currentSceneId];
      const selected = scene?.choices?.find((entry) => entry.id === id);
      assert(selected, profile.name + ': ' + model.currentSceneId + ' lacks ' + id);
      assert(!selected.requireFlags?.length || selected.requireFlags.every((flag) => model.flags[flag] === true),
        profile.name + ': missing requirement for ' + id);
      assert(!selected.forbiddenFlags?.length || selected.forbiddenFlags.every((flag) => model.flags[flag] !== true),
        profile.name + ': forbidden choice ' + id);
      engine.handleChoiceSelect(selected);
    }
    function advanceUntil(target, max = 15) {
      for (let i = 0; i < max && model.currentSceneId !== target; i++) engine.handleDialogueClick();
      assert.equal(model.currentSceneId, target, profile.name + ': could not reach ' + target);
    }

    engine.renderScene(NEW_GAME_START_SCENE_ID);
    advanceUntil('backstory_sarah_office');
    engine.handleSarahOfficeHotspot('work_notes');
    engine.handleSarahOfficeHotspot('laptop');
    choice('c_sarah_baseline_complete');
    advanceUntil('backstory_sarah_update');
    SARAH_ANALYSIS_SECTION_IDS.forEach((_, index) => engine.handleSarahAnalysisNavigate(index));
    engine.completeSarahAnalysis();
    choice('c_sarah_warning_verify');
    advanceUntil('prolog_home');
    choice('c_prolog_tune_radio');
    choice('c_prolog_listen_careful');
    choice('c_prolog_foreshadow_check');
    advanceUntil('prolog_packing');
    engine.handleScavengerComplete({ collectedItems: profile.packed, reason: 'entered_hatch' });
    choice('c_prolog_accept_supply_run');
    choice(profile.location === 'medical' ? 'c_prolog_choose_medical' : 'c_prolog_choose_minimarket');
    choice(profile.location === 'medical' ? 'c_prolog_medical_take' : 'c_prolog_minimarket_take');
    choice('c_prolog_hendra_help');
    advanceUntil('prolog_route_failure');
    choice('c_prolog_return_home_direct');
    choice('c_prolog_evaluate_bunker');
    choice('c_prolog_confirm_bunker_plan');
    advanceUntil('prolog_threshold');
    engine.handleRequiredInteraction(scenes.prolog_threshold.requiredInteraction);
    advanceUntil('day1_power_boot');
    engine.handleRequiredInteraction(scenes.day1_power_boot.requiredInteraction);
    assert.equal(model.currentSceneId, 'day1_inspection');
    assert(profile.inspections.length >= 1 && profile.inspections.length <= 3);
    profile.inspections.forEach((id) => engine.handleDay1Inspection(id));
    engine.renderScene('day1_lockdoor'); // Same destination as the inspection Continue control.
    profile.day1.forEach(choice);
    assert.equal(model.currentSceneId, 'day2_start');
    choice('c_day2_assess_systems');
    ['ventilation', 'power_panel', 'structure'].forEach((id) => engine.handleDay2Diagnostic(id));
    engine.renderScene('day2_rotor_alignment'); // Continue after the three required diagnostics.
    engine.handleRequiredInteraction(scenes.day2_rotor_alignment.requiredInteraction);
    advanceUntil('day2_service_hatch');
    engine.handleRequiredInteraction(scenes.day2_service_hatch.requiredInteraction);
    assert.equal(model.currentSceneId, 'day2_strategy_choice');
    profile.day2.forEach(choice);
    choice('c_day2_return_day3');
    assert.equal(model.currentSceneId, 'day3_start');
    if (profile.useSupplies) {
      engine.handleInventoryClick('food');
      engine.handleInventoryClick('drink');
    }
    choice('c_day3_check_water');
    profile.day3.forEach(choice);
    engine.handleRequiredInteraction(scenes.day3_wiring.requiredInteraction);
    assert.equal(model.currentSceneId, 'day3_radio_rescue');
    engine.handleFinalRadioResult({ quality: profile.radio, frequency: 98.4, strength: 65 });
    choice('c_day3_radio_' + profile.radio + '_continue');
    choice('c_day3_final_conserve');
    choice('c_day3_final_hours_wait');

    assert.equal(ending, profile.expected, profile.name + ': wrong end callback');
    assert.equal(model.currentSceneId, profile.expected, profile.name + ': wrong final scene');
    assert.equal(modularEnding?.endingId, profile.expected, profile.name + ': wrong ending report');
    if (profile.name === 'strong technical work without basic self-care: normal') {
      assert.match(modularEnding.modules.find((module) => module.id === 'preparedness').body,
        /makan atau minum/, 'Normal report must explain why high technical score did not yield Good');
    }
    const result = model.getEndingResult();
    assert.equal(result.endingId, profile.expected, profile.name + ': wrong evaluator result');
    const save = model.toSaveData();
    const restored = new GameModel();
    restored.init(save.sceneId, save.knowledge, save.history, save.flags, save.inventory,
      save.hunger, save.thirst, save.health, save.expeditionVisitedLocations,
      save.storyRevision, save.houseScavengeResult);
    assert.equal(restored.getEndingResult().endingId, profile.expected,
      profile.name + ': result changed after state reload');
    console.log(profile.name + ': ' + ending + ' | score ' + result.preparedness.score
      + ' | HP ' + model.health.toFixed(1) + ' | hunger ' + model.hunger.toFixed(1)
      + ' | thirst ' + model.thirst.toFixed(1));
  }

  profiles.forEach(run);
  const zeroHealth = new GameModel();
  zeroHealth.health = 0;
  assert.equal(zeroHealth.getEndingResult().endingId, 'ending_bad');
  const legacyFlags = { air_remedied: true, water_filtered: true, power_saved: true,
    radio_quality: 'failed', inspected_radio: true, food_packed: true, drink_packed: true };
  const legacy = new GameModel();
  legacy.init('day3_final_hours', 8, [], legacyFlags, { food: 1, drink: 1, kit: 0 },
    20, 20, 80, [], STORY_REVISIONS.LEGACY_PHASE7);
  const sealed = new GameModel();
  sealed.init('day3_final_hours', 8, [], legacyFlags, { food: 1, drink: 1, kit: 0 },
    20, 20, 80, [], STORY_REVISIONS.SEALED72);
  assert.equal(legacy.getEndingResult().endingId, 'ending_good', 'Legacy threshold must remain unchanged');
  assert.equal(sealed.getEndingResult().endingId, 'ending_normal', 'Active balance must apply to sealed72');
  console.log('PASS: three ending outcomes, first-time Normal, single-error forgiveness, failed-radio Good, and reload stability.');
} finally {
  await vite.close();
}
