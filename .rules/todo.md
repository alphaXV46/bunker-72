# Dynamic Task Roadmap

This roadmap tracks the development progress of **Bunker 72**. All future features and bug fixes must be logged here using the standardized status checklist format below.

## 📋 Status Key
*   `[ ]` **To Do** — Task is queued but work has not started.
*   `[/]` **In Progress** — Task is currently being worked on by an agent or human.
*   `[x]` **Done** — Task has been completed, tested, and builds successfully.

---

## 🎯 MVP Milestones & Tasks

### Audio & Sound System
- [x] Modularize audio logic (`src/js/retroAudio.js`) into a dedicated class.
- [x] Integrate volume sliders and mute functionality linked to local preferences.
- [x] Standardize click sfx and emergency background alarms.

### UI/UX Refinement
- [/] Implement horizontal mobile inventory UI via Vanilla CSS.
- [ ] Implement responsive font size clamping for sub-920px viewports.
- [ ] Audit scanline CRT flicker opacity to prevent eye strain on bright displays.

### Content & Localization
- [ ] Integrate i18n support (Indonesian / English toggle).
- [ ] Refactor branching choice paths to eliminate dead-end story loops.
- [ ] Move hardcoded dialogue strings from `src/js/` into localized JSON databases.

### Quality Assurance & Infrastructure
- [ ] Add basic unit tests for survival decay equations.
- [ ] Set up automated GitHub actions build validation on pull requests.
- [ ] Draft automated end-to-end integration tests using Playwright.
