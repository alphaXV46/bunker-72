import { CollisionEditor, normalizeCollisionLabel } from '../collisionEditor.js';
import { editorDataStore } from '../editorDataStore.js';
import { ScavengerItemEditor } from './scavengerItemEditor.js';

const SOLID_COLLIDER_TYPE = 'solid';
const FREE_CAMERA_KEYS = ['w', 'a', 's', 'd'];
const FREE_CAMERA_SPEED = 420;
const FREE_CAMERA_FAST_SPEED = 900;

const readQueryFlag = (name) => (
  typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get(name) === '1'
);

const readStoredFlag = (name) => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem(name) === '1';
  } catch (_) {
    return false;
  }
};

const readBooleanOption = (value, queryName, storageName = null) => {
  if (value !== undefined && value !== null) return Boolean(value);
  return readQueryFlag(queryName) || (storageName ? readStoredFlag(storageName) : false);
};

/**
 * Developer-only orchestration for the scavenger canvas.
 *
 * The game supplies a narrow host context containing its state and render
 * callbacks. This module owns editor instances, developer shortcuts, pause
 * snapshots, debug globals, and editor-only DOM feedback. Production builds
 * never import this module; the runtime facade supplies a no-op instead.
 */
export class ScavengerDevTools {
  constructor({ host }) {
    this.host = host;
    this.enabled = true;
    this.collisionEditor = null;
    this.fogEditor = null;
    this.itemEditor = null;
    this.freeCamera = false;
    this.freeCameraKeys = {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
    };
    this.debugColliders = readBooleanOption(host.config?.debugColliders, 'debugColliders', 'debugColliders');
    this.collisionEditorRequested = readBooleanOption(host.config?.collisionEditor, 'collisionEditor');
    this.fogEditorRequested = readBooleanOption(host.config?.fogEditor, 'fogEditor');
    this.itemEditorRequested = readBooleanOption(host.config?.itemEditor, 'itemEditor');
    this.freeCameraRequested = readBooleanOption(host.config?.freeCamera, 'freeCam');
    this.editorHelpHidden = false;
    this.developerPauseSnapshot = null;
    // Editor sessions automatically own the camera. Keep the previous
    // free-camera state so closing the last editor can restore it exactly.
    this.editorFreeCameraSnapshot = null;
    this.editorTransitionDepth = 0;
    this.editorFeedbackTimeoutId = null;

    this._createEditors();

    // Keep the long-standing host fields available to the developer console
    // and existing HUD code while this adapter remains the single owner of
    // developer-state mutations.
    host.debugColliders = this.debugColliders;
    host.collisionEditorRequested = this.collisionEditorRequested;
    host.fogEditorRequested = this.fogEditorRequested;
    host.itemEditorRequested = this.itemEditorRequested;
    host.freeCameraRequested = this.freeCameraRequested;
    host.freeCamera = this.freeCamera;
    host.editorHelpHidden = this.editorHelpHidden;
    host.itemEditor = this.itemEditor;

    if (typeof window !== 'undefined') window.__scavengerGame = host;
  }

  _createEditors() {
    const host = this.host;
    const collisionEditorKey = host.collisionEditorKey;

    this.itemEditor = new ScavengerItemEditor({
      storageKey: collisionEditorKey,
      getItems: () => host.baseItems || host.items,
      getDefaultItems: () => host.originalItems || host.baseItems || host.items,
      getMapSize: () => ({ width: host.MAP_W, height: host.MAP_H }),
      getViewport: () => ({ width: host.VIEW_W, height: host.VIEW_H }),
      getCamera: () => host.camera,
      getRenderOffset: () => ({ x: host.screenShake, y: host.screenShake * 0.5 }),
      filePersistence: {
        load: () => editorDataStore.read('items', collisionEditorKey),
        save: (payload) => editorDataStore.write('items', collisionEditorKey, payload),
        remove: () => editorDataStore.remove('items', collisionEditorKey),
      },
      onItemsChange: ({ items }) => host.applyItemEditorItems?.(items),
      onPan: ({ dx, dy }) => host._panCameraBy(dx, dy),
      onResetCamera: () => host._resetCameraToPlayer(),
      onInvalidate: () => host._requestRender(),
      onSave: (result) => this._showSaveFeedback(result),
    });

    this.collisionEditor = new CollisionEditor({
      storageKey: collisionEditorKey,
      getColliders: () => host.colliders,
      getDefaultColliders: () => host.originalColliders || host.baseColliders || [],
      getMapSize: () => ({ width: host.MAP_W, height: host.MAP_H }),
      getViewport: () => ({ width: host.VIEW_W, height: host.VIEW_H }),
      getCamera: () => host.camera,
      getRenderOffset: () => ({ x: host.screenShake, y: host.screenShake * 0.5 }),
      getPersistedColliders: () => host.colliders
        .filter((collider) => !host.runtimeColliderIds.has(String(collider.id))),
      getLabel: normalizeCollisionLabel,
      filePersistence: {
        load: () => editorDataStore.read('collision', collisionEditorKey),
        save: (payload) => editorDataStore.write('collision', collisionEditorKey, payload),
        remove: () => editorDataStore.remove('collision', collisionEditorKey),
      },
      onPan: ({ dx, dy }) => host._panCameraBy(dx, dy),
      onResetCamera: () => host._resetCameraToPlayer(),
      onInvalidate: () => host._requestRender(),
      onSave: (result) => this._showSaveFeedback(result),
      getCreateType: () => SOLID_COLLIDER_TYPE,
      duplicateCollider: ({ source, id, x, y }) => ({
        ...source,
        id,
        type: SOLID_COLLIDER_TYPE,
        x,
        y,
      }),
      showLabels: false,
      accentColor: '#ef4444',
      accentFill: 'rgba(239, 68, 68, 0.18)',
      onChange: () => {
        // Migrate older wall/furniture drafts to the single solid type while
        // preserving their geometry and stable IDs.
        host.colliders.forEach((collider) => { collider.type = SOLID_COLLIDER_TYPE; });
        host.baseColliders = host.colliders
          .filter((collider) => !host.runtimeColliderIds.has(String(collider.id)))
          .map((collider) => ({ ...collider }));
      },
      onReset: (colliders) => {
        host.runtimeColliderIds.clear();
        host.colliders = colliders.map(host.normalizeSolidCollider);
        host.baseColliders = host.colliders.map((collider) => ({ ...collider }));
      },
    });

    this.fogEditor = new CollisionEditor({
      storageKey: `fog_${collisionEditorKey}`,
      getColliders: () => host.fogEditorShapes,
      getDefaultColliders: () => host.fogOriginalShapes,
      getMapSize: () => ({ width: host.MAP_W, height: host.MAP_H }),
      getViewport: () => ({ width: host.VIEW_W, height: host.VIEW_H }),
      getCamera: () => host.camera,
      getRenderOffset: () => ({ x: host.screenShake, y: host.screenShake * 0.5 }),
      getLabel: normalizeCollisionLabel,
      filePersistence: {
        load: () => editorDataStore.read('fog', collisionEditorKey),
        save: (payload) => editorDataStore.write('fog', collisionEditorKey, payload),
        remove: () => editorDataStore.remove('fog', collisionEditorKey),
      },
      onChange: () => host._applyFogEditorShapes(),
      onReset: (shapes) => {
        host.fogEditorShapes = shapes.map((shape) => ({ ...shape }));
        host._applyFogEditorShapes();
      },
      onPan: ({ dx, dy }) => host._panCameraBy(dx, dy),
      onResetCamera: () => host._resetCameraToPlayer(),
      onInvalidate: () => host._requestRender(),
      onSave: (result) => this._showSaveFeedback(result),
      getCreateType: ({ event }) => (event.shiftKey ? 'fog-doorway' : 'fog-room'),
      getNewId: ({ type, colliders }) => host.getNextEditorId(
        colliders,
        type === 'fog-doorway' ? 'FOG_DOORWAY_NEW' : 'FOG_ROOM_NEW'
      ),
      createCollider: (details) => host.createFogEditorCollider(details),
      duplicateCollider: (details) => host.duplicateFogEditorCollider(details),
    });
  }

  attach(canvas) {
    this.itemEditor?.attach(canvas);
    this.collisionEditor?.attach(canvas);
    this.fogEditor?.attach(canvas);
  }

  async loadSavedDrafts() {
    await Promise.all([
      this.itemEditor?.loadSavedDraft(),
      this.collisionEditor?.loadSavedDraft(),
      this.fogEditor?.loadSavedDraft(),
    ]);
  }

  handleKeyDown(event) {
    if (!this.host.isActive) return false;

    const key = String(event.key || '').toLowerCase();
    if (key === 'f4') {
      if (event.repeat) return true;
      event.preventDefault();
      if (this._hasActiveEditor()) {
        // Editors always use free camera. F4 remains a manual toggle when no
        // editor is open, but cannot accidentally strand an editor in player
        // follow mode.
        this._ensureEditorFreeCamera();
      } else {
        this.setFreeCamera(!this.freeCamera);
      }
      return true;
    }

    if (this.freeCamera && !event.ctrlKey && !event.altKey) {
      if (key === 'shift') {
        this.freeCameraKeys.shift = true;
        event.preventDefault();
        return true;
      }
      if (FREE_CAMERA_KEYS.includes(key)) {
        this.freeCameraKeys[key] = true;
        event.preventDefault();
        return true;
      }
    }

    // F5 remains compatible with the previous shortcut; F7 avoids the
    // browser refresh shortcut and is the recommended fog-editor key.
    if (key === 'f5' || key === 'f7') {
      if (event.repeat) return true;
      event.preventDefault();
      this.setFogEditor(!this.fogEditor?.enabled);
      return true;
    }

    if (key === 'f3') {
      if (event.repeat) return true;
      event.preventDefault();
      this.setCollisionEditor(!this.collisionEditor?.enabled);
      return true;
    }

    if (key === 'f9') {
      if (event.repeat) return true;
      event.preventDefault();
      this.setItemEditor(!this.itemEditor?.enabled);
      return true;
    }

    if (key === 'f8') {
      if (event.repeat) return true;
      event.preventDefault();
      this.setEditorHelpHidden(!this.editorHelpHidden);
      return true;
    }

    if ((this.collisionEditor?.enabled || this.freeCamera)
      && this.collisionEditor?.handleKeyDown(event)) {
      event.preventDefault();
      return true;
    }

    if (this.fogEditor?.enabled && this.fogEditor.handleKeyDown(event)) {
      event.preventDefault();
      return true;
    }

    if (this.itemEditor?.enabled && this.itemEditor.handleKeyDown(event)) {
      event.preventDefault();
      return true;
    }

    if (key === 'f2') {
      event.preventDefault();
      this.setDebugColliders(!this.debugColliders);
      return true;
    }

    return false;
  }

  handleKeyUp(event) {
    if (!this.host.isActive) return false;

    const key = String(event.key || '').toLowerCase();
    if (this.freeCamera && key === 'shift') {
      this.freeCameraKeys.shift = false;
      event.preventDefault();
      return true;
    }
    if (this.freeCamera && FREE_CAMERA_KEYS.includes(key)) {
      this.freeCameraKeys[key] = false;
      event.preventDefault();
      return true;
    }
    return false;
  }

  clearPressedKeys() {
    FREE_CAMERA_KEYS.forEach((key) => { this.freeCameraKeys[key] = false; });
    this.freeCameraKeys.shift = false;
  }

  update(dt = 0) {
    if (!this.freeCamera || !this.host.isActive) return;

    let dx = 0;
    let dy = 0;
    if (this.freeCameraKeys.w) dy -= 1;
    if (this.freeCameraKeys.s) dy += 1;
    if (this.freeCameraKeys.a) dx -= 1;
    if (this.freeCameraKeys.d) dx += 1;
    if (!dx && !dy) return;

    if (dx && dy) {
      dx *= 0.70710678;
      dy *= 0.70710678;
    }

    const speed = this.freeCameraKeys.shift ? FREE_CAMERA_FAST_SPEED : FREE_CAMERA_SPEED;
    this.host._panCameraBy(dx * speed * Math.max(0, Number(dt) || 0), dy * speed * Math.max(0, Number(dt) || 0));
  }

  _hasActiveEditor() {
    return Boolean(
      this.itemEditor?.enabled
      || this.collisionEditor?.enabled
      || this.fogEditor?.enabled
    );
  }

  _beginEditorCameraSession() {
    if (this.editorFreeCameraSnapshot === null) {
      this.editorFreeCameraSnapshot = Boolean(this.freeCamera);
    }
  }

  _ensureEditorFreeCamera() {
    this._beginEditorCameraSession();
    if (!this.freeCamera) this.setFreeCamera(true);
  }

  _restoreEditorCameraIfIdle() {
    if (this.editorTransitionDepth > 0 || this._hasActiveEditor()) return;
    if (this.editorFreeCameraSnapshot === null) return;

    const previousFreeCamera = this.editorFreeCameraSnapshot;
    this.editorFreeCameraSnapshot = null;
    if (this.freeCamera !== previousFreeCamera) {
      this.setFreeCamera(previousFreeCamera);
    }
  }

  _beginEditorTransition() {
    this.editorTransitionDepth += 1;
  }

  _endEditorTransition() {
    this.editorTransitionDepth = Math.max(0, this.editorTransitionDepth - 1);
    this._restoreEditorCameraIfIdle();
  }

  isDeveloperModeActive() {
    return Boolean(this.itemEditor?.enabled || this.collisionEditor?.enabled || this.fogEditor?.enabled || this.freeCamera);
  }

  getActiveEditorMode() {
    if (this.itemEditor?.enabled) return 'items';
    if (this.fogEditor?.enabled) return 'fog';
    if (this.collisionEditor?.enabled) return 'collision';
    if (this.freeCamera) return 'free-camera';
    return null;
  }

  setCollisionEditor(enabled) {
    if (!this.collisionEditor) return false;

    const next = Boolean(enabled);
    if (next === this.collisionEditor.enabled) {
      if (next) this._ensureEditorFreeCamera();
      else this._restoreEditorCameraIfIdle();
      return next;
    }

    if (next) {
      this._beginEditorCameraSession();
      this._beginEditorTransition();
      if (this.fogEditor?.enabled) this.setFogEditor(false);
      if (this.itemEditor?.enabled) this.setItemEditor(false);
    }

    this.collisionEditor.setEnabled(next);
    if (next) this._ensureEditorFreeCamera();
    this._updateDebugGlobal(next);

    if (typeof window !== 'undefined') {
      if (next) {
        window.__scavengerCollisionEditor = {
          host: this.host,
          editor: this.collisionEditor,
          save: () => this.collisionEditor.saveDraft(),
          export: () => this.collisionEditor.exportDraft(),
          reset: () => this.collisionEditor.resetDraft(),
        };
      } else if (window.__scavengerCollisionEditor?.host === this.host) {
        window.__scavengerCollisionEditor = null;
      }
    }

    this._syncDeveloperModePause();
    if (next) this._endEditorTransition();
    this._restoreEditorCameraIfIdle();
    return next;
  }

  setFogEditor(enabled) {
    if (!this.fogEditor || this.host.mode !== 'prologue') return false;

    const next = Boolean(enabled);
    if (next === this.fogEditor.enabled) {
      if (next) this._ensureEditorFreeCamera();
      else this._restoreEditorCameraIfIdle();
      return next;
    }

    if (next) {
      this._beginEditorCameraSession();
      this._beginEditorTransition();
      if (this.collisionEditor?.enabled) this.setCollisionEditor(false);
      if (this.itemEditor?.enabled) this.setItemEditor(false);
    }

    this.fogEditor.setEnabled(next);
    if (next) this._ensureEditorFreeCamera();
    this._updateDebugGlobal(next);

    if (typeof window !== 'undefined') {
      if (next) {
        window.__scavengerFogEditor = {
          host: this.host,
          editor: this.fogEditor,
          save: () => this.fogEditor.saveDraft(),
          export: () => this.fogEditor.exportDraft(),
          reset: () => this.fogEditor.resetDraft(),
        };
      } else if (window.__scavengerFogEditor?.host === this.host) {
        window.__scavengerFogEditor = null;
      }
    }

    this._syncDeveloperModePause();
    if (next) this._endEditorTransition();
    this._restoreEditorCameraIfIdle();
    return next;
  }

  setItemEditor(enabled) {
    if (!this.itemEditor) return false;

    const next = Boolean(enabled);
    if (next === this.itemEditor.enabled) {
      if (next) this._ensureEditorFreeCamera();
      else this._restoreEditorCameraIfIdle();
      return next;
    }

    if (next) {
      this._beginEditorCameraSession();
      this._beginEditorTransition();
      if (this.fogEditor?.enabled) this.setFogEditor(false);
      if (this.collisionEditor?.enabled) this.setCollisionEditor(false);
    }

    this.itemEditor.setEnabled(next);
    if (next) this._ensureEditorFreeCamera();
    this._updateDebugGlobal(next);

    if (typeof window !== 'undefined') {
      if (next) {
        window.__scavengerItemEditor = {
          host: this.host,
          editor: this.itemEditor.editor,
          save: () => this.itemEditor.saveDraft(),
          export: () => this.itemEditor.exportDraft(),
          reset: () => this.itemEditor.resetDraft(),
        };
      } else if (window.__scavengerItemEditor?.host === this.host) {
        window.__scavengerItemEditor = null;
      }
    }

    this._syncDeveloperModePause();
    if (next) this._endEditorTransition();
    this._restoreEditorCameraIfIdle();
    return next;
  }

  setFreeCamera(enabled) {
    const next = Boolean(enabled);
    if (!next && this._hasActiveEditor()) return true;

    Object.keys(this.host.keys || {}).forEach((key) => { this.host.keys[key] = false; });
    if (this.host.player) this.host.player.isMoving = false;
    this.clearPressedKeys();
    this.freeCamera = next;
    this.host.freeCamera = next;
    this.collisionEditor?.setFreeCamera(next);
    this._syncDeveloperModePause();
    return next;
  }

  setEditorHelpHidden(hidden) {
    this.editorHelpHidden = Boolean(hidden);
    this.host.editorHelpHidden = this.editorHelpHidden;
    this._updateEditorHelpVisibility();
    this._showFeedback(
      this.editorHelpHidden
        ? '[F8] BANTUAN EDITOR DISEMBUNYIKAN — TEKAN F8 LAGI UNTUK MENAMPILKAN'
        : '[F8] BANTUAN EDITOR DITAMPILKAN',
      'info'
    );
    this.host._requestRender();
    return this.editorHelpHidden;
  }

  setDebugColliders(enabled) {
    this.debugColliders = this.isDeveloperModeActive() ? true : Boolean(enabled);
    this._updateDebugGlobal(this.debugColliders);
    this.host._requestRender();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (this.debugColliders) window.localStorage.setItem('debugColliders', '1');
        else window.localStorage.removeItem('debugColliders');
      } catch (_) {}
    }
  }

  renderDebug(ctx) {
    if (!this.debugColliders) return;
    const mode = this.getActiveEditorMode();
    if (mode === 'items') {
      this.itemEditor?.render(ctx);
    } else if (mode === 'fog') {
      this.host._renderFogDebug(ctx);
    } else if (mode === 'collision') {
      this.host._renderDebugColliders(ctx);
    } else {
      if (this.host.mode === 'prologue') this.host._renderFogDebug(ctx);
      this.host._renderDebugColliders(ctx);
    }
  }

  renderHud(ctx) {
    if (!this.host.editorHelpHidden) {
      if (this.itemEditor?.enabled) this.host._renderItemEditorHUD(ctx);
      else if (this.collisionEditor?.enabled) this.host._renderCollisionEditorHUD(ctx);
      if (this.fogEditor?.enabled) this.host._renderFogEditorHUD(ctx);
      if (this.freeCamera && !this.itemEditor?.enabled && !this.collisionEditor?.enabled) {
        this.host._renderFreeCameraHUD(ctx);
      }
    }
  }

  updateEditorHelpVisibility() {
    this._updateEditorHelpVisibility();
  }

  syncDeveloperModePause() {
    this._syncDeveloperModePause();
  }

  destroy() {
    this.itemEditor?.destroy();
    this.collisionEditor?.destroy();
    this.fogEditor?.destroy();
    this.clearPressedKeys();
    clearTimeout(this.editorFeedbackTimeoutId);
    this.editorFeedbackTimeoutId = null;
    this.host.editorInfo?.remove();
    this.host.editorFeedback?.remove();
    this._clearDebugGlobals();
    this.developerPauseSnapshot = null;
    this.host._developerPauseSnapshot = null;
    this.host.itemEditor = null;
    this.host.collisionEditor = null;
    this.host.fogEditor = null;
    this.itemEditor = null;
    this.collisionEditor = null;
    this.fogEditor = null;
    if (typeof window !== 'undefined' && window.__scavengerGame === this.host) {
      window.__scavengerGame = null;
    }
  }

  _updateDebugGlobal(enabled) {
    this.host.debugColliders = this.isDeveloperModeActive() ? true : Boolean(enabled);
    this.debugColliders = this.host.debugColliders;
  }

  _syncDeveloperModePause() {
    const active = this.isDeveloperModeActive();
    if (active) {
      if (!this.developerPauseSnapshot) {
        this.developerPauseSnapshot = {
          isPaused: Boolean(this.host.isPaused),
          debugColliders: Boolean(this.host.debugColliders),
        };
      }
      this.host.isPaused = true;
      this.host.debugColliders = true;
      this.debugColliders = true;
    } else if (this.developerPauseSnapshot) {
      const snapshot = this.developerPauseSnapshot;
      this.developerPauseSnapshot = null;
      this.host.isPaused = snapshot.isPaused;
      this.host.debugColliders = snapshot.debugColliders;
      this.debugColliders = snapshot.debugColliders;
    }
    this.host._developerPauseSnapshot = this.developerPauseSnapshot;
    this._updateEditorHelpVisibility();
    this.host._requestRender();
  }

  _updateEditorHelpVisibility() {
    const hidden = Boolean(this.editorHelpHidden);
    const editorActive = this.isDeveloperModeActive();
    if (this.host.desktopHints) this.host.desktopHints.hidden = hidden;
    if (this.host.touchControls) this.host.touchControls.classList.toggle('editor-help-hidden', hidden);
    if (!this.host.editorInfo) return;

    const activeMode = this.getActiveEditorMode();
    const modeTitle = activeMode === 'items'
      ? 'ITEM EDITOR AKTIF'
      : activeMode === 'fog'
      ? 'FOG EDITOR AKTIF'
      : activeMode === 'collision'
        ? 'COLLISION EDITOR AKTIF'
        : 'FREE CAMERA AKTIF';
    const modeHint = activeMode === 'items'
      ? '<span><b>[F9]</b> PINDAH ITEM SCAVENGER • <b>DRAG</b> posisi barang</span><span><b>FREE CAM</b> otomatis • <b>W/A/S/D</b> geser • <b>SHIFT</b> lebih cepat</span>'
      : activeMode === 'fog'
      ? '<span><b>[N]</b> BUAT FOG ROOM • <b>[SHIFT+N]</b> BUAT DOORWAY</span><span><b>FREE CAM</b> otomatis • <b>W/A/S/D</b> geser kamera</span>'
      : activeMode === 'collision'
        ? '<span><b>[F3]</b> HANYA AREA COLLISION YANG DITAMPILKAN</span><span><b>FREE CAM</b> otomatis • <b>W/A/S/D</b> geser kamera</span>'
        : '<span><b>[F4]</b> GESER CAMERA TANPA MENGUBAH COLLIDER</span>';
    this.host.editorInfo.innerHTML = `
      <strong>${modeTitle}</strong>
      <span><b>[F8]</b> SEMBUNYIKAN / TAMPILKAN BANTUAN EDITOR</span>
      ${modeHint}
      <span><b>[CTRL+S]</b> SIMPAN PERUBAHAN KE FILE</span>
    `;
    this.host.editorInfo.hidden = !editorActive || hidden;
  }

  _showFeedback(message, tone = 'success') {
    if (!this.host.editorFeedback || !message) return;
    this.host.editorFeedback.textContent = message;
    this.host.editorFeedback.dataset.tone = tone;
    this.host.editorFeedback.hidden = false;
    clearTimeout(this.editorFeedbackTimeoutId);
    this.editorFeedbackTimeoutId = window.setTimeout(() => {
      if (this.host.editorFeedback) this.host.editorFeedback.hidden = true;
    }, 2600);
  }

  _showSaveFeedback(result = {}) {
    if (result.success === false) {
      this._showFeedback('✕ SAVE GAGAL — PERUBAHAN HANYA TERSIMPAN LOKAL', 'error');
      return;
    }
    if (result.fileSaved === false) {
      this._showFeedback('✓ SAVE BERHASIL — TERSIMPAN DI CACHE LOKAL', 'local');
      return;
    }
    this._showFeedback('✓ SAVE BERHASIL — PERUBAHAN DITULIS KE FILE', 'success');
  }

  _clearDebugGlobals() {
    if (typeof window === 'undefined') return;
    if (window.__scavengerCollisionEditor?.host === this.host) {
      window.__scavengerCollisionEditor = null;
    }
    if (window.__scavengerFogEditor?.host === this.host) {
      window.__scavengerFogEditor = null;
    }
    if (window.__scavengerItemEditor?.host === this.host) {
      window.__scavengerItemEditor = null;
    }
  }
}
