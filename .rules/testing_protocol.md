# QA & Verification Testing Protocol

This document details the quality assurance procedures required to verify the deterministic state engine of Bunker 72. All code integrations must undergo these verification scripts before release.

---

## 1. Deterministic State Verification Procedures

Because Bunker 72 uses a numeric simulation model, state transitions can be audited deterministically. Follow these verification steps manually or via console debugging when testing state changes.

### 1.1 Simulating via DevTools Console
To test logic branches instantly, instantiate a clean state or inject variables directly using the browser console:
```javascript
// Example: Accessing the running StoryEngine model via console
const engine = window.storyEngine;
engine.model.hunger = 10;
engine.model.thirst = 5;
engine.updateUI(); // Force render to inspect HUD warning styles
```

---

## 2. Specific Edge-Case Scenarios

### Edge Case Scenario 1: Character Death (Hunger & Health Decay)
*   **Objective:** Verify that when Hunger reaches `0`, Health decay is correctly triggered, and that reaching `0` Health immediately routes the player to the fatal ending.
*   **Deterministic Setup:**
    1. Start a new game (default stats: Hunger `100`, Thirst `100`, Health `100`).
    2. Open console and run:
       ```javascript
       window.storyEngine.model.hunger = 0;
       window.storyEngine.model.thirst = 100;
       window.storyEngine.model.health = 5;
       ```
    3. Make a choice that advances time by **6 hours** (e.g., choice `c_day1_lock_manual`).
    4. **Expected Output Verification:**
       *   Hunger remains clamped at `0`.
       *   Thirst decays by `14` points (to `86`).
       *   Health is penalized by `10` points because Hunger is `0` (since interval is 6 hours, decay is $6/6 \times 10 = 10$ points).
       *   Health drops to `0` and clamps.
       *   The story engine immediately evaluates the next scene transition. Because `health <= 0`, it redirects to `ending_fatal`.
       *   Verify the View displays the title `ENDING FATAL: MAKAM BUNKER 72` and the background class `ending-bg-fatal` is applied.

### Edge Case Scenario 2: Recovery Penalty
*   **Objective:** Verify that using a Medkit (P3K) has a diminishing return when Health is $\ge 70$.
*   **Deterministic Setup:**
    1. Start a game with Health `75` and at least `1` kit in the inventory.
    2. Click the Medkit item in the resource panel.
    3. **Expected Output Verification:**
       *   The model consumes 1 kit.
       *   Health increases by `+20` (clamped to `95`) instead of the standard `+40`.
       *   The action is logged in the journal with the text: `+20 Kesehatan (Penalti Pemulihan)`.

### Edge Case Scenario 3: Secret Ending Evaluation
*   **Objective:** Confirm that the secret ending triggers only if knowledge is $\ge 12$, structural damage is `false`, and health is $>0$.
*   **Deterministic Setup:**
    1. Progress to the final transition node (`trigger_secret_ending_eval`).
    2. Set Model parameters:
       ```javascript
       window.storyEngine.model.knowledge = 12;
       window.storyEngine.model.flags.structural_damage = false;
       window.storyEngine.model.health = 80;
       ```
    3. Select the transition option.
    4. **Expected Output Verification:**
       *   Model routes to `ending_secret_best`.
       *   If you set `flags.structural_damage = true` and re-evaluate, the model must route to `ending_secret_bad`.

---

## 3. UI/UX Verification Checklist
*   [ ] **16:9 Aspect Ratio:** Resize the browser window to extreme portrait and landscape aspect ratios. Ensure no UI panels bleed outside the outer `#game-container` boundary.
*   [ ] **Typewriter Skip:** Click the dialogue area during dialogue typing. Confirm the typewriter completes instantly and choices are rendered immediately without double-triggering sfx.
*   [ ] **CRT Settings Persistence:** Toggle the CRT scanlines off in settings. Refresh the browser and verify the preference is correctly loaded from `localStorage` and applied to `document.body.classList`.
