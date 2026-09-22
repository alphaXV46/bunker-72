/**
 * Diegetic VHF receiver. Informational tuning stays repeatable, while the
 * Day 3 rescue transmission is a single graded, fail-forward interaction.
 */
export class RadioMiniGame {
  constructor({ modalEl, audio, onFinalResult }) {
    this.modalEl = modalEl;
    this.audio = audio;
    this.onFinalResult = onFinalResult;
    this.targetFreq = 98.4;
    this.currentFreq = 91.2;
    this.isLocked = false;
    this.isFinalAttempt = false;
    this.finalResultResolved = false;
    this.sessionCompleted = false;
    this.signalBonus = 0;
    this.clearThreshold = 88;
    this.completionTimer = null;

    this.dom = {
      closeBtn: modalEl.querySelector('#radio-modal-close-btn'),
      freqDisplay: modalEl.querySelector('#radio-freq-display'),
      slider: modalEl.querySelector('#radio-freq-slider'),
      rotaryKnob: modalEl.querySelector('#radio-rotary-knob'),
      knobDot: modalEl.querySelector('#radio-knob-dot'),
      signalMeterFill: modalEl.querySelector('#radio-signal-fill'),
      signalStatusText: modalEl.querySelector('#radio-signal-status'),
      lockLed: modalEl.querySelector('#radio-lock-led'),
      broadcastBox: modalEl.querySelector('#radio-broadcast-text'),
      lockBtn: modalEl.querySelector('#radio-lock-btn'),
    };

    this._bindEvents();
  }

  _bindEvents() {
    this.dom.closeBtn?.addEventListener('click', () => this.close());
    this.dom.slider?.addEventListener('input', (event) => {
      this.currentFreq = parseFloat(event.target.value);
      this.updateTuning();
    });

    if (this.dom.rotaryKnob) {
      let isDragging = false;
      const rotate = (clientX, clientY) => {
        const rect = this.dom.rotaryKnob.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let degrees = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
        if (degrees > 180) degrees -= 360;
        degrees = Math.max(-135, Math.min(135, degrees));
        this.currentFreq = parseFloat((88 + ((degrees + 135) / 270) * 20).toFixed(1));
        if (this.dom.slider) this.dom.slider.value = this.currentFreq;
        this.updateTuning();
      };
      const point = (event) => event.touches ? event.touches[0] : event;
      const start = (event) => {
        if (this.sessionCompleted) return;
        isDragging = true;
        const input = point(event);
        rotate(input.clientX, input.clientY);
      };
      const move = (event) => {
        if (!isDragging) return;
        const input = point(event);
        rotate(input.clientX, input.clientY);
      };
      const stop = () => { isDragging = false; };

      this.dom.rotaryKnob.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);
      this.dom.rotaryKnob.addEventListener('touchstart', start, { passive: true });
      window.addEventListener('touchmove', move, { passive: true });
      window.addEventListener('touchend', stop);
      window.addEventListener('touchcancel', stop);
    }

    this.dom.lockBtn?.addEventListener('click', () => this.attemptLockSignal());
  }

  /** Opens a repeatable informational receiver or one final SAR transmission. */
  open(options = {}) {
    const finalAttempt = options.finalAttempt === true;
    if (finalAttempt && this.finalResultResolved) return false;

    this.isFinalAttempt = finalAttempt;
    this.sessionCompleted = false;
    this.isLocked = false;
    this.signalBonus = finalAttempt && options.extraBattery ? 10 : 0;
    this.clearThreshold = finalAttempt && options.inspectedRadio ? 82 : 88;

    const possibleTargets = [94.8, 96.2, 98.4, 101.5, 103.8, 105.2];
    this.targetFreq = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    const startOffset = finalAttempt && options.inspectedRadio ? 3 : 4.5;
    const startFreq = this.targetFreq + (Math.random() > 0.5 ? startOffset : -startOffset);
    this.currentFreq = Math.max(88, Math.min(108, parseFloat(startFreq.toFixed(1))));
    if (this.dom.slider) this.dom.slider.value = this.currentFreq;

    if (this.dom.lockBtn) {
      this.dom.lockBtn.disabled = false;
      this.dom.lockBtn.textContent = finalAttempt ? 'KIRIM POSISI KE SAR' : 'KUNCI SIARAN';
    }
    if (this.dom.broadcastBox) {
      this.dom.broadcastBox.textContent = finalAttempt
        ? 'Panggilan akhir Basarnas/SAR. Putar kenop, lalu kirim saat Anda siap; mutu sinyal menentukan seberapa lengkap posisi bunker terbaca.'
        : 'Mencari siaran darurat. Receiver VHF tetap bunker dapat dipakai untuk memantau informasi.';
      this.dom.broadcastBox.classList.remove('broadcast-active');
    }

    this.modalEl.classList.remove('hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.audio?.playRadioSound();
    this.updateTuning();
    return true;
  }

  close() {
    this.modalEl.classList.add('hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
    this.audio?.stopRadioSound();
  }

  resetFinalResult() {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    this.finalResultResolved = false;
    this.sessionCompleted = false;
    this.isFinalAttempt = false;
  }

  _getSignalStrength() {
    const diff = Math.abs(this.currentFreq - this.targetFreq);
    const raw = Math.max(0, Math.min(100, Math.round((1 - diff / 3) * 100)));
    return Math.min(100, raw + this.signalBonus);
  }

  _getFinalQuality(strength) {
    if (strength >= this.clearThreshold) return 'clear';
    if (strength >= 35) return 'weak';
    return 'failed';
  }

  updateTuning() {
    if (this.dom.freqDisplay) this.dom.freqDisplay.textContent = `${this.currentFreq.toFixed(1)} MHz`;
    if (this.dom.knobDot) {
      const degrees = -135 + ((this.currentFreq - 88) / 20) * 270;
      this.dom.knobDot.style.transform = `rotate(${degrees}deg)`;
    }

    const diff = Math.abs(this.currentFreq - this.targetFreq);
    const strength = this._getSignalStrength();
    const nearBroadcast = diff <= 0.2;
    const finalQuality = this._getFinalQuality(strength);
    if (this.dom.signalMeterFill) this.dom.signalMeterFill.style.width = `${strength}%`;
    if (this.dom.lockLed) {
      this.dom.lockLed.classList.toggle('active-green', this.isFinalAttempt ? finalQuality === 'clear' : nearBroadcast);
      this.dom.lockLed.classList.toggle('active-red', this.isFinalAttempt ? finalQuality === 'failed' : !nearBroadcast);
    }
    if (this.dom.signalStatusText) {
      if (this.isFinalAttempt) {
        const labels = { clear: 'SINYAL KUAT — POSISI TERBACA', weak: 'SINYAL LEMAH — PESAN TERPOTONG', failed: 'STATIK DOMINAN — PESAN TIDAK PASTI' };
        this.dom.signalStatusText.textContent = labels[finalQuality];
        this.dom.signalStatusText.style.color = finalQuality === 'clear' ? 'var(--accent-green-border)' : finalQuality === 'weak' ? 'var(--warning-yellow-border)' : '#a8b2ba';
      } else if (nearBroadcast) {
        this.dom.signalStatusText.textContent = 'SIARAN DARURAT TERDETEKSI';
        this.dom.signalStatusText.style.color = 'var(--accent-green-border)';
      } else if (strength > 40) {
        this.dom.signalStatusText.textContent = 'GELOMBANG TERDETEKSI';
        this.dom.signalStatusText.style.color = 'var(--warning-yellow-border)';
      } else {
        this.dom.signalStatusText.textContent = 'STATIC — SINYAL BELUM JELAS';
        this.dom.signalStatusText.style.color = '#a8b2ba';
      }
    }
    if (this.dom.lockBtn) this.dom.lockBtn.disabled = this.sessionCompleted || (!this.isFinalAttempt && !nearBroadcast);
  }

  attemptLockSignal() {
    if (this.sessionCompleted) return;
    const strength = this._getSignalStrength();
    const diff = Math.abs(this.currentFreq - this.targetFreq);
    if (!this.isFinalAttempt && diff > 0.2) return;

    this.sessionCompleted = true;
    this.isLocked = true;
    this.audio?.playClick();
    if (this.dom.lockBtn) {
      this.dom.lockBtn.disabled = true;
      this.dom.lockBtn.textContent = this.isFinalAttempt ? '✓ TRANSMISI DIKIRIM' : '✓ SIARAN TERKUNCI';
    }

    if (this.isFinalAttempt) {
      const quality = this._getFinalQuality(strength);
      const messages = {
        clear: `[BASARNAS / SAR ${this.targetFreq.toFixed(1)} MHz] Posisi Bunker 72 terbaca jelas. Tetap lindungi ventilasi; tim darat mengonfirmasi sektor Anda.`,
        weak: `[BASARNAS / SAR ${this.targetFreq.toFixed(1)} MHz] ...Bunker... tujuh dua... koordinat sebagian diterima. Tetap di tempat; pencarian diperluas.`,
        failed: `[STATIK] ...SAR... ulangi... [SINYAL PUTUS]. Pesan lokasi tidak dapat dipastikan, tetapi keluarga tetap menunggu jendela evakuasi.`,
      };
      if (this.dom.broadcastBox) {
        this.dom.broadcastBox.textContent = messages[quality];
        this.dom.broadcastBox.classList.add('broadcast-active');
      }
      this.finalResultResolved = true;
      const result = { quality, frequency: this.currentFreq, strength };
      this.completionTimer = window.setTimeout(() => {
        this.completionTimer = null;
        this.close();
        this.onFinalResult?.(result);
      }, 650);
      return;
    }

    if (this.dom.broadcastBox) {
      this.dom.broadcastBox.textContent = `[SIARAN DARURAT ${this.targetFreq.toFixed(1)} MHz] Tetap di dalam bunker dan hemat daya. Basarnas/SAR sedang menyisir sektor pesisir saat kondisi memungkinkan.`;
      this.dom.broadcastBox.classList.add('broadcast-active');
    }
  }
}
