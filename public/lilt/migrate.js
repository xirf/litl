/* v2 -> v3 migration. The renderer does not use the v2 schema. */
(function (G) {
  const E = G.Lilt3;
  E.migrateV2 = function (old) {
    if (old.v === 3) return structuredClone(old);
    if (old.v !== 2) throw Error('Only v2 and v3 scores are supported.');
    const out = { v: 3, seed: old.seed, packs: { core: '3.0.0' }, effects: {}, scenes: [] };
    if (old.motion != null) out.motion = old.motion;
    for (const [id, d] of Object.entries(old.effects || {}))
      out.effects[id] = { kind: 'motion', duration: 1100, ease: d.ease, tracks: d.props };
    old.scenes.forEach((s, si) => {
      const id = 'scene-' + (si + 1),
        text = E.chars(s.text),
        nodes = text.map((ch, i) => ({ id: id + '-c' + i, text: ch }));
      const cuts = new Set([0, text.length]);
      for (const o of s.overrides || []) {
        cuts.add(o.r[0]);
        cuts.add(o.r[1]);
      }
      const sorted = [...cuts].sort((a, b) => a - b),
        words = [];
      for (let j = 0; j < sorted.length - 1; j++) {
        const a = sorted[j],
          b = sorted[j + 1];
        words.push({
          id: id + '-w' + j,
          type: 'word',
          begin: Math.round(s.dur * 0.2 + (a / text.length) * s.dur * 0.5),
          end: Math.round(s.dur * 0.2 + (b / text.length) * s.dur * 0.5),
          children: nodes.slice(a, b),
        });
      }
      const scene = {
        id,
        name: s.name,
        duration: s.dur,
        content: [{ id: id + '-phrase', type: 'phrase', children: words }],
        layout: s.layout,
        style: { face: s.face || 'mincho', color: s.color || '#eeeae1' },
        animations: [],
        materials: [],
        hue: s.hue,
        backdrop: s.backdrop,
        camera: s.camera,
        vary: s.vary,
        mixFonts: s.mixFonts,
      };
      if (s.hero != null) scene.heroId = nodes[s.hero].id;
      const states = text.map(() => ({
        enter: s.enter,
        exit: s.exit,
        hold: s.hold || 'still',
        material: s.material || 'plain',
      }));
      for (const o of s.overrides || [])
        for (let i = o.r[0]; i < o.r[1]; i++) {
          const { r, enter, exit, hold, material, ...style } = o;
          if (Object.keys(style).length) nodes[i].style = { ...nodes[i].style, ...style };
          for (const k of ['enter', 'exit', 'hold', 'material']) if (o[k]) states[i][k] = o[k];
        }
      for (const slot of ['enter', 'exit', 'hold', 'material']) {
        const names = [...new Set(states.map((o) => o[slot]))];
        for (const name of names) {
          const indices = states.map((o, i) => (o[slot] === name ? i : -1)).filter((i) => i >= 0),
            inst = {
              id: slot + '-' + name,
              use: old.effects?.[name]
                ? name
                : 'core/' +
                  (slot === 'material' ? '' : slot === 'hold' ? 'hold-' : slot + '-') +
                  name,
            };
          if (indices.length !== nodes.length)
            inst.select = { ids: indices.map((i) => nodes[i].id) };
          if (slot === 'material') scene.materials.push(inst);
          else {
            inst.phase = slot === 'hold' ? 'loop' : slot;
            inst.each = 'character';
            if (slot === 'enter') {
              inst.stagger = 35;
              inst.order = s.order || 'forward';
            }
            scene.animations.push(inst);
          }
        }
      }
      out.scenes.push(scene);
    });
    return out;
  };
})(globalThis);
