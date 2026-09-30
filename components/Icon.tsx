import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
  play: 'm9 5 11 7-11 7V5Z',
  pause: 'M8 5v14M16 5v14',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',
  redo: 'm15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  save: 'M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  hidden:
    'm3 3 18 18M9 5a11 11 0 0 1 3 0c6 0 10 7 10 7s-1 2-4 4M6 6C3 9 2 12 2 12s4 7 10 7c2 0 4-1 5-2',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  music:
    'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm12-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM9 9l12-2',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  duplicate: 'M8 8h13v13H8V8ZM3 16V3h13',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  home: 'm3 10 9-7 9 7v11h-7v-8h-4v8H3V10Z',
  frame: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  diamond: 'm12 3 9 9-9 9-9-9 9-9Z',
  rewind: 'M5 5v14M19 5 8 12l11 7V5Z',
  loop: 'M4 7h12l-3-3m3 3-3 3M20 17H8l3 3m-3-3 3-3M4 7v6m16-6v10',
  film: 'M3 3h18v18H3V3ZM7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4',
  check: 'm4 12 5 5L20 6',
  folder: 'M3 6V3h6l3 3h9v15H3V6Z',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
};
export default function Icon({
  name,
  size = 16,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'play' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
