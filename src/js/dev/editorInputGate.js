/**
 * Shared input gate for developer visual editors.
 *
 * This module contains only small runtime-safe state helpers. It does not
 * import any editor implementation, so gameplay can safely query the gate in
 * production builds where every developer tool is a no-op.
 */

const activeOwners = new Set();
const subscribers = new Set();

const EDITOR_SURFACE_SELECTOR = [
  '[data-bunker72-editor-surface="true"]',
  '#bunker72-dev-console',
  '#bunker72-dev-pill',
].join(', ');

const isEditorSurfaceTarget = (target) => Boolean(
  target?.closest?.(EDITOR_SURFACE_SELECTOR)
);

const notify = (active) => {
  subscribers.forEach((listener) => {
    try {
      listener(active);
    } catch (error) {
      console.warn('[editorInputGate] subscriber failed:', error);
    }
  });
};

/**
 * Registers or unregisters one visual editor owner.
 * Multiple owners are supported during a short editor switch so the gate
 * never opens between the old editor closing and the new editor activating.
 */
export const setVisualEditorActive = (owner, active) => {
  const key = String(owner || 'visual-editor');
  const wasActive = activeOwners.size > 0;

  if (active) activeOwners.add(key);
  else activeOwners.delete(key);

  const isActive = activeOwners.size > 0;
  if (wasActive !== isActive) notify(isActive);
  return isActive;
};

export const isVisualEditorActive = () => activeOwners.size > 0;

export const subscribeVisualEditorState = (listener) => {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

/**
 * Installs one capture-phase guard for narrative input. Editor surfaces remain
 * interactive; everything underneath them is blocked while any visual editor
 * is active. The guard is intentionally opt-in so release builds do not add
 * global listeners for a feature that is disabled there.
 */
export const installVisualEditorInputGuard = () => {
  if (typeof document === 'undefined' || document.__bunker72EditorInputGuard) return;

  const blockNarrativePointer = (event) => {
    if (!isVisualEditorActive() || isEditorSurfaceTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const blockNarrativeKeyboard = (event) => {
    if (!isVisualEditorActive()) return;
    const key = String(event.key || '').toLowerCase();
    if (event.code !== 'Space' && event.code !== 'Enter' && key !== ' ' && key !== 'enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const pointerEvents = ['pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu'];
  pointerEvents.forEach((type) => document.addEventListener(type, blockNarrativePointer, true));
  document.addEventListener('keydown', blockNarrativeKeyboard, true);

  document.__bunker72EditorInputGuard = {
    blockNarrativePointer,
    blockNarrativeKeyboard,
    pointerEvents,
  };
};

