import { registerDevTools } from './devRuntime.js';
import { ScavengerDevTools } from './scavengerDevTools.js';
import { NarrativeLayoutDevTools } from './narrativeLayoutDevTools.js';
import { initDeveloperConsole } from '../debug/developerConsole.js';

/**
 * Registers the real developer implementations. This module is imported only
 * by the development branch in main.js, keeping editor code out of releases.
 */
export const bootstrapDevTools = () => {
  registerDevTools({
    createScavengerDevTools: (options) => new ScavengerDevTools(options),
    createLayoutDevTools: (options) => new NarrativeLayoutDevTools(options),
    initDeveloperConsole,
  });
};

