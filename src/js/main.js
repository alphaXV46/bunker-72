import storyData from '../data/story.json';
import { StoryEngine } from './storyEngine.js';

// DOM Element Selectors
const dom = {
  menuView: document.getElementById('menu-view'),
  gameView: document.getElementById('game-view'),
  endingView: document.getElementById('ending-view'),
  
  newGameBtn: document.getElementById('new-game-btn'),
  continueBtn: document.getElementById('continue-btn'),
  creditsBtn: document.getElementById('credits-btn'),
  restartBtn: document.getElementById('restart-btn'),
  
  creditsView: document.getElementById('credits-view'),
  closeCreditsBtn: document.getElementById('close-credits-btn'),
  
  statusTime: document.getElementById('status-time'),
  statusDay: document.getElementById('status-day'),
  statusKnowledge: document.getElementById('status-knowledge'),
  statusHunger: document.getElementById('status-hunger'),
  statusThirst: document.getElementById('status-thirst'),
  statusHealth: document.getElementById('status-health'),
  statusProgressBar: document.getElementById('status-progress-bar'),
  statusObjective: document.getElementById('status-objective'),
  statusAir: document.getElementById('status-air'),
  statusStructure: document.getElementById('status-structure'),
  statusPower: document.getElementById('status-power'),
  
  storyBox: document.getElementById('story-box'),
  speakerName: document.getElementById('speaker-name'),
  speakerAvatar: document.getElementById('speaker-avatar'),
  avatarContainer: document.getElementById('avatar-container'),
  dialogueText: document.getElementById('dialogue-text'),
  
  choicesPanel: document.getElementById('choices-panel'),
  protocolLogList: document.getElementById('protocol-log-list'),
  
  endingTitle: document.getElementById('ending-title'),
  endingDesc: document.getElementById('ending-desc'),
  endingKnowledge: document.getElementById('ending-knowledge'),
  endingGradeText: document.getElementById('ending-grade-text'),
  endingSummary: document.getElementById('ending-summary'),
  resourceItems: Array.from(document.querySelectorAll('.resource-item')),
  settingsMenuBtn: document.getElementById('settings-menu-btn'),
  settingsModal: document.getElementById('settings-modal')
};

const SAVE_KEY = 'bunker72_save_v1';
let storyEngine = null;

// Check if a saved game exists in localStorage
function checkSaveData() {
  const saveRaw = localStorage.getItem(SAVE_KEY);
  if (saveRaw) {
    try {
      const saveData = JSON.parse(saveRaw);
      if (saveData && saveData.sceneId && typeof saveData.knowledge === 'number') {
        dom.continueBtn.disabled = false;
        return saveData;
      }
    } catch (e) {
      console.error("Corrupted save data found:", e);
      localStorage.removeItem(SAVE_KEY);
    }
  }
  dom.continueBtn.disabled = true;
  return null;
}

// Switch between screen views
function showScreen(screenKey) {
  dom.menuView.classList.remove('active');
  dom.gameView.classList.remove('active');
  dom.endingView.classList.remove('active');
  if (dom.creditsView) dom.creditsView.classList.remove('active');
  
  if (screenKey === 'menu') {
    dom.menuView.classList.add('active');
  } else if (screenKey === 'game') {
    dom.gameView.classList.add('active');
  } else if (screenKey === 'ending') {
    dom.endingView.classList.add('active');
  } else if (screenKey === 'credits') {
    dom.creditsView.classList.add('active');
  }
}

// Initialize the Game
function initGame() {
  // Create Story Engine instance
  storyEngine = new StoryEngine({
    storyData: storyData,
    dom: {
      statusTime: dom.statusTime,
      statusDay: dom.statusDay,
      statusKnowledge: dom.statusKnowledge,
      statusHunger: dom.statusHunger,
      statusThirst: dom.statusThirst,
      statusHealth: dom.statusHealth,
      statusProgressBar: dom.statusProgressBar,
      statusObjective: dom.statusObjective,
      statusAir: dom.statusAir,
      statusStructure: dom.statusStructure,
      statusPower: dom.statusPower,
      resourceItems: dom.resourceItems,
      storyBox: dom.storyBox,
      speakerName: dom.speakerName,
      speakerAvatar: dom.speakerAvatar,
      avatarContainer: dom.avatarContainer,
      dialogueText: dom.dialogueText,
      choicesPanel: dom.choicesPanel,
      protocolLogList: dom.protocolLogList,
      
      endingTitle: dom.endingTitle,
      endingDesc: dom.endingDesc,
      endingKnowledge: dom.endingKnowledge,
      endingGradeText: dom.endingGradeText,
      endingSummary: dom.endingSummary,
      endingView: dom.endingView
    },
    
    // Callback to save progress
    onSave: (sceneId, knowledge, history, flags, inventory, hunger, thirst, health) => {
      const saveData = { sceneId, knowledge, history, flags, inventory, hunger, thirst, health };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    },
    
    // Callback when game ends
    onEnd: (endingId, finalKnowledge, endingText) => {
      // Clear save file since game is completed
      localStorage.removeItem(SAVE_KEY);
      
      // Update ending screen details via GameView
      storyEngine.view.renderEnding(endingId, finalKnowledge, endingText);
      
      // Transition screen
      showScreen('ending');
    }
  });

  // Setup Menu Button Listeners
  dom.newGameBtn.addEventListener('click', () => {
    localStorage.removeItem(SAVE_KEY);
    showScreen('game');
    // Start with 5 knowledge points, and full survival stats
    storyEngine.start('day1_start', 5, [], null, null, 100, 100, 100);
  });

  dom.continueBtn.addEventListener('click', () => {
    const saveData = checkSaveData();
    if (saveData) {
      showScreen('game');
      storyEngine.start(
        saveData.sceneId,
        saveData.knowledge,
        saveData.history || [],
        saveData.flags || null,
        saveData.inventory || null,
        saveData.hunger,
        saveData.thirst,
        saveData.health
      );
    }
  });

  dom.restartBtn.addEventListener('click', () => {
    checkSaveData(); // Refresh Continue button state
    showScreen('menu');
  });

  if (dom.creditsBtn) {
    dom.creditsBtn.addEventListener('click', () => {
      showScreen('credits');
    });
  }

  if (dom.closeCreditsBtn) {
    dom.closeCreditsBtn.addEventListener('click', () => {
      showScreen('menu');
    });
  }

  if (dom.settingsMenuBtn && dom.settingsModal) {
    dom.settingsMenuBtn.addEventListener('click', () => {
      dom.settingsModal.classList.add('hidden');
      checkSaveData();
      showScreen('menu');
    });
  }

  // Initial load check
  checkSaveData();

  // Resume or initialize audio context on first user click
  const initAudioOnFirstClick = () => {
    if (storyEngine && storyEngine.audio) {
      storyEngine.audio.init();
    }
    document.removeEventListener('click', initAudioOnFirstClick);
    document.removeEventListener('keydown', initAudioOnFirstClick);
  };
  document.addEventListener('click', initAudioOnFirstClick);
  document.addEventListener('keydown', initAudioOnFirstClick);
}

// Start when document is ready
document.addEventListener('DOMContentLoaded', initGame);
