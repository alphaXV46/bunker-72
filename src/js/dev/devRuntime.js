/**
 * Small runtime-facing gateway for optional developer tooling.
 *
 * This file is safe to import from gameplay modules. It has no editor or
 * developer-console imports, so production keeps only the no-op contracts and
 * the actual game runtime remains independent from dev code.
 */

export const DEV_TOOLS_ENABLED = Boolean(import.meta.env?.DEV)
  && String(import.meta.env?.VITE_ENABLE_DEV_TOOLS ?? 'true').toLowerCase() !== 'false';

class NoopScavengerDevTools {
  enabled = false;
  collisionEditor = null;
  fogEditor = null;
  itemEditor = null;
  freeCamera = false;
  debugColliders = false;
  collisionEditorRequested = false;
  fogEditorRequested = false;
  itemEditorRequested = false;
  freeCameraRequested = false;
  editorHelpHidden = false;

  attach() {}

  loadSavedDrafts() {
    return Promise.resolve();
  }

  handleKeyDown() {
    return false;
  }

  handleKeyUp() {
    return false;
  }

  clearPressedKeys() {}

  update() {}

  isDeveloperModeActive() {
    return false;
  }

  getActiveEditorMode() {
    return null;
  }

  setCollisionEditor() {
    return false;
  }

  setFogEditor() {
    return false;
  }

  setItemEditor() {
    return false;
  }

  setFreeCamera() {
    return false;
  }

  setEditorHelpHidden() {
    return false;
  }

  setDebugColliders() {}

  syncDeveloperModePause() {}

  renderDebug() {}

  renderHud() {}

  updateEditorHelpVisibility() {}

  destroy() {}
}

class NoopLayoutDevTools {
  enabled = false;
  helpVisible = false;

  setEnabled() {
    return false;
  }

  setScene() {
    return Promise.resolve();
  }

  toggle() {
    return false;
  }

  toggleHelp() {
    return false;
  }

  getStatus() {
    return {
      enabled: false,
      helpVisible: false,
      sceneKey: 'global',
      profile: 'desktop',
      selectedId: null,
      selectedBox: null,
      statusMessage: 'EDITOR UI OFF',
    };
  }

  handleKeyDown() {
    return false;
  }

  refresh() {}

  destroy() {}
}

const noopScavengerFactory = () => new NoopScavengerDevTools();
const noopLayoutFactory = () => new NoopLayoutDevTools();

let scavengerFactory = noopScavengerFactory;
let layoutFactory = noopLayoutFactory;
let developerConsoleInitializer = null;

export const registerDevTools = ({
  createScavengerDevTools = noopScavengerFactory,
  createLayoutDevTools = noopLayoutFactory,
  initDeveloperConsole = null,
} = {}) => {
  scavengerFactory = createScavengerDevTools;
  layoutFactory = createLayoutDevTools;
  developerConsoleInitializer = initDeveloperConsole;
};

export const createScavengerDevTools = (options) => {
  try {
    return scavengerFactory(options);
  } catch (error) {
    console.warn('[devRuntime] Scavenger tools failed; using the no-op adapter.', error);
    return noopScavengerFactory(options);
  }
};

export const createLayoutDevTools = (options) => {
  try {
    return layoutFactory(options);
  } catch (error) {
    console.warn('[devRuntime] Layout tools failed; using the no-op adapter.', error);
    return noopLayoutFactory(options);
  }
};

export const initializeDeveloperConsole = (options) => {
  if (!DEV_TOOLS_ENABLED || typeof developerConsoleInitializer !== 'function') return null;
  try {
    return developerConsoleInitializer(options);
  } catch (error) {
    console.warn('[devRuntime] Developer console failed; continuing without it.', error);
    return null;
  }
};
