# 🧑‍💻 OPTIMAL SINGLE-AGENT WORKFLOW (BUNKER 72 SOLO DEVELOPMENT)

This document defines the highly optimized workflow, technical discipline, and self-verification protocols for a **Single Agent** (Solo Developer) to efficiently manage and build the **Bunker 72** project.

---

## 👥 Unified Agent Role & Mindset
As a Solo Agent, you act as the Chief Architect, Implementer, and QA Engineer all in one. You must balance speed with extreme technical discipline:
1. **The Planner (Architect)**: Gather context before coding. Never make assumptions. Map out dependencies.
2. **The Developer (Implementer)**: Write clean, precise, and decoupled code (following the strict MVC pattern). Keep changes atomic.
3. **The QA Inspector (Reviewer)**: Verify your own code. Audit cross-file dependencies. Never assume code is correct until the build passes and state logic is verified.

---

## 🔄 The Hyper-Optimal Solo Loop

```
            [ User Task / Feature Request ]
                           │
                           ▼
          Phase 1: Deep Search & Context Map
       -> Find relevant files & map out dependencies
                           │
                           ▼
             Phase 2: Incremental Planning
       -> Create a step-by-step atomic checklist
                           │
                           ▼
          Phase 3: Precise Code Implementation
       -> Edit files atomically, preserve comments & docs
                           │
                           ▼
         Phase 4: Continuous Build & Lint Checks
       -> Run 'npm run build' immediately after changes
                           │
                           ▼
           Phase 5: Self-Audit & QA Testing
       -> Simulate edge cases in DevTools, audit state
                           │
                           ▼
         Phase 6: Finalization & Concise Report
       -> Document changes, share test results & build status
```

---

## 🛠️ Phase-by-Phase Execution Protocol

### Phase 1: Deep Search & Context Map
Before editing any file:
*   Use `grep_search` and `list_dir` to locate the exact logic. Never guess paths or class names.
*   Check the Model-View-Controller boundaries:
    *   If changing **Model** (`GameModel`): Ensure no DOM references are introduced.
    *   If changing **View** (`GameView`): Ensure no state ownership is added.
    *   If changing **Controller** (`StoryEngine`/`Main`): Verify imports and module bindings.

### Phase 2: Incremental Planning
*   Break down the task into small, testable chunks.
*   Initialize or update the `task.md` checklist.
*   Order changes so that core dependencies (e.g., constants, helper functions) are created/modified first, followed by model state logic, controller coordination, and finally view styling.

### Phase 3: Precise Code Implementation
*   **Atomic Edits**: Use targeted replace tools (`replace_file_content` or `multi_replace_file_content`). Never overwrite whole files unless creating them from scratch.
*   **Preservation Rule**: Retain all existing third-party code, original comments, and unrelated utility functions to prevent accidental regressions.
*   **Decoupling**: Keep UI styles in CSS, state updates in the Model, and rendering triggers in the View.

### Phase 4: Continuous Build & Lint Checks
*   After editing a file, immediately run the build command (`npm run build` or `vite build`).
*   Catch syntax errors, import mismatches, and bundler issues early.
*   **Zero-Warning Policy**: Fix all linter warnings and compilation errors before proceeding to the next step.

### Phase 5: Self-Audit & QA Testing
*   **Visual Validation**: If CSS or HTML changed, verify responsiveness, portrait/landscape aspect ratios (16:9), and text overflow.
*   **State Simulation**: Open the browser's developer console and inject state parameters to force-test edge cases (e.g., health at `0`, recovery penalties, secret ending flags).
*   **Cross-File Audit**: Perform a mental diff walk of all modified files. Ensure state updates in the model correspond to render calls in the view.

### Phase 6: Finalization & Concise Report
Present a clean, high-level summary of your work:
*   **Changes Made**: Bullet points of files modified with clickable markdown links.
*   **Verification Status**: Confirmation that build passed and verification checklist succeeded.
*   **Test Results**: Key logs, screenshots (if generated), or console scripts used to verify.

---

## 🚦 Failsafe & Recovery Protocol
*   **3-Strike Rebuild Rule**: If the build fails more than 3 consecutive times on the same bug, stop. Revert the changes to the last known stable state (`git restore` or manual rollback), re-evaluate your approach, and look for root causes (e.g., circular dependencies, missing imports, or incorrect parameter types).
*   **Clarification Loop**: If a requirement is ambiguous or conflicts with the existing architecture, stop and ask the user for clarification. Do not make guesswork changes.
