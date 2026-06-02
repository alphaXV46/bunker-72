export class StoryEngine {
  constructor(options) {
    this.storyData = options.storyData;
    this.dom = options.dom;
    this.onSave = options.onSave;
    this.onEnd = options.onEnd;
    
    this.currentSceneId = 'day1_start';
    this.knowledge = 5;
    this.isTyping = false;
    this.typingTimeoutId = null;
    this.activeText = '';
    
    this.setupListeners();
  }

  setupListeners() {
    // Click on the dialogue box to skip typing effect
    const dialogueOverlay = this.dom.storyBox.querySelector('.dialogue-overlay');
    if (dialogueOverlay) {
      dialogueOverlay.addEventListener('click', () => {
        if (this.isTyping) {
          this.skipTyping();
        }
      });
    }
  }

  start(sceneId, knowledge) {
    this.currentSceneId = sceneId || 'day1_start';
    this.knowledge = typeof knowledge === 'number' ? knowledge : 5;
    this.renderScene(this.currentSceneId);
  }

  renderScene(sceneId) {
    // Handle the evaluation node
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
    
    // Auto-save state (if not in ending)
    const isEnding = ['ending_bad', 'ending_normal', 'ending_best'].includes(sceneId);
    if (!isEnding && this.onSave) {
      this.onSave(this.currentSceneId, this.knowledge);
    }

    // Switch view to ending if it is an ending scene
    if (isEnding) {
      if (this.onEnd) {
        this.onEnd(sceneId, this.knowledge, scene.text);
      }
      return;
    }

    // Update Status Panel
    this.dom.statusTime.textContent = scene.hour;
    this.dom.statusKnowledge.textContent = this.knowledge;

    // Update Background image via CSS class helper
    this.dom.storyBox.classList.remove('bg-normal', 'bg-rusak');
    if (scene.background === 'rusak') {
      this.dom.storyBox.classList.add('bg-rusak');
    } else {
      this.dom.storyBox.classList.add('bg-normal');
    }

    // Update Speaker Name
    this.dom.speakerName.textContent = scene.speaker;
    
    // Update Avatar
    if (scene.avatar) {
      try {
        const avatarUrl = new URL(`../assets/avatar_${scene.avatar}.png`, import.meta.url).href;
        this.dom.speakerAvatar.src = avatarUrl;
        this.dom.speakerAvatar.alt = `${scene.speaker} Avatar`;
        this.dom.avatarContainer.style.display = 'flex';
      } catch (err) {
        console.error("Failed to load avatar: ", err);
        this.dom.avatarContainer.style.display = 'none';
      }
    } else {
      this.dom.avatarContainer.style.display = 'none';
    }

    // Run Typewriter text effect
    this.dom.choicesPanel.innerHTML = ''; // Hide choices while typing
    this.typeText(scene.text, () => {
      this.renderChoices(scene.choices);
    });
  }

  typeText(text, callback) {
    if (this.typingTimeoutId) {
      clearTimeout(this.typingTimeoutId);
    }
    
    this.activeText = text;
    this.isTyping = true;
    this.dom.dialogueText.textContent = '';
    
    let currentIndex = 0;
    const charDelay = 15; // 15ms per character (fast, but readable)
    
    const typeChar = () => {
      if (currentIndex < text.length) {
        this.dom.dialogueText.textContent += text[currentIndex];
        currentIndex++;
        this.typingTimeoutId = setTimeout(typeChar, charDelay);
      } else {
        this.isTyping = false;
        if (callback) callback();
      }
    };
    
    typeChar();
  }

  skipTyping() {
    if (this.typingTimeoutId) {
      clearTimeout(this.typingTimeoutId);
    }
    this.dom.dialogueText.textContent = this.activeText;
    this.isTyping = false;
    
    // Render the choices for the current scene immediately
    const scene = this.storyData.scenes[this.currentSceneId];
    if (scene) {
      this.renderChoices(scene.choices);
    }
  }

  renderChoices(choices) {
    this.dom.choicesPanel.innerHTML = '';
    
    if (!choices || choices.length === 0) {
      return;
    }

    choices.forEach(choice => {
      const button = document.createElement('button');
      button.className = 'choice-btn';
      button.textContent = choice.text;
      
      button.addEventListener('click', () => {
        // Apply knowledge score modification
        if (typeof choice.knowledgeEffect === 'number') {
          this.knowledge = Math.max(0, Math.min(10, this.knowledge + choice.knowledgeEffect));
        }
        
        // Go to next scene
        this.renderScene(choice.nextSceneId);
      });
      
      this.dom.choicesPanel.appendChild(button);
    });
  }

  evaluateEnding() {
    let endingId = 'ending_normal';
    if (this.knowledge <= 3) {
      endingId = 'ending_bad';
    } else if (this.knowledge >= 8) {
      endingId = 'ending_best';
    }
    this.renderScene(endingId);
  }
}
