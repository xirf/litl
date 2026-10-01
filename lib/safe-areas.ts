import type { PreviewHit } from './lilt';

export type GuideArea = { id: string; x: number; y: number; width: number; height: number };
type Point = [number, number];

// Clip the renderer's rotated selection bounds to the layer and guide rectangles.
// Warnings are based on visible element bounds, rather than individual opaque pixels.
export function overlapsGuide(hit: PreviewHit, area: GuideArea): boolean {
  const c = Math.cos(hit.rotation),
    s = Math.sin(hit.rotation);
  let points: Point[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => [
    hit.x + ((x * hit.width) / 2) * c - ((y * hit.height) / 2) * s,
    hit.y + ((x * hit.width) / 2) * s + ((y * hit.height) / 2) * c,
  ]);
  const [x, y, w, h] = hit.clip;
  const left = Math.max(x, area.x),
    right = Math.min(x + w, area.x + area.width);
  const top = Math.max(y, area.y),
    bottom = Math.min(y + h, area.y + area.height);
  if (left > right || top > bottom || hit.width <= 0 || hit.height <= 0) return false;
  for (const [axis, edge, direction] of [
    [0, left, 1],
    [0, right, -1],
    [1, top, 1],
    [1, bottom, -1],
  ]) {
    const result: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      const insideA = (a[axis] - edge) * direction >= 0;
      const insideB = (b[axis] - edge) * direction >= 0;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = (edge - a[axis]) / (b[axis] - a[axis]);
        result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    points = result;
  }
  return points.length > 0;
}

export class OverlapTimer {
  private previousTime: number | undefined;
  private previousPlaying = false;
  private elapsed = new Map<string, number>();
  reset() {
    this.previousTime = undefined;
    this.previousPlaying = false;
    this.elapsed.clear();
  }
  update(keys: Set<string>, time: number, playing: boolean) {
    const delta = this.previousTime === undefined ? 0 : time - this.previousTime;
    // Backward playback/loop wraps and discontinuities start a fresh observation.
    if (delta < 0 || delta > 250) this.elapsed.clear();
    const advance = playing && this.previousPlaying && delta >= 0 && delta <= 250 ? delta : 0;
    const next = new Map<string, number>();
    for (const key of keys)
      next.set(key, this.elapsed.has(key) ? this.elapsed.get(key)! + advance : 0);
    this.elapsed = next;
    this.previousTime = time;
    this.previousPlaying = playing;
    return new Map(
      [...next].map(([key, duration]) => [key, duration > 1000 ? 'red' : 'yellow'] as const),
    );
  }
}
