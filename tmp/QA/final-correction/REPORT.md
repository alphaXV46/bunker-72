# Bunker 72 — final visual correction pass

Completed 2026-09-21. Scope: four canonical background replacements, nine background assignments, and narrowly scoped narrative/ending safe-area corrections. No new story scenes or broad visual phase.

## 1. Canonical avatars inspected

All nine actual source images were opened: `ayah/{ayah_senyum,ayah_serius,ayah_cemas}.png`, `ibu/{ibu_senyum,ibu_serius,ibu_cemas}.png`, and `anak/{anak_senyum,anak_serius,anak_cemas}.png` under `src/assets/avatars/`.

Identity references are authoritative over cinematic depictions. Aris's anxious avatar has an eye-color inconsistency against the serious/smiling portraits; the serious portrait anchored the replacement. No avatar was edited by this pass.

## 2. Cinematic references inspected

Under `src/assets/backgrounds/`: Stage 2 `bg_prolog_minimarket.webp`, `bg_prolog_medical.webp`, `bg_prolog_hendra.webp`, `bg_prolog_route_failure.webp`; all four GOOD assets (`bg_good_end.webp`, `_1.webp`, `_2.webp`, `_3.jpg`); all three BAD assets (`bg_bad_end.webp`, `_2.webp`, `_3.webp`); Sarah's office, interactive-office and alert-office backgrounds; `backstory_family_preparedness.webp`; the previous NORMAL and prolog2/3/4; and existing home/prolog1/window assets.

GOOD/BAD and Sarah artwork supplied rendering/lighting context, not authority to change family identity. Existing pixel backgrounds supplied scene content only. Already-good assets were retained.

## 3. Direct image inputs for generation

| Output | Actual reference inputs |
| --- | --- |
| NORMAL | Previous NORMAL composition; ayah_serius, ibu_serius, anak_serius; bg_good_end_1 |
| prolog2 | Stage 2 minimarket, medical; previous prolog2 as content-only reference |
| prolog3 | Stage 2 minimarket, Hendra; approved new prolog2; previous prolog3 as content-only reference |
| prolog4 | Approved new prolog3; Stage 2 route_failure and Hendra |

The generator supports direct images and they were supplied. Each resulting image was visually inspected, not accepted solely because generation succeeded. Side-by-side QA material: `normal-identity-board.jpg` and `prolog-style-board.jpg`, here in tmp/QA, never runtime assets.

## 4. NORMAL correction result

Replaced the incorrect family while retaining the bunker entrance, SAR personnel/context, rescue vehicle, overall composition, lighting and exhausted-but-safe aftermath. All three family members survive together. The mood remains less critical than BAD and less settled than GOOD. Same canonical filename: `bg_normal_end.webp`.

## 5. Aris comparison

Golden tousled hair, young-adult appearance, clean-shaven face, recognizable jaw/eyebrow structure and navy overshirt/cream shirt. No dark-haired replacement, beard or pronounced aging. Side-by-side review judged him consistent with the actual portrait identity; cinematic rendering is not a pixel-identical face transplant.

## 6. Sarah comparison

Blonde bob, visible green-toned eyes, recognizable feminine face, floral clothing and emerald jewelry retained. No dark hair, ponytail or unrelated older design. Expression is tired but composed.

## 7. Maya comparison

Small child proportions and approximately seven-year-old appearance retained, with blonde hair, recognizable child face, braid/ribbon detail and navy/white clothing. Not aged into a teenager. Remains visually related to the parents.

## 8. prolog2 result

Illustrated Indonesian hillside neighborhood at warm dusk: distant volcanic plume, thin ash and local concern, with intact buildings and navigable road. No lava river, city-wide collapse or premature total devastation. Small background residents are anonymous; no new canonical family faces were invented.

## 9. prolog3 result

Same geographic/material language, increasing ash and urgency, a usable local approach and open heavy rectangular bunker door. This is the later bunker approach/threshold, not another early-warning image. No connector-collapse composition was duplicated.

## 10. prolog4 result and chronology

The actual sealed72 usage is the exterior after the family seals the bunker. The new image therefore shows the same entrance closed, neighborhood lights extinguished and thick ash obscuring the distance, with a small sensor light still visible. It is not a pre-supply-run catastrophe.

Source chronology wins over the brief's ambiguous reference to a "later" route failure: home → alert → packing/supply routes → Hendra/aftershock → route failure → return home/evacuation → bunker approach/threshold → sealed-bunker exterior → title. The route failure precedes prolog4 in the active story. Narrative and transitions were not changed.

## 11. Assignment corrections

| Scenes | Before | After |
| --- | --- | --- |
| prolog_home, prolog_with_ibu, prolog_with_anak, prolog_radio_peaceful | prolog_peaceful | prolog1 |
| prolog_return_home, prolog_evac_decision | packing | prolog_window |
| prolog_expedition_call, prolog_expedition_map | packing | prolog2 |
| prolog_intro | prolog2 | prolog3 |

Early home uses the existing illustrated peaceful family interior. Return/evacuation uses the tense window interior rather than relaxed packing/cooking art. Expedition call/map uses an exterior establishing image with Sarah's off-screen dialogue, avoiding a contradictory image of Aris still standing at home. Packing/scavenger remains unchanged. Road/threshold already use prolog3; surface already uses prolog4.

## 12. Responsive and browser observations

Actual in-app browser spot-checks at 1280×720, 960×700, 390×844 and 844×390 covered NORMAL and the three integrated prologue replacements. Existing home was also checked in these sizes, with final narrow/medium corrections rechecked. This is viewport emulation, not physical-device certification or a complete 72-hour playthrough.

- NORMAL: all three faces remain visible. Desktop/landscape report occupies the left column. Portrait reserves space for the family above the report. Report/debrief scroll and menu access were checked. The duplicate stats element marked hidden is now actually hidden for this ending.
- prolog2: portrait focus retains the volcano/road at 58%; the warning banner now wraps within a 350px box at a 390px viewport rather than overflowing off-screen.
- prolog3/prolog4: 92% portrait focus retains the open/closed bunker door. Wider views retain the road and environmental context.
- Home: wide layouts use a narrower left reading column and reserve the upper face area. Portrait shows the complete existing family image as a top strip. Long text and choices intentionally scroll on small viewports rather than covering faces or shrinking text excessively.
- The 960×700 and 844×390 layouts retain the game's existing centered/letterboxed stage behavior; the actual story stage is not necessarily the entire viewport.
- Final browser console query returned no captured errors or warnings in the inspected session.

The JPG crop files here are offline composition checks, not browser screenshots. Actual UI screenshots were inspected in the task's browser tool output. Chronological art continuity and GOOD/NORMAL/BAD family continuity were also checked against source images/contact sheets; no claim is made that every branch was played manually.

## 13. Files changed by this pass

Runtime/source changes:

- `src/assets/backgrounds/bg_normal_end.webp`
- `src/assets/backgrounds/bg_prolog2.webp`
- `src/assets/backgrounds/bg_prolog3.webp`
- `src/assets/backgrounds/bg_prolog4.webp`
- `src/data/story.json`: only the nine background assignments above, relative to the pre-pass snapshot.
- `src/styles/main.css`: scoped crop, home safe area, portrait warning banner and NORMAL report layout.
- `src/js/runtime/prologuePresentation.js`: optional CSS-driven artwork reservation; presentation only, not saved editor geometry or game state.

All four final assets are RGB WebP, 1672×941, quality 92; same canonical filenames. Sizes: NORMAL 301292 bytes; prolog2 457370; prolog3 420292; prolog4 389064.

QA scripts, before-snapshots, review images, contact sheets, logs and this report reside only under `tmp/QA/final-correction/`. Original art can be recovered from the `.before.webp` backups here. Pre-existing dirty changes in assetLoader/gameView/asset verification, other assets and dist were preserved and are not claimed as work from this pass. The exact pre-existing dirty `dist/index.html` was restored after builds, not reset to HEAD.

## 14. Asset verification

`node scripts/verify_assets.mjs`: PASS, exit 0. Canonical runtime names retained; no redundant v2/final-final aliases. The new files appear in Vite's build output.

## 15. Regression and scope verification

`node scripts/verify_phase_a.mjs` through `verify_phase_f.mjs`: all PASS. `node scripts/verify_release.mjs`: PASS. Its current aggregate report is 73 scenes / 77 choices / 12 ending nodes across the harness graph; this does not assert that sealed72 has twelve user-facing ending categories.

Automated comparison against `story.before.json`, ignoring only background fields, is identical: no story text, choice, branching or logic changes in this pass. No save schema or ending thresholds changed. `storyLegacyPhase7.json` remains untouched, SHA-256 `DF8CC2171361A7A147C35FA986D24773DDE59D574086A18206F50A83A7A49C6B`.

Machine-readable results: `verification.json`; individual command output is in adjacent logs. Deterministic regression evidence is separate from the limited browser spot-checks above.

## 16. Build result

`npm run build`: PASS, Vite 5.4.21, 86 modules transformed. `git diff --check`: PASS; Git emits only line-ending conversion notices for existing LF/CRLF policy. Build verification is not a deployment. Preserved dist snapshot SHA-256: `6BAD40B71CD99D02F604B105B7B2E5D04EED63081BD700EEBD20D98757908DF0`.

## 17. Optional polish and stopping point

`bg_backstory_house.webp` was deliberately left unchanged. No new home artwork, no regeneration of good Stage 2/GOOD/BAD/Sarah assets, no broader phase begun. Physical touch-device, performance, audio and full-branch playthrough QA were outside this targeted browser spot-check and are not claimed.

The asset-pipeline/imagegen skills guided reference-first generation and canonical file integration; the UI skill guided the scoped safe-area corrections. User-requested cinematic direction took precedence over generic pixel-art guidance.
