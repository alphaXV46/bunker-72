/**
 * main.js — Application Entry Point
 *
 * Responsibilities:
 *  - Cache DOM element references.
 *  - Manage top-level screen transitions (menu / game / ending / credits).
 *  - Initialize StoryEngine and wire menu button callbacks.
 *  - Own the save/load lifecycle via localStorage.
 *
 * Does NOT contain game logic. All game decisions belong to StoryEngine.
 */

import storyData from '../data/story.json';
import { StoryEngine } from './storyEngine.js';
import { SAVE_KEY, SURVIVAL } from './constants.js';

// ─── DOM REFERENCES ──────────────────────────────────────────────────────────
const dom = {
  // Screens
  menuView:    document.getElementById('menu-view'),
  gameView:    document.getElementById('game-view'),
  endingView:  document.getElementById('ending-view'),
  creditsView: document.getElementById('credits-view'),

  // Menu buttons
  newGameBtn:  document.getElementById('new-game-btn'),
  continueBtn: document.getElementById('continue-btn'),
  creditsBtn:  document.getElementById('credits-btn'),
  restartBtn:  document.getElementById('restart-btn'),

  // Credits / settings overlay buttons
  closeCreditsBtn: document.getElementById('close-credits-btn'),
  settingsMenuBtn: document.getElementById('settings-menu-btn'),
  settingsModal:   document.getElementById('settings-modal'),

  // HUD — status bar
  statusTime:        document.getElementById('status-time'),
  statusDay:         document.getElementById('status-day'),
  statusKnowledge:   document.getElementById('status-knowledge'),
  statusHunger:      document.getElementById('status-hunger'),
  statusThirst:      document.getElementById('status-thirst'),
  statusHealth:      document.getElementById('status-health'),
  statusProgressBar: document.getElementById('status-progress-bar'),
  statusObjective:   document.getElementById('status-objective'),
  statusAir:         document.getElementById('status-air'),
  statusStructure:   document.getElementById('status-structure'),
  statusPower:       document.getElementById('status-power'),

  // Dialogue
  storyBox:        document.getElementById('story-box'),
  speakerName:     document.getElementById('speaker-name'),
  speakerAvatar:   document.getElementById('speaker-avatar'),
  avatarContainer: document.getElementById('avatar-container'),
  dialogueText:    document.getElementById('dialogue-text'),

  // Choices / log
  choicesPanel:     document.getElementById('choices-panel'),
  protocolLogList:  document.getElementById('protocol-log-list'),

  // Ending screen
  endingTitle:     document.getElementById('ending-title'),
  endingDesc:      document.getElementById('ending-desc'),
  endingKnowledge: document.getElementById('ending-knowledge'),
  endingGradeText: document.getElementById('ending-grade-text'),
  endingSummary:   document.getElementById('ending-summary'),

  // Inventory icons
  resourceItems: Array.from(document.querySelectorAll('.resource-item')),
};

// ─── SAVE HELPERS ────────────────────────────────────────────────────────────

/**
 * Reads and validates a save from localStorage.
 * Enables or disables the Continue button accordingly.
 * @returns {object|null} Parsed save data, or null if none/invalid.
 */
function checkSaveData() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      const save = JSON.parse(raw);
      if (save?.sceneId && typeof save.knowledge === 'number') {
        dom.continueBtn.disabled = false;
        return save;
      }
    } catch (e) {
      console.error('[main] Corrupted save data — clearing:', e);
      localStorage.removeItem(SAVE_KEY);
    }
  }
  dom.continueBtn.disabled = true;
  return null;
}

// ─── SCREEN MANAGER ──────────────────────────────────────────────────────────

const SCREENS = ['menuView', 'gameView', 'endingView', 'creditsView'];

/**
 * Deactivates all screens and activates the requested one.
 * @param {'menu'|'game'|'ending'|'credits'} screenKey
 */
function showScreen(screenKey) {
  SCREENS.forEach((key) => dom[key]?.classList.remove('active'));
  const target = dom[`${screenKey}View`];
  if (target) target.classList.add('active');
}

// ─── INITIALISATION ──────────────────────────────────────────────────────────

let storyEngine = null;

function initGame() {
  storyEngine = new StoryEngine({
    storyData,
    dom: {
      statusTime:        dom.statusTime,
      statusDay:         dom.statusDay,
      statusKnowledge:   dom.statusKnowledge,
      statusHunger:      dom.statusHunger,
      statusThirst:      dom.statusThirst,
      statusHealth:      dom.statusHealth,
      statusProgressBar: dom.statusProgressBar,
      statusObjective:   dom.statusObjective,
      statusAir:         dom.statusAir,
      statusStructure:   dom.statusStructure,
      statusPower:       dom.statusPower,
      resourceItems:     dom.resourceItems,
      storyBox:          dom.storyBox,
      speakerName:       dom.speakerName,
      speakerAvatar:     dom.speakerAvatar,
      avatarContainer:   dom.avatarContainer,
      dialogueText:      dom.dialogueText,
      choicesPanel:      dom.choicesPanel,
      protocolLogList:   dom.protocolLogList,
      endingTitle:       dom.endingTitle,
      endingDesc:        dom.endingDesc,
      endingKnowledge:   dom.endingKnowledge,
      endingGradeText:   dom.endingGradeText,
      endingSummary:     dom.endingSummary,
      endingView:        dom.endingView,
    },

    // ✅ Single-object save callback — matches GameModel.toSaveData() shape.
    onSave: (saveData) => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    },

    // ✅ endingSummary is now a 4th argument, flags is 5th, history is 6th
    onEnd: (endingId, finalKnowledge, endingText, endingSummary, flags, history) => {
      localStorage.removeItem(SAVE_KEY); // clear save on completion
      storyEngine.view.renderEnding(endingId, finalKnowledge, endingText, endingSummary, flags, history);
      showScreen('ending');
    },
  });

  // ── Menu buttons ──
  dom.newGameBtn.addEventListener('click', () => {
    localStorage.removeItem(SAVE_KEY);
    showScreen('game');
    const { knowledge, hunger, thirst, health } = SURVIVAL.DEFAULTS;
    storyEngine.start('prolog_intro', knowledge, [], null, null, hunger, thirst, health);
  });

  dom.continueBtn.addEventListener('click', () => {
    const save = checkSaveData();
    if (!save) return;
    showScreen('game');
    storyEngine.start(
      save.sceneId,
      save.knowledge,
      save.history  ?? [],
      save.flags    ?? null,
      save.inventory ?? null,
      save.hunger,
      save.thirst,
      save.health,
    );
  });

  dom.restartBtn.addEventListener('click', () => {
    checkSaveData(); // refresh Continue button state
    showScreen('menu');
  });

  dom.creditsBtn?.addEventListener('click',      () => showScreen('credits'));
  dom.closeCreditsBtn?.addEventListener('click', () => showScreen('menu'));

  if (dom.settingsMenuBtn && dom.settingsModal) {
    dom.settingsMenuBtn.addEventListener('click', () => {
      dom.settingsModal.classList.add('hidden');
      checkSaveData();
      showScreen('menu');
    });
  }

  // Initial state check
  checkSaveData();

  // ── Audio context bootstrap ──
  // AudioContext must be created (or resumed) in response to a user gesture.
  // This one-shot handler fires on the very first interaction.
  const initAudioOnFirstInteraction = () => {
    storyEngine?.audio.init();
    document.removeEventListener('click',   initAudioOnFirstInteraction);
    document.removeEventListener('keydown', initAudioOnFirstInteraction);
  };
  document.addEventListener('click',   initAudioOnFirstInteraction);
  document.addEventListener('keydown', initAudioOnFirstInteraction);
}

document.addEventListener('DOMContentLoaded', initGame);
