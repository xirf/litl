'use client';
import { Input } from './ui';
import { ui } from '../lib/ui';
import { useEffect, useState } from 'react';
import type { MotionPath } from '../lib/lilt';
export default function MotionPathEditor({
  path,
  onChange,
}: {
  path: MotionPath;
  onChange: (path: MotionPath) => void;
}) {
  const [draft, setDraft] = useState(path),
    [frozen, setFrozen] = useState<number[] | null>(null);
  useEffect(() => setDraft(path), [JSON.stringify(path)]);
  const xs = draft.points.map((p) => p[0]),
    ys = draft.points.map((p) => p[1]);
  const bounds = frozen || [
    Math.min(...xs) - 70,
    Math.min(...ys) - 70,
    Math.max(140, Math.max(...xs) - Math.min(...xs) + 140),
    Math.max(140, Math.max(...ys) - Math.min(...ys) + 140),
  ];
  const drag = (event: React.PointerEvent<SVGCircleElement>, index: number) => {
    event.preventDefault();
    const target = event.currentTarget;
    setFrozen(bounds);
    let next = structuredClone(draft);
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const svg = target.ownerSVGElement!,
        matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      next.points[index] = [
        Math.round(Math.max(-10000, Math.min(10000, point.x))),
        Math.round(Math.max(-10000, Math.min(10000, point.y))),
      ];
      setDraft(structuredClone(next));
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setFrozen(null);
      onChange(next);
    };
    const cancel = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setFrozen(null);
      setDraft(path);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  const p = draft.points,
    stroke = Math.max(bounds[2], bounds[3]) / 180;
  const set = (i: number, j: number, n: number) => {
    const next = structuredClone(path);
    next.points[i][j] = n;
    onChange(next);
  };
  return (
    <div className={ui('motion-path-editor')}>
      <div className={ui('path-graph')}>
        <svg viewBox={bounds.join(' ')} aria-label="Cubic Bézier motion path">
          <path
            d={`M${p[0]} L${p[1]} M${p[2]} L${p[3]}`}
            fill="none"
            stroke="#775c8f"
            strokeWidth={stroke}
            strokeDasharray={`${stroke * 3} ${stroke * 3}`}
          />
          <path
            d={`M${p[0]} C${p[1]} ${p[2]} ${p[3]}`}
            fill="none"
            stroke="#74d7cb"
            strokeWidth={stroke * 1.5}
          />
          {p.map((point, i) => (
            <circle
              key={i}
              cx={point[0]}
              cy={point[1]}
              r={stroke * 4}
              fill={i === 0 || i === 3 ? '#74d7cb' : '#c4a2ff'}
              stroke="#201828"
              strokeWidth={stroke}
              onPointerDown={(e) => drag(e, i)}
              data-local-shortcuts
              tabIndex={0}
              role="button"
              aria-label={`Motion path point ${i + 1}`}
              onKeyDown={(e) => {
                if (e.key.startsWith('Arrow')) {
                  e.preventDefault();
                  e.stopPropagation();
                  const axis = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 0 : 1;
                  set(
                    i,
                    axis,
                    point[axis] + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -10 : 10),
                  );
                }
              }}
            />
          ))}
        </svg>
      </div>
      <div className={ui('path-values')}>
        {path.points.map((point, i) => (
          <div key={i}>
            <span>{['Start', 'Handle 1', 'Handle 2', 'End'][i]}</span>
            {point.map((n, j) => (
              <label key={j}>
                <small>{j ? 'Y' : 'X'}</small>
                <Input
                  type="number"
                  aria-label={`Path ${['start', 'handle 1', 'handle 2', 'end'][i]} ${j ? 'Y' : 'X'}`}
                  value={n}
                  step="10"
                  min="-10000"
                  max="10000"
                  onChange={(e) => {
                    if (e.target.value !== '') set(i, j, Number(e.target.value));
                  }}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
      <label className={ui('checkbox')}>
        <Input
          type="checkbox"
          checked={!!path.orient}
          onChange={(e) => onChange({ ...path, orient: e.target.checked })}
        />
        Rotate along the path
      </label>
      <p className={ui('hint')}>
        Offsets are in composition pixels. Start and end points set the route; purple handles shape
        the bend.
      </p>
    </div>
  );
}
