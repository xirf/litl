/* Lilt v3: data model, selectors, effect registry and timestamp evaluator. */
(function (G) {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    chars = (t) =>
      Array.from(
        new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(t),
        (s) => s.segment,
      );
  const hash = (text) => {
    let h = 2166136261;
    for (const ch of String(text)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const random = (seed, key) => {
    let h = hash(seed + '|' + key);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const easing = {
    linear: (t) => t,
    out: (t) => 1 - (1 - t) ** 3,
    in: (t) => t * t * t,
    smooth: (t) => t * t * (3 - 2 * t),
    back: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  };
  // CSS-style cubic Bézier timing solves x(t) before evaluating y(t).
  function cubic(a, b, c, d, t) {
    const q = 1 - t;
    return q * q * q * a + 3 * q * q * t * b + 3 * q * t * t * c + t * t * t * d;
  }
  function validateEase(value) {
    if (value == null) return;
    if (typeof value === 'string' && Object.hasOwn(easing, value)) return;
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      !value.every(Number.isFinite) ||
      value[0] < 0 ||
      value[0] > 1 ||
      value[2] < 0 ||
      value[2] > 1 ||
      Math.abs(value[1]) > 5 ||
      Math.abs(value[3]) > 5
    )
      throw Error('Ease needs a named preset or [x1,y1,x2,y2]; x must be 0–1 and y −5–5.');
  }
  function easeValue(value, p, fallback = 'linear') {
    p = clamp(p);
    if (!Array.isArray(value)) return (easing[value] || easing[fallback])(p);
    if (p === 0 || p === 1) return p;
    let lo = 0,
      hi = 1,
      t = p;
    for (let i = 0; i < 28; i++) {
      const x = cubic(0, value[0], value[2], 1, t);
      if (Math.abs(x - p) < 1e-8) break;
      if (x < p) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return cubic(0, value[1], value[3], 1, t);
  }
  function pathPoint(path, p) {
    const points = path.points,
      t = clamp(p),
      q = 1 - t;
    const x = cubic(points[0][0], points[1][0], points[2][0], points[3][0], t),
      y = cubic(points[0][1], points[1][1], points[2][1], points[3][1], t);
    let dx =
      3 * q * q * (points[1][0] - points[0][0]) +
      6 * q * t * (points[2][0] - points[1][0]) +
      3 * t * t * (points[3][0] - points[2][0]);
    let dy =
      3 * q * q * (points[1][1] - points[0][1]) +
      6 * q * t * (points[2][1] - points[1][1]) +
      3 * t * t * (points[3][1] - points[2][1]);
    if (Math.hypot(dx, dy) < 1e-8) {
      const a = t < 0.5 ? points[0] : points[2],
        b = t < 0.5 ? points[1] : points[3];
      dx = b[0] - a[0];
      dy = b[1] - a[1];
    }
    return { x, y, ...(path.orient ? { rotation: Math.atan2(dy, dx) } : {}) };
  }
  function validatePath(path) {
    if (!path) return;
    if (
      !Array.isArray(path.points) ||
      path.points.length !== 4 ||
      path.points.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          point.some((n) => !Number.isFinite(n) || Math.abs(n) > 10000),
      ) ||
      (path.orient != null && typeof path.orient !== 'boolean')
    )
      throw Error(
        'A cubic motion path needs four finite [x,y] points and optional orient:boolean.',
      );
  }
  const packs = new Map();

  function registerPack(pack) {
    if (!pack || !/^[-\w]+$/.test(pack.id) || typeof pack.version !== 'string' || !pack.effects)
      throw Error('Pack needs id, version and effects.');
    for (const [id, def] of Object.entries(pack.effects)) {
      if (!/^[-\w]+$/.test(id) || !['motion', 'material'].includes(def.kind))
        throw Error('Invalid template ' + id);
      if (
        def.kind === 'motion' &&
        typeof def.sample !== 'function' &&
        !def.tracks &&
        !def.keyframes &&
        !def.path
      )
        throw Error(id + ' needs sample() or tracks.');
      if (def.kind === 'motion') {
        validateKeyframes(def, id);
        validateEase(def.ease);
        validatePath(def.path);
      }
      if (
        def.kind === 'material' &&
        typeof def.paint !== 'function' &&
        typeof def.displace !== 'function'
      )
        throw Error(id + ' needs paint() or displace().');
    }
    packs.set(pack.id, pack);
  }
  function definition(score, id) {
    if (score.effects?.[id]) return score.effects[id];
    const [pack, name, ...extra] = String(id).split('/');
    if (extra.length || !packs.get(pack)?.effects[name])
      throw Error('Missing effect ' + id + '. Load its declared pack first.');
    return packs.get(pack).effects[name];
  }
  function listEffects(score) {
    return [
      ...Array.from(packs.values()).flatMap((p) =>
        Object.entries(p.effects).map(([id, def]) => ({ id: p.id + '/' + id, ...def })),
      ),
      ...Object.entries(score.effects || {}).map(([id, def]) => ({ id, ...def })),
    ];
  }
  function contentText(content = []) {
    return content.map((n) => (n.children ? contentText(n.children) : n.text)).join('');
  }
  function walk(nodes, fn) {
    for (const n of nodes) {
      fn(n);
      if (n.children) walk(n.children, fn);
    }
  }
  function flatten(scene) {
    if (scene.type === 'shape' || scene.type === 'image') {
      const id = scene.id + '-object';
      return {
        glyphs: [
          {
            id,
            ch: scene.type === 'shape' ? '◈' : '▧',
            i: 0,
            nodeId: id,
            localIndex: 0,
            ids: [id, scene.id],
            tags: [],
            word: id,
            phrase: scene.id,
            begin: 0,
            end: scene.duration,
            style: scene.style || {},
            kind: scene.type,
          },
        ],
        units: [{ id, type: scene.type, begin: 0, end: scene.duration }],
      };
    }
    const glyphs = [],
      units = [];
    function visit(
      nodes,
      path = [],
      style = {},
      word = null,
      phrase = scene.id,
      timing = { begin: 0, end: scene.duration },
      tags = [],
    ) {
      for (const n of nodes) {
        const ids = [...path, n.id],
          st = { ...style, ...n.style },
          time = { begin: n.begin ?? timing.begin, end: n.end ?? timing.end },
          ts = [...tags, ...(n.tags || [])];
        const w = n.type === 'word' ? n.id : word,
          ph = n.type === 'phrase' ? n.id : phrase;
        units.push({
          id: n.id,
          type: n.type || 'text',
          text: n.children ? contentText(n.children) : n.text,
          ...time,
        });
        if (n.children) visit(n.children, ids, st, w, ph, time, ts);
        else
          chars(n.text).forEach((ch, j) =>
            glyphs.push({
              ch,
              id: chars(n.text).length === 1 ? n.id : n.id + ':' + j,
              nodeId: n.id,
              localIndex: j,
              ids,
              tags: ts,
              word: w || n.id,
              phrase: ph,
              style: st,
              ...time,
            }),
          );
      }
    }
    visit(scene.content);
    glyphs.forEach((g, i) => (g.i = i));
    return { glyphs, units };
  }
  function select(scene, glyphs, selector) {
    if (!selector) return glyphs.map((g) => g.i);
    let matched = glyphs.filter(
      (g) =>
        (!selector.ids || selector.ids.some((id) => g.ids.includes(id) || g.id === id)) &&
        (!selector.tags || selector.tags.some((t) => g.tags.includes(t))) &&
        (!selector.exclude || !selector.exclude.some((id) => g.ids.includes(id) || g.id === id)),
    );
    const key = (g) =>
      selector.basedOn === 'word' ? g.word : selector.basedOn === 'phrase' ? g.phrase : g.id;
    const keys = [...new Set(matched.map(key))];
    if (selector.range) {
      const [a, b] = selector.range,
        lo = selector.units === 'percent' ? (a / 100) * keys.length : a,
        hi = selector.units === 'percent' ? (b / 100) * keys.length : b;
      matched = matched.filter((g) => {
        let i = keys.indexOf(key(g));
        return i >= lo && i < hi;
      });
    }
    if (selector.every)
      matched = matched.filter(
        (g) => keys.indexOf(key(g)) % selector.every === (selector.offset || 0),
      );
    return matched.map((g) => g.i);
  }
  function validateSelector(sel, ids) {
    if (!sel) return;
    if (typeof sel !== 'object') throw Error('Selector must be an object.');
    if (sel.ids && (!Array.isArray(sel.ids) || sel.ids.some((id) => !ids.has(id))))
      throw Error('Selector references a missing unit ID.');
    if (sel.exclude && (!Array.isArray(sel.exclude) || sel.exclude.some((id) => !ids.has(id))))
      throw Error('Excluded unit ID is missing.');
    if (sel.tags && (!Array.isArray(sel.tags) || sel.tags.some((t) => typeof t !== 'string')))
      throw Error('Invalid tags.');
    if (sel.basedOn && !['character', 'word', 'phrase'].includes(sel.basedOn))
      throw Error('Invalid selector basis.');
    if (sel.units && !['index', 'percent'].includes(sel.units)) throw Error('Invalid range units.');
    if (
      sel.range &&
      (!Array.isArray(sel.range) ||
        sel.range.length !== 2 ||
        !sel.range.every(Number.isFinite) ||
        sel.range[0] < 0 ||
        sel.range[1] <= sel.range[0])
    )
      throw Error('Invalid selector range.');
    if (sel.every != null && (!Number.isInteger(sel.every) || sel.every < 1))
      throw Error('Invalid selector stride.');
  }
  function checkStyle(s) {
    if (!s) return;
    for (const k of ['size', 'dx', 'dy', 'rotation'])
      if (s[k] != null && (!Number.isFinite(s[k]) || Math.abs(s[k]) > 1000))
        throw Error('Invalid style ' + k);
    if (s.size != null && (s.size < 0.25 || s.size > 4)) throw Error('Size must be .25–4.');
    if (s.color && !/^#[0-9a-f]{6}$/i.test(s.color)) throw Error('Color needs six-digit hex.');
  }
  // Absolute clip placement. Omitted starts retain legacy sequential placement.
  function schedule(score) {
    const layers = score.layers || [{ id: 'main', z: 0, rect: [0, 0, 1, 1] }];
    if (!Array.isArray(layers) || !layers.length || layers.length > 16)
      throw Error('Use 1–16 layers.');
    const ids = new Set();
    layers.forEach((l) => {
      if (typeof l.id !== 'string' || !l.id || ids.has(l.id))
        throw Error('Layer IDs must be unique.');
      ids.add(l.id);
      const r = l.rect || [0, 0, 1, 1];
      if (
        !Array.isArray(r) ||
        r.length !== 4 ||
        !r.every(Number.isFinite) ||
        r[0] < 0 ||
        r[1] < 0 ||
        r[2] <= 0 ||
        r[3] <= 0 ||
        r[0] + r[2] > 1.000001 ||
        r[1] + r[3] > 1.000001
      )
        throw Error('Layer rect is normalized [x,y,width,height] inside the stage.');
      if (l.z != null && !Number.isFinite(l.z)) throw Error('Invalid layer z order.');
      if (l.opacity != null && (!Number.isFinite(l.opacity) || l.opacity < 0 || l.opacity > 1))
        throw Error('Layer opacity must be 0–1.');
      if (l.visible != null && typeof l.visible !== 'boolean')
        throw Error('Layer visible must be boolean.');
    });
    let cursor = 0;
    const clips = score.scenes.map((scene, index) => {
      const start = scene.start ?? cursor,
        layer = scene.layer ?? layers[0].id;
      if (!Number.isFinite(start) || start < 0)
        throw Error('Clip start must be non-negative milliseconds.');
      if (!ids.has(layer)) throw Error('Unknown clip layer ' + layer);
      const end = start + scene.duration;
      cursor = end;
      return {
        ...scene,
        text:
          scene.type === 'shape' || scene.type === 'image'
            ? scene.name || scene.type
            : contentText(scene.content),
        index,
        start,
        end,
        dur: scene.duration,
        layer,
      };
    });
    const end = Math.max(0, ...clips.map((c) => c.end));
    const duration = score.duration ?? end;
    if (!Number.isFinite(duration) || duration < end || duration > 900000)
      throw Error('Timeline duration must include every clip and stay within 15 minutes.');
    return {
      clips,
      layers: layers.map((l, i) => ({ ...l, rect: l.rect || [0, 0, 1, 1], z: l.z ?? i })),
      duration,
    };
  }
  function activeClips(timeline, ms) {
    return timeline.clips
      .filter((c) => ms >= c.start && ms < c.end)
      .filter((c) => timeline.layers.find((l) => l.id === c.layer).visible !== false)
      .sort(
        (a, b) =>
          timeline.layers.find((l) => l.id === a.layer).z -
            timeline.layers.find((l) => l.id === b.layer).z || a.index - b.index,
      );
  }
  function keyframeValue(frames, ms) {
    if (ms <= frames[0].time) return frames[0].value;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1],
        b = frames[i];
      if (ms <= b.time) {
        const progress = clamp((ms - a.time) / (b.time - a.time));
        const e = easeValue(a.ease, progress);
        return a.value + (b.value - a.value) * e;
      }
    }
    return frames[frames.length - 1].value;
  }
  function validateKeyframes(def, id) {
    for (const [prop, frames] of Object.entries(def.keyframes || {})) {
      if (
        !['x', 'y', 'rotation', 'sx', 'sy', 'opacity', 'blur', 'reveal'].includes(prop) ||
        !Array.isArray(frames) ||
        !frames.length ||
        frames.length > 128
      )
        throw Error('Invalid keyframes ' + id + '.' + prop);
      let previous = -1;
      for (const f of frames) {
        if (
          !Number.isFinite(f.time) ||
          f.time < 0 ||
          f.time > 60000 ||
          f.time <= previous ||
          !Number.isFinite(f.value) ||
          Math.abs(f.value) > 10000
        )
          throw Error('Invalid keyframe ' + id + '.' + prop);
        try {
          validateEase(f.ease);
        } catch {
          throw Error('Invalid keyframe ease ' + id + '.' + prop);
        }
        previous = f.time;
      }
    }
  }
  function validate(score) {
    if (
      score?.v !== 3 ||
      !Number.isInteger(score.seed) ||
      !Array.isArray(score.scenes) ||
      !score.scenes.length ||
      score.scenes.length > 100
    )
      throw Error('Expected v:3, seed, and 1–100 scenes.');
    if (JSON.stringify(score).length > 8_000_000)
      throw Error('Project exceeds 8 MB including image assets.');
    const assets = Object.entries(score.assets || {});
    if (assets.length > 32) throw Error('Maximum 32 image assets.');
    for (const [id, asset] of assets) {
      if (
        !id ||
        !asset ||
        asset.type !== 'image' ||
        typeof asset.src !== 'string' ||
        asset.src.length > 2_000_000 ||
        !/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(asset.src)
      )
        throw Error(
          'Image assets need a PNG/JPEG/WebP data URL or an HTTP(S) URL, within 2 MB per asset.',
        );
    }
    if (
      score.motion != null &&
      (!Number.isFinite(score.motion) || score.motion < 0 || score.motion > 1.6)
    )
      throw Error('Invalid motion amount.');
    if (score.stage) {
      if (
        !Number.isFinite(score.stage.width) ||
        !Number.isFinite(score.stage.height) ||
        score.stage.width < 64 ||
        score.stage.height < 64 ||
        score.stage.width > 7680 ||
        score.stage.height > 4320
      )
        throw Error('Stage dimensions must be 64–7680 × 64–4320.');
      if (score.stage.fps != null && ![24, 25, 30, 50, 60].includes(score.stage.fps))
        throw Error('Use 24, 25, 30, 50 or 60 fps.');
    }
    if (score.background?.transparent != null && typeof score.background.transparent !== 'boolean')
      throw Error('Background transparent must be boolean.');
    const deps = score.packs || {};
    for (const [id, v] of Object.entries(deps))
      if (packs.get(id)?.version !== v)
        throw Error('Required pack ' + id + '@' + v + ' is unavailable.');
    for (const [id, def] of Object.entries(score.effects || {})) {
      if (def.kind !== 'motion' || (!def.tracks && !def.keyframes && !def.path) || def.sample)
        throw Error('JSON effects use kind:motion and tracks or keyframes.');
      for (const [prop, arr] of Object.entries(def.tracks || {})) {
        if (
          !['x', 'y', 'rotation', 'sx', 'sy', 'opacity', 'blur', 'reveal'].includes(prop) ||
          !Array.isArray(arr) ||
          arr.length < 2 ||
          arr.length > 32 ||
          arr.some((v) => !Number.isFinite(v) || Math.abs(v) > 10000)
        )
          throw Error('Invalid keyframe track ' + id + '.' + prop);
      }
      validateKeyframes(def, id);
      validateEase(def.ease);
      validatePath(def.path);
    }
    const allIds = new Set();
    let total = 0;
    for (const scene of score.scenes) {
      if (!scene.id || allIds.has(scene.id)) throw Error('Scene IDs must be unique.');
      allIds.add(scene.id);
      if (!Number.isFinite(scene.duration) || scene.duration < 1 || scene.duration > 60000)
        throw Error('Scene duration must be 1–60000 ms.');
      total += scene.duration;
      if (scene.type && !['text', 'shape', 'image'].includes(scene.type))
        throw Error('Unknown clip type.');
      const visual = scene.type === 'shape' || scene.type === 'image';
      if (visual) {
        const item = scene[scene.type];
        if (
          !item ||
          !Number.isFinite(item.width) ||
          !Number.isFinite(item.height) ||
          item.width < 1 ||
          item.height < 1 ||
          item.width > 4096 ||
          item.height > 4096
        )
          throw Error('Visual clip dimensions must be 1–4096 pixels.');
        if (scene.type === 'shape') {
          if (!['rectangle', 'ellipse', 'triangle', 'star', 'polygon', 'line'].includes(item.kind))
            throw Error('Unknown shape kind.');
          for (const key of ['fill', 'stroke'])
            if (item[key] != null && item[key] !== 'none' && !/^#[0-9a-f]{6}$/i.test(item[key]))
              throw Error('Shape colors need six-digit hex or none.');
          for (const key of ['strokeWidth', 'radius'])
            if (
              item[key] != null &&
              (!Number.isFinite(item[key]) || item[key] < 0 || item[key] > 500)
            )
              throw Error('Invalid shape ' + key);
          if (
            item.sides != null &&
            (!Number.isInteger(item.sides) || item.sides < 3 || item.sides > 32)
          )
            throw Error('Use 3–32 shape points.');
          if (
            item.innerRadius != null &&
            (!Number.isFinite(item.innerRadius) ||
              item.innerRadius < 0.05 ||
              item.innerRadius > 0.95)
          )
            throw Error('Star inner radius must be .05–.95.');
        } else {
          if (!score.assets?.[item.asset]) throw Error('Missing image asset.');
          if (item.fit && !['contain', 'cover', 'stretch'].includes(item.fit))
            throw Error('Unknown image fit.');
        }
      }
      if (
        !visual &&
        !['line', 'stack', 'arc', 'diagonal', 'vertical', 'hero', 'stair'].includes(scene.layout)
      )
        throw Error('Unknown layout ' + scene.layout);
      if (!visual && (!Array.isArray(scene.content) || !scene.content.length))
        throw Error('Scene needs content.');
      checkStyle(scene.style);
      let count = 0;
      const ids = new Set();
      function nodes(list, begin = 0, end = scene.duration, depth = 0) {
        if (depth > 6) throw Error('Content nesting exceeds six levels.');
        for (const n of list) {
          if (typeof n.id !== 'string' || !n.id.length || ids.has(n.id))
            throw Error('Unit IDs must be unique within a scene.');
          ids.add(n.id);
          checkStyle(n.style);
          const b = n.begin ?? begin,
            e = n.end ?? end;
          if (!Number.isFinite(b) || !Number.isFinite(e) || b < begin || e > end || e <= b)
            throw Error('Invalid vocal timing on ' + n.id);
          if (n.children) {
            if (!Array.isArray(n.children) || !n.children.length || n.text != null)
              throw Error('Use children OR text.');
            nodes(n.children, b, e, depth + 1);
          } else {
            if (typeof n.text !== 'string' || !n.text.length) throw Error('Empty text unit.');
            count += chars(n.text).length;
          }
        }
      }
      if (!visual) nodes(scene.content);
      if (count > 150) throw Error('Maximum 150 graphemes per scene.');
      const flat = flatten(scene);
      flat.glyphs.forEach((g) => {
        ids.add(g.id);
        g.ids.forEach((id) => ids.add(id));
      });
      for (const rule of scene.styles || []) {
        validateSelector(rule.select, ids);
        checkStyle(rule.style);
      }
      const instances = [...(scene.animations || []), ...(scene.materials || [])];
      if (instances.length > 250) throw Error('Too many effect instances.');
      const seen = new Set();
      for (const inst of instances) {
        if (!inst.id || seen.has(inst.id)) throw Error('Effect instance IDs must be unique.');
        seen.add(inst.id);
        validateEase(inst.ease);
        const def = definition(score, inst.use);
        const pack = inst.use.split('/')[0];
        if (inst.use.includes('/') && !deps[pack])
          throw Error('Declare pack ' + pack + ' in score.packs.');
        if (
          (scene.materials || []).includes(inst) ? def.kind !== 'material' : def.kind !== 'motion'
        )
          throw Error('Effect kind does not match its list.');
        validateSelector(inst.select, ids);
        if (inst.each && !['character', 'word', 'phrase'].includes(inst.each))
          throw Error('Invalid grouping.');
        if (inst.phase && !['enter', 'exit', 'loop'].includes(inst.phase))
          throw Error('Invalid phase.');
        if (inst.anchor && !['scene', 'unit'].includes(inst.anchor))
          throw Error('Invalid timing anchor.');
        if (inst.order && !['forward', 'reverse', 'center', 'random'].includes(inst.order))
          throw Error('Invalid order.');
        for (const k of ['duration', 'stagger', 'at'])
          if (inst[k] != null && (!Number.isFinite(inst[k]) || inst[k] < 0 || inst[k] > 60000))
            throw Error('Invalid ' + k);
        if (inst.duration === 0) throw Error('Duration must be positive.');
        if (inst.params && (typeof inst.params !== 'object' || Array.isArray(inst.params)))
          throw Error('Parameters must be an object.');
        for (const [key, control] of Object.entries(def.controls || {})) {
          const v = inst.params?.[key] ?? def.defaults?.[key];
          if (
            typeof v !== 'number' ||
            !Number.isFinite(v) ||
            v < (control.min ?? -Infinity) ||
            v > (control.max ?? Infinity)
          )
            throw Error('Parameter ' + key + ' is outside its bounds.');
        }
      }
    }
    const timeline = schedule(score);
    if (score.markers != null) {
      if (!Array.isArray(score.markers) || score.markers.length > 128)
        throw Error('Use at most 128 timeline markers.');
      const markerIds = new Set();
      for (const marker of score.markers) {
        if (
          !marker ||
          typeof marker.id !== 'string' ||
          !marker.id ||
          markerIds.has(marker.id) ||
          !Number.isFinite(marker.time) ||
          marker.time < 0 ||
          marker.time > timeline.duration ||
          typeof marker.name !== 'string' ||
          !marker.name.trim() ||
          marker.name.length > 80 ||
          !/^#[0-9a-f]{6}$/i.test(marker.color)
        )
          throw Error('Invalid timeline marker.');
        markerIds.add(marker.id);
      }
    }
    if (score.loopRegion) {
      const { start, end } = score.loopRegion;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start ||
        end > timeline.duration
      )
        throw Error('Loop region must have 0 ≤ start < end ≤ timeline duration (milliseconds).');
    }
    return score;
  }
  function compileScene(score, scene) {
    const flat = flatten(scene),
      glyphs = flat.glyphs;
    for (const g of glyphs) {
      g.explicitFace = !!g.style.face;
      g.style = { ...scene.style, ...g.style };
      for (const rule of scene.styles || [])
        if (select(scene, glyphs, rule.select).includes(g.i)) {
          Object.assign(g.style, rule.style);
          if (rule.style.face) g.explicitFace = true;
        }
      g.random = (k) => random(score.seed, scene.id + '|' + g.id + '|' + k);
    }
    function compile(inst) {
      const def = definition(score, inst.use),
        indices = select(scene, glyphs, inst.select),
        groupKey = (g) =>
          inst.each === 'word' ? g.word : inst.each === 'phrase' ? g.phrase : g.id,
        keys = [...new Set(indices.map((i) => groupKey(glyphs[i])))];
      const groups = keys.map((key, j) => ({
        key,
        indices: indices.filter((i) => groupKey(glyphs[i]) === key),
        index: j,
      }));
      let order = groups.slice();
      if (inst.order === 'reverse') order.reverse();
      if (inst.order === 'center')
        order.sort(
          (a, b) =>
            Math.abs(a.index - (groups.length - 1) / 2) -
            Math.abs(b.index - (groups.length - 1) / 2),
        );
      if (inst.order === 'random')
        order.sort(
          (a, b) =>
            random(score.seed, scene.id + '|' + inst.id + '|' + a.key) -
            random(score.seed, scene.id + '|' + inst.id + '|' + b.key),
        );
      groups.forEach((g) => {
        g.rank = order.indexOf(g);
        g.rand = (k) => random(score.seed, scene.id + '|' + inst.id + '|' + g.key + '|' + k);
        g.begin = inst.anchor === 'unit' ? Math.min(...g.indices.map((i) => glyphs[i].begin)) : 0;
        g.end =
          inst.anchor === 'unit'
            ? Math.max(...g.indices.map((i) => glyphs[i].end))
            : scene.duration;
      });
      return { ...inst, def, params: { ...def.defaults, ...inst.params }, groups };
    }
    return {
      scene,
      glyphs,
      units: flat.units,
      animations: (scene.animations || []).map(compile),
      materials: (scene.materials || []).map(compile),
    };
  }
  const ident = () => [1, 0, 0, 1, 0, 0];
  function mult(a, b) {
    return [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }
  function sample(inst, group, ms) {
    const def = inst.def,
      phase = inst.phase || def.phase || 'enter',
      duration = inst.duration ?? def.duration ?? 1000,
      stagger = inst.stagger || 0,
      span = stagger * (inst.groups.length - 1);
    const start = inst.at ?? (phase === 'exit' ? group.end - duration - span : group.begin),
      age = ms - start - group.rank * stagger;
    const progress = clamp(age / duration),
      override = inst.ease != null,
      p = override ? easeValue(inst.ease, progress) : progress,
      e = easeValue(inst.ease ?? def.ease, progress, 'out');
    if (phase === 'loop' && (age < 0 || ms > group.end)) return {};
    const ctx = {
      p,
      e,
      progress,
      easingOverride: override,
      phase,
      t: ms / 1000,
      time: age / 1000,
      i: group.index,
      n: inst.groups.length,
      rand: group.rand,
      r: group.rand,
      params: inst.params,
      unitId: group.key,
    };
    let out = def.sample ? def.sample(ctx) : {};
    if (def.tracks) {
      out = { ...out };
      for (const [prop, values] of Object.entries(def.tracks || {})) {
        const pos = clamp(e) * (values.length - 1),
          i = Math.min(values.length - 2, Math.floor(pos));
        out[prop] = values[i] + (values[i + 1] - values[i]) * (pos - i);
      }
    }
    if (def.path)
      out = { ...out, ...pathPoint(def.path, easeValue(inst.ease ?? def.ease, progress)) };
    if (def.keyframes) {
      out = { ...out };
      for (const [prop, frames] of Object.entries(def.keyframes))
        out[prop] = keyframeValue(frames, Math.max(0, age));
    }
    for (const [key, v] of Object.entries(out))
      if (!Number.isFinite(v)) throw Error(inst.use + ' returned a non-finite ' + key);
    return out;
  }
  function evaluate(plan, ms, positions, intensity = 1) {
    const states = plan.glyphs.map(() => ({ matrix: ident(), opacity: 1, blur: 0, reveal: 1 }));
    for (const inst of plan.animations)
      for (const group of inst.groups) {
        const v = sample(inst, group, ms),
          piv = group.indices.reduce(
            (a, i) => ({
              x: a.x + positions[i].x / group.indices.length,
              y: a.y + positions[i].y / group.indices.length,
            }),
            { x: 0, y: 0 },
          );
        const x = (v.x || 0) * intensity,
          y = (v.y || 0) * intensity,
          angle = (v.rotation || 0) * intensity,
          sx = 1 + ((v.sx ?? 1) - 1) * intensity,
          sy = 1 + ((v.sy ?? 1) - 1) * intensity,
          cs = Math.cos(angle),
          sn = Math.sin(angle),
          m = [cs * sx, sn * sx, -sn * sy, cs * sy, 0, 0];
        m[4] = piv.x + x - m[0] * piv.x - m[2] * piv.y;
        m[5] = piv.y + y - m[1] * piv.x - m[3] * piv.y;
        for (const i of group.indices) {
          const s = states[i];
          s.matrix = mult(m, s.matrix);
          s.opacity *= v.opacity ?? 1;
          s.blur += (v.blur || 0) * intensity;
          s.reveal *= v.reveal ?? 1;
        }
      }
    return states;
  }
  G.Lilt3 = {
    schedule,
    activeClips,
    clamp,
    chars,
    hash,
    random,
    easing,
    easeValue,
    validateEase,
    pathPoint,
    packs,
    registerPack,
    definition,
    listEffects,
    contentText,
    walk,
    flatten,
    select,
    validate,
    compileScene,
    evaluate,
    sample,
    keyframeValue,
    identity: ident,
  };
})(globalThis);
