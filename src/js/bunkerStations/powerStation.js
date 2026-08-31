/**
 * powerStation.js — Station ACTUATOR A-01 (Naikkan Daya Utama)
 *
 * Implements vertical lever drag interaction with pointer capture,
 * percentage meter update, keyboard control, and threshold trigger.
 */

export class PowerStation {
  constructor() {
    this.value = 0;
    this.cleanupFns = [];
  }

  /**
   * Mounts and renders the Power Station into the provided panel element.
   * @param {HTMLElement} panel
   * @param {Object} context
   * @param {string} context.introHtml
   * @param {Function} context.onComplete
   */
  mount(panel, { introHtml, onComplete }) {
    this.destroy();
    this.value = 0;

    panel.innerHTML = `${introHtml}
      <div class="mg-power-layout">
        <div class="mg-meter-card">
          <div class="mg-meter-label"><span>BUS VOLTAGE</span><b id="mg-power-percent">00%</b></div>
          <div class="mg-power-meter"><span id="mg-power-fill"></span><i class="mg-meter-zone zone-yellow"></i><i class="mg-meter-zone zone-green"></i></div>
          <div class="mg-meter-scale"><span>0</span><span>RISIKO</span><span>AMAN</span><span>100</span></div>
          <div class="mg-readout"><span class="mg-readout-led"></span><span id="mg-power-readout">MENUNGGU TARIKAN TUAS</span></div>
        </div>
        <div class="mg-lever-console">
          <div class="mg-lever-title"><span>ACTUATOR A-01</span><small>UPWARD LIFT</small></div>
          <div class="mg-lever-track"><span class="mg-lever-line"></span><button id="mg-lever" class="mg-lever" aria-label="Tuas daya, tarik ke atas" title="Tekan dan tarik ke atas"><span class="mg-lever-grip">↑</span></button><span class="mg-lever-notch notch-top"></span><span class="mg-lever-notch notch-bottom"></span></div>
          <div class="mg-lever-caption"><span>LOCK</span><b>TARIK KE ATAS</b><span>RELEASE</span></div>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">↑</span><span>Tekan kepala tuas, tahan, lalu geser lurus ke atas. Jangan lepas sebelum lampu hijau menyala.</span><span class="mg-strip-code">PWR-LIFT</span></div>`;

    const lever = panel.querySelector('#mg-lever');
    const fill = panel.querySelector('#mg-power-fill');
    const percent = panel.querySelector('#mg-power-percent');
    const readout = panel.querySelector('#mg-power-readout');
    if (!lever || !fill || !percent || !readout) return;

    let lastY = null;
    let dragging = false;
    let completed = false;

    const update = (next) => {
      if (completed) return;
      this.value = Math.max(0, Math.min(100, next));
      fill.style.width = `${this.value}%`;
      percent.textContent = `${Math.round(this.value).toString().padStart(2, '0')}%`;
      lever.style.setProperty('--lever-progress', `${this.value}%`);
      readout.textContent = this.value >= 100 ? 'BUS UTAMA TERKUNCI' : this.value > 0 ? 'DAYA MENINGKAT...' : 'MENUNGGU TARIKAN TUAS';

      if (this.value >= 100) {
        completed = true;
        onComplete('power');
      }
    };

    const start = (event) => {
      if (completed) return;
      dragging = true;
      lastY = event.clientY;
      lever.classList.add('is-grabbed');
      lever.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const move = (event) => {
      if (!dragging || completed) return;
      const delta = lastY - event.clientY;
      lastY = event.clientY;
      if (delta > 0) update(this.value + delta * 0.72);
      event.preventDefault();
    };

    const end = () => {
      dragging = false;
      lastY = null;
      lever.classList.remove('is-grabbed');
    };

    const key = (event) => {
      if (completed) return;
      if (event.key === 'ArrowUp' || event.key === ' ') {
        event.preventDefault();
        update(this.value + 12);
      }
    };

    lever.addEventListener('pointerdown', start);
    lever.addEventListener('pointermove', move);
    lever.addEventListener('pointerup', end);
    lever.addEventListener('pointercancel', end);
    lever.addEventListener('keydown', key);

    this.cleanupFns.push(() => {
      lever.removeEventListener('pointerdown', start);
      lever.removeEventListener('pointermove', move);
      lever.removeEventListener('pointerup', end);
      lever.removeEventListener('pointercancel', end);
      lever.removeEventListener('keydown', key);
    });
  }

  /**
   * Cleans up all event listeners and state.
   */
  destroy() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.value = 0;
  }
}
