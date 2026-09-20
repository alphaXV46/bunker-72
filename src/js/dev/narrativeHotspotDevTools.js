import { clamp } from '../runtime/layoutSchema.js';
import { editorDataStore } from '../editorDataStore.js';
import { setVisualEditorActive } from './editorInputGate.js';

const MIN_SIZE = 24;
const EDITOR_VERSION = 1;

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeHotspot = (spot = {}) => {
  const width = clamp(Number(spot.w) || 8, 1, 100);
  const height = clamp(Number(spot.h) || 8, 1, 100);
  return {
    ...spot,
    x: clamp(Number(spot.x) || 0, 0, Math.max(0, 100 - width)),
    y: clamp(Number(spot.y) || 0, 0, Math.max(0, 100 - height)),
    w: width,
    h: height,
  };
};

const geometryOnly = (spot) => ({
  id: String(spot.id),
  x: Number(spot.x),
  y: Number(spot.y),
  w: Number(spot.w),
  h: Number(spot.h),
});

const mergeGeometry = (hotspots, overrides) => {
  const overrideById = new Map(
    (Array.isArray(overrides) ? overrides : [])
      .filter((spot) => spot && spot.id)
      .map((spot) => [String(spot.id), spot])
  );
  return hotspots.map((spot) => normalizeHotspot({
    ...spot,
    ...(overrideById.get(String(spot.id)) || {}),
    id: spot.id,
  }));
};

/**
 * Developer-only geometry editor for narrative/background hotspots.
 * It deliberately copies only x/y/w/h into editor data; narrative labels,
 * flags, rewards, progression and callbacks never enter the persistence path.
 */
export class NarrativeHotspotDevTools {
  constructor({
    root = null,
    onChange = () => {},
    onStatus = () => {},
    onBeforeEnable = () => {},
    canToggle = () => true,
  } = {}) {
    this.root = root;
    this.onChange = onChange;
    this.onStatus = onStatus;
    this.onBeforeEnable = onBeforeEnable;
    this.canToggle = canToggle;
    this.enabled = false;
    this.helpVisible = true;
    this.context = null;
    this.selectedId = null;
    this.drag = null;
    this.history = [];
    this.future = [];
    this.statusMessage = 'HOTSPOT EDITOR OFF';
    this._contextToken = 0;
    this._dragFrameId = null;
    this._resizeObserver = null;
    this._overlay = null;
    this._toolbar = null;
    this._info = null;
    this._boxes = new Map();

    this._handlePointerDown = (event) => this._onPointerDown(event);
    this._handlePointerMove = (event) => this._onPointerMove(event);
    this._handlePointerUp = (event) => this._onPointerUp(event);
    this._handlePointerCancel = (event) => this._onPointerCancel(event);
    this._handleResize = () => this.refresh();
  }

  setContext(context = null) {
    const token = ++this._contextToken;
    this._cancelDrag(true);
    this.history = [];
    this.future = [];
    this.selectedId = null;
    this.context = context?.stage && Array.isArray(context.hotspots)
      ? {
          sceneKey: String(context.sceneKey || 'global'),
          stage: context.stage,
          baseHotspots: clone(context.baseHotspots || context.hotspots).map(normalizeHotspot),
          hotspots: clone(context.hotspots).map(normalizeHotspot),
        }
      : null;
    this._removeOverlay();
    if (this.enabled) {
      this._createSurface();
      this.refresh();
    }

    if (!this.context) return Promise.resolve(null);
    return editorDataStore.read('hotspots', this.context.sceneKey)
      .then((payload) => {
        if (token !== this._contextToken || !this.context) return null;
        const overrides = Array.isArray(payload) ? payload : payload?.hotspots;
        if (Array.isArray(overrides) && overrides.length) {
          this.context.hotspots = mergeGeometry(this.context.baseHotspots, overrides);
          this._emitChange('override loaded');
          this.statusMessage = `HOTSPOT ${this.context.sceneKey.toUpperCase()} DIMUAT`;
        }
        this.refresh();
        return this.context.hotspots;
      })
      .catch((error) => {
        if (token === this._contextToken) {
          this.statusMessage = 'HOTSPOT CACHE FILE DIABAIKAN';
          console.warn('[NarrativeHotspotDevTools] Tidak dapat memuat hotspot.', error);
          this.refresh();
        }
        return null;
      });
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === this.enabled) {
      if (next) this.refresh();
      return this.enabled;
    }
    if (next) this.onBeforeEnable?.();
    this.enabled = next;
    this._cancelDrag(true);
    this.history = [];
    this.future = [];
    if (this.enabled) {
      this.statusMessage = this.context ? 'HOTSPOT EDITOR AKTIF — PILIH AREA' : 'MENUNGGU LAYER HOTSPOT';
      this._createSurface();
      this.refresh();
    } else {
      this._removeOverlay();
      this.statusMessage = 'HOTSPOT EDITOR OFF';
    }
    setVisualEditorActive('hotspot', this.enabled);
    this._notifyStatus();
    return this.enabled;
  }

  toggle() {
    if (!this.enabled && !this.canToggle()) return false;
    return this.setEnabled(!this.enabled);
  }

  setHelpVisible(visible) {
    this.helpVisible = Boolean(visible);
    this._renderToolbar();
    this._renderInfo();
    return this.helpVisible;
  }

  toggleHelp() {
    return this.setHelpVisible(!this.helpVisible);
  }

  getStatus() {
    const selected = this.context?.hotspots.find((spot) => spot.id === this.selectedId) || null;
    return {
      enabled: this.enabled,
      sceneKey: this.context?.sceneKey || 'global',
      selectedId: this.selectedId,
      selectedBox: selected ? geometryOnly(selected) : null,
      hotspotCount: this.context?.hotspots.length || 0,
      statusMessage: this.statusMessage,
      helpVisible: this.helpVisible,
    };
  }

  handleKeyDown(event) {
    if (!this.enabled) return false;
    const key = String(event.key || '').toLowerCase();

    if (key === 'f8' && !event.repeat) {
      event.preventDefault();
      this.toggleHelp();
      return true;
    }
    if (event.ctrlKey && key === 's') {
      event.preventDefault();
      void this.save();
      return true;
    }
    if (event.ctrlKey && key === 'e') {
      event.preventDefault();
      this.export();
      return true;
    }
    if (event.ctrlKey && !event.shiftKey && key === 'z') {
      event.preventDefault();
      this.undo();
      return true;
    }
    if ((event.ctrlKey && key === 'y') || (event.ctrlKey && event.shiftKey && key === 'z')) {
      event.preventDefault();
      this.redo();
      return true;
    }
    if (event.altKey && key === 'r') {
      event.preventDefault();
      void this.reset();
      return true;
    }
    if (key === 'delete') {
      event.preventDefault();
      this.statusMessage = 'DELETE DILARANG — HOTSPOT LOGIKA TETAP';
      this._renderToolbar();
      return true;
    }
    if (key === 'escape') {
      event.preventDefault();
      this.selectedId = null;
      this.statusMessage = 'SELEKSI HOTSPOT DIBATALKAN';
      this.refresh();
      return true;
    }

    if (this.selectedId && !event.ctrlKey && !event.altKey) {
      const delta = {
        arrowleft: [-1, 0],
        arrowright: [1, 0],
        arrowup: [0, -1],
        arrowdown: [0, 1],
      }[key];
      if (delta) {
        event.preventDefault();
        const rect = this._getStageRect();
        const stepX = (event.shiftKey ? 10 : 1) / Math.max(1, rect.width) * 100;
        const stepY = (event.shiftKey ? 10 : 1) / Math.max(1, rect.height) * 100;
        this._beginMutation();
        const spot = this._getSelectedSpot();
        spot.x = clamp(spot.x + delta[0] * stepX, 0, 100 - spot.w);
        spot.y = clamp(spot.y + delta[1] * stepY, 0, 100 - spot.h);
        this._changed(`GESER ${Math.round(spot.x * 10) / 10}%,${Math.round(spot.y * 10) / 10}%`);
        return true;
      }
    }
    return false;
  }

  refresh() {
    if (!this.enabled) return;
    this._renderSurfaceBounds();
    this._renderOverlay();
    this._renderToolbar();
    this._renderInfo();
  }

  async save() {
    if (!this.context) return null;
    const payload = this._makePayload();
    try {
      const result = await editorDataStore.write('hotspots', this.context.sceneKey, payload);
      this.statusMessage = result?.fileSaved === false ? 'HOTSPOT TERSIMPAN DI CACHE LOKAL' : 'FILE HOTSPOT TERSIMPAN';
      this._renderToolbar();
      return payload;
    } catch (error) {
      this.statusMessage = 'HOTSPOT LOKAL (FILE GAGAL)';
      console.warn('[NarrativeHotspotDevTools] Tidak dapat menyimpan hotspot.', error);
      this._renderToolbar();
      return payload;
    }
  }

  async reset() {
    if (!this.context) return null;
    this._beginMutation();
    this.context.hotspots = clone(this.context.baseHotspots).map(normalizeHotspot);
    this.selectedId = null;
    this._emitChange('reset');
    this.statusMessage = 'HOTSPOT DIRESET KE SUMBER';
    this.refresh();
    try {
      await editorDataStore.remove('hotspots', this.context.sceneKey);
    } catch (error) {
      console.warn('[NarrativeHotspotDevTools] Tidak dapat menghapus override hotspot.', error);
    }
    return this.context.hotspots;
  }

  export() {
    const payload = this._makePayload();
    const json = JSON.stringify(payload, null, 2);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${payload.sceneKey}-hotspots.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.statusMessage = 'JSON HOTSPOT DIEKSPOR';
    } catch (error) {
      console.info('[NarrativeHotspotDevTools] Hotspot JSON:', json);
      this.statusMessage = 'JSON ADA DI CONSOLE';
    }
    this._renderToolbar();
    return payload;
  }

  undo() {
    const previous = this.history.pop();
    if (!previous || !this.context) {
      this.statusMessage = 'TIDAK ADA UNDO HOTSPOT';
      this._renderToolbar();
      return false;
    }
    this.future.push(clone(this.context.hotspots));
    this.context.hotspots = previous;
    this._emitChange('undo');
    this.statusMessage = 'UNDO HOTSPOT';
    this.refresh();
    return true;
  }

  redo() {
    const next = this.future.pop();
    if (!next || !this.context) {
      this.statusMessage = 'TIDAK ADA REDO HOTSPOT';
      this._renderToolbar();
      return false;
    }
    this.history.push(clone(this.context.hotspots));
    this.context.hotspots = next;
    this._emitChange('redo');
    this.statusMessage = 'REDO HOTSPOT';
    this.refresh();
    return true;
  }

  destroy() {
    this.setEnabled(false);
    this.setContext(null);
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this.root = null;
  }

  _createSurface() {
    if (!this.root || this._overlay) return;
    this._overlay = document.createElement('div');
    this._overlay.className = 'narrative-hotspot-editor-overlay';
    this._overlay.dataset.bunker72EditorSurface = 'true';
    this._overlay.addEventListener('pointerdown', this._handlePointerDown, { passive: false });
    this._overlay.addEventListener('pointermove', this._handlePointerMove, { passive: false });
    this._overlay.addEventListener('pointerup', this._handlePointerUp, { passive: false });
    this._overlay.addEventListener('pointercancel', this._handlePointerCancel, { passive: false });
    this._overlay.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.root.appendChild(this._overlay);

    this._toolbar = document.createElement('div');
    this._toolbar.className = 'narrative-hotspot-editor-toolbar';
    this._toolbar.dataset.bunker72EditorSurface = 'true';
    this.root.appendChild(this._toolbar);

    this._info = document.createElement('div');
    this._info.className = 'narrative-hotspot-editor-info';
    this._info.dataset.bunker72EditorSurface = 'true';
    this.root.appendChild(this._info);

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this.refresh());
      this._resizeObserver.observe(this.root);
      if (this.context.stage) this._resizeObserver.observe(this.context.stage);
    }
    window.addEventListener('resize', this._handleResize);
  }

  _removeOverlay() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (typeof window !== 'undefined') window.removeEventListener('resize', this._handleResize);
    if (this._dragFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._dragFrameId);
      this._dragFrameId = null;
    }
    this._overlay?.remove();
    this._toolbar?.remove();
    this._info?.remove();
    this._overlay = null;
    this._toolbar = null;
    this._info = null;
    this._boxes.clear();
  }

  _getStageRect() {
    return this.context?.stage?.getBoundingClientRect?.() || { left: 0, top: 0, width: 1, height: 1 };
  }

  _renderSurfaceBounds() {
    if (!this._overlay || !this.root || !this.context?.stage) return;
    const rootRect = this.root.getBoundingClientRect();
    const stageRect = this._getStageRect();
    this._overlay.style.left = `${stageRect.left - rootRect.left}px`;
    this._overlay.style.top = `${stageRect.top - rootRect.top}px`;
    this._overlay.style.width = `${stageRect.width}px`;
    this._overlay.style.height = `${stageRect.height}px`;
  }

  _renderOverlay() {
    if (!this._overlay) return;
    const activeIds = new Set();
    (this.context?.hotspots || []).forEach((spot) => {
      activeIds.add(spot.id);
      let box = this._boxes.get(spot.id);
      if (!box) {
        box = document.createElement('div');
        box.className = 'narrative-hotspot-editor-box';
        box.dataset.hotspotId = spot.id;
        ['nw', 'ne', 'sw', 'se'].forEach((handle) => {
          const handleElement = document.createElement('span');
          handleElement.className = `narrative-hotspot-editor-handle handle-${handle}`;
          handleElement.dataset.handle = handle;
          box.appendChild(handleElement);
        });
        const label = document.createElement('span');
        label.className = 'narrative-hotspot-editor-label';
        box.appendChild(label);
        this._overlay.appendChild(box);
        this._boxes.set(spot.id, box);
      }
      const displaySpot = this.drag?.id === spot.id && this.drag.previewSpot
        ? this.drag.previewSpot
        : spot;
      const isSelected = this.selectedId === spot.id;
      box.classList.toggle('is-selected', isSelected);
      box.style.left = `${displaySpot.x}%`;
      box.style.top = `${displaySpot.y}%`;
      box.style.width = `${displaySpot.w}%`;
      box.style.height = `${displaySpot.h}%`;
      box.style.transform = this.drag?.id === spot.id && this.drag.previewOffset
        ? `translate3d(${this.drag.previewOffset.x}px, ${this.drag.previewOffset.y}px, 0)`
        : '';
      const label = box.querySelector('.narrative-hotspot-editor-label');
      if (label) label.textContent = `${displaySpot.id}  ${displaySpot.x.toFixed(1)}%,${displaySpot.y.toFixed(1)}% ${displaySpot.w.toFixed(1)}%×${displaySpot.h.toFixed(1)}%`;
    });
    this._boxes.forEach((box, id) => {
      if (!activeIds.has(id)) {
        box.remove();
        this._boxes.delete(id);
      }
    });
  }

  _renderToolbar() {
    if (!this._toolbar) return;
    this._toolbar.hidden = !this.helpVisible;
    if (!this.helpVisible) return;
    const status = this.getStatus();
    const selected = status.selectedBox;
    this._toolbar.textContent = [
      `[F10] HOTSPOT ON | ${status.sceneKey.toUpperCase()} | ${status.hotspotCount} AREA`,
      selected ? `${selected.id} ${selected.x.toFixed(1)}%,${selected.y.toFixed(1)}% ${selected.w.toFixed(1)}%×${selected.h.toFixed(1)}%` : 'Klik area hotspot untuk memilih',
      'DRAG geser • HANDLE resize • ARROW 1px • SHIFT+ARROW 10px',
      'AUTO-SAVE • CTRL+S simpan ulang • CTRL+E export • CTRL+Z/Y undo • ALT+R reset',
      'DELETE dilarang • F8 bantuan • ESC batal pilih',
      status.statusMessage,
    ].join('\n');
  }

  _renderInfo() {
    if (!this._info) return;
    this._info.hidden = !this.helpVisible;
    this._info.innerHTML = '<strong>F10 HOTSPOT EDITOR</strong><span>GEOMETRI SAJA — LOGIKA CERITA TETAP</span>';
  }

  _getSelectedSpot() {
    return this.context?.hotspots.find((spot) => spot.id === this.selectedId) || null;
  }

  _beginMutation() {
    if (this.drag?._historyRecorded) return;
    if (!this.context) return;
    this.history.push(clone(this.context.hotspots));
    if (this.history.length > 60) this.history.shift();
    this.future = [];
    if (this.drag) this.drag._historyRecorded = true;
  }

  _changed(message) {
    this.statusMessage = message;
    this._emitChange(message);
    this.refresh();
  }

  _emitChange(reason) {
    if (!this.context) return;
    const payload = {
      sceneKey: this.context.sceneKey,
      hotspots: clone(this.context.hotspots),
      reason,
    };
    this.onChange(payload);
    // Persist every committed geometry change immediately. Ctrl+S remains
    // available as an explicit retry, but leaving the editor no longer
    // discards a drag or keyboard nudge.
    void this.save();
    this._notifyStatus();
  }

  _notifyStatus() {
    try {
      this.onStatus(this.getStatus());
    } catch (error) {
      console.warn('[NarrativeHotspotDevTools] onStatus callback failed.', error);
    }
  }

  _onPointerDown(event) {
    if (!this.enabled || !this.context) return;
    const box = event.target.closest?.('.narrative-hotspot-editor-box');
    if (!box || !this._overlay?.contains(box)) return;
    event.preventDefault();
    event.stopPropagation();
    const id = box.dataset.hotspotId;
    const spot = this.context.hotspots.find((item) => item.id === id);
    if (!spot) return;
    const stageRect = this._getStageRect();
    this.selectedId = id;
    this.drag = {
      pointerId: event.pointerId,
      id,
      handle: event.target.closest?.('.narrative-hotspot-editor-handle')?.dataset.handle || null,
      stageRect,
      startPoint: { x: event.clientX, y: event.clientY },
      startSpot: { ...spot },
      previewSpot: { ...spot },
      previewOffset: null,
    };
    this._beginMutation();
    box.setPointerCapture?.(event.pointerId);
    this.statusMessage = `${id} DIPILIH`;
    this.refresh();
  }

  _onPointerMove(event) {
    if (!this.enabled || !this.context || !this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const stageRect = this.drag.stageRect;
    const width = Math.max(1, stageRect.width);
    const height = Math.max(1, stageRect.height);
    const start = this.drag.startSpot;
    const dx = (event.clientX - this.drag.startPoint.x) / width * 100;
    const dy = (event.clientY - this.drag.startPoint.y) / height * 100;
    let x = start.x;
    let y = start.y;
    let w = start.w;
    let h = start.h;
    if (!this.drag.handle) {
      x = clamp(start.x + dx, 0, 100 - start.w);
      y = clamp(start.y + dy, 0, 100 - start.h);
    } else {
      const minW = MIN_SIZE / width * 100;
      const minH = MIN_SIZE / height * 100;
      if (this.drag.handle.includes('w')) {
        x = clamp(start.x + dx, 0, start.x + start.w - minW);
        w = start.w - (x - start.x);
      }
      if (this.drag.handle.includes('e')) w = clamp(start.w + dx, minW, 100 - start.x);
      if (this.drag.handle.includes('n')) {
        y = clamp(start.y + dy, 0, start.y + start.h - minH);
        h = start.h - (y - start.y);
      }
      if (this.drag.handle.includes('s')) h = clamp(start.h + dy, minH, 100 - start.y);
    }
    this.drag.previewSpot = normalizeHotspot({ ...start, x, y, w, h });
    this.drag.previewOffset = this.drag.handle
      ? null
      : {
          x: (this.drag.previewSpot.x - start.x) / 100 * width,
          y: (this.drag.previewSpot.y - start.y) / 100 * height,
        };
    this.statusMessage = `${this.drag.id} ${this.drag.previewSpot.x.toFixed(1)}%,${this.drag.previewSpot.y.toFixed(1)}%`;
    if (this._dragFrameId === null) {
      this._dragFrameId = window.requestAnimationFrame(() => {
        this._dragFrameId = null;
        this._renderOverlay();
        this._renderToolbar();
      });
    }
  }

  _flushDragPreview() {
    if (!this.drag || !this.context) return;
    const spot = this.context.hotspots.find((item) => item.id === this.drag.id);
    if (!spot || !this.drag.previewSpot) return;
    Object.assign(spot, normalizeHotspot(this.drag.previewSpot));
  }

  _cancelDrag(removeHistory = false) {
    if (this._dragFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._dragFrameId);
      this._dragFrameId = null;
    }
    if (!this.drag) return;
    if (removeHistory && this.drag._historyRecorded) this.history.pop();
    this.drag = null;
  }

  _onPointerUp(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (this._dragFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._dragFrameId);
      this._dragFrameId = null;
    }
    this._flushDragPreview();
    const spot = this._getSelectedSpot();
    const changed = spot && this.drag.previewSpot && ['x', 'y', 'w', 'h'].some((key) => spot[key] !== this.drag.startSpot[key]);
    if (!changed && this.drag._historyRecorded) this.history.pop();
    const id = this.drag.id;
    this.drag = null;
    if (changed) this._changed(`${id} DIPERBARUI`);
    else this.refresh();
  }

  _onPointerCancel(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this._cancelDrag(true);
    this.statusMessage = 'EDIT HOTSPOT DIBATALKAN';
    this.refresh();
  }

  _makePayload() {
    return {
      version: EDITOR_VERSION,
      sceneKey: this.context?.sceneKey || 'global',
      hotspots: (this.context?.hotspots || []).map(geometryOnly),
      exportedAt: new Date().toISOString(),
    };
  }
}
