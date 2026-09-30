/* Built-in effect pack: replaceable application code, independent of score and renderer. */
(function (G) {
  'use strict';
  const E = G.Lilt3,
    TAU = Math.PI * 2,
    C = E.clamp,
    ease = E.easing;
  function motion(id, c, phase) {
    const { i, n, p, t, r } = c,
      e = c.easingOverride ? p : ease.out(p),
      q = 1 - e,
      a = r(1) * TAU,
      rad = 120 + r(2) * 180;
    let s = {
      x: 0,
      y: 0,
      rotation: 0,
      sx: 1,
      sy: 1,
      opacity: phase === 'in' ? C(p * 3) : 1 - p,
      blur: 0,
      reveal: 1,
    };
    if (phase === 'in')
      switch (id) {
        case 'drift':
          s.x = -100 * q;
          s.y = Math.sin(i) * 20 * q;
          s.blur = 7 * q;
          break;
        case 'rise':
          s.y = 110 * q;
          s.rotation = -0.12 * q;
          break;
        case 'scatter':
          s.x = Math.cos(a) * rad * q;
          s.y = Math.sin(a) * rad * q;
          s.rotation = (r(3) - 0.5) * 5 * q;
          s.sx = s.sy = 1 + 0.6 * q;
          break;
        case 'orbit':
          s.x = Math.cos(a + q * TAU) * rad * q;
          s.y = Math.sin(a + q * TAU) * rad * q;
          s.rotation = q * TAU;
          break;
        case 'bloom':
          s.sx = s.sy = Math.max(0.02, ease.back(p));
          s.rotation = (r(3) - 0.5) * q;
          break;
        case 'slam':
          s.sx = s.sy = 1 + 3 * q;
          s.blur = 5 * q;
          s.y = -25 * q;
          break;
        case 'rain':
          s.y = -210 * q;
          s.x = 30 * q;
          s.rotation = -0.5 * q;
          break;
        case 'ribbon':
          s.x = (i - (n - 1) / 2) * 15 * q;
          s.y = Math.sin(i * 0.8 + p * 5) * 100 * q;
          s.rotation = Math.cos(i * 0.8) * q;
          break;
        case 'flip':
          s.sx = Math.cos(q * Math.PI * 1.5);
          s.y = 30 * q;
          s.rotation = 0.3 * q;
          break;
        case 'type':
          s.opacity = p > 0 ? 1 : 0;
          s.reveal = C(p * 2);
          break;
        case 'glitch': {
          const k = Math.floor(t * 18);
          s.x = (r(k + 20) - 0.5) * 100 * q;
          s.y = (r(k + 200) - 0.5) * 35 * q;
          s.opacity = p < 0.8 ? (r(k + 100) > 0.3 ? 1 : 0.15) : 1;
          break;
        }
        case 'spiral':
          s.x = Math.sin(q * 12 + i) * 160 * q;
          s.y = Math.cos(q * 12 + i) * 160 * q;
          s.sx = s.sy = 1 - q * 0.8;
          break;
        case 'elastic':
          s.y = -Math.cos(p * 13) * 100 * (1 - p) ** 2;
          s.sx = 1 + 0.3 * Math.sin(p * 12) * q;
          s.sy = 1 - 0.2 * Math.sin(p * 12) * q;
          break;
        case 'focus':
          s.blur = 18 * q;
          s.sx = s.sy = 1 + 0.5 * q;
          break;
        case 'fan':
          s.rotation = (i / (n || 1) - 0.5) * Math.PI * q;
          s.y = 70 * q;
          s.x = (i - n / 2) * 9 * q;
          break;
        case 'hinge':
          s.sy = Math.max(0.03, e);
          s.rotation = -1.3 * q;
          s.y = -40 * q;
          break;
      }
    else {
      const z = c.easingOverride ? p : p * p;
      switch (id) {
        case 'ebb':
          s.x = -160 * z;
          s.y = Math.sin(i) * 30 * z;
          s.blur = 6 * z;
          break;
        case 'sink':
          s.y = (130 + r(5) * 100) * z;
          s.rotation = (r(4) - 0.5) * z;
          s.sx = s.sy = 1 - z * 0.5;
          break;
        case 'burst':
          s.x = Math.cos(a) * rad * z;
          s.y = Math.sin(a) * rad * z;
          s.rotation = (r(3) - 0.5) * 4 * z;
          break;
        case 'evaporate':
          s.y = -130 * z;
          s.blur = 14 * z;
          s.sx = s.sy = 1 + z * 0.8;
          break;
        case 'melt':
          s.y = 80 * z;
          s.sy = 1 + z * 2.4;
          s.sx = 1 - z * 0.5;
          break;
        case 'shatter':
          s.x = (r(2) - 0.5) * 400 * z;
          s.y = (r(4) - 0.35) * 320 * z;
          s.rotation = (r(3) - 0.5) * 8 * z;
          s.sx = s.sy = 1 - z * 0.9;
          break;
        case 'fold':
          s.sx = 1 - z;
          s.sy = 1 + z * 0.25;
          s.rotation = z * 0.8;
          break;
        case 'spiral':
          s.x = Math.cos(a + z * 8) * rad * z;
          s.y = Math.sin(a + z * 8) * rad * z;
          s.rotation = z * 4;
          break;
        case 'sweep':
          s.x = 250 * z;
          s.sx = 1 + z;
          s.blur = 4 * z;
          break;
        case 'fall':
          s.y = 250 * z;
          s.rotation = (r(4) - 0.5) * 3 * z;
          break;
        case 'glitch':
          s.x = (r(Math.floor(t * 20) + 300) - 0.5) * 180 * z;
          s.sx = 1 + z * 2;
          s.opacity = (1 - p) * (r(Math.floor(t * 20) + 900) > 0.25 ? 1 : 0.1);
          break;
        case 'erase':
          s.reveal = 1 - p;
          s.opacity = 1;
          break;
      }
    }
    return s;
  }

  const effects = {};
  for (const [phase, names] of Object.entries({
    enter: [
      'drift',
      'rise',
      'scatter',
      'orbit',
      'bloom',
      'slam',
      'rain',
      'ribbon',
      'flip',
      'type',
      'glitch',
      'spiral',
      'elastic',
      'focus',
      'fan',
      'hinge',
    ],
    exit: [
      'ebb',
      'sink',
      'burst',
      'evaporate',
      'melt',
      'shatter',
      'fold',
      'spiral',
      'sweep',
      'fall',
      'glitch',
      'erase',
    ],
  }))
    for (const name of names) {
      effects[phase + '-' + name] = {
        kind: 'motion',
        phase,
        duration: phase === 'enter' ? 1100 : 1250,
        defaults: { amount: 1 },
        controls: { amount: { label: 'Distance / motion', min: 0, max: 3, step: 0.05 } },
        sample(c) {
          const v = motion(name, c, phase === 'enter' ? 'in' : 'out');
          v.x *= c.params.amount;
          v.y *= c.params.amount;
          v.rotation *= c.params.amount;
          return v;
        },
      };
    }
  effects.fade = {
    kind: 'motion',
    phase: 'enter',
    duration: 700,
    ease: 'out',
    tracks: { opacity: [0, 1] },
  };
  for (const name of ['still', 'float', 'wave', 'breathe', 'tremble', 'pendulum'])
    effects['hold-' + name] = {
      kind: 'motion',
      phase: 'loop',
      duration: 1000,
      defaults: { amplitude: 1, speed: 1 },
      controls: {
        amplitude: { min: 0, max: 4, step: 0.1 },
        speed: { min: 0.1, max: 5, step: 0.1 },
      },
      sample({ time, i, params: p }) {
        const t = time * p.speed;
        if (name === 'wave') return { y: Math.sin(t * 2 + i * 0.55) * 9 * p.amplitude };
        if (name === 'float') return { y: Math.sin(t * 1.6 + i) * 7 * p.amplitude };
        if (name === 'breathe')
          return {
            sx: 1 + Math.sin(t * 2.5 + i * 0.1) * 0.045 * p.amplitude,
            sy: 1 + Math.sin(t * 2.5 + i * 0.1) * 0.045 * p.amplitude,
          };
        if (name === 'tremble')
          return {
            x: Math.sin(t * 39 + i) * 2 * p.amplitude,
            y: Math.sin(t * 33 + i) * 2 * p.amplitude,
          };
        if (name === 'pendulum') return { rotation: Math.sin(t * 1.7 + i) * 0.09 * p.amplitude };
        return {};
      },
    };
  let noise;
  function noiseTile() {
    if (noise) return noise;
    noise = document.createElement('canvas');
    noise.width = noise.height = 96;
    const g = noise.getContext('2d'),
      im = g.createImageData(96, 96);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = E.random(7281, i) * 255;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return noise;
  }
  for (const id of [
    'plain',
    'grain',
    'foil',
    'liquid',
    'hatch',
    'halftone',
    'chrome',
    'ember',
    'scan',
    'glass',
  ])
    effects[id] = {
      kind: 'material',
      fps: ['plain', 'hatch', 'halftone'].includes(id) ? 0 : 15,
      defaults: { amount: 1 },
      controls: { amount: { label: 'Strength', min: 0, max: 2, step: 0.05 } },
      paint({ ctx: c, width: w, height: h, time: t, index, rand, params }) {
        const g = { r: rand, i: index };
        c.globalAlpha = params.amount;
        if (id === 'grain' || id === 'glass') {
          const step = Math.floor(t * 12);
          c.save();
          c.globalAlpha = id === 'grain' ? 0.48 : 0.2;
          c.fillStyle = c.createPattern(noiseTile(), 'repeat');
          c.translate(-g.r(step + 70) * 96, -g.r(step + 700) * 96);
          c.fillRect(0, 0, w + 96, h + 96);
          c.restore();
        }
        if (id === 'foil' || id === 'chrome' || id === 'glass') {
          const x = (((t * 0.35 + g.r(3)) % 2) - 0.5) * w;
          let grad = c.createLinearGradient(x - w * 0.4, 0, x + w * 0.5, h);
          grad.addColorStop(0, id === 'chrome' ? '#253d48' : 'rgba(255,255,255,0)');
          grad.addColorStop(0.42, id === 'chrome' ? '#80a9b6' : 'rgba(255,255,255,.08)');
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(0.62, id === 'chrome' ? '#263e49' : 'rgba(255,255,255,.1)');
          grad.addColorStop(1, id === 'chrome' ? '#c6f0ee' : 'rgba(255,255,255,0)');
          c.fillStyle = grad;
          c.fillRect(0, 0, w, h);
        }
        if (id === 'liquid' || id === 'ember') {
          const gr = c.createLinearGradient(0, 0, w, h);
          if (id === 'liquid') {
            gr.addColorStop(0, '#e9fff6');
            gr.addColorStop(0.5, '#5ebfbd');
            gr.addColorStop(1, '#e6d9ff');
          } else {
            gr.addColorStop(0, '#fff4ce');
            gr.addColorStop(0.5, '#ffad78');
            gr.addColorStop(1, '#b84659');
          }
          c.fillStyle = gr;
          c.fillRect(0, 0, w, h);
          for (let j = 0; j < 4; j++) {
            c.strokeStyle = 'rgba(255,255,255,.36)';
            c.lineWidth = 3;
            c.beginPath();
            for (let x = 0; x <= w; x += 5) {
              const y = h * (j / 4) + Math.sin(x * 0.04 + t * 2 + j) * 12;
              x ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.stroke();
          }
        }
        if (id === 'scan' || id === 'hatch') {
          c.fillStyle = 'rgba(4,12,19,.62)';
          for (let y = -w; y < h + w; y += id === 'scan' ? 7 : 10) {
            c.save();
            if (id === 'hatch') c.rotate(-0.5);
            c.fillRect(-w, y + (id === 'scan' ? (t * 12) % 7 : 0), w * 3, 2);
            c.restore();
          }
        }
        if (id === 'halftone') {
          c.fillStyle = 'rgba(4,12,19,.7)';
          for (let y = 0; y < h; y += 9)
            for (let x = 0; x < w; x += 9) {
              c.beginPath();
              c.arc(x + (y % 18 ? 4 : 0), y, 1.7, 0, TAU);
              c.fill();
            }
        }
      },
      ...(['liquid', 'glass', 'ember'].includes(id)
        ? {
            displace: ({ y, time, index, params }) =>
              (Math.sin(y * 0.065 + time * 2.5 + index) + Math.sin(y * 0.028 - time * 1.5)) *
              (id === 'glass' ? 4 : 2.4) *
              params.amount,
          }
        : {}),
    };
  E.registerPack({ id: 'core', version: '3.0.0', effects });
})(globalThis);
