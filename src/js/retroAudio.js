export class RetroAudio {
  constructor() {
    this.ctx = null;
    this.staticNoiseBuffer = null;
    this.masterGain = null;
    this._lastVolume = 0.6;
    this._isMuted = false;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmState = 'playing'; // default to playing so it starts automatically on init
    this.radioSource = null;
    this.radioTimeout = null;
    this.activeSources = new Set();
    this.domesticInterval = null;
    this.isDomesticPlaying = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.bgmState === 'playing' && !this.bgmSource) {
            this.playBGM();
          }
        });
      }
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._isMuted ? 0 : this._lastVolume;
    this.masterGain.connect(this.ctx.destination);

    if (this.bgmState === 'playing') {
      this.playBGM();
    }
  }

  async getAudioBuffer(url) {
    if (this.buffers[url]) {
      return this.buffers[url];
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.init();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers[url] = audioBuffer;
    return audioBuffer;
  }

  setVolume(value) {
    const vol = Math.max(0, Math.min(1, value));
    if (vol > 0) {
      this._lastVolume = vol;
      this._isMuted = false;
    } else {
      this._isMuted = true;
    }
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      vol,
      this.ctx.currentTime,
      0.02
    );
  }

  setMuted(muted) {
    this._isMuted = !!muted;
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      muted ? 0 : this._lastVolume,
      this.ctx.currentTime,
      0.02
    );
  }

  async playBGM() {
    this.init();
    if (!this.ctx) return;

    if (this.bgmSource) {
      return;
    }

    this.bgmState = 'playing';

    try {
      const url = new URL('../audio/bgm/background_music.ogg', import.meta.url).href;
      const buffer = await this.getAudioBuffer(url);

      if (this.bgmState !== 'playing') return;
      if (this.bgmSource) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.masterGain);
      source.start(0);
      this.bgmSource = source;
    } catch (e) {
      console.error('Failed to play BGM:', e);
    }
  }

  stopBGM() {
    this.bgmState = 'stopped';
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (e) {}
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
  }

  stopAll() {
    this.stopDomesticPeace();
    this.stopRadioSound();
    this.stopBGM();
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch (e) {}
      try { source.disconnect(); } catch (e) {}
    });
    this.activeSources.clear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.suspend().catch(() => {});
    }
  }

  async playBadChoice() {
    this.init();
    if (!this.ctx) return;
    try {
      const url = new URL('../audio/sfx/bad_choice.aac', import.meta.url).href;
      const buffer = await this.getAudioBuffer(url);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      source.start(0);
    } catch (e) {
      console.error('Failed to play bad choice SFX:', e);
    }
  }

  async playRadioSound(loop = false) {
    this.init();
    if (!this.ctx) return;

    this.stopRadioSound();

    try {
      const url = new URL('../audio/sfx/radio_sound.aac', import.meta.url).href;
      const buffer = await this.getAudioBuffer(url);

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = false; // force non-looping to prevent user dizziness
      source.connect(this.masterGain);
      source.start(0);

      this.radioSource = source;

      // Limit playback duration to 5 seconds max
      this.radioTimeout = setTimeout(() => {
        this.stopRadioSound();
      }, 5000);
    } catch (e) {
      console.error('Failed to play radio sound:', e);
    }
  }

  async playEarthquake() {
    this.init();
    if (!this.ctx) return;

    try {
      const url = new URL('../audio/sfx/gempa.mp3', import.meta.url).href;
      const buffer = await this.getAudioBuffer(url);
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();

      source.buffer = buffer;
      gain.gain.setValueAtTime(0.42, this.ctx.currentTime);
      source.connect(gain);
      gain.connect(this.masterGain);
      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        try { source.disconnect(); } catch (e) {}
      };
      source.start(0);
    } catch (e) {
      console.error('Failed to play earthquake SFX:', e);
      this.playRumble();
    }
  }

  stopRadioSound() {
    if (this.radioTimeout) {
      clearTimeout(this.radioTimeout);
      this.radioTimeout = null;
    }
    if (this.radioSource) {
      try {
        this.radioSource.stop();
      } catch (e) {}
      this.radioSource.disconnect();
      this.radioSource = null;
    }
  }

  _autoDisconnectNode(sourceNode, ...nodesToDisconnect) {
    if (!sourceNode) return;
    sourceNode.onended = () => {
      try { sourceNode.disconnect(); } catch (e) {}
      nodesToDisconnect.forEach((n) => {
        try { n?.disconnect(); } catch (e) {}
      });
    };
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.022);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    this._autoDisconnectNode(osc, gain);
    osc.start();
    osc.stop(now + 0.022);
  }

  playHover() {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.018);
      
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      this._autoDisconnectNode(osc, gain);
      osc.start();
      osc.stop(now + 0.018);
    } catch (e) {}
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
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, gain);
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
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

    noiseNode.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(noiseNode, gain);
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
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.5);
    osc.frequency.linearRampToValueAtTime(40, now + 1.0);
    osc.frequency.linearRampToValueAtTime(48, now + 1.5);
    osc.frequency.linearRampToValueAtTime(45, now + 2.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, filter, gain);
    osc.start();
    osc.stop(now + 2.0);
  }

  async playDamageAlert() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.linearRampToValueAtTime(70, now + 0.6);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(105, now);
    osc2.frequency.linearRampToValueAtTime(73, now + 0.6);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc1, osc2, gain);
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  /**
   * Procedural peaceful acoustic/sine arpeggio loop for the domestic prologue.
   */
  playDomesticPeace() {
    this.init();
    if (!this.ctx || this.isDomesticPlaying) return;

    this.isDomesticPlaying = true;
    const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63]; // C4, E4, G4, C5, A4, G4, E4

    const playArpeggio = () => {
      if (!this.isDomesticPlaying || !this.ctx || this.ctx.state !== 'running') return;
      const startTime = this.ctx.currentTime;

      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + index * 0.45);

        const noteStart = startTime + index * 0.45;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain);

        this._autoDisconnectNode(osc, gain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.95);
      });
    };

    playArpeggio();
    this.domesticInterval = setInterval(() => {
      if (this.isDomesticPlaying) {
        playArpeggio();
      }
    }, 4200);
  }

  stopDomesticPeace() {
    this.isDomesticPlaying = false;
    if (this.domesticInterval) {
      clearInterval(this.domesticInterval);
      this.domesticInterval = null;
    }
  }

  /**
   * Procedural wooden clock tick-tock.
   */
  playClockTick() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  /**
   * Procedural ominous sub-bass tremor (30-45Hz) before disaster strikes.
   */
  playForeshadowTremor() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(34, now);
    osc.frequency.linearRampToValueAtTime(42, now + 1.5);
    osc.frequency.linearRampToValueAtTime(30, now + 3.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(60, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.8);
    gain.gain.linearRampToValueAtTime(0.12, now + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, filter, gain);
    osc.start(now);
    osc.stop(now + 3.3);
  }

  /**
   * Procedural cozy 3-note radio chime when turning on domestic music.
   */
  playRadioChime() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chimeNotes = [523.25, 659.25, 783.99]; // C5, E5, G5

    chimeNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const noteStart = now + idx * 0.18;
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      this._autoDisconnectNode(osc, gain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.45);
    });
  }

  /**
   * Procedural evacuation siren wail for emergency scavenge.
   */
  playSiren() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 1.2);
    osc.frequency.linearRampToValueAtTime(440, now + 2.4);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, gain);
    osc.start(now);
    osc.stop(now + 2.6);
  }

  /**
   * Low rejection buzz (e.g. backpack full).
   */
  playBuzz() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, gain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Heavy mechanical steel hatch lock slam.
   */
  playDoorLock() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    this._autoDisconnectNode(osc, gain);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const retroAudio = new RetroAudio();


