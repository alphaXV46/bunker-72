import assert from 'node:assert/strict';
import { GameModel } from '../src/js/gameModel.js';
import { RadioMiniGame } from '../src/js/radioMiniGame.js';

const classList = () => ({ add() {}, remove() {}, toggle() {} });
const element = () => ({
  classList: classList(),
  style: {},
  textContent: '',
  disabled: false,
  value: '',
  addEventListener() {},
});
const nodes = new Map();
const modalEl = {
  classList: classList(),
  setAttribute() {},
  querySelector(selector) {
    if (selector === '#radio-rotary-knob') return null;
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  },
};

const previousWindow = globalThis.window;
const previousLocalStorage = globalThis.localStorage;
globalThis.window = { setTimeout(callback) { callback(); return 1; } };
globalThis.localStorage = { getItem() { return null; } };

try {
  let informationalResults = 0;
  const finalResults = [];
  const radio = new RadioMiniGame({
    modalEl,
    audio: { playRadioSound() {}, stopRadioSound() {}, playClick() {} },
    onInformationalResult: () => { informationalResults += 1; },
    onFinalResult: (result) => finalResults.push(result),
  });

  assert.equal(radio.open(), true);
  const day1Target = radio.targetFreq;
  radio.close();
  assert.equal(radio.open(), true);
  assert.equal(radio.targetFreq, day1Target, 'Reopening must keep the same Day 1 target');
  radio.currentFreq = day1Target;
  radio.attemptLockSignal();
  assert.equal(informationalResults, 1);
  assert.equal(radio.open(), false, 'A locked Day 1 signal cannot be tuned again');

  assert.equal(radio.open({ finalAttempt: true }), true);
  const day3Target = radio.targetFreq;
  radio.close();
  assert.equal(radio.open(), false, 'The quick receiver cannot replace an active SAR session');
  assert.equal(radio.open({ finalAttempt: true }), true);
  assert.equal(radio.targetFreq, day3Target, 'Reopening must keep the same SAR target');
  radio.currentFreq = day3Target;
  radio.attemptLockSignal();
  assert.equal(finalResults.length, 1);
  assert.equal(finalResults[0].quality, 'clear');
  assert.equal(radio.open({ finalAttempt: true }), false, 'A sent SAR result cannot be retried');

  const restored = new GameModel();
  restored.init('day1_lockdoor', 8, [{ choiceId: 'c_day1_radio_minigame' }]);
  assert.equal(restored.flags.day1_radio_tuned, true, 'An older save must remember the started Day 1 tuning');
  assert.equal(restored.flags.day1_radio_locked, false);
  restored.init('day1_lockdoor', 8, [], { day1_radio_locked: true });
  assert.equal(restored.flags.day1_radio_locked, true, 'A completed Day 1 lock must survive loading');

  console.log('Radio tuning session and save checks passed.');
} finally {
  globalThis.window = previousWindow;
  globalThis.localStorage = previousLocalStorage;
}
