const assert = require('node:assert/strict');
const load = require('./load.cjs');
load('model.js');
load('core-pack.js');
const E = globalThis.Lilt3;
const score = structuredClone(require('../public/examples/score.json'));
score.stage = { width: 1920, height: 1080, fps: 30 };
score.effects = {
  move: {
    kind: 'motion',
    duration: 2000,
    keyframes: {
      x: [
        { time: 0, value: 100, ease: 'linear' },
        { time: 1000, value: 0 },
        { time: 2000, value: -50 },
      ],
      opacity: [
        { time: 0, value: 0, ease: 'smooth' },
        { time: 1000, value: 1 },
      ],
    },
  },
};
score.scenes[0].animations = [{ id: 'keys', use: 'move', at: 0, each: 'word' }];
E.validate(score);
const plan = E.compileScene(score, score.scenes[0]);
const sample = (ms) => E.sample(plan.animations[0], plan.animations[0].groups[0], ms);
assert.equal(sample(0).x, 100);
assert.equal(sample(500).x, 50);
assert.equal(sample(1500).x, -25);
assert.equal(sample(4000).x, -50);
assert.equal(sample(500).opacity, 0.5);
const broken = structuredClone(score);
broken.effects.move.keyframes.x[1].time = 0;
assert.throws(() => E.validate(broken), /keyframe/);
broken.effects.move.keyframes.x[1].time = 1000;
broken.effects.move.keyframes.x[1].value = Infinity;
assert.throws(() => E.validate(broken), /keyframe/);
broken.effects.move.keyframes.x[1].value = 0;
broken.effects.move.keyframes.x[0].ease = 'unknown';
assert.throws(() => E.validate(broken), /keyframe/);
const stage = structuredClone(score);
stage.stage.width = 0;
assert.throws(() => E.validate(stage), /dimensions/);
stage.stage.width = 1920;
stage.stage.fps = 29;
assert.throws(() => E.validate(stage), /fps/);
assert.deepEqual(sample(700), sample(700));
console.log(
  'PASS extensions: timestamped keyframes, interpolation, endpoint hold, deterministic seeking, validation, composition dimensions and fps.',
);
