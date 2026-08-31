/**
 * cardStation.js — Station SEAL 72-A (Otentikasi Kartu Akses)
 *
 * Implements horizontal swipe card reader interaction with pointer events,
 * drag boundaries, keyboard fallback, and visual feedback.
 */

export class CardStation {
  constructor() {
    this.cardX = 0;
    this.cleanupFns = [];
    this.timeouts = [];
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
    this.cardX = 0;

    panel.innerHTML = `${introHtml}
      <div class="mg-card-layout">
        <div class="mg-card-readout"><span class="mg-reader-beacon"></span><div><span class="mg-eyebrow">READER / PORT B</span><strong id="mg-card-status">MENUNGGU KARTU</strong><small>Jarak aman: 15 cm</small></div></div>
        <div class="mg-card-track" id="mg-card-track">
          <div class="mg-track-label track-label-left">INSERT</div><div class="mg-track-label track-label-right">ACCEPT</div>
          <div class="mg-access-reader" id="mg-access-reader"><span class="mg-reader-scan"></span><b>72-A</b><small>SCAN</small></div>
          <button id="mg-access-card" class="mg-access-card" aria-label="Kartu akses Bunker 72, geser ke kanan"><span class="mg-card-chip"></span><span class="mg-card-title">BUNKER <b>72</b></span><span class="mg-card-name">KELUARGA // PRIORITAS</span><span class="mg-card-barcode"></span><span class="mg-card-number">72 04 19 87</span></button>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">→</span><span>Tekan kartu lalu geser lurus ke kanan sampai masuk penuh ke area pembaca.</span><span class="mg-strip-code">ID-SWIPE</span></div>`;

    const track = panel.querySelector('#mg-card-track');
    const card = panel.querySelector('#mg-access-card');
    const status = panel.querySelector('#mg-card-status');
    if (!track || !card || !status) return;

    let dragging = false;
    let startX = 0;
    let originX = 0;

    const maxX = () => Math.max(0, track.clientWidth - card.offsetWidth - 18);

    const update = (x) => {
      const max = maxX();
      this.cardX = Math.max(0, Math.min(max, x));
      card.style.transform = `translateX(${this.cardX}px)`;
      card.style.setProperty('--swipe-progress', `${max ? (this.cardX / max) * 100 : 0}%`);
      if (max > 20 && this.cardX >= max - 3) {
        status.textContent = 'KARTU TERBACA — TAHAN';
        status.parentElement?.parentElement?.classList.add('is-ready');
      } else if (dragging) {
        status.textContent = 'MEMBACA STRIPE...';
      }
    };

    const start = (event) => {
      dragging = true;
      startX = event.clientX;
      originX = this.cardX;
      card.classList.add('is-grabbed');
      card.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const move = (event) => {
      if (!dragging) return;
      update(originX + event.clientX - startX);
      event.preventDefault();
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-grabbed');
      const max = maxX();
      if (max > 20 && this.cardX >= max - 3) {
        status.textContent = 'AKSES DITERIMA';
        onComplete('card');
      } else {
        status.textContent = 'GESER LEBIH JAUH KE KANAN';
        card.classList.add('is-returning');
        update(0);
        const timer = window.setTimeout(() => card.classList.remove('is-returning'), 360);
        this.timeouts.push(timer);
        setFeedback('KARTU BELUM MELEWATI PEMBACA', 'error');
      }
    };

    const key = (event) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        const max = maxX();
        update(this.cardX + max * 0.18);
        if (max > 20 && this.cardX >= max - 3) {
          status.textContent = 'AKSES DITERIMA';
          onComplete('card');
        }
      }
    };

    card.addEventListener('pointerdown', start);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', key);

    this.cleanupFns.push(() => {
      card.removeEventListener('pointerdown', start);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', end);
      card.removeEventListener('pointercancel', end);
      card.removeEventListener('keydown', key);
    });
  }

  /**
   * Cleans up all event listeners, active timeouts, and state.
   */
  destroy() {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.cardX = 0;
  }
}
