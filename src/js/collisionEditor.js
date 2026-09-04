/**
 * Reusable developer-only rectangle collision editor for canvas maps.
 *
 * The editor deliberately knows nothing about a specific minigame. A host
 * supplies the mutable collider array, native map dimensions and camera state.
 * This keeps the existing movement/collision implementation as the single
 * source of truth while making map tuning possible directly in the canvas.
 */

const EDITOR_VERSION = 1;
const MIN_RECT_SIZE = 4;
const HANDLE_RADIUS = 9;
const HIT_PADDING = 8;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeAngle = (value) => {
  let angle = Number(value);
  if (!Number.isFinite(angle)) angle = 0;
  angle %= 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Math.round(angle * 10) / 10;
};

const rotatePoint = (point, center, degrees) => {
  const radians = (Number(degrees) || 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

const getRectCenter = (rect) => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

const rectAngle = (rect) => Number(rect?.angle) || 0;

const cloneCollider = (collider) => ({ ...collider });

const cloneColliders = (colliders) => (Array.isArray(colliders)
  ? colliders.map(cloneCollider)
  : []);

const normalizeRect = (rect, mapSize) => {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)
    || !Number.isFinite(rect.w) || !Number.isFinite(rect.h)) {
    return null;
  }

  const maxW = Math.max(MIN_RECT_SIZE, Number(mapSize?.width) || Number.MAX_SAFE_INTEGER);
  const maxH = Math.max(MIN_RECT_SIZE, Number(mapSize?.height) || Number.MAX_SAFE_INTEGER);
  const w = clamp(Math.round(Math.abs(rect.w)), MIN_RECT_SIZE, maxW);
  const h = clamp(Math.round(Math.abs(rect.h)), MIN_RECT_SIZE, maxH);
  const x = clamp(Math.round(rect.x), 0, Math.max(0, maxW - w));
  const y = clamp(Math.round(rect.y), 0, Math.max(0, maxH - h));

  const normalized = {
    ...rect,
    x,
    y,
    w,
    h,
  };

  if (Object.prototype.hasOwnProperty.call(rect, 'angle') || rectAngle(rect) !== 0) {
    normalized.angle = normalizeAngle(rect.angle);
  }

  return normalized;
};

const normalizeColliderList = (colliders, mapSize) => cloneColliders(colliders)
  .map((collider) => normalizeRect(collider, mapSize))
  .filter(Boolean);

const safeStorageKey = (key) => {
  const normalized = String(key || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `bunker72:collision-draft:v${EDITOR_VERSION}:${normalized || 'default'}`;
};

const normalizeLabel = (collider) => String(collider?.id || 'UNNAMED_COLLIDER')
  .replace(/([a-z])([A-Z])/g, '$1_$2')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .toUpperCase();

const isPrimaryPointer = (event) => event.pointerType !== 'mouse' || event.button === 0;

export class CollisionEditor {
  /**
   * @param {Object} options
   * @param {HTMLCanvasElement|null} [options.canvas]
   * @param {string} [options.storageKey]
   * @param {Function} options.getColliders - Returns the mutable active array.
   * @param {Function} [options.getDefaultColliders]
   * @param {Function} options.getMapSize - Returns { width, height } in native pixels.
   * @param {Function} [options.getViewport] - Returns { width, height } of the canvas backing buffer.
   * @param {Function} [options.getCamera] - Returns camera { x, y } in world pixels.
   * @param {Function} [options.getRenderOffset] - Returns extra world-to-screen translation.
   * @param {Function} [options.getPersistedColliders] - Optional filtered list saved to disk.
   * @param {Function} [options.onChange]
   * @param {Function} [options.onReset]
   * @param {Function} [options.getLabel]
   * @param {Object} [options.filePersistence] - Async load/save/remove adapter.
   * @param {Function} [options.onPan] - Receives free-camera world deltas.
   * @param {Function} [options.onResetCamera]
   */
  constructor({
    canvas = null,
    storageKey = 'default',
    getColliders,
    getDefaultColliders = () => [],
    getMapSize,
    getViewport = () => ({ width: canvas?.width || 1, height: canvas?.height || 1 }),
    getCamera = () => ({ x: 0, y: 0 }),
    getRenderOffset = () => ({ x: 0, y: 0 }),
    getPersistedColliders = getColliders,
    onChange = () => {},
    onReset = null,
    getLabel = normalizeLabel,
    filePersistence = null,
    onPan = () => {},
    onResetCamera = () => {},
  }) {
    this.canvas = null;
    this.storageKey = safeStorageKey(storageKey);
    this.getColliders = getColliders;
    this.getDefaultColliders = getDefaultColliders;
    this.getMapSize = getMapSize;
    this.getViewport = getViewport;
    this.getCamera = getCamera;
    this.getRenderOffset = getRenderOffset;
    this.getPersistedColliders = getPersistedColliders;
    this.onChange = onChange;
    this.onReset = onReset;
    this.getLabel = getLabel;
    this.filePersistence = filePersistence;
    this.onPan = onPan;
    this.onResetCamera = onResetCamera;

    this.enabled = false;
    this.selectedIndex = null;
    this.drag = null;
    this.createMode = null;
    this.previewRect = null;
    this.history = [];
    this.future = [];
    this.statusMessage = 'BELUM ADA DRAFT';
    this.draftLoaded = false;
    this.localDraftLoaded = false;
    this.fileDraftLoaded = false;
    this.mutationVersion = 0;
    this.freeCamera = false;
    this._boundCanvas = false;

    this._handlePointerDown = (event) => this._onPointerDown(event);
    this._handlePointerMove = (event) => this._onPointerMove(event);
    this._handlePointerUp = (event) => this._onPointerUp(event);
    this._handlePointerCancel = (event) => this._onPointerCancel(event);
    this._handleWheel = (event) => this._onWheel(event);
    this._handleContextMenu = (event) => {
      if (this.enabled || this.freeCamera) event.preventDefault();
    };

    if (canvas) this.attach(canvas);
  }

  attach(canvas) {
    if (this.canvas === canvas && this._boundCanvas) {
      this.canvas.style.touchAction = this.enabled ? 'none' : '';
      return;
    }

    this.detach();
    this.canvas = canvas || null;
    if (!this.canvas) return;

    this.canvas.addEventListener('pointerdown', this._handlePointerDown, { passive: false });
    this.canvas.addEventListener('pointermove', this._handlePointerMove, { passive: false });
    this.canvas.addEventListener('pointerup', this._handlePointerUp, { passive: false });
    this.canvas.addEventListener('pointercancel', this._handlePointerCancel, { passive: false });
    this.canvas.addEventListener('wheel', this._handleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._handleContextMenu);
    this._boundCanvas = true;
    this.canvas.style.touchAction = this.enabled ? 'none' : '';
  }

  detach() {
    if (this.canvas && this._boundCanvas) {
      this.canvas.removeEventListener('pointerdown', this._handlePointerDown);
      this.canvas.removeEventListener('pointermove', this._handlePointerMove);
      this.canvas.removeEventListener('pointerup', this._handlePointerUp);
      this.canvas.removeEventListener('pointercancel', this._handlePointerCancel);
      this.canvas.removeEventListener('wheel', this._handleWheel);
      this.canvas.removeEventListener('contextmenu', this._handleContextMenu);
      this.canvas.style.touchAction = '';
    }
    this.canvas = null;
    this._boundCanvas = false;
    this.drag = null;
    this.previewRect = null;
  }

  destroy() {
    this.detach();
    this.enabled = false;
    this.freeCamera = false;
    this.selectedIndex = null;
    this.history = [];
    this.future = [];
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === this.enabled) return this.enabled;

    this.enabled = next;
    this.drag = null;
    this.previewRect = null;
    this.createMode = null;
    this.history = [];
    this.future = [];

    if (this.canvas) {
      this.canvas.style.touchAction = (this.enabled || this.freeCamera) ? 'none' : '';
      this.canvas.style.cursor = this.enabled ? 'crosshair' : '';
    }

    if (this.enabled) {
      this._loadDraftOnce();
      void this._loadFileDraft();
      this.statusMessage = this.draftLoaded ? 'DRAFT AKTIF' : 'EDIT LANGSUNG, BELUM DISIMPAN';
    } else {
      this.statusMessage = 'EDITOR OFF';
    }

    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  /**
   * Loads the disk-backed draft even when the visual editor is not open.
   * This makes Ctrl+S edits affect the next normal playthrough automatically.
   */
  async loadSavedDraft() {
    this._loadDraftOnce();
    if (!this.localDraftLoaded) await this._loadFileDraft();
    return this.draftLoaded;
  }

  setFreeCamera(enabled) {
    this.freeCamera = Boolean(enabled);
    if (this.canvas) {
      this.canvas.style.touchAction = (this.enabled || this.freeCamera) ? 'none' : '';
      this.canvas.style.cursor = this.freeCamera ? 'grab' : (this.enabled ? 'crosshair' : '');
    }
    if (!this.freeCamera && this.drag?.mode === 'pan') this.drag = null;
    return this.freeCamera;
  }

  getSelectedCollider() {
    const colliders = this._getColliderList();
    if (this.selectedIndex === null || !colliders[this.selectedIndex]) return null;
    return colliders[this.selectedIndex];
  }

  getStatus() {
    const selected = this.getSelectedCollider();
    return {
      enabled: this.enabled,
      selectedIndex: this.selectedIndex,
      selectedLabel: selected ? this.getLabel(selected) : null,
      selectedRect: selected ? { ...selected } : null,
      createMode: this.createMode,
      statusMessage: this.statusMessage,
      draftLoaded: this.draftLoaded,
      colliderCount: this._getColliderList().length,
      freeCamera: this.freeCamera,
    };
  }

  handleKeyDown(event) {
    if (!this.enabled && !this.freeCamera) return false;

    const key = String(event.key || '').toLowerCase();
    if (this.freeCamera && !event.ctrlKey && !event.altKey && ['i', 'j', 'k', 'l'].includes(key)) {
      const nudge = event.shiftKey ? 25 : 5;
      const delta = {
        i: [0, -nudge],
        j: [-nudge, 0],
        k: [0, nudge],
        l: [nudge, 0],
      }[key];
      this.onPan({ dx: delta[0], dy: delta[1], source: 'keyboard' });
      this.statusMessage = `FREE CAM PAN ${Math.round(this._getCamera().x)},${Math.round(this._getCamera().y)}`;
      return true;
    }
    if (this.freeCamera && key === 'home' && !event.ctrlKey && !event.altKey) {
      this.onResetCamera();
      this.statusMessage = 'FREE CAM KEMBALI KE PLAYER';
      return true;
    }

    if (!this.enabled) return false;
    if (event.ctrlKey && key === 's') {
      this.saveDraft();
      return true;
    }
    if (event.ctrlKey && key === 'e') {
      this.exportDraft();
      return true;
    }
    if (event.ctrlKey && !event.shiftKey && key === 'z') {
      this.undo();
      return true;
    }
    if ((event.ctrlKey && key === 'y') || (event.ctrlKey && event.shiftKey && key === 'z')) {
      this.redo();
      return true;
    }
    if (event.altKey && key === 'r') {
      this.resetDraft();
      return true;
    }
    if (key === 'escape') {
      this.selectedIndex = null;
      this.createMode = null;
      this.previewRect = null;
      this.drag = null;
      this._setCursor('crosshair');
      this.statusMessage = 'SELEKSI DIBATALKAN';
      return true;
    }
    if (key === 'delete' || key === 'backspace') {
      this.deleteSelected();
      return true;
    }
    if (key === 'n' && !event.ctrlKey && !event.altKey) {
      this.createMode = event.shiftKey ? 'furniture' : 'wall';
      this.selectedIndex = null;
      this.statusMessage = `TAMBAH ${this.createMode.toUpperCase()} — DRAG DI AREA KOSONG`;
      this._setCursor('crosshair');
      return true;
    }

    if (this.selectedIndex !== null && !event.ctrlKey && !event.altKey) {
      const nudge = event.shiftKey ? 5 : 1;
      const delta = {
        arrowleft: [-nudge, 0],
        arrowright: [nudge, 0],
        arrowup: [0, -nudge],
        arrowdown: [0, nudge],
      }[key];
      if (delta) {
        this._beginMutation();
        const collider = this.getSelectedCollider();
        if (collider) {
          const mapSize = this._getMapSize();
          collider.x = clamp(Math.round(collider.x + delta[0]), 0, Math.max(0, mapSize.width - collider.w));
          collider.y = clamp(Math.round(collider.y + delta[1]), 0, Math.max(0, mapSize.height - collider.h));
          this._changed('nudge');
        }
        return true;
      }
    }

    return false;
  }

  render(ctx) {
    if (!this.enabled || !ctx) return;

    const selected = this.getSelectedCollider();
    if (selected) {
      ctx.save();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
      this._fillRect(ctx, selected);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 4]);
      this._strokeRect(ctx, selected);
      ctx.setLineDash([]);

      const handleSize = HANDLE_RADIUS * 2;
      ctx.fillStyle = '#ecfeff';
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 1.5;
      this._getHandlePoints(selected).forEach((point) => {
        ctx.fillRect(point.x - HANDLE_RADIUS, point.y - HANDLE_RADIUS, handleSize, handleSize);
        ctx.strokeRect(point.x - HANDLE_RADIUS, point.y - HANDLE_RADIUS, handleSize, handleSize);
      });

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#cffafe';
      const labelPoint = this._getHandlePoints(selected)[0];
      ctx.fillText(`${this.getLabel(selected)}  [SELECTED]`, labelPoint.x + 4, Math.max(14, labelPoint.y - 8));
      ctx.restore();
    }

    if (this.previewRect) {
      ctx.save();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
      ctx.fillRect(this.previewRect.x, this.previewRect.y, this.previewRect.w, this.previewRect.h);
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(this.previewRect.x, this.previewRect.y, this.previewRect.w, this.previewRect.h);
      ctx.setLineDash([]);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#cffafe';
      ctx.fillText(`NEW_${String(this.createMode || 'COLLIDER').toUpperCase()}`, this.previewRect.x + 4, this.previewRect.y + 14);
      ctx.restore();
    }
  }

  saveDraft() {
    const payload = this._buildPayload();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem(this.storageKey, JSON.stringify(payload));
        this.draftLoaded = true;
        this.statusMessage = 'DRAFT TERSIMPAN';
      } catch (error) {
        this.statusMessage = 'GAGAL SIMPAN DRAFT';
        console.warn('[CollisionEditor] Tidak dapat menyimpan draft collision.', error);
      }
    }

    if (typeof this.filePersistence?.save === 'function') {
      Promise.resolve(this.filePersistence.save(payload))
        .then((result) => {
          this.fileDraftLoaded = true;
          this.statusMessage = result?.fileSaved === false ? 'DRAFT LOKAL (FILE TIDAK AKTIF)' : 'FILE COLLISION TERSIMPAN';
        })
        .catch((error) => {
          this.statusMessage = 'DRAFT LOKAL (FILE GAGAL)';
          console.warn('[CollisionEditor] Tidak dapat menyimpan file collision.', error);
        });
    }

    return payload;
  }

  exportDraft() {
    const payload = this._buildPayload();
    const json = JSON.stringify(payload, null, 2);

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${payload.mapKey}-collision-draft.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.statusMessage = 'JSON COLLISION DIEKSPOR';
    } catch (error) {
      // The console output remains useful in test harnesses and restricted
      // browser contexts where Blob/download APIs are unavailable.
      console.info('[CollisionEditor] Collision draft JSON:', json);
      this.statusMessage = 'JSON ADA DI CONSOLE';
    }

    return payload;
  }

  resetDraft() {
    this._beginMutation();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.removeItem(this.storageKey);
      } catch (_) {}
    }

    if (typeof this.filePersistence?.remove === 'function') {
      Promise.resolve(this.filePersistence.remove())
        .then((result) => {
          this.fileDraftLoaded = result?.fileSaved === false;
          if (result?.fileSaved !== false) this.statusMessage = 'FILE COLLISION DIKEMBALIKAN KE AWAL';
        })
        .catch((error) => console.warn('[CollisionEditor] Tidak dapat mereset file collision.', error));
    }

    const defaults = normalizeColliderList(this.getDefaultColliders(), this._getMapSize());
    if (typeof this.onReset === 'function') {
      this.onReset(cloneColliders(defaults));
    } else {
      this._replaceColliders(defaults);
    }

    this.draftLoaded = false;
    this.selectedIndex = null;
    this.statusMessage = 'KEMBALI KE COLLIDER AWAL';
    this._changed('reset');
    return defaults;
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) {
      this.statusMessage = 'TIDAK ADA UNDO';
      return false;
    }
    this.future.push(cloneColliders(this._getColliderList()));
    this._replaceColliders(previous);
    this._changed('undo');
    return true;
  }

  redo() {
    const next = this.future.pop();
    if (!next) {
      this.statusMessage = 'TIDAK ADA REDO';
      return false;
    }
    this.history.push(cloneColliders(this._getColliderList()));
    this._replaceColliders(next);
    this._changed('redo');
    return true;
  }

  deleteSelected() {
    const colliders = this._getColliderList();
    if (this.selectedIndex === null || !colliders[this.selectedIndex]) {
      this.statusMessage = 'PILIH COLLIDER DULU';
      return false;
    }

    this._beginMutation();
    const deleted = colliders.splice(this.selectedIndex, 1)[0];
    this.selectedIndex = null;
    this.statusMessage = `${this.getLabel(deleted)} DIHAPUS (Ctrl+Z UNTUK UNDO)`;
    this._changed('delete');
    return true;
  }

  _getColliderList() {
    const colliders = typeof this.getColliders === 'function' ? this.getColliders() : [];
    return Array.isArray(colliders) ? colliders : [];
  }

  _getMapSize() {
    const size = typeof this.getMapSize === 'function' ? this.getMapSize() : {};
    return {
      width: Math.max(MIN_RECT_SIZE, Number(size.width) || 1),
      height: Math.max(MIN_RECT_SIZE, Number(size.height) || 1),
    };
  }

  _getViewport() {
    const viewport = typeof this.getViewport === 'function' ? this.getViewport() : {};
    return {
      width: Math.max(1, Number(viewport.width) || this.canvas?.width || 1),
      height: Math.max(1, Number(viewport.height) || this.canvas?.height || 1),
    };
  }

  _getCamera() {
    const camera = typeof this.getCamera === 'function' ? this.getCamera() : {};
    const renderOffset = typeof this.getRenderOffset === 'function' ? this.getRenderOffset() : {};
    return {
      x: Number(camera.x) || 0,
      y: Number(camera.y) || 0,
      renderX: Number(renderOffset.x) || 0,
      renderY: Number(renderOffset.y) || 0,
    };
  }

  _getPointerWorldPoint(event) {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const viewport = this._getViewport();
    // The canvas uses object-fit: contain. Account for letterboxing so a
    // click remains map-aligned even when the game is not exactly 16:9.
    const scale = this._getCanvasScale(rect, viewport);
    const drawnWidth = viewport.width * scale;
    const drawnHeight = viewport.height * scale;
    const offsetX = (rect.width - drawnWidth) / 2;
    const offsetY = (rect.height - drawnHeight) / 2;
    const screenX = (event.clientX - rect.left - offsetX) / scale;
    const screenY = (event.clientY - rect.top - offsetY) / scale;
    const camera = this._getCamera();

    return {
      x: screenX + camera.x - camera.renderX,
      y: screenY + camera.y - camera.renderY,
    };
  }

  _getCanvasScale(rect = this.canvas?.getBoundingClientRect(), viewport = this._getViewport()) {
    if (!rect?.width || !rect?.height) return 1;
    return Math.max(0.0001, Math.min(rect.width / viewport.width, rect.height / viewport.height));
  }

  _getHandlePoints(collider) {
    const points = [
      { id: 'nw', x: collider.x, y: collider.y },
      { id: 'ne', x: collider.x + collider.w, y: collider.y },
      { id: 'sw', x: collider.x, y: collider.y + collider.h },
      { id: 'se', x: collider.x + collider.w, y: collider.y + collider.h },
    ];
    const angle = rectAngle(collider);
    if (!angle) return points;
    const center = getRectCenter(collider);
    return points.map((point) => ({ ...point, ...rotatePoint(point, center, angle) }));
  }

  _getHandleAt(point, collider) {
    if (!point || !collider) return null;
    const radius = HANDLE_RADIUS + 3;
    return this._getHandlePoints(collider).find((handle) => (
      Math.abs(point.x - handle.x) <= radius && Math.abs(point.y - handle.y) <= radius
    ))?.id || null;
  }

  _hitTest(point) {
    if (!point) return null;
    const colliders = this._getColliderList();
    for (let index = colliders.length - 1; index >= 0; index -= 1) {
      const collider = colliders[index];
      const localPoint = rectAngle(collider)
        ? rotatePoint(point, getRectCenter(collider), -rectAngle(collider))
        : point;
      if (
        localPoint.x >= collider.x - HIT_PADDING
        && localPoint.x <= collider.x + collider.w + HIT_PADDING
        && localPoint.y >= collider.y - HIT_PADDING
        && localPoint.y <= collider.y + collider.h + HIT_PADDING
      ) {
        return index;
      }
    }
    return null;
  }

  _setCursor(cursor) {
    if (this.canvas) this.canvas.style.cursor = cursor;
  }

  _fillRect(ctx, rect) {
    const angle = rectAngle(rect);
    if (!angle) {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    const center = getRectCenter(rect);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }

  _strokeRect(ctx, rect) {
    const angle = rectAngle(rect);
    if (!angle) {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    const center = getRectCenter(rect);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    ctx.restore();
  }

  _onWheel(event) {
    if (!this.enabled || this.selectedIndex === null) return;
    const selected = this.getSelectedCollider();
    if (!selected) return;

    event.preventDefault();
    this._beginMutation();
    const increment = event.shiftKey ? 1 : 5;
    selected.angle = normalizeAngle(rectAngle(selected) + (event.deltaY < 0 ? increment : -increment));
    this.statusMessage = `${this.getLabel(selected)} ROTASI ${selected.angle}°`;
    this._changed('rotate');
  }

  _onPointerDown(event) {
    if (!this.enabled && !this.freeCamera) return;

    const isMiddleMouse = event.pointerType === 'mouse' && event.button === 1;
    if (this.freeCamera && isMiddleMouse) {
      event.preventDefault();
      this.drag = {
        pointerId: event.pointerId,
        mode: 'pan',
        clientX: event.clientX,
        clientY: event.clientY,
      };
      this._setCursor('grabbing');
      this.canvas?.setPointerCapture?.(event.pointerId);
      return;
    }

    if (!this.enabled || !isPrimaryPointer(event)) return;
    const point = this._getPointerWorldPoint(event);
    if (!point) return;
    event.preventDefault();

    const colliders = this._getColliderList();
    const selected = this.getSelectedCollider();
    const selectedHandle = selected ? this._getHandleAt(point, selected) : null;

    if (selectedHandle !== null) {
      this._beginMutation();
      this.drag = {
        pointerId: event.pointerId,
        mode: 'resize',
        handle: selectedHandle,
        index: this.selectedIndex,
        startRect: { ...selected },
      };
      this.canvas?.setPointerCapture?.(event.pointerId);
      return;
    }

    const hitIndex = this._hitTest(point);
    if (hitIndex !== null) {
      this.selectedIndex = hitIndex;
      const collider = colliders[hitIndex];
      this._setCursor('grabbing');
      this._beginMutation();
      this.drag = {
        pointerId: event.pointerId,
        mode: 'move',
        index: hitIndex,
        offsetX: point.x - collider.x,
        offsetY: point.y - collider.y,
        startRect: { ...collider },
      };
      this.statusMessage = `${this.getLabel(collider)} DIPILIH — DRAG / RESIZE HANDLE`;
      this.canvas?.setPointerCapture?.(event.pointerId);
      return;
    }

    if (this.createMode) {
      this._beginMutation();
      const defaultId = this._nextNewId(this.createMode);
      const created = {
        id: defaultId,
        type: this.createMode,
        x: Math.round(point.x),
        y: Math.round(point.y),
        w: MIN_RECT_SIZE,
        h: MIN_RECT_SIZE,
      };
      colliders.push(created);
      this.selectedIndex = colliders.length - 1;
      this.drag = {
        pointerId: event.pointerId,
        mode: 'create',
        index: this.selectedIndex,
        startX: point.x,
        startY: point.y,
        startRect: { ...created },
      };
      this.previewRect = { ...created };
      this.canvas?.setPointerCapture?.(event.pointerId);
      return;
    }

    this.selectedIndex = null;
    this.statusMessage = 'KLIK COLLIDER UNTUK MEMILIH';
    this._setCursor('crosshair');
  }

  _onPointerMove(event) {
    if (!this.enabled && !this.freeCamera) return;

    if (this.drag?.mode === 'pan' && this.drag.pointerId === event.pointerId) {
      event.preventDefault();
      const scale = this._getCanvasScale();
      const dx = -(event.clientX - this.drag.clientX) / scale;
      const dy = -(event.clientY - this.drag.clientY) / scale;
      this.drag.clientX = event.clientX;
      this.drag.clientY = event.clientY;
      this.onPan({ dx, dy, source: 'pointer' });
      this.statusMessage = `FREE CAM PAN ${Math.round(this._getCamera().x)},${Math.round(this._getCamera().y)}`;
      return;
    }

    if (!this.enabled) return;
    const point = this._getPointerWorldPoint(event);
    if (!point) return;

    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      const selected = this.getSelectedCollider();
      const handle = selected ? this._getHandleAt(point, selected) : null;
      if (handle) {
        this._setCursor(handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize');
      } else if (this._hitTest(point) !== null) {
        this._setCursor('grab');
      } else {
        this._setCursor(this.createMode ? 'crosshair' : 'default');
      }
      return;
    }

    event.preventDefault();
    const collider = this._getColliderList()[this.drag.index];
    if (!collider) return;

    if (this.drag.mode === 'move') {
      const mapSize = this._getMapSize();
      collider.x = clamp(Math.round(point.x - this.drag.offsetX), 0, Math.max(0, mapSize.width - collider.w));
      collider.y = clamp(Math.round(point.y - this.drag.offsetY), 0, Math.max(0, mapSize.height - collider.h));
      this.statusMessage = `${this.getLabel(collider)} XY ${collider.x},${collider.y}`;
      this._changed('move');
      return;
    }

    const resizeHandle = this.drag.mode === 'create' ? 'create' : this.drag.handle;
    const rect = this._resizeRect(this.drag.startRect, point, resizeHandle, this.drag.startX, this.drag.startY);
    Object.assign(collider, rect);
    this.previewRect = this.drag.mode === 'create' ? { ...rect } : null;
    this.statusMessage = `${this.getLabel(collider)} ${collider.w}x${collider.h}`;
    this._changed(this.drag.mode === 'create' ? 'create' : 'resize');
  }

  _onPointerUp(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.canvas?.releasePointerCapture?.(event.pointerId);
    if (this.drag.mode === 'pan') {
      this.drag = null;
      this._setCursor(this.freeCamera ? 'grab' : 'default');
      return;
    }
    const wasCreate = this.drag.mode === 'create';
    const collider = this._getColliderList()[this.drag.index];
    if (wasCreate && collider && (collider.w < MIN_RECT_SIZE || collider.h < MIN_RECT_SIZE)) {
      this._getColliderList().splice(this.drag.index, 1);
      this.selectedIndex = null;
    }
    this.drag = null;
    this.previewRect = null;
    this.createMode = null;
    this._setCursor('default');
    this.statusMessage = collider
      ? `${this.getLabel(collider)} SIAP — Ctrl+S UNTUK SIMPAN`
      : 'TIDAK ADA COLLIDER DIBUAT';
  }

  _onPointerCancel(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    this.canvas?.releasePointerCapture?.(event.pointerId);
    if (this.drag.mode === 'pan') {
      this.drag = null;
      this._setCursor(this.freeCamera ? 'grab' : 'default');
      return;
    }
    const collider = this._getColliderList()[this.drag.index];
    if (collider && this.drag.startRect) Object.assign(collider, this.drag.startRect);
    if (this.drag.mode === 'create') this._getColliderList().splice(this.drag.index, 1);
    this.drag = null;
    this.previewRect = null;
    this.createMode = null;
    this._setCursor('default');
    this.statusMessage = 'EDIT DIBATALKAN';
    this._changed('cancel');
  }

  _resizeRect(startRect, point, handle, startX = startRect.x, startY = startRect.y) {
    const mapSize = this._getMapSize();
    const angle = rectAngle(startRect);
    const startCenter = getRectCenter(startRect);
    const resizePoint = angle ? rotatePoint(point, startCenter, -angle) : point;
    const startRight = startRect.x + startRect.w;
    const startBottom = startRect.y + startRect.h;
    let x = startRect.x;
    let y = startRect.y;
    let right = startRight;
    let bottom = startBottom;

    if (handle?.includes('w')) x = resizePoint.x;
    if (handle?.includes('e')) right = resizePoint.x;
    if (handle?.includes('n')) y = resizePoint.y;
    if (handle?.includes('s')) bottom = resizePoint.y;

    if (handle === 'create') {
      x = Math.min(startX, point.x);
      y = Math.min(startY, point.y);
      right = Math.max(startX, point.x);
      bottom = Math.max(startY, point.y);
    }

    if (handle === 'nw' || handle === 'sw') x = Math.min(x, startRight - MIN_RECT_SIZE);
    if (handle === 'ne' || handle === 'se') right = Math.max(right, startRect.x + MIN_RECT_SIZE);
    if (handle === 'nw' || handle === 'ne') y = Math.min(y, startBottom - MIN_RECT_SIZE);
    if (handle === 'sw' || handle === 'se') bottom = Math.max(bottom, startRect.y + MIN_RECT_SIZE);

    x = clamp(Math.round(x), 0, Math.max(0, mapSize.width - MIN_RECT_SIZE));
    y = clamp(Math.round(y), 0, Math.max(0, mapSize.height - MIN_RECT_SIZE));
    right = clamp(Math.round(right), x + MIN_RECT_SIZE, mapSize.width);
    bottom = clamp(Math.round(bottom), y + MIN_RECT_SIZE, mapSize.height);

    if (!angle || handle === 'create') return { x, y, w: right - x, h: bottom - y };

    // Resize in the collider's local axes, then convert the new center back
    // into world coordinates so the opposite corner remains the anchor.
    const nextCenter = rotatePoint({ x: x + (right - x) / 2, y: y + (bottom - y) / 2 }, startCenter, angle);
    return {
      x: Math.round(nextCenter.x - (right - x) / 2),
      y: Math.round(nextCenter.y - (bottom - y) / 2),
      w: right - x,
      h: bottom - y,
      angle,
    };
  }

  _nextNewId(type) {
    const prefix = type === 'furniture' ? 'FURNITURE_NEW' : 'WALL_NEW';
    const existing = new Set(this._getColliderList().map((collider) => String(collider.id || '').toUpperCase()));
    let index = 1;
    let id = `${prefix}_${String(index).padStart(2, '0')}`;
    while (existing.has(id)) {
      index += 1;
      id = `${prefix}_${String(index).padStart(2, '0')}`;
    }
    return id;
  }

  _beginMutation() {
    if (this.drag?._historyRecorded) return;
    this.history.push(cloneColliders(this._getColliderList()));
    if (this.history.length > 80) this.history.shift();
    this.future = [];
    if (this.drag) this.drag._historyRecorded = true;
  }

  _changed(reason) {
    this.mutationVersion += 1;
    try {
      this.onChange({ reason, colliders: this._getColliderList() });
    } catch (error) {
      console.warn('[CollisionEditor] onChange callback failed.', error);
    }
  }

  _replaceColliders(colliders) {
    const target = this._getColliderList();
    target.splice(0, target.length, ...normalizeColliderList(colliders, this._getMapSize()));
    if (this.selectedIndex !== null && this.selectedIndex >= target.length) this.selectedIndex = null;
  }

  _buildPayload() {
    const mapSize = this._getMapSize();
    const persistedColliders = typeof this.getPersistedColliders === 'function'
      ? this.getPersistedColliders()
      : this._getColliderList();
    return {
      version: EDITOR_VERSION,
      mapKey: this.storageKey.split(':').pop(),
      mapSize,
      colliders: normalizeColliderList(persistedColliders, mapSize),
      exportedAt: new Date().toISOString(),
    };
  }

  _loadDraftOnce() {
    if (this.draftLoaded) return;
    this.draftLoaded = true;
    let raw = null;
    try {
      raw = window.localStorage?.getItem(this.storageKey) || null;
    } catch (_) {}
    if (!raw) {
      this.draftLoaded = false;
      return;
    }

    try {
      const payload = JSON.parse(raw);
      const colliders = normalizeColliderList(payload?.colliders, this._getMapSize());
      if (!Array.isArray(payload?.colliders)) throw new Error('Draft collider list tidak valid.');
      this._replaceColliders(colliders);
      this.localDraftLoaded = true;
      this._changed('load-draft');
      this.statusMessage = 'DRAFT COLLISION DIMUAT';
    } catch (error) {
      this.draftLoaded = false;
      this.localDraftLoaded = false;
      this.statusMessage = 'DRAFT RUSAK / DIABAIKAN';
      console.warn('[CollisionEditor] Draft collision tidak valid.', error);
    }
  }

  async _loadFileDraft() {
    if (this.fileDraftLoaded || typeof this.filePersistence?.load !== 'function') return false;

    try {
      const payload = await this.filePersistence.load();
      if (!payload) return false;
      if (!Array.isArray(payload.colliders)) throw new Error('File collision list tidak valid.');
      if (this.localDraftLoaded || this.mutationVersion > 0) return false;

      this._replaceColliders(payload.colliders);
      this.fileDraftLoaded = true;
      this.draftLoaded = true;
      this._changed('load-file-draft');
      this.statusMessage = 'FILE COLLISION DIMUAT';
      return true;
    } catch (error) {
      this.statusMessage = 'FILE COLLISION DIABAIKAN';
      console.warn('[CollisionEditor] File collision tidak valid.', error);
      return false;
    }
  }
}

export { normalizeLabel as normalizeCollisionLabel, safeStorageKey as getCollisionDraftStorageKey };
