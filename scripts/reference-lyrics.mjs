// Rebuild the editable lyric overlay for the user-supplied 27.79s cover excerpt.
// All times are relative to the uploaded cut, quantized to its 24fps frames.
import { writeFile } from 'node:fs/promises';
import '../public/lilt/model.js';
import '../public/lilt/core-pack.js';

const E = globalThis.Lilt3;
const frame = (n) => Math.round((n * 1000) / 24);
const score = {
  v: 3,
  seed: 421,
  name: 'I’m a mess · あくび / でもんすぺーど · Reference excerpt',
  packs: { core: '3.0.0' },
  stage: { width: 854, height: 480, fps: 24 },
  duration: frame(667),
  background: { transparent: true },
  layers: [
    { id: 'lyrics', name: 'Lyrics', z: 1, rect: [0, 0, 1, 1] },
    { id: 'echo', name: 'Lyric echoes', z: 0, rect: [0, 0, 1, 1] },
    { id: 'labels', name: 'Romanized labels', z: 2, rect: [0, 0, 1, 1] },
    { id: 'accents', name: 'Brackets and pink accents', z: 3, rect: [0, 0, 1, 1] },
  ],
  scenes: [],
  effects: {},
  markers: [],
};

// Renderer line layouts fit at 1.25x for these sizes. Motion uses layout coordinates.
function pose(clip, x, y, degrees = 0, scale = 1) {
  const id = `${clip.id}-pose`;
  score.effects[id] = {
    kind: 'motion',
    keyframes: Object.fromEntries(
      Object.entries({
        x: x / 1.25,
        y: (y - 230.4) / 1.25,
        rotation: (degrees * Math.PI) / 180,
        sx: scale,
        sy: scale,
      }).map(([k, value]) => [k, [{ time: 0, value }]]),
    ),
  };
  clip.animations.push({ id, use: id, each: 'phrase', at: 0, duration: clip.duration });
  return score.effects[id];
}
function text(
  id,
  words,
  first,
  last,
  {
    x = 0,
    y = 240,
    size = 1,
    scale = 1,
    face = 'mincho',
    italic = false,
    angle = 0,
    layer = 'lyrics',
    color = '#ffffff',
    enter = 'type',
    stagger = 0,
    pink = false,
    rough = false,
  } = {},
) {
  const clip = {
    id,
    name: words,
    start: frame(first),
    duration: frame(last) - frame(first),
    layer,
    layout: 'line',
    style: { face, size, color, italic },
    content: [...words].map((ch, i) => ({
      id: `${id}-g${i}`,
      text: ch,
      ...(pink && i % 3 === 1 ? { style: { color: '#e85385' } } : {}),
    })),
    animations: [],
    materials: [],
  };
  if (enter)
    clip.animations.push({
      id: `${id}-enter`,
      use: `core/enter-${enter}`,
      each: stagger ? 'character' : 'phrase',
      duration: 125,
      stagger,
    });
  if (rough)
    clip.materials.push(
      { id: `${id}-grain`, use: 'core/grain', params: { amount: 0.75 } },
      { id: `${id}-scan`, use: 'core/scan', params: { amount: 0.7 } },
    );
  score.scenes.push(clip);
  pose(clip, x, y, angle, scale);
  return clip;
}
function shape(id, first, last, x, y, width, height, fill) {
  const clip = {
    id,
    name: id,
    type: 'shape',
    start: frame(first),
    duration: frame(last) - frame(first),
    layer: 'accents',
    layout: 'line',
    shape: { kind: 'rectangle', width, height, fill },
    content: [],
    animations: [],
    materials: [],
  };
  score.scenes.push(clip);
  // Shapes use fit=1, unlike text.
  const def = pose(clip, x, y);
  def.keyframes.x[0].value = x;
  def.keyframes.y[0].value = y - 230.4;
}
function marker(n, name, color = '#e85385') {
  score.markers.push({ id: `cue-${n}`, time: frame(n), name, color });
}

marker(29, 'I’m a mess · pink');
text('pink-upper', "I'm a mess", 29, 81, {
  x: -192,
  y: 132,
  size: 0.92,
  italic: true,
  angle: -15,
  stagger: 24,
  pink: true,
});
text('pink-lower', "I'm a mess", 57, 81, {
  x: 180,
  y: 374,
  size: 1.03,
  italic: true,
  angle: -15,
  stagger: 24,
  pink: true,
});
// Short vertical pink flashes from the opening title treatment.
shape('pink-flash-one', 48, 50, 0, 418, 3, 30, '#e85385');
shape('pink-flash-two', 70, 72, -373, 144, 4, 38, '#e85385');

marker(81, '明けない夜に', '#ffffff');
text('akenai', '明けない夜に', 81, 124, { size: 1.5, stagger: 18 });
text('akenai-label', 'A K E N A I   Y O R U N I', 71, 79, {
  size: 0.25,
  scale: 0.5,
  y: 240,
  layer: 'labels',
});

marker(124, '失いかけた声を上げて', '#ffffff');
text('voice', '失いかけた声を上げて', 124, 207, { x: 247, y: 240, size: 0.25, stagger: 27 });

marker(207, 'I’m a mess · hard cuts');
text('hard-upper-a', "I'm a", 207, 255, {
  x: -248,
  y: 52,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
  enter: 'glitch',
});
text('hard-upper-mess', 'mess.', 217, 255, {
  x: -92,
  y: 130,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
  enter: 'glitch',
});
text('hard-lower-a', "I'm a", 233, 255, {
  x: 198,
  y: 313,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
  enter: 'glitch',
});
text('hard-lower-mess', 'mess.', 241, 255, {
  x: 278,
  y: 394,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
  enter: 'glitch',
});

marker(255, '振り返れない', '#ffffff');
text('furikaerenai', '振り返れない', 255, 293, { x: -237, y: 240, size: 0.48, stagger: 20 });
text('furikaerenai-top', 'F U R I K A E R E N A I', 255, 293, {
  x: -237,
  y: 211,
  size: 0.25,
  scale: 0.5,
  layer: 'labels',
});
text('furikaerenai-bottom', 'F U R I K A E R E N A I', 255, 293, {
  x: -237,
  y: 268,
  size: 0.25,
  scale: 0.5,
  layer: 'labels',
});

marker(293, '僕の心は', '#ffffff');
text('heart', '僕の心は', 293, 345, { size: 0.65, enter: 'focus' });
text('heart-echo', '僕の心は', 293, 345, {
  y: 30,
  size: 1.55,
  layer: 'echo',
  color: '#242424',
  enter: null,
});
for (const [side, x] of [
  ['left', -208],
  ['right', 208],
]) {
  shape(`bracket-${side}-stem`, 293, 345, x, 240, 3, 122, '#ffffff');
  shape(`bracket-${side}-top`, 293, 345, x + (x < 0 ? 7 : -7), 179, 16, 3, '#ffffff');
  shape(`bracket-${side}-bottom`, 293, 345, x + (x < 0 ? 7 : -7), 301, 16, 3, '#ffffff');
}
marker(345, 'Instrumental / transition', '#a3a3a3');

marker(416, 'I’m a mess · refrain');
const refrain = text('refrain-large', "I'm a mess", 416, 464, {
  y: 245,
  size: 1.65,
  face: 'bold',
  italic: true,
  angle: -12,
  rough: true,
  enter: 'glitch',
  stagger: 20,
});
const def = score.effects[`${refrain.id}-pose`];
def.keyframes.sx = def.keyframes.sy = [
  { time: 0, value: 1.08, ease: 'out' },
  { time: 250, value: 1 },
  { time: refrain.duration - 167, value: 1 },
  { time: refrain.duration, value: 0.95 },
];
text('refrain-credit', 'M Y   F I R S T   S T O R Y', 416, 464, {
  y: 310,
  size: 0.25,
  scale: 0.35,
  angle: -12,
  layer: 'labels',
});
marker(464, 'Refrain · pull back');
text('refrain-small', "I'm a mess", 464, 597, {
  y: 245,
  size: 0.86,
  face: 'bold',
  italic: true,
  angle: -12,
  rough: true,
  enter: null,
});
const small = score.effects['refrain-small-pose'];
small.keyframes.sx = small.keyframes.sy = [
  { time: 0, value: 1.08, ease: 'smooth' },
  { time: 800, value: 1 },
  { time: 5200, value: 1 },
  { time: 5542, value: 1.06 },
];
small.keyframes.opacity = [
  { time: 0, value: 1 },
  { time: 5292, value: 1 },
  { time: 5542, value: 0 },
];
small.keyframes.blur = [
  { time: 0, value: 0 },
  { time: 5292, value: 0 },
  { time: 5542, value: 12 },
];
marker(597, 'Credits / lyric silence', '#a3a3a3');

E.validate(score);
await writeFile(
  new URL('../public/examples/akubi-mess.json', import.meta.url),
  JSON.stringify(score, null, 2) + '\n',
);
console.log(
  `Created ${score.scenes.length} editable clips, ${score.duration}ms, transparent background.`,
);
