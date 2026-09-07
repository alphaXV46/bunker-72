# Bunker 72 — Final Implementation Status

## Product intent and audience

Bunker 72 is a narrative preparedness game for players aged 10 and above. It follows one family through the first 72 hours of a compound emergency while distinguishing observation, official information, careful preparation, and unsafe assumptions.

The fixed character canon is:

- Aris, 28, founder of a small technology business and the family's practical decision-maker.
- Sarah, 26, a BMKG analyst whose pre-disaster work focuses on interpreting incomplete monitoring data and coordinating information responsibly.
- Maya, 7, their daughter. She speaks and reacts as a child and remains under adult care during emergency actions.

The family home and fictional Bunker 72 are in the hills outside the coastal tsunami inundation area. The bunker is a temporary shelter from ash and infrastructure disruption; the story does not present an underground room as a universal shelter for tsunami, pyroclastic flow, toxic gas, or structural collapse.

## Final playable flow

The playable story ends at hour 72:

`Sarah's pre-disaster backstory → Aris's evacuation prologue and scavenger → Day 1 inspection → Day 2 two-location expedition → Hendra encounter → Day 3 water and power pressure → final SAR radio attempt → 72-hour evaluation → Bad / Normal / Good → modular epilogue and technical debrief.`

Chapter objectives identify the shift from Sarah's prologue to Aris's 72-hour survival perspective. The backstory uses no survival elapsed time, never changes survival statistics or Preparedness, and rejoins the original prologue before scavenging.

There is no active Day 4, 96-hour continuation, secret ending, looter branch, or second-stranger plot.

## Educational and institutional boundaries

The final copy follows these safety principles:

- Strong or prolonged coastal shaking and an official tsunami warning point people toward high ground or a designated evacuation place, not automatically toward an underground bunker.
- BMKG monitoring and official updates are distinguished from local emergency instructions. BPBD carries local response and evacuation language, while PVMBG/Badan Geologi is named for volcanic monitoring and status information.
- A particulate mask can reduce inhaled ash when used correctly, but it does not provide oxygen or protection from volcanic gas. Ventilation and official shelter instructions still matter.
- Filtering or boiling can support treatment of water from a protected tank; neither action is presented as making chemically contaminated or heavily ash-contaminated water safe.
- Children follow a capable adult. Gas, electrical, structural, and generator hazards are framed as adult or trained-personnel tasks.
- The scavenger countdown is explicitly a game simulation. The story does not advise delaying evacuation to collect possessions.

The game remains educational fiction, not a substitute for current instructions from emergency authorities.

## Canonical state

- `radio_quality` is the sole active radio result: `clear`, `weak`, or `failed`.
- `sarah_warning_response` is `null`, `escalate`, `verify`, or `maintain`; office progress uses validated document IDs plus two review booleans.
- Sarah's decision can alter later context and her public-impact epilogue module, but cannot change Preparedness, survival stats, or the main ending.
- Day 1 inspections are capped at three. Expedition locations are valid, unique IDs, and each can be visited only once per run.
- Hendra has one mutually exclusive narrative outcome. It affects epilogue copy, never Preparedness or the main ending.
- Maya, the toy, promises, mask use, bunker integrity, and related flags feed independent epilogue modules where applicable.
- Hunger, thirst, and health are bounded values. Hunger and thirst decay with elapsed story time; a small health cost begins below warning thresholds and becomes larger at zero.

## Three canonical endings

The deterministic evaluator contains six technical categories totaling 100:

| Category | Maximum |
| --- | ---: |
| Air & Shelter | 20 |
| Clean Water | 15 |
| Emergency Power | 15 |
| SAR Communication | 15 |
| Technical Inspection | 15 |
| Logistics & Medical | 20 |

Good requires Preparedness of at least 60, stable vital conditions, and health of at least 55. An imperfect but noncritical run produces Normal. Health at zero produces Bad.

Bad is canonically **critical rescue**, not family death: Bunker 72's systems fail, SAR reaches the shelter, Aris, Sarah, and Maya are evacuated alive, and all three require medical care and recovery. The equipment may be abandoned and the shelter may be lost. Player-facing titles, cutscene copy, result text, and debrief wording use this meaning consistently.

Radio failure, Sarah's response, a Hendra decision, Maya's emotional flags, a missing toy, or one expedition destination never independently forces Bad. The main ending and each epilogue module are evaluated independently.

Legacy internal asset and CSS identifiers containing `fatal` are retained where renaming would create needless compatibility risk; they are not displayed to players and do not represent the current narrative meaning.

## Save compatibility

The current save schema is version 3. Current scenes, finite inventory values, survival values, flags, and expedition locations are normalized before a run is restored. Existing v2 survival saves stay at their saved scene and receive neutral Sarah state. `radio_saved` is accepted only as legacy input and migrates to `radio_quality: "weak"`; it is not written again.

Removed Day 2, Day 3, and Day 4 scene IDs remain as small ID-only migration lists in `src/js/main.js`. They redirect safely to the current Day 2 setup, Day 3 start, or final evaluation. No removed scene content is retained.

## Release verification

`npm run verify:release` is the deterministic release harness. Its current result is 59 scenes and 59 choices with:

- complete runtime graph and target validation;
- exactly three terminal endings and no story time beyond hour 72;
- all 12 combinations of three main endings and four Sarah outcomes;
- independence samples for Sarah, Hendra, Maya, and radio state;
- a fresh controller route across the backstory, prologue boundary, all three days, expedition/Hendra integration, and ending evaluation;
- legacy model and save-state compatibility checks;
- a comparison against the committed story mechanics so this final copy pass cannot silently alter hours, targets, or mechanical effects.

`scripts/verify_release_browser.mjs` performs an automated Microsoft Edge pass at 1280×720, 960×700, 390×844 portrait touch emulation, and 844×390 landscape touch emulation. It checks new/load behavior, a v2 save, Sarah's office and analysis, Escape/Tab/Enter/Space paths, 44-pixel office targets, Day 1 hotspots, the Day 2 route map, scavenger touch controls, all ending renderers, all 12 ending/Sarah combinations on desktop, debrief expansion, restart reachability, horizontal overflow, and uncaught page errors.

`npm run build` remains the production build gate. Release evidence should report deterministic, automated-browser, and human-device testing separately.

## Remaining verification boundary

The browser pass uses Edge in headless mode and emulated touch input. It is stronger than static inspection but is not a physical-phone test or a full human pacing/usability playthrough. Audio perception, long-session feel, real-device browser chrome, and every possible manual minigame solution still benefit from a final human smoke test before public distribution.
