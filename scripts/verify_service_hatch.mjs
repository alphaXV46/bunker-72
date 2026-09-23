import assert from 'node:assert/strict';
import {
  SERVICE_HATCH_CONFIG,
  ServiceHatchStation,
  resolveServiceHatchCycleMs,
} from '../src/js/bunkerStations/serviceHatchStation.js';

let time = 0;
let nextFrameId = 1;
const frames = new Map();
globalThis.window = {
  performance: { now: () => time },
  requestAnimationFrame(callback) {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id) { frames.delete(id); },
};

const frame = () => {
  time += 100;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
};

const element = () => ({
  style: {},
  textContent: '',
  attributes: {},
  listeners: new Map(),
  classList: { toggle() {}, remove() {}, add() {} },
  setAttribute(name, value) { this.attributes[name] = value; },
  addEventListener(name, callback) { this.listeners.set(name, callback); },
  removeEventListener(name) { this.listeners.delete(name); },
  dispatch(name, properties = {}) {
    this.listeners.get(name)?.({ preventDefault() {}, ...properties });
  },
});

const mount = (segmentCount = 1, holdDurationMs = 900, random = () => 0.5) => {
  const station = new ServiceHatchStation();
  const nodes = new Map([
    '#mg-hatch-track', '#mg-hatch-needle', '.mg-hatch-sweet-zone',
    '#mg-hatch-resistance', '#mg-hatch-stage', '#mg-hatch-progress',
    '#mg-hatch-state',
  ].map((selector) => [selector, element()]));
  const track = nodes.get('#mg-hatch-track');
  track.getBoundingClientRect = () => ({ left: 0, width: 100 });
  track.setPointerCapture = (id) => { assert.notEqual(id, null); track.captured = id; };
  track.hasPointerCapture = (id) => track.captured === id;
  track.releasePointerCapture = (id) => {
    assert.equal(track.captured, id);
    track.captured = null;
  };
  const panel = { innerHTML: '', querySelector: (selector) => nodes.get(selector) };
  let completions = 0;
  let cancellations = 0;
  station.mount(panel, {
    introHtml: '',
    sweetSpotCenter: 0.5,
    random,
    segmentCount,
    holdDurationMs,
    setFeedback() {},
    onComplete() { completions += 1; station.destroy(); },
    onCancel() { cancellations += 1; station.destroy(); },
  });
  return {
    station,
    track,
    sweetZone: nodes.get('.mg-hatch-sweet-zone'),
    get completions() { return completions; },
    get cancellations() { return cancellations; },
  };
};

const currentCenter = (game) => Number.parseFloat(game.sweetZone.style.left) / 100
  + SERVICE_HATCH_CONFIG.sweetSpotWidth / 2;

const followPointer = (game, pointerId) => {
  game.track.dispatch('pointermove', { pointerId, clientX: currentCenter(game) * 100 });
  frame();
};

const pointer = mount();
const initialZoneLeft = pointer.sweetZone.style.left;
frame();
assert.notEqual(pointer.sweetZone.style.left, initialZoneLeft, 'ALIGN zone should move before the player holds');
pointer.track.dispatch('pointermove', { pointerId: 1, clientX: 50 });
assert.equal(pointer.station.position, 0.12, 'hover must not move the collar');
pointer.track.dispatch('pointerdown', { pointerId: 1, button: 0, clientX: 50 });
assert.equal(pointer.track.captured, 1);
pointer.track.dispatch('pointermove', { pointerId: 2, clientX: 90 });
assert.equal(pointer.station.position, 0.5, 'a second pointer must not move the active collar');
for (let i = 0; i < 10; i += 1) followPointer(pointer, 1);
assert.equal(pointer.completions, 1, 'aligned hold should finish exactly once');
assert.equal(frames.size, 0, 'completion must not queue a frame after cleanup');

const keyboard = mount();
for (let i = 0; i < 11; i += 1) keyboard.track.dispatch('keydown', { key: 'ArrowRight' });
assert(keyboard.station.position >= 0.49, 'arrow keys should reach the alignment zone');
keyboard.track.dispatch('keydown', { code: 'Space', key: ' ' });
assert.equal(keyboard.track.captured, undefined, 'keyboard input must not capture a pointer');
for (let i = 0; i < 10; i += 1) {
  const target = currentCenter(keyboard);
  while (Math.abs(keyboard.station.position - target) > 0.025) {
    keyboard.track.dispatch('keydown', { key: keyboard.station.position < target ? 'ArrowRight' : 'ArrowLeft' });
  }
  frame();
}
assert.equal(keyboard.completions, 1, 'keyboard hold should finish the segment');
assert.equal(frames.size, 0);

const canceled = mount();
canceled.track.dispatch('pointerdown', { pointerId: 3, button: 0, clientX: 50 });
canceled.track.dispatch('pointercancel', { pointerId: 3 });
assert.equal(canceled.station.holding, false, 'pointer cancellation should stop the hold');
assert.equal(frames.size, 1, 'ALIGN zone should continue moving after pointer cancellation');
canceled.station.destroy();
assert.equal(frames.size, 0);

const exitAfterProgress = mount(2);
exitAfterProgress.track.dispatch('pointerdown', { pointerId: 4, button: 0, clientX: 50 });
for (let i = 0; i < 10; i += 1) followPointer(exitAfterProgress, 4);
assert.equal(exitAfterProgress.station.segmentIndex, 1);
exitAfterProgress.track.dispatch('keydown', { key: 'Escape' });
assert.equal(exitAfterProgress.cancellations, 1, 'Escape should cancel even after a completed segment');
assert.equal(frames.size, 0);

const stationary = mount(1, SERVICE_HATCH_CONFIG.holdDurationMs);
stationary.track.dispatch('pointerdown', { pointerId: 5, button: 0, clientX: 50 });
const positions = [];
for (let i = 0; i < 56; i += 1) {
  frame();
  positions.push(Number.parseFloat(stationary.sweetZone.style.left));
}
assert(Math.min(...positions) >= 0, 'moving zone must stay inside the track');
assert(Math.max(...positions) + SERVICE_HATCH_CONFIG.sweetSpotWidth * 100 <= 100);
assert(Math.max(...positions) - Math.min(...positions) > 30, 'zone should travel visibly in both directions');
assert.equal(stationary.completions, 0, 'holding still should not beat a moving target at production duration');
stationary.station.destroy();
assert.equal(frames.size, 0);

const cycles = Array.from({ length: 6 }, (_, index) => resolveServiceHatchCycleMs(index, 6));
assert.equal(cycles[0], SERVICE_HATCH_CONFIG.sweetSpotCycleMs);
assert.equal(cycles[5], SERVICE_HATCH_CONFIG.sweetSpotFinalCycleMs);
assert(cycles.every((cycle, index) => index === 0 || cycle < cycles[index - 1]), 'each segment must move faster');

const leftStart = mount(1, 900, () => 0.2);
frame();
assert(currentCenter(leftStart) < 0.5, 'random seed can start the target moving left');
leftStart.station.destroy();
const rightStart = mount(1, 900, () => 0.8);
frame();
assert(currentCenter(rightStart) > 0.5, 'random seed can start the target moving right');
rightStart.station.destroy();

const slowerRhythm = mount(1, 900, () => 0.6);
for (let i = 0; i < 8; i += 1) frame();
const slowerPosition = currentCenter(slowerRhythm);
slowerRhythm.station.destroy();
const fasterRhythm = mount(1, 900, () => 0.9);
for (let i = 0; i < 8; i += 1) frame();
assert(currentCenter(fasterRhythm) > slowerPosition, 'random seed should vary the movement rhythm');
fasterRhythm.station.destroy();
assert.equal(frames.size, 0);

const rhythmSamples = [0.8, 0.15, 0.7, 0.3, 0.95, 0.45];
let rhythmIndex = 0;
const progression = mount(
  6,
  SERVICE_HATCH_CONFIG.holdDurationMs,
  () => rhythmSamples[rhythmIndex++ % rhythmSamples.length],
);
progression.track.dispatch('pointerdown', { pointerId: 6, button: 0, clientX: 50 });
const reachedSegments = new Set([1]);
for (let i = 0; i < 260 && progression.completions === 0; i += 1) {
  const before = currentCenter(progression);
  followPointer(progression, 6);
  const after = currentCenter(progression);
  assert(Math.abs(after - before) < 0.04, 'zone must not jump when speed changes');
  if (!progression.completions) reachedSegments.add(progression.station.segmentIndex + 1);
}
assert.deepEqual([...reachedSegments], [1, 2, 3, 4, 5, 6]);
assert.equal(progression.completions, 1, 'following all six progressively faster segments should succeed');
assert.equal(frames.size, 0);

console.log('PASS: randomized six-segment service hatch motion, pointer, keyboard, completion, and cleanup');
