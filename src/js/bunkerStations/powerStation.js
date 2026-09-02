/**
 * powerStation.js — Station ACTUATOR A-01 (Naikkan Daya Utama)
 *
 * Implements vertical lever drag interaction with pointer capture,
 * tap-to-lift keyboard control, percentage meter update, and threshold trigger.
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
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">↑</span><span>Tekan SPASI berulang kali untuk menaikkan daya. Jika jedanya terlalu lama, daya akan turun.</span><span class="mg-strip-code">PWR-LIFT</span></div>`;

    const fill = panel.querySelector('#mg-power-fill');
    const percent = panel.querySelector('#mg-power-percent');
    if (!fill || !percent) return;

    let completed = false;
    let animationFrame = null;
    let previousTime = null;

    const update = (next) => {
      if (completed) return;
      this.value = Math.max(0, Math.min(100, next));
      fill.style.height = `${this.value}%`;
      percent.textContent = `${Math.round(this.value).toString().padStart(2, '0')}%`;
      if (this.value >= 100) {
        completed = true;
        onComplete('power');
      }
    };

    const animate = (time) => {
      if (completed) return;
      if (previousTime === null) previousTime = time;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;

      // Each Space tap adds power; long gaps between taps let it fall.
      update(this.value - 20 * deltaSeconds);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const keyDown = (event) => {
      if (completed) return;
      if (event.code === 'Space' || event.key === ' ') {
        if (event.repeat) return;
        event.preventDefault();
        update(this.value + 9);
      }
    };

    window.addEventListener('keydown', keyDown);
    animationFrame = window.requestAnimationFrame(animate);

    this.cleanupFns.push(() => {
      window.removeEventListener('keydown', keyDown);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
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
