/* Authoring reconciliation: retain matched grapheme IDs and the existing unit tree. */
(function (G) {
  const E = G.Lilt3;
  E.editText = function (scene, text) {
    const old = E.flatten(scene).glyphs,
      next = E.chars(text);
    if (!next.length || next.length > 150) throw Error('Use 1–150 graphemes.');
    const n = old.length,
      m = next.length,
      dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] =
          old[i].ch === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const matched = new Map();
    let i = 0,
      j = 0;
    while (i < n && j < m) {
      if (old[i].ch === next[j]) {
        matched.set(j, old[i]);
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    const lookup = new Map();
    E.walk(scene.content, (node) => lookup.set(node.id, node));
    const taken = new Set([...lookup.keys(), ...old.map((g) => g.id)]);
    let serial = 0;
    const newId = () => {
      let id;
      do {
        id = scene.id + '-new' + ++serial;
      } while (taken.has(id));
      taken.add(id);
      return id;
    };
    const buckets = new Map();
    for (let k = 0; k < m; k++) {
      const g = matched.get(k);
      let near = g;
      for (let t = k + 1; !near && t < m; t++) near = matched.get(t);
      if (!near) for (let t = k - 1; !near && t >= 0; t--) near = matched.get(t);
      near = near || old[0];
      const origin = near.nodeId,
        list = buckets.get(origin) || [];
      list.push({ id: g?.id || newId(), text: next[k], matched: g });
      buckets.set(origin, list);
    }
    function rebuild(nodes) {
      return nodes.flatMap((node) => {
        if (node.children) {
          const children = rebuild(node.children);
          return children.length ? [{ ...node, children }] : [];
        }
        const bucket = buckets.get(node.id) || [];
        if (!bucket.length) return [];
        if (E.chars(node.text).length > 1) {
          const { text, ...meta } = node;
          return [{ ...meta, children: bucket.map((v) => ({ id: v.id, text: v.text })) }];
        }
        return bucket.map((v) =>
          v.matched?.id === node.id ? { ...node, text: v.text } : { id: v.id, text: v.text },
        );
      });
    }
    scene.content = rebuild(scene.content);
    const ids = new Set();
    E.walk(scene.content, (n) => ids.add(n.id));
    E.flatten(scene).glyphs.forEach((g) => ids.add(g.id));
    for (const list of [scene.styles || [], scene.animations || [], scene.materials || []])
      for (let k = list.length - 1; k >= 0; k--) {
        const sel = list[k].select;
        if (!sel) continue;
        if (sel.ids) {
          sel.ids = sel.ids.filter((id) => ids.has(id));
          if (!sel.ids.length) {
            list.splice(k, 1);
            continue;
          }
        }
        if (sel.exclude) sel.exclude = sel.exclude.filter((id) => ids.has(id));
      }
    if (scene.heroId && !ids.has(scene.heroId)) delete scene.heroId;
    return scene;
  };
})(globalThis);
