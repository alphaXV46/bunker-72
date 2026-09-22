import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

console.log('--- RUNNING DAY 2 DIAGNOSE & REPAIR VERIFICATION ---');

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

globalThis.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};
globalThis.window = {
  setTimeout: (callback) => callback(),
  clearTimeout() {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame() {},
  performance: { now: () => 0 },
};

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine, DAY2_DIAGNOSTIC_HOTSPOTS } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { BunkerMinigame } = await vite.ssrLoadModule('/src/js/bunkerMinigame.js');
  const { STATIONS } = await vite.ssrLoadModule('/src/js/bunkerStations/stationsConfig.js');
  const {
    SERVICE_HATCH_CONFIG,
    resolveServiceHatchSweetSpot,
  } = await vite.ssrLoadModule('/src/js/bunkerStations/serviceHatchStation.js');

  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
  const scenes = storyData.scenes;
  const noop = () => {};
  const mockView = new Proxy({
    isTyping: false,
    dom: {
      gameView: null,
      choicesPanel: { innerHTML: '' },
      dialogueText: { textContent: '' },
      storyBox: { classList: { add: noop, remove: noop } },
    },
    typeText(text, done) { done?.(); },
  }, { get: (target, key) => target[key] ?? noop });

  const requiredSceneIds = [
    'day2_start',
    'day2_diagnostic_sweep',
    'day2_rotor_alignment',
    'day2_systems_check',
    'day2_service_hatch',
    'day2_strategy_choice',
    'day2_air_response',
    'day2_power_response',
    'day2_family_check',
    'day2_stabilized',
    'day3_start',
  ];
  requiredSceneIds.forEach((id) => assert(scenes[id], `Missing Day 2 scene: ${id}`));

  const hour = (id) => Number.parseInt(String(scenes[id].hour), 10);
  assert.deepEqual(
    requiredSceneIds.slice(0, 6).map(hour),
    [30, 31, 34, 36, 38, 42],
    'Day 2 diagnosis/repair checkpoints must remain ordered',
  );
  assert.equal(hour('day2_air_response'), 42);
  assert.equal(hour('day2_power_response'), 42);
  assert.equal(hour('day2_family_check'), 48);
  assert.equal(hour('day2_stabilized'), 54);
  assert.equal(hour('day3_start'), 54);
  assert.equal(scenes.day2_start.choices[0].nextSceneId, 'day2_diagnostic_sweep');

  const primary = DAY2_DIAGNOSTIC_HOTSPOTS.filter((spot) => spot.primary);
  const optional = DAY2_DIAGNOSTIC_HOTSPOTS.filter((spot) => !spot.primary);
  assert.equal(primary.length, 4, 'Day 2 must expose exactly four primary diagnostic hotspots');
  assert.equal(optional.length, 2, 'Day 2 optional diagnosis must stay flavor-only');
  assert(new Set(DAY2_DIAGNOSTIC_HOTSPOTS.map((spot) => spot.id)).size === 6, 'Hotspot IDs must be unique');
  DAY2_DIAGNOSTIC_HOTSPOTS.forEach((spot) => {
    ['x', 'y', 'w', 'h'].forEach((key) => assert(Number.isFinite(spot[key]), `${spot.id}.${key} must be numeric`));
    assert(spot.x >= 0 && spot.y >= 0 && spot.w > 0 && spot.h > 0);
    assert(spot.x + spot.w <= 100 && spot.y + spot.h <= 100, `${spot.id} must fit the source image`);
    assert.match(spot.text, /ventil|blower|udara|daya|inverter|segel|bingkai|rak|inventaris|radio|medis|masker/i);
  });
  assert.match(scenes.day2_diagnostic_sweep.text, /tidak ada satu indikator|satu per satu/i);
  assert.match(primary.find((spot) => spot.id === 'structure').text, /segel tetap utuh|tidak ada tanda bunker akan runtuh/i);
  assert.match(primary.find((spot) => spot.id === 'supply_rack').text, /inventaris|barang baru/i);
  assert(!scenes.day2_diagnostic_sweep.choices.length, 'Diagnosis must use hotspots, not fake narrative choices');

  const rotorInteraction = scenes.day2_rotor_alignment.requiredInteraction;
  const hatchInteraction = scenes.day2_service_hatch.requiredInteraction;
  for (const [label, interaction, flag, next] of [
    ['rotor', rotorInteraction, 'day2_rotor_aligned', 'day2_systems_check'],
    ['service hatch', hatchInteraction, 'day2_service_hatch_open', 'day2_strategy_choice'],
  ]) {
    assert.equal(interaction.type, 'bunkerStation', `${label} must use generic required station contract`);
    assert.equal(interaction.completionFlag, flag);
    assert.equal(interaction.nextSceneId, next);
    assert(interaction.actionText.length > 5);
  }
  assert.equal(scenes.day2_systems_check.autoNextSceneId, 'day2_service_hatch');
  assert.equal(scenes.day2_systems_check.advanceMode, 'click');
  assert.deepEqual(
    scenes.day2_strategy_choice.choices.map((choice) => choice.id),
    ['c_day2_focus_air', 'c_day2_focus_power'],
    'Existing Air/Power strategic choice IDs must remain intact after Service Hatch',
  );

  assert(STATIONS.service_hatch, 'Service Hatch must be registered in BunkerMinigame');
  const minigame = new BunkerMinigame({ root: null, onComplete: noop });
  assert(minigame.stations.service_hatch, 'Service Hatch station instance must be mounted by the orchestrator');
  assert(SERVICE_HATCH_CONFIG.sweetSpotWidth >= 0.24, 'Service Hatch sweet spot must be broad enough for first-time play');
  assert.equal(resolveServiceHatchSweetSpot(() => 0), SERVICE_HATCH_CONFIG.sweetSpotMin);
  assert.equal(resolveServiceHatchSweetSpot(() => 1), SERVICE_HATCH_CONFIG.sweetSpotMax);

  const makeEngine = (flags = {}, inventory = { food: 2, drink: 2, kit: 1 }) => {
    const model = new GameModel();
    model.init('day2_start', 6, [], flags, inventory, 80, 80, 90);
    const saves = [];
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: (save) => saves.push(structuredClone(save)),
      onEnd: noop,
      bunkerMinigame: {
        close: noop,
        openStation: (_, options) => options.onComplete({ success: true }),
      },
    });
    return { engine, model, saves };
  };

  const { engine, model, saves } = makeEngine({ found_spare_filter: true });
  engine.handleChoiceSelect(scenes.day2_start.choices[0]);
  assert.equal(model.currentSceneId, 'day2_diagnostic_sweep');
  const initialInventory = { ...model.inventory };
  const initialKnowledge = model.knowledge;
  const initialHistoryLength = model.history.length;

  engine.handleDay2Diagnostic('ventilation');
  const afterFirstDiagnostic = model.history.length;
  engine.handleDay2Diagnostic('ventilation');
  assert.equal(model.history.length, afterFirstDiagnostic, 'Repeated hotspot click must not count twice');
  engine.handleDay2Diagnostic('radio');
  assert.equal(model.flags.day2_diagnostics_complete, false, 'Optional hotspot must not satisfy the threshold');
  engine.handleDay2Diagnostic('structure');
  assert.equal(model.flags.day2_diagnostics_complete, false, 'Two primary hotspots must not satisfy the threshold');
  engine.handleDay2Diagnostic('supply_rack');
  assert.equal(model.flags.day2_diagnostics_complete, true, 'Three unique primary hotspots must unlock progression');
  assert.equal(model.history.length, initialHistoryLength + 4, 'Only unique observations should enter history');
  assert.deepEqual(model.inventory, initialInventory, 'Diagnosis must not invent or consume resources');
  assert.equal(model.knowledge, initialKnowledge, 'Diagnosis must not silently award score/knowledge');
  assert(saves.length >= 4, 'Each diagnostic checkpoint should be saveable');

  engine.renderScene('day2_rotor_alignment');
  const beforeRotorHistory = model.history.length;
  engine.handleRequiredInteraction(rotorInteraction);
  assert.equal(model.flags.day2_rotor_aligned, true);
  assert.equal(model.currentSceneId, 'day2_systems_check');
  engine.handleDialogueClick();
  assert.equal(model.currentSceneId, 'day2_service_hatch');
  const beforeHatchInventory = { ...model.inventory };
  engine.handleRequiredInteraction(hatchInteraction);
  assert.equal(model.flags.day2_service_hatch_open, true);
  assert.equal(model.currentSceneId, 'day2_strategy_choice');
  assert.deepEqual(model.inventory, beforeHatchInventory, 'Service Hatch must not grant or consume resources');
  const afterHatchHistory = model.history.length;
  assert(afterHatchHistory >= beforeRotorHistory + 2, 'Rotor and Hatch completions must be logged');
  assert.equal(engine.completeRequiredInteraction(hatchInteraction), false, 'Duplicate Hatch callback must be idempotent');
  assert.equal(model.history.length, afterHatchHistory, 'Duplicate Hatch callback must not duplicate history');

  const rotorReload = new GameModel();
  rotorReload.init('day2_rotor_alignment', model.knowledge, model.history, {
    ...model.flags,
    day2_rotor_aligned: false,
    day2_service_hatch_open: false,
  }, model.inventory, model.hunger, model.thirst, model.health);
  assert.equal(rotorReload.flags.day2_rotor_aligned, false, 'Save before Rotor must remain actionable');
  const rotorReloadEngine = makeEngine(rotorReload.flags, rotorReload.inventory).engine;
  rotorReloadEngine.model = rotorReload;
  rotorReloadEngine.renderScene('day2_rotor_alignment');
  rotorReloadEngine.handleRequiredInteraction(rotorInteraction);
  assert.equal(rotorReload.currentSceneId, 'day2_systems_check', 'Rotor reload must resume at the same required checkpoint');

  const serviceReload = new GameModel();
  serviceReload.init('day2_service_hatch', model.knowledge, model.history, {
    ...model.flags,
    day2_service_hatch_open: false,
  }, model.inventory, model.hunger, model.thirst, model.health);
  const serviceReloadEngine = makeEngine(serviceReload.flags, serviceReload.inventory).engine;
  serviceReloadEngine.model = serviceReload;
  serviceReloadEngine.renderScene('day2_service_hatch');
  serviceReloadEngine.handleRequiredInteraction(hatchInteraction);
  assert.equal(serviceReload.currentSceneId, 'day2_strategy_choice', 'Service Hatch reload must resume at its checkpoint');

  engine.handleChoiceSelect(scenes.day2_strategy_choice.choices.find((choice) => choice.id === 'c_day2_focus_air'));
  assert.equal(model.currentSceneId, 'day2_air_response');
  engine.handleChoiceSelect(scenes.day2_air_response.choices.find((choice) => choice.id === 'c_day2_air_clean_manual'));
  engine.handleChoiceSelect(scenes.day2_family_check.choices[0]);
  assert.equal(model.currentSceneId, 'day2_stabilized');
  engine.handleChoiceSelect(scenes.day2_stabilized.choices[0]);
  assert.equal(model.currentSceneId, 'day3_start');

  const powerRoute = makeEngine({});
  powerRoute.engine.model.currentSceneId = 'day2_strategy_choice';
  powerRoute.engine.handleChoiceSelect(scenes.day2_strategy_choice.choices.find((choice) => choice.id === 'c_day2_focus_power'));
  assert.equal(powerRoute.model.currentSceneId, 'day2_power_response', 'Power route must remain reachable without missed Day 1 inspections');

  const reportFlags = {
    radio_quality: 'clear',
    air_remedied: true,
    water_filtered: true,
    power_saved: true,
    inspected_radio: true,
    inspected_power: true,
    inspected_ventilation: true,
    extra_battery: true,
  };
  const baseline = new GameModel();
  baseline.init('day3_final_hours', 8, [], reportFlags, { food: 2, drink: 2, kit: 1 }, 80, 80, 90);
  const expanded = new GameModel();
  expanded.init('day3_final_hours', 8, [], {
    ...reportFlags,
    day2_diagnostic_air: true,
    day2_diagnostic_power: true,
    day2_diagnostic_structure: true,
    day2_diagnostic_supplies: true,
    day2_diagnostics_complete: true,
    day2_rotor_aligned: true,
    day2_service_hatch_open: true,
  }, { food: 2, drink: 2, kit: 1 }, 80, 80, 90);
  assert.deepEqual(expanded.calculatePreparednessReport(), baseline.calculatePreparednessReport(), 'New Day 2 repair flags must not alter ending score/evaluator thresholds');

  assert.equal(execFileSync('git', ['diff', '--exit-code', '--', 'src/data/storyLegacyPhase7.json'], { encoding: 'utf8' }), '', 'Legacy story must remain unchanged');
  assert.equal(JSON.parse(fs.readFileSync('src/data/story.json', 'utf8')).scenes.day3_start.choices[0].nextSceneId, 'day3_water_pressure', 'Day 3 resource-pressure entry must remain unchanged');

  console.log('PASS: Day 2 hotspot threshold, optional-count invariant, Rotor/Service Hatch contracts, save/reload idempotence, Air/Power reachability, family/stabilized flow, evaluator invariance, and legacy isolation.');
} finally {
  await vite.close();
}
