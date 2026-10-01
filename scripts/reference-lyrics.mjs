// Rebuild the editable lyric overlay for the user-supplied 27.79s cover excerpt.
// All times are relative to the uploaded cut, quantized to its 24fps frames.
import { readFile, writeFile } from 'node:fs/promises';
import '../public/lilt/model.js';
import '../public/lilt/core-pack.js';

const E = globalThis.Lilt3;
const frame = (n) => Math.round((n * 1000) / 24);
const audio = JSON.parse(
  await readFile(new URL('./reference-beats.json', import.meta.url), 'utf8'),
);
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
  pink: true,
});
text('pink-lower', "I'm a mess", 57, 81, {
  x: 180,
  y: 374,
  size: 1.03,
  italic: true,
  angle: -15,
  pink: true,
});
// Short vertical pink flashes from the opening title treatment.
shape('pink-flash-one', 48, 50, 0, 418, 3, 30, '#e85385');
shape('pink-flash-two', 70, 72, -373, 144, 4, 38, '#e85385');

marker(81, '明けない夜に', '#ffffff');
text('akenai', '明けない夜に', 81, 124, { size: 1.5 });
text('akenai-label', 'A K E N A I   Y O R U N I', 71, 79, {
  size: 0.25,
  scale: 0.5,
  y: 240,
  layer: 'labels',
});

marker(124, '失いかけた声を上げて', '#ffffff');
text('voice', '失いかけた声を上げて', 124, 207, { x: 247, y: 240, size: 0.25 });

marker(207, 'I’m a mess · hard cuts');
text('hard-upper-a', "I'm a", 207, 255, {
  x: -248,
  y: 52,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
});
text('hard-upper-mess', 'mess.', 217, 255, {
  x: -92,
  y: 130,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
});
text('hard-lower-a', "I'm a", 233, 255, {
  x: 198,
  y: 313,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
});
text('hard-lower-mess', 'mess.', 241, 255, {
  x: 278,
  y: 394,
  size: 1.65,
  face: 'bold',
  italic: true,
  rough: true,
});

marker(255, '振り返れない', '#ffffff');
text('furikaerenai', '振り返れない', 255, 293, { x: -237, y: 240, size: 0.48 });
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
text('heart', '僕の心は', 293, 345, { size: 0.65 });
text('heart-echo', '僕の心は', 293, 345, {
  y: 30,
  size: 1.55,
  layer: 'echo',
  color: '#242424',
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
text('refrain-large', "I'm a mess", 416, 464, {
  y: 245,
  size: 1.65,
  face: 'bold',
  italic: true,
  angle: -12,
  rough: true,
});
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
});
marker(597, 'Credits / lyric silence', '#a3a3a3');

// Musical beats were measured from the attached audio, not inferred from a uniform BPM grid.
// Vocal reveals are editorial timings checked against the reference cut; no speech model runs.
const snap = (ms) => frame(Math.round((ms * 24) / 1000));
const out = [0.16, 1, 0.3, 1];
const smooth = [0.4, 0, 0.2, 1];
const frames = (points) =>
  [
    ...new Map(
      points.map(([time, value, ease = smooth]) => [
        Math.round(time),
        { time: Math.round(time), value, ease },
      ]),
    ).values(),
  ].sort((a, b) => a.time - b.time);
function motion(clip, suffix, keyframes, { at = 0, duration = clip.duration, ids } = {}) {
  const id = `${clip.id}-${suffix}`;
  score.effects[id] = { kind: 'motion', keyframes };
  clip.animations.push({
    id,
    use: id,
    each: 'phrase',
    at,
    duration,
    ...(ids ? { select: { ids } } : {}),
  });
}
const vocalOffsets = {
  akenai: [0, 125, 250, 375, 625, 875],
  voice: [0, 125, 292, 458, 625, 917, 1167, 1458, 1667, 1917, 2208],
  furikaerenai: [0, 125, 292, 417, 667, 875],
  heart: [0, 167, 333, 583, 875],
};
for (const clip of score.scenes) {
  const pose = score.effects[`${clip.id}-pose`];
  const isShape = clip.type === 'shape';
  const label = clip.layer === 'labels';
  const echo = clip.layer === 'echo';
  const rough = clip.materials.length > 0;
  const d = clip.duration;
  if (isShape && !clip.id.startsWith('bracket')) continue;
  const unit = isShape ? 1 : 1.25;
  const x = pose.keyframes.x[0].value;
  const y = pose.keyframes.y[0].value;
  const rotation = pose.keyframes.rotation[0].value;
  const scale = pose.keyframes.sx[0].value;
  const drift = isShape ? 0 : label ? 2 : echo ? 14 : rough ? 6 : 9;
  // A continuous camera-like drift connects the accents instead of parking after entry.
  pose.keyframes.x = frames([
    [0, x - drift / unit],
    [d * 0.55, x + drift / unit],
    [d, x + (drift * 0.3) / unit],
  ]);
  pose.keyframes.y = frames([
    [0, y + (drift * 0.45) / unit],
    [d * 0.6, y - (drift * 0.35) / unit],
    [d, y - (drift * 0.7) / unit],
  ]);
  pose.keyframes.rotation = frames([
    [0, rotation - (rough ? 0.015 : 0.003)],
    [d, rotation + (rough ? 0.012 : 0.003)],
  ]);
  pose.keyframes.sx = pose.keyframes.sy = frames([
    [0, scale],
    [d, scale * (echo ? 1.12 : label ? 1.015 : 1.035)],
  ]);
  const strength = isShape ? 0.012 : label ? 0.009 : echo ? 0.018 : rough ? 0.045 : 0.025;
  const pulse = [
    [0, 1],
    [d, 1],
  ];
  audio.beatMs.forEach((time, index) => {
    const local = snap(time - clip.start);
    if (local < 167 || local > d - 292) return;
    pulse.push(
      [local - 83, 1, out],
      [local, 1 + strength * (index % 4 === 0 ? 1.2 : 1), smooth],
      [local + 250, 1],
    );
  });
  const envelope = frames(pulse);
  if (envelope.length > 2) motion(clip, 'audio-pulse', { sx: envelope, sy: envelope });
  if (isShape) {
    const openingX = x + (x < 0 ? 48 : -48);
    pose.keyframes.x = frames([
      [0, openingX, out],
      [250, x],
      [d - 167, x],
      [d, x + (x < 0 ? 12 : -12)],
    ]);
    motion(clip, 'bracket-reveal', {
      opacity: frames([
        [0, 0, 'linear'],
        [125, 1],
        [d - 167, 1],
        [d, 0, 'linear'],
      ]),
    });
    continue;
  }
  const glyphs = clip.content;
  let groups;
  if (vocalOffsets[clip.id]) {
    groups = glyphs.map((g, i) => ({ ids: [g.id], at: vocalOffsets[clip.id][i] ?? i * 125 }));
  } else if (clip.id.startsWith('pink') || clip.id.startsWith('refrain')) {
    const offsets = clip.id.startsWith('pink') ? [0, 125, 250] : [0, 125, 292];
    if (label) groups = [{ ids: glyphs.map((g) => g.id), at: 125 }];
    else
      groups = [
        [0, 3],
        [4, 5],
        [6, 10],
      ].map(([a, b], i) => ({ ids: glyphs.slice(a, b).map((g) => g.id), at: offsets[i] }));
  } else groups = [{ ids: glyphs.map((g) => g.id), at: 0 }];
  const arrival = rough ? 167 : 208;
  // The pull-back is one connected refrain, so its second clip starts fully visible.
  if (clip.id !== 'refrain-small')
    groups.forEach((group, i) => {
      motion(
        clip,
        `arrival-${i}`,
        {
          x: frames([
            [0, rough ? -24 : label ? 0 : -8, out],
            [arrival, 0],
          ]),
          y: frames([
            [0, label ? 3 : rough ? 0 : 10, out],
            [arrival, 0],
          ]),
          opacity: frames([
            [0, 0, 'linear'],
            [Math.min(arrival, 125), 1],
          ]),
          blur: frames([
            [0, rough ? 3 : 1.5, out],
            [arrival, 0],
          ]),
          sx: frames([
            [0, rough ? 1.08 : 0.97, out],
            [arrival, 1],
          ]),
          sy: frames([
            [0, rough ? 1.08 : 0.97, out],
            [arrival, 1],
          ]),
        },
        { at: snap(group.at), duration: arrival, ids: group.ids },
      );
    });
  const departure = clip.id === 'refrain-small' ? 333 : rough ? 125 : 167;
  const finish = d - departure;
  // Keep the large-to-small refrain cut connected; other sections leave just before the cut.
  if (clip.id !== 'refrain-large')
    motion(
      clip,
      'departure',
      {
        opacity: frames([
          [0, 1, 'linear'],
          [departure, 0],
        ]),
        x: frames([
          [0, 0, smooth],
          [departure, rough ? 12 : -8],
        ]),
        y: frames([
          [0, 0, smooth],
          [departure, -5],
        ]),
        blur: frames([
          [0, 0, smooth],
          [departure, clip.id === 'refrain-small' ? 8 : 2],
        ]),
      },
      { at: finish, duration: departure },
    );
  if (clip.id === 'refrain-large')
    pose.keyframes.sx = pose.keyframes.sy = frames([
      [0, 0.94, out],
      [250, 1],
      [d - 208, 1.015],
      [d, 0.86],
    ]);
  if (clip.id === 'refrain-small')
    pose.keyframes.sx = pose.keyframes.sy = frames([
      [0, 1.65, out],
      [333, 1.04],
      [d, 0.98],
    ]);
}

E.validate(score);
await writeFile(
  new URL('../public/examples/akubi-mess.json', import.meta.url),
  JSON.stringify(score, null, 2) + '\n',
);
console.log(
  `Created ${score.scenes.length} editable clips, ${score.duration}ms, transparent background.`,
);
