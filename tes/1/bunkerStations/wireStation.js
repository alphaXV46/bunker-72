/**
 * wireStation.js — Station PATCH-04 BATERAI (Sambung Kabel Cadangan)
 *
 * A direct cable-matching task: pull one exposed lead from the left bank to
 * its matching socket on the right. SVG paths keep each cable thick, curved,
 * and attached to its source while it follows any pointer type.
 */

import { COLORS } from './stationsConfig.js';

const COLORS_IN_ORDER = ['red', 'yellow', 'blue', 'green'];
const RIGHT_ORDER = ['blue', 'green', 'red', 'yellow'];
const SVG_NS = 'http://www.w3.org/2000/svg';

export class WireStation {
  constructor() {
    this.wireConnections = {};
    this.cleanupFns = [];
    this.resizeObserver = null;
    this.activeDrag = null;
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

    const socket = (color, side) => `
      <button class="mg-wire-terminal mg-wire-terminal--${side} wire-${color}" type="button" data-color="${color}" aria-label="Socket ${COLORS[color].label} ${side === 'left' ? 'kabel' : 'tujuan'}">
        <span class="mg-wire-socket" aria-hidden="true"><span></span></span>
      </button>`;

    panel.innerHTML = `${introHtml}
      <div class="mg-wire-head"><span>HUBUNGKAN WARNA</span><b id="mg-wire-count">0 / 4</b></div>
      <div class="mg-wire-board" id="mg-wire-board">
        <svg class="mg-wire-cables" id="mg-wire-cables" aria-hidden="true"></svg>
        <div class="mg-wire-column mg-wire-column--left">${COLORS_IN_ORDER.map((color) => socket(color, 'left')).join('')}</div>
        <div class="mg-wire-column mg-wire-column--right">${RIGHT_ORDER.map((color) => socket(color, 'right')).join('')}</div>
        <span class="mg-wire-screw mg-wire-screw--tl" aria-hidden="true"></span><span class="mg-wire-screw mg-wire-screw--tr" aria-hidden="true"></span>
        <span class="mg-wire-screw mg-wire-screw--bl" aria-hidden="true"></span><span class="mg-wire-screw mg-wire-screw--br" aria-hidden="true"></span>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">⌁</span><span>Tarik ujung kabel dari kiri ke socket warna yang sama di kanan.</span><span class="mg-strip-code">PATCH-04</span></div>`;

    const board = panel.querySelector('#mg-wire-board');
    const cableLayer = panel.querySelector('#mg-wire-cables');
    const countEl = panel.querySelector('#mg-wire-count');
    if (!board || !cableLayer || !countEl) return;

    let redrawFrame = null;

    const makeSvg = (name) => document.createElementNS(SVG_NS, name);

    const pointFor = (terminal) => {
      const socketEl = terminal.querySelector('.mg-wire-socket') || terminal;
      const boardRect = board.getBoundingClientRect();
      const rect = socketEl.getBoundingClientRect();
      return {
        x: rect.left - boardRect.left + rect.width / 2,
        y: rect.top - boardRect.top + rect.height / 2,
      };
    };

    const cablePath = (from, to) => {
      const dx = to.x - from.x;
      const pull = Math.max(42, Math.min(150, Math.abs(dx) * 0.4));
      const curve = Math.max(-38, Math.min(38, (to.y - from.y) * 0.24));
      return `M ${from.x} ${from.y} C ${from.x + pull} ${from.y + curve}, ${to.x - pull} ${to.y - curve}, ${to.x} ${to.y}`;
    };

    const createCable = (color, preview = false) => {
      const group = makeSvg('g');
      group.classList.add('mg-wire-cable');
      if (preview) group.classList.add('mg-wire-cable--preview');
      group.dataset.color = color;
      group.style.setProperty('--wire-color', COLORS[color].hex);

      ['shadow', 'body', 'shine'].forEach((part) => {
        const path = makeSvg('path');
        path.classList.add(`mg-wire-cable__${part}`);
        group.appendChild(path);
      });

      const plug = makeSvg('circle');
      plug.classList.add('mg-wire-cable__plug');
      plug.setAttribute('r', '8');
      group.appendChild(plug);
      cableLayer.appendChild(group);
      return group;
    };

    const drawCable = (cable, from, to) => {
      const path = cablePath(from, to);
      cable.querySelectorAll('path').forEach((part) => part.setAttribute('d', path));
      const plug = cable.querySelector('.mg-wire-cable__plug');
      if (plug) {
        plug.setAttribute('cx', to.x);
        plug.setAttribute('cy', to.y);
      }
    };

    const resizeSvg = () => {
      const rect = board.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      cableLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
      cableLayer.setAttribute('width', width);
      cableLayer.setAttribute('height', height);
    };

    const drawConnections = () => {
      resizeSvg();
      Object.entries(this.wireConnections).forEach(([color, connection]) => {
        drawCable(connection.cable, pointFor(connection.from), pointFor(connection.to));
      });
      if (this.activeDrag) {
        drawCable(this.activeDrag.preview, pointFor(this.activeDrag.from), this.activeDrag.pointer);
      }
    };

    const scheduleRedraw = () => {
      if (redrawFrame !== null) window.cancelAnimationFrame(redrawFrame);
      redrawFrame = window.requestAnimationFrame(() => {
        redrawFrame = null;
        drawConnections();
      });
    };

    const updateCount = () => {
      countEl.textContent = `${Object.keys(this.wireConnections).length} / ${COLORS_IN_ORDER.length}`;
    };

    const targetAt = (clientX, clientY) => Array.from(board.querySelectorAll('.mg-wire-terminal--right')).find((target) => {
      if (target.classList.contains('is-connected')) return false;
      const rect = target.getBoundingClientRect();
      const padding = Math.max(14, Math.min(rect.width, rect.height) * 0.38);
      return clientX >= rect.left - padding && clientX <= rect.right + padding
        && clientY >= rect.top - padding && clientY <= rect.bottom + padding;
    }) || null;

    const finishDrag = (event, cancelled = false) => {
      const drag = this.activeDrag;
      if (!drag) return;

      const target = cancelled ? null : targetAt(event.clientX, event.clientY);
      const color = drag.color;
      const isCorrect = target?.dataset.color === color && !this.wireConnections[color];

      if (drag.from.hasPointerCapture?.(drag.pointerId)) drag.from.releasePointerCapture?.(drag.pointerId);
      drag.preview.remove();
      drag.from.classList.remove('is-dragging');
      board.classList.remove('is-dragging');
      this.activeDrag = null;

      if (!isCorrect) {
        setFeedback(target ? 'WARNA TIDAK SESUAI — COBA LAGI' : 'KABEL DILEPAS — CARI SOCKET WARNA SAMA', 'error');
        return;
      }

      const cable = createCable(color);
      this.wireConnections[color] = { from: drag.from, to: target, cable };
      drag.from.classList.add('is-connected');
      target.classList.add('is-connected');
      drawCable(cable, pointFor(drag.from), pointFor(target));
      updateCount();
      setFeedback(`${COLORS[color].label} TERHUBUNG`, 'success');

      if (Object.keys(this.wireConnections).length === COLORS_IN_ORDER.length) {
        onComplete('wires');
      }
    };

    const startDrag = (event) => {
      const terminal = event.currentTarget;
      const color = terminal.dataset.color;
      if (!color || this.activeDrag || this.wireConnections[color]) return;
      if (event.button !== undefined && event.button !== 0) return;

      const boardRect = board.getBoundingClientRect();
      resizeSvg();
      const preview = createCable(color, true);
      this.activeDrag = {
        color,
        from: terminal,
        pointerId: event.pointerId,
        preview,
        pointer: { x: event.clientX - boardRect.left, y: event.clientY - boardRect.top },
      };
      terminal.classList.add('is-dragging');
      board.classList.add('is-dragging');
      terminal.setPointerCapture?.(event.pointerId);
      drawCable(preview, pointFor(terminal), this.activeDrag.pointer);
      setFeedback(`TARIK KABEL ${COLORS[color].label}`, 'neutral');
      event.preventDefault();
    };

    const moveDrag = (event) => {
      const drag = this.activeDrag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const rect = board.getBoundingClientRect();
      drag.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      drawCable(drag.preview, pointFor(drag.from), drag.pointer);
      event.preventDefault();
    };

    const endDrag = (event) => {
      if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) return;
      finishDrag(event);
      event.preventDefault();
    };

    const cancelDrag = (event) => {
      if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) return;
      finishDrag(event, true);
      event.preventDefault();
    };

    const leftTerminals = Array.from(board.querySelectorAll('.mg-wire-terminal--left'));
    leftTerminals.forEach((terminal) => terminal.addEventListener('pointerdown', startDrag));
    board.addEventListener('pointermove', moveDrag);
    board.addEventListener('pointerup', endDrag);
    board.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('resize', scheduleRedraw);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(scheduleRedraw);
      this.resizeObserver.observe(board);
    }

    this.cleanupFns.push(() => {
      if (redrawFrame !== null) window.cancelAnimationFrame(redrawFrame);
      if (this.activeDrag?.from.hasPointerCapture?.(this.activeDrag.pointerId)) {
        this.activeDrag.from.releasePointerCapture?.(this.activeDrag.pointerId);
      }
      this.activeDrag?.preview.remove();
      this.activeDrag = null;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      window.removeEventListener('resize', scheduleRedraw);
      leftTerminals.forEach((terminal) => terminal.removeEventListener('pointerdown', startDrag));
      board.removeEventListener('pointermove', moveDrag);
      board.removeEventListener('pointerup', endDrag);
      board.removeEventListener('pointercancel', cancelDrag);
    });

    scheduleRedraw();
  }

  /** Cleans up listeners, active pointer state, observer, and connections. */
  destroy() {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.activeDrag = null;
    this.wireConnections = {};
  }
}
