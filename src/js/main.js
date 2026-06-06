import storyData from '../data/story.json';
import { StoryEngine } from './storyEngine.js';

// DOM Element Selectors
const dom = {
  menuView: document.getElementById('menu-view'),
  gameView: document.getElementById('game-view'),
  endingView: document.getElementById('ending-view'),
  
  newGameBtn: document.getElementById('new-game-btn'),
  continueBtn: document.getElementById('continue-btn'),
  restartBtn: document.getElementById('restart-btn'),
  
  statusTime: document.getElementById('status-time'),
  statusDay: document.getElementById('status-day'),
  statusKnowledge: document.getElementById('status-knowledge'),
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
  resourceItems: Array.from(document.querySelectorAll('.resource-item'))
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
  
  if (screenKey === 'menu') {
    dom.menuView.classList.add('active');
  } else if (screenKey === 'game') {
    dom.gameView.classList.add('active');
  } else if (screenKey === 'ending') {
    dom.endingView.classList.add('active');
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
      protocolLogList: dom.protocolLogList
    },
    
    // Callback to save progress
    onSave: (sceneId, knowledge, history) => {
      const saveData = { sceneId, knowledge, history };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    },
    
    // Callback when game ends
    onEnd: (endingId, finalKnowledge, endingText) => {
      // Clear save file since game is completed
      localStorage.removeItem(SAVE_KEY);
      
      // Update ending screen details
      dom.endingKnowledge.textContent = finalKnowledge;
      dom.endingDesc.textContent = endingText;
      dom.endingSummary.textContent = storyEngine.getEndingSummary();
      
      // Clear any prior ending classes
      dom.endingTitle.classList.remove('ending-bad', 'ending-normal', 'ending-best');
      dom.endingView.classList.remove('ending-bg-bad', 'ending-bg-normal', 'ending-bg-best');
      
      if (endingId === 'ending_bad') {
        dom.endingTitle.textContent = "ENDING BURUK: PENYELAMATAN DARURAT KRITIS";
        dom.endingTitle.classList.add('ending-bad');
        dom.endingView.classList.add('ending-bg-bad');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: KURANG (Keluarga Butuh Perawatan Intensif)";
        dom.endingGradeText.style.color = "var(--accent-red-border)";
      } else if (endingId === 'ending_normal') {
        dom.endingTitle.textContent = "ENDING NORMAL: BERTAHAN HIDUP DENGAN LUKA";
        dom.endingTitle.classList.add('ending-normal');
        dom.endingView.classList.add('ending-bg-normal');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: CUKUP (Keluarga Terluka/Dehidrasi)";
        dom.endingGradeText.style.color = "var(--warning-yellow-border)";
      } else if (endingId === 'ending_best') {
        dom.endingTitle.textContent = "ENDING TERBAIK: SELAMAT & PRIMA";
        dom.endingTitle.classList.add('ending-best');
        dom.endingView.classList.add('ending-bg-best');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: SANGAT BAIK (Keluarga Sehat & Selamat)";
        dom.endingGradeText.style.color = "var(--accent-green-border)";
      } else if (endingId === 'ending_fatal') {
        dom.endingTitle.textContent = "ENDING FATAL: MAKAM BUNKER 72";
        dom.endingTitle.classList.add('ending-bad');
        dom.endingView.classList.add('ending-bg-bad');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: SANGAT BURUK (Keluarga Gugur/Bunker Kebobolan)";
        dom.endingGradeText.style.color = "var(--accent-red-border)";
      } else if (endingId === 'ending_secret_best') {
        dom.endingTitle.textContent = "ENDING RAHASIA: PENYELAMATAN SEMPURNA";
        dom.endingTitle.classList.add('ending-best');
        dom.endingView.classList.add('ending-bg-best');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: LEGENDA (Keluarga Sehat, Aman & Selamat 96 Jam)";
        dom.endingGradeText.style.color = "var(--accent-green-border)";
      } else if (endingId === 'ending_secret_bad') {
        dom.endingTitle.textContent = "ENDING RAHASIA: GUGUR DI GARIS AKHIR";
        dom.endingTitle.classList.add('ending-bad');
        dom.endingView.classList.add('ending-bg-bad');
        dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: GAGAL (Krisis Hari Ke-4 Melumpuhkan Keluarga)";
        dom.endingGradeText.style.color = "var(--accent-red-border)";
      }
      
      // Transition screen
      showScreen('ending');
    }
  });

  // Setup Menu Button Listeners
  dom.newGameBtn.addEventListener('click', () => {
    localStorage.removeItem(SAVE_KEY);
    showScreen('game');
    // Start with 5 knowledge points out of 10
    storyEngine.start('day1_start', 5);
  });

  dom.continueBtn.addEventListener('click', () => {
    const saveData = checkSaveData();
    if (saveData) {
      showScreen('game');
      storyEngine.start(saveData.sceneId, saveData.knowledge, saveData.history || []);
    }
  });

  dom.restartBtn.addEventListener('click', () => {
    checkSaveData(); // Refresh Continue button state
    showScreen('menu');
  });

  // Initial load check
  checkSaveData();
}

// Start when document is ready
document.addEventListener('DOMContentLoaded', initGame);
