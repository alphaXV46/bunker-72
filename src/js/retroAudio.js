export class RetroAudio {
  constructor() {
    this.ctx = null;
    this.staticNoiseBuffer = null;
    this.masterGain = null;
    this._lastVolume = 0.6;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmState = 'playing'; // default to playing so it starts automatically on init
    this.radioSource = null;
    this.radioTimeout = null;
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
    this.masterGain.gain.value = this._lastVolume;
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
    if (vol > 0) this._lastVolume = vol;
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      vol,
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

  playClick() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(now + 0.04);
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
    osc1.start();
    osc2.start();
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }
}
