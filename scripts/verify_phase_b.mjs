import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

console.log('--- RUNNING PHASE B VERIFICATION SUITE ---');

// 1. Check save schema version and revision isolation foundation
console.log('[1/7] Checking save schema version and story revision baseline...');
const constantsSrc = fs.readFileSync('src/js/constants.js', 'utf8');
assert.match(constantsSrc, /export const SAVE_SCHEMA_VERSION = 4;/, 'SAVE_SCHEMA_VERSION must remain 4');
assert.match(constantsSrc, /SEALED72: 'sealed72'/, 'SEALED72 must be defined');
assert.match(constantsSrc, /LEGACY_PHASE7: 'legacy_phase7'/, 'LEGACY_PHASE7 must be defined');

// Verify storyLegacyPhase7.json is untouched
const legacyDiff = execFileSync('git', ['diff', 'HEAD', '--', 'src/data/storyLegacyPhase7.json'], { encoding: 'utf8' });
assert.equal(legacyDiff.trim(), '', 'storyLegacyPhase7.json must NOT be modified in Phase B');

// 2. Check Plan A & Plan B narrative in sealed72 backstory
console.log('[2/7] Checking Plan A / Plan B narrative in sealed72 backstory...');
const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
const scenes = storyData.scenes;

const bunkerCompleteScene = scenes.backstory_bunker_complete;
assert(bunkerCompleteScene, 'backstory_bunker_complete scene must exist');
assert.match(bunkerCompleteScene.text, /Rencana A/i, 'backstory_bunker_complete must describe Plan A evacuation');
assert.match(bunkerCompleteScene.text, /Rencana B/i, 'backstory_bunker_complete must describe Plan B bunker shelter');

// 3. Check Aris & Sarah task division and Sarah scavenger narrative
console.log('[3/7] Checking Aris & Sarah task division in prologue...');
const prologQuestion = scenes.prolog_question;
assert(prologQuestion, 'prolog_question scene must exist');
assert.match(prologQuestion.text, /Aris:/, 'prolog_question must have Aris dialogue');
assert.match(prologQuestion.text, /Sarah:/, 'prolog_question must have Sarah dialogue');
assert.match(prologQuestion.text, /Maya/, 'prolog_question must reference Maya');
assert.match(prologQuestion.text, /titik kumpul|akses shelter/i, 'prolog_question must reference shelter access / staging point');

const prologPacking = scenes.prolog_packing;
assert(prologPacking, 'prolog_packing scene must exist');
assert.equal(prologPacking.speaker, 'Sarah', 'prolog_packing speaker must be Sarah');
assert.match(prologPacking.text, /Aris sudah berangkat|menuju luar/i, 'prolog_packing must note Aris has already departed outside');
assert.match(prologPacking.text, /titik kumpul|akses shelter/i, 'prolog_packing must reference staging point / shelter access');
assert.match(prologPacking.text, /Maya/, 'prolog_packing must reference Maya');

// 4. Check prolog_expedition_call and prolog_expedition_map bridging
console.log('[4/7] Checking prologue bridging scenes and choice links...');
const prologExpeditionCall = scenes.prolog_expedition_call;
assert(prologExpeditionCall, 'prolog_expedition_call scene must exist');
assert.equal(prologExpeditionCall.speaker, 'Sarah', 'prolog_expedition_call speaker must be Sarah');
assert.match(prologExpeditionCall.text, /titik kumpul|akses shelter/i, 'prolog_expedition_call must reference staging point / shelter access');
assert.match(prologExpeditionCall.text, /Maya/, 'prolog_expedition_call must reference Maya');
assert.equal(prologExpeditionCall.choices?.[0]?.id, 'c_prolog_accept_supply_run', 'prolog_expedition_call choice id must be preserved');
assert.equal(prologExpeditionCall.choices?.[0]?.nextSceneId, 'prolog_expedition_map', 'prolog_expedition_call must transition to prolog_expedition_map');

const prologExpeditionMap = scenes.prolog_expedition_map;
assert(prologExpeditionMap, 'prolog_expedition_map scene must exist');
assert.equal(prologExpeditionMap.speaker, 'Aris', 'prolog_expedition_map speaker must be Aris');
const validChoiceIds = ['c_prolog_confirm_expedition_plan', 'c_prolog_choose_minimarket'];
assert(validChoiceIds.includes(prologExpeditionMap.choices?.[0]?.id), 'prolog_expedition_map choice id must be valid');

// 5. Check Scavenger Minigame prologue UI strings and tension events
console.log('[5/7] Checking ScavengerMinigame source configurations and UI texts...');
const minigameSrc = fs.readFileSync('src/js/scavengerMinigame.js', 'utf8');

// Hatch and rooms
assert.match(minigameSrc, /label:\s*'TITIK KUMPUL BEKAL \(AKSES SHELTER\)'/, 'PROLOGUE_BUNKER_HATCH label must be updated');
assert.match(minigameSrc, /name:\s*'TITIK KUMPUL \(AKSES SHELTER\)'/, 'PROLOGUE_ROOMS bunker room label must be updated');
assert.match(minigameSrc, /name:\s*'Ambang Akses Shelter'/, 'PROLOGUE doorway label must be updated');

// Tension events
assert.doesNotMatch(minigameSrc, /PALKA SEGERA DITUTUP/, 'Old tension message PALKA SEGERA DITUTUP must be replaced');
assert.match(minigameSrc, /GUNCANGAN TERASA — AMANKAN PERSEDIAAN RUMAH!/, 'Tension event 1 must reflect Sarah context');
assert.match(minigameSrc, /SEGERA KEMBALI KE TITIK KUMPUL BERSAMA MAYA!/, 'Tension event 3 must reflect returning to Maya');

// Timer badge & action buttons
assert.match(minigameSrc, /this\.mode === 'prologue' \? 'WAKTU SIAGA:' : 'EVAKUASI:'/, 'Timer label must distinguish prologue mode');
assert.match(minigameSrc, /this\.mode === 'prologue' \? 'Ambil \/ Simpan' : 'Ambil \/ Masuk'/, 'Desktop hint must distinguish prologue mode');
assert.match(minigameSrc, /this\.mode === 'prologue' \? 'AMBIL \/ SIMPAN \[E\]' : 'AMBIL \/ MASUK \[E\]'/, 'Touch button must distinguish prologue mode');

// Empty backpack confirm
assert.match(minigameSrc, /SELESAI TANPA TAMBAHAN BEKAL\? Tekan E \/ SPASI lagi untuk konfirmasi\./, 'Empty backpack prompt must reflect prologue mode');

// Finish notifications and summary
assert.match(minigameSrc, /BEKAL BERHASIL DIAMANKAN/, 'Summary title for prologue normal completion must be BEKAL BERHASIL DIAMANKAN');
assert.match(minigameSrc, /WAKTU SIAGA HABIS/, 'Summary title for prologue timeout must be WAKTU SIAGA HABIS');
assert.match(minigameSrc, /BEKAL DIAMANKAN/, 'Summary reason for prologue normal completion must be BEKAL DIAMANKAN');
assert.match(minigameSrc, /playItemCollect/, 'Prologue finish must play item collect audio cue instead of door lock');

// 6. Test runtime StoryEngine controller integration
console.log('[6/7] Testing StoryEngine controller revision-aware handling...');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { setTimeout: (fn) => fn() };

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { STORY_REVISIONS } = await vite.ssrLoadModule('/src/js/constants.js');

  const noop = () => {};
  let lastToast = null;
  let lastScavengerResult = null;
  const mockView = new Proxy({
    isTyping: false,
    dom: { choicesPanel: { innerHTML: '' }, dialogueText: { textContent: '' }, storyBox: { classList: { remove: noop } } },
    typeText: (text, done) => done?.(),
    showScavengerResult: (res) => { lastScavengerResult = res; },
    showTelltaleToast: (msg) => { lastToast = msg; },
    renderChoices: noop,
    renderProtocolLog: noop,
    updateInventoryUI: noop,
    renderSceneBackground: noop,
    renderStatsHUD: noop,
    renderSceneHUD: noop,
    clearChoices: noop,
    startScavengerMinigame: noop,
    destroyScavengerMinigame: noop,
  }, { get: (target, key) => target[key] ?? noop });

  // Test sealed72 StoryEngine scavenger result
  const sealedModel = new GameModel();
  sealedModel.init('prolog_packing');
  assert.equal(sealedModel.storyRevision, STORY_REVISIONS.SEALED72);

  const sealedEngine = Object.create(StoryEngine.prototype);
  Object.assign(sealedEngine, {
    model: sealedModel,
    storyData,
    view: mockView,
    audio: new Proxy({}, { get: () => noop }),
    onSave: noop,
    bunkerMinigame: { close: noop },
    prologPlannedLocations: [],
  });

  sealedEngine.handleScavengerComplete({
    collectedItems: ['food', 'drink', 'radio'],
    resourceCounts: { food: 1, drink: 1, radio: 1 },
    reason: 'entered_hatch',
  });

  assert(lastScavengerResult, 'Scavenger result should be passed to view');
  assert.equal(lastScavengerResult.summary.title, 'BEKAL BERHASIL DIAMANKAN');
  assert.equal(lastScavengerResult.summary.reason, 'BEKAL DIAMANKAN');
  assert.equal(sealedModel.currentSceneId, 'prolog_expedition_call');
  assert.equal(sealedModel.flags.has_radio, true);
  assert.equal(sealedModel.flags.food_packed, true);

  // Test sealed72 prolog route plan history text
  sealedEngine.prologPlannedLocations = ['neighbor_house', 'minimarket'];
  sealedEngine.confirmPrologRoutePlan();
  const lastHistory = sealedModel.history.at(-1);
  assert(lastHistory, 'History entry should be logged for prolog route plan');
  assert.match(lastHistory.text, /Rute neighbor_house dan minimarket dicermati untuk perbekalan\./);

  // 7. Verify Phase D boundaries remain UNTOUCHED
  console.log('[7/7] Verifying Phase D boundaries remain untouched...');
  assert(scenes.day2_start, 'day2_start must remain in story.json');
  assert(!scenes.day2_internal_crisis, 'Phase D day2_internal_crisis must NOT exist yet');
} finally {
  await vite.close();
}

console.log('\n========================================');
console.log('ALL PHASE B VERIFICATION TESTS PASSED!');
console.log('========================================\n');
