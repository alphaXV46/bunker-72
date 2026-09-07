import { normalizeLayout, profileForWidth } from './layoutSchema.js';

const managedElementsByRoot = new WeakMap();

const setImportant = (element, property, value) => {
  element.style.setProperty(property, value, 'important');
};

const clearElementStyles = (element) => {
  if (!element) return;
  [
    'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
    'min-width', 'min-height', 'max-width', 'max-height', 'margin',
    'box-sizing', 'transform', 'transform-origin',
  ].forEach((property) => element.style.removeProperty(property));
};

const getTargets = (root) => (root ? [
  { id: 'DIALOGUE_BOX', element: root.querySelector('#dialogue-container') },
  { id: 'CHOICES_PANEL', element: root.querySelector('#command-deck-container') },
].filter((target) => target.element) : []);

const applyBox = (target, box) => {
  const element = target.element;
  // The editor and runtime intentionally apply the same properties to the
  // same target. CSS then resolves percentages against the current
  // card-body/story-box containing block exactly as it does while editing.
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
};

/**
 * Applies a saved UI layout without constructing the developer editor.
 * Calling it again clears styles owned by the previous scene first, keeping
 * scene transitions reversible in production builds.
 */
export const applyRuntimeUILayout = (root, layout) => {
  if (!root) return;

  const previous = managedElementsByRoot.get(root);
  previous?.forEach((element) => clearElementStyles(element));

  const managed = new Set();
  const normalized = normalizeLayout(layout);
  const profile = profileForWidth(root.clientWidth || window.innerWidth);
  const profileData = normalized.profiles[profile] || {};

  getTargets(root).forEach((target) => {
    const box = profileData[target.id];
    if (!box) return;
    applyBox(target, box);
    managed.add(target.element);
  });

  managedElementsByRoot.set(root, managed);
};

export const clearRuntimeUILayout = (root) => {
  if (!root) return;
  managedElementsByRoot.get(root)?.forEach((element) => clearElementStyles(element));
  managedElementsByRoot.delete(root);
};
