/**
 * rotorStation.js — Station TURBIN STABILIZER (Penyelarasan Rotor 1—2—3)
 *
 * Implements interval-based rotating dials timing puzzle with targets [1, 2, 3],
 * 3 lives countdown, vibration error feedback, and failure callback.
 */

export class RotorStation {
  constructor() {
    this.numberTimer = null;
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;
    this.cleanupFns = [];
  }

  /**
   * Mounts and renders the Rotor Station into the provided panel element.
   * @param {HTMLElement} panel
   * @param {Object} context
   * @param {string} context.introHtml
   * @param {Function} context.onComplete
   * @param {Function} context.onFailure
   * @param {Function} context.setFeedback
   * @param {boolean} [context.allowFailure]
   */
  mount(panel, { introHtml, onComplete, onFailure, setFeedback, allowFailure }) {
    this.destroy();

    const targets = [1, 2, 3];
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;

    panel.innerHTML = `${introHtml}
      <div class="mg-number-head"><span>ALIGNMENT ARRAY / LIVE ROTOR</span><span id="mg-number-lives">KESEMPATAN: <b>3</b></span></div>
      <div class="mg-number-board">
        ${targets.map((target, index) => `
          <div class="mg-number-row" data-number-row="${index}">
            <div class="mg-number-index">0${index + 1}</div>
            <div class="mg-number-dial-shell"><button class="mg-number-dial" data-dial="${index}" aria-label="Soket angka ${target}"><span class="mg-dial-ring"></span><strong>${this.numberValues[index]}</strong><small>ROTATE</small></button></div>
            <div class="mg-number-cable"></div>
            <div class="mg-receptacle"><span class="mg-receptacle-light"></span><b>${target}</b><small>LOCK</small></div>
            <span class="mg-row-status">TAP SAAT COCOK</span>
          </div>`).join('')}
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">123</span><span>Angka berputar sendiri. Ketuk soket ketika angka di dalamnya sama dengan kotak target.</span><span class="mg-strip-code">SYNC-LOCK</span></div>`;

    const updateRow = (index) => {
      const row = panel.querySelector(`[data-number-row="${index}"]`);
      if (row) {
        const strongEl = row.querySelector('.mg-number-dial strong');
        if (strongEl) strongEl.textContent = this.numberValues[index];
      }
    };

    const rotate = () => {
      this.numberValues = this.numberValues.map((value, index) => (this.numberLocked[index] ? value : (value % 3) + 1));
      this.numberValues.forEach((_, index) => updateRow(index));
    };

    this.numberTimer = window.setInterval(rotate, 680);

    const dials = panel.querySelectorAll('.mg-number-dial');
    dials.forEach((dial) => {
      const handleClick = () => {
        const index = Number(dial.dataset.dial);
        if (this.numberLocked[index]) return;

        if (this.numberValues[index] === targets[index]) {
          this.numberLocked[index] = true;
          const row = dial.closest('.mg-number-row');
          if (row) {
            row.classList.add('is-locked');
            const statusEl = row.querySelector('.mg-row-status');
            if (statusEl) statusEl.textContent = 'TERKUNCI ✓';
          }
          setFeedback(`ROTOR ${index + 1} TERKUNCI`, 'success');

          if (this.numberLocked.every(Boolean)) {
            if (this.numberTimer) {
              window.clearInterval(this.numberTimer);
              this.numberTimer = null;
            }
            onComplete('rotor');
          }
        } else {
          this.numberMistakes += 1;
          const lives = Math.max(0, 3 - this.numberMistakes);
          const livesEl = panel.querySelector('#mg-number-lives b');
          if (livesEl) livesEl.textContent = lives;
          setFeedback(lives ? 'SALAH WAKTU — TUNGGU ANGKA TARGET' : 'ROTOR GAGAL', 'error');

          dial.classList.remove('is-missed');
          void dial.offsetWidth; // Trigger reflow for animation restart
          dial.classList.add('is-missed');

          if (!lives) {
            if (this.numberTimer) {
              window.clearInterval(this.numberTimer);
              this.numberTimer = null;
            }

            if (allowFailure) {
              onFailure('rotor', 'SEKUENSI GAGAL — GETARAN MERUSAK STRUKTUR');
            } else {
              this.numberMistakes = 0;
              this.numberValues = [2, 3, 1];
              this.numberLocked = [false, false, false];
              panel.querySelectorAll('.mg-number-row').forEach((row) => row.classList.remove('is-locked'));
              panel.querySelectorAll('.mg-row-status').forEach((status) => { status.textContent = 'TAP SAAT COCOK'; });
              if (livesEl) livesEl.textContent = '3';
              setFeedback('ROTOR RESET — KESEMPATAN DIPULIHKAN', 'error');
              this.numberValues.forEach((_, idx) => updateRow(idx));
              this.numberTimer = window.setInterval(rotate, 680);
            }
          }
        }
      };

      dial.addEventListener('click', handleClick);
      this.cleanupFns.push(() => dial.removeEventListener('click', handleClick));
    });
  }

  /**
   * Cleans up rotating interval, event listeners, and state.
   */
  destroy() {
    if (this.numberTimer) {
      window.clearInterval(this.numberTimer);
      this.numberTimer = null;
    }
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;
  }
}
