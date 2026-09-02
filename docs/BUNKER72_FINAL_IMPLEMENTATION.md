# Bunker 72 — Final Implementation Status

## Final flow

The playable story ends at hour 72:

`Prologue scavenger → Day 1 inspection → Day 2 two-location expedition → Hendra encounter → Day 3 water/power pressure → one final SAR radio attempt → 72-hour evaluation → Bad / Normal / Good → modular epilogue and technical debrief.`

There is no active Day 4, 96-hour continuation, secret ending, looter branch, or second-stranger plot.

## Canonical state

- `radio_quality` is the sole active radio result: `clear`, `weak`, or `failed`.
- Day 1 inspections are capped at three; expedition locations are valid, unique IDs and each can be visited only once per run.
- Hendra has one mutually exclusive narrative outcome. It affects epilogue copy, never Preparedness or the main ending.
- Maya, the toy, promises, and other family flags are narrative only.
- Hunger, thirst, and health are bounded values. Hunger and thirst decay on elapsed story time; a small health cost begins only below the warning thresholds and becomes larger at zero.

## Endings and Preparedness

The deterministic evaluator contains six technical categories totaling 100:

| Category | Maximum |
| --- | ---: |
| Air & Shelter | 20 |
| Clean Water | 15 |
| Emergency Power | 15 |
| SAR Communication | 15 |
| Technical Inspection | 15 |
| Logistics & Medical | 20 |

Good requires Preparedness of at least 60 plus stable vital conditions and health of at least 55. A nonfatal imperfect run produces Normal; a fatal health state produces Bad. Radio failure, a Hendra decision, missing the toy, or one destination choice never independently forces Bad.

## Save compatibility

The current save schema is version 2. Current scenes, finite inventory values, survival values, flags, and expedition locations are normalized before restoring a run. `radio_saved` is accepted only as a legacy input and is migrated to `radio_quality: "weak"`; it is not written again.

Removed Day 2, Day 3, and Day 4 scene IDs remain as small ID-only migration lists in `src/js/main.js`. They redirect safely to the current Day 2 setup, Day 3 start, or final evaluation. No removed scene content is retained.

## Validation status

- Active story data: 43 scenes, 55 choices, no missing targets, terminal hour 72.
- Static graph and state harnesses cover scene reachability, all three expedition pairs, Hendra exclusivity, radio result scoring, moral-score invariance, endings, and normalization.
- `npm run build` is the release build gate.

## Known limitation

The final pass has no browser automation/manual browser session available in this environment. Canvas/touch controls and visual overflow therefore received lifecycle/static inspection, not an end-to-end interactive browser playthrough.
