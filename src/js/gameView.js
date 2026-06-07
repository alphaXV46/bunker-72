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



const ENDING_IDS = ['ending_bad', 'ending_normal', 'ending_best', 'ending_fatal', 'ending_secret_best', 'ending_secret_bad'];

export class GameView {
  constructor(dom) {
    this.dom = dom;
    this.controller = null;
    this.isTyping = false;
    this.typingTimeoutId = null;
    this.typingRafId = null;
    this.activeText = '';
  }

  init(controller) {
    this.controller = controller;
    this.setupListeners();
    this.setupInventoryListeners();
    this.setupSettingsModal();
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

  setupInventoryListeners() {
    this.dom.resourceItems.forEach((item) => {
      item.addEventListener('click', () => {
        const isDisabledScene = this.controller.model.isInventoryDisabledScene(this.controller.model.currentSceneId);
        if (isDisabledScene) {
          return;
        }
        const key = item.dataset.resource;
        this.controller.handleInventoryClick(key);
      });
    });
  }

  updateInventoryUI(currentSceneId, inventory) {
    if (!this.dom.resourceItems) return;

    const isDisabledScene = this.controller.model.isInventoryDisabledScene(currentSceneId);

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

      const count = inventory[key] || 0;
      if (countEl) countEl.textContent = count;

      if (isDisabledScene || count <= 0) {
        item.classList.add('disabled');
      } else {
        item.classList.remove('disabled');
      }
    });
  }

  renderHud(scene, knowledge, currentSceneId, flags, hunger = 100, thirst = 100, health = 100) {
    const hour = parseHour(scene.hour);
    const day = clamp(Math.floor(hour / 24) + 1, 1, 4);

    const isDay4 = hour > 72 || currentSceneId.startsWith('day4');
    const maxHour = isDay4 ? 96 : 72;
    const progress = clamp((hour / maxHour) * 100, 0, 100);

    this.dom.statusTime.textContent = scene.hour;
    this.dom.statusDay.textContent = day;
    this.dom.statusKnowledge.textContent = knowledge;
    
    if (this.dom.statusHunger) this.dom.statusHunger.textContent = Math.round(hunger);
    if (this.dom.statusThirst) this.dom.statusThirst.textContent = Math.round(thirst);
    if (this.dom.statusHealth) this.dom.statusHealth.textContent = Math.round(health);

    this.dom.statusProgressBar.style.width = `${progress}%`;
    this.dom.statusObjective.textContent = scene.objective || 'Ambil keputusan paling aman untuk keluarga.';

    this.dom.statusAir.textContent = knowledge <= 4 ? 'KRITIS' : knowledge <= 8 ? 'WASPADA' : 'STABIL';
    
    const hasStructuralDamage = flags.structural_damage === true;
    let structureText = 'AMAN';
    if (currentSceneId === 'ending_secret_bad' || currentSceneId === 'ending_fatal') {
      structureText = 'RUNTUH';
    } else if (hasStructuralDamage || scene.background === 'rusak') {
      structureText = 'RETAK';
    }
    this.dom.statusStructure.textContent = structureText;

    let powerText = 'NORMAL';
    if (hour >= 78) {
      const hasSavedPower = flags.power_saved === true;
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

  renderResources(scene, inventory, knowledge, currentSceneId) {
    this.updateInventoryUI(currentSceneId, inventory);
  }

  renderSceneArt(scene, currentSceneId) {
    this.dom.storyBox.classList.remove('bg-prolog', 'bg-hari1', 'bg-normal', 'bg-rusak', 'scene-alert');
    this.dom.storyBox.closest('#game-view')?.classList.toggle('prolog-mode', scene.background === 'prolog');
    document.body.classList.toggle('prolog-active', scene.background === 'prolog');

    const bgClassMap = {
      prolog: 'bg-prolog',
      hari1: 'bg-hari1',
      normal: 'bg-hari1',
      rusak: 'bg-rusak'
    };
    this.dom.storyBox.classList.add(bgClassMap[scene.background] || 'bg-hari1');
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

  renderChoices(choices, currentSceneId, storyData, flags, onChoiceClick) {
    this.dom.choicesPanel.innerHTML = '';
    if (!choices || choices.length === 0) return;

    let renderedIndex = 1;
    choices.forEach((choice) => {
      if (choice.requireFlags && Array.isArray(choice.requireFlags)) {
        const meetAll = choice.requireFlags.every(f => flags[f] === true);
        if (!meetAll) return;
      }

      const effect = typeof choice.knowledgeEffect === 'number' ? choice.knowledgeEffect : 0;
      const button = document.createElement('button');
      button.className = `choice-btn choice-neutral`;
      button.innerHTML = `
        <span class="choice-index">${renderedIndex}</span>
        <span class="choice-copy">${choice.text}</span>
      `;
      renderedIndex++;
      if (choice.item) button.dataset.item = choice.item;

      button.addEventListener('click', () => {
        onChoiceClick(choice);
      });

      this.dom.choicesPanel.appendChild(button);
    });
  }

  renderProtocolLog(history) {
    if (!this.dom.protocolLogList) return;

    if (!history || history.length === 0) {
      this.dom.protocolLogList.innerHTML = '<p>Menunggu keputusan pertama...</p>';
      return;
    }

    this.dom.protocolLogList.innerHTML = history
      .slice(-5)
      .map((entry) => {
        const spanClass = entry.effect > 0 ? 'log-good' : entry.effect < 0 ? 'log-risk' : '';
        return `<p><span>[${entry.hour}]</span><span class="${spanClass}">${entry.text}</span></p>`;
      })
      .join('');
  }

  typeText(text, callback) {
    if (this.typingRafId) cancelAnimationFrame(this.typingRafId);
    if (this.typingTimeoutId) clearTimeout(this.typingTimeoutId);

    this.activeText = text;
    this.isTyping = true;
    this.dom.dialogueText.textContent = '';

    let currentIndex = 0;
    let lastTimestamp = null;
    const CHAR_INTERVAL = 32; // ms per karakter

    const frame = (timestamp) => {
      if (!this.isTyping) return;

      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = timestamp - lastTimestamp;

      const charsToAdd = Math.floor(elapsed / CHAR_INTERVAL);

      if (charsToAdd > 0) {
        lastTimestamp = timestamp - (elapsed % CHAR_INTERVAL);
        for (let i = 0; i < charsToAdd && currentIndex < text.length; i++) {
          const char = text[currentIndex];
          this.dom.dialogueText.textContent += char;
          if (char.trim() && currentIndex % 2 === 0) {
            this.controller.audio.playClick();
          }
          currentIndex++;
        }
      }

      if (currentIndex < text.length) {
        this.typingRafId = requestAnimationFrame(frame);
      } else {
        this.isTyping = false;
        this.typingRafId = null;
        if (callback) callback();
      }
    };

    this.typingRafId = requestAnimationFrame(frame);
  }

  skipTyping() {
    if (this.typingRafId) {
      cancelAnimationFrame(this.typingRafId);
      this.typingRafId = null;
    }
    if (this.typingTimeoutId) {
      clearTimeout(this.typingTimeoutId);
      this.typingTimeoutId = null;
    }
    this.dom.dialogueText.textContent = this.activeText;
    this.isTyping = false;
    
    const scene = this.controller.storyData.scenes[this.controller.model.currentSceneId];
    if (scene) {
      this.renderChoices(
        scene.choices,
        this.controller.model.currentSceneId,
        this.controller.storyData,
        this.controller.model.flags,
        (choice) => this.controller.handleChoiceSelect(choice)
      );
    }
  }

  setupJournalToggle() {
    const journalBtn = document.getElementById('journal-btn');
    const journalPanel = document.getElementById('journal-panel');
    const journalCloseBtn = document.getElementById('journal-close-btn');

    if (!journalBtn || !journalPanel) return;

    const openJournal = () => {
      journalPanel.classList.add('journal-open');
      journalPanel.setAttribute('aria-hidden', 'false');
      journalBtn.style.opacity = '0';
      journalBtn.style.pointerEvents = 'none';
    };

    const closeJournal = () => {
      journalPanel.classList.remove('journal-open');
      journalPanel.setAttribute('aria-hidden', 'true');
      journalBtn.style.opacity = '1';
      journalBtn.style.pointerEvents = 'auto';
    };

    journalBtn.addEventListener('click', () => {
      const isOpen = journalPanel.classList.contains('journal-open');
      isOpen ? closeJournal() : openJournal();
    });

    if (journalCloseBtn) {
      journalCloseBtn.addEventListener('click', closeJournal);
    }
  }

  setupSettingsModal() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const crtToggle = document.getElementById('crt-toggle');

    if (!settingsBtn || !settingsModal || !settingsCloseBtn || !crtToggle) return;

    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    settingsCloseBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    const isCrtDisabled = localStorage.getItem('bunker72_crt_disabled');
    if (isCrtDisabled === 'true') {
      crtToggle.checked = false;
      document.body.classList.add('disable-crt');
    }

    crtToggle.addEventListener('change', () => {
      if (!crtToggle.checked) {
        document.body.classList.add('disable-crt');
        localStorage.setItem('bunker72_crt_disabled', 'true');
      } else {
        document.body.classList.remove('disable-crt');
        localStorage.setItem('bunker72_crt_disabled', 'false');
      }
    });
  }

  setupVolumeControl(audio) {
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');

    if (!volumeSlider || !muteBtn) return;

    let isMuted = false;
    let lastVolume = 0.6;

    volumeSlider.addEventListener('input', () => {
      lastVolume = parseFloat(volumeSlider.value);
      audio._lastVolume = lastVolume;
      audio.init();
      audio.setVolume(lastVolume);
      if (lastVolume === 0) {
        isMuted = true;
        muteIcon.textContent = '🔇';
      } else {
        isMuted = false;
        muteIcon.textContent = '🔊';
      }
      localStorage.setItem('bunker72_volume', lastVolume);
    });

    muteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      audio._lastVolume = lastVolume;
      audio.init();
      audio.setMuted(isMuted);
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    const savedVolume = parseFloat(localStorage.getItem('bunker72_volume'));
    if (!isNaN(savedVolume)) {
      lastVolume = savedVolume;
      volumeSlider.value = savedVolume;
      audio._lastVolume = savedVolume;
    }
  }

  renderEnding(endingId, finalKnowledge, endingText) {
    this.dom.endingKnowledge.textContent = finalKnowledge;
    this.dom.endingDesc.textContent = endingText;
    this.dom.endingSummary.textContent = this.controller.getEndingSummary();
    
    this.dom.endingTitle.classList.remove('ending-bad', 'ending-normal', 'ending-best');
    this.dom.endingView.classList.remove('ending-bg-bad', 'ending-bg-normal', 'ending-bg-best', 'ending-bg-fatal');
    
    if (endingId === 'ending_bad') {
      this.dom.endingTitle.textContent = "ENDING BURUK: PENYELAMATAN DARURAT KRITIS";
      this.dom.endingTitle.classList.add('ending-bad');
      this.dom.endingView.classList.add('ending-bg-bad');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: KURANG (Keluarga Butuh Perawatan Intensif)";
      this.dom.endingGradeText.style.color = "var(--accent-red-border)";
    } else if (endingId === 'ending_normal') {
      this.dom.endingTitle.textContent = "ENDING NORMAL: BERTAHAN HIDUP DENGAN LUKA";
      this.dom.endingTitle.classList.add('ending-normal');
      this.dom.endingView.classList.add('ending-bg-normal');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: CUKUP (Keluarga Terluka/Dehidrasi)";
      this.dom.endingGradeText.style.color = "var(--warning-yellow-border)";
    } else if (endingId === 'ending_best') {
      this.dom.endingTitle.textContent = "ENDING TERBAIK: SELAMAT & PRIMA";
      this.dom.endingTitle.classList.add('ending-best');
      this.dom.endingView.classList.add('ending-bg-best');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: SANGAT BAIK (Keluarga Sehat & Selamat)";
      this.dom.endingGradeText.style.color = "var(--accent-green-border)";
    } else if (endingId === 'ending_fatal') {
      this.dom.endingTitle.textContent = "ENDING FATAL: MAKAM BUNKER 72";
      this.dom.endingTitle.classList.add('ending-bad');
      this.dom.endingView.classList.add('ending-bg-fatal');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: SANGAT BURUK (Keluarga Gugur/Bunker Kebobolan)";
      this.dom.endingGradeText.style.color = "var(--accent-red-border)";
    } else if (endingId === 'ending_secret_best') {
      this.dom.endingTitle.textContent = "ENDING RAHASIA: PENYELAMATAN SEMPURNA";
      this.dom.endingTitle.classList.add('ending-best');
      this.dom.endingView.classList.add('ending-bg-best');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: LEGENDA (Keluarga Sehat, Aman & Selamat 96 Jam)";
      this.dom.endingGradeText.style.color = "var(--accent-green-border)";
    } else if (endingId === 'ending_secret_bad') {
      this.dom.endingTitle.textContent = "ENDING RAHASIA: GUGUR DI GARIS AKHIR";
      this.dom.endingTitle.classList.add('ending-bad');
      this.dom.endingView.classList.add('ending-bg-fatal');
      this.dom.endingGradeText.textContent = "PERINGKAT KESIAPSIAGAAN: GAGAL (Krisis Hari Ke-4 Melumpuhkan Keluarga)";
      this.dom.endingGradeText.style.color = "var(--accent-red-border)";
    }
  }
}
