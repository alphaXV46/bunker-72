import { registerDevTools } from './devRuntime.js';
import { ScavengerDevTools } from './scavengerDevTools.js';
import { NarrativeLayoutDevTools } from './narrativeLayoutDevTools.js';
import { NarrativeHotspotDevTools } from './narrativeHotspotDevTools.js';
import { initDeveloperConsole } from '../debug/developerConsole.js';
import { editorDataStore } from '../editorDataStore.js';
import { hydrateRuntimeEditorData } from '../runtime/editorLayoutRuntime.js';

/**
 * Registers the real developer implementations. This module is imported only
 * by the development branch in main.js, keeping editor code out of releases.
 */
export const bootstrapDevTools = async () => {
  try {
    const editorData = await editorDataStore.load();
    hydrateRuntimeEditorData(editorData);
  } catch (error) {
    console.warn('[devBootstrap] Data editor gagal dimuat; memakai data bawaan.', error);
  }
  registerDevTools({
    createScavengerDevTools: (options) => new ScavengerDevTools(options),
    createLayoutDevTools: (options) => new NarrativeLayoutDevTools(options),
    createHotspotDevTools: (options) => new NarrativeHotspotDevTools(options),
    initDeveloperConsole,
  });
};
