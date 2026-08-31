/**
 * wireStation.js — Station PATCH-04 BATERAI (Sambung Kabel Cadangan)
 *
 * Implements patch bay cable dragging, trigonometry line rendering,
 * color matching verification, and resize recalculations.
 */

import { COLORS } from './stationsConfig.js';

export class WireStation {
  constructor() {
    this.wireConnections = {};
    this.cleanupFns = [];
  }

  /**
   * Mounts and renders the Wire Station into the provided panel element.
   * @param {HTMLElement} panel
   * @param {Object} context
   * @param {string} context.introHtml
   * @param {Function} context.onComplete
   * @param {Function} context.setFeedback
   */
  mount(panel, { introHtml, onComplete, setFeedback }) {
    this.destroy();
    this.wireConnections = {};

    const colors = ['red', 'yellow', 'blue', 'green'];
    const rightOrder = ['blue', 'green', 'red', 'yellow'];

    panel.innerHTML = `${introHtml}
      <div class="mg-wire-head"><span>PATCH BAY / 04 CHANNELS</span><b id="mg-wire-count">0 / 4 TERHUBUNG</b></div>
      <div class="mg-wire-board" id="mg-wire-board">
        <div class="mg-wire-column"><span class="mg-wire-column-label">SUMBER</span>${colors.map((color) => `<button class="mg-wire-terminal mg-wire-terminal--left wire-${color}" data-color="${color}" aria-label="Terminal ${COLORS[color].label} kiri"><i></i><b>${COLORS[color].label}</b><small>OUT</small></button>`).join('')}</div>
        <div class="mg-wire-cables" id="mg-wire-cables"></div>
        <div class="mg-wire-column mg-wire-column--right"><span class="mg-wire-column-label">DISTRIBUSI</span>${rightOrder.map((color) => `<button class="mg-wire-terminal mg-wire-terminal--right wire-${color}" data-color="${color}" aria-label="Terminal ${COLORS[color].label} kanan"><i></i><b>${COLORS[color].label}</b><small>IN</small></button>`).join('')}</div>
        <div class="mg-wire-harness"><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">⌁</span><span>Tarik kabel dari terminal SUMBER menuju DISTRIBUSI dengan warna yang sama.</span><span class="mg-strip-code">PATCH-04</span></div>`;

    const board = panel.querySelector('#mg-wire-board');
    const cableLayer = panel.querySelector('#mg-wire-cables');
    const countEl = panel.querySelector('#mg-wire-count');
    if (!board || !cableLayer || !countEl) return;

    let drag = null;

    const pointFor = (element) => {
      const boardRect = board.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - boardRect.left + rect.width / 2,
        y: rect.top - boardRect.top + rect.height / 2,
      };
    };

    const drawLine = (line, from, to, color) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      line.style.left = `${from.x}px`;
      line.style.top = `${from.y}px`;
      line.style.width = `${length}px`;
      line.style.setProperty('--wire-color', COLORS[color].hex);
      line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    };

    const redraw = () => {
      cableLayer.querySelectorAll('.mg-wire-cable').forEach((line) => {
        const from = board.querySelector(`[data-color="${line.dataset.color}"].mg-wire-terminal--left`);
        const to = board.querySelector(`[data-color="${line.dataset.color}"].mg-wire-terminal--right`);
        if (from && to) drawLine(line, pointFor(from), pointFor(to), line.dataset.color);
      });
      if (drag?.preview) drawLine(drag.preview, pointFor(drag.from), drag.pointer, drag.color);
    };

    const move = (event) => {
      if (!drag) return;
      const rect = board.getBoundingClientRect();
      drag.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      drawLine(drag.preview, pointFor(drag.from), drag.pointer, drag.color);
      event.preventDefault();
    };

    const end = (event) => {
      if (!drag) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.mg-wire-terminal--right');
      const color = drag.color;

      if (target?.dataset.color === color && !this.wireConnections[color]) {
        this.wireConnections[color] = target;
        drag.preview.remove();
        drag = null;

        const left = board.querySelector(`[data-color="${color}"].mg-wire-terminal--left`);
        const line = document.createElement('div');
        line.className = 'mg-wire-cable';
        line.dataset.color = color;
        cableLayer.appendChild(line);

        if (left) left.classList.add('is-connected');
        target.classList.add('is-connected');
        if (left) drawLine(line, pointFor(left), pointFor(target), color);

        const count = Object.keys(this.wireConnections).length;
        countEl.textContent = `${count} / 4 TERHUBUNG`;
        setFeedback(`${COLORS[color].label} TERHUBUNG`, 'success');

        if (count === colors.length) {
          onComplete('wires');
        }
      } else {
        drag.preview.remove();
        drag = null;
        setFeedback(target ? 'SALAH WARNA — KABEL DILEPAS' : 'KABEL TERPUTUS — COBA LAGI', 'error');
      }
      event.preventDefault();
    };

    const start = (event) => {
      const terminal = event.target.closest('.mg-wire-terminal--left');
      if (!terminal || this.wireConnections[terminal.dataset.color]) return;

      const preview = document.createElement('div');
      preview.className = 'mg-wire-cable mg-wire-cable--preview';
      cableLayer.appendChild(preview);

      drag = { color: terminal.dataset.color, from: terminal, preview, pointer: pointFor(terminal) };
      board.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    board.addEventListener('pointerdown', start);
    board.addEventListener('pointermove', move);
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
    window.addEventListener('resize', redraw);

    this.cleanupFns.push(() => {
      window.removeEventListener('resize', redraw);
      board.removeEventListener('pointerdown', start);
      board.removeEventListener('pointermove', move);
      board.removeEventListener('pointerup', end);
      board.removeEventListener('pointercancel', end);
    });

    window.requestAnimationFrame(redraw);
  }

  /**
   * Cleans up all event listeners, resize observer, and connection state.
   */
  destroy() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.wireConnections = {};
  }
}
