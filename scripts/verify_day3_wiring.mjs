import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

console.log('--- RUNNING DAY 3 WIRING VERIFICATION ---');

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
};

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { BunkerMinigame } = await vite.ssrLoadModule('/src/js/bunkerMinigame.js');
  const { STATIONS } = await vite.ssrLoadModule('/src/js/bunkerStations/stationsConfig.js');

  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
  const scenes = storyData.scenes;
  const wireSource = fs.readFileSync('src/js/bunkerStations/wireStation.js', 'utf8');
  const noop = () => {};
  const mockView = new Proxy({
    isTyping: false,
    dom: {
      gameView: null,
      choicesPanel: { innerHTML: '', classList: { add: noop, remove: noop } },
      dialogueText: { textContent: '' },
      storyBox: { classList: { add: noop, remove: noop } },
    },
    typeText(text, done) { done?.(); },
  }, { get: (target, key) => target[key] ?? noop });

  const wiringScene = scenes.day3_wiring;
  const wiringInteraction = wiringScene?.requiredInteraction;
  assert(wiringScene, 'day3_wiring scene must exist');
  assert.equal(wiringScene.hour, '64 Jam');
  assert.equal(wiringScene.choices.length, 0, 'Wiring must be a required action, not a fake choice');
  assert.equal(wiringInteraction?.type, 'bunkerStation');
  assert.equal(wiringInteraction?.station, 'wires');
  assert.equal(wiringInteraction?.completionFlag, 'day3_wiring_complete');
  assert.equal(wiringInteraction?.nextSceneId, 'day3_radio_rescue');
  assert.match(wiringInteraction.actionText, /distribusi daya/i);

  const strategies = scenes.day3_power_pressure.choices;
  assert.equal(strategies.length, 4, 'All four existing Day 3 strategy choices must remain');
  strategies.forEach((choice) => {
    assert.equal(choice.nextSceneId, 'day3_wiring', `${choice.id} must require Wiring before Radio`);
  });
  assert.equal(scenes.day3_start.choices[0].nextSceneId, 'day3_water_pressure');
  assert.equal(scenes.day3_radio_rescue.hour, '68 Jam');

  assert(STATIONS.wires, 'Wire Station must remain registered');
  const minigame = new BunkerMinigame({ root: null, onComplete: noop });
  assert(minigame.stations.wires, 'Wire Station must be available through BunkerMinigame');
  assert.match(STATIONS.wires.code, /DISTRIBUSI/i);
  assert.match(STATIONS.wires.name, /PATCH BAY/i);
  assert(!/baterai|cadangan/i.test(STATIONS.wires.code + STATIONS.wires.name + wireSource), 'Wiring labels must not redefine extra_battery');
  assert.match(strategies.find((choice) => choice.id === 'c_day3_power_dual').text, /pemancar radio/i);
  assert.match(strategies.find((choice) => choice.id === 'c_day3_power_dual').text, /daya darurat bunker/i);

  const makeEngine = (model) => {
    const saves = [];
    const stationCalls = [];
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
        openStation: (station, options) => {
          stationCalls.push(station);
          options.onComplete({ success: true, stationId: station });
        },
      },
    });
    return { engine, saves, stationCalls };
  };

  const makeModel = (flags = {}, sceneId = 'day3_power_pressure') => {
    const model = new GameModel();
    model.init(sceneId, 10, [], flags, { food: 2, drink: 2, kit: 1 }, 82, 82, 90);
    return model;
  };

  const routeFlags = {
    extra_battery: true,
    inspected_power: true,
    inspected_radio: true,
  };
  const strategyExpectations = new Map([
    ['c_day3_power_radio', 'power_radio_priority'],
    ['c_day3_power_air', 'power_saved'],
    ['c_day3_power_dual', 'battery_committed'],
    ['c_day3_power_route', 'power_routed'],
  ]);

  // Every valid strategy commits first, then exposes the same required Wiring action.
  for (const choice of strategies) {
    const model = makeModel(routeFlags);
    const { engine, stationCalls } = makeEngine(model);
    const inventoryBefore = structuredClone(model.inventory);

    engine.handleChoiceSelect(choice);
    assert.equal(model.currentSceneId, 'day3_wiring', `${choice.id} must land on Wiring`);
    assert.equal(model.flags[strategyExpectations.get(choice.id)], true, `${choice.id} strategy must be committed before Wiring`);
    assert.equal(model.flags.day3_wiring_complete, false);
    const knowledgeAfterStrategy = model.knowledge;

    engine.handleRequiredInteraction(wiringInteraction);
    assert.equal(model.currentSceneId, 'day3_radio_rescue', `${choice.id} Wiring must lead to Radio`);
    assert.equal(model.flags.day3_wiring_complete, true);
    assert.deepEqual(model.inventory, inventoryBefore, 'Wiring must not consume inventory');
    assert.equal(model.flags.extra_battery, true, 'extra_battery must remain dedicated to the VHF/transceiver');
    assert.equal(model.knowledge, knowledgeAfterStrategy, 'Mandatory Wiring must not award Knowledge');
    assert.equal(stationCalls.length, 1, 'Wiring must open exactly once on the successful route');
    assert.equal(model.history.filter((entry) => entry.choiceId === 'required_wires').length, 1);
  }

  // Save/reload before Wiring preserves the selected strategy and required checkpoint.
  const preWiringModel = makeModel(routeFlags);
  const preWiringEngine = makeEngine(preWiringModel).engine;
  preWiringEngine.handleChoiceSelect(strategies.find((choice) => choice.id === 'c_day3_power_route'));
  const preWiringSave = preWiringModel.toSaveData();
  const reloadedBeforeWiring = new GameModel();
  reloadedBeforeWiring.init(
    preWiringSave.sceneId,
    preWiringSave.knowledge,
    preWiringSave.history,
    preWiringSave.flags,
    preWiringSave.inventory,
    preWiringSave.hunger,
    preWiringSave.thirst,
    preWiringSave.health,
    preWiringSave.expeditionVisitedLocations,
    preWiringSave.storyRevision,
    preWiringSave.houseScavengeResult,
  );
  assert.equal(reloadedBeforeWiring.currentSceneId, 'day3_wiring');
  assert.equal(reloadedBeforeWiring.flags.power_routed, true);
  assert.equal(reloadedBeforeWiring.flags.day3_wiring_complete, false);
  const reloadEngine = makeEngine(reloadedBeforeWiring).engine;
  reloadEngine.handleRequiredInteraction(wiringInteraction);
  assert.equal(reloadedBeforeWiring.currentSceneId, 'day3_radio_rescue');

  // A completed Wiring save resumes at Radio and cannot replay the station.
  const completedSave = reloadedBeforeWiring.toSaveData();
  const reloadedAfterWiring = new GameModel();
  reloadedAfterWiring.init(
    completedSave.sceneId,
    completedSave.knowledge,
    completedSave.history,
    completedSave.flags,
    completedSave.inventory,
    completedSave.hunger,
    completedSave.thirst,
    completedSave.health,
    completedSave.expeditionVisitedLocations,
    completedSave.storyRevision,
    completedSave.houseScavengeResult,
  );
  const afterReloadEngine = makeEngine(reloadedAfterWiring);
  afterReloadEngine.engine.renderScene('day3_radio_rescue');
  assert.equal(afterReloadEngine.stationCalls.length, 0, 'Completed Wiring must not replay after reload');
  const historyAfterWiring = reloadedAfterWiring.history.length;
  assert.equal(afterReloadEngine.engine.completeRequiredInteraction(wiringInteraction), false, 'Duplicate Wiring callback must be idempotent');
  assert.equal(reloadedAfterWiring.history.length, historyAfterWiring);

  // Reconstruct the completion flag from the stable required-action history ID.
  const reconstructed = new GameModel();
  reconstructed.init(
    'day3_radio_rescue',
    completedSave.knowledge,
    completedSave.history,
    null,
    completedSave.inventory,
    completedSave.hunger,
    completedSave.thirst,
    completedSave.health,
  );
  assert.equal(reconstructed.flags.day3_wiring_complete, true);

  // Final radio quality remains the existing clear/weak/failed contract.
  for (const quality of ['clear', 'weak', 'failed']) {
    const model = makeModel({ ...routeFlags, day3_wiring_complete: true }, 'day3_radio_rescue');
    const { engine } = makeEngine(model);
    engine.handleFinalRadioResult({ quality, frequency: 96.2, strength: quality === 'clear' ? 95 : quality === 'weak' ? 60 : 5 });
    assert.equal(model.flags.radio_quality, quality);
    assert.equal(model.currentSceneId, `day3_radio_${quality}`);
  }

  // Wiring is mandatory gameplay, not a preparedness or ending-tier input.
  const evaluatorFlags = {
    radio_quality: 'failed',
    air_remedied: true,
    water_filtered: true,
    power_saved: true,
    inspected_radio: true,
    inspected_power: true,
    inspected_ventilation: true,
    extra_battery: true,
    food_packed: true,
    drink_packed: true,
    kit_packed: true,
    medical_mask_ready: true,
  };
  const withoutWiring = makeModel(evaluatorFlags, 'day3_final_hours');
  const withWiring = makeModel({ ...evaluatorFlags, day3_wiring_complete: true }, 'day3_final_hours');
  assert.deepEqual(withWiring.calculatePreparednessReport(), withoutWiring.calculatePreparednessReport());
  assert.equal(withWiring.getEndingResult().endingId, withoutWiring.getEndingResult().endingId);
  assert.equal(withWiring.getEndingResult().endingId, 'ending_good', 'Failed-radio GOOD must remain reachable with strong technical play');

  assert.equal(
    execFileSync('git', ['diff', '--exit-code', '--', 'src/data/storyLegacyPhase7.json'], { encoding: 'utf8' }),
    '',
    'Legacy story must remain unchanged',
  );

  console.log('PASS: all Day 3 strategies require Wiring, state/save reload/idempotency hold, extra_battery remains VHF-specific, Radio qualities stay reachable, failed-radio GOOD remains possible, evaluator score is invariant, and legacy story is isolated.');
} finally {
  await vite.close();
}
