export type Style = {
  face?: string;
  color?: string;
  size?: number;
  dx?: number;
  dy?: number;
  rotation?: number;
};
export type Unit = {
  id: string;
  type?: string;
  text?: string;
  children?: Unit[];
  begin?: number;
  end?: number;
  style?: Style;
  tags?: string[];
};
export type Selector = {
  ids?: string[];
  tags?: string[];
  exclude?: string[];
  every?: number;
  offset?: number;
  range?: number[];
  basedOn?: string;
  units?: string;
};
export type Effect = {
  id: string;
  use: string;
  phase?: string;
  each?: string;
  anchor?: string;
  order?: string;
  duration?: number;
  stagger?: number;
  at?: number;
  select?: Selector;
  params?: Record<string, number>;
};
export type Keyframe = { time: number; value: number; ease?: string };
export type Definition = {
  kind: string;
  phase?: string;
  duration?: number;
  ease?: string;
  tracks?: Record<string, number[]>;
  keyframes?: Record<string, Keyframe[]>;
  defaults?: Record<string, number>;
  controls?: Record<string, { label?: string; min?: number; max?: number; step?: number }>;
  description?: string;
  id?: string;
};
export type Clip = {
  id: string;
  name?: string;
  start?: number;
  duration: number;
  layer?: string;
  content: Unit[];
  layout: string;
  style?: Style;
  styles?: { select?: Selector; style: Style }[];
  animations?: Effect[];
  materials?: Effect[];
  hue?: number;
  backdrop?: string;
  camera?: number;
  vary?: boolean;
  mixFonts?: boolean;
  heroId?: string;
};
export type Layer = {
  id: string;
  name?: string;
  z?: number;
  rect?: number[];
  visible?: boolean;
  opacity?: number;
};
export type Score = {
  v: number;
  seed: number;
  name?: string;
  packs?: Record<string, string>;
  scenes: Clip[];
  layers?: Layer[];
  duration?: number;
  motion?: number;
  stage?: { width: number; height: number; fps?: number };
  background?: { hue?: number; backdrop?: string; theme?: string; transparent?: boolean };
  effects?: Record<string, Definition>;
};
export type Glyph = { id: string; ch: string; i: number; word: string; style: Style; o: Style };
export type Scheduled = Clip & { index: number; start: number; end: number; layer: string };
export interface Renderer {
  load(score: Score): void;
  resize(): void;
  invalidate(): void;
  draw(time: number): void;
  destroy(): void;
  hit(x: number, y: number): number | null;
  hitScene: number;
  focus: number;
  pinFocus: boolean;
  selected: number[];
  guides: boolean;
  calm: boolean;
  transparent: boolean;
  w: number;
  h: number;
  duration: number;
  canvas: HTMLCanvasElement;
  cache: { glyphs: Glyph[]; plan: { glyphs: Glyph[] } };
  activeScenes: number[];
  timeline: Scheduled[];
}
export interface Engine {
  packs: Map<string, unknown>;
  random(seed: number, key: string): number;
  Renderer: new (
    canvas: HTMLCanvasElement,
    score: Score,
    options?: Record<string, unknown>,
  ) => Renderer;
  validate(score: Score): Score;
  migrateV2(score: Score): Score;
  schedule(score: Score): { clips: Scheduled[]; duration: number; layers: Layer[] };
  flatten(clip: Clip): { glyphs: Glyph[] };
  contentText(content: Unit[]): string;
  editText(clip: Clip, text: string): void;
  walk(content: Unit[], fn: (unit: Unit) => void): void;
  listEffects(score: Score): Definition[];
  definition(score: Score, id: string): Definition;
  registerPack(pack: unknown): void;
  keyframeValue(frames: Keyframe[], time: number): number;
  faces: Record<string, { family: string; weight: number }>;
  layouts: string[];
}
let promise: Promise<Engine> | undefined;
export function loadEngine(): Promise<Engine> {
  return (promise ??= (async () => {
    // Load classic scripts as public assets; Vite never transforms the runtime.
    for (const name of [
      'model.js',
      'core-pack.js',
      'migrate.js',
      'editing.js',
      'renderer.js',
      'player.js',
    ]) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `/lilt/${name}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Could not load ${name}`));
        document.head.appendChild(script);
      });
    }
    return (globalThis as unknown as { Lilt3: Engine }).Lilt3;
  })());
}
export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
export function normalize(engine: Engine, source: Score): Score {
  const score = engine.migrateV2(source);
  const timeline = engine.schedule(score);
  score.scenes.forEach((clip, i) => {
    clip.start = timeline.clips[i].start;
    clip.layer = timeline.clips[i].layer;
  });
  score.layers ??= [
    { id: 'main', name: 'Main composition', z: 0, rect: [0, 0, 1, 1], visible: true, opacity: 1 },
  ];
  score.background ??= { transparent: true };
  score.stage ??= { width: 1280, height: 720, fps: 30 };
  score.name ??= 'Untitled composition';
  engine.validate(score);
  return score;
}
export function download(content: BlobPart, name: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
