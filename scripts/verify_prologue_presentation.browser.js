// Run in an active prologue browser page via: agent-browser eval --stdin
// This exercises rendered geometry and an in-memory F6 persistence adapter.
(async () => {
  const root = document.querySelector('#story-box');
  if (!root?.classList.contains('cinematic-prologue')) throw new Error('Open a sealed72 narrative scene first.');
  const narrative = root.querySelector('#dialogue-container');
  const deck = root.querySelector('#command-deck-container');
  const choices = root.querySelector('#choices-panel');
  const text = root.querySelector('#dialogue-text');
  const originalText = text.textContent;
  const originalChoices = [...choices.childNodes];
  const originalStyles = [narrative, deck].map(el => el.getAttribute('style'));
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  let editor;
  try {
    for (const count of [0, 1, 2, 4]) {
      text.textContent = count === 4 ? originalText.repeat(15) : originalText;
      choices.replaceChildren();
      for (let index = 0; index < count; index++) {
        const button = document.createElement('button');
        button.className = 'choice-btn choice-neutral';
        for (const [className, content] of [
          ['choice-index', String(index + 1).padStart(2, '0')],
          ['choice-copy', 'Pilihan panjang dengan keterangan yang membungkus beberapa baris. '.repeat(count === 4 ? 3 : 1)],
          ['choice-arrow', '›'],
        ]) {
          const span = document.createElement('span');
          span.className = className;
          span.textContent = content;
          button.append(span);
        }
        choices.append(button);
      }
      await settle(); await settle();
      const a = narrative.getBoundingClientRect(), b = deck.getBoundingClientRect(), stage = root.getBoundingClientRect();
      assert(!count || a.bottom <= b.top - 7, `Narrative overlaps ${count} choices`);
      assert(a.top >= stage.top && a.left >= stage.left && a.right <= stage.right + 1, 'Narrative escapes stage');
      assert(!count || b.bottom <= stage.bottom + 1, 'Choices escape stage');
      if (count) {
        const renderedChoices = [...choices.querySelectorAll('.choice-btn')];
        assert(renderedChoices.length === count, `Expected ${count} rendered choice buttons`);
        renderedChoices.forEach((button, index) => {
          const rect = button.getBoundingClientRect();
          assert(getComputedStyle(button).display !== 'none', `Choice ${index + 1} is hidden`);
          assert(rect.width > 0 && rect.height > 0, `Choice ${index + 1} has zero dimensions`);
        });
      }
      assert(document.documentElement.scrollWidth <= innerWidth, 'Horizontal page overflow');
      assert(getComputedStyle(narrative).backgroundColor === 'rgba(0, 0, 0, 0)', 'Narrative has a panel');
      if (count === 4) {
        narrative.scrollTop = narrative.scrollHeight;
        assert(narrative.scrollTop + narrative.clientHeight >= narrative.scrollHeight - 1, 'Final line is unreachable');
        deck.scrollTop = deck.scrollHeight;
        assert(deck.scrollTop + deck.clientHeight >= deck.scrollHeight - 1, 'Last choice is unreachable');
      }
      results.push({ count, gap: count ? b.top - a.bottom : null, scrollable: narrative.scrollHeight > narrative.clientHeight });
    }
    const { ScreenLayoutEditor } = await import('/src/js/screenLayoutEditor.js');
    let stored;
    editor = new ScreenLayoutEditor({ root, persistence: {
      load: async () => stored,
      save: async (_key, value) => { stored = structuredClone(value); return { fileSaved: true }; },
    } });
    await editor.setScene('presentation-regression');
    editor.setEnabled(true);
    const target = editor._getTarget('DIALOGUE_BOX');
    const base = { ...editor._getBox(target), x: 0.08, y: 0.7, w: 0.8, h: 0.25 };
    editor.layout.profiles[editor.profile].DIALOGUE_BOX = base;
    editor._applyCurrentProfile(); await settle();
    await editor.save();
    const saved = JSON.stringify(stored);
    for (let i = 0; i < 3; i++) { editor.setEnabled(false); await settle(); editor.setEnabled(true); await settle(); await editor.save(); }
    assert(saved === JSON.stringify(stored), 'Runtime avoidance polluted saved editor data');
    assert(Math.abs(editor._readBox(target).y - base.y) < 0.002, 'Canonical position includes runtime offset');
    results.push({ editorSaveReopenCycles: 3, drift: false });
    choices.replaceChildren(); await settle(); await settle();
    assert(root.style.getPropertyValue('--choices-reserved-height') === '0px', 'Stale choice reservation');
    return { viewport: [innerWidth, innerHeight], results, passed: true };
  } finally {
    editor?.destroy();
    [narrative, deck].forEach((el, index) => originalStyles[index] === null ? el.removeAttribute('style') : el.setAttribute('style', originalStyles[index]));
    text.textContent = originalText;
    choices.replaceChildren(...originalChoices);
    narrative.scrollTop = 0;
    deck.scrollTop = 0;
  }
})()
