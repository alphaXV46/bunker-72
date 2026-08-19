/**
 * radioMiniGame.js — Diegetic Radio Signal Tuning Mini-Game
 *
 * Triggered when clicking the Radio inventory icon.
 * Players tune the frequency knob/slider to find and lock onto the emergency BNPB signal.
 */

export class RadioMiniGame {
  /**
   * @param {object} options
   * @param {HTMLElement} options.modalEl
   * @param {Function} options.onSuccess - Callback when signal is locked (+1 knowledge point)
   * @param {object} options.audio - RetroAudio instance
   */
  constructor({ modalEl, onSuccess, audio }) {
    this.modalEl = modalEl;
    this.onSuccess = onSuccess;
    this.audio = audio;

    this.targetFreq = 98.4; // Target emergency frequency (MHz)
    this.currentFreq = 91.2;
    this.isLocked = false;
    this.hasRewardedCurrentSession = false;

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
    if (this.dom.closeBtn) {
      this.dom.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.dom.slider) {
      this.dom.slider.addEventListener('input', (e) => {
        this.currentFreq = parseFloat(e.target.value);
        this.updateTuning();
      });
    }

    if (this.dom.rotaryKnob) {
      let isDragging = false;

      const handleRotate = (clientX, clientY) => {
        const rect = this.dom.rotaryKnob.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let rad = Math.atan2(clientY - centerY, clientX - centerX);
        let deg = rad * (180 / Math.PI) + 90; // Adjust 0deg to top
        if (deg > 180) deg -= 360;

        // Clamp angle between -135deg and +135deg
        deg = Math.max(-135, Math.min(135, deg));

        // Map [-135, 135] to [88.0, 108.0]
        const freqRatio = (deg + 135) / 270;
        this.currentFreq = parseFloat((88.0 + freqRatio * 20.0).toFixed(1));

        if (this.dom.slider) {
          this.dom.slider.value = this.currentFreq;
        }
        this.updateTuning();
      };

      const startDrag = (e) => {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        handleRotate(clientX, clientY);
      };

      const moveDrag = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        handleRotate(clientX, clientY);
      };

      const stopDrag = () => { isDragging = false; };

      this.dom.rotaryKnob.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', moveDrag);
      window.addEventListener('mouseup', stopDrag);

      this.dom.rotaryKnob.addEventListener('touchstart', startDrag, { passive: true });
      window.addEventListener('touchmove', moveDrag, { passive: true });
      window.addEventListener('touchend', stopDrag);
    }

    if (this.dom.lockBtn) {
      this.dom.lockBtn.addEventListener('click', () => {
        this.attemptLockSignal();
      });
    }
  }

  /**
   * Opens the Radio Tuning mini-game modal with a random target frequency.
   */
  open() {
    // Generate a target frequency between 94.0 and 106.0 MHz
    const possibleTargets = [94.8, 96.2, 98.4, 101.5, 103.8, 105.2];
    this.targetFreq = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];

    // Start tuning slider at a offset
    let startFreq = this.targetFreq + (Math.random() > 0.5 ? 4.5 : -4.5);
    startFreq = Math.max(88.0, Math.min(108.0, parseFloat(startFreq.toFixed(1))));

    this.currentFreq = startFreq;
    this.isLocked = false;
    this.hasRewardedCurrentSession = false;

    if (this.dom.slider) {
      this.dom.slider.value = this.currentFreq;
    }

    if (this.dom.lockBtn) {
      this.dom.lockBtn.disabled = true;
      this.dom.lockBtn.textContent = 'KUNCI SINYAL';
    }

    if (this.dom.broadcastBox) {
      this.dom.broadcastBox.textContent = 'Mencari sinyal radio darurat... Geser kenop frekuensi di bawah.';
      this.dom.broadcastBox.classList.remove('broadcast-active');
    }

    this.modalEl.classList.remove('hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');

    this.audio?.playRadioSound();
    this.updateTuning();
  }

  /**
   * Closes the radio mini-game modal.
   */
  close() {
    this.modalEl.classList.add('hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  /**
   * Recalculates signal strength & updates meter UI.
   */
  updateTuning() {
    if (this.dom.freqDisplay) {
      this.dom.freqDisplay.textContent = `${this.currentFreq.toFixed(1)} MHz`;
    }

    // Rotate Knob Indicator Dot
    if (this.dom.knobDot) {
      const freqRatio = (this.currentFreq - 88.0) / 20.0;
      const deg = -135 + freqRatio * 270;
      this.dom.knobDot.style.transform = `rotate(${deg}deg)`;
    }

    const diff = Math.abs(this.currentFreq - this.targetFreq);
    // Signal tolerance range = 3.0 MHz
    const maxDiff = 3.0;
    let strength = Math.max(0, Math.min(100, Math.round((1 - diff / maxDiff) * 100)));

    if (diff < 0.15) {
      strength = 100;
    }

    if (this.dom.signalMeterFill) {
      this.dom.signalMeterFill.style.width = `${strength}%`;
    }

    const isNearLock = diff <= 0.2;

    if (this.dom.lockLed) {
      this.dom.lockLed.classList.toggle('active-green', isNearLock);
      this.dom.lockLed.classList.toggle('active-red', !isNearLock);
    }

    if (this.dom.signalStatusText) {
      if (isNearLock) {
        this.dom.signalStatusText.textContent = 'SINYAL TERKUNCI (SIARAN BNPB DETEKSI)';
        this.dom.signalStatusText.style.color = 'var(--accent-green-border)';
      } else if (strength > 40) {
        this.dom.signalStatusText.textContent = 'GELOMBANG TERCETUS (STATIC SEDANG)';
        this.dom.signalStatusText.style.color = 'var(--warning-yellow-border)';
      } else {
        this.dom.signalStatusText.textContent = 'STATIC NOISE (TIDAK ADA SINYAL)';
        this.dom.signalStatusText.style.color = '#a8b2ba';
      }
    }

    if (this.dom.lockBtn) {
      this.dom.lockBtn.disabled = !isNearLock || this.isLocked;
    }
  }

  /**
   * Called when player taps the "KUNCI SINYAL" button when signal is locked.
   */
  attemptLockSignal() {
    const diff = Math.abs(this.currentFreq - this.targetFreq);
    if (diff > 0.2 || this.isLocked) return;

    this.isLocked = true;
    this.audio?.playClick();

    if (this.dom.lockBtn) {
      this.dom.lockBtn.disabled = true;
      this.dom.lockBtn.textContent = '✓ TERKUNCI';
    }

    const broadcasts = [
      `[SATGAS BNPB RAKATA ${this.targetFreq.toFixed(1)} MHz]: Status Krakatau Siaga I. Evakuasi jalur pesisir ditutup. Seluruh bunker darurat diperintahkan tetap menyegel filter udara sampai pemberitahuan lanjutan.`,
      `[SIARAN FREKUENSI DARURAT ${this.targetFreq.toFixed(1)} MHz]: Posko 72 menerima laporan gempa susulan amplitudo sedang. Amankan struktur dan pasokan air bersih keluarga Anda.`,
      `[SINYAL POSKO UTAMA RAKATA ${this.targetFreq.toFixed(1)} MHz]: Evakuasi helikopter BNPB dijadwalkan pasca 72 jam pertama. Pastikan kesiapsiagaan fisik dan suplai radio tetap terjaga.`,
    ];

    const message = broadcasts[Math.floor(Math.random() * broadcasts.length)];

    if (this.dom.broadcastBox) {
      this.dom.broadcastBox.textContent = message;
      this.dom.broadcastBox.classList.add('broadcast-active');
    }

    if (!this.hasRewardedCurrentSession && this.onSuccess) {
      this.hasRewardedCurrentSession = true;
      this.onSuccess(message);
    }
  }
}
