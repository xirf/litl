'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useEditor } from './EditorContext';
import { overlapsGuide, OverlapTimer, type GuideArea } from '../../lib/safe-areas';

type Warning = { area: string; clip: string; color: 'yellow' | 'red' };
const colors = {
  neutral: 'border-cyan-300/70 bg-cyan-300/5 text-cyan-200',
  yellow: 'border-yellow-400 bg-yellow-400/10 text-yellow-200',
  red: 'border-red-400 bg-red-400/10 text-red-200',
};
const placement = (area: GuideArea) => ({
  left: `${area.x * 100}%`,
  top: `${area.y * 100}%`,
  width: `${area.width * 100}%`,
  height: `${area.height * 100}%`,
});
export default function SafeAreaOverlay({
  areas,
  drawing,
  visible,
  onAdd,
  onFinish,
}: {
  areas: GuideArea[];
  drawing: boolean;
  visible: boolean;
  onAdd: (area: GuideArea) => void;
  onFinish: () => void;
}) {
  const { renderer, engine, score, time, playing, seekVersion } = useEditor();
  const visibleGlyphs = useMemo(
    () =>
      score.scenes.map((scene) =>
        scene.type === 'shape' || scene.type === 'image'
          ? null
          : engine?.flatten(scene).glyphs.map((glyph) => !!glyph.ch.trim()),
      ),
    [score, engine],
  );
  const timer = useRef(new OverlapTimer());
  const epoch = useRef<unknown[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [draft, setDraft] = useState<GuideArea | null>(null);
  const origin = useRef<{ x: number; y: number; pointer: number } | null>(null);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nextEpoch = [score, areas, visible, seekVersion.current, renderer.current];
      if (nextEpoch.some((value, i) => value !== epoch.current[i])) timer.current.reset();
      epoch.current = nextEpoch;
      const r = renderer.current;
      const collisions: Omit<Warning, 'color'>[] = [];
      if (r && visible) {
        for (const area of areas) {
          const pixels = {
            ...area,
            x: area.x * r.w,
            y: area.y * r.h,
            width: area.width * r.w,
            height: area.height * r.h,
          };
          const clips = new Set<string>();
          for (const hit of r.hits || []) {
            const scene = score.scenes[hit.scene];
            if (
              scene &&
              scene.type !== 'shape' &&
              scene.type !== 'image' &&
              !visibleGlyphs[hit.scene]?.[hit.i]
            )
              continue;
            if (scene && overlapsGuide(hit, pixels)) clips.add(scene.id);
          }
          for (const clip of clips) collisions.push({ area: area.id, clip });
        }
      }
      const status = timer.current.update(
        new Set(collisions.map(({ area, clip }) => `${area}:${clip}`)),
        time,
        playing,
      );
      setWarnings(
        collisions.map((hit) => ({ ...hit, color: status.get(`${hit.area}:${hit.clip}`)! })),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [score, areas, visible, time, playing, renderer, seekVersion, visibleGlyphs]);
  useEffect(() => {
    if (!drawing) {
      origin.current = null;
      setDraft(null);
      return;
    }
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        origin.current = null;
        setDraft(null);
        onFinish();
      }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [drawing, onFinish]);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };
  const rectangle = (event: PointerEvent<HTMLDivElement>) => {
    const start = origin.current!,
      end = point(event);
    return {
      id: crypto.randomUUID(),
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  };
  return (
    <div
      aria-label="Safe-area drawing surface"
      className={`absolute inset-0 touch-none ${drawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onPointerDown={(event) => {
        if (!drawing || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        origin.current = { ...point(event), pointer: event.pointerId };
        setDraft(rectangle(event));
      }}
      onPointerMove={(event) => {
        if (origin.current?.pointer === event.pointerId) setDraft(rectangle(event));
      }}
      onPointerUp={(event) => {
        if (origin.current?.pointer !== event.pointerId) return;
        const area = rectangle(event);
        origin.current = null;
        setDraft(null);
        if (area.width >= 0.005 && area.height >= 0.005) onAdd(area);
        onFinish();
      }}
      onPointerCancel={() => {
        origin.current = null;
        setDraft(null);
        onFinish();
      }}
    >
      {visible &&
        areas.map((area, index) => {
          const hits = warnings.filter((warning) => warning.area === area.id);
          const color = hits.some((hit) => hit.color === 'red')
            ? 'red'
            : hits.length
              ? 'yellow'
              : 'neutral';
          const names = hits
            .map((hit) => score.scenes.find((scene) => scene.id === hit.clip)?.name || hit.clip)
            .join(', ');
          return (
            <div
              key={area.id}
              data-safe-area={area.id}
              data-status={color}
              aria-label={`Safe area ${index + 1}: ${color === 'neutral' ? 'clear' : `${color} overlap — ${names}`}`}
              className={`absolute border border-dashed ${colors[color]}`}
              style={placement(area)}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-zinc-950/80 px-1 text-[10px]">
                {index + 1}
                {color !== 'neutral' && ` · ${color === 'red' ? '>1s' : 'overlap'}`}
              </span>
            </div>
          );
        })}
      {draft && (
        <div
          className="absolute border border-dashed border-cyan-200 bg-cyan-300/10"
          style={placement(draft)}
        />
      )}
    </div>
  );
}
