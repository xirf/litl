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
export type Easing = string | [number, number, number, number];
export type MotionPath = { points: [number, number][]; orient?: boolean };
export type Shape = {
  kind: string;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  sides?: number;
  innerRadius?: number;
};
export type ImageAsset = { type: 'image'; src: string; name?: string };
export type Effect = {
  ease?: Easing;
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
export type Keyframe = { time: number; value: number; ease?: Easing };
export type Definition = {
  path?: MotionPath;
  kind: string;
  phase?: string;
  duration?: number;
  ease?: Easing;
  tracks?: Record<string, number[]>;
  keyframes?: Record<string, Keyframe[]>;
  defaults?: Record<string, number>;
  controls?: Record<string, { label?: string; min?: number; max?: number; step?: number }>;
  description?: string;
  id?: string;
};
export type Clip = {
  type?: 'text' | 'shape' | 'image';
  shape?: Shape;
  image?: { asset: string; width: number; height: number; fit?: string };
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
  markers?: {id:string;time:number;name:string;color:string}[];
  loopRegion?: { start: number; end: number };
  assets?: Record<string, ImageAsset>;
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
  ready(): Promise<void>;
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
  easeValue(ease: Easing | undefined, progress: number): number;
  pathPoint(path: MotionPath, progress: number): { x: number; y: number; rotation?: number };
  faces: Record<string, { family: string; weight: number }>;
  layouts: string[];
}

export interface PlayerOptions {
  transparent?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  time?: number;
  rate?: number;
  width?: number;
  height?: number;
  audio?: HTMLAudioElement;
  channel?: string;
  onTime?: (ms: number) => void;
  onError?: (error: Error) => void;
}
export declare class Player {
  constructor(canvas: HTMLCanvasElement, score: Score, options?: PlayerOptions);
  renderer: Renderer;
  time: number;
  rate: number;
  loop: boolean;
  playing: boolean;
  load(score: Score): this;
  seek(ms: number): this;
  play(): Promise<void>;
  pause(): this;
  setRate(rate: number): this;
  setLoop(enabled: boolean): this;
  connect(channel?: string): this;
  connectSocket(url: string): this;
  command(message: unknown): void;
  destroy(): void;
}
export declare const Renderer: Engine['Renderer'];
export declare const validate: Engine['validate'];
export declare const schedule: Engine['schedule'];
export declare const editText: Engine['editText'];
export declare const migrateV2: Engine['migrateV2'];
export declare const registerPack: Engine['registerPack'];
export declare const keyframeValue: Engine['keyframeValue'];
export declare const easeValue: Engine['easeValue'];
export declare const pathPoint: Engine['pathPoint'];
export declare function compileScene(score: Score, clip: Clip): unknown;
export declare function evaluate(
  plan: unknown,
  ms: number,
  positions: { x: number; y: number }[],
  intensity?: number,
): unknown[];
export declare function activeClips(
  timeline: ReturnType<Engine['schedule']>,
  ms: number,
): Scheduled[];
declare const Lilt: Engine & { Player: typeof Player };
export default Lilt;
