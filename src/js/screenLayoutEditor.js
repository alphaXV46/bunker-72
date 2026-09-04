const EDITOR_VERSION = 1;
const MIN_SIZE = 32;
const HANDLE_SIZE = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const normalizeAngle = (value) => {
  let angle = Number(value);
  if (!Number.isFinite(angle)) angle = 0;
  angle %= 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Math.round(angle * 10) / 10;
};

const profileForWidth = (width) => (Number(width) <= 768 ? 'mobile' : 'desktop');

const normalizeBox = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const width = clamp(Number(source.w) || 0.4, 0.02, 1);
  const height = clamp(Number(source.h) || 0.2, 0.02, 1);
  return {
    ...source,
    frame: source.frame === 'card-body' ? 'card-body' : 'story-box',
    x: clamp(Number(source.x) || 0, 0, Math.max(0, 1 - width)),
    y: clamp(Number(source.y) || 0, 0, Math.max(0, 1 - height)),
    w: width,
    h: height,
    angle: normalizeAngle(source.angle),
  };
};

const normalizeProfile = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([, box]) => box && typeof box === 'object')
      .map(([id, box]) => [id, normalizeBox(box)])
  );
};

const normalizeLayout = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const profiles = source.profiles && typeof source.profiles === 'object' ? source.profiles : source;
  return {
    version: EDITOR_VERSION,
    profiles: {
      desktop: normalizeProfile(profiles.desktop),
      mobile: normalizeProfile(profiles.mobile),
    },
  };
};

const setImportant = (element, property, value) => {
  element.style.setProperty(property, value, 'important');
};

/**
 * Drag/resize/rotate editor for the DOM dialogue and choice panels.
 * Coordinates are normalized to the actual containing block, so the same
 * scene can have separate desktop and mobile layouts without breaking the
 * responsive game shell.
 */
export class ScreenLayoutEditor {
  constructor({ root = null, persistence = null, onStatus = () => {} } = {}) {
    this.root = null;
    this.persistence = persistence;
    this.onStatus = onStatus;
    this.enabled = false;
    this.sceneKey = 'global';
    this.profile = 'desktop';
    this.layout = normalizeLayout(null);
    this.selectedId = null;
    this.drag = null;
    this.history = [];
    this.future = [];
    this.statusMessage = 'EDITOR UI OFF';
    this._sceneToken = 0;
    this._boxes = new Map();
    this._overlay = null;
    this._toolbar = null;
    this._managedElements = new Set();
    this._visibilityOverrides = new Set();

    this._handlePointerDown = (event) => this._onPointerDown(event);
    this._handlePointerMove = (event) => this._onPointerMove(event);
    this._handlePointerUp = (event) => this._onPointerUp(event);
    this._handlePointerCancel = (event) => this._onPointerCancel(event);
    this._handleWheel = (event) => this._onWheel(event);
    this._handleResize = () => {
      const nextProfile = profileForWidth(this.root?.clientWidth || window.innerWidth);
      if (nextProfile !== this.profile) {
        this._clearManagedStyles();
        this.profile = nextProfile;
        if (this.enabled) this._setEditorVisibility(true);
        this._applyCurrentProfile();
      }
      this.refresh();
    };

    if (root) this.attach(root);
  }

  attach(root) {
    if (this.root === root) return;
    this.detach();
    this.root = root || null;
    if (!this.root) return;

    this.root.addEventListener('pointerdown', this._handlePointerDown, { passive: false });
    this.root.addEventListener('pointermove', this._handlePointerMove, { passive: false });
    this.root.addEventListener('pointerup', this._handlePointerUp, { passive: false });
    this.root.addEventListener('pointercancel', this._handlePointerCancel, { passive: false });
    this.root.addEventListener('wheel', this._handleWheel, { passive: false });
    window.addEventListener('resize', this._handleResize);
    this.profile = profileForWidth(this.root.clientWidth || window.innerWidth);
  }

  detach() {
    if (this.root) {
      this.root.removeEventListener('pointerdown', this._handlePointerDown);
      this.root.removeEventListener('pointermove', this._handlePointerMove);
      this.root.removeEventListener('pointerup', this._handlePointerUp);
      this.root.removeEventListener('pointercancel', this._handlePointerCancel);
      this.root.removeEventListener('wheel', this._handleWheel);
    }
    if (typeof window !== 'undefined') window.removeEventListener('resize', this._handleResize);
    this.root = null;
    this.drag = null;
  }

  destroy() {
    this.setEnabled(false);
    this._clearManagedStyles();
    this.detach();
    this._overlay?.remove();
    this._toolbar?.remove();
    this._overlay = null;
    this._toolbar = null;
    this._boxes.clear();
  }

  async setScene(sceneKey) {
    const nextKey = String(sceneKey || 'global');
    if (nextKey === this.sceneKey) {
      this.refresh();
      return;
    }

    this._clearManagedStyles();
    this.sceneKey = nextKey;
    this.selectedId = null;
    this.layout = normalizeLayout(null);
    this.history = [];
    this.future = [];
    const token = ++this._sceneToken;

    this._applyCurrentProfile();
    this.refresh();

    try {
      const loaded = await this.persistence?.load?.(nextKey);
      if (token !== this._sceneToken) return;
      this.layout = normalizeLayout(loaded);
      this._applyCurrentProfile();
      this.statusMessage = loaded ? `LAYOUT ${nextKey.toUpperCase()} DIMUAT` : 'LAYOUT DEFAULT';
      this.refresh();
    } catch (error) {
      this.statusMessage = 'LAYOUT FILE DIABAIKAN';
      console.warn('[ScreenLayoutEditor] Tidak dapat memuat layout scene.', error);
      this.refresh();
    }
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === this.enabled) {
      if (next) this.refresh();
      return this.enabled;
    }

    this.enabled = next;
    this.drag = null;
    this.history = [];
    this.future = [];
    if (this.enabled) {
      this._setEditorVisibility(true);
      this._applyCurrentProfile(true);
      this._createOverlay();
      this._createToolbar();
      this.statusMessage = 'EDITOR UI AKTIF — PILIH ELEMEN';
      this.refresh();
    } else {
      this._setEditorVisibility(false);
      this._overlay?.remove();
      this._toolbar?.remove();
      this._overlay = null;
      this._toolbar = null;
      this._boxes.clear();
      this.statusMessage = 'EDITOR UI OFF';
    }
    this._notifyStatus();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  getStatus() {
    const selected = this._getTarget(this.selectedId);
    const box = selected ? this._getBox(selected) : null;
    return {
      enabled: this.enabled,
      sceneKey: this.sceneKey,
      profile: this.profile,
      selectedId: this.selectedId,
      selectedBox: box ? { ...box } : null,
      statusMessage: this.statusMessage,
    };
  }

  handleKeyDown(event) {
    if (!this.enabled) return false;
    const key = String(event.key || '').toLowerCase();

    if (event.ctrlKey && key === 's') {
      this.save();
      return true;
    }
    if (event.ctrlKey && key === 'e') {
      this.export();
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
      this.reset();
      return true;
    }
    if (key === 'escape') {
      this.selectedId = null;
      this.statusMessage = 'SELEKSI UI DIBATALKAN';
      this.refresh();
      return true;
    }

    if (this.selectedId && !event.ctrlKey && !event.altKey) {
      const step = event.shiftKey ? 0.01 : 0.002;
      const delta = {
        arrowleft: [-step, 0],
        arrowright: [step, 0],
        arrowup: [0, -step],
        arrowdown: [0, step],
      }[key];
      if (delta) {
        this._beginMutation();
        const box = this._getBox(this._getTarget(this.selectedId));
        box.x = clamp(box.x + delta[0], 0, 1 - box.w);
        box.y = clamp(box.y + delta[1], 0, 1 - box.h);
        this._changed(`geser ${Math.round(box.x * 100)}%,${Math.round(box.y * 100)}%`);
        return true;
      }
    }

    return false;
  }

  refresh() {
    if (!this.root) return;
    this.profile = profileForWidth(this.root.clientWidth || window.innerWidth);
    if (this.enabled) {
      this._setEditorVisibility(true);
      this._applyCurrentProfile(true);
      this._renderOverlay();
      this._renderToolbar();
    } else {
      this._applyCurrentProfile(false);
    }
  }

  async save() {
    const payload = clone(this.layout);
    try {
      const result = await this.persistence?.save?.(this.sceneKey, payload);
      this.statusMessage = result?.fileSaved === false ? 'LAYOUT TERSIMPAN DI CACHE LOKAL' : 'FILE LAYOUT TERSIMPAN';
    } catch (error) {
      this.statusMessage = 'LAYOUT LOKAL (FILE GAGAL)';
      console.warn('[ScreenLayoutEditor] Tidak dapat menyimpan layout scene.', error);
    }
    this._renderToolbar();
    return payload;
  }

  async reset() {
    this._beginMutation();
    delete this.layout.profiles[this.profile];
    this.layout.profiles[this.profile] = {};
    this._clearManagedStyles();
    this._setEditorVisibility(true);
    this._applyCurrentProfile(true);
    this.statusMessage = `LAYOUT ${this.profile.toUpperCase()} DIRESET`;
    this._changed('reset');

    try {
      const otherProfile = this.profile === 'desktop' ? 'mobile' : 'desktop';
      const remaining = this.layout.profiles[otherProfile];
      const result = Object.keys(remaining || {}).length
        ? await this.persistence?.save?.(this.sceneKey, clone(this.layout))
        : await this.persistence?.remove?.(this.sceneKey);
      if (result?.fileSaved === false) this.statusMessage += ' (CACHE LOKAL)';
    } catch (error) {
      console.warn('[ScreenLayoutEditor] Tidak dapat mereset file layout.', error);
    }
    this._renderToolbar();
    return this.layout;
  }

  export() {
    const payload = {
      version: EDITOR_VERSION,
      sceneKey: this.sceneKey,
      layout: clone(this.layout),
    };
    const json = JSON.stringify(payload, null, 2);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sceneKey}-ui-layout.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.statusMessage = 'JSON LAYOUT DIEKSPOR';
    } catch (error) {
      console.info('[ScreenLayoutEditor] Layout JSON:', json);
      this.statusMessage = 'JSON ADA DI CONSOLE';
    }
    this._renderToolbar();
    return payload;
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) {
      this.statusMessage = 'TIDAK ADA UNDO UI';
      this._renderToolbar();
      return false;
    }
    this.future.push(clone(this.layout.profiles[this.profile]));
    this.layout.profiles[this.profile] = previous;
    this._applyCurrentProfile(true);
    this.statusMessage = 'UNDO UI';
    this._changed('undo');
    return true;
  }

  redo() {
    const next = this.future.pop();
    if (!next) {
      this.statusMessage = 'TIDAK ADA REDO UI';
      this._renderToolbar();
      return false;
    }
    this.history.push(clone(this.layout.profiles[this.profile]));
    this.layout.profiles[this.profile] = next;
    this._applyCurrentProfile(true);
    this.statusMessage = 'REDO UI';
    this._changed('redo');
    return true;
  }

  _getTargets() {
    if (!this.root) return [];
    return [
      { id: 'DIALOGUE_BOX', label: 'DIALOGUE_BOX', element: this.root.querySelector('#dialogue-container') },
      { id: 'CHOICES_PANEL', label: 'CHOICES_PANEL', element: this.root.querySelector('#command-deck-container') },
    ].filter((target) => target.element);
  }

  _getTarget(id) {
    return this._getTargets().find((target) => target.id === id) || null;
  }

  _getProfileData() {
    if (!this.layout.profiles[this.profile]) this.layout.profiles[this.profile] = {};
    return this.layout.profiles[this.profile];
  }

  _getFrame(target) {
    const cardBody = target?.element?.closest('.card-body');
    if (cardBody && getComputedStyle(cardBody).display !== 'contents') {
      return { id: 'card-body', element: cardBody };
    }
    return { id: 'story-box', element: this.root };
  }

  _readBox(target) {
    const frame = this._getFrame(target);
    const frameRect = frame.element.getBoundingClientRect();
    const elementRect = target.element.getBoundingClientRect();
    const frameWidth = Math.max(1, frameRect.width);
    const frameHeight = Math.max(1, frameRect.height);
    return normalizeBox({
      frame: frame.id,
      x: (elementRect.left - frameRect.left) / frameWidth,
      y: (elementRect.top - frameRect.top) / frameHeight,
      w: elementRect.width / frameWidth,
      h: elementRect.height / frameHeight,
      angle: 0,
    });
  }

  _getBox(target) {
    if (!target) return null;
    const profile = this._getProfileData();
    if (!profile[target.id]) profile[target.id] = this._readBox(target);
    profile[target.id] = normalizeBox(profile[target.id]);
    return profile[target.id];
  }

  _applyBox(target, box) {
    if (!target?.element || !box) return;
    const element = target.element;
    this._managedElements.add(element);
    setImportant(element, 'position', 'absolute');
    setImportant(element, 'left', `${box.x * 100}%`);
    setImportant(element, 'top', `${box.y * 100}%`);
    setImportant(element, 'right', 'auto');
    setImportant(element, 'bottom', 'auto');
    setImportant(element, 'width', `${box.w * 100}%`);
    setImportant(element, 'height', `${box.h * 100}%`);
    setImportant(element, 'min-width', '0');
    setImportant(element, 'min-height', '0');
    setImportant(element, 'max-width', 'none');
    setImportant(element, 'max-height', 'none');
    setImportant(element, 'margin', '0');
    setImportant(element, 'box-sizing', 'border-box');
    setImportant(element, 'transform', `rotate(${box.angle}deg)`);
    setImportant(element, 'transform-origin', 'center center');
  }

  _clearElementStyles(element) {
    if (!element) return;
    [
      'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
      'min-width', 'min-height', 'max-width', 'max-height', 'margin',
      'box-sizing', 'transform', 'transform-origin', 'display',
    ].forEach((property) => element.style.removeProperty(property));
  }

  _clearManagedStyles() {
    this._managedElements.forEach((element) => this._clearElementStyles(element));
    this._managedElements.clear();
    this._visibilityOverrides.clear();
  }

  _applyCurrentProfile(editorMode = this.enabled) {
    this._getTargets().forEach((target) => {
      const box = this._getProfileData()[target.id];
      if (box) {
        this._applyBox(target, box);
      } else if (!editorMode) {
        this._clearElementStyles(target.element);
        this._managedElements.delete(target.element);
      }
    });
  }

  _setEditorVisibility(enabled) {
    this._getTargets().forEach((target) => {
      if (enabled) {
        this._managedElements.add(target.element);
        // Preserve the active responsive display mode whenever the target is
        // already visible. Force a display value only for a panel hidden by
        // the normal dialogue/choice toggle rules.
        if (!this._visibilityOverrides.has(target.element)
          && getComputedStyle(target.element).display === 'none') {
          setImportant(target.element, 'display', target.id === 'CHOICES_PANEL' ? 'grid' : 'flex');
          this._visibilityOverrides.add(target.element);
        }
      } else {
        if (this._visibilityOverrides.has(target.element)) {
          target.element.style.removeProperty('display');
          this._visibilityOverrides.delete(target.element);
        }
      }
    });
  }

  _createOverlay() {
    if (!this.root || this._overlay) return;
    this._overlay = document.createElement('div');
    this._overlay.className = 'screen-layout-editor-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this._overlay);
  }

  _createToolbar() {
    if (!this.root || this._toolbar) return;
    this._toolbar = document.createElement('div');
    this._toolbar.className = 'screen-layout-editor-toolbar';
    this._toolbar.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this._toolbar);
  }

  _getOverlayRect(target) {
    const rootRect = this.root.getBoundingClientRect();
    const frame = this._getFrame(target);
    const frameRect = frame.element.getBoundingClientRect();
    const box = this._getBox(target);
    return {
      x: frameRect.left - rootRect.left + box.x * frameRect.width,
      y: frameRect.top - rootRect.top + box.y * frameRect.height,
      w: box.w * frameRect.width,
      h: box.h * frameRect.height,
    };
  }

  _renderOverlay() {
    if (!this.enabled || !this._overlay) return;
    const targets = this._getTargets();
    const activeIds = new Set();

    targets.forEach((target) => {
      const rect = this._getOverlayRect(target);
      if (rect.w < 1 || rect.h < 1) return;
      activeIds.add(target.id);
      let boxElement = this._boxes.get(target.id);
      if (!boxElement) {
        boxElement = document.createElement('div');
        boxElement.className = 'screen-layout-editor-box';
        boxElement.dataset.editorId = target.id;
        boxElement.addEventListener('pointerdown', this._handlePointerDown, { passive: false });
        ['nw', 'ne', 'sw', 'se'].forEach((handle) => {
          const handleElement = document.createElement('span');
          handleElement.className = `screen-layout-editor-handle handle-${handle}`;
          handleElement.dataset.handle = handle;
          handleElement.dataset.editorId = target.id;
          boxElement.appendChild(handleElement);
        });
        const label = document.createElement('span');
        label.className = 'screen-layout-editor-label';
        boxElement.appendChild(label);
        this._overlay.appendChild(boxElement);
        this._boxes.set(target.id, boxElement);
      }

      const box = this._getBox(target);
      boxElement.classList.toggle('is-selected', this.selectedId === target.id);
      boxElement.style.left = `${rect.x}px`;
      boxElement.style.top = `${rect.y}px`;
      boxElement.style.width = `${rect.w}px`;
      boxElement.style.height = `${rect.h}px`;
      boxElement.style.transform = `rotate(${box.angle}deg)`;
      boxElement.style.transformOrigin = 'center center';
      boxElement.querySelector('.screen-layout-editor-label').textContent = `${target.label}  ${Math.round(box.angle)}°`;
    });

    this._boxes.forEach((boxElement, id) => {
      if (!activeIds.has(id)) {
        boxElement.remove();
        this._boxes.delete(id);
      }
    });
  }

  _renderToolbar() {
    if (!this._toolbar) return;
    const status = this.getStatus();
    const selected = status.selectedBox;
    const selection = selected
      ? `${status.selectedId} ${Math.round(selected.x * 100)}%,${Math.round(selected.y * 100)}% ${Math.round(selected.w * 100)}%x${Math.round(selected.h * 100)}% ROT ${Math.round(selected.angle)}°`
      : 'Klik DIALOGUE_BOX atau CHOICES_PANEL';
    this._toolbar.textContent = [
      `[F6] UI LAYOUT ON | ${status.sceneKey.toUpperCase()} | ${status.profile.toUpperCase()}`,
      selection,
      'DRAG geser • HANDLE resize • WHEEL rotasi • ARROW presisi',
      'CTRL+S file • CTRL+E export • CTRL+Z/Y undo • ALT+R reset',
      status.statusMessage,
    ].join('\n');
  }

  _notifyStatus() {
    try {
      this.onStatus(this.getStatus());
    } catch (error) {
      console.warn('[ScreenLayoutEditor] onStatus callback failed.', error);
    }
  }

  _beginMutation() {
    if (this.drag?._historyRecorded) return;
    this.history.push(clone(this._getProfileData()));
    if (this.history.length > 60) this.history.shift();
    this.future = [];
    if (this.drag) this.drag._historyRecorded = true;
  }

  _changed(message) {
    this.statusMessage = message;
    this._applyCurrentProfile(true);
    this._renderOverlay();
    this._renderToolbar();
    this._notifyStatus();
  }

  _getFramePoint(event, target) {
    const frame = this._getFrame(target);
    const rect = frame.element.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width),
      y: (event.clientY - rect.top) / Math.max(1, rect.height),
    };
  }

  _onPointerDown(event) {
    if (!this.enabled) return;
    const boxElement = event.target.closest?.('.screen-layout-editor-box');
    if (!boxElement || !this._overlay?.contains(boxElement)) return;
    event.preventDefault();
    event.stopPropagation();

    const id = boxElement.dataset.editorId;
    const target = this._getTarget(id);
    if (!target) return;
    const handle = event.target.closest?.('.screen-layout-editor-handle')?.dataset.handle || null;
    this.selectedId = id;
    this._beginMutation();
    this.drag = {
      pointerId: event.pointerId,
      id,
      handle,
      startPoint: this._getFramePoint(event, target),
      startBox: { ...this._getBox(target) },
    };
    boxElement.setPointerCapture?.(event.pointerId);
    this.statusMessage = `${target.label} DIPILIH`;
    this._renderOverlay();
    this._renderToolbar();
  }

  _onPointerMove(event) {
    if (!this.enabled || !this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const target = this._getTarget(this.drag.id);
    if (!target) return;
    const point = this._getFramePoint(event, target);
    const start = this.drag.startBox;
    const dx = point.x - this.drag.startPoint.x;
    const dy = point.y - this.drag.startPoint.y;
    let x = start.x;
    let y = start.y;
    let w = start.w;
    let h = start.h;

    if (!this.drag.handle) {
      x = clamp(start.x + dx, 0, 1 - start.w);
      y = clamp(start.y + dy, 0, 1 - start.h);
    } else {
      if (this.drag.handle.includes('w')) {
        x = clamp(start.x + dx, 0, start.x + start.w - MIN_SIZE / Math.max(1, target.element.parentElement?.clientWidth || 1));
        w = start.w - (x - start.x);
      }
      if (this.drag.handle.includes('e')) {
        w = clamp(start.w + dx, MIN_SIZE / Math.max(1, target.element.parentElement?.clientWidth || 1), 1 - start.x);
      }
      if (this.drag.handle.includes('n')) {
        y = clamp(start.y + dy, 0, start.y + start.h - MIN_SIZE / Math.max(1, target.element.parentElement?.clientHeight || 1));
        h = start.h - (y - start.y);
      }
      if (this.drag.handle.includes('s')) {
        h = clamp(start.h + dy, MIN_SIZE / Math.max(1, target.element.parentElement?.clientHeight || 1), 1 - start.y);
      }
    }

    const box = this._getBox(target);
    Object.assign(box, normalizeBox({ ...box, x, y, w, h, angle: start.angle }));
    this._changed(`${target.label} ${Math.round(w * 100)}%x${Math.round(h * 100)}%`);
  }

  _onPointerUp(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.drag = null;
    this._renderToolbar();
  }

  _onPointerCancel(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    this.drag = null;
    this.statusMessage = 'EDIT UI DIBATALKAN';
    this._renderToolbar();
  }

  _onWheel(event) {
    if (!this.enabled || !this.selectedId) return;
    const target = this._getTarget(this.selectedId);
    if (!target) return;
    event.preventDefault();
    this._beginMutation();
    const box = this._getBox(target);
    const step = event.shiftKey ? 1 : 5;
    box.angle = normalizeAngle(box.angle + (event.deltaY < 0 ? step : -step));
    this._changed(`${target.label} ROTASI ${box.angle}°`);
  }
}
