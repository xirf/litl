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
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 text-xs tracking-wider text-zinc-500">
        <span className="flex items-center gap-2">
          <i className="size-1.5 rounded-full bg-emerald-400" />
          COMPOSITION 01
        </span>
        <span>WAVES / 波</span>
      </div>
      <div className="aspect-video">
        <canvas
          ref={canvas}
          aria-label="Animated Japanese lyric preview"
          className="block h-full w-full"
        />
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
        <span>13 movements. Infinite possibilities.</span>
        <span>LIVE RENDER ↗</span>
      </div>
      <div className="flex gap-1 border-t border-zinc-800 p-4">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-7 flex-1 rounded bg-violet-400/20" />
        ))}
      </div>
    </div>
  );
}
