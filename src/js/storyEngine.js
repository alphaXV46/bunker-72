import { GameModel } from './gameModel.js';
import { GameView } from './gameView.js';

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.staticNoiseBuffer = null;
    this.masterGain = null;
    this._lastVolume = 0.6;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._lastVolume;
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(value) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this.ctx.currentTime,
      0.05
    );
  }

  setMuted(muted) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      muted ? 0 : this._lastVolume,
      this.ctx.currentTime,
      0.05
    );
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playAlarm() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.3);
    osc.frequency.linearRampToValueAtTime(400, now + 0.6);
    osc.frequency.linearRampToValueAtTime(800, now + 0.9);
    osc.frequency.linearRampToValueAtTime(400, now + 1.2);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(now + 1.2);
  }

  playRadioStatic() {
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 1.0;
    if (!this.staticNoiseBuffer) {
      this.staticNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.staticNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.staticNoiseBuffer;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    
    gain.gain.setValueAtTime(0.04, now);
    for (let t = 0; t < 1.0; t += 0.15) {
      gain.gain.linearRampToValueAtTime(Math.random() * 0.06 + 0.01, now + t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    noiseNode.connect(gain);
    gain.connect(this.masterGain);

    noiseNode.start();
    noiseNode.stop(now + 1.0);
  }

  playRumble() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1.0);
    osc.frequency.linearRampToValueAtTime(48, this.ctx.currentTime + 1.5);
    osc.frequency.linearRampToValueAtTime(45, this.ctx.currentTime + 2.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(now + 2.0);
  }
}

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

  start(sceneId, knowledge, history = [], flags = null, inventory = null) {
    this.model.init(sceneId, knowledge, history, flags, inventory);

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

  renderScene(sceneId) {
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

    this.model.currentSceneId = sceneId;
    this.view.updateInventoryUI(this.model.currentSceneId, this.model.inventory);

    const isEnding = ENDING_IDS.includes(sceneId);
    if (!isEnding && this.onSave) {
      this.onSave(this.model.currentSceneId, this.model.knowledge, this.model.history, this.model.flags, this.model.inventory);
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

    this.view.renderHud(scene, this.model.knowledge, this.model.currentSceneId, this.model.flags);
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
    this.audio.playClick();
    this.renderScene(choice.nextSceneId);
  }

  handleInventoryClick(key) {
    if (key === 'radio') {
      const scene = this.storyData.scenes[this.model.currentSceneId];
      const hour = scene ? parseHour(scene.hour) : 0;
      if (hour >= 48 && this.model.knowledge <= 6) {
        this.audio.playRadioStatic();
        return;
      }
      this.audio.playRadioStatic();
      return;
    }

    const result = this.model.useInventoryItem(key);
    if (result) {
      const scene = this.storyData.scenes[this.model.currentSceneId];
      const hour = scene ? scene.hour : '--';
      this.model.history.push({
        hour: hour,
        text: `Menggunakan ${result.label} dari inventaris.`,
        effect: result.effect
      });

      this.audio.playClick();
      this.view.renderProtocolLog(this.model.history);
      
      if (scene) {
        this.view.renderHud(scene, this.model.knowledge, this.model.currentSceneId, this.model.flags);
        this.view.renderResources(scene, this.model.inventory, this.model.knowledge, this.model.currentSceneId);
      }

      if (this.onSave && !ENDING_IDS.includes(this.model.currentSceneId)) {
        this.onSave(this.model.currentSceneId, this.model.knowledge, this.model.history, this.model.flags, this.model.inventory);
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
