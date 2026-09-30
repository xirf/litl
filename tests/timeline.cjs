const assert = require('node:assert/strict');
require('./load.cjs')('model.js');
require('./load.cjs')('core-pack.js');
const base = require('../public/examples/score.json'),
  score = structuredClone(base);
score.scenes = score.scenes.slice(0, 3);
score.layers = [
  { id: 'a', rect: [0, 0, 0.5, 1], z: 1 },
  { id: 'b', rect: [0.5, 0, 0.5, 1], z: 0 },
];
score.scenes.forEach((s, i) => {
  s.start = [1000, 3000, 12200][i];
  s.layer = i === 1 ? 'b' : 'a';
});
score.duration = 22000;
Lilt3.validate(score);
const t = Lilt3.schedule(score);
assert.equal(t.duration, 22000);
const ids = (ms) => Lilt3.activeClips(t, ms).map((c) => c.index);
assert.deepEqual(ids(0), []);
assert.deepEqual(ids(999), []);
assert.deepEqual(ids(1000), [0]);
assert.deepEqual(ids(3000), [1, 0]);
assert.deepEqual(ids(8199), [1, 0]);
assert.deepEqual(ids(8200), [1]);
assert.deepEqual(ids(10200), []);
assert.deepEqual(ids(12200), [2]);
assert.deepEqual(ids(19400), []);
assert.deepEqual(ids(22000), []);
const reordered = structuredClone(score);
reordered.scenes.reverse();
assert.equal(Lilt3.schedule(reordered).clips.find((c) => c.id === score.scenes[0].id).start, 1000);
const bad = structuredClone(score);
bad.duration = 10000;
assert.throws(() => Lilt3.validate(bad), /duration/);
delete bad.duration;
bad.scenes[0].layer = 'missing';
assert.throws(() => Lilt3.validate(bad), /Unknown clip layer/);
bad.scenes[0].layer = 'a';
bad.layers[0].rect = [0.6, 0, 0.5, 1];
assert.throws(() => Lilt3.validate(bad), /rect/);
const legacy = Lilt3.schedule(base);
assert.equal(legacy.clips[1].start, 7200);
assert.equal(legacy.duration, 93600);
const muted = structuredClone(score);
muted.layers[0].visible = false;
assert.deepEqual(
  Lilt3.activeClips(Lilt3.schedule(muted), 5400).map((c) => c.index),
  [1],
);
console.log(
  'PASS timeline: absolute placement, overlap, layer z, exclusive ends, leading/interior/trailing silence, reorder stability, invalid bounds/dependencies, hidden layers, sequential compatibility.',
);
