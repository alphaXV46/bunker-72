export class RetroAudio {
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
}
