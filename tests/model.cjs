const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
for (const file of ['model.js', 'core-pack.js', 'migrate.js', 'editing.js'])
  require('./load.cjs')(file);
const E = Lilt3,
  score = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/examples/score.json')));
E.validate(score);
const s = score.scenes[0],
  before = E.compileScene(score, s),
  wave = before.glyphs.find((g) => g.ch === '波'),
  random = wave.random('route');
const modified = structuredClone(score);
E.editText(modified.scenes[0], 'あ' + E.contentText(s.content));
E.validate(modified);
const after = E.compileScene(modified, modified.scenes[0]),
  waveAfter = after.glyphs.find((g) => g.ch === '波');
assert.equal(waveAfter.id, wave.id);
assert.equal(waveAfter.random('route'), random);
assert.equal(waveAfter.style.size, wave.style.size);
assert(
  after.materials
    .find((i) => i.use === 'core/liquid')
    .groups.some((g) => g.indices.includes(waveAfter.i)),
);
const alt = E.select(s, before.glyphs, { every: 2 });
assert(alt.every((i) => i % 2 === 0));
const word = wave.word,
  idx = E.select(s, before.glyphs, { ids: [word] });
assert(idx.includes(wave.i));
assert.equal(E.select(s, before.glyphs, { ids: [] }).length, 0);
E.registerPack({
  id: 'test',
  version: '1',
  effects: {
    move: {
      kind: 'motion',
      duration: 500,
      defaults: { distance: 10 },
      controls: { distance: { min: 0, max: 100 } },
      sample: ({ p, params }) => ({ x: params.distance * p, opacity: 0.5 }),
    },
    spin: { kind: 'motion', duration: 500, sample: () => ({ rotation: Math.PI / 2 }) },
  },
});
const basic = {
  v: 3,
  seed: 42,
  packs: { test: '1' },
  scenes: [
    {
      id: 'test-scene',
      duration: 3000,
      layout: 'line',
      content: [
        {
          id: 'word',
          type: 'word',
          begin: 1000,
          end: 2500,
          children: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
        },
      ],
      animations: [
        { id: 'm', use: 'test/move', each: 'word', anchor: 'unit', params: { distance: 20 } },
        { id: 'spin', use: 'test/spin', each: 'word' },
      ],
      materials: [],
    },
  ],
};
E.validate(basic);
let plan = E.compileScene(basic, basic.scenes[0]);
assert.equal(E.sample(plan.animations[0], plan.animations[0].groups[0], 1000).x, 0);
assert.equal(E.sample(plan.animations[0], plan.animations[0].groups[0], 1500).x, 20);
let positions = [
    { x: -10, y: 0 },
    { x: 10, y: 0 },
  ],
  states = E.evaluate(plan, 1500, positions);
const point = (m, p) => [m[0] * p.x + m[2] * p.y + m[4], m[1] * p.x + m[3] * p.y + m[5]];
let p0 = point(states[0].matrix, positions[0]),
  p1 = point(states[1].matrix, positions[1]);
assert(Math.abs(Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) - 20) < 1e-8);
assert.equal(states[0].opacity, 0.5);
const missing = structuredClone(basic);
missing.packs.test = '2';
assert.throws(() => E.validate(missing), /unavailable/);
const bad = structuredClone(basic);
bad.scenes[0].animations[0].select = { ids: ['missing'] };
assert.throws(() => E.validate(bad), /missing/);
bad.scenes[0].animations[0].select = { ids: ['a'] };
bad.scenes[0].animations[0].params.distance = 101;
assert.throws(() => E.validate(bad), /bounds/);
assert.equal(E.chars('e\u0301👩‍💻').length, 2);
const deletion = structuredClone(score);
E.editText(deletion.scenes[0], '揺れる');
E.validate(deletion);
const second = E.compileScene(score, s);
assert.deepEqual(
  E.evaluate(
    before,
    1500,
    before.glyphs.map((g, i) => ({ x: i * 50, y: 0 })),
  ),
  E.evaluate(
    second,
    1500,
    second.glyphs.map((g, i) => ({ x: i * 50, y: 0 })),
  ),
);
console.log(
  'PASS model: migration, stable IDs after prefix insertion, target/style/random preservation, deletion cleanup, ID/stride selectors, configurable custom pack, vocal timing, rigid word transforms, opacity composition, dependency/version checks, parameter validation, graphemes, deterministic evaluation.',
);
