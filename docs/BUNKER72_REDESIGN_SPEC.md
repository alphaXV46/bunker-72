# BUNKER 72 — FINAL GAME REDESIGN MASTER SPEC

**Project:** Bunker 72 / 72 Jam Pertama  
**Document Role:** Final Narrative & Gameplay Design Source of Truth  
**Target Platform:** Web Browser — Desktop 16:9 + Mobile Landscape Touch Support  
**Technology:** HTML5, CSS3, Vanilla JavaScript, Vite, Web Audio API  
**Architecture:** Existing modular MVC-style architecture  
**Primary Language of the Game:** Indonesian  

---

# 1. PURPOSE OF THIS DOCUMENT

This document defines the final design direction for **Bunker 72**.

All future implementation work must treat this document as the primary design source of truth.

The goal is not to continuously add more systems.

The goal is to transform the existing project into a focused, dramatic, educational, and replayable narrative survival game while keeping the production scope realistic for a school project.

The game should feel like:

> **A narrative survival game that teaches disaster preparedness through play, rather than a disaster-preparedness quiz wrapped inside a visual novel.**

The final game must prioritize:

1. Player tension.
2. Meaningful decisions.
3. Consequences.
4. Emotional family storytelling.
5. Educational value.
6. Manageable implementation complexity.
7. Reuse of existing systems.
8. Strong pacing.
9. Clear narrative identity.
10. Reliable completion and testing.

Do not expand scope unless absolutely necessary.

---

# 2. CORE GAME FANTASY

The player controls **Aris**, a father attempting to keep his wife **Sarah** and daughter **Maya** alive during the first 72 hours following a catastrophic Krakatau-related disaster.

The fantasy is not about becoming powerful.

It is about:

- preparation,
- scarcity,
- uncertainty,
- family responsibility,
- disaster knowledge,
- risk assessment,
- and deciding what matters when resources are limited.

The player should repeatedly feel:

> "I cannot do everything."

> "Both options have consequences."

> "I hope the thing I did earlier was enough."

> "The game remembered what I chose."

---

# 3. FINAL GAME STRUCTURE

The playable story ends around the **72-hour rescue window**.

There is no playable Day 4.

The final high-level progression is:

```text
PROLOGUE
The Last Normal Evening
        ↓
Early warning signs
        ↓
Emergency alert
        ↓
40-second Top-Down Scavenging
        ↓
Family enters Bunker 72
        ↓
TITLE CARD


DAY 1 — SHELTER
Learn the bunker
        ↓
Limited Interactive Inspection
        ↓
Activate/stabilize bunker systems
        ↓
Basic survival management
        ↓
Family adjustment
        ↓
Maya's first night
        ↓
DAY 1 END


DAY 2 — EXPEDITION
Aftershock
        ↓
Resource problem
        ↓
Aris decides to leave the bunker
        ↓
Simple location map
        ↓
Choose 2 of 3 locations
        ↓
Top-down traversal
        ↓
Environmental hazards
        ↓
Resource scavenging
        ↓
Hendra encounter
        ↓
Return to bunker
        ↓
DAY 2 END


DAY 3 — THE LAST HOURS
Previous decisions return
        ↓
Water / power / communication pressure
        ↓
Radio contact
        ↓
Final survival dilemma
        ↓
Hour 71–72
        ↓
Rescue or failure
        ↓
BAD / NORMAL / GOOD
        ↓
MODULAR EPILOGUE
        ↓
EDUCATIONAL DEBRIEF
```

Every day must have a distinct gameplay identity.

### Prologue
**Urgency**

### Day 1
**Exploration and preparation**

### Day 2
**Expedition and risk**

### Day 3
**Consequences and final tension**

---

# 4. REMOVE PLAYABLE DAY 4

The existing playable 96-hour / Day 4 path is removed.

Do not retain active progression involving:

- Day 4 scavenging,
- Day 4 looters,
- Day 4 combat-like threats,
- 96-hour playable survival,
- secret Day 4 endings,
- secret rescue gameplay.

A delayed rescue may still exist narratively.

For example:

- rescue occurs shortly after 72 hours,
- weak radio communication delays localization,
- SAR expands its search before finding the family.

However, this is represented through the ending or epilogue.

It is not another playable day.

The number **72** must remain the central narrative deadline and identity of the game.

---

# 5. CORE DESIGN PILLARS

## 5.1 Survival Through Decisions

Player survival should primarily depend on:

- preparation,
- resource allocation,
- exploration,
- technical decisions,
- and previous choices.

Do not rely on random deaths.

---

## 5.2 Education Through Gameplay

Players should learn disaster-safety principles by:

- observing hazards,
- applying knowledge,
- experiencing consequences,
- listening to emergency broadcasts,
- inspecting systems,
- and receiving post-decision feedback.

Avoid making every educational situation a multiple-choice quiz.

---

## 5.3 Family as the Emotional Core

Aris, Sarah, and Maya are not merely exposition devices.

Their relationship is the emotional center of Bunker 72.

The player should care about keeping them together, not merely keeping three status bars above zero.

---

## 5.4 Diegetic Interaction

Gameplay interactions should belong naturally inside the world.

Examples:

- scavenging supplies,
- inspecting ventilation,
- operating bunker systems,
- tuning the radio,
- navigating rubble,
- managing power,
- selecting expedition supplies.

Avoid unrelated arcade-style mechanics.

---

## 5.5 Consequence Without Branch Explosion

Use a Telltale-inspired structure:

> **branch → consequence → callback → convergence**

Choices do not need to generate entirely separate storylines.

Most decisions should:

1. set a flag or modify state,
2. change a later scene,
3. alter resources or dialogue,
4. then return to the main narrative flow.

This preserves player agency without producing an unmanageable branching tree.

---

# 6. CHOICE DESIGN PHILOSOPHY

The existing pattern of:

> correct answer / acceptable answer / obviously terrible answer

must be reduced.

The player should not feel like they are selecting the answer on a school exam.

Good choices should often represent trade-offs.

Examples:

- safer but slower,
- faster but riskier,
- family-first but resource inefficient,
- technically optimal but emotionally costly,
- compassionate but consumes supplies,
- resource-efficient but reduces comfort,
- immediate benefit versus long-term preparation.

A good narrative choice should make the player hesitate.

---

# 7. NEVER SHOW THE "CORRECT ANSWER" BEFORE A CHOICE

Internal design may still classify decisions as:

- optimal,
- acceptable,
- risky.

However, this classification must not appear directly in the player-facing choice UI.

Do not show:

- green choice,
- yellow choice,
- red choice,
- "correct",
- "wrong",
- SOP score before choosing.

The player should decide based on their understanding of the situation.

Educational explanation may appear after the decision.

---

# 8. PLAYER-FACING EDUCATIONAL FEEDBACK

Technical disaster information should be delivered through:

- environmental clues,
- emergency radio broadcasts,
- contextual interaction,
- short mitigation notes,
- end-of-scene feedback,
- educational debrief,
- epilogue analysis.

Do not force Sarah or Aris to constantly deliver textbook-style explanations.

---

# 9. DIALOGUE STYLE

Dialogue must sound human first.

During dangerous situations, dialogue should become shorter.

Bad pattern:

> Long technical explanation while the bunker is actively failing.

Preferred pattern:

```text
Sarah:
"Mas. Lampunya merah."

Aris:
"Matikan blower."

Sarah:
"Segelnya?"

Aris:
"Bergeser."
```

Then allow the educational system to explain the technical reasoning later.

Principle:

> **Characters carry emotion.**

> **Gameplay and feedback carry education.**

---

# 10. PROLOGUE — THE LAST NORMAL EVENING

The existing peaceful family opening should remain.

It is important because the later disaster becomes more emotionally effective when contrasted against normal family life.

The opening should establish:

- Sarah preparing dinner,
- Maya playing,
- Aris returning home,
- the family feeling safe,
- local radio playing,
- subtle environmental warning signs.

The disaster should gradually interrupt the normal evening.

Do not immediately begin with explosions and emergency UI.

Build contrast first.

---

# 11. MAYA'S TOY AS A RECURRING MOTIF

Maya's red toy vehicle should become a recurring emotional object.

If Aris spends time with Maya during the peaceful prologue, store an emotional flag such as:

```js
promised_maya = true
```

Do not award Preparedness for being kind to Maya.

The promise should later return.

For example, before the Day 2 expedition:

```text
Maya:
"Ayah... mobilnya belum kita betulkan."

Aris:
"Makanya Ayah harus pulang."
```

The exact final dialogue may differ, but the callback principle must remain.

---

# 12. PROLOGUE SCAVENGING

The existing menu-based item packing should no longer be the primary packing mechanic if the top-down scavenging minigame is available.

The desired flow:

```text
Emergency warning
        ↓
Sarah takes Maya toward the bunker
        ↓
Aris stays behind briefly
        ↓
40-second top-down scavenging
        ↓
Aris reaches the bunker
        ↓
Door closes
        ↓
BUNKER 72
72 JAM PERTAMA
```

Reuse the existing top-down scavenger system.

---

# 13. PROLOGUE ITEM LIMIT

There are six meaningful items:

- Food
- Water
- First Aid Kit
- Portable Radio
- Snack
- Maya's Toy

Maximum backpack capacity:

**5 items**

Therefore at least one item must be left behind.

This creates an immediate meaningful decision.

---

# 14. MECHANICAL VALUE VS EMOTIONAL VALUE

Not every item needs direct survival power.

Maya's toy is primarily an emotional item.

This is intentional.

The player should experience a conflict between:

> "What is mechanically useful?"

and

> "What matters to this family?"

This theme should continue throughout the game.

---

# 15. DAY 1 — SHELTER

Day 1 represents the family's transition from emergency escape to controlled survival.

Theme:

> **"This place must become our home."**

The pacing should temporarily slow down after the intense prologue.

The player learns:

- bunker layout,
- important systems,
- available supplies,
- family condition,
- potential future problems.

---

# 16. DAY 1 INTERACTIVE BUNKER

Do not repeat the prologue movement-based scavenging.

Day 1 uses a **static interactive bunker scene**.

Important bunker objects appear as interactive hotspots.

When hovered or focused:

- subtle glow,
- outline,
- highlight,
- cursor feedback.

When clicked:

- inspect,
- interact,
- obtain information,
- discover an item,
- trigger a small interaction.

No new visual assets are required.

Reuse the existing bunker background and UI where possible.

---

# 17. LIMITED INSPECTION SYSTEM

The player should not inspect everything in one playthrough.

Example:

**6 available hotspots**

but only:

**3 Inspection Actions**

Possible hotspots:

1. Supply Cabinet
2. Medical Locker
3. Ventilation
4. Power Panel
5. Radio
6. Family Storage

Exact quantity may be adjusted during implementation, but the principle must remain:

> The player must prioritize.

Do not create a complex exploration-resource system.

A simple remaining-action counter is sufficient.

---

# 18. DAY 1 INSPECTION CALLBACKS

Inspection must matter later.

Examples:

```js
inspected_ventilation
inspected_power
inspected_radio
found_spare_filter
found_medical_supply
opened_supply_cabinet
```

If the player inspected something earlier, later scenes may:

- reveal additional dialogue,
- offer a better solution,
- reduce resource cost,
- avoid a penalty,
- provide earlier warning.

Do not create a separate skill system.

Simple flags are preferred.

---

# 19. DAY 1 HOTSPOT COMPLEXITY

Not every hotspot needs a minigame.

Target philosophy:

**~70%**
simple inspection / resource / information.

**~30%**
short interactive mechanic.

This keeps interactions special and limits development workload.

---

# 20. SUPPLY CABINET MINI-INTERACTION

A locked bunker cabinet may use a short mechanical interaction.

Do not frame it as criminal lockpicking.

Aris is technically capable.

Use context such as:

- emergency latch,
- jammed maintenance lock,
- alignment mechanism,
- mechanical release.

The interaction should be short.

Approximately 10–15 seconds is enough.

---

# 21. FAIL-FORWARD MINIGAMES

Whenever practical, minigames should not require:

> retry until perfect.

Preferred structure:

### Excellent performance
Best result.

### Imperfect performance
Progress continues with a small cost.

### Poor performance
Progress still continues but creates a consequence.

Example:

Supply cabinet:

Perfect:
full resources.

Imperfect:
cabinet opens but one resource is inaccessible.

The game continues either way.

---

# 22. DAY 1 TECHNICAL CRISIS

Day 1 should have approximately one major technical problem.

Primary recommendation:

**air filtration / bunker stabilization**

Do not overload Day 1 with separate major quizzes for:

- air,
- power,
- sanitation,
- water,
- radio,
- food,
- structural engineering.

Basic resource management still exists, but it should not dominate the entire day.

---

# 23. SURVIVAL STATS

Retain the simple survival core:

- Hunger
- Thirst
- Health

Avoid adding many additional survival bars.

However, extremely low Hunger or Thirst should ideally have noticeable consequences before reaching zero.

Possible lightweight thresholds:

```text
60–100: Stable
30–59: Tired
10–29: Weak
1–9: Critical
0: Health penalty
```

Effects should remain simple.

Do not create complex metabolism simulation.

The goal is for the player to feel the condition, not merely see a number.

---

# 24. PREPAREDNESS REPLACES THE SEMANTIC ROLE OF KNOWLEDGE

The old `Knowledge` system conceptually mixes technical skill and morality.

The player-facing stat should become:

**Preparedness / Kesiapsiagaan**

Preparedness represents:

- disaster awareness,
- technical preparation,
- correct system management,
- effective risk mitigation.

If renaming the internal `knowledge` property would create unnecessary compatibility problems, the internal property may remain temporarily.

However, player-facing language should use:

**Kesiapsiagaan**

---

# 25. WHAT SHOULD AFFECT PREPAREDNESS

Preparedness can increase because the player:

- inspected important bunker systems,
- maintained the radio correctly,
- managed filtration,
- prepared clean water,
- handled electricity efficiently,
- used disaster knowledge successfully.

Preparedness should not increase because:

- Aris hugged Maya,
- Aris comforted Sarah,
- Aris helped Hendra,
- Aris behaved morally.

These belong to narrative flags.

---

# 26. DO NOT CREATE A COMPLEX HUMANITY STAT

Do not create a 0–100 Humanity bar.

Use simple flags.

Examples:

```js
promised_maya
maya_comforted
maya_toy_callback
followed_sarah_advice
helped_stranger
stranger_guided
```

These flags primarily affect:

- dialogue,
- callbacks,
- rescue variation,
- epilogue.

---

# 27. MAYA — END OF DAY 1

The first night should end with Maya being afraid.

This scene is important and should remain.

However, redesign the choices so no option is obviously cruel.

Possible structure:

### Option A
Aris personally stays with Maya until she calms down.

Benefit:
emotional support.

Cost:
Aris loses time that could have been spent on another bunker task.

### Option B
If Maya's toy was packed, give it to her and fulfill the earlier emotional callback.

### Option C
Sarah comforts Maya while Aris finishes an important technical check.

Benefit:
technical preparation.

Cost:
less direct emotional connection between Aris and Maya.

All choices should be understandable.

---

# 28. TELLTALE-STYLE NOTICES

Use notices sparingly.

Examples:

> **Maya will remember this.**

> **Hendra will remember your help.**

Use them only for major character-defining choices that actually receive later callbacks.

Approximately 3–4 important notices per playthrough are enough.

Do not use Telltale-style notices for routine technical choices.

---

# 29. DAY 2 — EXPEDITION

Day 2 receives the largest redesign.

Theme:

> **"Aris has to go outside."**

This should become one of the most memorable sections of the game.

---

# 30. DAY 2 OPENING

Begin with an aftershock.

The bunker shakes.

Objects move.

Some damage may occur depending on earlier choices.

Do not spend many scenes repairing every system afterward.

Instead, use the aftershock to reveal the real problem:

**resources are becoming dangerously limited.**

Aris and Sarah evaluate what remains.

The radio indicates that surface conditions are still dangerous and rescue timing remains uncertain.

Aris considers leaving only because the situation has become serious enough to justify the risk.

---

# 31. THE EXPEDITION MUST NOT BE PRESENTED AS SAFE

The game is educational.

Do not accidentally communicate:

> "Going outside during hazardous ash conditions is a normal scavenging activity."

The story must make clear that Aris:

- understands the danger,
- prepares as much as possible,
- only leaves because the family faces an urgent resource problem,
- intends to minimize exposure,
- plans to return quickly.

---

# 32. ARIS AND SARAH BEFORE THE EXPEDITION

This scene should prioritize emotion over technical exposition.

The conversation should communicate:

- Sarah understands why Aris believes he must leave,
- she is afraid of losing him,
- Aris understands the danger,
- Maya senses the tension.

Use concise, human dialogue.

Avoid large blocks of SOP explanation.

---

# 33. DAY 2 MAP

Use a simple location-selection map.

Only three destinations:

```text
             MEDICAL POST
                   ▲
                   │
HOUSE ◄──── INTERSECTION ────► MINIMARKET
                   │
                   ▼
                 BUNKER
```

The player may visit:

**2 of 3 locations.**

This is enough.

Do not create an open world.

---

# 34. EXPEDITION VISIT LIMIT

Use a simple state such as:

```js
expeditionVisitsRemaining = 2
```

or an equivalent implementation.

Do not add:

- stamina trees,
- travel points system,
- RPG energy,
- skill checks.

The limitation itself creates the decision.

---

# 35. REUSE TOP-DOWN MOVEMENT

Reuse as much of the existing prologue movement system as possible.

Do not implement a second movement engine if the existing system can be generalized.

The experience must still feel different.

### Prologue
- fast,
- timed,
- panic.

### Day 2
- cautious,
- exploratory,
- environmental navigation,
- risk assessment.

---

# 36. DAY 2 IS NOT AN ACTION PLATFORMER

Do not add:

- jumping,
- precision platforming,
- combat,
- dodge mechanics,
- parkour,
- physics puzzles.

Hazards primarily change:

- route,
- visibility,
- access,
- decision-making.

---

# 37. ENVIRONMENTAL HAZARD — AFTERSHOCK

During traversal:

- screen shake,
- environmental audio if existing systems allow it,
- rubble may block a previous path,
- player must reroute.

The educational lesson comes from responding to the changing environment.

Do not turn this into:

> "A: stand under unstable building  
> B: move away"

---

# 38. ENVIRONMENTAL HAZARD — COLLAPSED ROAD

A large collapsed section / damaged road prevents direct travel.

The player must navigate around it.

No jumping mechanic.

The obstacle exists to:

- create exploration,
- slow the route,
- communicate disaster scale.

---

# 39. ENVIRONMENTAL HAZARD — FALLEN ELECTRICAL CABLE

A fallen cable near water or debris blocks a route.

Approaching it should trigger contextual feedback.

Example:

> "No. The cable is touching the water."

The player must find another route.

Do not provide a deliberately stupid choice to touch it.

Education happens through environmental interaction.

---

# 40. ENVIRONMENTAL HAZARD — HEAVY ASH

Some areas have reduced visibility.

If Aris has relevant protective equipment:

the penalty is reduced.

Without it:

- visibility may decrease,
- movement may become more cautious,
- contextual dialogue may change.

Avoid sudden extreme health damage unless strongly justified.

---

# 41. ENVIRONMENTAL HAZARD — UNSTABLE STRUCTURE

Certain structures may offer useful supplies but carry more risk.

Use simple:

**risk vs reward**

rather than complex destruction physics.

---

# 42. LOCATION 1 — NEIGHBOR'S HOUSE

General risk:

**Low to medium**

Potential rewards:

- Food
- Water
- optional environmental clue
- optional emotional discovery

Main set piece:

**aftershock**

A route changes during exploration.

The player must find another exit or path.

---

# 43. LOCATION 2 — MINIMARKET

General risk:

**Medium to high**

Potential rewards:

- Food
- Water
- Extra Battery
- Snack

Possible obstacles:

- collapsed road,
- debris,
- fallen electrical cable.

The minimarket should contain more supplies than Aris can carry.

Example:

```text
2 Food
2 Water
1 Battery
1 Snack
```

but Aris may only take a limited number from the location.

For example:

**3 items**

This creates resource prioritization.

---

# 44. LOCATION 3 — MEDICAL POST

General risk:

**longer route / heavier ash**

Potential rewards:

- First Aid Kit
- Mask
- Medical Supply

Use reduced visibility or environmental pressure as the primary set piece.

Do not introduce a large medical subsystem.

Reuse existing inventory whenever possible.

---

# 45. HENDRA MOVES TO DAY 2

Hendra should no longer first appear as someone knocking on the bunker door.

Aris encounters Hendra during the expedition.

This makes the moral dilemma more personal and less artificial.

---

# 46. HENDRA CHOICE DESIGN

Hendra should not present:

> Good / Neutral / Evil.

The player should face a real resource conflict.

Possible structure:

### Help directly

Give Hendra some water or supplies.

Cost:
family loses resources.

Flag:

```js
helped_stranger = true
```

### Help indirectly

Provide directions or useful information without giving away scarce supplies.

Flag:

```js
stranger_guided = true
```

### Prioritize the family

Aris decides conditions are becoming too dangerous and continues his mission / returns toward the bunker.

This should not be written as cruelty.

It is a difficult survival decision.

---

# 47. HENDRA IS NOT A GOOD-ENDING SWITCH

Helping Hendra must not automatically unlock the Good Ending.

Not helping him must not automatically force the Normal or Bad Ending.

A technically excellent player who prioritizes their family can still achieve Good.

Hendra primarily changes:

- rescue circumstances,
- dialogue,
- emotional interpretation,
- epilogue.

This creates a more mature moral system.

---

# 48. TELLTALE CALLBACK — HENDRA

If Aris helps Hendra:

> **Hendra will remember this.**

Later he may:

- provide information to SAR,
- recognize Aris after rescue,
- mention the family,
- appear in the epilogue.

If he is only guided:

a different callback occurs.

If Aris prioritizes his family:

Hendra's outcome may remain uncertain or be summarized differently.

Do not create a completely separate story branch.

---

# 49. DAY 2 RETURN

The expedition ends with Aris returning to the bunker.

This is an important emotional payoff.

Sarah and Maya's reaction should depend lightly on earlier state.

Examples:

- Aris returns injured,
- Aris brings critical medicine,
- Aris returns with large food supplies,
- Aris returns with little,
- Aris helped Hendra.

Avoid huge dialogue trees.

Conditional lines are sufficient.

---

# 50. DAY 3 — THE LAST HOURS

Day 3 is not about adding new systems.

Day 3 is about collecting consequences.

Theme:

> **"Everything you did now matters."**

State from previous sections should affect the difficulty of the final hours.

---

# 51. DAY 3 CALLBACK SOURCES

Use consequences from:

### Prologue
- packed supplies,
- radio,
- first aid,
- Maya's toy.

### Day 1
- inspections,
- filtration,
- power knowledge,
- Maya interaction.

### Day 2
- locations visited,
- battery,
- medical supplies,
- food/water haul,
- Hendra.

### General state
- Health,
- Hunger,
- Thirst,
- Preparedness,
- bunker flags.

---

# 52. PREVIOUS CHOICES SHOULD REDUCE OR INCREASE PRESSURE

Example:

Player found an extra battery at the minimarket.

Then Day 3:

> radio and another critical system can remain operational longer.

Without battery:

> player may need to prioritize one system.

This is stronger than simply awarding:

`+2 Preparedness`

The earlier choice becomes gameplay.

---

# 53. DAY 3 CRISIS COUNT

Keep the number of major crises limited.

Recommended structure:

1. water/resource pressure,
2. power pressure,
3. radio/rescue communication,
4. final dilemma.

Do not turn Day 3 into another long sequence of unrelated quizzes.

---

# 54. RADIO AS A SIGNATURE MECHANIC

The radio should become one of Bunker 72's defining systems.

It should represent:

- uncertainty,
- information,
- hope,
- rescue.

The radio tuner should matter.

Do not reduce it to:

> tune once → receive +1 point.

---

# 55. RADIO INFORMATION

If feasible using the existing system, allow radio interaction to reveal small fragments of information.

Examples:

- official emergency broadcast,
- rescue coordination,
- unclear survivor transmission.

Do not dramatically expand the scope.

Even a small number of useful signals is enough.

---

# 56. RADIO PERFORMANCE

Use fail-forward.

Possible outcome state:

```js
radio_quality = "clear"
radio_quality = "weak"
radio_quality = "failed"
```

or equivalent flags.

### Clear
Rescue coordination is easier.

### Weak
SAR has incomplete information and rescue may be delayed.

### Failed
The family must rely more heavily on other rescue clues or prior preparation.

Do not force the player to replay the radio minigame until perfect.

---

# 57. BUNKER STATION MINIGAMES

Existing bunker station mechanics should be reused.

However, their results should ideally affect game state.

Examples:

### Rotor
Perfect:
stable result.

Several mistakes:
system works but uses more power.

Poor:
emergency mode works with a penalty.

### Patch cables
Perfect:
efficient power distribution.

Imperfect:
system works with lower efficiency.

The player should be able to continue.

---

# 58. REMOVE SECOND STRANGER / LOOTER PLOT

Remove the existing redundant later plot involving:

- another unknown group at the bunker,
- crowbars,
- looters,
- bunker invasion,
- violent retaliation,
- electrically shocking attackers.

Hendra is enough as the main external human dilemma.

The disaster itself is the antagonist.

The final tension should come from:

- time,
- scarcity,
- system failure,
- uncertainty,
- approaching rescue.

---

# 59. FINAL HOURS

Hours approximately 66–72 must become the most tense section.

The player should feel that:

- energy is running low,
- the radio is uncertain,
- resources matter,
- Maya and Sarah are exhausted,
- rescue is close,
- previous preparation determines available options.

Use restrained presentation.

Short moments are preferred over constant long narration.

Example tone:

```text
71:32

Radio:
"...Bunker... seven two... repeat coordinates..."

The lights go out.

Sarah:
"Mas?"

Aris looks at the battery indicator.

3%.
```

Use Indonesian in the actual game.

This example only demonstrates pacing.

---

# 60. THREE MAIN ENDINGS ONLY

The final game uses exactly three primary ending categories:

1. BAD
2. NORMAL
3. GOOD

No separate Best Ending.

No Secret Best.

No Secret Bad.

No playable 96-hour ending path.

---

# 61. BAD ENDING

Triggered when the family cannot successfully survive the final crisis.

Examples may include:

- Health reaches a fatal threshold,
- an essential survival condition collapses,
- critical state becomes unrecoverable.

Do not make the Bad Ending excessively graphic.

The focus is consequence and tragedy, not shock value.

---

# 62. NORMAL ENDING

The family survives and is rescued, but the result is imperfect.

Possible conditions:

- Preparedness mediocre,
- resources severely depleted,
- family health poor,
- rescue significantly delayed,
- multiple mitigation mistakes.

The emotional tone should be:

> relief mixed with consequences.

---

# 63. GOOD ENDING

The family survives with relatively stable conditions.

Possible requirements include:

- adequate Preparedness,
- acceptable Health,
- critical systems handled sufficiently well,
- rescue communication successful enough.

Do not require perfect play.

Do not require helping Hendra.

The Good Ending represents strong disaster management.

---

# 64. ENDING LOGIC MUST BE SIMPLE

The ending evaluator should remain easy to reason about and test.

Conceptually:

```js
if (fatalCondition) {
  ending = "bad";
} else if (
  preparedness >= GOOD_THRESHOLD &&
  health >= GOOD_HEALTH_THRESHOLD &&
  criticalSystemsStable
) {
  ending = "good";
} else {
  ending = "normal";
}
```

Exact thresholds must be balanced against the actual game.

Do not create dozens of ending-specific checks.

---

# 65. MODULAR EPILOGUE

The Telltale-style feeling comes primarily from the epilogue.

Players with the same main ending may receive different personal outcomes.

The epilogue is assembled from modules.

Possible categories:

### Rescue
- clear radio rescue,
- delayed rescue,
- Hendra-assisted localization.

### Aris & Sarah
- cooperation,
- trust,
- ignored advice,
- shared responsibility.

### Maya
- comforted,
- toy callback,
- emotionally distant,
- resilient.

### Hendra
- helped,
- guided,
- uncertain outcome.

### Bunker
- stable,
- damaged,
- filtration compromised,
- power depleted.

### Preparedness
- final educational evaluation.

---

# 66. EPILOGUE IMPLEMENTATION PHILOSOPHY

Prefer:

```js
if (maya_comforted) {
  epilogue.push("maya_positive");
}

if (helped_stranger) {
  epilogue.push("hendra_helped");
}

if (radio_quality === "weak") {
  epilogue.push("rescue_delayed");
}

if (structural_damage) {
  epilogue.push("bunker_damaged");
}
```

over creating separate full endings for every combination.

---

# 67. EDUCATIONAL DEBRIEF

After the narrative ending, provide a concise educational summary.

Example structure:

```text
BUNKER 72
72-HOUR REPORT

OUTCOME
GOOD — Stable Rescue

PREPAREDNESS
82%

KEY DECISIONS

✓ Inspected air filtration
✓ Preserved emergency power
✓ Maintained safe water
✕ Failed to secure additional medical supplies
```

The exact presentation should match the existing CRT interface.

---

# 68. PREPAREDNESS SCORE

Preparedness should primarily evaluate disaster-related performance.

Examples:

- ventilation,
- water safety,
- power,
- radio,
- resource preparation,
- structural awareness.

Do not directly award Preparedness points simply for helping Hendra or comforting Maya.

Moral and relationship choices belong in the epilogue.

---

# 69. FAMILY CONDITION

Do not add separate Hunger, Thirst, and Health bars for all three characters.

That would create unnecessary complexity.

The existing primary survival stats remain enough.

If needed, family-specific conditions should use lightweight flags or contextual states.

Examples:

```js
maya_exhausted
sarah_injured
aris_fatigued
```

Only add these when they create meaningful scenes.

---

# 70. INVENTORY

Keep the inventory small.

Do not add dozens of item types.

Use existing categories whenever possible:

- Food
- Water
- First Aid
- Radio
- Battery
- Mask/protection if required
- Maya's Toy

New items should only be introduced if they serve a clear gameplay callback.

---

# 71. RESOURCE BALANCING

The survival system should create pressure without becoming tedious.

Review existing Hunger and Thirst decay.

The player should not be able to ignore both systems for almost the entire 72 hours with no meaningful consequence.

At the same time:

do not turn Bunker 72 into a hardcore survival simulator.

Target:

> enough scarcity to create decisions.

Not:

> constant stat maintenance.

---

# 72. EDUCATION MUST REMAIN CENTRAL

This is a school project.

Educational value is a primary objective.

However, learning should happen through:

1. observing,
2. deciding,
3. acting,
4. seeing consequences,
5. receiving feedback.

Avoid:

1. reading a lesson,
2. selecting the obvious textbook answer,
3. receiving points.

---

# 73. REAL-WORLD ORGANIZATION TERMINOLOGY

Use Indonesian disaster-response organizations consistently.

General responsibility framing:

### PVMBG / Badan Geologi
Volcanic activity information.

### BMKG
Earthquake and tsunami-related monitoring/warnings.

### BNPB
Disaster management and coordination.

### Basarnas / SAR
Search and rescue.

Do not make unnecessary claims of perfect scientific simulation.

Preferred description:

> **Inspired by real disaster mitigation principles**

unless a specific mechanic has been carefully validated.

---

# 74. EXISTING ARCHITECTURE

Preserve the project's existing modular architecture.

General responsibility:

### GameModel
- state,
- inventory,
- Preparedness,
- Hunger,
- Thirst,
- Health,
- flags,
- ending evaluation.

### GameView
- DOM,
- HUD,
- dialogue rendering,
- hotspots,
- ending UI,
- visual presentation.

### StoryEngine
- scene flow,
- state orchestration,
- minigame transitions,
- save/load,
- audio triggers.

Do not perform a large architectural rewrite without necessity.

---

# 75. ARCHITECTURAL PRIORITY

The project already has substantial architecture.

Future work should prioritize:

> **player experience over architectural perfection.**

Do not refactor stable systems merely to make them theoretically cleaner.

---

# 76. REUSE EXISTING SYSTEMS

Prefer reuse of:

- scavenger top-down movement,
- bunker station minigames,
- radio tuner,
- inventory,
- state flags,
- StoryEngine,
- GameModel,
- save/load,
- typewriter,
- CRT UI,
- Web Audio,
- existing controls.

If one flag and conditional dialogue can solve a requirement, do not create a subsystem.

---

# 77. MOBILE

Desktop 16:9 remains the primary layout.

For mobile:

prefer **landscape gameplay**.

Do not spend major development effort attempting to transform complex bunker gameplay into a portrait interface.

Maintain existing touch support where possible.

---

# 78. NEW GAME+

New Game+ is secondary.

It must not complicate the core story implementation.

Core game completion takes priority.

If NG+ remains:

- use lightweight additional information,
- optional tactical hints,
- additional radio context.

Do not create NG+-exclusive major story branches.

---

# 79. SAVE / LOAD

New state must be serialized correctly.

Potential examples:

```js
promised_maya
maya_comforted
maya_toy_callback

inspected_ventilation
inspected_power
inspected_radio
found_spare_filter

extra_battery

helped_stranger
stranger_guided

radio_quality

expeditionVisitedLocations
expeditionVisitsRemaining
```

Exact names may change to match project conventions.

Save/load must not crash when new fields are absent.

Use safe defaults.

---

# 80. CONTENT TO REMOVE OR DEPRECATE

The final implementation should remove or safely deprecate obsolete content such as:

- playable Day 4,
- 96-hour story progression,
- Day 4 scavenging,
- Day 4 looters,
- secret Day 4 endings,
- duplicate ending variants,
- obsolete looter flags,
- obsolete Day 4 flags,
- second stranger plot,
- unreachable scenes,
- old packing menu if replaced by top-down scavenging,
- redundant moral-scoring logic.

Do not leave live references pointing to removed scene IDs.

---

# 81. DO NOT ADD THESE SYSTEMS

Do not add:

- combat,
- weapons gameplay,
- enemy AI,
- stealth systems,
- crafting,
- skill trees,
- RPG leveling,
- procedural generation,
- open world,
- multiplayer,
- complex NPC simulation,
- Day 4,
- dozens of stats,
- large new inventory systems,
- large new asset requirements.

---

# 82. NO NEW ASSETS REQUIRED

This redesign must not depend on new visual or audio assets.

Use:

- existing backgrounds,
- existing sprites,
- CSS effects,
- DOM elements,
- simple geometry,
- existing audio/procedural audio,
- existing UI.

Asset creation may happen separately in the future, but it is not required by this specification.

---

# 83. PRODUCTION-SCOPE RULE

Whenever two solutions provide similar player value:

choose the simpler implementation.

Example:

Prefer:

```text
flag + conditional dialogue
```

over:

```text
new relationship subsystem
```

Prefer:

```text
three small route maps
```

over:

```text
large open world
```

Prefer:

```text
limited inspection counter
```

over:

```text
complex action-point economy
```

---

# 84. STORY PACING TARGET

The player should remember each chapter differently.

### Prologue
"I had seconds to decide what to take."

### Day 1
"I had to understand what was inside the bunker."

### Day 2
"I had to leave my family and risk going outside."

### Day 3
"Everything I had done finally mattered."

That is the desired emotional progression.

---

# 85. TARGET PLAYTHROUGH LENGTH

Approximate target:

**20–40 minutes**

Do not extend playtime simply by adding more dialogue.

Replayability should come from:

- different items,
- different inspections,
- different expedition locations,
- different Hendra decisions,
- different resource outcomes,
- different epilogue combinations.

---

# 86. REPLAYABILITY MODEL

The game does not need eight completely separate endings.

Replayability comes from combinations.

Examples:

### Playthrough A
Toy + Medical Post + Hendra helped + strong radio.

### Playthrough B
No Toy + Minimarket + House + Hendra guided.

### Playthrough C
Technical preparation strong but family interactions weaker.

All may eventually reach the same main ending category while receiving different epilogues.

---

# 87. DEFINITION OF A GOOD BUNKER 72 DECISION

A strong decision should make the player think:

> "I understand why both options exist."

A weak decision makes the player think:

> "Obviously the developer wants me to click this one."

Rewrite weak decisions whenever practical.

---

# 88. DEFINITION OF A GOOD EDUCATIONAL MOMENT

Strong:

Player sees a dangerous electrical cable touching water and must find another route.

Weak:

Player is asked:

> "Should you touch an electrical cable in water?"

Education should preferably emerge through gameplay.

---

# 89. DEFINITION OF A GOOD CALLBACK

A callback should make the player realize:

> "This happened because of something I did earlier."

Examples:

- battery from minimarket helps the radio,
- Day 1 inspection provides a Day 3 option,
- Maya's toy returns,
- Hendra appears after rescue,
- poor preparation makes the final hours harder.

---

# 90. DEFINITION OF A GOOD MINIGAME

A minigame should:

- fit the world,
- be understandable quickly,
- take relatively little time,
- affect game state,
- avoid unnecessary repetition,
- preferably fail-forward.

A minigame should not exist solely because "the game needs more gameplay."

---

# 91. FINAL EXPERIENCE TARGET

The final Bunker 72 experience should create moments like:

> "We only have enough room for five things."

> "I can only inspect three systems."

> "I can only visit two locations."

> "The clinic has medicine, but the minimarket has batteries."

> "Hendra needs water, but Maya needs it too."

> "I'm glad I checked the power system yesterday."

> "I'm glad I brought Maya's toy."

> "The battery is almost gone."

> "SAR is finally answering."

> "The game remembered what I did."

---

# 92. FINAL DESIGN PRIORITIES

When making implementation decisions, use this priority order:

1. Core game works from beginning to end.
2. Narrative pacing is strong.
3. Player choices feel meaningful.
4. Educational material remains accurate and understandable.
5. Previous decisions create callbacks.
6. Existing systems are reused.
7. Bugs and state inconsistencies are minimized.
8. Replayability is supported.
9. Presentation is polished.
10. Additional features come last.

---

# 93. SUCCESS CRITERIA

The redesign is successful if:

- the game ends around 72 hours,
- there is no playable Day 4,
- Prologue uses timed top-down scavenging,
- Day 1 uses limited interactive bunker inspection,
- Day 2 is centered around an outside expedition,
- Day 2 contains exactly three main scavenging destinations,
- only two destinations may be visited per playthrough,
- Day 2 reuses top-down movement,
- hazards are primarily environmental rather than quiz choices,
- Hendra is encountered during the expedition,
- Hendra choices contain real trade-offs,
- Day 3 primarily pays off earlier choices,
- the radio has meaningful gameplay consequences,
- minigames use fail-forward where practical,
- Preparedness is distinct from morality,
- Maya receives meaningful callbacks,
- only Bad / Normal / Good main endings remain,
- Hendra is not mandatory for Good,
- modular epilogues reflect player decisions,
- educational debrief remains,
- no unnecessary complex systems are introduced,
- no new assets are required,
- save/load remains functional,
- the entire game can be completed without broken scene links or runtime errors.

---

# 94. FINAL RULE FOR FUTURE CODEX TASKS

Before implementing any redesign task:

1. Read this document completely.
2. Inspect the existing implementation relevant to the requested phase.
3. Reuse existing systems wherever practical.
4. Do not contradict this document without a concrete technical reason.
5. Do not redesign unrelated parts of the game.
6. Keep player-facing narrative and dialogue in natural Indonesian.
7. Keep implementation scope proportional to a school project.
8. Test the affected progression before declaring the task complete.

If a requested implementation detail is ambiguous:

choose the simplest solution that preserves the design intent of this document.

---

# 95. FINAL DESIGN STATEMENT

**Bunker 72 is a compact educational narrative survival game about preparation, family, scarcity, and consequence.**

It should not become:

- an open-world survival game,
- an action game,
- a disaster trivia quiz,
- or an overengineered simulation.

Its strength should come from:

**simple mechanics interacting with meaningful decisions.**

The desired result is approximately:

> **80% of the emotional consequence and responsiveness associated with Telltale-style narrative games, without requiring 100% of their branching complexity.**

Every major design decision should support that goal.