import { CollisionEditor } from '../collisionEditor.js';

const EDITOR_VERSION = 1;
const DEFAULT_ITEM_SIZE = 36;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const finiteNumber = (value, fallback) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

const normalizeAngle = (value) => {
  let angle = finiteNumber(value, 0) % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return Math.round(angle * 10) / 10;
};

const getMapSize = (readMapSize) => {
  const size = typeof readMapSize === 'function' ? readMapSize() : {};
  return {
    width: Math.max(4, finiteNumber(size.width, 1)),
    height: Math.max(4, finiteNumber(size.height, 1)),
  };
};

const getItemUid = (item, index = 0) => String(
  item?.uid || item?.itemUid || item?.id || item?.type || `item-${index}`
);

const toEditorRect = (item, index, readMapSize) => {
  const mapSize = getMapSize(readMapSize);
  const uid = getItemUid(item, index);
  const width = clamp(
    Math.round(finiteNumber(item?.w, DEFAULT_ITEM_SIZE)),
    4,
    mapSize.width,
  );
  const height = clamp(
    Math.round(finiteNumber(item?.h, DEFAULT_ITEM_SIZE)),
    4,
    mapSize.height,
  );
  const centerX = finiteNumber(item?.x, width / 2);
  const centerY = finiteNumber(item?.y, height / 2);

  return {
    id: uid,
    type: 'item',
    itemUid: uid,
    itemType: String(item?.type || item?.itemType || item?.id || 'item'),
    x: clamp(Math.round(centerX - width / 2), 0, Math.max(0, mapSize.width - width)),
    y: clamp(Math.round(centerY - height / 2), 0, Math.max(0, mapSize.height - height)),
    w: width,
    h: height,
    angle: normalizeAngle(item?.angle),
  };
};

const toSavedItem = (rect) => ({
  uid: String(rect?.itemUid || rect?.id || 'item'),
  type: String(rect?.itemType || 'item'),
  x: Math.round(finiteNumber(rect?.x, 0) + finiteNumber(rect?.w, DEFAULT_ITEM_SIZE) / 2),
  y: Math.round(finiteNumber(rect?.y, 0) + finiteNumber(rect?.h, DEFAULT_ITEM_SIZE) / 2),
  w: Math.max(4, Math.round(finiteNumber(rect?.w, DEFAULT_ITEM_SIZE))),
  h: Math.max(4, Math.round(finiteNumber(rect?.h, DEFAULT_ITEM_SIZE))),
  angle: normalizeAngle(rect?.angle),
});

const mergeSavedItems = (defaultItems, savedItems, readMapSize) => {
  const defaults = (Array.isArray(defaultItems) ? defaultItems : [])
    .map((item, index) => toEditorRect(item, index, readMapSize));
  const savedByUid = new Map(
    (Array.isArray(savedItems) ? savedItems : [])
      .map((item, index) => [getItemUid(item, index), item])
  );

  return defaults.map((defaultRect, index) => {
    const defaultItem = toSavedItem(defaultRect);
    const savedItem = savedByUid.get(defaultRect.itemUid);
    return savedItem
      ? toEditorRect({ ...defaultItem, ...savedItem }, index, readMapSize)
      : defaultRect;
  });
};

/**
 * Developer-only adapter that reuses the rectangle editor's reliable pointer
 * mapping, undo stack, and persistence lifecycle for collectible item assets.
 * The editor exposes only existing item rectangles: it cannot create, delete,
 * duplicate, resize, or rotate items, so item count and gameplay identity stay
 * controlled by the scavenger runtime.
 */
export class ScavengerItemEditor {
  constructor({
    storageKey = 'prologue_house',
    getItems = () => [],
    getDefaultItems = getItems,
    getMapSize = () => ({ width: 1, height: 1 }),
    getViewport = () => ({ width: 1, height: 1 }),
    getCamera = () => ({ x: 0, y: 0 }),
    getRenderOffset = () => ({ x: 0, y: 0 }),
    filePersistence = null,
    onItemsChange = () => {},
    onPan = () => {},
    onResetCamera = () => {},
    onInvalidate = () => {},
    onSave = () => {},
  } = {}) {
    this.storageKey = String(storageKey || 'prologue_house');
    this.getItems = getItems;
    this.getDefaultItems = getDefaultItems;
    this.getMapSize = getMapSize;
    this.onItemsChange = onItemsChange;

    this.rects = (Array.isArray(this.getItems()) ? this.getItems() : [])
      .map((item, index) => toEditorRect(item, index, this.getMapSize));

    this.editor = new CollisionEditor({
      storageKey: `item_${this.storageKey}`,
      getColliders: () => this.rects,
      getDefaultColliders: () => mergeSavedItems(
        this.getDefaultItems(),
        [],
        this.getMapSize,
      ),
      getMapSize: this.getMapSize,
      getViewport,
      getCamera,
      getRenderOffset,
      getPersistedColliders: () => this.rects,
      getLabel: (rect) => String(rect?.itemUid || rect?.id || 'ITEM').toUpperCase(),
      filePersistence: filePersistence
        ? {
          load: async () => {
            const payload = await filePersistence.load();
            if (!payload) return null;
            const savedItems = Array.isArray(payload.items)
              ? payload.items
              : (Array.isArray(payload.colliders)
                ? payload.colliders.map(toSavedItem)
                : null);
            if (!savedItems) return null;
            return {
              ...payload,
              colliders: mergeSavedItems(
                this.getDefaultItems(),
                savedItems,
                this.getMapSize,
              ),
            };
          },
          save: (payload) => filePersistence.save({
            version: EDITOR_VERSION,
            mapKey: this.storageKey,
            mapSize: getMapSize(this.getMapSize),
            items: (payload?.colliders || []).map(toSavedItem),
            exportedAt: new Date().toISOString(),
          }),
          remove: () => filePersistence.remove(),
        }
        : null,
      onChange: ({ reason }) => this._emitChange(reason),
      onReset: (colliders) => {
        this.rects.splice(0, this.rects.length, ...colliders.map((rect) => ({ ...rect })));
        this._emitChange('reset');
      },
      onPan,
      onResetCamera,
      onInvalidate,
      onSave,
      showLabels: true,
      accentColor: '#f59e0b',
      accentFill: 'rgba(245, 158, 11, 0.18)',
      allowResize: false,
      allowRotate: false,
      allowCreate: false,
      allowDelete: false,
      allowClipboard: false,
    });
  }

  get enabled() {
    return Boolean(this.editor?.enabled);
  }

  setEnabled(enabled) {
    return this.editor.setEnabled(enabled);
  }

  toggle() {
    return this.editor.toggle();
  }

  attach(canvas) {
    this.editor.attach(canvas);
  }

  async loadSavedDraft() {
    return this.editor.loadSavedDraft();
  }

  handleKeyDown(event) {
    if (!this.enabled) return false;

    const key = String(event.key || '').toLowerCase();
    if (
      (!event.ctrlKey && !event.altKey && ['n', 'delete', 'backspace'].includes(key))
      || (event.ctrlKey && ['c', 'v', 'd'].includes(key))
    ) {
      event.preventDefault();
      return true;
    }

    return this.editor.handleKeyDown(event);
  }

  getStatus() {
    const status = this.editor.getStatus();
    return {
      ...status,
      itemCount: this.rects.length,
      selectedItem: status.selectedRect ? toSavedItem(status.selectedRect) : null,
    };
  }

  render(ctx) {
    this.editor.render(ctx);
  }

  saveDraft() {
    return this.editor.saveDraft();
  }

  resetDraft() {
    return this.editor.resetDraft();
  }

  exportDraft() {
    return this.editor.exportDraft();
  }

  destroy() {
    this.editor.destroy();
    this.rects.length = 0;
  }

  _emitChange(reason = 'change') {
    this.onItemsChange({
      reason,
      items: this.rects.map(toSavedItem),
      rects: this.rects,
    });
  }
}

