/**
 * serviceHatchStation.js — Station SERVICE HATCH (Maintenance Access)
 *
 * A pressure-sensitive maintenance alignment task. The player moves the
 * service collar into a broad alignment band while holding the pointer
 * to turn the actuator through several resistant stages. Leaving the
 * band for too long resets only the current attempt; there is no permanent
 * breakage, resource cost, health loss, or game-over path.
 */

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const SERVICE_HATCH_CONFIG = Object.freeze({
  segmentCount: 6,
  holdDurationMs: 3200,
  sweetSpotWidth: 0.28,
  sweetSpotMin: 0.32,
  sweetSpotMax: 0.68,
  sweetSpotTravel: 0.18,
  sweetSpotCycleMs: 4900,
  sweetSpotFinalCycleMs: 3400,
  resistanceResetMs: 960,
});

/**
 * Resolves the per-session sweet spot. Tests and developer tooling can inject
 * a deterministic random function without changing the player-facing rule.
 */
export const resolveServiceHatchSweetSpot = (random = Math.random) => {
  const sample = typeof random === 'function' ? clamp01(random()) : 0.5;
  return SERVICE_HATCH_CONFIG.sweetSpotMin
    + ((SERVICE_HATCH_CONFIG.sweetSpotMax - SERVICE_HATCH_CONFIG.sweetSpotMin) * sample);
};

export const resolveServiceHatchCycleMs = (segmentIndex, segmentCount) => {
  const steps = Math.max(1, segmentCount - 1);
  const progress = Math.max(0, Math.min(1, segmentIndex / steps));
  return SERVICE_HATCH_CONFIG.sweetSpotCycleMs
    + (SERVICE_HATCH_CONFIG.sweetSpotFinalCycleMs - SERVICE_HATCH_CONFIG.sweetSpotCycleMs) * progress;
};

export class ServiceHatchStation {
  constructor() {
    this.cleanupFns = [];
    this.rafId = null;
    this.holding = false;
    this.completed = false;
    this.position = 0.12;
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.sweetSpotCenter = 0.5;
    this.movingSweetSpotCenter = 0.5;
    this.sweetSpotWidth = SERVICE_HATCH_CONFIG.sweetSpotWidth;
    this.holdDurationMs = SERVICE_HATCH_CONFIG.holdDurationMs;
    this.resistanceMs = 0;
    this.previousFrameTime = null;
    this.onCancel = null;
  }

  /**
   * Mounts the maintenance alignment station.
   * @param {HTMLElement} panel
   * @param {Object} context
   * @param {string} context.introHtml
   * @param {Function} context.onComplete
   * @param {Function} context.setFeedback
   * @param {Function} [context.onCancel]
   * @param {number} [context.sweetSpotCenter] deterministic center in [0, 1]
   * @param {Function} [context.random] injected random source
   * @param {number} [context.segmentCount]
   * @param {number} [context.holdDurationMs]
   */
  mount(panel, {
    introHtml,
    onComplete,
    setFeedback,
    onCancel,
    sweetSpotCenter,
    random,
    segmentCount = SERVICE_HATCH_CONFIG.segmentCount,
    holdDurationMs = SERVICE_HATCH_CONFIG.holdDurationMs,
  }) {
    this.destroy();
    this.completed = false;
    this.holding = false;
    this.position = 0.12;
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.resistanceMs = 0;
    this.previousFrameTime = null;
    this.onCancel = onCancel;
    this.segmentCount = Math.max(1, Math.round(Number(segmentCount) || SERVICE_HATCH_CONFIG.segmentCount));
    this.holdDurationMs = Math.max(900, Number(holdDurationMs) || SERVICE_HATCH_CONFIG.holdDurationMs);
    this.sweetSpotWidth = SERVICE_HATCH_CONFIG.sweetSpotWidth;
    this.sweetSpotCenter = Number.isFinite(Number(sweetSpotCenter))
      ? Math.max(this.sweetSpotWidth / 2, Math.min(1 - this.sweetSpotWidth / 2, Number(sweetSpotCenter)))
      : resolveServiceHatchSweetSpot(random);
    this.movingSweetSpotCenter = this.sweetSpotCenter;

    panel.innerHTML = `${introHtml}
      <div class="mg-hatch-layout">
        <div class="mg-hatch-readout">
          <div><span class="mg-track-label">PANEL SERVIS / RESISTANSI</span><b id="mg-hatch-stage">SEGMENT 1 / ${this.segmentCount}</b></div>
          <strong id="mg-hatch-progress">00%</strong>
        </div>
        <div class="mg-hatch-track" id="mg-hatch-track" role="slider" tabindex="0" aria-label="Posisi collar mekanisme akses panel servis" aria-valuemin="0" aria-valuemax="100" aria-valuenow="12">
          <span class="mg-hatch-rail" aria-hidden="true"></span>
          <span class="mg-hatch-sweet-zone" aria-hidden="true"><b>ALIGN</b><small>ZONA AMAN</small></span>
          <span class="mg-hatch-needle" id="mg-hatch-needle" aria-hidden="true"><i></i><b>COLLAR</b></span>
          <span class="mg-hatch-resistance" id="mg-hatch-resistance" aria-hidden="true"></span>
        </div>
        <div class="mg-hatch-readout mg-hatch-readout--secondary">
          <span id="mg-hatch-state">GERAKKAN COLLAR KE ZONA ALIGN</span>
          <small>Ikuti zona ALIGN yang makin cepat tiap segmen. Geser sambil menahan; gunakan panah dan Spasi dengan keyboard.</small>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">⟳</span><span>Tekan dan geser collar mengikuti zona ALIGN. Geraknya bertambah cepat tiap segmen; resistansi yang memuncak hanya mengulang segmen ini.</span><span class="mg-strip-code">MAINT-38</span></div>`;

    const track = panel.querySelector('#mg-hatch-track');
    const needle = panel.querySelector('#mg-hatch-needle');
    const sweetZone = panel.querySelector('.mg-hatch-sweet-zone');
    const resistance = panel.querySelector('#mg-hatch-resistance');
    const stageEl = panel.querySelector('#mg-hatch-stage');
    const progressEl = panel.querySelector('#mg-hatch-progress');
    const stateEl = panel.querySelector('#mg-hatch-state');
    if (!track || !needle || !sweetZone || !resistance || !stageEl || !progressEl || !stateEl) return;

    const zoneStart = this.movingSweetSpotCenter - this.sweetSpotWidth / 2;
    sweetZone.style.left = `${zoneStart * 100}%`;
    sweetZone.style.width = `${this.sweetSpotWidth * 100}%`;

    const now = () => (typeof window !== 'undefined' && window.performance?.now)
      ? window.performance.now()
      : Date.now();
    const inSweetSpot = () => Math.abs(this.position - this.movingSweetSpotCenter) <= this.sweetSpotWidth / 2;
    let previousMotionTime = now();
    let motionPhase = 0;
    const randomSource = typeof random === 'function' ? random : Math.random;
    const sampleMotion = () => clamp01(randomSource());
    const motionDirection = sampleMotion() < 0.5 ? -1 : 1;
    let motionRate = 1;
    let motionRateTarget = 1;
    let motionChangeInMs = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const travel = reducedMotion ? 0 : Math.min(
      SERVICE_HATCH_CONFIG.sweetSpotTravel,
      this.sweetSpotCenter - this.sweetSpotWidth / 2,
      1 - this.sweetSpotWidth / 2 - this.sweetSpotCenter,
    );
    let activePointerId = null;

    const updateVisual = () => {
      const percentage = Math.round(this.segmentProgress * 100);
      needle.style.left = `${this.position * 100}%`;
      resistance.style.width = `${Math.min(100, (this.resistanceMs / SERVICE_HATCH_CONFIG.resistanceResetMs) * 100)}%`;
      progressEl.textContent = `${String(percentage).padStart(2, '0')}%`;
      stageEl.textContent = `SEGMENT ${Math.min(this.segmentIndex + 1, this.segmentCount)} / ${this.segmentCount}`;
      track.setAttribute('aria-valuenow', String(Math.round(this.position * 100)));
      track.classList.toggle('is-aligned', inSweetSpot());
      track.classList.toggle('is-holding', this.holding);
      track.classList.toggle('is-resisting', this.resistanceMs > 0);
    };

    const setPosition = (value) => {
      if (this.completed) return;
      this.position = clamp01(value);
      if (this.holding && inSweetSpot()) {
        stateEl.textContent = 'TEKANAN STABIL — IKUTI ZONA ALIGN';
      } else if (this.holding) {
        stateEl.textContent = 'RESISTANSI MENINGKAT — IKUTI ZONA ALIGN';
      } else if (inSweetSpot()) {
        stateEl.textContent = 'ZONA ALIGN TERKUNCI — TEKAN DAN TAHAN';
      } else {
        stateEl.textContent = 'GERAKKAN COLLAR KE ZONA ALIGN';
      }
      updateVisual();
    };

    const positionFromPointer = (event) => {
      const rect = track.getBoundingClientRect();
      if (!rect.width) return;
      setPosition((event.clientX - rect.left) / rect.width);
    };

    const stopHold = (message = 'TEKANAN DILEPAS — POSISIKAN ULANG BILA PERLU') => {
      if (!this.holding) return;
      this.holding = false;
      this.previousFrameTime = null;
      if (!this.completed) {
        stateEl.textContent = message;
        updateVisual();
      }
    };

    const finishSegment = () => {
      this.segmentIndex += 1;
      this.segmentProgress = 0;
      this.resistanceMs = 0;
      if (this.segmentIndex >= this.segmentCount) {
        this.completed = true;
        stopHold('PANEL SERVIS TERBUKA');
        stateEl.textContent = 'PANEL SERVIS TERBUKA';
        updateVisual();
        onComplete('service_hatch');
        return true;
      }
      stateEl.textContent = `SEGMENT ${this.segmentIndex + 1} SIAP — TAHAN DI ZONA ALIGN`;
      setFeedback(`SEGMENT ${this.segmentIndex} TERLEWATI`, 'success');
      updateVisual();
      return false;
    };

    const tick = (timestamp) => {
      if (this.completed) return;
      const current = Number.isFinite(timestamp) ? timestamp : now();
      const motionDeltaMs = Math.min(100, Math.max(0, current - previousMotionTime));
      previousMotionTime = current;
      motionChangeInMs -= motionDeltaMs;
      if (motionChangeInMs <= 0) {
        motionRateTarget = 0.92 + sampleMotion() * 0.2;
        motionChangeInMs = 650 + sampleMotion() * 600;
      }
      motionRate += (motionRateTarget - motionRate) * Math.min(1, motionDeltaMs / 450);
      motionPhase += motionDirection * (2 * Math.PI * motionDeltaMs * motionRate)
        / resolveServiceHatchCycleMs(this.segmentIndex, this.segmentCount);
      this.movingSweetSpotCenter = this.sweetSpotCenter + travel
        * Math.sin(motionPhase);
      sweetZone.style.left = `${(this.movingSweetSpotCenter - this.sweetSpotWidth / 2) * 100}%`;

      if (this.holding) {
        const previous = this.previousFrameTime ?? current;
        const deltaMs = Math.min(100, Math.max(0, current - previous));
        this.previousFrameTime = current;
        if (inSweetSpot()) {
          stateEl.textContent = 'TEKANAN STABIL — IKUTI ZONA ALIGN';
          this.resistanceMs = Math.max(0, this.resistanceMs - deltaMs * 1.8);
          this.segmentProgress = Math.min(1, this.segmentProgress + deltaMs / this.holdDurationMs);
          if (this.segmentProgress >= 1 && finishSegment()) return;
        } else {
          stateEl.textContent = 'RESISTANSI MENINGKAT — IKUTI ZONA ALIGN';
          this.resistanceMs += deltaMs;
          this.segmentProgress = Math.max(0, this.segmentProgress - deltaMs / (this.holdDurationMs * 0.7));
          if (this.resistanceMs >= SERVICE_HATCH_CONFIG.resistanceResetMs) {
            this.segmentProgress = 0;
            this.resistanceMs = 0;
            setFeedback('RESISTANSI MAKSIMAL — SEGMENT DIULANG', 'error');
            stateEl.textContent = 'MEKANISME MENAHAN — CARI ZONA ALIGN';
            track.classList.remove('is-resistance-reset');
            void track.offsetWidth;
            track.classList.add('is-resistance-reset');
          }
        }
      } else {
        stateEl.textContent = inSweetSpot()
          ? 'ZONA ALIGN TERKUNCI — TEKAN DAN TAHAN'
          : 'GERAKKAN COLLAR KE ZONA ALIGN';
      }
      updateVisual();
      this.rafId = window.requestAnimationFrame(tick);
    };

    const beginHold = () => {
      if (this.completed || this.holding) return;
      this.holding = true;
      this.previousFrameTime = now();
      setPosition(this.position);
      setFeedback(inSweetSpot() ? 'AKTUATOR BERPUTAR — JAGA POSISI' : 'RESISTANSI TERDETEKSI — GESER KE ALIGN', inSweetSpot() ? 'success' : 'error');
      if (this.rafId === null) this.rafId = window.requestAnimationFrame(tick);
    };

    const startHold = (event) => {
      if (this.completed || this.holding || event.button !== 0) return;
      activePointerId = event.pointerId;
      positionFromPointer(event);
      track.setPointerCapture?.(activePointerId);
      beginHold();
      event.preventDefault();
    };

    const move = (event) => {
      if (!this.holding || event.pointerId !== activePointerId) return;
      positionFromPointer(event);
      event.preventDefault();
    };

    const endHold = (event) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
      if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture?.(event.pointerId);
      stopHold();
      event.preventDefault();
    };

    const keyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setPosition(this.position + (event.key === 'ArrowRight' ? 0.035 : -0.035));
      } else if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (!this.holding) beginHold();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        stopHold();
        onCancel?.({ canceled: true, success: false, stationId: 'service_hatch' });
      }
    };

    const keyUp = (event) => {
      if (event.code === 'Space' || event.key === ' ') stopHold();
    };

    track.addEventListener('pointerdown', startHold);
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', endHold);
    track.addEventListener('pointercancel', endHold);
    track.addEventListener('lostpointercapture', endHold);
    track.addEventListener('keydown', keyDown);
    track.addEventListener('keyup', keyUp);
    const blur = () => stopHold();
    track.addEventListener('blur', blur);

    this.cleanupFns.push(() => {
      stopHold();
      track.removeEventListener('pointerdown', startHold);
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', endHold);
      track.removeEventListener('pointercancel', endHold);
      track.removeEventListener('lostpointercapture', endHold);
      track.removeEventListener('keydown', keyDown);
      track.removeEventListener('keyup', keyUp);
      track.removeEventListener('blur', blur);
    });
    updateVisual();
    this.rafId = window.requestAnimationFrame(tick);
  }

  /** Cleans up the animation frame, pointer listeners, and active attempt. */
  destroy() {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    if (this.rafId !== null && typeof window !== 'undefined') window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.holding = false;
    this.completed = false;
    this.segmentIndex = 0;
    this.segmentProgress = 0;
    this.resistanceMs = 0;
    this.previousFrameTime = null;
    this.onCancel = null;
  }
}
