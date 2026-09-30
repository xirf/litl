/* Load after model.js and before applying example-score.json. */
Lilt3.registerPack({
  id: 'example', version: '1.0.0',
  effects: {
    converge: {
      kind: 'motion', phase: 'enter', duration: 1600, ease: 'out',
      defaults: { distance: 180, turns: 0.5 },
      controls: {
        distance: { min: 0, max: 400, step: 10 },
        turns: { min: 0, max: 2, step: 0.1 }
      },
      sample({ p, e, rand, params }) {
        const angle = rand('direction') * Math.PI * 2 + e * params.turns * Math.PI * 2;
        const radius = (1 - e) * params.distance;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
          rotation: (1 - e) * (rand('tilt') - 0.5), opacity: Math.min(1, p * 4) };
      }
    },
    grain: {
      kind: 'material', fps: 12,
      defaults: { density: 90 },
      controls: { density: { min: 0, max: 300, step: 10 } },
      paint({ ctx, width, height, time, rand, params }) {
        const frame = Math.floor(time * 12);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        for (let i = 0; i < params.density; i++) {
          ctx.fillRect(rand(frame + ':x:' + i) * width,
            rand(frame + ':y:' + i) * height, 2, 2);
        }
      }
    }
  }
});
