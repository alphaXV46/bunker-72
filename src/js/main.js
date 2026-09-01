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
import { SAVE_KEY, SAVE_SCHEMA_VERSION, SURVIVAL } from './constants.js';
import { preloadAssets } from './assetLoader.js';
import { RadioMiniGame } from './radioMiniGame.js';

// ─── DOM REFERENCES ──────────────────────────────────────────────────────────
const dom = {
  // Screens
  loadingScreen:     document.getElementById('loading-screen'),
  loadingBarFill:    document.getElementById('loading-bar-fill'),
  loadingPercent:    document.getElementById('loading-percent'),
  loadingStatusText: document.getElementById('loading-status-text'),
  menuView:          document.getElementById('menu-view'),
  gameView:          document.getElementById('game-view'),
  endingView:        document.getElementById('ending-view'),
  creditsView:       document.getElementById('credits-view'),

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
  bunkerMinigame:   document.getElementById('bunker-minigame'),

  // Ending screen
  endingTitle:     document.getElementById('ending-title'),
  endingDesc:      document.getElementById('ending-desc'),
  endingKnowledge: document.getElementById('ending-knowledge'),
  endingGradeText: document.getElementById('ending-grade-text'),
  endingSummary:   document.getElementById('ending-summary'),
  endingStats:     document.querySelector('.ending-stats'),

  // Inventory icons
  resourceItems: Array.from(document.querySelectorAll('.resource-item')),
};

// ─── SAVE HELPERS ────────────────────────────────────────────────────────────

const INITIAL_SCENE_ID = 'prolog_home';
const SUPPORTED_RUNTIME_SCENES = new Set([
  'ending_eval',
  'trigger_ending_eval',
  'day3_pinch_water_resolved',
  'day3_pinch_vent_inspected',
]);
const LEGACY_DAY4_SCENES = new Set([
  'trigger_secret_ending_eval',
  'ending_best',
  'ending_secret_best',
  'ending_secret_bad',
  'ending_stranded_bad',
  'ending_near_miss',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createFreshSave(loadNotice) {
  return {
    version: SAVE_SCHEMA_VERSION,
    sceneId: INITIAL_SCENE_ID,
    knowledge: SURVIVAL.DEFAULTS.knowledge,
    history: [],
    flags: {},
    inventory: { food: 0, drink: 0, kit: 0 },
    hunger: SURVIVAL.DEFAULTS.hunger,
    thirst: SURVIVAL.DEFAULTS.thirst,
    health: SURVIVAL.DEFAULTS.health,
    loadNotice,
  };
}

function normalizeSaveData(save) {
  if (!isPlainObject(save)) return null;

  const storedSceneId = typeof save.sceneId === 'string' ? save.sceneId : '';
  const isLegacyDay4 = storedSceneId.startsWith('day4_') || LEGACY_DAY4_SCENES.has(storedSceneId);
  const isValidScene = Boolean(storyData.scenes[storedSceneId]) || SUPPORTED_RUNTIME_SCENES.has(storedSceneId);

  if (!isValidScene && !isLegacyDay4) {
    return createFreshSave('Save lama menunjuk adegan yang sudah tidak tersedia. Permainan dimulai kembali dengan aman.');
  }

  return {
    version: SAVE_SCHEMA_VERSION,
    sceneId: isLegacyDay4 ? 'ending_eval' : storedSceneId,
    knowledge: typeof save.knowledge === 'number' ? save.knowledge : SURVIVAL.DEFAULTS.knowledge,
    history: Array.isArray(save.history) ? save.history : [],
    flags: isPlainObject(save.flags) ? save.flags : null,
    inventory: isPlainObject(save.inventory) ? save.inventory : {},
    hunger: save.hunger,
    thirst: save.thirst,
    health: save.health,
    loadNotice: isLegacyDay4
      ? 'Save Day 4 lama dipindahkan ke evaluasi akhir jam ke-72.'
      : null,
  };
}

/**
 * Reads and validates a save from localStorage.
 * Enables or disables the Continue button accordingly.
 * @returns {object|null} Parsed save data, or null if none/invalid.
 */
function checkSaveData() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try {
      const save = normalizeSaveData(JSON.parse(raw));
      if (save) {
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

  if (screenKey !== 'game') {
    storyEngine?.audio.stopAll();
  }
}

// ─── INITIALISATION ──────────────────────────────────────────────────────────

let storyEngine = null;

async function initGame() {
  try {
    // Preload fonts and all assets with real-time progress updates
    await preloadAssets((percent, loaded, total) => {
      if (dom.loadingBarFill) dom.loadingBarFill.style.width = `${percent}%`;
      if (dom.loadingPercent) dom.loadingPercent.textContent = `${percent}%`;
      if (dom.loadingStatusText) {
        dom.loadingStatusText.textContent = `MEMUAT ASET (${loaded}/${total})...`;
      }
    });

    if (dom.loadingBarFill) dom.loadingBarFill.style.width = '100%';
    if (dom.loadingPercent) dom.loadingPercent.textContent = '100%';
    if (dom.loadingStatusText) dom.loadingStatusText.textContent = 'SEMUA ASET SIAP!';
    // Brief 200ms pause so player sees 100% readiness
    await new Promise((res) => setTimeout(res, 200));
  } catch (err) {
    console.warn('[main] Asset preloading warning, continuing startup:', err);
  }

  // Hide loading screen and reveal main menu
  if (dom.loadingScreen) {
    dom.loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      dom.loadingScreen.classList.remove('active');
    }, 450);
  }
  showScreen('menu');

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
      bunkerMinigame:    dom.bunkerMinigame,
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

    // ✅ endingSummary is 4th argument, flags is 5th, history is 6th, modularEnding is 7th
    onEnd: (endingId, finalKnowledge, endingText, endingSummary, flags, history, modularEnding) => {
      localStorage.removeItem(SAVE_KEY); // clear save on completion
      storyEngine.view.renderEnding(endingId, finalKnowledge, endingText, endingSummary, flags, history, modularEnding);
      showScreen('ending');
    },
  });

  // Immediately initialize volume controls so settings modal works from the main menu
  storyEngine.view.setupVolumeControl(storyEngine.audio);

  // Wire Radio Frequency Tuning Mini-Game
  const radioModalEl = document.getElementById('radio-minigame-modal');
  if (radioModalEl) {
    storyEngine.radioMiniGame = new RadioMiniGame({
      modalEl: radioModalEl,
      audio: storyEngine.audio,
      onSuccess: (broadcastText) => {
        const isFirstReward = storyEngine.model.flags.radio_reward_claimed !== true;
        if (isFirstReward) {
          storyEngine.model.modifyKnowledge(1);
          storyEngine.model.setFlag('radio_reward_claimed');
          storyEngine.view.pulseKnowledge(1);
        }
        const scene = storyEngine.storyData.scenes[storyEngine.model.currentSceneId];
        if (scene) {
          storyEngine.view.renderHud(
            scene, storyEngine.model.knowledge, storyEngine.model.currentSceneId,
            storyEngine.model.flags, storyEngine.model.hunger, storyEngine.model.thirst, storyEngine.model.health
          );
        }
        if (isFirstReward) {
          storyEngine.model.history.push({
            hour: scene?.hour ?? '--',
            text: `[MINI-GAME] Radio VHF Terkunci: ${broadcastText}`,
            choiceId: null,
            effect: 1,
          });
        }
        storyEngine.view.renderProtocolLog(storyEngine.model.history);
        storyEngine.onSave?.(storyEngine.model.toSaveData());
      },
    });
  }

  const quickRadioBtn = document.getElementById('quick-radio-btn');
  if (quickRadioBtn) {
    quickRadioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      storyEngine?.radioMiniGame?.open();
    });
  }

  // ── Menu buttons sound & interaction ──
  const menuButtons = document.querySelectorAll('.bunker-menu-btn');
  menuButtons.forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        storyEngine?.audio?.playHover();
      }
    });
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        storyEngine?.audio?.playClick();
      }
    });
  });

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('mouseenter', () => storyEngine?.audio?.playHover());
    settingsBtn.addEventListener('click', () => storyEngine?.audio?.playClick());
  }

  // ── Menu buttons ──
  dom.newGameBtn.addEventListener('click', () => {
    localStorage.removeItem(SAVE_KEY);
    showScreen('game');
    storyEngine.audio.playBGM();
    const { knowledge, hunger, thirst, health } = SURVIVAL.DEFAULTS;
    storyEngine.start('prolog_home', knowledge, [], null, { food: 0, drink: 0, kit: 0 }, hunger, thirst, health);
  });

  dom.continueBtn.addEventListener('click', () => {
    const save = checkSaveData();
    if (!save) return;
    showScreen('game');
    storyEngine.audio.playBGM();
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
    if (save.loadNotice) {
      storyEngine.view.showTelltaleToast(save.loadNotice);
    }
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

  window.addEventListener('pagehide', () => storyEngine?.audio.stopAll());
  window.addEventListener('beforeunload', () => storyEngine?.audio.stopAll());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) storyEngine?.audio.stopAll();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

