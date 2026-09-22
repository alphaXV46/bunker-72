import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

console.log('--- RUNNING CONTENT ACCURACY VERIFICATION ---');

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
  const { RadioMiniGame } = await vite.ssrLoadModule('/src/js/radioMiniGame.js');
  const { STATIONS } = await vite.ssrLoadModule('/src/js/bunkerStations/stationsConfig.js');

  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const legacyStoryData = JSON.parse(fs.readFileSync('src/data/storyLegacyPhase7.json', 'utf8'));
  const scenes = storyData.scenes;
  const radioSource = fs.readFileSync('src/js/radioMiniGame.js', 'utf8');
  const serviceSource = fs.readFileSync('src/js/bunkerStations/serviceHatchStation.js', 'utf8');
  const engineSource = fs.readFileSync('src/js/storyEngine.js', 'utf8');

  const makeModel = (sceneId, flags = {}, history = []) => {
    const model = new GameModel();
    model.init(sceneId, 10, history, flags, { food: 2, drink: 2, kit: 1 }, 80, 80, 90);
    return model;
  };

  const makeEngine = (sceneId, flags = {}, history = []) => {
    const model = makeModel(sceneId, flags, history);
    const engine = Object.create(StoryEngine.prototype);
    Object.assign(engine, { model, storyData, legacyStoryData });
    return { engine, model };
  };

  const resolveText = (sceneId, flags = {}, history = []) => {
    const { engine } = makeEngine(sceneId, flags, history);
    const scene = scenes[sceneId];
    return engine.processNarrativeText(sceneId, scene.text, scene.speaker);
  };

  // 1. Card chronology and required Day 1 power action.
  assert.match(scenes.prolog_threshold.text, /belum masuk sampai kredensial.*diterima/i);
  assert.doesNotMatch(scenes.prolog_threshold.text, /sudah tersegel|segel utama menyala/i);
  assert.match(scenes.prolog_surface.text, /kartu.*diterima.*keluarga.*masuk.*menutup rapat.*tersegel/i);
  assert.equal(scenes.prolog_threshold.requiredInteraction.station, 'card');
  assert.equal(scenes.prolog_threshold.requiredInteraction.nextSceneId, 'prolog_surface');
  assert.equal(scenes.day1_power_boot.requiredInteraction.station, 'power');
  assert.equal(scenes.day1_power_boot.requiredInteraction.completionFlag, 'day1_power_online');
  assert.equal(scenes.day1_power_boot.choices.length, 0, 'Power must remain a required action, not a refusal choice');

  // 2. Day 1 inspection producers and all Day 2 callbacks.
  const day1HotspotFlags = new Set(['inspected_ventilation', 'inspected_power', 'found_spare_filter']);
  const day1HotspotSource = engineSource.match(/const DAY1_HOTSPOTS = Object\.freeze\(\[[\s\S]*?\n\]\);/)?.[0] ?? '';
  assert.match(day1HotspotSource, /id: 'ventilation'[\s\S]*?flag: 'inspected_ventilation'[\s\S]*?found_spare_filter/);
  assert.match(day1HotspotSource, /id: 'power'[\s\S]*?flag: 'inspected_power'/);
  for (const sceneId of ['day2_systems_check', 'day2_strategy_choice', 'day3_power_pressure']) {
    for (const condition of scenes[sceneId].conditionalText ?? []) {
      if (condition.requiredFlag === 'inspected_ventilation' || condition.requiredFlag === 'inspected_power' || condition.requiredFlag === 'found_spare_filter') {
        assert(day1HotspotFlags.has(condition.requiredFlag), `${sceneId} uses an unknown Day 1 callback flag`);
      }
    }
  }
  assert.equal(scenes.day2_systems_check.choices.length, 0, 'Service panel must open before the Air/Power choice');
  assert.deepEqual(scenes.day2_strategy_choice.choices.map((choice) => choice.id), ['c_day2_focus_air', 'c_day2_focus_power']);

  const waterRoute = makeEngine('day1_supplies');
  waterRoute.engine.view = { isTyping: false, pulseKnowledge() {}, renderProtocolLog() {} };
  waterRoute.engine.audio = { playBadChoice() {}, playClick() {} };
  waterRoute.engine.renderScene = (id) => { waterRoute.model.currentSceneId = id; };
  waterRoute.engine.handleChoiceSelect(scenes.day1_supplies.choices.find((choice) => choice.id === 'c_day1_water_waste'));
  assert.equal(waterRoute.model.inventory.drink, 1, 'Loose water use must consume one bottle');
  assert.equal(waterRoute.model.flags.water_used_freely, true);
  assert.match(resolveText('day2_family_check', waterRoute.model.flags), /satu botol sudah habis/i);
  assert.doesNotMatch(resolveText('day2_family_check', waterRoute.model.flags), /botol cadangan yang ditandai/i);
  assert.match(resolveText('day3_water_pressure', waterRoute.model.flags), /satu botol habis pada malam pertama/i);
  const oldWaterSave = makeModel('day2_family_check', {}, [{ choiceId: 'c_day1_water_waste' }]);
  assert.equal(oldWaterSave.flags.water_used_freely, true);
  assert.equal(oldWaterSave.inventory.drink, 1, 'Old saves must pay the new bottle cost once');
  const reloadedWaterSave = new GameModel();
  reloadedWaterSave.init('day2_family_check', oldWaterSave.knowledge, oldWaterSave.history,
    oldWaterSave.flags, oldWaterSave.inventory, oldWaterSave.hunger, oldWaterSave.thirst, oldWaterSave.health);
  assert.equal(reloadedWaterSave.inventory.drink, 1, 'Reload must not spend the bottle twice');

  // 3. Wet-mask branch is temporary particle protection and explicitly returns to follow-up.
  const wetMask = scenes.day1_lockdoor.choices.find((choice) => choice.id === 'c_day1_air_wetmask');
  assert(wetMask, 'Wet-mask branch must remain present for the educational correction');
  assert.equal(wetMask.nextSceneId, 'day1_air_unsafe');
  assert(wetMask.setFlags.includes('air_uninspected'));
  assert.match(wetMask.text, /sementara.*debu dan partikel/i);
  assert.match(wetMask.text, /tidak memperbaiki ventilasi|tetap harus diperiksa/i);
  assert.doesNotMatch(wetMask.text, /filter alternatif|oksigen|gas berbahaya/i);
  assert.equal(makeModel('day1_air_unsafe', null, [{ choiceId: 'c_day1_air_wetmask' }]).flags.air_uninspected, true);
  assert.doesNotMatch(scenes.day1_air_safe.text, /masker kain|masker.*filter/i);

  // 4. Day 2 symptoms, six hotspots, rotor scope, and service-access wording.
  assert.match(scenes.day2_start.text, /derit|tersendat|berkedip tidak stabil/i);
  assert.match(scenes.day2_diagnostic_sweep.text, /gejala|diperiksa satu per satu/i);
  assert.deepEqual(
    DAY2_DIAGNOSTIC_HOTSPOTS.map((spot) => spot.id),
    ['ventilation', 'power_panel', 'structure', 'supply_rack', 'radio', 'medical_counter'],
  );
  const hotspotById = Object.fromEntries(DAY2_DIAGNOSTIC_HOTSPOTS.map((spot) => [spot.id, spot]));
  assert.match(hotspotById.ventilation.text, /aliran udara melemah|suara blower berubah/i);
  assert.match(hotspotById.power_panel.text, /beban.*naik-turun|tidak stabil/i);
  assert.match(hotspotById.structure.text, /segel pintu tetap utuh|bingkai/i);
  assert.match(hotspotById.supply_rack.text, /inventaris|tidak ada barang baru/i);
  assert.match(hotspotById.radio.text, /tidak ada sesi radio sekarang|hari ketiga/i);
  assert.match(hotspotById.medical_counter.text, /tidak ada saran medis baru|tidak ada.*konsumsi/i);
  assert.match(scenes.day2_rotor_alignment.text, /stabilizer.*bergeser|menyelaraskan/i);
  assert.doesNotMatch(scenes.day2_rotor_alignment.text, /tahan gempa|tahan.*gempa|menghentikan gempa|anti-gempa/i);
  assert.equal(scenes.day2_service_hatch.requiredInteraction.actionText, 'BUKA PANEL SERVIS');
  assert.match(scenes.day2_service_hatch.text, /panel servis.*macet|mekanisme akses/i);
  assert.doesNotMatch(`${scenes.day2_service_hatch.text} ${STATIONS.service_hatch.name} ${serviceSource}`, /lockpick|lock-pick|membobol kunci|bypass kunci/i);
  assert.equal(STATIONS.service_hatch.shortName, 'PANEL SERVIS');
  assert.match(serviceSource, /PANEL SERVIS TERBUKA/);

  // 5. Air/Power route summaries and single-use resource payoff.
  const day2Summary = scenes.day2_stabilized;
  const summaryFlags = new Set((day2Summary.conditionalText ?? []).map((condition) => condition.requiredFlag));
  for (const flag of ['day2_air_cleared', 'day2_power_draw_heavy', 'day2_power_conserved']) assert(summaryFlags.has(flag));
  assert.match(resolveText('day2_stabilized', { day2_air_cleared: true }), /prioritas Air.*memperbaiki aliran udara/i);
  assert.match(resolveText('day2_stabilized', { day2_air_cleared: true, day2_power_draw_heavy: true }), /beban daya lebih berat|margin listrik lebih tipis/i);
  assert.match(resolveText('day2_stabilized', { day2_power_conserved: true }), /prioritas Power.*menstabilkan daya|mode darurat hemat/i);
  assert.doesNotMatch(day2Summary.text, /semua.*diperbaiki|kembali sempurna/i);
  const day2AirChoice = scenes.day2_air_response.choices.find((choice) => choice.id === 'c_day2_air_use_spare_filter');
  assert(day2AirChoice.requireFlags.includes('found_spare_filter'));
  assert(day2AirChoice.forbiddenFlags.includes('spare_filter_used'));
  assert(day2AirChoice.setFlags.includes('spare_filter_used'));
  assert.match(scenes.day2_power_response.text, /mode darurat hemat daya.*tetap berfungsi aman/i);
  assert.match(scenes.day2_power_response.conditionalText[0].text, /partikel|debu/i);
  assert.doesNotMatch(scenes.day2_power_response.conditionalText[0].text, /oksigen|gas/i);

  // 6. Day 3 Patch Bay and VHF-only battery semantics.
  assert.match(scenes.day3_wiring.requiredInteraction.actionText, /^KONFIGURASI PATCH BAY/);
  assert.match(scenes.day3_wiring.text, /strategi daya.*dipilih|distribusi daya bunker|Patch Bay/i);
  assert.match(scenes.day3_wiring.text, /baterai ekstra VHF.*bukan sumber daya bunker/i);
  assert.match(STATIONS.wires.code, /PATCH-04 DISTRIBUSI/i);
  assert.match(STATIONS.wires.name, /KONFIGURASI PATCH BAY/i);
  assert.match(STATIONS.wires.defaultSuccessMessage, /DISTRIBUSI DAYA/i);
  const batteryText = [
    scenes.day2_stabilized.conditionalText,
    scenes.day3_power_pressure.conditionalText,
    scenes.day3_radio_rescue.conditionalText,
  ].flat().find((condition) => condition.requiredFlag === 'extra_battery');
  assert.match(batteryText.text, /VHF|transceiver|pemancar/i);
  assert.doesNotMatch(batteryText.text, /cukup untuk menjaga dua sistem|cadangan daya bunker$/i);
  assert.match(scenes.day3_power_pressure.choices.find((choice) => choice.id === 'c_day3_power_dual').text, /baterai ekstra.*pemancar radio.*VHF/i);
  assert.match(scenes.day3_power_pressure.choices.find((choice) => choice.id === 'c_day3_power_dual').text, /cadangan daya bunker/i);
  assert.match(fs.readFileSync('src/js/scavengerMinigame.js', 'utf8'), /Baterai Ekstra VHF.*Cadangan pemancar VHF/);
  assert.match(fs.readFileSync('src/js/expeditionConfig.js', 'utf8'), /name: 'Baterai Ekstra VHF'/);

  // 7. Radio quality remains consistent through the last-hours scene.
  const radioConditions = Object.fromEntries(
    (scenes.day3_final_hours.conditionalText ?? [])
      .filter((condition) => condition.requiredFlag === 'radio_quality')
      .map((condition) => [condition.requiredValue, condition.text]),
  );
  assert.deepEqual(Object.keys(radioConditions).sort(), ['clear', 'failed', 'weak']);
  const clearText = resolveText('day3_final_hours', { radio_quality: 'clear' });
  const weakText = resolveText('day3_final_hours', { radio_quality: 'weak' });
  const failedText = resolveText('day3_final_hours', { radio_quality: 'failed' });
  assert.match(clearText, /konfirmasi lokasi.*diterima jelas|tim darat SAR/i);
  assert.doesNotMatch(clearText, /tanpa tahu apakah pesan|tidak.*dipastikan/i);
  assert.match(weakText, /diterima sebagian|sektor pencarian/i);
  assert.match(failedText, /penyisiran sektor|alamat rumah|catatan respons lokal/i);
  assert.doesNotMatch(failedText, /Hendra/i);
  assert.match(radioSource, /rentang fiksi permainan|SIARAN SIMULASI|RELAY SIMULASI SAR/i);
  assert.doesNotMatch(radioSource, /frekuensi evakuasi BNPB|kanal darurat resmi/i);
  const radio = Object.create(RadioMiniGame.prototype);
  radio.modalEl = { classList: { remove() {} }, setAttribute() {} };
  radio.dom = {};
  radio.finalResultResolved = false;
  radio.open({ finalAttempt: true, radioPowerLimited: true, powerStrained: true });
  radio.currentFreq = radio.targetFreq;
  assert.equal(radio._getSignalStrength(), 85, 'Water processing and air priority must weaken an unsupported radio call');
  assert.equal(radio._getFinalQuality(radio._getSignalStrength()), 'weak');
  radio.open({ finalAttempt: true, radioPowerLimited: true, powerStrained: true, inspectedRadio: true });
  radio.currentFreq = radio.targetFreq;
  assert.equal(radio._getFinalQuality(radio._getSignalStrength()), 'clear', 'Day 1 radio inspection must recover signal margin with precise tuning');
  radio.open({ finalAttempt: true, extraBattery: true });
  radio.currentFreq = radio.targetFreq;
  assert.equal(radio._getSignalStrength(), 100, 'Committed VHF battery must protect the signal margin');

  // 8. First-aid wording keeps the Health mutation but removes unsafe medical claims.
  assert.doesNotMatch(engineSource, /Nyeri dadaku mulai mereda|obat ini bekerja cepat|Obat-obatan ini sangat krusial/i);
  assert.match(engineSource, /pertolongan pertama.*lebih stabil|kasa dan antiseptik/i);

  // 9. Family-first Hendra state remains unknown, and ending/evaluator output is stable.
  const familyFirst = makeModel('day3_final_hours', { stranger_family_first: true, radio_quality: 'failed' });
  const familyFirstEnding = familyFirst.evaluateModularEnding();
  assert(!familyFirstEnding.modules.some((module) => module.id === 'hendra'), 'Family-first route must not reveal Hendra outcome');
  const helped = makeModel('day3_final_hours', { helped_stranger: true, radio_quality: 'failed' });
  assert(helped.evaluateModularEnding().modules.some((module) => module.id === 'hendra'), 'Helped route should retain the Hendra callback');
  const evaluatorFlags = { radio_quality: 'clear', air_seal_good: true, power_saved: true, inspected_radio: true, inspected_power: true };
  const baseline = makeModel('day3_final_hours', evaluatorFlags);
  const expanded = makeModel('day3_final_hours', {
    ...evaluatorFlags,
    day2_diagnostic_air: true,
    day2_diagnostic_power: true,
    day2_diagnostic_structure: true,
    day2_rotor_aligned: true,
    day2_service_hatch_open: true,
    day2_diagnostics_complete: true,
    day3_wiring_complete: true,
  });
  assert.deepEqual(expanded.calculatePreparednessReport(), baseline.calculatePreparednessReport(), 'Narrative/repair checkpoint flags must not alter the evaluator unexpectedly');

  // 10. The legacy story is an explicit frozen artifact.
  execFileSync('git', ['diff', '--quiet', '--', 'src/data/storyLegacyPhase7.json']);

  console.log('PASS: prologue chronology, canonical callbacks, wet-mask safety, Day 2 repair prose, Patch Bay/VHF semantics, radio outcome text, first-aid wording, Hendra privacy, evaluator invariance, and legacy-story isolation are consistent.');
} finally {
  await vite.close();
}
