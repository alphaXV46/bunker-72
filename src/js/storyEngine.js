const ENDING_IDS = ['ending_bad', 'ending_normal', 'ending_best'];
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

    this.setupListeners();
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

  start(sceneId, knowledge, history = []) {
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge = typeof knowledge === 'number' ? knowledge : 5;
    this.history = Array.isArray(history) ? history : [];
    this.renderProtocolLog();
    this.renderScene(this.currentSceneId);
  }

  renderScene(sceneId) {
    if (sceneId === 'trigger_ending_eval') {
      this.evaluateEnding();
      return;
    }

    const scene = this.storyData.scenes[sceneId];
    if (!scene) {
      console.error(`Scene ${sceneId} not found in story data.`);
      return;
    }

    this.currentSceneId = sceneId;
    const isEnding = ENDING_IDS.includes(sceneId);
    if (!isEnding && this.onSave) {
      this.onSave(this.currentSceneId, this.knowledge, this.history);
    }

    if (isEnding) {
      if (this.onEnd) this.onEnd(sceneId, this.knowledge, scene.text);
      return;
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
    const day = clamp(Math.floor(hour / 24) + 1, 1, 3);
    const progress = clamp((hour / 72) * 100, 0, 100);

    this.dom.statusTime.textContent = scene.hour;
    this.dom.statusDay.textContent = day;
    this.dom.statusKnowledge.textContent = this.knowledge;
    this.dom.statusProgressBar.style.width = `${progress}%`;
    this.dom.statusObjective.textContent = scene.objective || 'Ambil keputusan paling aman untuk keluarga.';

    const compromised = scene.background === 'rusak';
    this.dom.statusAir.textContent = this.knowledge <= 3 ? 'KRITIS' : this.knowledge <= 6 ? 'WASPADA' : 'STABIL';
    this.dom.statusStructure.textContent = compromised ? 'RETAK' : 'AMAN';
    this.dom.statusPower.textContent = hour >= 54 ? 'DARURAT' : hour >= 44 ? 'HEMAT' : 'NORMAL';
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

    const typeChar = () => {
      if (currentIndex < text.length) {
        this.dom.dialogueText.textContent += text[currentIndex];
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

    choices.forEach((choice, index) => {
      const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
      const button = document.createElement('button');
      button.className = `choice-btn ${effect > 0 ? 'choice-good' : effect < 0 ? 'choice-risk' : 'choice-neutral'}`;
      button.innerHTML = `
        <span class="choice-index">${index + 1}</span>
        <span class="choice-copy">${choice.text}</span>
        <span class="choice-impact">${labelForEffect(effect)}</span>
      `;
      if (choice.item) button.dataset.item = choice.item;

      button.addEventListener('click', () => {
        if (this.isTyping) {
          this.skipTyping();
          return;
        }

        this.knowledge = clamp(this.knowledge + effect, 0, 10);
        this.history.push({
          hour: this.storyData.scenes[this.currentSceneId]?.hour || '--',
          text: choice.log || choice.text,
          effect
        });
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
    let endingId = 'ending_normal';
    if (this.knowledge <= 3) endingId = 'ending_bad';
    if (this.knowledge >= 8) endingId = 'ending_best';
    this.renderScene(endingId);
  }

  getEndingSummary() {
    const good = this.history.filter((entry) => entry.effect > 0).length;
    const risky = this.history.filter((entry) => entry.effect < 0).length;
    return `Keputusan aman: ${good}. Keputusan berisiko: ${risky}. Jalur terakhir: ${this.history.map((entry) => entry.hour).join(' > ') || 'tidak ada log'}.`;
  }
}
