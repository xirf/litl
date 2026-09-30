'use client';
import { Input, Select } from './ui';
import { ui } from '../lib/ui';
import { useEffect, useState } from 'react';
import type { Easing } from '../lib/lilt';
const presets: Record<string, [number, number, number, number]> = {
  'Ease in': [0.42, 0, 1, 1],
  'Ease out': [0, 0, 0.58, 1],
  'Ease in/out': [0.42, 0, 0.58, 1],
  Soft: [0.25, 0.1, 0.25, 1],
  Overshoot: [0.2, 1.25, 0.45, 1],
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export default function BezierEditor({
  value,
  onChange,
  label = 'Interpolation',
  allowDefault = false,
}: {
  value: Easing | undefined;
  onChange: (value: Easing | undefined) => void;
  label?: string;
  allowDefault?: boolean;
}) {
  const curve = Array.isArray(value) ? value : presets['Ease in/out'];
  const [draft, setDraft] = useState(curve);
  useEffect(() => setDraft(curve), [JSON.stringify(curve)]);
  const point = (i: number) => ({ x: 25 + draft[i] * 190, y: 130 - draft[i + 1] * 90 });
  const p1 = point(0),
    p2 = point(2);
  const edit = (index: number, n: number) => {
    const next = [...draft] as typeof draft;
    next[index] = Math.round(clamp(n, index % 2 ? -5 : 0, index % 2 ? 5 : 1) * 1000) / 1000;
    setDraft(next);
    onChange(next);
  };
  const drag = (event: React.PointerEvent<SVGCircleElement>, index: number) => {
    event.preventDefault();
    const target = event.currentTarget,
      svg = target.ownerSVGElement!;
    let next = [...draft] as typeof draft;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const { x, y } = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      next[index] = Math.round(clamp((x - 25) / 190, 0, 1) * 1000) / 1000;
      next[index + 1] = Math.round(clamp((130 - y) / 90, -0.35, 1.4) * 1000) / 1000;
      setDraft([...next] as typeof draft);
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      onChange(next);
    };
    const cancel = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setDraft(curve);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  return (
    <div className={ui('bezier-editor')}>
      <label className={ui('field')}>
        <span>{label}</span>
        <Select
          aria-label={label}
          value={Array.isArray(value) ? 'bezier' : (value ?? (allowDefault ? 'default' : 'linear'))}
          onChange={(e) =>
            onChange(
              e.target.value === 'default'
                ? undefined
                : e.target.value === 'bezier'
                  ? [0.42, 0, 0.58, 1]
                  : e.target.value,
            )
          }
        >
          {allowDefault && <option value="default">Template default</option>}
          <option value="linear">Linear</option>
          <option value="smooth">Smooth in/out</option>
          <option value="in">Ease in</option>
          <option value="out">Ease out</option>
          <option value="back">Back / overshoot</option>
          <option value="bezier">Custom cubic Bézier</option>
        </Select>
      </label>
      {Array.isArray(value) && (
        <>
          <div className={ui('bezier-graph')}>
            <svg viewBox="0 0 240 170" aria-label="Cubic Bézier timing curve">
              <path
                d="M25 40h190M25 85h190M25 130h190M25 40v90M120 40v90M215 40v90"
                stroke="#3b3147"
                strokeWidth=".6"
              />
              <path d="M25 130 215 40" stroke="#675074" strokeDasharray="3 4" fill="none" />
              <path
                d={`M25 130 L${p1.x} ${p1.y} M215 40 L${p2.x} ${p2.y}`}
                stroke="#8a719e"
                fill="none"
              />
              <path
                d={`M25 130 C${p1.x} ${p1.y} ${p2.x} ${p2.y} 215 40`}
                stroke="#c4a2ff"
                strokeWidth="2.2"
                fill="none"
              />
              {[p1, p2].map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill={i ? '#74d7cb' : '#c4a2ff'}
                  stroke="#1e1729"
                  strokeWidth="2"
                  data-local-shortcuts
                  tabIndex={0}
                  role="button"
                  aria-label={i ? 'Second easing handle' : 'First easing handle'}
                  onPointerDown={(e) => drag(e, i * 2)}
                  onKeyDown={(e) => {
                    if (e.key.startsWith('Arrow')) {
                      e.preventDefault();
                      e.stopPropagation();
                      const axis = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 0 : 1,
                        step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.02 : 0.02;
                      edit(i * 2 + axis, draft[i * 2 + axis] + step);
                    }
                  }}
                />
              ))}
              <circle cx="25" cy="130" r="3" fill="#efe3ff" />
              <circle cx="215" cy="40" r="3" fill="#efe3ff" />
              <text x="25" y="157">
                TIME →
              </text>
              <text x="213" y="20" textAnchor="end">
                PROGRESS
              </text>
            </svg>
          </div>
          <label className={ui('field')}>
            <span>Curve preset</span>
            <Select
              aria-label="Bezier curve preset"
              value="custom"
              onChange={(e) => onChange(presets[e.target.value])}
            >
              <option value="custom">Choose a starting point…</option>
              {Object.keys(presets).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          </label>
          <div className={ui('bezier-values')}>
            {['X1', 'Y1', 'X2', 'Y2'].map((name, i) => (
              <label key={name}>
                <span>{name}</span>
                <Input
                  aria-label={`Bezier ${name}`}
                  type="number"
                  min={i % 2 ? -5 : 0}
                  max={i % 2 ? 5 : 1}
                  step=".01"
                  value={draft[i]}
                  onChange={(e) => {
                    if (e.target.value !== '') edit(i, Number(e.target.value));
                  }}
                />
              </label>
            ))}
          </div>
          <p className={ui('hint')}>
            Drag the handles or use arrow keys. Vertical overshoot is allowed; time always moves
            forward.
          </p>
        </>
      )}
    </div>
  );
}
