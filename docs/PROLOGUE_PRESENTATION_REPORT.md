# sealed72 prologue narrative presentation

Implemented 2026-09-20. UI/presentation only; existing unrelated workspace edits were preserved.

## Files changed by this task

- `src/styles/main.css`: scoped transparent surfaces, readable text/speaker, safe responsive widths, scroll regions, touch targets, portrait stage height, and unobtrusive continue hint.
- `src/js/runtime/prologuePresentation.js`: new observer-driven presentation constraints and canonical-coordinate helpers.
- `src/js/gameView.js`: owns the presentation controller and activates it per scene/revision.
- `src/js/storyEngine.js`: passes the already-existing story revision to the view. No branching or gameplay behavior changed.
- `src/js/main.js`: passes the existing dialogue speaker label DOM reference into GameView.
- `src/js/runtime/uiLayoutRuntime.js`: saved geometry is the fallback behind temporary CSS variables.
- `src/js/screenLayoutEditor.js`: uses the same fallback contract; initial coordinate capture temporarily removes runtime variables.
- `scripts/verify_prologue_presentation.browser.js`: browser regression assertions using real rendered geometry and in-memory editor persistence.
- This report.

## Scope and appearance

Activation requires revision `sealed72` and either `phase === 'backstory'` or a `prolog_` scene ID. `prolog_packing` and title-card backgrounds are excluded. Bunker gameplay, legacy revision, ending screens, scavenger canvas/HUD, radio/minigame UI, and developer console receive no new presentation class.

The narrative container, its wrapper and hover state have transparent backgrounds, no border, no box shadow, and no backdrop blur. The old pseudo-element caption is hidden. Text uses near-white Share Tech Mono at 16–20px, a controlled 70ch maximum, and restrained multidirectional dark letter shadows. The speaker appears above the text with its own spacing and shadow. Portrait avatars are hidden in this text-only cinematic treatment. Choices retain their existing interactive backgrounds and receive at least 44px touch height and explicit keyboard focus outlines.

## Layout contract

ResizeObserver watches the stage, dialogue, command deck and choice contents. MutationObserver catches scene/classes, editor styles, typewriter changes and choice replacement. Font readiness and viewport changes also trigger measurement. Work is coalesced into animation frames; observer writes are disconnected during measurement to avoid feedback from the controller's own writes.

Runtime measures actual rendered choice height after width wrapping, with no fixed choice-count or pixel-height assumption. Oversized decks scroll within 48% of available stage height, preserving space for narration. Narration ends above the deck with a 16px gap, reduced to 8px on stages shorter than 450px. `--choices-reserved-height` records the resulting reservation. Empty choice lists reserve zero space. Scene deactivation removes temporary variables.

Narration scrolls internally when content exceeds the remaining safe height. It is keyboard-focusable; the final line remains reachable by scrolling. No page-level scrolling is introduced. Portrait prologue scenes fill the existing game container height, avoiding the previous mostly-empty portrait screen. Short landscape scenes keep compact spacing and independently scrollable narrative/choices.

Corrections apply atomically before paint, without a positional transition through the choice region. This implementation prioritizes the no-overlap requirement; an animated upward movement was not added.

## F6 editor compatibility

Editor-authored position, dimensions and rotation remain in canonical normalized layout data. Runtime CSS custom properties override only the live presentation and are never serialized. Canonical initial capture removes those properties synchronously, reads the unmodified base geometry, and restores them. Runtime constraints use that base every time, so offsets cannot accumulate across scenes or editor sessions. Saved rotation is retained and included in the available-space calculation. A requested base position that would collide is constrained during gameplay; the editor still stores the requested base.

## Verification performed

- Production build: `npm run build -- --outDir tmp/prologue-build` passed. Tracked `dist` output was not rewritten.
- `npm run verify:release` passed against the current workspace: 73 scenes, 77 choices; runtime graph, 12 endings, independence, fresh controller flow and legacy model. These are the harness's current reported counts, not new content introduced by this task.
- Actual Chromium browser geometry assertions passed at 1280×720, 960×700, 390×844 and 844×390.
- Each viewport covered zero, one, two and four choices; wrapped choice labels; long narrative; stage boundaries; no horizontal page overflow; transparent narrative surface; reachable final narrative line and final choice; and removal of stale reservation when choices disappear.
- Three editor save/disable/enable cycles per viewport passed with byte-identical in-memory persisted layout and canonical coordinates unaffected by runtime avoidance.
- Actual F6 keyboard activation, mouse drag, close and reopen were exercised. The moved narrative retained its canonical coordinates and an approximately 8px safe gap in landscape. No editor file was saved during this manual browser check.
- Visual screenshots inspected for desktop, portrait and landscape, including actual `prolog_with_ibu` dialogue with two choices. Speaker rendering and keyboard typewriter skipping were checked in the running app.
- Scene transition spot checks covered prolog home, expedition call/map, threshold, title and Day 1. Title and Day 1 removed the presentation class and variables.
- Browser error collection was empty during verification.

The automated viewport checks are Chromium emulation, not physical mobile-device QA. The stress cases inject temporary DOM content in the test tab; they do not modify story data. The real editor persistence endpoint was deliberately not written by tests; persistence assertions use the actual editor save method with an in-memory adapter.

No story text, IDs, branching, save data, gameplay rules, ending logic, or `storyLegacyPhase7.json` was edited by this task.

To rerun geometry assertions, open a settled sealed72 narrative scene in the dev browser and pipe the regression file to `agent-browser eval --stdin`, repeating at the four viewport sizes above.
