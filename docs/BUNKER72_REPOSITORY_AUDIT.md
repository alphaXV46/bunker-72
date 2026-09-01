# Bunker 72 Repository Audit

**Project:** Bunker 72 / 72 Jam Pertama  
**Audit scope:** Repository audit only  
**Design source of truth:** `docs/BUNKER72_REDESIGN_SPEC.md`  
**Implementation status:** No redesign changes are included in this document

## 1. Executive Summary

The redesign is feasible without replacing the existing architecture. The repository already contains a modular `GameModel`–`StoryEngine`–`GameView` split, a top-down scavenger, four bunker stations, a radio tuner, inventory and survival state, save/load, CRT UI, touch controls, and a modular ending renderer.

Four issues should be treated as foundation blockers before redesign implementation:

1. The optimal Day 3 ventilation branch is broken: the controller routes to `day3_vent_success_water_check`, but that scene does not exist.
2. Playable Day 4 remains active whenever `radio_saved` is absent.
3. The current Good Ending is directly determined by `helped_stranger`, conflicting with the Master Spec.
4. Choice buttons are colored from `knowledgeEffect`, exposing the intended good/risky answer before selection.

Lowest-risk direction:

- Preserve `knowledge` as the internal property temporarily, while redefining its mutations as Preparedness only.
- Generalize the existing scavenger through configuration instead of creating a second movement engine.
- Add Day 1 hotspots and the Day 2 location map as small DOM overlays owned by `GameView`.
- Make one ending evaluator the single source of truth.
- Use lightweight flags and reuse the existing modular epilogue renderer.

## 2. Relevant Repository Structure

```text
bunker 72/
├── docs/
│   ├── BUNKER72_REDESIGN_SPEC.md
│   └── BUNKER72_REPOSITORY_AUDIT.md
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── data/
    │   └── story.json
    ├── js/
    │   ├── main.js
    │   ├── constants.js
    │   ├── gameModel.js
    │   ├── storyEngine.js
    │   ├── gameView.js
    │   ├── scavengerMinigame.js
    │   ├── radioMiniGame.js
    │   ├── bunkerMinigame.js
    │   ├── retroAudio.js
    │   ├── assetLoader.js
    │   └── bunkerStations/
    │       ├── stationsConfig.js
    │       ├── cardStation.js
    │       ├── powerStation.js
    │       ├── rotorStation.js
    │       └── wireStation.js
    ├── styles/
    │   ├── main.css
    │   └── minigames/
    │       ├── bunker-console.css
    │       └── radio-tuner.css
    └── assets/
        ├── backgrounds/
        ├── avatars/
        ├── items/
        ├── sprites/
        └── ui/
```

Responsibilities verified from implementation:

- `docs/BUNKER72_REDESIGN_SPEC.md`: final redesign source of truth.
- `src/data/story.json`: 73 scenes and 111 choices, loaded as a static Vite import.
- `src/js/main.js`: application entry, DOM cache, menu/screen transitions, save/load, and radio wiring.
- `src/js/gameModel.js`: central state, inventory, survival decay, flags, serialization, and ending evaluators.
- `src/js/storyEngine.js`: scene orchestration, choice effects, minigame routing, autosave, and fatal interception.
- `src/js/gameView.js`: HUD, dialogue, choices, typewriter, journal, inventory, scene art, endings, and scavenger mounting.
- `src/js/scavengerMinigame.js`: canvas-based top-down traversal for the prologue house.
- `src/js/bunkerMinigame.js`: facade/orchestrator for the four bunker stations.
- `src/js/bunkerStations/*.js`: individual Card, Power, Rotor, and Wire mechanics.
- `src/js/radioMiniGame.js`: radio tuning between 88 and 108 MHz.
- `src/js/retroAudio.js`: Web Audio, sampled SFX/BGM, and procedural UI/tremor sounds.
- `src/js/constants.js`: ending IDs, survival constants, choice quality, educational facts, and recap metadata.
- `src/styles/main.css`: CRT presentation, responsive layout, HUD, scavenger controls, and ending cards.

## 3. Current Narrative Flow

```text
PROLOGUE
prolog_home
 ├─ Sarah interaction
 ├─ Maya interaction
 ├─ radio
 └─ skip
      ↓
prolog_radio_peaceful
      ↓
prolog_foreshadow
      ↓
prolog_alert → prolog_question
      ↓
prolog_packing
      ↓ hardcoded ScavengerMinigame completion
prolog_intro → road → threshold → surface → title
      ↓ Card Station

DAY 1
power boot → bunker lock/air decision
      ├─ safe air
      └─ unsafe air → repair
      ↓
water allocation
      ↓
sanitation/rest
      ↓
Maya fear
      ↓

DAY 2
aftershock
      ├─ panic/structural damage
      ├─ shelter
      └─ rotor station
      ↓
air leak
      ↓
Hendra knocks at bunker door
      ↓
radio management + tuner
      ↓
power management + Wire Station
      ↓
small bunker-compartment "scavenge"
      ↓

DAY 3
water contamination
      ↓
water-versus-vent pressure choice
      ├─ water path
      └─ vent path → MISSING SCENE, progression stops
      ↓
surface signal
      ↓
second unknown-group door encounter
      ↓
final vigil
      ↓
ending_eval
      ├─ radio_saved → rescue evaluation at 72 hours
      └─ no radio_saved → PLAYABLE DAY 4
                           ↓
                     surface scavenge choices
                           ↓
                     looter confrontation
                           ↓
                     evaluation at 96 hours
```

### Current ending routing

```text
health <= 0 during a transition
    → ending_fatal

72-hour evaluation with radio_saved
    → evaluateEnding()
        ├─ health <= 0 / door_opened / looters_breached → ending_bad
        ├─ helped_stranger                              → ending_good
        └─ otherwise                                    → ending_normal

No radio_saved
    → Day 4
    → evaluateSecretEnding()
        → the same bad/good/normal rules
```

### Reachability and duplication findings

- `prolog_packing` still has six packing-menu choices in JSON, but runtime bypasses them and mounts the scavenger directly.
- The JSON content of `ending_eval` is never rendered because the ID is intercepted as a pseudo-scene.
- `day2_scavenge_fail` and `trigger_scavenge_eval` have no active incoming path.
- `day2_scavenge_bypass_fail` is dynamically reachable only because `StoryEngine` mutates the selected choice's `nextSceneId` at runtime.
- `ending_good` and `ending_best` are exact duplicate scenes.
- Unused ending variants: `ending_best`, `ending_secret_best`, `ending_secret_bad`, `ending_stranded_bad`, and `ending_near_miss`.
- `ending_fatal` remains dynamically reachable through health interception.
- `day3_pinch_inspect_vent` routes to missing scene `day3_vent_success_water_check`.
- Time moves `66 → 72 → 71 → 72` because `day3_final_vigil` is marked as 71 hours after several 72-hour scenes.

## 4. Core State and GameModel

Actual state shape:

```js
{
  currentSceneId,
  knowledge,
  hunger,
  thirst,
  health,
  history: [
    { hour, text, choiceId, effect, fact? }
  ],
  flags: {
    // Boolean or arbitrary values
  },
  inventory: {
    food,
    drink,
    kit
  }
}
```

There is no explicit state property for:

- current hour/day; it is derived from `scene.hour`;
- completion; it is stored separately in `bunker72_game_completed`;
- New Game+; it is reconstructed as `flags.ng_plus`;
- hotspot or expedition progress.

### Initial state discrepancy

The `GameModel` defaults are:

```js
knowledge: 5
hunger: 100
thirst: 100
health: 100
inventory: { food: 3, drink: 3, kit: 1 }
```

The actual New Game flow overrides inventory with `{food:0, drink:0, kit:0}`. Scavenger completion then resets it to `{food:1, drink:1, kit:0}` before applying pickups. A save missing inventory falls back to the different class default.

### Preparedness versus knowledge

The codebase contains approximately 61 references related to `knowledge`. The HUD and ending already use the player-facing term `KESIAPSIAGAAN`, but internal state, methods, save validation, choice effects, ending fallback, radio reward, and an old scavenging check still use `knowledge`.

Current non-technical or moral Knowledge changes include:

- `c_prolog_ibu_comfort`: praising/comforting Sarah, `+1`.
- `c_prolog_anak_promise`: promising to repair Maya's toy, `+1`.
- `c_prolog_anak_snack`: giving Maya a snack, `+1`.
- `c_day1_maya_light`: lighting the room and hugging Maya, `+1`.
- `c_day1_maya_toy`: giving Maya her toy, `+1`.
- `c_day2_stranger_airlock`: helping Hendra, `+2`.
- `c_day2_stranger_intercom`: guiding Hendra, `+1`.
- `c_day2_stranger_harsh`: hostile moral response, `-1`.

Recommendation: keep `knowledge` internally for compatibility during the redesign, but restrict `knowledgeEffect` to technical preparedness. Use flags for emotional and moral decisions. Consider an internal rename only after story and save compatibility are stable.

### Survival balancing

Current configuration:

- Hunger: `-6` per 6 elapsed hours.
- Thirst: `-7` per 6 elapsed hours.
- Health decreases only when Hunger or Thirst has reached zero.
- Food and Water restore 30.
- P3K restores 40, or 20 when Health is already at least 70.
- `air_uninspected` increases Hunger decay.
- `structural_damage` increases Thirst decay.
- `smoke_poisoned` adds Health decay.

Because of the Day 3 time regression, the ordinary route can calculate roughly 73 positive elapsed hours. With no consumables and no negative flags, approximate final values are:

```text
Hunger ≈ 27
Thirst ≈ 14.8
Health = 100
```

The player can therefore ignore Hunger and Thirst and still end with full Health. Low-stat CSS and conditional dialogue exist, but there is no mechanical penalty before zero. The modular ending may still describe the family as physically excellent because Health remains high.

Balancing should happen after the final 72-hour timeline and Day 2 resource yields are known. Recommended tests:

1. No consumables used.
2. Minimum sensible consumption.
3. Resource-rich expedition route.

### Inventory implementation

| Concept | Current implementation |
|---|---|
| Food | `inventory.food` |
| Water | `inventory.drink` |
| First Aid | `inventory.kit` |
| Radio | Always displayed as infinite; not quantity-based |
| Snack | `snack_packed`, then adds Food |
| Toy | `toy_packed`; no quantity |
| Battery | `battery_packed` and `extra_battery` |
| Mask | Not implemented |
| Day 4 resources | Add only Food/Water |

The existing inventory is adequate. Consumables should remain quantities; unique or narrative items should remain flags. The radio currently opens even when it was not packed.

## 5. StoryEngine and Story Schema

`story.json` is imported statically by `main.js`; it is not fetched at runtime.

### Supported schema

| Field | Actual support |
|---|---|
| `speaker` | Supported |
| `avatar` | Supported through fixed avatar map |
| `text` | Supported; leading `[TAG]` becomes a system alert |
| `background` | Supported through fixed CSS-class map |
| `hour` | Supported; the first integer is parsed |
| `objective` | Supported with fallback text |
| `choices` | Supported |
| `choice.nextSceneId` | Supported |
| `scene.nextSceneId` | Not supported |
| `autoNextSceneId` | Supported |
| `autoAdvanceDelay` | Supported for non-prologue scenes; prologue auto scenes become click-to-continue |
| `conditionalText` | Supported with one `requiredFlag` per entry |
| `statConditions` | Supported operators: `lt`, `lte`, `gt`, `gte`, `eq` |
| `knowledgeEffect` | Supported |
| `setFlags` | Supported on choices, not scenes |
| `requireFlags` | Supported on choices |
| `forbiddenFlags` | Supported on choices |
| `triggerBunkerStation` | Supported |
| `triggerRadioMiniGame` | Supported |
| `autoTriggerRadio` | Supported |
| `telltaleNotice` | Supported on choices |
| `alert` | Supported |
| `focusItems` | Present in 14 scenes but unused by runtime |
| `item` | Used only by the legacy packing renderer |

### Telltale notice behavior

- Displayed for 3.8 seconds.
- Fades/removes over another 0.5 seconds.
- The notice itself is not saved.
- Choice IDs remain in history, so later callbacks can be inferred.
- There are currently 15 notices, above the redesign target of approximately 3–4.

### StoryEngine coupling

Hardcoded scene or choice assumptions include:

- `prolog_packing`;
- `ending_eval`;
- `trigger_ending_eval`;
- `trigger_secret_ending_eval`;
- `trigger_scavenge_eval`;
- the two Day 3 pseudo-scenes;
- fixed radio scene IDs;
- per-choice packing, Hendra, poisoning, scavenge, and Day 4 consequences.

Autosave occurs on entry to a non-ending scene and after inventory use. Radio success changes Knowledge and history without immediately saving.

Non-prologue auto-advance timers are not tracked or canceled. Current story data only uses auto-advance fields in the prologue, where they are converted to click-to-continue, but this remains a lifecycle risk for future scenes.

## 6. Existing Gameplay Systems

### Top-down scavenger

Current implementation:

- Logical viewport: `960×540`.
- World: `1376×768`.
- One hardcoded house background and collider map.
- Spawn: `(840,650)`.
- Movement: WASD/arrows with diagonal normalization.
- Collision: axis-separated AABB tests.
- Interaction: `E` or Space.
- Camera: smooth follow interpolation.
- Six unique pickups.
- Capacity: five.
- Timer: 40 seconds.
- Exit: one fixed bunker hatch.
- Touch: D-pad plus action button.
- Cleanup: removes keyboard listeners, wrapper, and animation frame.

Completion result:

```js
{
  collectedItems: string[],
  reason: "entered_hatch" | "time_out"
}
```

Risks:

- world data, spawn, colliders, item positions, exit, room names, timer, and rendering are hardcoded;
- movement speed is per frame rather than multiplied by `dt`;
- the 600 ms finish timeout is not retained for cancellation;
- touch controls do not handle `touchcancel` or pointer loss;
- the class mixes input, physics, world data, rendering, HUD, and lifecycle.

The system can be generalized without rewriting it. Recommended configuration contract:

```js
{
  mode,
  mapSrc,
  mapWidth,
  mapHeight,
  viewport,
  spawnPosition,
  playerSpeed,
  colliders,
  items,
  capacity,
  timerEnabled,
  duration,
  exits,
  roomZones,
  hazards,
  drawWorld,
  onComplete
}
```

Preserve the current prologue as the default config.

### Bunker station minigames

| Station | Current behavior | Failure/retry | Graded-result effort |
|---|---|---|---|
| Card | Move to hard stop, then swipe in 0.5–1.25 seconds | Retry until valid | Easy–Medium; speed and fast/slow state already exist |
| Power | Pull lever until 100% | No failure | Medium; track elapsed time/release count |
| Rotor | Match rotating 1–2–3 targets with three mistakes | Can fail when `allowFailure` | Easy; `numberMistakes` already exists |
| Wire | Connect four matching colors | Unlimited retry | Easy; count mismatches |

Facade API:

```js
openStation(stationId, {
  allowFailure,
  onComplete,
  onFailure,
  onCancel
})
```

Current final result is only `{success, stationId}` and `StoryEngine` ignores its payload. All stations have generally sound cleanup for pointer listeners, resize listeners, intervals, observers, RAFs, and timers.

Small lifecycle defect: close/reset occurs before the cancel payload reads `currentStationId`, so canceled results may report a null station ID.

### Radio minigame

- Range: 88.0–108.0 MHz, step 0.1.
- Target randomly selected from six frequencies.
- Initial frequency is approximately ±4.5 MHz from the target.
- Signal strength falls linearly across a 3 MHz distance.
- Lock is enabled only when target difference is at most 0.2 MHz.
- No timeout, failure, attempt limit, or graded callback.
- Reopening resets the session and allows another Knowledge reward.
- Success grants `+1 knowledge` and one history entry.
- `radio_saved` comes from a narrative management choice, not tuning performance.
- Radio audio is a sampled AAC played for at most five seconds through Web Audio; it is not frequency-reactive procedural noise.

### GameView, mobile, and visual support

`GameView` currently owns dialogue, typewriter, choices, HUD, inventory, scene backgrounds, environmental filters, system alerts, journal, Telltale notices, ending cards, educational debrief, and scavenger mounting.

Mobile support:

- The base layout is desktop 16:9.
- At 920 px and below, the layout is compacted for small screens/landscape.
- At 768 px and below, a portrait stacked layout removes the 16:9 lock.
- There is no explicit landscape orientation prompt or orientation-specific rule.
- Scavenger controls appear for coarse pointers or widths of 850 px and below.
- Card, Power, and Wire use Pointer Events; Rotor uses click.
- Radio uses separate mouse/touch listeners plus the native range input.

The CRT stylesheet can support hotspot glow, map destination states, expedition HUD, and modular epilogue cards without new assets.

## 7. Day 1 Hotspot Feasibility

Recommended minimum implementation:

1. Add one Day 1 inspection scene.
2. Define hotspot position data on choices or a small scene-level array:

```js
{
  id,
  text,
  hotspot: { x, y, width, height },
  setFlags,
  forbiddenFlags,
  reward
}
```

3. Add `GameView.renderHotspots()` to mount absolute-positioned buttons over the existing bunker background.
4. Reuse `StoryEngine` choice handling or a small inspection handler for flags and rewards.
5. Derive remaining inspections from inspected flags instead of creating a generic action-point system.
6. After three inspections, show a normal Continue/Finish button.

Requirements:

- `:hover` and `:focus-visible` must provide equivalent feedback.
- Touch targets should be at least 44–48 px.
- Interaction must not depend on hover.
- Visited hotspots should be disabled.
- The overlay must be removed on scene transition.

`focusItems` should not be repurposed blindly; it currently describes inventory emphasis rather than world coordinates.

## 8. Day 2 Expedition Feasibility

Recommended architecture: **reuse and generalize the existing scavenger**.

Use separate configs for:

- Prologue house.
- Neighbor's house.
- Minimarket.
- Medical post.

StoryEngine flow:

```text
location map
    → choose an unvisited destination
    → mount scavenger with the destination config
    → receive result
    → apply inventory/flags
    → return to the location map
    → stop after two destinations
```

Persist `expeditionVisitedLocations`; derive remaining visits using:

```js
2 - expeditionVisitedLocations.length
```

Lowest-complexity hazards:

- rubble/collapsed road: colliders;
- fallen electrical cable: collider plus proximity message;
- heavy ash: canvas/CSS visibility overlay;
- aftershock: one-shot shake plus a route/collider change;
- unstable structure: optional risky pickup zone.

Completion should eventually return:

```js
{
  locationId,
  collectedItems,
  hazardFlags,
  reason
}
```

Do not add combat, enemy AI, jumping, open-world navigation, or procedural maps.

A sibling module with shared movement logic is only a fallback if configuration extraction proves unmanageable. In the current 968-line monolith, it would require nearly the same extraction while introducing a second lifecycle.

## 9. Day 3, Radio, and Consequence Feasibility

Day 3 can consume existing and new lightweight state:

- `toy_packed`, `maya_comforted`, `promised_maya`;
- `air_seal_good`/`air_remedied`;
- `power_saved`;
- `water_filtered`;
- `extra_battery`;
- expedition inventory and inspection flags;
- Hendra flags;
- `radio_quality`.

Recommended fail-forward radio behavior:

- Permit one final "lock/send" action at any current signal quality.
- Very close to target → `clear`.
- Medium signal strength → `weak`.
- Poor signal → `failed`.
- Invoke one final callback and continue the story.
- Do not require replay until perfect.
- After story resolution, the inventory radio can remain available for informational broadcasts without new score rewards.

Suggested callback:

```js
onComplete({
  quality: "clear" | "weak" | "failed",
  frequency,
  strength
})
```

Persist `radio_quality`. Do not use tuning as repeatable `+1 knowledge` farming.

## 10. Ending and Modular Epilogue

Ending logic is currently distributed across:

- `GameModel.evaluateEnding()`;
- `GameModel.evaluateSecretEnding()`;
- `GameModel.evaluateModularEnding()`;
- StoryEngine pseudo-scene routing;
- `ENDING_IDS`;
- `GameView` ending configuration;
- ending scenes in `story.json`.

Current Good Ending is a moral switch:

```js
helped_stranger === true → ending_good
```

The BNPB score also grants `+15` for helping Hendra, mixing moral behavior with disaster preparedness.

Recommended single evaluator:

```js
if (fatalCondition) return "ending_bad";

if (
  knowledge >= GOOD_PREPAREDNESS_THRESHOLD &&
  health >= GOOD_HEALTH_THRESHOLD &&
  criticalSystemsStable
) {
  return "ending_good";
}

return "ending_normal";
```

Hendra should influence rescue details, dialogue, and epilogue modules, not the primary ending category.

The current renderer already creates four modular cards:

- medical;
- bunker;
- social;
- family.

Do not build a new ending framework. Extend the evaluator to return a small set of selected modules and render only those modules. Add Rescue/Radio and Preparedness sections where needed.

## 11. Day 4 Removal Impact

### Safe to delete later

- `day4_intro`
- `day4_scavenge_surface`
- `day4_scavenge_return`
- `day4_looters`
- `day4_eval`
- `trigger_secret_ending_eval`
- `GameModel.evaluateSecretEnding()`
- `GameModel.getSecretBadEndingText()`
- 96-hour HUD branch
- Day 4 choice handlers
- Day 4 quality/fact/recap metadata
- unused secret/best/stranded/near-miss ending variants, after verifying all references

### Potentially reusable

- Resource prioritization concepts from `day4_scavenge_surface`.
- Food/Water reward mutations as reference for expedition results.
- The injury-consequence concept behind `scavenge_injured`, under a new neutral expedition-specific name if needed.
- The prologue top-down scavenger, which is the actual reusable traversal implementation.

There is no top-down Day 4 implementation. Day 4 scavenging is currently narrative-choice-only.

### Exact dependency areas

| Area | Day 4 dependency |
|---|---|
| `src/data/story.json` | All `day4_*`, 96-hour scenes, and obsolete endings |
| `StoryEngine.renderScene()` | `ending_eval → day4_intro` and secret evaluator trigger |
| `StoryEngine.handleChoiceSelect()` | Day 4 scavenge, looter, oxygen, and triage handlers |
| `GameModel` | Day 4 flags, secret evaluator, and secret ending text |
| `GameView.renderHud()` | `maxHour = 96` branch |
| `GameView.renderEnding()` | Obsolete ending configurations |
| `constants.js` | Ending IDs, choice quality, facts, and Day 4 recap |
| NG+ conditional text | Day 2 radio text still references rescue on Day 4 |

New Game+ does not structurally require Day 4. It only derives from completion localStorage and adds conditional radio text. That text should be rewritten around the 72-hour window.

## 12. Save and Load Impact

Current localStorage keys:

```text
bunker72_save_v1
bunker72_game_completed
bunker72_volume
bunker72_muted
bunker72_crt_disabled
```

Save shape:

```js
{
  sceneId,
  knowledge,
  history,
  flags,
  inventory,
  hunger,
  thirst,
  health
}
```

Current validation only verifies:

```js
save.sceneId && typeof save.knowledge === "number"
```

Risks:

- removed or unknown scene IDs are accepted and can lead to blank progression;
- old inventory is not merged with defaults;
- flags are not validated;
- there is no schema version;
- missing Hunger/Thirst/Health safely receive defaults;
- a supplied partial flags object is used without merging;
- radio success is not immediately saved;
- the model's fallback `currentSceneId = day1_start` points to a nonexistent scene.

Recommended compatibility strategy:

```js
{
  version: 2,
  ...saveData
}
```

Load procedure:

1. Validate `sceneId` against story scenes or explicit pseudo-scenes.
2. Merge inventory defaults.
3. Merge/default new flags.
4. Remap removed Day 4 saves to a safe Day 3 checkpoint, or reset them with a clear message.
5. Derive inspection and visit counters rather than duplicating them.
6. Retain the `knowledge` save field for old-save compatibility.

## 13. Technical Risks

### Critical

- Missing `day3_vent_success_water_check` stops the optimal Day 3 branch.
- Current ending and Day 4 routing conflict with the Master Spec.
- Good Ending and BNPB score depend on the Hendra moral choice.
- Choice colors expose answer quality before selection.
- Ending evaluation is duplicated and may diverge during redesign.

### Moderate

- Scavenger is monolithic and hardcoded to one map.
- Movement speed is refresh-rate-dependent.
- Radio is usable without being packed and rewards can be farmed.
- Radio success is not immediately saved.
- Imported story choice objects are mutated at runtime.
- Save validation is too weak.
- Scene transition timers are not tracked/canceled.
- Telltale notices are overused.
- StoryEngine has many hardcoded choice IDs.
- Day 3 time moves backward.
- Bunker station cancel payload can lose the station ID.
- Touch D-pad can remain active after a canceled/lost touch.
- Radio game logic is partly placed in `main.js`, despite its stated lifecycle-only responsibility.

### Low

- `focusItems` is a dead schema field.
- Legacy packing renderer and CSS remain despite being bypassed.
- Some constants reference choice IDs no longer present in story data.
- There is no lint or automated test suite.

## 14. Reuse Opportunities

| Existing system | Reuse for | Expected change |
|---|---|---|
| Scavenger movement/camera/collision | Prologue and Day 2 expedition | Extract hardcoded world data into config |
| Scavenger touch D-pad | Day 2 traversal | Add pointer cancel/release safety |
| Story choices and flags | Callbacks and convergence | Remove visible quality coloring |
| GameModel inventory | Expedition rewards | Keep consumables as counts, unique items as flags |
| Bunker facade | Day 1 technical interactions | Forward performance payloads |
| Card Station | Cabinet/access interaction | Track retries and final swipe speed |
| Rotor Station | Structural stabilization | Return mistake count |
| Wire Station | Power routing | Return mismatch count |
| Radio tuner | Day 3 rescue communication | Return one fail-forward graded result |
| GameView story-box overlay | Day 1 hotspots | Add positioned button layer |
| Existing choices panel | Day 2 location map | Style three destination buttons |
| Telltale toast | Three or four relationship callbacks | Reuse but reduce frequency |
| Modular ending cards | Epilogue | Render selected modules rather than fixed moral text |
| Educational debrief | 72-hour report | Rebase score on technical preparedness |
| CRT/environmental CSS | Hotspots, map, expedition states | Add small local selector groups |
| RetroAudio | Aftershock and radio atmosphere | Reuse existing earthquake/radio sounds |

## 15. Minimal New State

Recommended additions:

```js
{
  // Emotional callback
  promised_maya: boolean,

  // Day 1 inspections
  inspected_supply: boolean,
  inspected_medical: boolean,
  inspected_ventilation: boolean,
  inspected_power: boolean,
  inspected_radio: boolean,
  inspected_family_storage: boolean,

  // Only if a later callback requires it
  found_spare_filter: boolean,

  // Day 2
  expeditionVisitedLocations: string[],

  // Day 3
  radio_quality: "clear" | "weak" | "failed" | null
}
```

Reuse existing state where sensible:

```text
toy_packed
toy_bonded
maya_comforted
extra_battery
helped_stranger
stranger_guided
air_seal_good / air_remedied
power_saved
water_filtered
structural_damage
```

Do not persist redundant counters:

- Derive `inspectionsRemaining` from inspected flags.
- Derive `expeditionVisitsRemaining` from `expeditionVisitedLocations.length`.

Do not add:

- a Humanity stat;
- separate survival bars for each family member;
- a large expedition result subsystem.

Medical rewards can directly increment `inventory.kit`; add `found_medical_supply` only if a later narrative callback explicitly requires source tracking.

## 16. Obsolete State

Likely obsolete after Day 4 and old narrative removal:

```text
looters_breached
looters_hostile
looters_repelled
oxygen_depleted

scavenge_success
scavenge_injured
scavenged
generator_damaged

near_miss
near_miss_radio
near_miss_water
near_miss_knowledge

stranger_hostile
door_opened        // if the second stranger plot is fully removed
radio_saved        // replace with radio_quality if no separate battery-state use remains
```

Obsolete or dead identifiers:

```text
day4_*
trigger_secret_ending_eval
trigger_scavenge_eval
ending_best
ending_secret_best
ending_secret_bad
ending_stranded_bad
ending_near_miss
c_day4_*
c_day4_oxygen_*
c_day4_triage_*
```

Do not remove these active prologue flags:

```text
food_packed
drink_packed
kit_packed
battery_packed
snack_packed
toy_packed
```

## 17. File Impact Matrix

| File | Phase | Expected change | Risk |
|---|---|---|---|
| `src/data/story.json` | 1–5 | Narrative rewrite, Day 4 removal, callbacks | High |
| `src/js/gameModel.js` | 1, 5 | State defaults, ending evaluator, migration support | High |
| `src/js/storyEngine.js` | 1–5 | Remove hardcoded routes, hotspot/expedition orchestration, graded results | High |
| `src/js/gameView.js` | 1–5 | Neutral choices, hotspots, map, HUD, epilogue | High |
| `src/js/constants.js` | 1, 5, 6 | Endings, preparedness, debrief, obsolete IDs | High |
| `src/js/main.js` | 1, 3, 4 | Save versioning, radio wiring, load validation | Medium |
| `src/js/scavengerMinigame.js` | 3 | Configurable maps, modes, hazards, and results | High |
| `src/js/bunkerMinigame.js` | 2, 4 | Preserve result payload and quality | Medium |
| `src/js/bunkerStations/cardStation.js` | 2 | Return attempts and speed | Medium |
| `src/js/bunkerStations/powerStation.js` | 2 | Optional efficiency metrics | Low |
| `src/js/bunkerStations/rotorStation.js` | 2 | Return mistake count | Low |
| `src/js/bunkerStations/wireStation.js` | 2 | Return mismatch count | Low |
| `src/js/radioMiniGame.js` | 4 | Graded fail-forward completion and one-shot reward | Medium |
| `src/js/retroAudio.js` | 3–4 | Reuse or tune atmosphere only | Low |
| `src/js/assetLoader.js` | 3 | Register reused maps only if required | Low |
| `index.html` | 1, 2, 4, 5 | Labels, overlay containers, accessibility | Medium |
| `src/styles/main.css` | 1–5 | Neutral choices, hotspots, map, expedition HUD, epilogue | Medium |
| `src/styles/minigames/bunker-console.css` | 2 | Graded-result presentation | Low |
| `src/styles/minigames/radio-tuner.css` | 4 | Weak/failed states and mobile layout | Low |

## 18. Recommended Implementation Phases

### Phase 1 — Foundation and broken-flow cleanup

- Add a save schema version and safe default merge.
- Fix the missing Day 3 scene before larger edits.
- Remove visible correct-answer coloring.
- Establish one ending evaluator contract.
- Remove the active Day 4 route and 96-hour HUD behavior.
- Keep old content temporarily unreachable until replacements pass.

### Phase 2 — Prologue and Day 1

- Preserve top-down prologue scavenging.
- Correct Preparedness versus emotional effects.
- Add `promised_maya`.
- Implement limited DOM hotspots.
- Add technical callbacks and rewrite Maya's first-night choices.
- Add graded station payloads only where they create meaningful consequences.

### Phase 3 — Day 2 expedition

- Move scavenger hardcoding into configuration.
- Add three destination configs.
- Add location-selection UI.
- Enforce two visits.
- Add simple environmental hazards and the Hendra encounter.
- Return inventory and flags to StoryEngine.

### Phase 4 — Day 3 consequences and radio

- Rewrite Day 3 around earlier state.
- Replace success-only radio callback with graded fail-forward resolution.
- Remove the second stranger/looter plot.
- Verify progression ends at exactly 72 hours.

### Phase 5 — Three endings and epilogue

- Retain exactly Bad, Normal, and Good.
- Ensure Hendra is not required for Good.
- Assemble modular epilogue cards from flags.
- Rebuild the BNPB/Preparedness debrief.
- Delete old ending implementations once no live references remain.

### Phase 6 — Balance and regression

- Balance Hunger/Thirst against final resource availability.
- Test old saves and Day 4 checkpoint migration.
- Test keyboard, pointer, mobile landscape, and coarse touch.
- Verify all scene references and every major branch.
- Remove legacy packing/menu/dead constants only after successful regression.

## 19. Baseline Verification

Baseline checks performed during the audit:

- `npm run build`: passed.
- Vite version used by installed dependencies: 5.4.21.
- Modules transformed: 52.
- No build errors or unresolved imports.
- `package.json` has no lint or test script.
- Static story audit found:
  - 73 scenes;
  - 111 unique choices;
  - no missing ordinary JSON `nextSceneId` references;
  - one missing controller-generated scene: `day3_vent_success_water_check`.
- No full browser playthrough was performed.
- The build-regenerated tracked `dist/index.html` was restored after verification.
- Repository status was clean at the end of the audit.

## 20. Final Recommendation

Preserve the existing architecture and avoid creating a new engine.

The first implementation session should be a foundation task that:

1. fixes the broken Day 3 branch;
2. establishes one ending evaluator;
3. disconnects Day 4 from active progression;
4. introduces safe save compatibility;
5. separates Preparedness from morality;
6. removes player-visible correct-answer coloring.

After that, implement Day 1 hotspots as a small DOM overlay and build Day 2 by configuring the existing scavenger. This provides the lowest implementation risk, maximizes reuse, and remains proportional to a school project.
