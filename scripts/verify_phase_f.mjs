// scripts/verify_phase_f.mjs
// Verification suite for Phase F: Final Release QA, Human-Readability Audit, and Targeted Release Fixes.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- RUNNING PHASE F RELEASE VERIFICATION SUITE ---');

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
    NEW_GAME_START_SCENE_ID,
  } = await vite.ssrLoadModule('/src/js/constants.js');

  const storySealed = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'src/data/story.json'), 'utf8'));
  const storyLegacy = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'src/data/storyLegacyPhase7.json'), 'utf8'));

  // ============================================================================
  // 1. SAVE SCHEMA AND STORY REVISION BASELINE
  // ============================================================================
  console.log('[1/12] Verifying save schema version and story revision baseline...');
  assert.equal(SAVE_SCHEMA_VERSION, 4, 'SAVE_SCHEMA_VERSION must remain 4');
  assert.equal(CURRENT_STORY_REVISION, 'sealed72', 'CURRENT_STORY_REVISION must be sealed72');
  assert.equal(STORY_REVISIONS.SEALED72, 'sealed72');
  assert.equal(STORY_REVISIONS.LEGACY_PHASE7, 'legacy_phase7');

  // Exactly three endings exist in both revisions
  const EXPECTED_ENDINGS = ['ending_bad', 'ending_normal', 'ending_good'];
  assert.deepEqual([...ENDING_IDS].sort(), [...EXPECTED_ENDINGS].sort(), 'ENDING_IDS must contain exactly the 3 main endings');
  for (const endingId of EXPECTED_ENDINGS) {
    assert(storySealed.scenes[endingId], `Sealed story must contain scene ${endingId}`);
    assert(storyLegacy.scenes[endingId], `Legacy story must contain scene ${endingId}`);
  }

  // ============================================================================
  // 2. PLAYTHROUGH ARCHETYPE A: NATURAL PLAYTHROUGH
  // ============================================================================
  console.log('[2/12] Testing Archetype A: Natural Playthrough (Mixed reasonable decisions)...');
  {
    const m = new GameModel();
    m.init('day3_final_hours', 10, [], {
      radio_quality: 'weak',
      air_seal_good: true,
      water_filtered: true,
      power_saved: false,
      inspected_ventilation: true,
      inspected_radio: true,
      inspected_power: false,
      extra_battery: true,
      battery_committed: true,
      helped_stranger: true,
      sarah_warning_response: 'verify',
      promised_maya: true,
      has_car_toy: true,
      toy_packed: true,
      day2_air_cleared: true,
      day2_fatigue_applied: false,
    }, { food: 2, drink: 2, kit: 1 }, 70, 70, 75);

    const result = m.getEndingResult();
    assert(result.endingId === 'ending_good' || result.endingId === 'ending_normal', 'Natural run should achieve Normal or Good');
    assert(result.preparedness.score >= 45, 'Natural run should reach reasonable preparedness');

    const epilogue = m.evaluateModularEnding();
    assert.equal(epilogue.endingId, result.endingId);
    assert(epilogue.modules.some(mod => mod.id === 'rescue'));
    assert(epilogue.modules.some(mod => mod.id === 'family'));
    assert(epilogue.modules.some(mod => mod.id === 'maya'));
    assert(epilogue.modules.some(mod => mod.id === 'hendra'));
    assert(epilogue.modules.some(mod => mod.id === 'bunker'));
    assert(epilogue.modules.some(mod => mod.id === 'preparedness'));
  }

  // ============================================================================
  // 3. PLAYTHROUGH ARCHETYPE B: STRONG TECHNICAL PLAYTHROUGH
  // ============================================================================
  console.log('[3/12] Testing Archetype B: Strong Technical Playthrough (GOOD ending)...');
  {
    const m = new GameModel();
    m.init('day3_final_hours', 10, [], {
      radio_quality: 'clear',
      air_seal_good: true,
      final_air_protected: true,
      water_filtered: true,
      water_purified: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_radio: true,
      inspected_power: true,
      extra_battery: true,
      battery_committed: true,
      day2_air_cleared: true,
      sarah_warning_response: 'escalate',
    }, { food: 3, drink: 3, kit: 2 }, 80, 80, 90);

    const result = m.getEndingResult();
    assert.equal(result.endingId, 'ending_good', 'Strong technical play must achieve GOOD ending');
    assert(result.preparedness.score >= ENDING_RULES.GOOD_PREPAREDNESS_MIN, 'Preparedness must meet Good threshold (>=60)');
    assert(m.health >= ENDING_RULES.GOOD_HEALTH_MIN, 'Health must meet Good threshold (>=55)');
  }

  // ============================================================================
  // 4. PLAYTHROUGH ARCHETYPE C: POOR TECHNICAL PLAYTHROUGH
  // ============================================================================
  console.log('[4/12] Testing Archetype C: Poor Technical Playthrough (BAD / NORMAL naturally)...');
  {
    // C1: Exhausted / zero health run -> BAD
    const mBad = new GameModel();
    mBad.init('day3_final_hours', 10, [], {
      radio_quality: 'failed',
      air_seal_good: false,
      water_filtered: false,
      power_saved: false,
      inspected_ventilation: false,
      inspected_radio: false,
      inspected_power: false,
    }, { food: 0, drink: 0, kit: 0 }, 10, 10, 0);

    const resultBad = mBad.getEndingResult();
    assert.equal(resultBad.endingId, 'ending_bad', 'Exhausted health must yield BAD ending');
    const epilogueBad = mBad.evaluateModularEnding();
    assert.equal(epilogueBad.endingId, 'ending_bad');
    assert.match(epilogueBad.modules[0].body, /Ketiganya selamat/i, 'BAD ending must confirm family survival');
    assert.match(epilogueBad.modules[0].body, /penanganan medis/i, 'BAD ending must emphasize medical care');

    // C2: Weak preparedness with moderate health -> NORMAL
    const mNormal = new GameModel();
    mNormal.init('day3_final_hours', 10, [], {
      radio_quality: 'failed',
      air_seal_good: false,
      water_filtered: true,
      power_saved: false,
      inspected_ventilation: false,
      inspected_radio: false,
      inspected_power: false,
    }, { food: 1, drink: 1, kit: 0 }, 40, 40, 50);

    const resultNormal = mNormal.getEndingResult();
    assert.equal(resultNormal.endingId, 'ending_normal', 'Sub-60 preparedness must yield NORMAL ending');
  }

  // ============================================================================
  // 5. PLAYTHROUGH ARCHETYPE D: HELP HENDRA + GOOD TECHNICAL PLAY
  // ============================================================================
  console.log('[5/12] Testing Archetype D: Help Hendra + Strong Technical Play (GOOD reachable)...');
  {
    const m = new GameModel();
    // Same inventory as Family First: helping costs Opportunity #2, not a kit.
    m.init('day3_final_hours', 10, [], {
      radio_quality: 'clear',
      air_seal_good: true,
      final_air_protected: true,
      water_filtered: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_radio: true,
      inspected_power: true,
      extra_battery: true,
      battery_committed: true,
      day2_air_cleared: true,
      helped_stranger: true,
    }, { food: 3, drink: 3, kit: 2 }, 75, 75, 85);

    const result = m.getEndingResult();
    assert.equal(result.endingId, 'ending_good', 'Helping Hendra must not prevent GOOD ending with strong technical play');
    assert(result.preparedness.score >= 60, 'Preparedness score must reach >= 60');

    const epilogue = m.evaluateModularEnding();
    const hendraCard = epilogue.modules.find(mod => mod.id === 'hendra');
    assert(hendraCard, 'Hendra epilogue card must appear when helped_stranger is true');
    assert.match(hendraCard.body, /terima kasih/i, 'Hendra card should contain sincere gratitude');
    assert(!hendraCard.body.toLowerCase().includes('tim sar'), 'Hendra must not be portrayed as SAR member');
  }

  // ============================================================================
  // 6. PLAYTHROUGH ARCHETYPE E: FAMILY FIRST + GOOD TECHNICAL PLAY
  // ============================================================================
  console.log('[6/12] Testing Archetype E: Family First + Strong Technical Play (No moral penalty)...');
  {
    const m = new GameModel();
    // Same inventory as Help Hendra; Opportunity #2 remains available at the choice.
    m.init('day3_final_hours', 10, [], {
      radio_quality: 'clear',
      air_seal_good: true,
      final_air_protected: true,
      water_filtered: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_radio: true,
      inspected_power: true,
      extra_battery: true,
      battery_committed: true,
      day2_air_cleared: true,
      stranger_family_first: true,
    }, { food: 3, drink: 3, kit: 2 }, 75, 75, 85);

    const result = m.getEndingResult();
    assert.equal(result.endingId, 'ending_good', 'Family-first route must achieve GOOD ending with strong play');

    const epilogue = m.evaluateModularEnding();
    const hendraCard = epilogue.modules.find(mod => mod.id === 'hendra');
    assert.equal(hendraCard, undefined, 'Hendra epilogue card must NOT appear in sealed72 for stranger_family_first');
  }

  // ============================================================================
  // 7. PLAYTHROUGH ARCHETYPE F: FAILED RADIO + STRONG TECHNICAL PLAY
  // ============================================================================
  console.log('[7/12] Testing Archetype F: Failed Radio + Strong Technical Play (GOOD reachable)...');
  {
    const m = new GameModel();
    m.init('day3_final_hours', 10, [], {
      radio_quality: 'failed',
      air_seal_good: true,
      final_air_protected: true,
      water_filtered: true,
      water_purified: true,
      power_saved: true,
      inspected_ventilation: true,
      inspected_radio: true,
      inspected_power: true,
      extra_battery: true,
      battery_committed: false,
      day2_air_cleared: true,
    }, { food: 3, drink: 3, kit: 2 }, 80, 80, 85);

    const result = m.getEndingResult();
    assert.equal(result.endingId, 'ending_good', 'Failed radio must NOT prevent GOOD ending when all other technical systems succeed');
    assert(result.preparedness.score >= 60, `Preparedness score (${result.preparedness.score}) must reach >= 60`);

    const epilogue = m.evaluateModularEnding();
    const rescueCard = epilogue.modules.find(mod => mod.id === 'rescue');
    assert(rescueCard, 'Rescue card must exist');
    assert.match(rescueCard.body, /penyisiran sektor/i, 'Failed radio rescue must be attributed to sector sweep and residential records');
    assert(!rescueCard.body.includes('pencatatan shelter'), 'Failed radio rescue must NOT claim an official shelter registry');
  }

  // ============================================================================
  // 8. RESCUE LOGIC GROUNDING AUDIT (NO UNSUPPORTED SHELTER REGISTRY)
  // ============================================================================
  console.log('[8/12] Auditing rescue explanation for grounded facts...');
  {
    for (const radio of ['clear', 'weak', 'failed']) {
      const m = new GameModel();
      m.init('day3_final_hours', 10, [], { radio_quality: radio }, { food: 2, drink: 2, kit: 1 }, 70, 70, 70);
      const epilogue = m.evaluateModularEnding();
      const rescueCard = epilogue.modules.find(mod => mod.id === 'rescue');
      assert(rescueCard, `Rescue card must exist for radio ${radio}`);
      assert(!rescueCard.body.includes('pencatatan shelter'), `Radio ${radio} rescue card must not cite "pencatatan shelter"`);
      assert(!rescueCard.body.includes('shelter terdaftar'), `Radio ${radio} rescue card must not cite "shelter terdaftar"`);
    }
  }

  // ============================================================================
  // 9. POWER & BATTERY TERMINOLOGY AUDIT
  // ============================================================================
  console.log('[9/12] Auditing power / battery terminology distinction...');
  {
    const m = new GameModel();
    m.init('day3_final_hours', 10, [], {
      battery_committed: true,
      day2_air_cleared: true,
      day2_power_draw_heavy: true,
      day2_power_conserved: true,
      day2_fatigue_applied: true,
    }, { food: 2, drink: 2, kit: 1 }, 70, 70, 70);

    const epilogue = m.evaluateModularEnding();
    const bunkerCard = epilogue.modules.find(mod => mod.id === 'bunker');
    assert(bunkerCard, 'Bunker aftermath card must exist');

    // extra_battery is dedicated to radio transmitter
    assert.match(bunkerCard.body, /pemancar radio VHF/i, 'Extra battery must explicitly refer to radio VHF transmitter');
    assert.match(bunkerCard.body, /tanpa membebani daya darurat bunker/i, 'Must clarify radio did not draw on bunker power');

    // Shelter power reserves use appropriate terminology
    assert.match(bunkerCard.body, /daya darurat bunker|cadangan daya/i, 'Must use grounded shelter power reserve phrasing');

    // Verify choice text in Day 3 power scene
    const day3DualChoice = storySealed.scenes.day3_power_pressure.choices.find(c => c.id === 'c_day3_power_dual');
    assert(day3DualChoice, 'c_day3_power_dual choice must exist');
    assert.match(day3DualChoice.text, /baterai ekstra untuk pemancar radio/i, 'Choice text must specify extra battery is for radio transmitter');
    assert.match(day3DualChoice.text, /daya darurat bunker/i, 'Choice text must distinguish bunker emergency power');
  }

  // ============================================================================
  // 10. SPARE FILTER SINGLE-USE IDEMPOTENCY
  // ============================================================================
  console.log('[10/12] Testing spare filter single-use invariant across Day 2 and Day 3...');
  {
    const day2AirChoice = storySealed.scenes.day2_air_response.choices.find(c => c.id === 'c_day2_air_use_spare_filter');
    assert(day2AirChoice, 'c_day2_air_use_spare_filter choice must exist on Day 2');
    assert(day2AirChoice.setFlags.includes('spare_filter_used'), 'Day 2 filter choice must set spare_filter_used');

    const day3KeepAirChoice = storySealed.scenes.day3_final_dilemma.choices.find(c => c.id === 'c_day3_final_keep_air');
    assert(day3KeepAirChoice, 'c_day3_final_keep_air choice must exist on Day 3');
    assert(day3KeepAirChoice.forbiddenFlags.includes('spare_filter_used'), 'Day 3 air filter choice must forbid spare_filter_used');

    // When used on Day 2, model flags prevent Day 3 filter choice
    const m = new GameModel();
    m.flags.spare_filter_used = true;
    const canChooseOnDay3 = !day3KeepAirChoice.forbiddenFlags.some(f => m.flags[f]);
    assert.equal(canChooseOnDay3, false, 'Spare filter cannot be chosen on Day 3 if already used on Day 2');
  }

  // ============================================================================
  // 11. SAVE / RELOAD DETERMINISM ACROSS KEY CHECKPOINTS
  // ============================================================================
  console.log('[11/12] Verifying save/reload round-trip determinism across key checkpoints...');
  {
    const checkpoints = [
      { scene: 'scavenger_pack_briefing', phase: 'Prologue' },
      { scene: 'prolog_minimarket', phase: 'Prologue' },
      { scene: 'prolog_hendra_encounter', phase: 'Prologue' },
      { scene: 'prolog_aftershock', phase: 'Prologue' },
      { scene: 'prolog_route_failure', phase: 'Prologue' },
      { scene: 'prolog_bunker_entry', phase: 'Prologue' },
      { scene: 'day1_systems', phase: 'Day 1' },
      { scene: 'day2_systems_check', phase: 'Day 2' },
      { scene: 'day2_stabilized', phase: 'Day 2' },
      { scene: 'day3_radio_rescue', phase: 'Day 3' },
      { scene: 'ending_eval', phase: 'Ending' },
    ];

    for (const cp of checkpoints) {
      const original = new GameModel();
      original.init(cp.scene, 12, ['prolog_minimarket'], {
        air_seal_good: true,
        water_filtered: true,
        helped_stranger: true,
        extra_battery: true,
      }, { food: 2, drink: 2, kit: 1, extra_battery: 1 }, 72, 68, 80);

      const saveData = original.toSaveData();
      const restored = new GameModel();
      restored.init(
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

      assert.equal(restored.currentSceneId, original.currentSceneId, `Checkpoint ${cp.scene} scene mismatch`);
      assert.equal(restored.storyRevision, 'sealed72', `Checkpoint ${cp.scene} story revision mismatch`);
      assert.equal(restored.health, original.health, `Checkpoint ${cp.scene} health mismatch`);
      assert.equal(restored.hunger, original.hunger, `Checkpoint ${cp.scene} hunger mismatch`);
      assert.equal(restored.thirst, original.thirst, `Checkpoint ${cp.scene} thirst mismatch`);
      assert.deepEqual(restored.inventory, original.inventory, `Checkpoint ${cp.scene} inventory mismatch`);
      assert.deepEqual(restored.flags, original.flags, `Checkpoint ${cp.scene} flags mismatch`);

      // Both must evaluate to identical ending results
      const origEnding = original.evaluateModularEnding();
      const restEnding = restored.evaluateModularEnding();
      assert.equal(restEnding.endingId, origEnding.endingId, `Checkpoint ${cp.scene} endingId mismatch`);
      assert.equal(restEnding.preparedness.score, origEnding.preparedness.score, `Checkpoint ${cp.scene} score mismatch`);
      assert.equal(restEnding.modules.length, origEnding.modules.length, `Checkpoint ${cp.scene} modules length mismatch`);
    }
  }

  // ============================================================================
  // 12. PROHIBITED WORDS AUDIT (ZERO LEAKS IN PLAYER-FACING TEXT)
  // ============================================================================
  console.log('[12/12] Auditing player-facing story copy for prohibited development terms...');
  {
    const prohibitedRegex = /\b(TODO|PLACEHOLDER|TEMP|DEBUG|Lorem|Phase [A-F]|legacy)\b/i;
    for (const [sceneId, scene] of Object.entries(storySealed.scenes)) {
      if (scene.text && prohibitedRegex.test(scene.text)) {
        assert.fail(`Scene ${sceneId} contains prohibited development term: ${scene.text.match(prohibitedRegex)[0]}`);
      }
      if (scene.choices) {
        for (const choice of scene.choices) {
          if (choice.text && prohibitedRegex.test(choice.text)) {
            assert.fail(`Choice in scene ${sceneId} contains prohibited term: ${choice.text.match(prohibitedRegex)[0]}`);
          }
          if (choice.log && prohibitedRegex.test(choice.log)) {
            assert.fail(`Choice log in scene ${sceneId} contains prohibited term: ${choice.log.match(prohibitedRegex)[0]}`);
          }
        }
      }
    }
  }

  console.log('--- ALL PHASE F RELEASE VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
} finally {
  await vite.close();
}
