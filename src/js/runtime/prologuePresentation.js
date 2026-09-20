// Presentation constraints are ephemeral. Neither the editor nor persistence
// reads these variables as canonical coordinates.
const properties = ['left', 'top', 'right', 'bottom', 'width', 'height', 'max-height', 'transform'];

const SEALED72_REVISION = 'sealed72';

/**
 * Presentation ownership follows the active story revision and scene
 * semantics. Background names are visual assets, not mode identifiers.
 */
export const isSealed72NarrativeScene = (sceneId = '', scene = {}, storyRevision = '') => (
  storyRevision === SEALED72_REVISION
  && (String(sceneId).startsWith('prolog_') || scene?.phase === 'backstory')
);

export const isSpecialPrologueScene = (sceneId = '') => (
  sceneId === 'prolog_packing' || sceneId === 'prolog_title'
);

export const cinematicValue = (property, value) => properties.includes(property)
  ? `var(--cinematic-${property}, ${value})` : value;

export function withCanonicalPresentation(root, read) {
  const targets = root ? [...root.querySelectorAll('#dialogue-container, #command-deck-container')] : [];
  const saved = targets.map(element => properties.map(property => {
    const key = `--cinematic-${property}`;
    const value = element.style.getPropertyValue(key);
    element.style.removeProperty(key);
    return [key, value];
  }));
  try { return read(); } finally {
    targets.forEach((element, i) => saved[i].forEach(([key, value]) => {
      if (value) element.style.setProperty(key, value);
    }));
  }
}

export class ProloguePresentation {
  constructor(root) {
    this.root = root;
    this.dialogue = root.querySelector('#dialogue-container');
    this.deck = root.querySelector('#command-deck-container');
    this.choices = root.querySelector('#choices-panel');
    this.active = false;
    this.frame = null;
    this.schedule = () => {
      if (this.frame === null) this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.update();
      });
    };
    this.resize = new ResizeObserver(this.schedule);
    [root, this.dialogue, this.deck, this.choices].forEach(el => this.resize.observe(el));
    this.mutations = new MutationObserver(this.schedule);
    this.observe();
    window.addEventListener('resize', this.schedule);
    document.fonts?.ready.then(this.schedule);
  }

  observe() {
    this.mutations.observe(this.root, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['class', 'style', 'hidden'],
    });
  }

  setActive(active) {
    this.active = active;
    this.root.classList.toggle('cinematic-prologue', active);
    if (active) this.dialogue.setAttribute('tabindex', '0');
    else this.dialogue.removeAttribute('tabindex');
    this.update();
  }

  update() {
    this.mutations.disconnect();
    try {
      [this.dialogue, this.deck].forEach(el => properties.forEach(property =>
        el.style.removeProperty(`--cinematic-${property}`)));
      this.root.style.removeProperty('--choices-reserved-height');
      if (!this.active || !this.root.clientHeight) return;
      const stage = this.root.getBoundingClientRect();
      const gap = stage.height < 450 ? 8 : 16;
      const inset = stage.width < 600 ? 14 : 28;
      const top = 16;
      const bottom = stage.height - gap;
      const set = (el, property, value) => el.style.setProperty(`--cinematic-${property}`, value);
      const fit = (el, maxHeight) => {
        const base = el.getBoundingClientRect();
        const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const cosine = Math.abs(matrix.a), sine = Math.abs(matrix.b);
        const availableWidth = stage.width - inset * 2;
        let width = Math.min(el.offsetWidth || availableWidth, availableWidth, 850);
        // A rotated editor box must also fit inside the safe screen rectangle.
        if (sine > 0.001) width = Math.min(width, Math.max(12, (maxHeight - 12 * cosine) / sine));
        let heightLimit = maxHeight;
        if (cosine > 0.001) heightLimit = Math.min(heightLimit, (maxHeight - width * sine) / cosine);
        if (sine > 0.001) heightLimit = Math.min(heightLimit, (availableWidth - width * cosine) / sine);
        const left = Math.max(inset, Math.min(base.left - stage.left, stage.width - inset - width));
        set(el, 'width', `${width}px`);
        set(el, 'left', `${left}px`);
        set(el, 'right', 'auto');
        set(el, 'bottom', 'auto');
        set(el, 'height', 'auto');
        set(el, 'max-height', `${Math.max(0, heightLimit)}px`);
        return base;
      };
      const place = (el, y) => {
        const rect = el.getBoundingClientRect();
        const css = getComputedStyle(el);
        const x = Math.max(inset, Math.min(rect.left - stage.left, stage.width - inset - rect.width));
        set(el, 'left', `${parseFloat(css.left) + x - (rect.left - stage.left)}px`);
        set(el, 'top', `${parseFloat(css.top) + y - (rect.top - stage.top)}px`);
      };
      const visible = this.choices.children.length > 0 && getComputedStyle(this.deck).display !== 'none';
      let narrativeBottom = bottom;
      if (visible) {
        fit(this.deck, (bottom - top) * 0.48);
        const height = this.deck.getBoundingClientRect().height;
        place(this.deck, bottom - height);
        narrativeBottom = bottom - height - gap;
      }
      const base = fit(this.dialogue, narrativeBottom - top);
      const height = this.dialogue.getBoundingClientRect().height;
      const desired = Math.min(base.top - stage.top, narrativeBottom - height);
      place(this.dialogue, Math.max(top, desired));
      this.root.style.setProperty('--choices-reserved-height', `${visible ? bottom - narrativeBottom : 0}px`);
    } finally { this.observe(); }
  }
}
