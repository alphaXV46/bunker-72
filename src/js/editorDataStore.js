import initialEditorData from '../data/editor/editor-layouts.json';

const EDITOR_DATA_ENDPOINT = '/__bunker72/editor-data';
const LOCAL_CACHE_KEY = 'bunker72:editor-data-cache:v1';
const EDITOR_DATA_VERSION = 1;

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const createEmptyDocument = () => ({
  version: EDITOR_DATA_VERSION,
  collision: {},
  fog: {},
  ui: {},
});

const normalizeDocument = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    version: EDITOR_DATA_VERSION,
    collision: source.collision && typeof source.collision === 'object' && !Array.isArray(source.collision)
      ? source.collision
      : {},
    fog: source.fog && typeof source.fog === 'object' && !Array.isArray(source.fog)
      ? source.fog
      : {},
    ui: source.ui && typeof source.ui === 'object' && !Array.isArray(source.ui)
      ? source.ui
      : {},
  };
};

/**
 * Small persistence adapter shared by all developer editors.
 *
 * In Vite development the PUT request is handled by vite.config.js and writes
 * directly to src/data/editor/editor-layouts.json. A localStorage cache keeps
 * the editor usable when the page is opened from a static build or when the
 * dev server endpoint is unavailable.
 */
export class EditorDataStore {
  constructor() {
    this.data = null;
    this.loadPromise = null;
    this.writePromise = Promise.resolve();
    this.lastPersistence = 'none';
  }

  async load() {
    if (this.data) return clone(this.data);
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      let loaded = null;

      if (typeof fetch === 'function') {
        try {
          const response = await fetch(EDITOR_DATA_ENDPOINT, { cache: 'no-store' });
          if (response.ok) loaded = await response.json();
        } catch (_) {}
      }

      if (!loaded && typeof window !== 'undefined') {
        try {
          const cached = window.localStorage?.getItem(LOCAL_CACHE_KEY);
          if (cached) loaded = JSON.parse(cached);
        } catch (_) {}
      }

      this.data = normalizeDocument(loaded || initialEditorData || createEmptyDocument());
      return clone(this.data);
    })();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  async read(section, key) {
    await this.load();
    return clone(this.data?.[section]?.[key]);
  }

  async write(section, key, value) {
    await this.load();
    if (!this.data[section] || typeof this.data[section] !== 'object') this.data[section] = {};
    this.data[section][key] = clone(value);
    return this._persist();
  }

  async remove(section, key) {
    await this.load();
    if (this.data[section]) delete this.data[section][key];
    return this._persist();
  }

  async _persist() {
    const snapshot = clone(this.data);
    this.writePromise = this.writePromise
      .catch(() => null)
      .then(async () => {
        let fileSaved = false;

        if (typeof fetch === 'function') {
          try {
            const response = await fetch(EDITOR_DATA_ENDPOINT, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(snapshot),
            });
            fileSaved = response.ok;
          } catch (_) {}
        }

        if (typeof window !== 'undefined') {
          try {
            window.localStorage?.setItem(LOCAL_CACHE_KEY, JSON.stringify(snapshot));
          } catch (_) {}
        }

        this.lastPersistence = fileSaved ? 'file' : 'local';
        return { fileSaved, data: clone(snapshot) };
      });

    return this.writePromise;
  }

  exportDocument(filename = 'bunker72-editor-layouts.json') {
    const payload = clone(this.data || createEmptyDocument());
    const json = JSON.stringify(payload, null, 2);

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.info('[EditorDataStore] Editor data JSON:', json);
    }

    return payload;
  }
}

export const editorDataStore = new EditorDataStore();

