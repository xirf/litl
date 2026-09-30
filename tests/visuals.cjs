const assert = require('node:assert/strict');
const load = require('./load.cjs');
load('model.js');
load('core-pack.js');
const E = globalThis.Lilt3;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} ≠ ${b}`);
const curve = [0.42, 0, 0.58, 1];
near(E.easeValue(curve, 0.5), 0.5);
near(E.easeValue(curve, 0), 0);
near(E.easeValue(curve, 1), 1);
assert.ok(E.easeValue(curve, 0.25) < 0.25);
assert.ok(E.easeValue([0.2, 1.25, 0.45, 1], 0.7) > 1);
near(E.easeValue([0, 0, 1, 1], 0.2), 0.2);
near(
  E.keyframeValue(
    [
      { time: 0, value: 0, ease: curve },
      { time: 1000, value: 100 },
    ],
    250,
  ),
  E.easeValue(curve, 0.25) * 100,
);
const path = {
  points: [
    [0, 0],
    [0, 100],
    [100, 100],
    [100, 0],
  ],
  orient: true,
};
assert.deepEqual(E.pathPoint(path, 0), { x: 0, y: 0, rotation: Math.PI / 2 });
near(E.pathPoint(path, 0.5).x, 50);
near(E.pathPoint(path, 0.5).y, 75);
near(E.pathPoint(path, 0.5).rotation, 0);
assert.deepEqual(E.pathPoint(path, 1), { x: 100, y: 0, rotation: -Math.PI / 2 });
const score = {
  v: 3,
  seed: 1,
  packs: { core: '3.0.0' },
  effects: { route: { kind: 'motion', path, ease: curve } },
  scenes: [
    {
      id: 'shape',
      type: 'shape',
      duration: 2000,
      shape: { kind: 'star', width: 240, height: 160, fill: '#c4a2ff' },
      animations: [
        {
          id: 'fx',
          use: 'route',
          at: 0,
          duration: 1000,
          each: 'phrase',
          select: { ids: ['shape'] },
        },
      ],
    },
  ],
};
E.validate(score);
const scene = score.scenes[0],
  plan = E.compileScene(score, scene);
assert.equal(plan.glyphs.length, 1);
assert.equal(plan.glyphs[0].id, 'shape-object');
const sample = (ms) => E.sample(plan.animations[0], plan.animations[0].groups[0], ms);
near(sample(500).x, 50);
near(sample(500).y, 75);
const first = E.evaluate(plan, 750, [{ x: 0, y: 0 }]);
E.evaluate(plan, 100, [{ x: 0, y: 0 }]);
assert.deepEqual(E.evaluate(plan, 750, [{ x: 0, y: 0 }]), first);
scene.animations = [
  { id: 'in', use: 'core/enter-rise', duration: 1000, each: 'phrase', ease: 'linear' },
];
let enter = E.compileScene(score, scene);
near(E.sample(enter.animations[0], enter.animations[0].groups[0], 500).y, 55);
delete scene.animations[0].ease;
enter = E.compileScene(score, scene);
near(E.sample(enter.animations[0], enter.animations[0].groups[0], 500).y, 13.75);
for (const easing of [[-1, 0, 1, 1], [0, 0, 2, 1], [0, NaN, 1, 1], [0, 6, 1, 1], 'unknown']) {
  scene.animations[0].ease = easing;
  assert.throws(() => E.validate(score), /Ease/);
}
delete scene.animations[0].ease;
const invalid = structuredClone(score);
invalid.effects.route.path.points.pop();
assert.throws(() => E.validate(invalid), /path/);
scene.shape.width = 0;
assert.throws(() => E.validate(score), /dimensions/);
scene.shape.width = 240;
score.assets = { logo: { type: 'image', src: 'data:image/png;base64,AAAA' } };
score.scenes.push({
  id: 'logo',
  type: 'image',
  duration: 2000,
  image: { asset: 'logo', width: 200, height: 100, fit: 'contain' },
  animations: [],
});
E.validate(score);
score.assets.logo.src = 'javascript:alert(1)';
assert.throws(() => E.validate(score), /assets/);
console.log(
  'PASS visuals: CSS Bézier solving, overshoot, interpolation, spatial paths/tangents, visual selectors, deterministic seeking, animation easing overrides and validation.',
);
