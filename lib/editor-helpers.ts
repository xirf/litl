import type { Score } from './lilt';
export const STORAGE = 'lilt-studio-project-v1';
export const palette = ['#c4a2ff', '#6bcac1', '#efbc79', '#ea96bc', '#83b0ed', '#b0c977'];
export const keyProps = ['x', 'y', 'rotation', 'sx', 'sy', 'opacity', 'blur', 'reveal'];
export const neutral = (prop: string) => (['sx', 'sy', 'opacity', 'reveal'].includes(prop) ? 1 : 0);
export const clone = <T>(value: T): T => structuredClone(value);
export const pretty = (id: string) =>
  id
    .replace(/^core\//, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
export const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
export const clock = (ms: number, fps = 30) => {
  const sec = Math.max(0, ms) / 1000;
  return `${Math.floor(sec / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')}:${Math.floor((sec % 1) * fps)
    .toString()
    .padStart(2, '0')}`;
};
export type Modal = 'export' | 'code' | 'json' | 'help' | null;
export type History = { past: Score[]; future: Score[] };
