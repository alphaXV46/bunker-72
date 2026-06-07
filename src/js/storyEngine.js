import { GameModel } from './gameModel.js';
import { GameView } from './gameView.js';
import { RetroAudio } from './retroAudio.js';

const ENDING_IDS = ['ending_bad', 'ending_normal', 'ending_best', 'ending_fatal', 'ending_secret_best', 'ending_secret_bad'];

export class StoryEngine {
  constructor(options) {
    this.storyData = options.storyData;
    this.dom = options.dom;
    this.onSave = options.onSave;
    this.onEnd = options.onEnd;

    this.model = new GameModel();
    this.view = new GameView(this.dom);
    this.audio = new RetroAudio();
    this._journalSetup = false;
    this._volumeSetup = false;

    this.view.init(this);
  }

  start(sceneId, knowledge, history = [], flags = null, inventory = null, hunger, thirst, health) {
    this.model.init(sceneId, knowledge, history, flags, inventory, hunger, thirst, health);

    if (!this._journalSetup) {
      this.view.setupJournalToggle();
      this._journalSetup = true;
    }

    if (!this._volumeSetup) {
      this.view.setupVolumeControl(this.audio);
      this._volumeSetup = true;
    }

    this.view.renderProtocolLog(this.model.history);
    this.renderScene(this.model.currentSceneId);
  }

  checkFatalCondition(sceneId) {
    if (this.model.health <= 0 && sceneId !== 'ending_fatal') {
      this.model.health = 0;
      this.renderScene('ending_fatal');
      return true;
    }
    return false;
  }

  renderScene(sceneId) {
    if (this.checkFatalCondition(sceneId)) return;

    if (sceneId === 'trigger_ending_eval') {
      const targetSceneId = this.model.evaluateEnding();
      this.renderScene(targetSceneId);
      return;
    }
    if (sceneId === 'trigger_secret_ending_eval') {
      const targetSceneId = this.model.evaluateSecretEnding();
      this.renderScene(targetSceneId);
      return;
    }

    const scene = this.storyData.scenes[sceneId];
    if (!scene) {
      console.error(`Scene ${sceneId} not found in story data.`);
      return;
    }

    // Hitung waktu berlalu dan perbarui status survival
    const prevHour = this.storyData.scenes[this.model.currentSceneId] ? parseHour(this.storyData.scenes[this.model.currentSceneId].hour) : 0;
    const currHour = parseHour(scene.hour);
    const elapsed = currHour - prevHour;
    
    if (elapsed > 0 && !ENDING_IDS.includes(sceneId) && sceneId !== 'day1_start') {
      this.model.updateSurvivalStats(elapsed);
      if (this.checkFatalCondition(sceneId)) return;
    }

    this.model.currentSceneId = sceneId;
    this.view.updateInventoryUI(this.model.currentSceneId, this.model.inventory);

    const isEnding = ENDING_IDS.includes(sceneId);

    if (!isEnding && scene.focusItems && scene.focusItems.includes('radio')) {
      this.audio.playRadioSound(true);
    } else {
      this.audio.stopRadioSound();
    }

    if (!isEnding && this.onSave) {
      this.onSave(
        this.model.currentSceneId,
        this.model.knowledge,
        this.model.history,
        this.model.flags,
        this.model.inventory,
        this.model.hunger,
        this.model.thirst,
        this.model.health
      );
    }

    if (isEnding) {
      if (this.onEnd) this.onEnd(sceneId, this.model.knowledge, scene.text);
      return;
    }

    if (['day2_start', 'day2_damage_check', 'day4_intro'].includes(sceneId)) {
      this.audio.playRumble();
    }
    const isStructureCollapse = (sceneId === 'ending_secret_bad' || sceneId === 'ending_fatal');
    if (this.model.knowledge <= 4 || isStructureCollapse || scene.alert === true) {
      this.audio.playAlarm();
    }

    this.view.renderHud(
      scene,
      this.model.knowledge,
      this.model.currentSceneId,
      this.model.flags,
      this.model.hunger,
      this.model.thirst,
      this.model.health
    );
    this.view.renderResources(scene, this.model.inventory, this.model.knowledge, this.model.currentSceneId);
    this.view.renderSceneArt(scene, this.model.currentSceneId);
    this.view.renderSpeaker(scene);

    this.view.dom.choicesPanel.innerHTML = '';
    this.view.typeText(scene.text, () => {
      this.view.renderChoices(
        scene.choices,
        this.model.currentSceneId,
        this.storyData,
        this.model.flags,
        (choice) => this.handleChoiceSelect(choice)
      );
    });
  }

  handleChoiceSelect(choice) {
    if (this.view.isTyping) {
      this.view.skipTyping();
      return;
    }

    const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
    this.model.knowledge = Math.max(0, Math.min(15, this.model.knowledge + effect));
    
    // Peristiwa gempa tanpa perlindungan mengurangi Health sebesar 30
    if (choice.id === 'c_day2_panic_exit') {
      this.model.health = Math.max(0, this.model.health - 30);
    }

    this.model.history.push({
      hour: this.storyData.scenes[this.model.currentSceneId]?.hour || '--',
      text: choice.log || choice.text,
      choiceId: choice.id || null,
      effect
    });

    if (choice.setFlags && Array.isArray(choice.setFlags)) {
      choice.setFlags.forEach(f => {
        this.model.flags[f] = true;
      });
    }

    this.view.renderProtocolLog(this.model.history);

    const isBadChoice = (choice.knowledgeEffect < 0) || 
                        (choice.id === 'c_day2_panic_exit') || 
                        (choice.nextSceneId && choice.nextSceneId.includes('bad'));

    if (isBadChoice) {
      this.audio.playBadChoice();
    } else {
      this.audio.playClick();
    }

    this.renderScene(choice.nextSceneId);
  }

  handleInventoryClick(key) {
    if (key === 'radio') {
      const scene = this.storyData.scenes[this.model.currentSceneId];
      const hour = scene ? parseHour(scene.hour) : 0;
      if (hour >= 48 && this.model.knowledge <= 6) {
        this.audio.playRadioSound(false);
        return;
      }
      this.audio.playRadioSound(false);
      return;
    }

    const result = this.model.useInventoryItem(key);
    if (result) {
      const scene = this.storyData.scenes[this.model.currentSceneId];
      const hour = scene ? scene.hour : '--';
      this.model.history.push({
        hour: hour,
        text: `Menggunakan ${result.label} dari inventaris: ${result.effectText}`,
        effect: 0
      });

      this.audio.playClick();
      this.view.renderProtocolLog(this.model.history);
      
      if (this.checkFatalCondition(this.model.currentSceneId)) return;

      if (scene) {
        this.view.renderHud(
          scene,
          this.model.knowledge,
          this.model.currentSceneId,
          this.model.flags,
          this.model.hunger,
          this.model.thirst,
          this.model.health
        );
        this.view.renderResources(scene, this.model.inventory, this.model.knowledge, this.model.currentSceneId);
      }

      if (this.onSave && !ENDING_IDS.includes(this.model.currentSceneId)) {
        this.onSave(
          this.model.currentSceneId,
          this.model.knowledge,
          this.model.history,
          this.model.flags,
          this.model.inventory,
          this.model.hunger,
          this.model.thirst,
          this.model.health
        );
      }
    }
  }

  getEndingSummary() {
    return this.model.getEndingSummary();
  }
}

function parseHour(hourText) {
  const match = String(hourText || '0').match(/\d+/);
  return match ? Number(match[0]) : 0;
}
