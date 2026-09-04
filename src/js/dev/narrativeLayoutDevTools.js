import { ScreenLayoutEditor } from '../screenLayoutEditor.js';
import { editorDataStore } from '../editorDataStore.js';

/**
 * Developer-only adapter for the DOM dialogue/choice layout editor.
 * GameView talks to this small surface and does not import editor persistence
 * or pointer-editing code in a release build.
 */
export class NarrativeLayoutDevTools {
  constructor({ root, onSave = () => {}, onStatus = () => {}, canToggle = () => true } = {}) {
    this.root = root;
    this.canToggle = canToggle;
    this.feedback = null;
    this.feedbackTimeoutId = null;
    this.editor = new ScreenLayoutEditor({
      root,
      persistence: {
        load: (sceneKey) => editorDataStore.read('ui', sceneKey),
        save: (sceneKey, payload) => editorDataStore.write('ui', sceneKey, payload),
        remove: (sceneKey) => editorDataStore.remove('ui', sceneKey),
      },
      onSave: (result) => {
        this._showSaveFeedback(result);
        onSave(result);
      },
      onStatus,
    });
  }

  get enabled() {
    return Boolean(this.editor?.enabled);
  }

  get helpVisible() {
    return Boolean(this.editor?.helpVisible);
  }

  setEnabled(enabled) {
    return this.editor.setEnabled(enabled);
  }

  setScene(sceneKey) {
    return this.editor.setScene(sceneKey);
  }

  toggle() {
    return this.editor.toggle();
  }

  toggleHelp() {
    return this.editor.toggleHelp();
  }

  handleKeyDown(event) {
    const key = String(event.key || '').toLowerCase();
    if (key === 'f6' && !event.repeat && this.canToggle()) {
      event.preventDefault();
      this.toggle();
      return true;
    }
    if (key === 'f8' && !event.repeat && this.enabled) {
      event.preventDefault();
      const helpVisible = this.toggleHelp();
      this._showFeedback(
        helpVisible
          ? '[F8] BANTUAN EDITOR DITAMPILKAN'
          : '[F8] BANTUAN EDITOR DISEMBUNYIKAN — TEKAN F8 LAGI UNTUK MENAMPILKAN',
        'info'
      );
      return true;
    }
    return this.editor.handleKeyDown(event);
  }

  refresh() {
    this.editor.refresh();
  }

  getStatus() {
    return this.editor.getStatus();
  }

  destroy() {
    this.editor.destroy();
    clearTimeout(this.feedbackTimeoutId);
    this.feedbackTimeoutId = null;
    this.feedback?.remove();
    this.feedback = null;
  }

  _showSaveFeedback(result = {}) {
    const fileSaved = result.fileSaved !== false;
    this._showFeedback(
      result.success === false
        ? '✕ SAVE GAGAL — LAYOUT BELUM TERSIMPAN KE FILE'
        : fileSaved
          ? '✓ SAVE BERHASIL — LAYOUT DITULIS KE FILE'
          : '✓ SAVE BERHASIL — LAYOUT TERSIMPAN DI CACHE LOKAL',
      result.success === false ? 'error' : (fileSaved ? 'success' : 'local')
    );
  }

  _showFeedback(message, tone = 'info') {
    if (!this.root || !message) return;
    if (!this.feedback) {
      this.feedback = document.createElement('div');
      this.feedback.className = 'screen-layout-editor-feedback';
      this.feedback.setAttribute('role', 'status');
      this.feedback.setAttribute('aria-live', 'polite');
      this.root.appendChild(this.feedback);
    }
    this.feedback.textContent = message;
    this.feedback.dataset.tone = tone;
    this.feedback.hidden = false;
    clearTimeout(this.feedbackTimeoutId);
    this.feedbackTimeoutId = window.setTimeout(() => {
      if (this.feedback) this.feedback.hidden = true;
    }, 2600);
  }
}
