import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
const sealedScenes = storyData.scenes;
const legacyScenes = legacyStoryData.scenes;

globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {
  setTimeout: (fn) => fn(),
  clearTimeout() {},
};

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');

  const card = sealedScenes.prolog_threshold.requiredInteraction;
  const power = sealedScenes.day1_power_boot.requiredInteraction;
  assert.deepEqual(card, {
    type: 'bunkerStation',
    station: 'card',
    actionText: 'GUNAKAN KARTU AKSES',
    completionFlag: 'bunker_card_access_complete',
    historyText: '[KARTU AKSES] Akses Bunker 72 diterima.',
    nextSceneId: 'prolog_surface',
  });
  assert(!/tersegel|akses bunker (?:sudah )?berhasil|sudah berada di dalam/i.test(sealedScenes.prolog_threshold.text),
    'Pre-card threshold narration must not claim successful bunker access');
  assert(/diterima|menutup rapat|tersegel/i.test(sealedScenes.prolog_surface.text),
    'Post-card surface narration must establish accepted access and sealing');
  assert.equal(sealedScenes.prolog_threshold.choices.length, 0);
  assert.equal(sealedScenes.prolog_title.choices.length, 0);
  assert.equal(sealedScenes.day1_power_boot.choices.length, 0);
  assert(!sealedScenes.prolog_title.choices.some((choice) => choice.triggerBunkerStation),
    'Card must no longer be attached to a title fake choice');
  assert(!sealedScenes.day1_power_boot.choices.some((choice) => choice.triggerBunkerStation),
    'Power must no longer be attached to a one-choice narrative decision');
  assert.equal(legacyScenes.prolog_title.choices.find((choice) => choice.triggerBunkerStation === 'card')?.triggerBunkerStation, 'card');
  assert.equal(legacyScenes.day1_power_boot.choices.find((choice) => choice.triggerBunkerStation === 'power')?.triggerBunkerStation, 'power');

  const noop = () => {};
  const makeEngine = (model, saves) => {
    const view = {
      isTyping: false,
      dom: {
        choicesPanel: { innerHTML: '' },
        dialogueText: { textContent: '' },
        storyBox: { classList: { add: noop, remove: noop, toggle: noop } },
      },
      typeText(text, done) { done?.(); },
      renderRequiredInteraction(interaction, onActivate) {
        this.lastRequiredInteraction = interaction;
        this.lastRequiredAction = onActivate;
      },
    };
    const station = {
      close: noop,
      openStation(stationId, options) {
        this.lastStationId = stationId;
        this.lastOptions = options;
      },
    };
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: new Proxy(view, { get: (target, key) => target[key] ?? noop }),
      audio: new Proxy({}, { get: () => noop }),
      onSave: (save) => saves.push(structuredClone(save)),
      onEnd: noop,
      bunkerMinigame: station,
      pendingRequiredInteraction: null,
      pendingClickNextSceneId: null,
      pendingBunkerEntryChoice: null,
      pendingMinigameChoice: null,
      bunkerEntryUnlocked: false,
      _unlockedMinigameChoiceIds: new Set(),
      _debugBypassSave: false,
      _autoAdvanceTimer: null,
      _autoAdvanceRequest: null,
      _blockedAutoAdvance: null,
      sarahAnalysisReviewedIds: new Set(),
      sarahAnalysisIndex: 0,
      prologPlannedLocations: [],
    });
    engine._testView = view;
    engine._testStation = station;
    return engine;
  };

  const makeModel = (sceneId, flags = null) => {
    const model = new GameModel();
    model.init(sceneId, 5, [], flags, { food: 1, drink: 1, kit: 1 }, 100, 100, 100);
    return model;
  };

  // Card: action is available after the scene render, completion saves the
  // destination checkpoint, and a repeated callback does nothing.
  {
    const saves = [];
    const engine = makeEngine(makeModel('prolog_threshold'), saves);
    engine.renderScene('prolog_threshold');
    assert.equal(engine._testView.lastRequiredInteraction, card);
    assert.equal(saves.at(-1).sceneId, 'prolog_threshold');
    assert.equal(saves.at(-1).flags.bunker_card_access_complete, false);

    const beforeCardReload = makeEngine(makeModel('prolog_threshold', saves.at(-1).flags), []);
    beforeCardReload.renderScene('prolog_threshold');
    assert.equal(beforeCardReload._testView.lastRequiredInteraction.completionFlag, card.completionFlag,
      'Reload before Card must leave the Card action available');

    engine.handleRequiredInteraction(card);
    assert.equal(engine._testStation.lastStationId, 'card');
    const cardCallback = engine._testStation.lastOptions.onComplete;
    cardCallback({ success: true, stationId: 'card' });
    assert.equal(engine.model.flags.bunker_card_access_complete, true);
    assert.equal(engine.model.currentSceneId, 'prolog_surface');
    assert.equal(engine.model.history.filter((entry) => entry.choiceId === 'required_card').length, 1);
    const saveCount = saves.length;
    cardCallback({ success: true, stationId: 'card' });
    assert.equal(saves.length, saveCount, 'Repeated Card completion must not save twice');
    assert.equal(engine.model.history.filter((entry) => entry.choiceId === 'required_card').length, 1);

    const reloaded = makeEngine(makeModel('prolog_surface', saves.at(-1).flags), []);
    reloaded.renderScene('prolog_surface');
    assert.equal(reloaded.model.flags.bunker_card_access_complete, true);
    assert.equal(reloaded._testStation.lastStationId, undefined, 'Reload after Card must not reopen the station');
  }

  // Power: same contract, with no knowledge effect and no replay after reload.
  {
    const saves = [];
    const engine = makeEngine(makeModel('day1_power_boot'), saves);
    engine.renderScene('day1_power_boot');
    assert.equal(engine._testView.lastRequiredInteraction, power);
    assert.equal(saves.at(-1).flags.day1_power_online, false);

    const beforePowerReload = makeEngine(makeModel('day1_power_boot', saves.at(-1).flags), []);
    beforePowerReload.renderScene('day1_power_boot');
    assert.equal(beforePowerReload._testView.lastRequiredInteraction.completionFlag, power.completionFlag,
      'Reload before Power must leave the Power action available');

    engine.handleRequiredInteraction(power);
    assert.equal(engine._testStation.lastStationId, 'power');
    const powerCallback = engine._testStation.lastOptions.onComplete;
    const knowledgeBefore = engine.model.knowledge;
    powerCallback({ success: true, stationId: 'power' });
    assert.equal(engine.model.flags.day1_power_online, true);
    assert.equal(engine.model.currentSceneId, 'day1_inspection');
    assert.equal(engine.model.knowledge, knowledgeBefore, 'Required Power action must not award Knowledge');
    assert.equal(engine.model.history.filter((entry) => entry.choiceId === 'required_power').length, 1);
    const saveCount = saves.length;
    powerCallback({ success: true, stationId: 'power' });
    assert.equal(saves.length, saveCount, 'Repeated Power completion must not save twice');
    assert.equal(engine.model.history.filter((entry) => entry.choiceId === 'required_power').length, 1);
  }

  const fresh = makeModel('backstory_return');
  assert.equal(fresh.flags.bunker_card_access_complete, false);
  assert.equal(fresh.flags.day1_power_online, false);

  console.log('PASS: required Card/Power contracts, chronology, persistence, idempotency, New Game reset, and legacy trigger compatibility.');
} finally {
  await vite.close();
}
