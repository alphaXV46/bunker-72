# System Architecture & Integration Rules

## 1. Architectural Pattern: Model-View-Controller (MVC)
Bunker 72 is structured using a strict Model-View-Controller pattern. Developers must preserve this decoupling of state, rendering, and logic progression.

```
       ┌────────────────────────┐
       │     StoryEngine        │◀┐
       │    (Controller)        │ │ User Interactions
       └────────────────────────┘ │ (Buttons, Keys, Clicks)
         │                    │   │
         │ Updates            │ Calls
         ▼                    ▼   │
┌────────────────┐    ┌────────────────┐
│   GameModel    │    │    GameView    │
│  (State/Logic) │    │(DOM/Rendering) │
└────────────────┘    └────────────────┘
```

---

## 2. Rigid Separation of Concerns

### 2.1 Model Layer (`src/js/gameModel.js`)
*   **Role:** Holds, mutates, and serializes the complete game state.
*   **Strict Constraints:**
    *   **NO DOM References:** Must never contain `document.querySelector`, `window.addEventListener`, or any HTML elements.
    *   **NO Audio or UI Callbacks:** Must not interact with the audio engines or prompt alerts.
    *   **Pure Functions:** All state adjustments (decay, usage of items, ending determination) must be pure transformations of local instance variables.
    *   **Data Integrity:** State values must always be clamped via constants to prevent out-of-bounds metrics (e.g., stats clamped between `0` and `100`).

### 2.2 View Layer (`src/js/gameView.js`)
*   **Role:** Performs DOM selection, layout updating, animation triggers, and visual states.
*   **Strict Constraints:**
    *   **NO State Ownership:** Must not store game variables (e.g., `hunger`, `health`, `knowledge`) directly.
    *   **Decoupled Parameters:** Must receive all metrics to render as explicit arguments from the Controller.
    *   **NO Navigation of the Controller Graph:** Must never access model properties directly (e.g., `this.controller.model.health` is strictly forbidden). Use parameters or structured read-only payloads.
    *   **Typewriter Animations:** Handles all dialogue progression, ensuring event handlers (such as skipping text) are safely managed inside the view using `requestAnimationFrame`.

### 2.3 Controller Layer (`src/js/storyEngine.js` & `src/js/main.js`)
*   **Role:** The mediator that coordinates user inputs, model updates, view updates, save data operations, and audio triggers.
*   **Core Tasks:**
    *   Catch UI events (e.g., choice button clicks, inventory hotkey presses) forwarded from `GameView`.
    *   Invoke mutation methods on `GameModel`.
    *   Query updated stats from the model and pass them into the `GameView` rendering functions.
    *   Load and parse the JSON story database, progressing narrative branches based on state evaluation flags.

---

## 3. Import & Module Rules
*   **Explicit File Extensions:** You **MUST** use explicit `.js` extensions for all local ES Module imports.
    *   *Correct:* `import { clamp } from './constants.js';`
    *   *Incorrect:* `import { clamp } from './constants';`
*   **Vite Path Aliasing:** You may use the `@/` alias mapped to the `src/` directory where applicable (e.g., `import '@/styles/main.css'`), as resolved in `vite.config.js`.
*   **No Redundant State:** Do not redefine defaults or configurations in multiple files. Consolidate them in `src/js/constants.js`.
