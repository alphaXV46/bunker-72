/**
 * cardStation.js — Station SEAL 72-A (Otentikasi Kartu Akses)
 *
 * The card is pushed vertically into a hard stop. Once it hits the stop,
 * vertical movement locks and the same pointer gesture continues horizontally.
 * The reader resolves the attempt as soon as the card crosses the finish line.
 */

export class CardStation {
  constructor() {
    this.cleanupFns = [];
    this.timeouts = [];
    this.phase = 'take';
    this.completed = false;
  }

  /**
   * Mounts and renders the Card Station into the provided panel element.
   * @param {HTMLElement} panel
   * @param {Object} context
   * @param {string} context.introHtml
   * @param {Function} context.onComplete
   * @param {Function} context.setFeedback
   */
  mount(panel, { introHtml, onComplete, setFeedback }) {
    this.destroy();
    this.phase = 'take';
    this.completed = false;

    panel.innerHTML = `${introHtml}
      <div class="mg-card-layout">
        <div class="mg-card-readout" id="mg-card-readout">
          <span class="mg-reader-beacon" aria-hidden="true"></span>
          <div class="mg-card-readout-copy">
            <span class="mg-eyebrow">PEMBACA KARTU / PORT B</span>
            <strong id="mg-card-status">DORONG KARTU SAMPAI MENTOK</strong>
            <small id="mg-card-detail">TAHAN KARTU · GERAKKAN LURUS KE ATAS</small>
          </div>
        </div>
        <div class="mg-card-device" id="mg-card-device">
          <div class="mg-device-screen"><span>PUSH UP / SWIPE RIGHT</span><i aria-hidden="true"></i></div>
          <div class="mg-device-lights" aria-hidden="true"><span></span><span></span></div>
          <div class="mg-swipe-lane" id="mg-swipe-lane" aria-label="Jalur swipe kartu">
            <span class="mg-swipe-line" aria-hidden="true"></span>
            <span class="mg-swipe-start-zone" id="mg-swipe-start"><b>HARD STOP</b><small>START</small></span>
            <span class="mg-swipe-end">SELESAI</span>
            <span class="mg-swipe-speed-hint">KECEPATAN IDEAL 0,5–1,25 DETIK →</span>
          </div>
          <div class="mg-insert-boundary" aria-hidden="true"><span>↑ DORONG HINGGA MENTOK ↑</span></div>
          <div class="mg-card-wallet" id="mg-card-wallet" aria-hidden="true"><span>DOMPET AKSES</span></div>
          <button id="mg-access-card" class="mg-access-card" type="button" aria-label="Kartu akses Bunker 72. Dorong ke atas sampai mentok, lalu slide ke kanan dengan kecepatan sedang.">
            <span class="mg-card-chip" aria-hidden="true"></span>
            <span class="mg-card-copy"><b>BUNKER <em>72</em></b><small>KELUARGA / PRIORITAS</small></span>
            <span class="mg-card-barcode" aria-hidden="true"></span>
            <span class="mg-card-number">72 04 19 87</span>
          </button>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">↑→</span><span id="mg-card-instruction">Tahan kartu, dorong ke atas sampai mentok, lalu langsung slide ke kanan tanpa melepasnya.</span><span class="mg-strip-code">ID-SWIPE</span></div>`;

    const device = panel.querySelector('#mg-card-device');
    const card = panel.querySelector('#mg-access-card');
    const wallet = panel.querySelector('#mg-card-wallet');
    const startZone = panel.querySelector('#mg-swipe-start');
    const lane = panel.querySelector('#mg-swipe-lane');
    const readout = panel.querySelector('#mg-card-readout');
    const status = panel.querySelector('#mg-card-status');
    const detail = panel.querySelector('#mg-card-detail');
    const instruction = panel.querySelector('#mg-card-instruction');
    if (!device || !card || !wallet || !startZone || !lane || !readout || !status || !detail || !instruction) return;

    const swipeMinMs = 500;
    const swipeMaxMs = 1250;
    let dragging = false;
    let activePointerId = null;
    let startPointer = { x: 0, y: 0 };
    let origin = { left: 0, top: 0 };
    let swipeStartedAt = 0;
    let furthestX = 0;
    let slowTimer = null;

    const rectInDevice = (element) => {
      const deviceRect = device.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - deviceRect.left,
        top: rect.top - deviceRect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    const place = (left, top) => {
      const maxLeft = Math.max(0, device.clientWidth - card.offsetWidth);
      const maxTop = Math.max(0, device.clientHeight - card.offsetHeight);
      card.style.left = `${Math.max(0, Math.min(maxLeft, left))}px`;
      card.style.top = `${Math.max(0, Math.min(maxTop, top))}px`;
    };

    const swipeStartPosition = () => {
      const laneRect = rectInDevice(lane);
      const startRect = rectInDevice(startZone);
      return {
        left: startRect.left + 5,
        top: laneRect.top + (laneRect.height - card.offsetHeight) / 2,
      };
    };

    const walletPosition = () => {
      const walletRect = rectInDevice(wallet);
      const startPosition = swipeStartPosition();
      return {
        left: startPosition.left,
        top: walletRect.top + 12,
      };
    };

    const swipeEndLeft = () => {
      const laneRect = rectInDevice(lane);
      return laneRect.left + laneRect.width - card.offsetWidth - 8;
    };

    const setReadout = (headline, subline, feedback, tone = 'neutral') => {
      status.textContent = headline;
      detail.textContent = subline;
      setFeedback(feedback, tone);
    };

    const clearSlowTimer = () => {
      if (slowTimer !== null) {
        window.clearTimeout(slowTimer);
        slowTimer = null;
      }
    };

    const releaseActivePointer = () => {
      if (activePointerId !== null && card.hasPointerCapture?.(activePointerId)) {
        card.releasePointerCapture?.(activePointerId);
      }
      activePointerId = null;
    };

    const returnToWallet = (message = 'KARTU BELUM MENCAPAI BATAS ATAS') => {
      clearSlowTimer();
      const position = walletPosition();
      card.classList.add('is-returning');
      card.classList.remove('is-staged', 'is-grabbed');
      place(position.left, position.top);
      this.phase = 'take';
      dragging = false;
      swipeStartedAt = 0;
      startZone.classList.remove('is-locked');
      readout.classList.remove('is-ready', 'is-scanning');
      delete readout.dataset.speed;
      instruction.textContent = 'Tahan kartu, dorong ke atas sampai mentok, lalu langsung slide ke kanan tanpa melepasnya.';
      setReadout('DORONG SAMPAI MENTOK', 'TAHAN KARTU · GERAKKAN LURUS KE ATAS', message, 'error');
      const timer = window.setTimeout(() => card.classList.remove('is-returning'), 280);
      this.timeouts.push(timer);
    };

    const prepareSwipe = ({ event = null, continuous = false } = {}) => {
      clearSlowTimer();
      const position = swipeStartPosition();
      card.classList.add('is-staged');
      if (continuous) card.classList.remove('is-returning');
      else card.classList.add('is-returning');
      place(position.left, position.top);
      this.phase = 'swipe';
      swipeStartedAt = 0;
      furthestX = position.left;
      origin = { left: position.left, top: position.top };
      if (event) startPointer = { x: event.clientX, y: event.clientY };
      startZone.classList.add('is-locked');
      readout.classList.add('is-ready');
      delete readout.dataset.speed;
      instruction.textContent = 'Kartu sudah mentok dan sumbu atas-bawah terkunci. Slide ke kanan dengan kecepatan sedang.';
      setReadout('MENTOK — SLIDE SEKARANG', 'SUMBU VERTIKAL TERKUNCI · TARGET 0,5–1,25 DETIK', 'HARD STOP AKTIF // SLIDE KE KANAN');
      if (!continuous) {
        const timer = window.setTimeout(() => card.classList.remove('is-returning'), 220);
        this.timeouts.push(timer);
      }
    };

    const retrySwipe = (reason, pointerId = activePointerId) => {
      const messages = {
        fast: ['TERLALU CEPAT', 'Kurangi kecepatan slide.'],
        slow: ['TERLALU LAMBAT', 'Tambah kecepatan slide.'],
        short: ['SWIPE TERPUTUS', 'Jangan lepaskan sebelum melewati ujung kanan.'],
      };
      const [headline, feedback] = messages[reason] || messages.short;
      clearSlowTimer();
      dragging = false;
      if (pointerId !== null && card.hasPointerCapture?.(pointerId)) card.releasePointerCapture?.(pointerId);
      activePointerId = null;
      card.classList.remove('is-grabbed');
      prepareSwipe();
      readout.dataset.speed = reason === 'fast' ? 'fast' : 'slow';
      instruction.textContent = `${headline}. Kartu sudah kembali ke hard stop; tekan lalu slide lagi.`;
      setReadout(headline, 'KARTU KEMBALI KE START · COBA SLIDE LAGI', feedback, 'error');
    };

    const complete = (pointerId = activePointerId) => {
      if (this.completed) return;
      clearSlowTimer();
      this.completed = true;
      this.phase = 'done';
      dragging = false;
      if (pointerId !== null && card.hasPointerCapture?.(pointerId)) card.releasePointerCapture?.(pointerId);
      activePointerId = null;
      card.classList.remove('is-grabbed');
      readout.classList.remove('is-ready', 'is-scanning');
      readout.classList.add('is-success');
      readout.dataset.speed = 'good';
      instruction.textContent = 'Kecepatan swipe sesuai. Kredensial kartu berhasil dibaca.';
      setReadout('KECEPATAN PAS — AKSES DITERIMA', 'KREDENSIAL 72-A TERVALIDASI', 'KREDENSIAL 72-A DITERIMA // PINTU TERBUKA', 'success');
      onComplete('card');
    };

    const updateSpeedReadout = (elapsed, progress) => {
      if (progress <= 0) return;
      const projectedDuration = elapsed / progress;
      if (projectedDuration < swipeMinMs) {
        readout.dataset.speed = 'fast';
        detail.textContent = 'KECEPATAN: TERLALU CEPAT';
      } else if (projectedDuration > swipeMaxMs) {
        readout.dataset.speed = 'slow';
        detail.textContent = 'KECEPATAN: TERLALU LAMBAT';
      } else {
        readout.dataset.speed = 'good';
        detail.textContent = 'KECEPATAN: PAS · PERTAHANKAN';
      }
    };

    const start = (event) => {
      if (this.completed || this.phase === 'done') return;
      clearSlowTimer();
      dragging = true;
      activePointerId = event.pointerId;
      startPointer = { x: event.clientX, y: event.clientY };

      if (this.phase === 'swipe') {
        const position = swipeStartPosition();
        card.classList.remove('is-returning');
        place(position.left, position.top);
        origin = { left: position.left, top: position.top };
        furthestX = position.left;
        swipeStartedAt = 0;
      } else {
        const cardRect = rectInDevice(card);
        origin = { left: cardRect.left, top: cardRect.top };
      }

      card.classList.add('is-grabbed');
      card.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const move = (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - startPointer.x;
      const deltaY = event.clientY - startPointer.y;

      if (this.phase === 'take') {
        const stop = swipeStartPosition();
        const nextTop = Math.max(stop.top, origin.top + deltaY);
        place(stop.left, nextTop);
        if (nextTop <= stop.top + 1) prepareSwipe({ event, continuous: true });
        event.preventDefault();
        return;
      }

      if (this.phase !== 'swipe') return;
      const endLeft = swipeEndLeft();
      const nextLeft = Math.max(origin.left, Math.min(endLeft, origin.left + Math.max(0, deltaX)));
      const now = performance.now();

      if (swipeStartedAt === 0 && nextLeft > origin.left + 2) {
        swipeStartedAt = now;
        slowTimer = window.setTimeout(() => {
          if (dragging && this.phase === 'swipe' && furthestX < swipeEndLeft() - 4) retrySwipe('slow');
        }, swipeMaxMs);
      }

      place(nextLeft, origin.top);
      furthestX = Math.max(furthestX, nextLeft);
      readout.classList.add('is-scanning');
      status.textContent = 'MEMBACA KECEPATAN...';

      if (swipeStartedAt > 0) {
        const elapsed = now - swipeStartedAt;
        const distance = Math.max(1, endLeft - origin.left);
        const progress = Math.max(0, Math.min(1, (nextLeft - origin.left) / distance));
        updateSpeedReadout(elapsed, progress);

        if (nextLeft >= endLeft - 1) {
          if (elapsed < swipeMinMs) retrySwipe('fast', event.pointerId);
          else if (elapsed > swipeMaxMs) retrySwipe('slow', event.pointerId);
          else complete(event.pointerId);
        }
      }
      event.preventDefault();
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      clearSlowTimer();
      card.classList.remove('is-grabbed');
      releaseActivePointer();
      if (this.phase === 'take') returnToWallet();
      else if (this.phase === 'swipe' && !this.completed) retrySwipe('short', null);
    };

    const key = (event) => {
      if (this.completed) return;
      if (this.phase === 'take' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        prepareSwipe();
        return;
      }
      if (this.phase !== 'swipe' || event.key !== 'ArrowRight') return;
      event.preventDefault();
      const laneRect = rectInDevice(lane);
      const current = rectInDevice(card);
      const next = Math.min(swipeEndLeft(), current.left + laneRect.width * 0.2);
      place(next, swipeStartPosition().top);
      if (next >= swipeEndLeft() - 4) complete(null);
      else setReadout('MEMBACA STRIPE...', 'MODE KEYBOARD · LANJUTKAN PANAH KANAN', 'TERUSKAN SAMPAI MELEWATI TANDA SELESAI');
    };

    const initialize = () => {
      if (this.phase === 'take') {
        const position = walletPosition();
        place(position.left, position.top);
      } else if (this.phase === 'swipe') {
        const position = swipeStartPosition();
        place(position.left, position.top);
      }
    };
    requestAnimationFrame(initialize);

    card.addEventListener('pointerdown', start);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', key);
    window.addEventListener('resize', initialize);

    this.cleanupFns.push(() => {
      clearSlowTimer();
      card.removeEventListener('pointerdown', start);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', end);
      card.removeEventListener('pointercancel', end);
      card.removeEventListener('keydown', key);
      window.removeEventListener('resize', initialize);
    });
  }

  /** Cleans up active listeners, timers, and station state. */
  destroy() {
    this.timeouts.forEach((timer) => window.clearTimeout(timer));
    this.timeouts = [];
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.phase = 'take';
    this.completed = false;
  }
}
