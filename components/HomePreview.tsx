'use client';
import { useEffect, useRef } from 'react';
import { loadEngine, normalize, type Score } from '../lib/lilt';
export default function HomePreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false,
      frame = 0;
    let destroy = () => {};
    (async () => {
      const E = await loadEngine();
      const source = await (await fetch('/examples/score.json')).json();
      if (disposed || !canvas.current) return;
      const score = normalize(E, source as Score);
      score.scenes = score.scenes.slice(0, 1);
      score.stage = { width: 900, height: 650, fps: 30 };
      score.scenes[0].start = 0;
      score.background = { hue: 230, backdrop: 'rings' };
      const renderer = new E.Renderer(canvas.current, score);
      destroy = () => renderer.destroy();
      await document.fonts.ready;
      if (disposed) return;
      renderer.invalidate();
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const start = performance.now();
      const tick = (now: number) => {
        renderer.draw(calm ? 2400 : (now - start) % score.scenes[0].duration);
        if (!calm) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    })().catch(() => {});
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      destroy();
    };
  }, []);
  return (
    <div className="hero-preview">
      <div className="preview-caption">
        <span>
          <i />
          COMPOSITION 01
        </span>
        <span>WAVES / 波</span>
      </div>
      <div className="home-canvas-wrap">
        <canvas ref={canvas} aria-label="Animated Japanese lyric preview" />
      </div>
      <div className="home-preview-footer">
        <span>13 movements. Infinite possibilities.</span>
        <span>LIVE RENDER ↗</span>
      </div>
      <div className="home-mini-timeline">
        <i />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <div />
      </div>
    </div>
  );
}
