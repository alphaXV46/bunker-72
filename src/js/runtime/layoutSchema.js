/**
 * Shared, side-effect-free schema helpers for persisted editor layouts.
 *
 * This module is part of the runtime path. It deliberately contains no DOM,
 * pointer handling, file writes, or developer-only imports, so saved layouts
 * can still be applied when all editor tooling is disabled for a release.
 */

export const EDITOR_LAYOUT_VERSION = 1;
const MIN_NORMALIZED_SIZE = 0.02;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const normalizeAngle = (value) => {
  let angle = Number(value);
  if (!Number.isFinite(angle)) angle = 0;
  angle %= 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Math.round(angle * 10) / 10;
};

export const profileForWidth = (width) => (Number(width) <= 768 ? 'mobile' : 'desktop');

export const normalizeBox = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const width = clamp(Number(source.w) || 0.4, MIN_NORMALIZED_SIZE, 1);
  const height = clamp(Number(source.h) || 0.2, MIN_NORMALIZED_SIZE, 1);
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

export const normalizeProfile = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([, box]) => box && typeof box === 'object')
      .map(([id, box]) => [id, normalizeBox(box)])
  );
};

export const normalizeLayout = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  const profiles = source.profiles && typeof source.profiles === 'object' ? source.profiles : source;
  return {
    version: EDITOR_LAYOUT_VERSION,
    profiles: {
      desktop: normalizeProfile(profiles.desktop),
      mobile: normalizeProfile(profiles.mobile),
    },
  };
};

