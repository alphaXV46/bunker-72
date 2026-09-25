// scripts/verify_phase_e.mjs
// Verification suite for Phase E: Final Callbacks, Ending Integration, and Epilogue Polish.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- RUNNING PHASE E VERIFICATION SUITE ---');

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; },
};
globalThis.window = {
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
};

try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const {
    ENDING_IDS,
    ENDING_RULES,
    STORY_REVISIONS,
    CURRENT_STORY_REVISION,
    SAVE_SCHEMA_VERSION,
  } = await vite.ssrLoadModule('/src/js/constants.js');

  const storySealed = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'src/data/story.json'), 'utf8'));
  const storyLegacy = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'src/data/storyLegacyPhase7.json'), 'utf8'));

  // ============================================================================
  // 1. SAVE SCHEMA AND REVISION BASELINE
  // ============================================================================
  console.log('[1/15] Verifying save schema version and story revision baseline...');
  assert.equal(SAVE_SCHEMA_VERSION, 4, 'SAVE_SCHEMA_VERSION must remain 4');
  assert.equal(CURRENT_STORY_REVISION, 'sealed72', 'CURRENT_STORY_REVISION must be sealed72');
  assert.equal(STORY_REVISIONS.SEALED72, 'sealed72');
  assert.equal(STORY_REVISIONS.LEGACY_PHASE7, 'legacy_phase7');

  // Exactly three endings exist
  const EXPECTED_ENDINGS = ['ending_bad', 'ending_normal', 'ending_good'];
  assert.deepEqual([...ENDING_IDS].sort(), [...EXPECTED_ENDINGS].sort(), 'ENDING_IDS must contain exactly the 3 main endings');
  for (const endingId of EXPECTED_ENDINGS) {
    assert(storySealed.scenes[endingId], `Sealed story must contain scene ${endingId}`);
    assert(storyLegacy.scenes[endingId], `Legacy story must contain scene ${endingId}`);
  }
  assert(!Object.keys(storySealed.scenes).some((id) => id.startsWith('ending_') && !EXPECTED_ENDINGS.includes(id) && id !== 'ending_eval'),
    'No unauthorized ending scenes may exist in sealed72');

  // ============================================================================
  // 2. NARRATIVE COPY & TONE INTEGRITY
  // ============================================================================
  console.log('[2/15] Checking ending narrative tone and age-10+ safety...');
  const badText = storySealed.scenes.ending_bad.text;
  const normalText = storySealed.scenes.ending_normal.text;
  const goodText = storySealed.scenes.ending_good.text;

  // BAD: Family survives, urgent care, no graphic gore
  assert.match(badText, /selamat/i, 'BAD ending must confirm family survival');
  assert.match(badText, /lemah/i, 'BAD ending must reflect weak physical condition');
  assert.match(badText, /perawatan darurat|medis/i, 'BAD ending must reflect urgent medical care');
  assert(!/tewas|mati|mayat|hancur berkeping|berlumuran/i.test(badText),
    'BAD ending must be age-10+ appropriate and avoid graphic violence/death');

  // NORMAL: Survival with a difficult recovery
  assert.match(normalText, /selamat/i, 'NORMAL ending must confirm family survival');
  assert.match(normalText, /72 jam yang berat/i, 'NORMAL ending must show the cost of survival');
  assert.match(normalText, /pemeriksaan.*pulih/i, 'NORMAL ending must show recovery');

  // GOOD: Preparation created margin, stable condition
  assert.match(goodText, /persiapan|margin/i, 'GOOD ending must credit preparation');
  assert.match(goodText, /stabil/i, 'GOOD ending must reflect stable condition');

  // ============================================================================
  // 3. SOCIAL FLAG INVARIANCE & ZERO LEAKAGE INTO EVALUATOR
  // ============================================================================
  console.log('[3/15] Testing social flag invariance on preparedness score and ending determination...');
  const createBaseModel = (health = 80, radio = 'clear') => {
    const m = new GameModel();
    m.init('day3_final_hours', 10, [], {
      radio_quality: radio,
      air_seal_good: true,
      water_filtered: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_power: true,
      inspected_radio: true,
      food_packed: true,
      drink_packed: true,
      kit_packed: true,
    }, { food: 2, drink: 2, kit: 1 }, 70, 70, health);
    return m;
  };

  // Test with 3 different health brackets (producing GOOD, NORMAL, and BAD)
  const healthTiers = [
    { health: 90, expectedEnding: 'ending_good' },
    { health: 40, expectedEnding: 'ending_normal' },
    { health: 0,  expectedEnding: 'ending_bad' },
  ];

  for (const { health, expectedEnding } of healthTiers) {
    const baselineModel = createBaseModel(health);
    const baselineResult = baselineModel.getEndingResult();
    assert.equal(baselineResult.endingId, expectedEnding);
    const baselineScore = baselineResult.preparedness.score;

    // Permute Hendra flags
    const hendraPermutations = [
      { helped_stranger: true, stranger_family_first: false, hendra_encountered: true },
      { helped_stranger: false, stranger_family_first: true, hendra_encountered: true },
      { helped_stranger: false, stranger_family_first: false, hendra_encountered: false },
    ];

    // Permute Sarah flags
    const sarahPermutations = ['escalate', 'verify', 'maintain', null];

    // Permute Maya flags
    const mayaPermutations = [
      { toy_packed: true, promised_maya: true, maya_toy_callback: true },
      { toy_packed: false, promised_maya: false, maya_toy_callback: false },
      { maya_comforted: true, sarah_comforted_maya: true },
    ];

    for (const hendraFlags of hendraPermutations) {
      for (const sarahResponse of sarahPermutations) {
        for (const mayaFlags of mayaPermutations) {
          const testModel = createBaseModel(health);
          Object.assign(testModel.flags, hendraFlags, { sarah_warning_response: sarahResponse }, mayaFlags);
          const testResult = testModel.getEndingResult();

          assert.equal(testResult.endingId, expectedEnding,
            `Ending ID must be invariant to social flags! Health=${health}, ending was ${testResult.endingId}`);
          assert.equal(testResult.preparedness.score, baselineScore,
            `Preparedness score must be invariant to social flags! Health=${health}, score was ${testResult.preparedness.score}`);
        }
      }
    }
  }

  // ============================================================================
  // 4. HENDRA FINAL PAYOFF & CAUSALITY ISOLATION IN SEALED72
  // ============================================================================
  console.log('[4/15] Testing Hendra final payoff in sealed72 (helped vs family-first)...');
  // Case A: Helped Hendra in sealed72 (Good ending)
  {
    const m = createBaseModel(90);
    m.flags.helped_stranger = true;
    m.flags.hendra_encountered = true;
    const modular = m.evaluateModularEnding();

    const hendraCard = modular.modules.find((card) => card.id === 'hendra');
    assert(hendraCard, 'Hendra card MUST exist in sealed72 when helped_stranger is true');
    assert.match(hendraCard.body, /posko bukit|bukit evakuasi/i, 'Hendra card must confirm reaching evacuation hill');
    assert.match(hendraCard.body, /terima kasih/i, 'Hendra must thank Aris');
    assert(!/petugas SAR|komandan SAR|anggota Basarnas/i.test(hendraCard.body),
      'Hendra must NOT be portrayed as a SAR officer');

    // Verify rescue card does NOT attribute finding the bunker to Hendra
    const rescueCard = modular.modules.find((card) => card.id === 'rescue');
    assert(!/catatan dari hendra/i.test(rescueCard.body),
      'Rescue card must NOT make Hendra the reason SAR found the bunker');
  }

  // Case B: Family First in sealed72
  {
    const m = createBaseModel(90);
    m.flags.stranger_family_first = true;
    m.flags.hendra_encountered = true;
    const modular = m.evaluateModularEnding();

    const hendraCard = modular.modules.find((card) => card.id === 'hendra');
    assert.equal(hendraCard, undefined,
      'Hendra card must NOT exist in sealed72 when family-first was chosen (fate remains unknown)');
  }

  // Case C: Hendra not encountered in sealed72
  {
    const m = createBaseModel(90);
    m.flags.hendra_encountered = false;
    const modular = m.evaluateModularEnding();

    const hendraCard = modular.modules.find((card) => card.id === 'hendra');
    assert.equal(hendraCard, undefined, 'Hendra card must NOT exist when Hendra was not encountered');
  }

  // ============================================================================
  // 5. BAD ENDING HENDRA PRESENTATION (NO DELAY TO URGENT CARE)
  // ============================================================================
  console.log('[5/15] Testing BAD ending Hendra presentation and medical care priority...');
  {
    const m = createBaseModel(0); // Health 0 -> BAD ending
    m.flags.helped_stranger = true;
    m.flags.hendra_encountered = true;
    const modular = m.evaluateModularEnding();

    assert.equal(modular.endingId, 'ending_bad');
    const rescueCard = modular.modules[0];
    assert.equal(rescueCard.id, 'rescue');
    assert.match(rescueCard.body, /Ketiganya selamat dan segera dirawat/);

    // Hendra card in BAD ending should be at the very end
    const hendraCard = modular.modules.find((card) => card.id === 'hendra');
    assert(hendraCard, 'Hendra card should exist in BAD ending when helped');
    assert.equal(modular.modules.at(-1).id, 'hendra', 'Hendra card in BAD ending must be positioned at the end');
    assert.match(hendraCard.body, /berterima kasih.*sebelum keluarga dibawa/i,
      'Hendra card must acknowledge assistance without interrupting urgent medical treatment');
  }

  // ============================================================================
  // 6. FAILED RADIO COEXISTENCE WITH GOOD ENDING
  // ============================================================================
  console.log('[6/15] Verifying that radio_quality=failed can still achieve GOOD ending with strong technical play...');
  {
    const m = new GameModel();
    m.init('day3_final_hours', 12, [], {
      radio_quality: 'failed',
      air_seal_good: true,
      water_filtered: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_power: true,
      inspected_radio: true,
      food_packed: true,
      drink_packed: true,
      kit_packed: true,
      snack_packed: true,
      extra_battery: true,
      medical_mask_ready: true,
      inspected_medical: true,
      inspected_supply: true,
    }, { food: 2, drink: 2, kit: 1 }, 80, 80, 85);

    const result = m.getEndingResult();
    const prep = result.preparedness;
    assert.equal(prep.radioQuality, 'failed');
    assert(prep.score >= ENDING_RULES.GOOD_PREPAREDNESS_MIN,
      `Preparedness score (${prep.score}) must meet or exceed minimum (${ENDING_RULES.GOOD_PREPAREDNESS_MIN})`);
    assert(m.health >= ENDING_RULES.GOOD_HEALTH_MIN, 'Health must meet GOOD minimum');
    assert.equal(result.endingId, 'ending_good',
      'Player with failed radio but strong technical foundation MUST achieve GOOD ending');

    const modular = m.evaluateModularEnding();
    const rescueCard = modular.modules.find((c) => c.id === 'rescue');
    assert.match(rescueCard.body, /penyisiran sektor/i,
      'Failed radio rescue card must explain rescue occurred via sector search');
  }

  // ============================================================================
  // 7. RADIO QUALITY PRESENTATION DIFFERENCES
  // ============================================================================
  console.log('[7/15] Checking distinct presentation for radio clear, weak, and failed...');
  {
    const clearModel = createBaseModel(90, 'clear');
    const weakModel = createBaseModel(90, 'weak');
    const failedModel = createBaseModel(90, 'failed');

    const clearRescue = clearModel.evaluateModularEnding().modules[0].body;
    const weakRescue = weakModel.evaluateModularEnding().modules[0].body;
    const failedRescue = failedModel.evaluateModularEnding().modules[0].body;

    assert.notEqual(clearRescue, weakRescue, 'Clear and weak radio rescue texts must differ');
    assert.notEqual(weakRescue, failedRescue, 'Weak and failed radio rescue texts must differ');
    assert.notEqual(clearRescue, failedRescue, 'Clear and failed radio rescue texts must differ');

    assert.match(clearRescue, /cepat/i, 'Clear radio rescue text should mention rapid identification');
    assert.match(weakRescue, /memperluas|terputus/i, 'Weak radio rescue text should mention widening search');
    assert.match(failedRescue, /penyisiran sektor/i, 'Failed radio rescue text should mention sector search');
  }

  // ============================================================================
  // 8. SARAH PUBLIC IMPACT MODULE INDEPENDENCE
  // ============================================================================
  console.log('[8/15] Testing Sarah public impact module independence and presentation...');
  {
    const responses = ['escalate', 'verify', 'maintain', null];
    for (const resp of responses) {
      const m = createBaseModel(90);
      m.flags.sarah_warning_response = resp;
      const modular = m.evaluateModularEnding();

      const sarahModule = modular.modules.find((c) => c.id === 'sarah_public_impact');
      if (resp === null) {
        assert.equal(sarahModule, undefined, 'Sarah public impact card should be omitted when response is null');
      } else {
        assert(sarahModule, `Sarah public impact card must exist for response "${resp}"`);
        assert.equal(modular.modules[1].id, 'sarah_public_impact',
          'Sarah public impact card must be positioned at index 1');
        assert(!/secara pribadi memimpin|menyelamatkan seluruh/i.test(sarahModule.body),
          'Sarah must not be portrayed as single-handedly commanding evacuations');
      }
    }
  }

  // ============================================================================
  // 9. MAYA EMOTIONAL PAYOFF INDEPENDENCE
  // ============================================================================
  console.log('[9/15] Testing Maya emotional payoff variations and zero technical score effect...');
  {
    // Variant 1: Toy packed + Promise made
    const m1 = createBaseModel(90);
    m1.flags.toy_packed = true;
    m1.flags.promised_maya = true;
    const mod1 = m1.evaluateModularEnding();
    const maya1 = mod1.modules.find((c) => c.id === 'maya');
    assert.match(maya1.body, /mobil merah/i);
    assert.match(maya1.body, /janji/i);

    // Variant 2: Toy packed, no promise
    const m2 = createBaseModel(90);
    m2.flags.toy_packed = true;
    m2.flags.promised_maya = false;
    const mod2 = m2.evaluateModularEnding();
    const maya2 = mod2.modules.find((c) => c.id === 'maya');
    assert.match(maya2.body, /mobil merah/i);

    // Variant 3: Maya comforted by Aris
    const m3 = createBaseModel(90);
    m3.flags.maya_comforted = true;
    const mod3 = m3.evaluateModularEnding();
    const maya3 = mod3.modules.find((c) => c.id === 'maya');
    assert.match(maya3.body, /tetap di sisinya|mendampinginya/i);

    // All 3 models must have identical preparedness score
    assert.equal(mod1.preparednessScore, mod2.preparednessScore);
    assert.equal(mod2.preparednessScore, mod3.preparednessScore);
  }

  // ============================================================================
  // 10. ARIS & SARAH JOINT EFFORT MODULE
  // ============================================================================
  console.log('[10/15] Testing Aris & Sarah joint effort epilogue card...');
  {
    const m = createBaseModel(90);
    const modular = m.evaluateModularEnding();
    const familyCard = modular.modules.find((c) => c.id === 'family');
    assert(familyCard, 'Family module must exist in normal/good endings');
    assert.equal(familyCard.title, 'ARIS & SARAH');
    assert.match(familyCard.body, /Sarah/i);
    assert.match(familyCard.body, /Aris/i);
    assert.match(familyCard.body, /menjaga sistem/i);
  }

  // ============================================================================
  // 11. DAY 2 TECHNICAL CALLBACKS IN BUNKER AFTERMATH
  // ============================================================================
  console.log('[11/15] Testing Day 2 technical callbacks in Bunker aftermath...');
  {
    // Path A: Day 2 spare filter used
    const mA = createBaseModel(90);
    mA.flags.day2_air_cleared = true;
    mA.flags.spare_filter_used = true;
    mA.flags.final_air_protected = false;
    const bunkerA = mA.evaluateModularEnding().modules.find((c) => c.id === 'bunker');
    assert.match(bunkerA.body, /Filter baru memulihkan udara pada Hari 2/i);

    // Path B: Day 2 manual cleaning (high power draw)
    const mB = createBaseModel(90);
    mB.flags.day2_air_cleared = true;
    mB.flags.day2_power_draw_heavy = true;
    const bunkerB = mB.evaluateModularEnding().modules.find((c) => c.id === 'bunker');
    assert.match(bunkerB.body, /Blower kembali mengalirkan udara/i);

    // Path C: Day 2 power conserved with fatigue
    const mC = createBaseModel(90);
    mC.flags.day2_power_conserved = true;
    mC.flags.day2_fatigue_applied = true;
    const bunkerC = mC.evaluateModularEnding().modules.find((c) => c.id === 'bunker');
    assert.match(bunkerC.body, /Daya bertahan lebih lama/i);

    // Mask callback
    const mMask = createBaseModel(90);
    mMask.flags.medical_mask_used = true;
    const bunkerMask = mMask.evaluateModularEnding().modules.find((c) => c.id === 'bunker');
    assert.match(bunkerMask.body, /Masker mengurangi debu/i);
  }

  // ============================================================================
  // 12. PREPAREDNESS DEBRIEF VOCABULARY (NON-PUNITIVE)
  // ============================================================================
  console.log('[12/15] Testing supportive, non-punitive language in Preparedness debrief...');
  {
    const m = createBaseModel(60);
    const report = m.calculatePreparednessReport();
    for (const item of report.debriefItems) {
      assert(!/SALAH|YOU FAILED|GAGAL TOTAL|BENAR/i.test(item.detail),
        `Debrief item ${item.id} should avoid punitive phrasing: "${item.detail}"`);
    }
  }

  // ============================================================================
  // 13. MODULAR EPILOGUE ORDERING CONTRACT
  // ============================================================================
  console.log('[13/15] Verifying modular epilogue order in NORMAL/GOOD and BAD endings...');
  {
    // NORMAL / GOOD with all modules present
    const mGood = createBaseModel(90);
    mGood.flags.sarah_warning_response = 'escalate';
    mGood.flags.helped_stranger = true;
    mGood.flags.hendra_encountered = true;
    const goodModules = mGood.evaluateModularEnding().modules.map((c) => c.id);

    assert.deepEqual(goodModules, [
      'rescue',
      'sarah_public_impact',
      'family',
      'maya',
      'hendra',
      'bunker',
      'preparedness',
    ], 'NORMAL/GOOD epilogue order must conform to specification');

    // BAD ending with all modules present
    const mBad = createBaseModel(0);
    mBad.flags.sarah_warning_response = 'escalate';
    mBad.flags.helped_stranger = true;
    mBad.flags.hendra_encountered = true;
    const badModules = mBad.evaluateModularEnding().modules.map((c) => c.id);

    assert.deepEqual(badModules, [
      'rescue',
      'sarah_public_impact',
      'family',
      'bunker',
      'preparedness',
      'hendra',
    ], 'BAD epilogue order must place Hendra after debrief to protect urgent medical care');
  }

  // ============================================================================
  // 14. SAVE / RELOAD DETERMINISM & IDEMPOTENCY
  // ============================================================================
  console.log('[14/15] Testing save serialization and reload determinism...');
  {
    const original = createBaseModel(75);
    original.flags.sarah_warning_response = 'verify';
    original.flags.helped_stranger = true;
    original.flags.hendra_encountered = true;
    original.flags.day2_air_cleared = true;
    original.flags.spare_filter_used = true;

    const firstEval = original.evaluateModularEnding();

    // Call multiple times on the same instance (idempotency check)
    for (let i = 0; i < 5; i++) {
      const repeatEval = original.evaluateModularEnding();
      assert.deepEqual(repeatEval.modules, firstEval.modules, 'Repeated evaluation must not mutate modules');
      assert.equal(repeatEval.preparednessScore, firstEval.preparednessScore);
      assert.equal(repeatEval.endingId, firstEval.endingId);
    }

    // Save / Reload round-trip
    const saveData = original.toSaveData();
    const reloaded = new GameModel();
    reloaded.init(
      saveData.sceneId,
      saveData.knowledge,
      saveData.history,
      saveData.flags,
      saveData.inventory,
      saveData.hunger,
      saveData.thirst,
      saveData.health,
      saveData.expeditionVisitedLocations,
      saveData.storyRevision,
      saveData.houseScavengeResult
    );

    const reloadedEval = reloaded.evaluateModularEnding();
    assert.equal(reloadedEval.endingId, firstEval.endingId, 'Reloaded ending ID must match');
    assert.equal(reloadedEval.preparednessScore, firstEval.preparednessScore, 'Reloaded preparedness score must match');
    assert.deepEqual(reloadedEval.modules, firstEval.modules, 'Reloaded modules must match identically');
  }

  // ============================================================================
  // 15. LEGACY REVISION PRESERVATION
  // ============================================================================
  console.log('[15/15] Verifying legacy_phase7 preservation...');
  {
    const mLegacy = new GameModel();
    mLegacy.init('day3_final_hours', 10, [], {
      radio_quality: 'clear',
      stranger_family_first: true,
      hendra_encountered: true,
    }, null, 70, 70, 80, [], STORY_REVISIONS.LEGACY_PHASE7);

    const modular = mLegacy.evaluateModularEnding();
    const legacyHendra = modular.modules.find((c) => c.id === 'hendra');
    assert(legacyHendra, 'Legacy revision MUST produce Hendra card for family_first');
    assert.match(legacyHendra.body, /Nasib Hendra tetap tidak diketahui/i,
      'Legacy revision must retain frozen legacy Hendra text');

    // Verify Sarah public impact never appears in legacy
    assert(!modular.modules.some((c) => c.id === 'sarah_public_impact'),
      'Legacy revision must never include Sarah public impact module');
  }

  console.log('\n========================================');
  console.log('ALL PHASE E VERIFICATION TESTS PASSED!');
  console.log('========================================\n');
} finally {
  await vite.close();
}
