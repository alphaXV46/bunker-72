/**
 * serviceHatchStation.js — Station SERVICE HATCH (Maintenance Access)
 *
 * A pressure-sensitive maintenance alignment task. The player moves the
 * service collar into a broad alignment band, then holds the left mouse
 * button to turn the actuator through several resistant stages. Leaving the
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
  resistanceResetMs: 720,
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
    this.sweetSpotCenter = Number.isFinite(Number(sweetSpotCenter))
      ? clamp01(sweetSpotCenter)
      : resolveServiceHatchSweetSpot(random);
    this.sweetSpotWidth = SERVICE_HATCH_CONFIG.sweetSpotWidth;

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
          <small>Tahan tombol kiri mouse untuk memutar aktuator. Lepas dulu sebelum menekan ESC.</small>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">⟳</span><span>Geser posisi collar sampai berada di zona ALIGN, lalu tahan klik kiri. Jika resistansi memuncak, percobaan segmen akan diulang tanpa merusak mekanisme akses.</span><span class="mg-strip-code">MAINT-38</span></div>`;

    const track = panel.querySelector('#mg-hatch-track');
    const needle = panel.querySelector('#mg-hatch-needle');
    const sweetZone = panel.querySelector('.mg-hatch-sweet-zone');
    const resistance = panel.querySelector('#mg-hatch-resistance');
    const stageEl = panel.querySelector('#mg-hatch-stage');
    const progressEl = panel.querySelector('#mg-hatch-progress');
    const stateEl = panel.querySelector('#mg-hatch-state');
    if (!track || !needle || !sweetZone || !resistance || !stageEl || !progressEl || !stateEl) return;

    const zoneStart = Math.max(0, this.sweetSpotCenter - this.sweetSpotWidth / 2);
    sweetZone.style.left = `${zoneStart * 100}%`;
    sweetZone.style.width = `${this.sweetSpotWidth * 100}%`;

    const now = () => (typeof window !== 'undefined' && window.performance?.now)
      ? window.performance.now()
      : Date.now();
    const inSweetSpot = () => Math.abs(this.position - this.sweetSpotCenter) <= this.sweetSpotWidth / 2;

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
        stateEl.textContent = 'TEKANAN STABIL — TAHAN POSISI';
      } else if (this.holding) {
        stateEl.textContent = 'RESISTANSI MENINGKAT — GESER KEMBALI';
      } else if (inSweetSpot()) {
        stateEl.textContent = 'ZONA ALIGN TERKUNCI — TAHAN KLIK KIRI';
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
      if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
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
        return;
      }
      stateEl.textContent = `SEGMENT ${this.segmentIndex + 1} SIAP — TAHAN DI ZONA ALIGN`;
      setFeedback(`SEGMENT ${this.segmentIndex} TERLEWATI`, 'success');
      updateVisual();
    };

    const tick = (timestamp) => {
      if (!this.holding || this.completed) return;
      const current = Number(timestamp) || now();
      const previous = this.previousFrameTime ?? current;
      const deltaMs = Math.min(100, Math.max(0, current - previous));
      this.previousFrameTime = current;

      if (inSweetSpot()) {
        this.resistanceMs = Math.max(0, this.resistanceMs - deltaMs * 1.8);
        this.segmentProgress = Math.min(1, this.segmentProgress + deltaMs / this.holdDurationMs);
        if (this.segmentProgress >= 1) {
          finishSegment();
          if (this.completed) return;
        }
      } else {
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
      updateVisual();
      this.rafId = window.requestAnimationFrame(tick);
    };

    const startHold = (event) => {
      if (this.completed) return;
      if (event.button !== undefined && event.button !== 0) return;
      positionFromPointer(event);
      this.holding = true;
      this.previousFrameTime = now();
      track.setPointerCapture?.(event.pointerId);
      setFeedback(inSweetSpot() ? 'AKTUATOR BERPUTAR — JAGA POSISI' : 'RESISTANSI TERDETEKSI — GESER KE ALIGN', inSweetSpot() ? 'success' : 'error');
      updateVisual();
      if (this.rafId === null) this.rafId = window.requestAnimationFrame(tick);
      event.preventDefault();
    };

    const move = (event) => {
      if (this.completed) return;
      positionFromPointer(event);
      if (this.holding) event.preventDefault();
    };

    const endHold = (event) => {
      if (!this.holding) return;
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
        if (!this.holding) startHold({ button: 0, clientX: track.getBoundingClientRect().left + track.getBoundingClientRect().width * this.position, pointerId: null, preventDefault() {} });
      } else if (event.key === 'Escape') {
        if (this.holding || this.segmentIndex > 0 || this.segmentProgress > 0) {
          setFeedback('BELUM AMAN UNTUK KELUAR — LEPASKAN TEKANAN DAN SELESAIKAN SEGMENT', 'error');
          return;
        }
        event.preventDefault();
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
    track.addEventListener('keydown', keyDown);
    track.addEventListener('keyup', keyUp);

    this.cleanupFns.push(() => {
      stopHold();
      track.removeEventListener('pointerdown', startHold);
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', endHold);
      track.removeEventListener('pointercancel', endHold);
      track.removeEventListener('keydown', keyDown);
      track.removeEventListener('keyup', keyUp);
    });
    updateVisual();
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
