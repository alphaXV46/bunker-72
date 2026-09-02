/**
 * Bunker entry maintenance console (Orchestrator / Facade).
 *
 * This module coordinates the temporary post-entry interaction layer.
 * Concrete station mechanics are modularized in ./bunkerStations/.
 * It preserves complete backward compatibility and lifecycle contracts.
 */

import { STATIONS } from './bunkerStations/stationsConfig.js';
import { CardStation } from './bunkerStations/cardStation.js';
import { PowerStation } from './bunkerStations/powerStation.js';
import { RotorStation } from './bunkerStations/rotorStation.js';
import { WireStation } from './bunkerStations/wireStation.js';

export { STATIONS };

export class BunkerMinigame {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.root
   * @param {Function} [options.onComplete]
   */
  constructor({ root, onComplete }) {
    this.root = root;
    this.defaultOnComplete = onComplete;
    this.currentStationId = null;
    this.activeOptions = null;
    this.activeStation = null;
    this.timeouts = [];

    this.stations = {
      card: new CardStation(),
      power: new PowerStation(),
      rotor: new RotorStation(),
      wires: new WireStation(),
    };
  }

  /**
   * Opens a specific standalone minigame station.
   * @param {'card'|'power'|'rotor'|'wires'|'numbers'} stationId
   * @param {Object} options
   */
  openStation(stationId = 'card', options = {}) {
    if (!this.root) return;
    this.reset();

    if (stationId === 'numbers') stationId = 'rotor';
    if (!STATIONS[stationId]) stationId = 'card';

    this.currentStationId = stationId;
    this.activeOptions = options;
    const station = STATIONS[stationId];

    this.renderShell(station);
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');

    const introHtml = `
      <div class="mg-station-heading">
        <div>
          <span class="mg-eyebrow">${options.kicker || station.kicker}</span>
          <h1>${options.title || station.name}</h1>
          <p>${options.tutorial || station.tutorial}</p>
        </div>
        <div class="mg-state-badge">
          <span class="mg-state-led"></span>
          <span>STATUS <b>AKTIF</b></span>
        </div>
      </div>`;

    const targetStation = this.stations[stationId];
    if (targetStation && this.panel) {
      this.activeStation = targetStation;
      targetStation.mount(this.panel, {
        introHtml,
        allowFailure: options.allowFailure,
        onComplete: (id) => this.finishStation(id || stationId),
        onFailure: (id, message) => this.failStation(id || stationId, message),
        setFeedback: (msg, tone) => this.setFeedback(msg, tone),
      });
    }
  }

  /**
   * Backwards-compatible open method defaults to 'card'.
   */
  open(stationId = 'card', options = {}) {
    this.openStation(stationId, options);
  }

  /**
   * Closes the console and resets state.
   */
  close() {
    this.reset();
    if (!this.root) return;
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = '';
  }

  /**
   * Resets active timers, station interaction, and references.
   */
  reset() {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
    this.clearStation();
    this.currentStationId = null;
    this.activeOptions = null;
  }

  /**
   * Renders the outer modal frame, terminal header, close button, and footer.
   * @param {Object} station
   */
  renderShell(station) {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="mg-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="mg-brand-title">
        <div class="mg-shell">
          <header class="mg-header">
            <div class="mg-brand-block">
              <span class="mg-kicker">${station.kicker}</span>
              <strong id="mg-brand-title" class="mg-brand">${station.name} <span>[${station.code}]</span></strong>
            </div>
            <div class="mg-header-status">
              <span class="mg-live-dot"></span>
              <span class="mg-status-pill">SIAGA</span>
              <button id="mg-close-btn" class="mg-close-btn" type="button" aria-label="Tutup konsol" title="Tutup / Batal">✕</button>
            </div>
          </header>

          <main class="mg-console" aria-live="polite">
            <div id="mg-panel" class="mg-panel"></div>
          </main>

          <footer class="mg-footer">
            <div class="mg-hint">
              <span class="mg-hint-mark">i</span>
              <span id="mg-hint-text">${station.tutorial}</span>
            </div>
            <div id="mg-feedback" class="mg-feedback" role="status">SIAP MENERIMA INPUT</div>
          </footer>
        </div>
      </div>`;

    this.panel = this.root.querySelector('#mg-panel');
    this.hint = this.root.querySelector('#mg-hint-text');
    this.feedback = this.root.querySelector('#mg-feedback');

    const closeBtn = this.root.querySelector('#mg-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const onCancel = this.activeOptions?.onCancel || this.activeOptions?.onFailure;
        const stationId = this.currentStationId;
        this.close();
        onCancel?.({ canceled: true, success: false, stationId });
      });
    }
  }

  /**
   * Handles successful completion of a station.
   * @param {string} stationId
   */
  finishStation(stationId) {
    this.clearStation({ keepPanel: true });
    const station = STATIONS[stationId] || {};
    const successMsg = station.defaultSuccessMessage || 'PROTOKOL BERHASIL';
    this.setFeedback(successMsg, 'success');

    const badge = this.panel?.querySelector('.mg-state-badge');
    if (badge) {
      badge.classList.add('is-success');
      badge.innerHTML = '<span class="mg-state-led"></span><span>STATUS <b>SELESAI ✓</b></span>';
    }

    const pill = this.root?.querySelector('.mg-status-pill');
    if (pill) {
      pill.textContent = 'SELESAI';
      pill.classList.add('is-success');
    }

    this.timeouts.push(
      window.setTimeout(() => {
        const onDone = this.activeOptions?.onComplete || this.defaultOnComplete;
        this.close();
        onDone?.({ success: true, stationId });
      }, 900)
    );
  }

  /**
   * Handles failure of a station (e.g. rotor shake consequences).
   * @param {string} stationId
   * @param {string} [message]
   */
  failStation(stationId, message) {
    this.clearStation({ keepPanel: true });
    const failMsg = message || 'SEKUENSI GAGAL';
    this.setFeedback(failMsg, 'error');

    const badge = this.panel?.querySelector('.mg-state-badge');
    if (badge) {
      badge.classList.remove('is-success');
      badge.style.borderColor = 'var(--mg-red)';
      badge.innerHTML = '<span class="mg-state-led" style="background:var(--mg-red);box-shadow:0 0 10px var(--mg-red)"></span><span>STATUS <b>ERROR ✕</b></span>';
    }

    const pill = this.root?.querySelector('.mg-status-pill');
    if (pill) {
      pill.textContent = 'ERROR';
      pill.classList.add('is-error');
    }

    this.timeouts.push(
      window.setTimeout(() => {
        const onFail = this.activeOptions?.onFailure;
        this.close();
        onFail?.({ success: false, stationId });
      }, 1000)
    );
  }

  /**
   * Cleans up the active station and optionally clears the panel DOM.
   * @param {Object} [options]
   * @param {boolean} [options.keepPanel]
   */
  clearStation({ keepPanel = false } = {}) {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];

    if (this.activeStation) {
      this.activeStation.destroy();
      this.activeStation = null;
    }

    if (!keepPanel && this.panel) {
      this.panel.innerHTML = '';
    }
  }

  /**
   * Updates the bottom feedback bar with message and tone attribute.
   * @param {string} message
   * @param {'neutral'|'success'|'error'} [tone]
   */
  setFeedback(message, tone = 'neutral') {
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.dataset.tone = tone;
  }
}
