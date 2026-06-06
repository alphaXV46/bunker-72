class RetroAudio {
  constructor() {
    this.ctx = null;
    this.staticNoiseBuffer = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
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
    gain.connect(this.ctx.destination);
    
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
    gain.connect(this.ctx.destination);

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
    for (let t = 0.1; t < 1.0; t += 0.15) {
      gain.gain.linearRampToValueAtTime(Math.random() * 0.06 + 0.01, now + t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    noiseNode.connect(gain);
    gain.connect(this.ctx.destination);

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
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 2.0);
  }
}

const ENDING_IDS = ['ending_bad', 'ending_normal', 'ending_best', 'ending_fatal', 'ending_secret_best', 'ending_secret_bad'];
const AVATARS = {
  ayah: new URL('../assets/avatar_ayah.png', import.meta.url).href,
  ibu: new URL('../assets/avatar_ibu.png', import.meta.url).href,
  anak: new URL('../assets/avatar_anak.png', import.meta.url).href,
  narrator: new URL('../assets/avatar_narrator.png', import.meta.url).href
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseHour(hourText) {
  const match = String(hourText || '0').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function labelForEffect(effect) {
  if (effect > 0) return `+${effect} kesiapsiagaan`;
  if (effect < 0) return `${effect} kesiapsiagaan`;
  return 'netral';
}

export class StoryEngine {
  constructor(options) {
    this.storyData = options.storyData;
    this.dom = options.dom;
    this.onSave = options.onSave;
    this.onEnd = options.onEnd;

    this.currentSceneId = 'day1_start';
    this.knowledge = 5;
    this.history = [];
    this.isTyping = false;
    this.typingTimeoutId = null;
    this.activeText = '';
    
    this.flags = {};
    this.inventory = { food: 2, drink: 2, kit: 1 };
    this.audio = new RetroAudio();

    this.setupListeners();
    this.setupInventoryListeners();
  }

  setupListeners() {
    const dialogueOverlay = this.dom.storyBox.querySelector('.dialogue-overlay');
    if (dialogueOverlay) {
      dialogueOverlay.addEventListener('click', () => {
        if (this.isTyping) this.skipTyping();
      });
    }

    window.addEventListener('keydown', (event) => {
      if (!this.dom.choicesPanel || !this.dom.choicesPanel.children.length) return;
      const keyNumber = Number(event.key);
      if (!Number.isInteger(keyNumber) || keyNumber < 1 || keyNumber > 3) return;
      const button = this.dom.choicesPanel.children[keyNumber - 1];
      if (button) button.click();
    });
  }

  isInventoryDisabledScene(sceneId) {
    const disabledScenes = ['ending_eval', 'day4_eval', 'trigger_ending_eval', 'trigger_secret_ending_eval'];
    return disabledScenes.includes(sceneId) || ENDING_IDS.includes(sceneId);
  }

  setupInventoryListeners() {
    this.dom.resourceItems.forEach((item) => {
      item.addEventListener('click', () => {
        if (this.isInventoryDisabledScene(this.currentSceneId)) {
          return;
        }

        const key = item.dataset.resource;
        const scene = this.storyData.scenes[this.currentSceneId];
        const hour = scene ? scene.hour : '--';

        if (key === 'radio') {
          this.audio.playRadioStatic();
          return;
        }

        if (this.inventory[key] && this.inventory[key] > 0) {
          this.inventory[key] -= 1;
          const effect = (key === 'kit') ? 2 : 1;
          this.knowledge = clamp(this.knowledge + effect, 0, 15);
          
          const label = key === 'food' ? 'Makanan' : key === 'drink' ? 'Air' : 'P3K';
          this.history.push({
            hour: hour,
            text: `Menggunakan ${label} dari inventaris.`,
            effect: effect
          });

          this.audio.playClick();
          this.renderProtocolLog();
          if (scene) {
            this.renderHud(scene);
            this.renderResources(scene);
          }
          this.updateInventoryUI();

          if (this.onSave && !ENDING_IDS.includes(this.currentSceneId)) {
            this.onSave(this.currentSceneId, this.knowledge, this.history, this.flags, this.inventory);
          }
        }
      });
    });
  }

  updateInventoryUI() {
    if (!this.dom.resourceItems) return;

    const isDisabledScene = this.isInventoryDisabledScene(this.currentSceneId);

    this.dom.resourceItems.forEach((item) => {
      const key = item.dataset.resource;
      const countEl = document.getElementById(`count-${key}`);
      
      if (key === 'radio') {
        if (countEl) countEl.textContent = '∞';
        if (isDisabledScene) {
          item.classList.add('disabled');
        } else {
          item.classList.remove('disabled');
        }
        return;
      }

      const count = this.inventory[key] || 0;
      if (countEl) countEl.textContent = count;

      if (isDisabledScene || count <= 0) {
        item.classList.add('disabled');
      } else {
        item.classList.remove('disabled');
      }
    });
  }

  start(sceneId, knowledge, history = [], flags = null, inventory = null) {
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge = typeof knowledge === 'number' ? knowledge : 5;
    this.history = Array.isArray(history) ? history : [];
    
    this.inventory = inventory || { food: 2, drink: 2, kit: 1 };
    
    if (flags) {
      this.flags = flags;
    } else {
      this.flags = {
        structural_damage: this.history.some(h => h.text === "Hampir membuka pintu keluar dalam kondisi panik."),
        radio_saved: this.history.some(h => h.text === "Radio dipakai dengan jadwal hemat baterai."),
        power_saved: this.history.some(h => h.text === "Daya bunker dialihkan ke mode hemat."),
        water_filtered: this.history.some(h => h.text === "Air disaring filter karbon dan klorin."),
        door_opened: this.history.some(h => h.text === "Pintu dibuka untuk pihak tak verifikasi.")
      };
    }

    this.renderProtocolLog();
    this.renderScene(this.currentSceneId);
    this.updateInventoryUI();
  }

  renderScene(sceneId) {
    if (sceneId === 'trigger_ending_eval') {
      this.evaluateEnding();
      return;
    }
    if (sceneId === 'trigger_secret_ending_eval') {
      this.evaluateSecretEnding();
      return;
    }

    const scene = this.storyData.scenes[sceneId];
    if (!scene) {
      console.error(`Scene ${sceneId} not found in story data.`);
      return;
    }

    this.currentSceneId = sceneId;
    this.updateInventoryUI();

    const isEnding = ENDING_IDS.includes(sceneId);
    if (!isEnding && this.onSave) {
      this.onSave(this.currentSceneId, this.knowledge, this.history, this.flags, this.inventory);
    }

    if (isEnding) {
      if (this.onEnd) this.onEnd(sceneId, this.knowledge, scene.text);
      return;
    }

    if (['day2_start', 'day2_damage_check', 'day4_intro'].includes(sceneId)) {
      this.audio.playRumble();
    }
    const isStructureCollapse = (sceneId === 'ending_secret_bad' || sceneId === 'ending_fatal');
    if (this.knowledge <= 4 || isStructureCollapse || scene.alert === true) {
      this.audio.playAlarm();
    }

    this.renderHud(scene);
    this.renderResources(scene);
    this.renderSceneArt(scene);
    this.renderSpeaker(scene);

    this.dom.choicesPanel.innerHTML = '';
    this.typeText(scene.text, () => this.renderChoices(scene.choices));
  }

  renderHud(scene) {
    const hour = parseHour(scene.hour);
    const day = clamp(Math.floor(hour / 24) + 1, 1, 4);

    const isDay4 = hour > 72 || this.currentSceneId.startsWith('day4');
    const maxHour = isDay4 ? 96 : 72;
    const progress = clamp((hour / maxHour) * 100, 0, 100);

    this.dom.statusTime.textContent = scene.hour;
    this.dom.statusDay.textContent = day;
    this.dom.statusKnowledge.textContent = this.knowledge;
    this.dom.statusProgressBar.style.width = `${progress}%`;
    this.dom.statusObjective.textContent = scene.objective || 'Ambil keputusan paling aman untuk keluarga.';

    this.dom.statusAir.textContent = this.knowledge <= 4 ? 'KRITIS' : this.knowledge <= 8 ? 'WASPADA' : 'STABIL';
    
    const hasStructuralDamage = this.flags.structural_damage === true;
    let structureText = 'AMAN';
    if (this.currentSceneId === 'ending_secret_bad' || this.currentSceneId === 'ending_fatal') {
      structureText = 'RUNTUH';
    } else if (hasStructuralDamage || scene.background === 'rusak') {
      structureText = 'RETAK';
    }
    this.dom.statusStructure.textContent = structureText;

    let powerText = 'NORMAL';
    if (hour >= 78) {
      const hasSavedPower = this.flags.power_saved === true;
      powerText = hasSavedPower ? 'DARURAT' : 'PADAM';
    } else if (hour >= 54) {
      powerText = 'DARURAT';
    } else if (hour >= 44) {
      powerText = 'HEMAT';
    } else {
      powerText = 'NORMAL';
    }
    this.dom.statusPower.textContent = powerText;
  }

  renderSceneArt(scene) {
    this.dom.storyBox.classList.remove('bg-normal', 'bg-rusak', 'scene-alert');
    this.dom.storyBox.classList.add(scene.background === 'rusak' ? 'bg-rusak' : 'bg-normal');
    if (scene.alert) this.dom.storyBox.classList.add('scene-alert');
  }

  renderSpeaker(scene) {
    this.dom.speakerName.textContent = scene.speaker;
    const avatarKey = scene.avatar || 'narrator';
    const avatarUrl = AVATARS[avatarKey];

    if (avatarUrl) {
      this.dom.speakerAvatar.src = avatarUrl;
      this.dom.speakerAvatar.alt = `${scene.speaker} Avatar`;
      this.dom.avatarContainer.style.display = 'flex';
    } else {
      this.dom.avatarContainer.style.display = 'none';
    }
  }

  typeText(text, callback) {
    if (this.typingTimeoutId) clearTimeout(this.typingTimeoutId);

    this.activeText = text;
    this.isTyping = true;
    this.dom.dialogueText.textContent = '';

    let currentIndex = 0;
    const charDelay = 12;

    let nonSpaceCount = 0;
    const typeChar = () => {
      if (currentIndex < text.length) {
        const char = text[currentIndex];
        this.dom.dialogueText.textContent += char;
        if (char !== ' ') {
          nonSpaceCount += 1;
          if (nonSpaceCount % 2 === 0) {
            this.audio.playClick();
          }
        }
        currentIndex += 1;
        this.typingTimeoutId = setTimeout(typeChar, charDelay);
      } else {
        this.isTyping = false;
        if (callback) callback();
      }
    };

    typeChar();
  }

  skipTyping() {
    if (this.typingTimeoutId) clearTimeout(this.typingTimeoutId);
    this.dom.dialogueText.textContent = this.activeText;
    this.isTyping = false;

    const scene = this.storyData.scenes[this.currentSceneId];
    if (scene) this.renderChoices(scene.choices);
  }

  renderChoices(choices) {
    this.dom.choicesPanel.innerHTML = '';
    if (!choices || choices.length === 0) return;

    let renderedIndex = 1;
    choices.forEach((choice) => {
      if (choice.requireFlags && Array.isArray(choice.requireFlags)) {
        const meetAll = choice.requireFlags.every(f => this.flags[f] === true);
        if (!meetAll) return;
      }

      const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
      const button = document.createElement('button');
      button.className = `choice-btn ${effect > 0 ? 'choice-good' : effect < 0 ? 'choice-risk' : 'choice-neutral'}`;
      button.innerHTML = `
        <span class="choice-index">${renderedIndex}</span>
        <span class="choice-copy">${choice.text}</span>
        <span class="choice-impact">${labelForEffect(effect)}</span>
      `;
      renderedIndex++;
      if (choice.item) button.dataset.item = choice.item;

      button.addEventListener('click', () => {
        if (this.isTyping) {
          this.skipTyping();
          return;
        }

        this.knowledge = clamp(this.knowledge + effect, 0, 15);
        this.history.push({
          hour: this.storyData.scenes[this.currentSceneId]?.hour || '--',
          text: choice.log || choice.text,
          effect
        });

        if (choice.setFlags && Array.isArray(choice.setFlags)) {
          choice.setFlags.forEach(f => {
            this.flags[f] = true;
          });
        }

        this.renderProtocolLog();
        this.renderScene(choice.nextSceneId);
      });

      this.dom.choicesPanel.appendChild(button);
    });
  }

  renderProtocolLog() {
    if (!this.dom.protocolLogList) return;

    if (!this.history.length) {
      this.dom.protocolLogList.innerHTML = '<p>Menunggu keputusan pertama...</p>';
      return;
    }

    this.dom.protocolLogList.innerHTML = this.history
      .slice()
      .reverse()
      .slice(0, 5)
      .map((entry) => {
        const className = entry.effect > 0 ? 'log-good' : entry.effect < 0 ? 'log-risk' : 'log-neutral';
        return `<p class="${className}"><span>${entry.hour}</span>${entry.text}</p>`;
      })
      .join('');
  }

  renderResources(scene) {
    if (!this.dom.resourceItems) return;

    const focusItems = new Set(scene.focusItems || []);
    this.dom.resourceItems.forEach((item) => {
      const key = item.dataset.resource;
      item.classList.toggle('resource-active', focusItems.has(key));
      item.classList.toggle('resource-low', this.isResourceLow(key, scene));
    });
  }

  isResourceLow(key, scene) {
    const hour = parseHour(scene.hour);
    if (key === 'drink') return this.knowledge <= 4 || scene.focusItems?.includes('drink-warning');
    if (key === 'radio') return hour >= 48 && this.knowledge <= 6;
    if (key === 'kit') return this.knowledge <= 3;
    if (key === 'food') return hour >= 54 && this.knowledge <= 5;
    return false;
  }

  evaluateEnding() {
    const hasRadioSave = this.flags.radio_saved === true;
    const hasWaterFilter = this.flags.water_filtered === true;
    const qualifiesForDay4 = this.knowledge >= 8 && hasRadioSave && hasWaterFilter;

    if (qualifiesForDay4) {
      this.renderScene('day4_intro');
    } else {
      const doorOpened = this.flags.door_opened === true;
      
      let endingId = 'ending_normal';
      if (this.knowledge === 0 || doorOpened) {
        endingId = 'ending_fatal';
      } else if (this.knowledge >= 1 && this.knowledge <= 4) {
        endingId = 'ending_bad';
      } else if (this.knowledge >= 5 && this.knowledge <= 7) {
        endingId = 'ending_normal';
      } else {
        endingId = 'ending_best';
      }
      this.renderScene(endingId);
    }
  }

  evaluateSecretEnding() {
    const hasStructuralDamage = this.flags.structural_damage === true;
    
    let endingId = 'ending_secret_bad';
    if (this.knowledge >= 12 && !hasStructuralDamage) {
      endingId = 'ending_secret_best';
    } else {
      endingId = 'ending_secret_bad';
    }
    this.renderScene(endingId);
  }

  getEndingSummary() {
    const good = this.history.filter((entry) => entry.effect > 0).length;
    const risky = this.history.filter((entry) => entry.effect < 0).length;
    return `Keputusan aman: ${good}. Keputusan berisiko: ${risky}. Jalur terakhir: ${this.history.map((entry) => entry.hour).join(' > ') || 'tidak ada log'}.`;
  }
}
