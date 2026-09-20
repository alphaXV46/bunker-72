import initialEditorData from '../../data/editor/editor-layouts.json';
import { normalizeLayout } from './layoutSchema.js';

const EDITOR_DATA_VERSION = 1;

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const isRecord = (value) => Boolean(
  value && typeof value === 'object' && !Array.isArray(value)
);

const normalizeDocument = (value) => {
  const source = isRecord(value) ? value : {};
  return {
    version: EDITOR_DATA_VERSION,
    collision: isRecord(source.collision) ? source.collision : {},
    fog: isRecord(source.fog) ? source.fog : {},
    items: isRecord(source.items) ? source.items : {},
    hotspots: isRecord(source.hotspots) ? source.hotspots : {},
    ui: isRecord(source.ui) ? source.ui : {},
  };
};

const runtimeDocument = normalizeDocument(initialEditorData);
const liveHotspotOverrides = new Map();

/**
 * Reads immutable layout overrides that were authored by the developer
 * editors. This is intentionally separate from EditorDataStore, whose PUT
 * endpoint and local cache exist only for development editing.
 */
export const getRuntimeEditorData = () => clone(runtimeDocument);

export const getRuntimeEditorPayload = (section, key) => {
  const sectionData = runtimeDocument[section];
  if (!isRecord(sectionData)) return null;
  return clone(sectionData[String(key || '')]) || null;
};

export const hydrateRuntimeEditorData = (value) => {
  const hydrated = normalizeDocument(value);
  Object.keys(runtimeDocument).forEach((section) => {
    runtimeDocument[section] = clone(hydrated[section]);
  });
  liveHotspotOverrides.clear();
  Object.entries(hydrated.hotspots).forEach(([sceneKey, payload]) => {
    const hotspots = Array.isArray(payload) ? payload : payload?.hotspots;
    if (Array.isArray(hotspots)) liveHotspotOverrides.set(sceneKey, clone(hotspots));
  });
  return getRuntimeEditorData();
};

const getColliderOverride = (section, key) => {
  const payload = getRuntimeEditorPayload(section, key);
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.colliders) ? payload.colliders : null;
};

export const getRuntimeCollisionOverride = (key) => getColliderOverride('collision', key);

export const getRuntimeFogOverride = (key) => getColliderOverride('fog', key);

export const getRuntimeItemOverride = (key) => {
  const payload = getRuntimeEditorPayload('items', key);
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.items) ? payload.items : null;
};

export const getRuntimeHotspotOverride = (key) => {
  const sceneKey = String(key || '');
  const liveOverride = liveHotspotOverrides.get(sceneKey);
  if (liveOverride) return clone(liveOverride);
  const payload = getRuntimeEditorPayload('hotspots', key);
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.hotspots) ? payload.hotspots : null;
};

export const setRuntimeHotspotOverride = (key, hotspots) => {
  const sceneKey = String(key || '');
  if (!sceneKey || !Array.isArray(hotspots)) {
    liveHotspotOverrides.delete(sceneKey);
    return;
  }
  liveHotspotOverrides.set(sceneKey, clone(hotspots));
};

export const getRuntimeUILayout = (sceneKey) => {
  const payload = getRuntimeEditorPayload('ui', sceneKey);
  return payload ? normalizeLayout(payload.layout || payload) : null;
};
