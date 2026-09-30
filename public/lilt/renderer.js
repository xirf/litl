/* Canvas backend: layout and paint only; all effect behavior comes from packs. */
(function (G) {
  'use strict';
  const E = G.Lilt3,
    C = E.clamp,
    TAU = Math.PI * 2;
  const backgroundRandom = (s, i, k = 0) => E.random(s, i + '|' + k);
  const faces = {
    mincho: { family: '"Lilt Serif","Noto Serif JP","Yu Mincho",serif', weight: 500 },
    bold: { family: '"Lilt Serif","Noto Serif JP","Yu Mincho",serif', weight: 900 },
    sans: { family: '"Lilt Sans","Noto Sans JP","Yu Gothic",sans-serif', weight: 400 },
    black: { family: '"Lilt Sans","Noto Sans JP","Yu Gothic",sans-serif', weight: 900 },
    brush: { family: '"Lilt Brush","Yuji Syuku","Yu Mincho",serif', weight: 400 },
    display: { family: '"Lilt Display","Dela Gothic One",sans-serif', weight: 400 },
  };

  const surface = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    return c;
  };
  class Renderer {
    constructor(canvas, score, options = {}) {
      this.options = options;
      this.transparent = options.transparent ?? false;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.time = 0;
      this.quality = 1;
      this.calm = false;
      this.guides = false;
      this.selected = [];
      this.load(score);
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
      this.resize();
    }
    load(score) {
      E.validate(score);
      this.score = score;
      this.intensity = score.motion ?? 1;
      this.schedule = E.schedule(score);
      this.timeline = this.schedule.clips;
      this.duration = this.schedule.duration;
      this.invalidate();
    }
    invalidate() {
      this.cache = null;
      this.caches = new Map();
    }
    getCache(scene) {
      if (!this.caches.has(scene.index)) {
        const layer = this.schedule.layers.find((l) => l.id === scene.layer);
        this.caches.set(
          scene.index,
          this.compile(scene, this.w * layer.rect[2], this.h * layer.rect[3]),
        );
      }
      return this.caches.get(scene.index);
    }
    resize() {
      const b = this.canvas.getBoundingClientRect();
      this.w = this.options.width ?? this.score.stage?.width ?? b.width;
      this.h = this.options.height ?? this.score.stage?.height ?? b.height;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(b.width * this.dpr);
      this.canvas.height = Math.round(b.height * this.dpr);
      this.invalidate();
      this.draw(this.time);
    }
    compile(scene, viewW = this.w, viewH = this.h) {
      const plan = E.compileScene(this.score, scene),
        n = plan.glyphs.length;
      const glyphs = plan.glyphs.map((g, i) => {
        const o = {
          face: 'mincho',
          size: 1,
          color: '#eeeae1',
          dx: 0,
          dy: 0,
          rotation: 0,
          ...g.style,
        };
        if (scene.mixFonts && !g.explicitFace)
          o.face = ['mincho', 'sans', 'brush', 'display', 'bold'][Math.floor(g.random('font') * 5)];
        if (scene.vary) o.size *= 0.9 + g.random('size') * 0.2;
        if (/[、。？]/.test(g.ch)) o.size *= 0.65;
        const f = faces[o.face];
        if (!f) throw Error('Unknown font ' + o.face);
        const fs = 58 * o.size;
        this.ctx.font = `${f.weight} ${fs}px ${f.family}`;
        return {
          ...g,
          o,
          i,
          n,
          fs,
          advance: this.ctx.measureText(g.ch).width + 5,
          x: 0,
          y: 0,
          angle: (o.rotation * Math.PI) / 180,
          r: g.random,
          font: this.ctx.font,
        };
      });
      const total = glyphs.reduce((a, g) => a + g.advance, 0);
      let bounds = { w: total, h: 130 };
      const row = (gs, y, align = 0) => {
        const width = gs.reduce((a, g) => a + g.advance, 0);
        let x = -width / 2 + align;
        for (const g of gs) {
          g.x = x + g.advance / 2;
          g.y = y;
          x += g.advance;
        }
        return width;
      };
      let layout = scene.layout;
      if (layout === 'line' && total > viewW * 1.45) layout = 'stack';
      if (layout === 'line') row(glyphs, 0);
      else if (layout === 'stack') {
        const cut = scene.breakAt || Math.ceil(n / 2),
          a = glyphs.slice(0, cut),
          b = glyphs.slice(cut);
        bounds.w = Math.max(row(a, -58), row(b, 58));
        bounds.h = 260;
      } else if (layout === 'arc') {
        row(glyphs, 0);
        for (const g of glyphs) {
          const norm = g.x / (total / 2 || 1);
          g.y = norm * norm * 100 - 40;
          g.angle += norm * 0.28;
        }
        bounds.h = 290;
      } else if (layout === 'diagonal') {
        row(glyphs, 0);
        for (const g of glyphs) g.y = g.x * 0.22;
        bounds.h = total * 0.22 + 160;
      } else if (layout === 'vertical') {
        const count = Math.ceil(n / 2);
        glyphs.forEach((g, i) => {
          g.x = i < count ? 65 : -65;
          g.y = ((i % count) - (count - 1) / 2) * 66;
        });
        bounds.w = 270;
        bounds.h = count * 66 + 90;
      } else if (layout === 'hero') {
        const target = Math.max(
            0,
            glyphs.findIndex((g) => g.id === scene.heroId),
          ),
          hero = glyphs[target];
        hero.x = 0;
        hero.y = 0;
        bounds.w = Math.max(
          row(glyphs.slice(0, target), -128),
          row(glyphs.slice(target + 1), 128),
          hero.advance,
        );
        bounds.h = 430;
      } else if (layout === 'stair') {
        const size = Math.ceil(n / 3),
          widths = [];
        for (let j = 0; j < 3; j++)
          widths.push(row(glyphs.slice(j * size, (j + 1) * size), (j - 1) * 90, (j - 1) * 60));
        bounds.w = Math.max(...widths) + 120;
        bounds.h = 350;
      }
      const fit = Math.min(
        1.25,
        Math.max(8, viewW - 32) / Math.max(bounds.w, 1),
        Math.max(8, viewH - 90) / Math.max(bounds.h, 1),
      );
      for (const g of glyphs) {
        g.x += g.o.dx;
        g.y += g.o.dy;
        const b = Math.ceil(g.fs * 2.0 + 24),
          bm = surface(b * 1.5, b * 1.5),
          ctx = bm.getContext('2d');
        ctx.scale(1.5, 1.5);
        ctx.font = g.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = g.o.color;
        ctx.fillText(g.ch, b / 2, b / 2);
        g.bitmap = bm;
        g.b = b;
        g.work = surface(bm.width, bm.height);
        g.tex = g.work.getContext('2d');
      }
      return { glyphs, fit, scene: scene.index, layout, plan };
    }

    material(g, ms, plan) {
      const layers = [];
      for (const inst of plan.materials) {
        const group = inst.groups.find((gr) => gr.indices.includes(g.i));
        if (!group) continue;
        const start = inst.at ?? group.begin,
          end = inst.duration ? start + inst.duration : group.end;
        if (ms < start || ms > end) continue;
        const fps = inst.def.fps ?? 15,
          time = fps ? Math.floor(((ms - start) / 1000) * fps) / fps : 0;
        layers.push({ inst, group, time });
      }
      if (!layers.length) return { bitmap: g.bitmap, warp: null };
      const key = layers.map((l) => l.inst.id + ':' + l.time).join('|');
      if (g.materialKey !== key) {
        g.materialKey = key;
        const c = g.tex,
          w = g.work.width,
          h = g.work.height;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, w, h);
        c.drawImage(g.bitmap, 0, 0);
        for (const { inst, group, time } of layers) {
          if (!inst.def.paint) continue;
          c.save();
          c.globalCompositeOperation = 'source-atop';
          inst.def.paint({
            ctx: c,
            width: w,
            height: h,
            time,
            index: g.i,
            rand: group.rand,
            params: inst.params,
            unitId: g.id,
          });
          c.restore();
        }
        c.globalCompositeOperation = 'destination-in';
        c.drawImage(g.bitmap, 0, 0);
        c.globalCompositeOperation = 'source-over';
      }
      const warp =
        this.calm || !this.quality || !layers.some((l) => l.inst.def.displace)
          ? null
          : (y) =>
              layers.reduce(
                (sum, { inst, group, time }) =>
                  sum +
                  (inst.def.displace?.({
                    y,
                    time,
                    index: g.i,
                    rand: group.rand,
                    params: inst.params,
                  }) || 0),
                0,
              );
      return { bitmap: g.work, warp };
    }
    background(s, t) {
      const ctx = this.ctx,
        w = this.w,
        h = this.h,
        hue = s.hue ?? 190,
        paper = s.theme === 'paper';
      ctx.fillStyle = paper ? '#e9e3d5' : '#080d12';
      ctx.fillRect(0, 0, w, h);
      const gradient = ctx.createRadialGradient(w * 0.52, h * 0.46, 5, w * 0.5, h * 0.5, w * 0.65);
      gradient.addColorStop(0, paper ? 'rgba(202,187,154,.25)' : `hsla(${hue},50%,29%,.35)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      const tt = this.calm ? 0 : t;
      ctx.save();
      ctx.strokeStyle = paper ? 'rgba(69,67,51,.12)' : `hsla(${hue},55%,77%,.12)`;
      ctx.lineWidth = 1;
      if (s.backdrop === 'rings') {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.47, 70 + i * 37, 70 + i * 37, 0, 0, TAU);
          ctx.stroke();
        }
      } else if (s.backdrop === 'grid') {
        for (let x = 0; x < w; x += 38) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 38) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      } else if (s.backdrop === 'rays') {
        ctx.translate(w / 2, h / 2);
        ctx.rotate(tt * 0.016);
        for (let i = 0; i < 24; i++) {
          ctx.rotate(TAU / 24);
          ctx.beginPath();
          ctx.moveTo(100, 0);
          ctx.lineTo(Math.max(w, h), 0);
          ctx.stroke();
        }
      } else {
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          for (let x = 0; x <= w + 8; x += 8) {
            const y = h * 0.77 + j * 12 + Math.sin((x / w) * 9 + j * 0.6 + tt * 0.45) * 12;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      if (s.backdrop !== 'grid')
        for (let i = 0; i < 32; i++) {
          const x = backgroundRandom(87, i, 1) * w,
            y = (backgroundRandom(98, i, 2) * h - tt * (3 + backgroundRandom(2, i, 3) * 8)) % h;
          ctx.fillStyle = paper ? 'rgba(80,65,45,.15)' : `hsla(${hue},65%,80%,.18)`;
          ctx.beginPath();
          ctx.arc(x, (y + h) % h, 0.7 + backgroundRandom(5, i, 2) * 1.5, 0, TAU);
          ctx.fill();
        }
    }

    draw(ms) {
      this.time = C(ms, 0, this.duration);
      ms = this.time;
      const ctx = this.ctx,
        w = this.w,
        h = this.h;
      if (!w || !h) return;
      ctx.setTransform(this.canvas.width / w, 0, 0, this.canvas.height / h, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const live = E.activeClips(this.schedule, ms);
      this.activeScenes = live.map((s) => s.index);
      this.active =
        this.pinFocus && this.timeline[this.focus]
          ? this.focus
          : (live.find((s) => s.index === this.focus)?.index ?? live[0]?.index ?? this.focus ?? 0);
      this.focus = this.active;
      const focused = this.timeline[this.active] || this.timeline[0];
      this.cache = focused ? this.getCache(focused) : null;
      this.hits = [];
      this.statesByScene = new Map();
      this.lastStates = [];
      const backdrop = this.score.layers
        ? this.score.background || { hue: 190, backdrop: 'rings' }
        : live[0] || this.score.background || {};
      if (!this.transparent && !backdrop.transparent)
        this.background(
          backdrop,
          this.score.layers ? ms / 1000 : live.length ? (ms - live[0].start) / 1000 : 0,
        );
      for (const scene of live) {
        const layer = this.schedule.layers.find((l) => l.id === scene.layer),
          [rx, ry, rw, rh] = layer.rect,
          ox = w * rx,
          oy = h * ry,
          vw = w * rw,
          vh = h * rh,
          age = ms - scene.start;
        const { glyphs, plan, fit } = this.getCache(scene);
        const states = this.calm
          ? glyphs.map(() => ({ matrix: E.identity(), opacity: 1, blur: 0, reveal: 1 }))
          : E.evaluate(plan, age, glyphs, this.intensity);
        this.statesByScene.set(scene.index, states);
        if (scene.index === this.active) this.lastStates = states;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, vw, vh);
        ctx.clip();
        const camera = this.calm
          ? 1
          : 1 +
            (scene.camera || 0) *
              Math.sin(C(age / scene.duration) * Math.PI) *
              0.04 *
              this.intensity;
        for (const g of glyphs) {
          const state = states[g.i],
            m = state.matrix;
          if (state.opacity * (layer.opacity ?? 1) <= 0.002) continue;
          ctx.save();
          ctx.globalAlpha = C(state.opacity) * (layer.opacity ?? 1);
          ctx.translate(ox + vw / 2, oy + vh * 0.48);
          ctx.scale(fit * camera, fit * camera);
          ctx.transform(...m);
          ctx.translate(g.x, g.y);
          ctx.rotate(g.angle);
          if (state.blur > 0.3 && this.quality)
            ctx.filter = `blur(${Math.min(state.blur * fit, 14)}px)`;
          const { bitmap, warp } = this.material(
              g,
              this.calm ? Math.min(2400, scene.duration / 2) : age,
              plan,
            ),
            B = g.b;
          if (state.reveal < 1) {
            ctx.beginPath();
            ctx.rect(-B / 2, -B / 2, B * C(state.reveal), B);
            ctx.clip();
          }
          if (warp) {
            for (let y = 0; y < bitmap.height; y += 8) {
              const rh = Math.min(8, bitmap.height - y),
                dx = warp(y);
              if (!Number.isFinite(dx)) throw Error('Invalid material displacement');
              ctx.drawImage(
                bitmap,
                0,
                y,
                bitmap.width,
                rh,
                -B / 2 + dx,
                -B / 2 + (y / bitmap.height) * B,
                B,
                (rh / bitmap.height) * B + 0.2,
              );
            }
          } else ctx.drawImage(bitmap, -B / 2, -B / 2, B, B);
          ctx.filter = 'none';
          if (this.guides || (scene.index === this.active && this.selected.includes(g.i))) {
            ctx.strokeStyle =
              scene.index === this.active && this.selected.includes(g.i) ? '#e7b46f' : '#749aa1';
            ctx.lineWidth = 1 / fit;
            ctx.setLineDash([3 / fit, 3 / fit]);
            ctx.strokeRect(-g.advance / 2, -g.fs * 0.65, g.advance, g.fs * 1.3);
          }
          ctx.restore();
          this.hits.push({
            scene: scene.index,
            i: g.i,
            x: ox + vw / 2 + (m[0] * g.x + m[2] * g.y + m[4]) * fit * camera,
            y: oy + vh * 0.48 + (m[1] * g.x + m[3] * g.y + m[5]) * fit * camera,
            width: g.advance * fit * camera * Math.hypot(m[0], m[1]),
            height: g.fs * 1.3 * fit * camera * Math.hypot(m[2], m[3]),
            rotation: Math.atan2(m[1], m[0]) + g.angle,
            clip: [ox, oy, vw, vh],
          });
        }
        ctx.restore();
      }
      for (const index of this.caches.keys())
        if (index !== this.active && !this.activeScenes.includes(index)) this.caches.delete(index);
    }
    hit(x, y) {
      for (const h of this.hits.slice().reverse()) {
        if (
          x < h.clip[0] ||
          y < h.clip[1] ||
          x > h.clip[0] + h.clip[2] ||
          y > h.clip[1] + h.clip[3]
        )
          continue;
        const dx = x - h.x,
          dy = y - h.y,
          xx = dx * Math.cos(h.rotation) + dy * Math.sin(h.rotation),
          yy = -dx * Math.sin(h.rotation) + dy * Math.cos(h.rotation);
        if (Math.abs(xx) < h.width / 2 && Math.abs(yy) < h.height / 2) {
          this.hitScene = h.scene;
          return h.i;
        }
      }
      return null;
    }
    destroy() {
      this.observer.disconnect();
      this.invalidate();
    }
  }
  E.Renderer = Renderer;
  E.faces = faces;
  E.layouts = ['line', 'stack', 'arc', 'diagonal', 'vertical', 'hero', 'stair'];
})(globalThis);
