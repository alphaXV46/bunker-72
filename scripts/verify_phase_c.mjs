import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

console.log('--- RUNNING PHASE C VERIFICATION SUITE ---');

// 1. Check save schema version and story revision baseline
console.log('[1/9] Checking save schema version and story revision baseline...');
const constantsSrc = fs.readFileSync('src/js/constants.js', 'utf8');
assert.match(constantsSrc, /export const SAVE_SCHEMA_VERSION = 4;/, 'SAVE_SCHEMA_VERSION must remain 4');
assert.match(constantsSrc, /SEALED72: 'sealed72'/, 'SEALED72 must be defined');
assert.match(constantsSrc, /LEGACY_PHASE7: 'legacy_phase7'/, 'LEGACY_PHASE7 must be defined');

// Verify storyLegacyPhase7.json is untouched
const legacyDiff = execFileSync('git', ['diff', 'HEAD', '--', 'src/data/storyLegacyPhase7.json'], { encoding: 'utf8' });
assert.equal(legacyDiff.trim(), '', 'storyLegacyPhase7.json must NOT be modified in Phase C');

// 2. Check scene graph and presence in story.json
console.log('[2/9] Checking Phase C scenes in sealed72 story.json...');
const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
const scenes = storyData.scenes;

const requiredPhaseCScenes = [
  'prolog_expedition_call',
  'prolog_expedition_map',
  'prolog_minimarket',
  'prolog_medical',
  'prolog_hendra_encounter',
  'prolog_hendra_helped',
  'prolog_hendra_passed',
  'prolog_aftershock',
  'prolog_route_failure',
  'prolog_minimarket_second',
  'prolog_medical_second',
  'prolog_return_home',
  'prolog_evac_decision',
  'day2_start',
  'day2_expedition_return',
];

for (const sceneId of requiredPhaseCScenes) {
  assert(scenes[sceneId], `Required scene "${sceneId}" must exist in sealed72 story.json`);
}

// In sealed72, old outside expedition scenes must NOT exist
assert(!scenes.day2_expedition_map, 'day2_expedition_map must NOT exist in sealed72 story.json');
assert(!scenes.day2_hendra_encounter, 'day2_hendra_encounter must NOT exist in sealed72 story.json');

// In legacy_phase7, old outside expedition scenes MUST exist
assert(legacyStoryData.scenes.day2_expedition_map, 'day2_expedition_map must exist in legacy_phase7');
assert(legacyStoryData.scenes.day2_hendra_encounter, 'day2_hendra_encounter must exist in legacy_phase7');

// 3. Check narrative themes, staging, and text details
console.log('[3/9] Checking narrative themes: Hendra safety staging, aftershock, route failure, BMKG/BPBD, grounded bunker rationale...');
const hendraScene = scenes.prolog_hendra_encounter;
assert.equal(hendraScene.speaker, 'Hendra');
assert.match(hendraScene.text, /Hendra/);
assert.match(hendraScene.text, /bata|kayu|puing/i);
assert(!hendraScene.text.includes('tuas kayu'), 'Hendra staging must NOT use advanced beam leverage techniques');
assert(!hendraScene.text.includes('balok berat'), 'Hendra staging must use light reachable material');
assert.equal(hendraScene.choices.length, 2);
assert.equal(hendraScene.choices[0].id, 'c_prolog_hendra_help');
assert.equal(hendraScene.choices[1].id, 'c_prolog_hendra_family');

// Hendra helped scene: Hendra mobile, aftershock strikes, both merunduk in open area
const hendraHelpedScene = scenes.prolog_hendra_helped;
assert.match(hendraHelpedScene.text, /bergerak mandiri|menapakkan kaki/i, 'Hendra must be established as mobile');
assert.match(hendraHelpedScene.text, /gempa susulan/i, 'Aftershock must strike after helping Hendra');
assert.match(hendraHelpedScene.text, /merunduk/i, 'Both characters must practice sound earthquake response (duck/cover)');
assert(!hendraHelpedScene.text.includes('merapat ke tembok'), 'Must NOT shelter against walls during earthquake');
assert(!hendraHelpedScene.text.includes('tembok pagar'), 'Must NOT shelter beside outdoor fences or walls');
assert.match(hendraHelpedScene.text, /menjauhi.*merunduk.*terbuka/is, 'Must move away from falling hazards and shelter in open area');

// Hendra passed scene: Opportunity #2 choices available BEFORE aftershock
const hendraPassedScene = scenes.prolog_hendra_passed;
assert(hendraPassedScene.choices.some(c => c.id === 'c_prolog_opt2_medical'), 'Opportunity #2 medical choice must be available');
assert(hendraPassedScene.choices.some(c => c.id === 'c_prolog_opt2_minimarket'), 'Opportunity #2 minimarket choice must be available');
assert(hendraPassedScene.choices.some(c => c.id === 'c_prolog_opt2_skip_home'), 'Opportunity #2 skip/return choice must be available');

// Prolog aftershock scene: shared aftershock for family-first paths
const aftershockScene = scenes.prolog_aftershock;
assert.match(aftershockScene.text, /gempa susulan/i, 'Aftershock must strike in prolog_aftershock');
assert.match(aftershockScene.text, /merunduk/i, 'Aris must take cover during aftershock');
assert(!aftershockScene.text.includes('samping tiang'), 'Must NOT shelter beside poles');
assert(!aftershockScene.text.includes('tiang tembok'), 'Must NOT shelter beside walls/poles');
assert.match(aftershockScene.text, /menjauhi.*merunduk.*terbuka/is, 'Must move away from falling hazards and shelter in open area');
assert.equal(aftershockScene.autoNextSceneId, 'prolog_route_failure');

// Route failure scene: road collapse, NO supply choices remaining
const routeFailureScene = scenes.prolog_route_failure;
assert.match(routeFailureScene.text, /sisi barat/i, 'Route failure must identify Aris on west side');
assert.match(routeFailureScene.text, /sisi timur/i, 'Route failure must identify east side slope');
assert.match(routeFailureScene.text, /putus|amblas/i, 'Route failure must describe connector road failure');
assert.equal(routeFailureScene.choices.length, 1, 'Only return home direct choice should remain after route failure');
assert.equal(routeFailureScene.choices[0].id, 'c_prolog_return_home_direct');

// Return home scene: Sarah radio, BMKG update, BPBD road guidance
const returnHomeScene = scenes.prolog_return_home;
assert.match(returnHomeScene.text, /BMKG/i, 'prolog_return_home must reference BMKG earthquake update');
assert.match(returnHomeScene.text, /BPBD/i, 'prolog_return_home must reference BPBD road closure guidance');
assert.match(returnHomeScene.text, /jalur penghubung/i, 'prolog_return_home must explain connector road closure');
assert(!returnHomeScene.text.includes('Bunker 72'), 'Official broadcast in return home must NOT mention private bunker');

// Evacuation decision scene: grounded safety, no magical claims, natural dialogue
const evacDecisionScene = scenes.prolog_evac_decision;
assert.match(evacDecisionScene.text, /Rencana A/i, 'prolog_evac_decision must evaluate Plan A');
assert.match(evacDecisionScene.text, /Rencana B/i, 'prolog_evac_decision must evaluate Plan B');
assert.match(evacDecisionScene.text, /tsunami/i, 'prolog_evac_decision must explain location outside tsunami reach');
assert.match(evacDecisionScene.text, /ventilasi terfilter/i, 'prolog_evac_decision must describe ventilasi terfilter');
assert(!evacDecisionScene.text.includes('bertekanan'), 'Must NOT claim pressurized HEPA');
assert(!evacDecisionScene.text.includes('kebal'), 'Must NOT claim immunity to disasters');

// 4. Test runtime StoryEngine controller with sealed72
console.log('[4/9] Testing controller simulation of Path 1: Minimarket -> Help Hendra -> Route Failure (Hendra ascends) -> Direct Return Home...');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { setTimeout: (fn) => fn() };

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { STORY_REVISIONS } = await vite.ssrLoadModule('/src/js/constants.js');

  const noop = () => {};
  let lastToast = null;
  const mockView = new Proxy({
    isTyping: false,
    dom: { choicesPanel: { innerHTML: '' }, dialogueText: { textContent: '' }, storyBox: { classList: { remove: noop } } },
    typeText: (text, done) => done?.(),
    showScavengerResult: noop,
    showTelltaleToast: (msg) => { lastToast = msg; },
    renderChoices: noop,
    renderProtocolLog: noop,
    updateInventoryUI: noop,
    renderSceneBackground: noop,
    renderStatsHUD: noop,
    renderSceneHUD: noop,
    clearChoices: noop,
  }, { get: (target, key) => target[key] ?? noop });

  // PATH 1: Help Hendra
  {
    const model = new GameModel();
    model.init('prolog_expedition_call');
    assert.equal(model.storyRevision, STORY_REVISIONS.SEALED72);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      bunkerMinigame: { close: noop },
    });

    // 1. Choose Minimarket in Opportunity 1
    engine.handleChoiceSelect(scenes.prolog_expedition_call.choices[0]);
    assert.equal(model.currentSceneId, 'prolog_expedition_map');
    engine.handleChoiceSelect(scenes.prolog_expedition_map.choices[0]); // c_prolog_choose_minimarket
    assert.equal(model.currentSceneId, 'prolog_minimarket');

    const foodBefore = model.inventory.food;
    const drinkBefore = model.inventory.drink;
    engine.handleChoiceSelect(scenes.prolog_minimarket.choices[0]); // c_prolog_minimarket_take
    assert.equal(model.inventory.food, foodBefore + 1);
    assert.equal(model.inventory.drink, drinkBefore + 1);
    assert.equal(model.flags.extra_battery, true);
    assert.equal(model.flags.battery_packed, true);
    assert.equal(model.flags.food_packed, true);
    assert.equal(model.flags.drink_packed, true);
    assert.equal(model.flags.prolog_minimarket_visited, true);
    assert.equal(model.flags.prolog_minimarket_claimed, true);

    // 2. Hendra Encounter -> Help
    assert.equal(model.currentSceneId, 'prolog_hendra_encounter');
    engine.handleChoiceSelect(scenes.prolog_hendra_encounter.choices[0]); // c_prolog_hendra_help
    assert.equal(model.flags.helped_stranger, true);
    assert.equal(model.flags.hendra_encountered, true);
    assert.equal(model.flags.prolog_opt2_consumed, true, 'Helping Hendra must consume Opportunity #2');
    assert.equal(model.currentSceneId, 'prolog_hendra_helped');

    // 3. Auto advance to route failure
    engine.handleDialogueClick();
    assert.equal(model.currentSceneId, 'prolog_route_failure');

    // Processed text in route failure must describe mobile Hendra on east side heading to post
    const processedText = engine.processNarrativeText('prolog_route_failure', scenes.prolog_route_failure.text, 'Aris');
    assert.match(processedText, /Pak Hendra! Dari sisi situ jalan setapak ke posko/i, 'Helped Hendra must be addressed across gap');
    assert.match(processedText, /mendaki ke atas|naik ke posko/i, 'Hendra must confirm ascending to post');
    assert.match(processedText, /sisi timur yang langsung terhubung/i, 'Hendra must be on the east slope');

    // Verify NO supply choices exist in route failure
    assert.equal(scenes.prolog_route_failure.choices.length, 1);
    assert.equal(scenes.prolog_route_failure.choices[0].id, 'c_prolog_return_home_direct');

    // Select return home direct
    const returnDirect = scenes.prolog_route_failure.choices.find(c => c.id === 'c_prolog_return_home_direct');
    engine.handleChoiceSelect(returnDirect);
    assert.equal(model.currentSceneId, 'prolog_return_home');

    // 4. Return home -> evaluate bunker -> confirm bunker -> intro
    engine.handleChoiceSelect(scenes.prolog_return_home.choices[0]);
    assert.equal(model.currentSceneId, 'prolog_evac_decision');
    engine.handleChoiceSelect(scenes.prolog_evac_decision.choices[0]);
    assert.equal(model.flags.bunker_plan_confirmed, true);
    assert.equal(model.currentSceneId, 'prolog_intro');
  }

  // 5. Test Path 2: Pos Kesehatan -> Family First -> Opp 2 Minimarket -> Aftershock -> Route Failure -> Return Home
  console.log('[5/9] Testing controller simulation of Path 2: Medical -> Family First -> Opp 2 Minimarket -> Aftershock -> Route Failure...');
  {
    const model = new GameModel();
    model.init('prolog_expedition_call');

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      bunkerMinigame: { close: noop },
    });

    // 1. Choose Medical in Opportunity 1
    engine.handleChoiceSelect(scenes.prolog_expedition_call.choices[0]);
    engine.handleChoiceSelect(scenes.prolog_expedition_map.choices[1]); // c_prolog_choose_medical
    assert.equal(model.currentSceneId, 'prolog_medical');

    const kitBefore = model.inventory.kit;
    engine.handleChoiceSelect(scenes.prolog_medical.choices[0]); // c_prolog_medical_take
    assert.equal(model.inventory.kit, kitBefore + 1);
    assert.equal(model.flags.kit_packed, true);
    assert.equal(model.flags.medical_mask_ready, true);
    assert.equal(model.flags.prolog_medical_visited, true);
    assert.equal(model.flags.prolog_medical_claimed, true);

    // 2. Hendra Encounter -> Family First
    assert.equal(model.currentSceneId, 'prolog_hendra_encounter');
    engine.handleChoiceSelect(scenes.prolog_hendra_encounter.choices[1]); // c_prolog_hendra_family
    assert.equal(model.flags.stranger_family_first, true);
    assert.equal(Boolean(model.flags.helped_stranger), false);
    assert.equal(model.flags.hendra_encountered, true);
    assert.equal(model.currentSceneId, 'prolog_hendra_passed');

    // 3. Opportunity #2 choices available in prolog_hendra_passed
    const opt2Med = scenes.prolog_hendra_passed.choices.find(c => c.id === 'c_prolog_opt2_medical');
    assert(opt2Med.forbiddenFlags.includes('prolog_medical_visited'), 'Already visited Medical must be forbidden');

    // Select Opp 2 Minimarket
    const opt2Mini = scenes.prolog_hendra_passed.choices.find(c => c.id === 'c_prolog_opt2_minimarket');
    engine.handleChoiceSelect(opt2Mini);
    assert.equal(model.currentSceneId, 'prolog_minimarket_second');
    assert.equal(model.flags.prolog_opt2_consumed, true);

    const foodBeforeSecond = model.inventory.food;
    const drinkBeforeSecond = model.inventory.drink;
    engine.handleChoiceSelect(scenes.prolog_minimarket_second.choices[0]); // c_prolog_minimarket_second_take
    assert.equal(model.inventory.food, foodBeforeSecond + 1);
    assert.equal(model.inventory.drink, drinkBeforeSecond + 1);
    assert.equal(model.flags.extra_battery, true);
    assert.equal(model.flags.battery_packed, true);
    assert.equal(model.flags.food_packed, true);
    assert.equal(model.flags.drink_packed, true);

    // 4. Transitions to shared aftershock scene
    assert.equal(model.currentSceneId, 'prolog_aftershock', 'Taking 2nd stop must lead to aftershock');

    // 5. Advance through aftershock to route failure
    engine.handleDialogueClick();
    assert.equal(model.currentSceneId, 'prolog_route_failure');

    // Processed text in route failure must leave Hendra's fate UNKNOWN
    const processedText = engine.processNarrativeText('prolog_route_failure', scenes.prolog_route_failure.text, 'Aris');
    assert.match(processedText, /tak lagi terlihat|tidak tahu bagaimana nasibnya/i, 'Hendra fate must remain completely unknown');
    assert(!processedText.includes('Pak Hendra! Dari sisi situ'), 'Aris must NOT see or shout to Hendra across gap');
    assert(!processedText.includes('naik ke posko'), 'Hendra must NOT be described ascending hill');

    // Only return home direct is available
    assert.equal(scenes.prolog_route_failure.choices.length, 1);
    engine.handleChoiceSelect(scenes.prolog_route_failure.choices[0]);
    assert.equal(model.currentSceneId, 'prolog_return_home');
  }

  // 6. Test Path 3: Family First -> Skip Opp 2 -> Aftershock -> Route Failure -> Return Home
  console.log('[6/9] Testing controller simulation of Path 3: Family First -> Skip Opp 2 -> Aftershock -> Route Failure...');
  {
    const model = new GameModel();
    model.init('prolog_hendra_passed');
    model.flags.stranger_family_first = true;
    model.flags.hendra_encountered = true;

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      bunkerMinigame: { close: noop },
    });

    // Select skip Opp 2
    const skipChoice = scenes.prolog_hendra_passed.choices.find(c => c.id === 'c_prolog_opt2_skip_home');
    assert(skipChoice, 'c_prolog_opt2_skip_home must exist');
    engine.handleChoiceSelect(skipChoice);
    assert.equal(model.flags.prolog_opt2_consumed, true);
    assert.equal(model.currentSceneId, 'prolog_aftershock', 'Skipping Opp 2 must lead to aftershock');

    // Advance to route failure
    engine.handleDialogueClick();
    assert.equal(model.currentSceneId, 'prolog_route_failure');

    // Processed text in route failure must leave Hendra's fate UNKNOWN
    const processedText = engine.processNarrativeText('prolog_route_failure', scenes.prolog_route_failure.text, 'Aris');
    assert.match(processedText, /tak lagi terlihat|tidak tahu bagaimana nasibnya/i);
    assert(!processedText.includes('Pak Hendra! Dari sisi situ'));

    // Return home direct
    engine.handleChoiceSelect(scenes.prolog_route_failure.choices[0]);
    assert.equal(model.currentSceneId, 'prolog_return_home');
  }

  // 7. Test Idempotency and Duplicate Reward Protection
  console.log('[7/9] Testing idempotency of supply claims and history reconstruction...');
  {
    const model = new GameModel();
    model.init('prolog_minimarket');
    model.flags.prolog_minimarket_claimed = true;
    const initialFood = model.inventory.food;

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      bunkerMinigame: { close: noop },
    });

    // Calling take choice when already claimed must NOT increment items
    engine.handleChoiceSelect(scenes.prolog_minimarket.choices[0]);
    assert.equal(model.inventory.food, initialFood, 'Already-claimed minimarket must not grant duplicate food');

    // Test history flag reconstruction with Phase C choices
    const historyModel = new GameModel();
    historyModel.init('prolog_intro', 5, [
      { choiceId: 'c_prolog_minimarket_take' },
      { choiceId: 'c_prolog_hendra_help' },
      { choiceId: 'c_prolog_confirm_bunker_plan' },
    ]);
    assert.equal(historyModel.flags.prolog_minimarket_visited, true);
    assert.equal(historyModel.flags.prolog_minimarket_claimed, true);
    assert.equal(historyModel.flags.helped_stranger, true);
    assert.equal(historyModel.flags.hendra_encountered, true);
    assert.equal(historyModel.flags.prolog_opt2_consumed, true);
    assert.equal(historyModel.flags.bunker_plan_confirmed, true);

    const historyModelSkip = new GameModel();
    historyModelSkip.init('prolog_intro', 5, [
      { choiceId: 'c_prolog_medical_take' },
      { choiceId: 'c_prolog_hendra_family' },
      { choiceId: 'c_prolog_opt2_skip_home' },
    ]);
    assert.equal(historyModelSkip.flags.prolog_opt2_consumed, true);
    assert.equal(historyModelSkip.flags.stranger_family_first, true);
  }

  // 8. Test Day 2 Internal Bridge in sealed72
  console.log('[8/9] Testing Day 2 internal bridge in sealed72 (no outside expedition, reaches Day 3)...');
  {
    const model = new GameModel();
    model.init('day2_start');
    assert.equal(model.storyRevision, STORY_REVISIONS.SEALED72);

    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, {
      model,
      storyData,
      legacyStoryData,
      view: mockView,
      audio: new Proxy({}, { get: () => noop }),
      onSave: noop,
      bunkerMinigame: { close: noop },
    });

    // Day 2 start has internal bridge choice
    const day2StartChoices = scenes.day2_start.choices;
    assert.equal(day2StartChoices.length, 1);
    assert.equal(day2StartChoices[0].id, 'c_day2_internal_bridge');
    assert.equal(day2StartChoices[0].nextSceneId, 'day2_expedition_return');

    engine.handleChoiceSelect(day2StartChoices[0]);
    assert.equal(model.currentSceneId, 'day2_expedition_return');
    assert.equal(model.flags.day2_internal_bridge_complete, true);

    // Day 2 expedition return has choice to Day 3
    const day2ReturnChoices = scenes.day2_expedition_return.choices;
    assert.equal(day2ReturnChoices[0].id, 'c_day2_return_day3');
    assert.equal(day2ReturnChoices[0].nextSceneId, 'day3_start');

    engine.handleChoiceSelect(day2ReturnChoices[0]);
    assert.equal(model.currentSceneId, 'day3_start');

    // Verify startExpedition is guarded against sealed72
    engine.startExpedition('neighbor_house');
    assert.equal(model.expeditionVisitedLocations.length, 0, 'startExpedition must be disabled for sealed72');
  }

  // 9. Test Ending Independence, Zero Preparedness from Hendra, and Hendra Card Callback
  console.log('[9/9] Testing ending evaluator: zero preparedness impact, sealed72 Hendra callback isolation, and legacy preservation...');
  {
    const makeModel = (helped, familyFirst, health = 90, revision = STORY_REVISIONS.SEALED72) => {
      const m = new GameModel();
      m.init('day3_final_hours', 8, [], {
        radio_quality: 'clear',
        air_remedied: true,
        water_filtered: true,
        power_saved: true,
        inspected_radio: true,
        inspected_power: true,
        inspected_ventilation: true,
        extra_battery: true,
        helped_stranger: helped,
        stranger_family_first: familyFirst,
        hendra_encountered: helped || familyFirst,
      }, { food: 2, drink: 2, kit: 1 }, 70, 65, health, [], revision);
      return m;
    };

    const modelHelped = makeModel(true, false);
    const modelFamily = makeModel(false, true);
    const modelNone = makeModel(false, false);

    const resHelped = modelHelped.evaluateModularEnding();
    const resFamily = modelFamily.evaluateModularEnding();
    const resNone = modelNone.evaluateModularEnding();

    // Zero preparedness effect from Hendra in both branches:
    assert.equal(resHelped.endingId, 'ending_good');
    assert.equal(resFamily.endingId, 'ending_good');
    assert.equal(resNone.endingId, 'ending_good');
    assert.equal(resHelped.preparednessScore, resNone.preparednessScore, 'Helped must not grant extra preparedness');
    assert.equal(resFamily.preparednessScore, resNone.preparednessScore, 'Family first must not penalize preparedness');

    // Epilogue cards in sealed72:
    // Helped: Hendra card appears and mentions posko bukit
    const hendraCardHelped = resHelped.modules.find(m => m.id === 'hendra');
    assert(hendraCardHelped, 'Hendra card should exist in sealed72 when helped');
    assert.match(hendraCardHelped.body, /posko bukit/i);
    assert.match(hendraCardHelped.body, /sisi barat rekahan/i);

    // Family first: NO Hendra card in sealed72 (fate is completely unknown)
    const hendraCardFamily = resFamily.modules.find(m => m.id === 'hendra');
    assert.equal(hendraCardFamily, undefined, 'Hendra card must NOT exist in sealed72 when family first (fate is unknown)');

    // None: NO Hendra card
    const hendraCardNone = resNone.modules.find(m => m.id === 'hendra');
    assert.equal(hendraCardNone, undefined, 'Hendra card must NOT exist when not encountered');

    // Legacy preservation: legacy_phase7 STILL produces Hendra cards for all outcomes
    const modelLegacyFamily = makeModel(false, true, 90, STORY_REVISIONS.LEGACY_PHASE7);
    const resLegacyFamily = modelLegacyFamily.evaluateModularEnding();
    const legacyCardFamily = resLegacyFamily.modules.find(m => m.id === 'hendra');
    assert(legacyCardFamily, 'Legacy revision MUST preserve Hendra card for family_first');
    assert.match(legacyCardFamily.body, /Nasib Hendra tidak dijadikan vonis/i);
  }

} finally {
  await vite.close();
}

console.log('\n========================================');
console.log('ALL PHASE C VERIFICATION TESTS PASSED!');
console.log('========================================\n');
