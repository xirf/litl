'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import BezierEditor from './BezierEditor';
import MotionPathEditor from './MotionPathEditor';
import { embedImage } from '../lib/images';
import {
  loadEngine,
  normalize,
  uid,
  download,
  type Score,
  type Engine,
  type Renderer,
  type Clip,
  type Effect,
  type Keyframe,
  type Definition,
  type Style,
} from '../lib/lilt';
import './studio.css';
const STORAGE = 'lilt-studio-project-v1';
const palette = ['#c4a2ff', '#6bcac1', '#efbc79', '#ea96bc', '#83b0ed', '#b0c977'];
const keyProps = ['x', 'y', 'rotation', 'sx', 'sy', 'opacity', 'blur', 'reveal'];
const neutral = (prop: string) => (['sx', 'sy', 'opacity', 'reveal'].includes(prop) ? 1 : 0);
const clone = <T,>(value: T): T => structuredClone(value);
const pretty = (id: string) =>
  id
    .replace(/^core\//, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (s) => s.toUpperCase());
const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
const clock = (ms: number, fps = 30) => {
  const sec = Math.max(0, ms) / 1000;
  return `${Math.floor(sec / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')}:${Math.floor((sec % 1) * fps)
    .toString()
    .padStart(2, '0')}`;
};
type Modal = 'export' | 'code' | 'json' | 'help' | null;
type History = { past: Score[]; future: Score[] };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className="number-wrap">
        <input
          type="number"
          aria-label={label}
          value={Number(value.toFixed(3))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            if (e.target.value !== '') onChange(Number(e.target.value));
          }}
        />
        <span>{suffix}</span>
      </div>
    </Field>
  );
}
function Button({
  icon,
  children,
  onClick,
  title,
  disabled,
  className = '',
}: {
  icon?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={title}
      aria-label={title || undefined}
      disabled={disabled}
    >
      {icon && <Icon name={icon} />} {children}
    </button>
  );
}
export default function Studio() {
  const [engine, setEngine] = useState<Engine | null>(null),
    [score, setScore] = useState<Score | null>(null),
    [current, setCurrent] = useState(''),
    [selected, setSelected] = useState<string[]>([]);
  const [time, setTime] = useState(2400),
    [playing, setPlaying] = useState(false),
    [rate, setRate] = useState(1),
    [loop, setLoop] = useState(false),
    [zoom, setZoom] = useState(1),
    [timelineWidth, setTimelineWidth] = useState(1168);
  const [leftTab, setLeftTab] = useState('effects'),
    [inspectorTab, setInspectorTab] = useState('clip'),
    [effectId, setEffectId] = useState(''),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState('enter');
  const [historyCount, setHistoryCount] = useState({ past: 0, future: 0 }),
    [status, setStatus] = useState('Loading your workspace…'),
    [saveStatus, setSaveStatus] = useState('Saved locally');
  const [modal, setModal] = useState<Modal>(null),
    [jsonDraft, setJsonDraft] = useState(''),
    [packSource, setPackSource] = useState(''),
    [packName, setPackName] = useState('helix'),
    [packSources, setPackSources] = useState<Record<string, string>>({});
  const [textDraft, setTextDraft] = useState(''),
    [nameDraft, setNameDraft] = useState(''),
    [projectName, setProjectName] = useState(''),
    [audioName, setAudioName] = useState(''),
    [waveform, setWaveform] = useState<number[]>([]);
  const [guides, setGuides] = useState(false),
    [calm, setCalm] = useState(false),
    [property, setProperty] = useState('y'),
    [frameIndex, setFrameIndex] = useState(0),
    [keyValue, setKeyValue] = useState(0),
    [dragPreview, setDragPreview] = useState<{
      id: string;
      start: number;
      duration: number;
    } | null>(null);
  const [relayURL, setRelayURL] = useState('ws://127.0.0.1:8787'),
    [relayConnected, setRelayConnected] = useState(false);
  const [broadcast, setBroadcast] = useState(false),
    [restore, setRestore] = useState<{ score: Score; packSources: Record<string, string> } | null>(
      null,
    );
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<Renderer | null>(null),
    scoreRef = useRef<Score | null>(null),
    engineRef = useRef<Engine | null>(null),
    timeRef = useRef(2400),
    playingRef = useRef(false),
    audio = useRef<HTMLAudioElement | null>(null),
    audioURL = useRef(''),
    raf = useRef(0),
    anchor = useRef(0),
    rateRef = useRef(1),
    loopRef = useRef(false),
    history = useRef<History>({ past: [], future: [] }),
    channel = useRef<BroadcastChannel | null>(null),
    socket = useRef<WebSocket | null>(null),
    broadcastRef = useRef(false),
    importInput = useRef<HTMLInputElement>(null),
    audioInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    timelineScroll = useRef<HTMLDivElement>(null),
    lastPublished = useRef(0);
  useEffect(() => {
    if (!score || !timelineScroll.current) return;
    const observer = new ResizeObserver((entries) =>
      setTimelineWidth(entries[0].contentRect.width),
    );
    observer.observe(timelineScroll.current);
    return () => observer.disconnect();
  }, [!!score]);
  const scoreNow = () => scoreRef.current!;
  const send = useCallback((action: string, data: Record<string, unknown> = {}) => {
    const message = { type: 'lilt', action, ...data };
    if (broadcastRef.current) channel.current?.postMessage(message);
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }, []);
  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    cancelAnimationFrame(raf.current);
    audio.current?.pause();
    send('pause', { time: timeRef.current });
  }, [send]);
  const draw = useCallback(
    (ms: number) => {
      timeRef.current = ms;
      setTime(ms);
      try {
        renderer.current?.draw(ms);
      } catch (error) {
        pause();
        setStatus(`Render error: ${(error as Error).message}`);
      }
    },
    [pause],
  );
  const seek = useCallback(
    (ms: number, publish = true) => {
      const duration = renderer.current?.duration || 0;
      const next = Math.max(0, Math.min(duration, ms));
      anchor.current = performance.now() - next / rateRef.current;
      if (audio.current?.src && Number.isFinite(audio.current.duration))
        audio.current.currentTime = Math.min(next / 1000, audio.current.duration);
      draw(next);
      if (publish) send('seek', { time: next });
    },
    [draw, send],
  );
  const play = useCallback(async () => {
    if (!renderer.current || playingRef.current) return;
    try {
      if (timeRef.current >= renderer.current.duration) seek(0);
      if (audio.current?.src) {
        audio.current.playbackRate = rateRef.current;
        await audio.current.play();
      }
      playingRef.current = true;
      setPlaying(true);
      anchor.current = performance.now() - timeRef.current / rateRef.current;
      send('play', { time: timeRef.current });
      const tick = (now: number) => {
        if (!playingRef.current) return;
        let next = audio.current?.src
          ? audio.current.currentTime * 1000
          : (now - anchor.current) * rateRef.current;
        if (next >= renderer.current!.duration) {
          if (loopRef.current) {
            next %= renderer.current!.duration;
            seek(next);
          } else {
            next = renderer.current!.duration;
            pause();
          }
        }
        draw(next);
        if (
          (broadcastRef.current || socket.current?.readyState === WebSocket.OPEN) &&
          now - lastPublished.current > 1000
        ) {
          send('seek', { time: next });
          lastPublished.current = now;
        }
        if (playingRef.current) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch (error) {
      pause();
      setStatus((error as Error).message);
    }
  }, [draw, pause, seek, send]);
  useEffect(() => {
    let cancelled = false;
    audio.current = new Audio();
    audio.current.onended = () => pause();
    audio.current.onerror = () => {
      pause();
      setStatus('This audio file could not be decoded. Try WAV, MP3, or OGG.');
    };
    (async () => {
      try {
        const E = await loadEngine();
        const demo = await (await fetch('/examples/score.json')).json();
        let next = normalize(E, demo as Score);
        next.name = 'Waves, in thirteen movements';
        const raw = localStorage.getItem(STORAGE);
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (saved.packSources && Object.keys(saved.packSources).length) {
              if (!cancelled) setRestore(saved);
            } else next = normalize(E, saved.score);
          } catch {}
        }
        if (cancelled) return;
        engineRef.current = E;
        scoreRef.current = next;
        setEngine(E);
        setScore(next);
        setCurrent(next.scenes[0].id);
        setProjectName(next.name!);
        setStatus('Ready · select a clip or a character to begin.');
        channel.current = new BroadcastChannel('lilt-studio');
      } catch (error) {
        if (!cancelled) setStatus(`Could not load the project: ${(error as Error).message}`);
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf.current);
      renderer.current?.destroy();
      audio.current?.pause();
      if (audioURL.current) URL.revokeObjectURL(audioURL.current);
      channel.current?.close();
      socket.current?.close();
    };
  }, [pause]);
  useEffect(() => {
    if (!engine || !score || !canvas.current) return;
    if (!renderer.current)
      renderer.current = new engine.Renderer(canvas.current, score, {
        onError: (error: Error) => setStatus(error.message),
      });
    else renderer.current.load(score);
    renderer.current.resize();
    renderer.current.focus = Math.max(
      0,
      score.scenes.findIndex((c) => c.id === current),
    );
    renderer.current.pinFocus = true;
    renderer.current.selected = engine
      .flatten(score.scenes[renderer.current.focus])
      .glyphs.filter((g) => selected.includes(g.id))
      .map((g) => g.i);
    renderer.current.guides = guides;
    renderer.current.calm = calm;
    const clamped = Math.min(timeRef.current, renderer.current.duration);
    timeRef.current = clamped;
    setTime(clamped);
    renderer.current.draw(clamped);
    document.fonts.ready.then(() => {
      renderer.current?.invalidate();
      renderer.current?.draw(timeRef.current);
    });
  }, [engine, score]);
  useEffect(() => {
    if (!engine || !score || !renderer.current) return;
    const index = score.scenes.findIndex((c) => c.id === current);
    if (index < 0) return;
    renderer.current.focus = index;
    renderer.current.pinFocus = true;
    renderer.current.selected = engine
      .flatten(score.scenes[index])
      .glyphs.filter((g) => selected.includes(g.id))
      .map((g) => g.i);
    renderer.current.guides = guides;
    renderer.current.calm = calm;
    renderer.current.draw(timeRef.current);
  }, [current, selected, guides, calm, engine, score]);
  useEffect(() => {
    if (!score || restore) return;
    setSaveStatus('Saving…');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ score, packSources }));
        setSaveStatus('Saved locally');
      } catch {
        setSaveStatus('Local storage unavailable');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [score, packSources, restore]);
  const clip = score?.scenes.find((c) => c.id === current) || score?.scenes[0];
  useEffect(() => {
    if (clip && engine) {
      setTextDraft(engine.contentText(clip.content));
      setNameDraft(clip.name || 'Untitled clip');
    }
  }, [clip, engine]);
  const commit = useCallback(
    (change: (next: Score) => void, label = 'Project updated') => {
      try {
        const before = scoreRef.current;
        if (!before || !engineRef.current) return false;
        const next = clone(before);
        change(next);
        engineRef.current.validate(next);
        if (JSON.stringify(before) === JSON.stringify(next)) return true;
        history.current.past.push(clone(before));
        if (history.current.past.length > 80) history.current.past.shift();
        history.current.future = [];
        setHistoryCount({ past: history.current.past.length, future: 0 });
        scoreRef.current = next;
        setScore(next);
        setStatus(label);
        send('load', { score: next });
        send(playingRef.current ? 'play' : 'seek', { time: timeRef.current });
        return true;
      } catch (error) {
        setStatus((error as Error).message);
        return false;
      }
    },
    [send],
  );
  const editClip = (fn: (c: Clip, s: Score) => void, label?: string) =>
    commit(
      (s) =>
        fn(
          s.scenes.find((c) => c.id === current)!,
          s,
        ),
      label,
    );
  const undo = useCallback(
    (redo = false) => {
      const from = redo ? history.current.future : history.current.past,
        to = redo ? history.current.past : history.current.future;
      if (!from.length || !scoreRef.current) return;
      pause();
      to.push(clone(scoreRef.current));
      const next = from.pop()!;
      scoreRef.current = next;
      setScore(next);
      if (!next.scenes.some((c) => c.id === current)) {
        setCurrent(next.scenes[0].id);
        setSelected([]);
      }
      setHistoryCount({ past: history.current.past.length, future: history.current.future.length });
      setProjectName(next.name || 'Untitled composition');
      setStatus(redo ? 'Redone' : 'Undone');
      send('load', { score: next });
      send('seek', { time: timeRef.current });
    },
    [current, pause, send],
  );
  const selectClip = (id: string, jump = true) => {
    const c = scoreNow().scenes.find((c) => c.id === id)!;
    setCurrent(id);
    setSelected([]);
    setEffectId('');
    if (jump) {
      pause();
      seek((c.start || 0) + Math.min(1800, c.duration * 0.35));
    }
  };
  const resizeClip = (c: Clip, duration: number) => {
    const ratio = duration / c.duration;
    c.duration = duration;
    engineRef.current!.walk(c.content, (n) => {
      if (n.begin != null) n.begin = Math.round(n.begin * ratio);
      if (n.end != null) n.end = Math.round(n.end * ratio);
    });
  };
  const ensureEnd = (s: Score) => {
    const end = Math.max(...s.scenes.map((c) => (c.start || 0) + c.duration));
    if (s.duration != null && s.duration < end) s.duration = end;
  };
  const removeClip = () => {
    if (!clip || !score || score.scenes.length < 2) return;
    pause();
    const nextId = score.scenes.find((c) => c.id !== clip.id)!.id;
    if (
      editClip((c, s) => {
        s.scenes = s.scenes.filter((x) => x.id !== c.id);
      }, 'Clip removed')
    ) {
      setCurrent(nextId);
      setSelected([]);
    }
  };
  const duplicateClip = () => {
    if (!clip) return;
    const id = uid('clip');
    if (
      editClip((c, s) => {
        const dup = clone(c);
        dup.id = id;
        if (c.type === 'shape' || c.type === 'image') {
          for (const rule of [
            ...(dup.styles || []),
            ...(dup.animations || []),
            ...(dup.materials || []),
          ]) {
            if (rule.select?.ids)
              rule.select.ids = rule.select.ids.map((x) =>
                x === c.id ? id : x === c.id + '-object' ? id + '-object' : x,
              );
          }
        }
        for (const fx of [...(dup.animations || []), ...(dup.materials || [])]) {
          fx.id = uid('fx');
          if (s.effects?.[fx.use]) {
            const original = fx.use,
              use = uid(original.startsWith('studio-') ? 'studio' : 'path');
            s.effects[use] = clone(s.effects[original]);
            fx.use = use;
          }
        }
        dup.name = (c.name || 'Clip') + ' copy';
        dup.start = (c.start || 0) + c.duration;
        s.scenes.push(dup);
        ensureEnd(s);
      }, 'Clip duplicated')
    ) {
      setCurrent(id);
      setSelected([]);
    }
  };
  const addClip = () => {
    if (!score || !engine) return;
    const id = uid('clip');
    const end = Math.round(timeRef.current);
    if (
      commit((s) => {
        s.scenes.push({
          id,
          name: 'A new movement',
          start: end,
          duration: 6000,
          layer: clip?.layer || s.layers![0].id,
          layout: 'line',
          content: [
            {
              id: uid('phrase'),
              type: 'phrase',
              children: [
                {
                  id: uid('word'),
                  type: 'word',
                  children: Array.from('Make it move.').map((text) => ({ id: uid('glyph'), text })),
                },
              ],
            },
          ],
          style: { face: 'sans', color: '#eeeae1', size: 1.3 },
          animations: [
            { id: uid('fx'), use: 'core/enter-rise', each: 'character', stagger: 40 },
            { id: uid('fx'), use: 'core/exit-ebb', phase: 'exit' },
          ],
          materials: [],
        });
        ensureEnd(s);
      }, 'New text clip added')
    ) {
      setCurrent(id);
      setSelected([]);
      setInspectorTab('clip');
    }
  };
  const addVisual = (type: 'shape' | 'image', asset?: Awaited<ReturnType<typeof embedImage>>) => {
    if (!score) return;
    const id = uid('clip'),
      layer = uid('layer'),
      assetId = uid('asset');
    const start = Math.round(timeRef.current);
    if (
      commit(
        (s) => {
          s.layers!.push({
            id: layer,
            name: asset?.name || 'Shape',
            z: Math.max(...s.layers!.map((l) => l.z || 0)) + 1,
            rect: [0, 0, 1, 1],
            opacity: 1,
            visible: true,
          });
          const c: Clip = {
            id,
            type,
            name: asset?.name || 'Rectangle',
            start,
            duration: 6000,
            layer,
            layout: 'line',
            content: [],
            style: { size: 1, dx: 0, dy: 0, rotation: 0 },
            animations: [],
            materials: [],
          };
          if (type === 'shape')
            c.shape = {
              kind: 'rectangle',
              width: 240,
              height: 140,
              fill: '#c4a2ff',
              stroke: 'none',
              strokeWidth: 2,
              radius: 12,
            };
          else if (asset) {
            s.assets ??= {};
            s.assets[assetId] = { type: 'image', src: asset.src, name: asset.name };
            const scale = Math.min(1, 420 / Math.max(asset.width, asset.height));
            c.image = {
              asset: assetId,
              width: Math.round(asset.width * scale),
              height: Math.round(asset.height * scale),
              fit: 'contain',
            };
          }
          s.scenes.push(c);
          ensureEnd(s);
        },
        `${type === 'shape' ? 'Shape' : 'Image'} clip added`,
      )
    ) {
      pause();
      setCurrent(id);
      setSelected([]);
      setInspectorTab('clip');
      seek(start);
    }
  };
  const addPath = () => {
    const use = uid('path');
    editClip((c, s) => {
      s.effects ??= {};
      s.effects[use] = {
        kind: 'motion',
        ease: [0.42, 0, 0.58, 1],
        path: {
          points: [
            [-240, 120],
            [-140, -220],
            [160, 220],
            [240, -120],
          ],
          orient: false,
        },
      };
      c.animations ??= [];
      c.animations.push({ id: uid('fx'), use, each: 'phrase', at: 0, duration: c.duration });
    }, 'Bézier motion path added');
  };
  const addLayer = () => {
    if (!score) return;
    const id = uid('layer');
    commit((s) => {
      s.layers!.push({
        id,
        name: `Layer ${s.layers!.length + 1}`,
        z: s.layers!.length,
        rect: [0, 0, 1, 1],
        opacity: 1,
        visible: true,
      });
    }, 'Layer added');
  };
  const setStyle = (key: keyof Style, value: string | number) =>
    editClip((c) => {
      if (selected.length) {
        c.styles ??= [];
        let rule = c.styles.find((r) => JSON.stringify(r.select?.ids) === JSON.stringify(selected));
        if (!rule) {
          rule = { select: { ids: [...selected] }, style: {} };
          c.styles.push(rule);
        }
        Object.assign(rule.style, { [key]: value });
      } else {
        c.style = { ...c.style, [key]: value };
        engine!.walk(c.content, (n) => {
          if (n.style) delete n.style[key];
        });
        for (const rule of c.styles || []) delete rule.style[key];
        if (key === 'face') c.mixFonts = false;
      }
    }, 'Typography updated');
  const allEffects = engine && score ? engine.listEffects(score) : [];
  const effects = clip ? [...(clip.animations || []), ...(clip.materials || [])] : [];
  const activeEffect = effects.find((e) => e.id === effectId) || effects[0];
  const def = activeEffect && engine && score ? engine.definition(score, activeEffect.use) : null;
  const addEffect = (use: string) => {
    if (!engine || !score) return;
    const definition = engine.definition(score, use),
      id = uid('fx');
    if (
      editClip(
        (c) => {
          const inst: Effect = {
            id,
            use,
            ...(selected.length ? { select: { ids: [...selected] } } : {}),
            ...(definition.kind === 'motion'
              ? { phase: definition.phase || 'enter', each: 'character', stagger: 0 }
              : {}),
          };
          if (definition.kind === 'motion') {
            c.animations ??= [];
            c.animations.push(inst);
          } else {
            c.materials ??= [];
            c.materials.push(inst);
          }
        },
        `${pretty(use)} added`,
      )
    ) {
      setEffectId(id);
      setInspectorTab('motion');
    }
  };
  const changeEffect = (fn: (e: Effect, c: Clip) => void, label = 'Effect updated') => {
    if (activeEffect)
      editClip((c) => {
        const effect = [...(c.animations || []), ...(c.materials || [])].find(
          (e) => e.id === activeEffect.id,
        )!;
        fn(effect, c);
      }, label);
  };
  const removeEffect = () =>
    changeEffect((e, c) => {
      c.animations = c.animations?.filter((x) => x.id !== e.id);
      c.materials = c.materials?.filter((x) => x.id !== e.id);
    }, 'Effect removed');
  const reorderEffect = (direction: number) =>
    changeEffect((e, c) => {
      const list = def?.kind === 'material' ? c.materials! : c.animations!;
      const i = list.findIndex((x) => x.id === e.id),
        j = i + direction;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
    }, 'Effect order updated');
  const keyedId = clip?.animations?.find((e) => e.use.startsWith('studio-'))?.use;
  const keyedDef = keyedId ? score?.effects?.[keyedId] : undefined;
  const frames = keyedDef?.keyframes?.[property] || [];
  const chosenFrame = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))];
  useEffect(() => {
    setKeyValue(chosenFrame?.value ?? neutral(property));
  }, [chosenFrame, property]);
  const updateFrames = (fn: (frames: Keyframe[]) => void, prop = property) =>
    editClip((c, s) => {
      let inst = c.animations?.find((e) => e.use.startsWith('studio-'));
      if (!inst) {
        const use = uid('studio');
        s.effects ??= {};
        s.effects[use] = { kind: 'motion', duration: c.duration, ease: 'linear', keyframes: {} };
        inst = {
          id: uid('fx'),
          use,
          each: 'phrase',
          at: 0,
          duration: c.duration,
          ...(selected.length ? { select: { ids: [...selected] } } : {}),
        };
        c.animations ??= [];
        c.animations.push(inst);
      }
      const definition = s.effects![inst.use];
      definition.duration = c.duration;
      inst.duration = c.duration;
      definition.keyframes ??= {};
      definition.keyframes[prop] ??= [];
      fn(definition.keyframes[prop]);
      definition.keyframes[prop].sort((a, b) => a.time - b.time);
      if (!definition.keyframes[prop].length) delete definition.keyframes[prop];
    }, 'Keyframes updated');
  const addKeyframe = () => {
    if (!clip) return;
    const local = Math.round(Math.max(0, Math.min(clip.duration, time - (clip.start || 0))));
    updateFrames((list) => {
      const same = list.find((f) => f.time === local);
      if (same) same.value = keyValue;
      else list.push({ time: local, value: keyValue, ease: 'smooth' });
    });
    setFrameIndex(frames.filter((f) => f.time < local).length);
  };
  const applyProject = (source: Score) => {
    if (!engine) return;
    try {
      const next = normalize(engine, source);
      pause();
      if (
        commit((s) => {
          for (const key of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[key];
          Object.assign(s, next);
        }, 'Project opened')
      ) {
        setCurrent(next.scenes[0].id);
        setSelected([]);
        setProjectName(next.name!);
        seek(0);
        setModal(null);
      }
    } catch (error) {
      setStatus((error as Error).message);
    }
  };
  const loadDemo = async (name: string) => {
    try {
      applyProject(await (await fetch(`/examples/${name}.json`)).json());
    } catch (error) {
      setStatus((error as Error).message);
    }
  };
  const exportScore = () => {
    download(JSON.stringify(scoreRef.current, null, 2), 'lilt-score.json');
    setStatus('Score exported · audio is kept separately.');
  };
  const exportHTML = async () => {
    try {
      setStatus('Building a standalone player…');
      const names = [
        'model.js',
        'core-pack.js',
        'migrate.js',
        'editing.js',
        'renderer.js',
        'player.js',
      ];
      const sources = await Promise.all(
        names.map((name) => fetch('/lilt/' + name).then((r) => r.text())),
      );
      const fonts = await (await fetch('/lilt/fonts.css')).text();
      const safe = (text: string) => text.replace(/<\/script/gi, '<\\/script');
      const custom = Object.entries(packSources)
        .map(([id, source]) => `${JSON.stringify(id)}:(${source})`)
        .join(',');
      const packed = custom
        ? `Lilt3.registerPack({id:'user',version:'1.0.0',effects:{${custom}}});`
        : '';
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lilt player</title><style>${fonts}\nhtml,body{margin:0;height:100%;overflow:hidden;background:transparent}canvas{width:100%;height:100%;display:block}</style></head><body><canvas id="stage" aria-label="Animated lyrics"></canvas><script>${safe(sources.join('\n'))}\n${safe(packed)}\nconst score=${JSON.stringify(scoreRef.current).replace(/</g, '\\u003c')};const q=new URLSearchParams(location.search);const player=window.liltPlayer=new Lilt3.Player(document.getElementById('stage'),score,{transparent:q.get('transparent')!=='0',loop:q.get('loop')!=='0',channel:'lilt-studio'});Promise.all([document.fonts.ready,player.renderer.ready()]).then(()=>{player.renderer.invalidate();player.seek(Number(q.get('time')||0));if(q.get('socket'))player.connectSocket(q.get('socket'));if(q.get('autoplay')!=='0')player.play();});<\/script></body></html>`;
      download(html, 'lilt-player.html', 'text/html');
      setStatus(
        'Standalone player exported · fonts, score, renderer, and registered packs included.',
      );
    } catch (error) {
      setStatus((error as Error).message);
    }
  };
  const snapshot = async () => {
    const r = renderer.current;
    if (!r) return;
    try {
      await r.ready();
    } catch (error) {
      setStatus((error as Error).message);
      return;
    }
    const sel = r.selected,
      guide = r.guides;
    r.selected = [];
    r.guides = false;
    r.draw(timeRef.current);
    r.canvas.toBlob((blob) => {
      if (blob) download(blob, 'lilt-frame.png', 'image/png');
    });
    r.selected = sel;
    r.guides = guide;
    r.draw(timeRef.current);
  };
  const connectRelay = () => {
    if (relayConnected) {
      socket.current?.close();
      setRelayConnected(false);
      return;
    }
    try {
      const url = new URL(relayURL);
      if (!['ws:', 'wss:'].includes(url.protocol)) throw Error('Use a ws: or wss: relay URL.');
      socket.current?.close();
      const connection = new WebSocket(url);
      socket.current = connection;
      connection.onopen = () => {
        setRelayConnected(true);
        send('load', { score: scoreRef.current });
        send('rate', { rate: rateRef.current });
        send(playingRef.current ? 'play' : 'pause', { time: timeRef.current });
        setStatus('Relay connected · OBS follows the studio transport.');
      };
      connection.onclose = () => {
        if (socket.current === connection) setRelayConnected(false);
      };
      connection.onerror = () =>
        setStatus('Could not connect to the relay. Run npm run relay or check the URL.');
    } catch (error) {
      setStatus((error as Error).message);
    }
  };
  const installPack = (source = packSource, name = packName) => {
    if (!engine) return false;
    try {
      if (!/^[-\w]+$/.test(name))
        throw Error('Use letters, numbers, underscores, or hyphens for the template name.');
      const nextSources = { ...packSources, [name]: source };
      const definitions = Object.fromEntries(
        Object.entries(nextSources).map(([id, text]) => [
          id,
          new Function(`"use strict";return (${text}\n)`)(),
        ]),
      );
      for (const definition of Object.values(definitions)) {
        if (definition.kind === 'motion' && typeof definition.sample === 'function') {
          for (const p of [0, 0.5, 1]) {
            const random = (key: string) => engine.random(1, key);
            const result = definition.sample({
              p,
              e: p,
              i: 0,
              n: 1,
              time: p,
              t: p,
              phase: definition.phase || 'enter',
              rand: random,
              r: random,
              params: definition.defaults || {},
            });
            if (
              !result ||
              Object.values(result).some(
                (value) => typeof value !== 'number' || !Number.isFinite(value),
              )
            )
              throw Error('sample() must return finite numeric values.');
          }
        }
      }
      const previous = engine.packs.get('user');
      engine.registerPack({ id: 'user', version: '1.0.0', effects: definitions });
      try {
        engine.validate({ ...scoreNow(), packs: { ...scoreNow().packs, user: '1.0.0' } });
      } catch (error) {
        if (previous) engine.packs.set('user', previous);
        else engine.packs.delete('user');
        throw error;
      }
      if (
        !commit((s) => {
          s.packs ??= {};
          s.packs.user = '1.0.0';
        }, 'Trusted pack registered')
      )
        return false;
      setPackSources(nextSources);
      renderer.current?.invalidate();
      setStatus(`Registered user/${name}. Find it in Effects → All.`);
      setCategory('all');
      setModal(null);
      return true;
    } catch (error) {
      setStatus((error as Error).message);
      return false;
    }
  };
  const loadAudio = async (file: File) => {
    try {
      pause();
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      await context.close();
      const data = buffer.getChannelData(0),
        count = 800,
        peaks = Array.from({ length: count }, (_, i) => {
          let max = 0;
          const from = Math.floor((i * data.length) / count),
            to = Math.floor(((i + 1) * data.length) / count),
            stride = Math.max(1, Math.floor((to - from) / 80));
          for (let j = from; j < to; j += stride) max = Math.max(max, Math.abs(data[j]));
          return max;
        });
      if (audioURL.current) URL.revokeObjectURL(audioURL.current);
      audioURL.current = URL.createObjectURL(file);
      audio.current!.src = audioURL.current;
      setAudioName(file.name);
      setWaveform(peaks);
      commit((s) => {
        s.duration = Math.max(engine!.schedule(s).duration, Math.ceil(buffer.duration * 1000));
      }, 'Audio loaded · playback follows the audio clock. Audio stays on this device.');
      seek(0);
    } catch (error) {
      setStatus(`Audio import failed: ${(error as Error).message}`);
    }
  };
  const beginClipDrag = (event: React.PointerEvent, id: string, mode: 'move' | 'start' | 'end') => {
    if (event.button !== 0 || !score) return;
    event.preventDefault();
    event.stopPropagation();
    pause();
    selectClip(id, false);
    const target = event.currentTarget as HTMLElement,
      lane = target.closest('.clip-lane') as HTMLElement;
    const rect = lane.getBoundingClientRect(),
      origin = event.clientX,
      c = score.scenes.find((c) => c.id === id)!,
      start = c.start || 0,
      duration = c.duration,
      total = engine!.schedule(score).duration;
    let latest = { id, start, duration };
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const raw = ((e.clientX - origin) / rect.width) * total;
      const delta = e.altKey ? raw : Math.round(raw / 100) * 100;
      let newStart = start,
        newDuration = duration;
      if (mode === 'move') newStart = Math.max(0, start + delta);
      if (mode === 'end') newDuration = Math.max(1000, Math.min(60000, duration + delta));
      if (mode === 'start') {
        newStart = Math.max(0, Math.min(start + duration - 1000, start + delta));
        newDuration = start + duration - newStart;
      }
      latest = { id, start: Math.round(newStart), duration: Math.round(newDuration) };
      setDragPreview(latest);
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setDragPreview(null);
      commit((s) => {
        const edited = s.scenes.find((c) => c.id === id)!;
        edited.start = latest.start;
        resizeClip(edited, latest.duration);
        ensureEnd(s);
      }, 'Clip timing updated');
    };
    const cancel = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setDragPreview(null);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  const stagePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const r = renderer.current;
    if (!r || !engine || !score) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const hit = r.hit(
      ((event.clientX - rect.left) / rect.width) * r.w,
      ((event.clientY - rect.top) / rect.height) * r.h,
    );
    if (hit === null) {
      setSelected([]);
      return;
    }
    const c = score.scenes[r.hitScene],
      glyphs = engine.flatten(c).glyphs,
      g = glyphs[hit];
    setCurrent(c.id);
    const ids = event.shiftKey
      ? selected.includes(g.id)
        ? selected.filter((id) => id !== g.id)
        : [...selected, g.id]
      : selected.includes(g.id)
        ? selected
        : [g.id];
    setSelected(ids);
    setInspectorTab('clip');
    const x = event.clientX,
      y = event.clientY,
      target = event.currentTarget,
      cache = r.cache as Renderer['cache'] & { fit: number };
    const fit = cache?.fit || 1;
    let dx = 0,
      dy = 0;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      dx = (((e.clientX - x) / rect.width) * r.w) / fit;
      dy = (((e.clientY - y) / rect.height) * r.h) / fit;
      target.style.cursor = 'grabbing';
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      target.style.cursor = '';
      if (Math.hypot(dx, dy) > 3)
        commit((next) => {
          const edited = next.scenes.find((s) => s.id === c.id)!;
          for (const id of ids) {
            const old = engine.flatten(edited).glyphs.find((g) => g.id === id);
            const rendered = r.cache.glyphs.find((g) => g.id === id);
            edited.styles ??= [];
            edited.styles.push({
              select: { ids: [id] },
              style: {
                dx: Math.round((rendered?.o.dx || old?.style.dx || 0) + dx),
                dy: Math.round((rendered?.o.dy || old?.style.dy || 0) + dy),
              },
            });
          }
        }, 'Glyph position updated');
    };
    const cancel = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      target.style.cursor = '';
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (scoreRef.current) {
          try {
            localStorage.setItem(STORAGE, JSON.stringify({ score: scoreRef.current, packSources }));
            setSaveStatus('Saved locally');
          } catch {
            setSaveStatus('Local storage unavailable');
          }
        }
        return;
      }
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo(event.shiftKey);
        return;
      }
      if (modal) return;
      if (event.code === 'Space') {
        event.preventDefault();
        playingRef.current ? pause() : void play();
      }
      if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
        event.preventDefault();
        pause();
        seek(
          timeRef.current +
            (event.code === 'ArrowRight' ? 1 : -1) *
              (event.shiftKey ? 1000 : 1000 / (scoreRef.current?.stage?.fps || 30)),
        );
      }
      if (event.code === 'Home') {
        event.preventDefault();
        seek(0);
      }
      if (event.code === 'Escape') setSelected([]);
    };
    addEventListener('keydown', handle);
    return () => removeEventListener('keydown', handle);
  }, [pause, play, seek, undo, modal, packSources]);
  if (!score || !engine || !clip)
    return (
      <div className="studio loading">
        <div className="logo-mark">
          li<span>lt</span>
        </div>
        <div className="loading-spinner" />
        <p role="status">{status}</p>
        <a href="/">Back home</a>
      </div>
    );
  const timeline = engine.schedule(score),
    duration = timeline.duration,
    layers = timeline.layers;
  const focusLayer = score.layers!.find((l) => l.id === clip.layer) || score.layers![0];
  const visual = clip.type === 'shape' || clip.type === 'image';
  const pathEffect = clip.animations?.find((f) => engine.definition(score, f.use)?.path);
  const pathDef = pathEffect ? engine.definition(score, pathEffect.use) : undefined;
  const glyphs = engine.flatten(clip).glyphs;
  const selectedGlyph = renderer.current?.cache?.glyphs?.find((g) => selected.includes(g.id));
  const style = {
    face: 'mincho',
    color: '#eeeae1',
    size: 1,
    dx: 0,
    dy: 0,
    rotation: 0,
    ...clip.style,
    ...selectedGlyph?.o,
  };
  const filteredEffects = allEffects.filter((d) => {
    const id = d.id!;
    return (
      (category === 'all' ||
        (category === 'material' && d.kind === 'material') ||
        (category === 'loop' && d.phase === 'loop') ||
        (d.kind === 'motion' && d.phase === category)) &&
      pretty(id).toLowerCase().includes(search.toLowerCase())
    );
  });
  const currentIndex = score.scenes.findIndex((c) => c.id === clip.id),
    color = palette[currentIndex % palette.length];
  const totalWidth = Math.max(780, Math.round((timelineWidth - 188) * zoom));
  const openJSON = () => {
    setJsonDraft(JSON.stringify(score, null, 2));
    setModal('json');
  };
  return (
    <div className="studio">
      <header className="studio-header">
        <a className="studio-brand" href="/" aria-label="Lilt home">
          <span className="logo-mark">
            li<span>lt</span>
            <i />
          </span>
          <span className="brand-divider" />
          <span>
            studio<span className="beta">BETA</span>
          </span>
        </a>
        <div className="project-title">
          <span className="project-dot" />
          <input
            aria-label="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() =>
              commit((s) => {
                s.name = projectName || 'Untitled composition';
              }, 'Project renamed')
            }
          />
          <span className="saved">
            <Icon name="check" size={12} />
            {saveStatus}
          </span>
        </div>
        <div className="header-actions">
          <Button
            icon="undo"
            title="Undo (⌘/Ctrl Z)"
            disabled={!historyCount.past}
            onClick={() => undo()}
          />
          <Button
            icon="redo"
            title="Redo (⌘/Ctrl Shift Z)"
            disabled={!historyCount.future}
            onClick={() => undo(true)}
          />
          <span className="separator" />
          <Button icon="upload" title="Import score" onClick={() => importInput.current?.click()} />
          <Button icon="code" title="Score & code" onClick={openJSON} />
          <Button icon="download" className="primary" onClick={() => setModal('export')}>
            Export
          </Button>
        </div>
      </header>
      <div className="workspace">
        <aside className="library">
          <div className="panel-tabs" role="tablist" aria-label="Library">
            <button
              role="tab"
              aria-selected={leftTab === 'effects'}
              onClick={() => setLeftTab('effects')}
            >
              <Icon name="spark" />
              Effects
            </button>
            <button
              role="tab"
              aria-selected={leftTab === 'project'}
              onClick={() => setLeftTab('project')}
            >
              <Icon name="folder" />
              Project
            </button>
          </div>
          {leftTab === 'effects' ? (
            <>
              <div className="library-heading">
                <h2>Make words move.</h2>
                <p>A little motion. A lot of feeling.</p>
              </div>
              <label className="search">
                <Icon name="search" />
                <input
                  aria-label="Search effects"
                  placeholder="Find an effect…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd>/</kbd>
              </label>
              <div className="effect-filters">
                {[
                  ['enter', 'In'],
                  ['loop', 'Hold'],
                  ['exit', 'Out'],
                  ['material', 'Texture'],
                  ['all', 'All'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={category === id ? 'active' : ''}
                    onClick={() => setCategory(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="effect-library">
                {filteredEffects.map((d, i) => (
                  <button
                    key={d.id}
                    className={`effect-card effect-${d.kind}`}
                    onClick={() => addEffect(d.id!)}
                    title={`Add ${pretty(d.id!)} to ${selected.length ? 'selected characters' : 'this clip'}`}
                  >
                    <div className={`effect-art art-${i % 6}`}>
                      <span>{d.kind === 'material' ? 'Aa' : d.phase === 'exit' ? '散' : 'あ'}</span>
                      <i />
                      <i />
                      <i />
                      <span className="effect-add">
                        <Icon name="plus" size={12} />
                      </span>
                    </div>
                    <span>{pretty(d.id!)}</span>
                    <small>
                      {d.kind === 'material'
                        ? 'Glyph material'
                        : d.phase === 'loop'
                          ? 'Continuous motion'
                          : `${d.duration || 1000} ms`}
                    </small>
                  </button>
                ))}
                {!filteredEffects.length && <p className="empty">No effects match your search.</p>}
              </div>
              <button
                className="library-custom"
                onClick={() => {
                  setPackSource(
                    `{\n  kind: "motion", phase: "enter", duration: 1400,\n  defaults: { radius: 120, turns: 1.5 },\n  controls: { radius: { min: 0, max: 300, step: 5 }, turns: { min: 0, max: 4, step: 0.1 } },\n  sample({ p, rand, params }) {\n    const q = Math.pow(1 - p, 3);\n    const angle = rand("angle") * Math.PI * 2 + q * params.turns * Math.PI * 2;\n    return { x: Math.cos(angle) * params.radius * q, y: Math.sin(angle) * params.radius * q, rotation: q, opacity: Math.min(1, p * 4) };\n  }\n}`,
                  );
                  setModal('code');
                }}
              >
                <Icon name="code" />
                <span>
                  Create an effect<small>Your code. Your choreography.</small>
                </span>
                <Icon name="plus" />
              </button>
            </>
          ) : (
            <>
              <div className="library-heading">
                <h2>Your composition</h2>
                <p>
                  {score.scenes.length} clips · {layers.length} layers · {seconds(duration)}
                </p>
              </div>
              <div className="project-tools">
                <Button icon="plus" onClick={addClip}>
                  Text clip
                </Button>
                <Button icon="plus" onClick={() => addVisual('shape')}>
                  Shape
                </Button>
                <Button icon="plus" onClick={() => imageInput.current?.click()}>
                  Image
                </Button>
                <Button icon="music" onClick={() => audioInput.current?.click()}>
                  Audio
                </Button>
              </div>
              <div className="project-clips">
                {score.scenes.map((c, i) => (
                  <button
                    key={c.id}
                    className={c.id === clip.id ? 'active' : ''}
                    onClick={() => selectClip(c.id)}
                  >
                    <span className="clip-mini" style={{ color: palette[i % palette.length] }}>
                      {c.type === 'shape' ? '◈' : c.type === 'image' ? '▧' : 'Aa'}
                    </span>
                    <span>
                      <strong>{c.name || 'Untitled clip'}</strong>
                      <small>
                        {seconds(c.start || 0)} · {seconds(c.duration)}
                      </small>
                    </span>
                    <Icon name="chevron" size={12} />
                  </button>
                ))}
              </div>
              <div className="demo-section">
                <span className="eyebrow">STARTING POINTS</span>
                <Button icon="layers" onClick={() => loadDemo('example-duet')}>
                  Duet + silence
                </Button>
                <Button icon="film" onClick={() => loadDemo('score')}>
                  Original 13 movements
                </Button>
                <Button icon="upload" onClick={() => importInput.current?.click()}>
                  Import JSON score
                </Button>
              </div>
            </>
          )}
          <div className="library-foot">
            <span className="tiny-dot" />
            Vanilla JS at the heart.
            <Button icon="help" title="Help & shortcuts" onClick={() => setModal('help')} />
          </div>
        </aside>
        <main className="composition">
          <div className="composition-bar">
            <div>
              <Icon name="film" />
              <span>Composition</span>
              <span className="tab-name">{score.name}</span>
            </div>
            <div>
              <span>
                {score.stage!.width} × {score.stage!.height}
              </span>
              <span className="separator" />
              <span>{score.stage!.fps} FPS</span>
            </div>
          </div>
          <div className="stage-area">
            <div className="stage-topline">
              <span>
                <i className="live-dot" />
                LIVE CANVAS
              </span>
              <span>
                {timeline.clips.filter((c) => time >= c.start && time < c.end).length} active clips
              </span>
            </div>
            <div
              className={`stage-frame ${score.background?.transparent ? 'checker' : ''}`}
              style={
                {
                  aspectRatio: `${score.stage!.width}/${score.stage!.height}`,
                  '--stage-ratio': score.stage!.width / score.stage!.height,
                } as React.CSSProperties
              }
            >
              <canvas
                ref={canvas}
                onPointerDown={stagePointer}
                aria-label="Composition preview. Click characters to select them."
              />
              <div className="stage-corner top-left" />
              <div className="stage-corner bottom-right" />
              {guides && <div className="safe-area" />}
            </div>
            <div className="stage-bottomline">
              <span>
                {selected.length
                  ? `${selected.length} character${selected.length > 1 ? 's' : ''} selected · drag to reposition`
                  : 'Click a character to make it yours.'}
              </span>
              <span>{clock(time, score.stage!.fps)}</span>
            </div>
          </div>
          <div className="transport">
            <div className="preview-options">
              <Button
                icon="frame"
                title="Toggle safe areas and glyph guides"
                className={guides ? 'active' : ''}
                onClick={() => setGuides(!guides)}
              />
              <Button
                icon="eye"
                title="Reduced motion preview"
                className={calm ? 'active' : ''}
                onClick={() => setCalm(!calm)}
              />
              <Button icon="download" title="Save current frame as PNG" onClick={snapshot} />
              <span className="preview-scale">Fit</span>
            </div>
            <div className="playback-controls">
              <Button
                icon="rewind"
                title="Go to start"
                onClick={() => {
                  pause();
                  seek(0);
                }}
              />
              <Button
                className="play-button"
                icon={playing ? 'pause' : 'play'}
                title={playing ? 'Pause (Space)' : 'Play (Space)'}
                onClick={() => (playing ? pause() : void play())}
              />
              <Button
                icon="loop"
                title="Loop composition"
                className={loop ? 'active' : ''}
                onClick={() => {
                  loopRef.current = !loop;
                  setLoop(!loop);
                }}
              />
            </div>
            <div className="transport-time">
              <span>{clock(time, score.stage!.fps)}</span>
              <span className="muted">/ {clock(duration, score.stage!.fps)}</span>
              <select
                aria-label="Playback speed"
                value={rate}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  rateRef.current = next;
                  setRate(next);
                  anchor.current = performance.now() - timeRef.current / next;
                  if (audio.current) audio.current.playbackRate = next;
                  send('rate', { rate: next });
                }}
              >
                {[0.25, 0.5, 1, 1.5, 2].map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
            </div>
          </div>
        </main>
        <aside className="inspector">
          <div className="inspector-heading">
            <span>
              <Icon name="settings" />
              Inspector
            </span>
            <span className="selection-tag">
              {visual ? clip.type!.toUpperCase() : selected.length ? 'CHARACTER' : 'TEXT CLIP'}
            </span>
          </div>
          <div className="selected-summary">
            <span className="selected-icon" style={{ color }}>
              {clip.type === 'shape' ? '◈' : clip.type === 'image' ? '▧' : 'Aa'}
            </span>
            <div>
              <strong>
                {selected.length
                  ? glyphs
                      .filter((g) => selected.includes(g.id))
                      .map((g) => g.ch)
                      .join('')
                  : clip.name || 'Untitled clip'}
              </strong>
              <small>
                {selected.length
                  ? 'Stable character selection'
                  : `Clip ${String(currentIndex + 1).padStart(2, '0')} · ${seconds(clip.duration)}`}
              </small>
            </div>
            <Button icon="duplicate" title="Duplicate clip" onClick={duplicateClip} />
          </div>
          <div className="inspector-tabs" role="tablist" aria-label="Inspector">
            {[
              ['clip', visual ? 'Object' : 'Text'],
              ['motion', 'Motion'],
              ['keys', 'Keys'],
              ['stage', 'Stage'],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={inspectorTab === id}
                onClick={() => setInspectorTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inspector-body">
            {inspectorTab === 'clip' && (
              <>
                <section className="inspector-section">
                  <h3>
                    Content <span>{visual ? clip.type : `${glyphs.length} characters`}</span>
                  </h3>
                  <Field label="Clip name">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() =>
                        editClip((c) => {
                          c.name = nameDraft;
                        }, 'Clip renamed')
                      }
                    />
                  </Field>
                  {!visual && (
                    <>
                      {' '}
                      <textarea
                        className="lyric-input"
                        aria-label="Lyric text"
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        onBlur={() => {
                          if (textDraft !== engine.contentText(clip.content)) {
                            if (
                              editClip(
                                (c) => engine.editText(c, textDraft),
                                'Text updated · matching character IDs preserved',
                              )
                            )
                              setSelected([]);
                            else setTextDraft(engine.contentText(clip.content));
                          }
                        }}
                      />
                      <div className="glyph-selector" aria-label="Select characters">
                        {glyphs.map((g) => (
                          <button
                            key={g.id}
                            className={selected.includes(g.id) ? 'selected' : ''}
                            aria-pressed={selected.includes(g.id)}
                            title={`Select ${g.ch} (${g.id})`}
                            onClick={(e) =>
                              setSelected(
                                e.shiftKey
                                  ? selected.includes(g.id)
                                    ? selected.filter((id) => id !== g.id)
                                    : [...selected, g.id]
                                  : [g.id],
                              )
                            }
                          >
                            {g.ch}
                          </button>
                        ))}
                      </div>
                      {selected.length > 0 && (
                        <Button className="text-button" onClick={() => setSelected([])}>
                          Apply to whole clip
                        </Button>
                      )}
                    </>
                  )}
                </section>
                {!visual && (
                  <>
                    <section className="inspector-section">
                      <h3>
                        Typography <Icon name="settings" size={12} />
                      </h3>
                      <Field label="Typeface">
                        <select
                          value={style.face}
                          onChange={(e) => setStyle('face', e.target.value)}
                        >
                          {Object.keys(engine.faces).map((face) => (
                            <option key={face} value={face}>
                              {
                                (
                                  {
                                    mincho: 'Mincho · Serif',
                                    sans: 'Sans · Modern',
                                    bold: 'Mincho · Bold',
                                    black: 'Sans · Black',
                                    brush: 'Brush · Handwritten',
                                    display: 'Display · Heavy',
                                  } as Record<string, string>
                                )[face]
                              }
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="field-grid">
                        <NumberField
                          label="Size"
                          value={style.size}
                          min={0.25}
                          max={4}
                          step={0.05}
                          suffix="×"
                          onChange={(n) => setStyle('size', n)}
                        />
                        <Field label="Fill">
                          <div className="color-field">
                            <input
                              aria-label="Text color"
                              type="color"
                              value={style.color}
                              onChange={(e) => setStyle('color', e.target.value)}
                            />
                            <span>{style.color.toUpperCase()}</span>
                          </div>
                        </Field>
                      </div>
                      <div className="field-grid">
                        <NumberField
                          label="Offset X"
                          value={style.dx}
                          suffix="px"
                          onChange={(n) => setStyle('dx', n)}
                        />
                        <NumberField
                          label="Offset Y"
                          value={style.dy}
                          suffix="px"
                          onChange={(n) => setStyle('dy', n)}
                        />
                      </div>
                      <NumberField
                        label="Rotation"
                        value={style.rotation}
                        step={1}
                        suffix="°"
                        onChange={(n) => setStyle('rotation', n)}
                      />
                      <Field label="Arrangement">
                        <select
                          value={clip.layout}
                          onChange={(e) =>
                            editClip((c) => {
                              c.layout = e.target.value;
                            }, 'Layout updated')
                          }
                        >
                          {engine.layouts.map((layout) => (
                            <option key={layout} value={layout}>
                              {pretty(layout)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={!!clip.mixFonts}
                          onChange={(e) =>
                            editClip((c) => {
                              c.mixFonts = e.target.checked;
                            })
                          }
                        />
                        Mix typefaces deterministically
                      </label>
                    </section>
                  </>
                )}
                {visual && (
                  <section className="inspector-section">
                    <h3>{clip.type === 'shape' ? 'Shape geometry' : 'Image geometry'}</h3>
                    {clip.shape && (
                      <>
                        <Field label="Shape">
                          <select
                            aria-label="Shape"
                            value={clip.shape.kind}
                            onChange={(e) =>
                              editClip((c) => {
                                c.shape!.kind = e.target.value as NonNullable<
                                  Clip['shape']
                                >['kind'];
                              })
                            }
                          >
                            {['rectangle', 'ellipse', 'triangle', 'star', 'polygon', 'line'].map(
                              (kind) => (
                                <option key={kind}>{kind}</option>
                              ),
                            )}
                          </select>
                        </Field>
                        <div className="field-grid">
                          <Field label="Fill">
                            <input
                              type="color"
                              value={
                                clip.shape.fill === 'none'
                                  ? '#c4a2ff'
                                  : clip.shape.fill || '#c4a2ff'
                              }
                              onChange={(e) =>
                                editClip((c) => {
                                  c.shape!.fill = e.target.value;
                                })
                              }
                            />
                          </Field>
                          <Field label="Stroke">
                            <input
                              type="color"
                              value={
                                clip.shape.stroke === 'none'
                                  ? '#c4a2ff'
                                  : clip.shape.stroke || '#c4a2ff'
                              }
                              onChange={(e) =>
                                editClip((c) => {
                                  c.shape!.stroke = e.target.value;
                                })
                              }
                            />
                          </Field>
                        </div>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={clip.shape.fill === 'none'}
                            onChange={(e) =>
                              editClip((c) => {
                                c.shape!.fill = e.target.checked ? 'none' : '#c4a2ff';
                              })
                            }
                          />
                          No fill
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={clip.shape.stroke !== 'none' && !!clip.shape.stroke}
                            onChange={(e) =>
                              editClip((c) => {
                                c.shape!.stroke = e.target.checked ? '#c4a2ff' : 'none';
                              })
                            }
                          />
                          Outline
                        </label>
                        <NumberField
                          label="Stroke width"
                          value={clip.shape.strokeWidth ?? 2}
                          min={0}
                          max={500}
                          onChange={(n) =>
                            editClip((c) => {
                              c.shape!.strokeWidth = n;
                            })
                          }
                        />
                        {clip.shape.kind === 'rectangle' && (
                          <NumberField
                            label="Corner radius"
                            value={clip.shape.radius ?? 0}
                            min={0}
                            max={500}
                            onChange={(n) =>
                              editClip((c) => {
                                c.shape!.radius = n;
                              })
                            }
                          />
                        )}
                        {['star', 'polygon'].includes(clip.shape.kind) && (
                          <NumberField
                            label="Points / sides"
                            value={clip.shape.sides ?? 5}
                            min={3}
                            max={32}
                            onChange={(n) =>
                              editClip((c) => {
                                c.shape!.sides = n;
                              })
                            }
                          />
                        )}
                        {clip.shape.kind === 'star' && (
                          <NumberField
                            label="Inner radius"
                            value={clip.shape.innerRadius ?? 0.45}
                            min={0.05}
                            max={0.95}
                            step={0.05}
                            onChange={(n) =>
                              editClip((c) => {
                                c.shape!.innerRadius = n;
                              })
                            }
                          />
                        )}
                      </>
                    )}
                    {clip.image && (
                      <>
                        <Field label="Image fit">
                          <select
                            value={clip.image.fit || 'contain'}
                            onChange={(e) =>
                              editClip((c) => {
                                c.image!.fit = e.target.value as 'contain' | 'cover' | 'stretch';
                              })
                            }
                          >
                            {['contain', 'cover', 'stretch'].map((fit) => (
                              <option key={fit}>{fit}</option>
                            ))}
                          </select>
                        </Field>
                        <p className="hint">
                          Embedded in your project and standalone player. PNG, JPEG and WebP are
                          supported.
                        </p>
                      </>
                    )}
                    <div className="field-grid">
                      {(['width', 'height'] as const).map((key) => (
                        <NumberField
                          key={key}
                          label={pretty(key)}
                          value={(clip.shape || clip.image)![key]}
                          min={1}
                          max={4096}
                          suffix="px"
                          onChange={(n) =>
                            editClip((c) => {
                              (c.shape || c.image)![key] = n;
                            })
                          }
                        />
                      ))}
                    </div>
                    <NumberField
                      label="Scale"
                      value={style.size}
                      min={0.25}
                      max={4}
                      step={0.05}
                      onChange={(n) => setStyle('size', n)}
                    />
                    <div className="field-grid">
                      <NumberField
                        label="Offset X"
                        value={style.dx}
                        suffix="px"
                        onChange={(n) => setStyle('dx', n)}
                      />
                      <NumberField
                        label="Offset Y"
                        value={style.dy}
                        suffix="px"
                        onChange={(n) => setStyle('dy', n)}
                      />
                    </div>
                    <NumberField
                      label="Rotation"
                      value={style.rotation}
                      suffix="°"
                      onChange={(n) => setStyle('rotation', n)}
                    />
                  </section>
                )}
                <section className="inspector-section">
                  <h3>Timing & layer</h3>
                  <div className="field-grid">
                    <NumberField
                      label="Start"
                      value={(clip.start || 0) / 1000}
                      min={0}
                      step={0.1}
                      suffix="s"
                      onChange={(n) =>
                        editClip((c, s) => {
                          c.start = Math.round(n * 1000);
                          ensureEnd(s);
                        })
                      }
                    />
                    <NumberField
                      label="Duration"
                      value={clip.duration / 1000}
                      min={1}
                      max={60}
                      step={0.1}
                      suffix="s"
                      onChange={(n) =>
                        editClip((c, s) => {
                          resizeClip(c, Math.round(n * 1000));
                          ensureEnd(s);
                        })
                      }
                    />
                  </div>
                  <Field label="Layer">
                    <select
                      value={clip.layer}
                      onChange={(e) =>
                        editClip((c) => {
                          c.layer = e.target.value;
                        })
                      }
                    >
                      {layers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name || l.id}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="field-grid">
                    <Button icon="duplicate" onClick={duplicateClip}>
                      Duplicate
                    </Button>
                    <Button icon="trash" disabled={score.scenes.length === 1} onClick={removeClip}>
                      Remove
                    </Button>
                  </div>
                </section>
              </>
            )}
            {inspectorTab === 'motion' && (
              <>
                <section className="inspector-section">
                  <h3>
                    Effect stack <span>{effects.length} effects</span>
                  </h3>
                  <div className="effect-stack">
                    {effects.map((fx, i) => (
                      <button
                        key={fx.id}
                        className={activeEffect?.id === fx.id ? 'active' : ''}
                        onClick={() => setEffectId(fx.id)}
                      >
                        <span className="effect-order">{String(i + 1).padStart(2, '0')}</span>
                        <span>
                          <strong>
                            {engine.definition(score, fx.use)?.path
                              ? 'Bézier path'
                              : pretty(fx.use)}
                          </strong>
                          <small>
                            {fx.select?.ids ? `${fx.select.ids.length} targets` : 'All characters'}{' '}
                            · {engine.definition(score, fx.use).kind}
                          </small>
                        </span>
                        <Icon name="chevron" size={12} />
                      </button>
                    ))}
                  </div>
                  {!effects.length && (
                    <p className="empty">
                      Choose an effect from the library to start a little magic.
                    </p>
                  )}
                </section>
                {activeEffect && def && (
                  <>
                    <section className="inspector-section">
                      <h3>
                        {def?.path ? 'Bézier path' : pretty(activeEffect.use)}
                        <div className="stack-actions">
                          <Button title="Move effect up" onClick={() => reorderEffect(-1)}>
                            ↑
                          </Button>
                          <Button title="Move effect down" onClick={() => reorderEffect(1)}>
                            ↓
                          </Button>
                          <Button icon="trash" title="Remove effect" onClick={removeEffect} />
                        </div>
                      </h3>
                      <Field label="Targets">
                        <select
                          value={
                            activeEffect.select?.ids
                              ? 'custom'
                              : activeEffect.select?.every
                                ? 'alternate'
                                : 'all'
                          }
                          onChange={(e) => {
                            if (e.target.value === 'selected' && !selected.length) {
                              setStatus('Select characters in the preview first.');
                              return;
                            }
                            changeEffect((f) => {
                              if (e.target.value === 'all') delete f.select;
                              if (e.target.value === 'selected') f.select = { ids: [...selected] };
                              if (e.target.value === 'alternate') f.select = { every: 2 };
                            });
                          }}
                        >
                          <option value="all">All characters</option>
                          <option value="selected">Selected characters</option>
                          <option value="alternate">Every other character</option>
                          {activeEffect.select?.ids && (
                            <option value="custom">
                              {activeEffect.select.ids.length} selected targets
                            </option>
                          )}
                        </select>
                      </Field>
                      {def.kind === 'motion' && (
                        <>
                          <div className="field-grid">
                            <Field label="Phase">
                              <select
                                value={activeEffect.phase || def.phase || 'enter'}
                                onChange={(e) =>
                                  changeEffect((f) => {
                                    f.phase = e.target.value;
                                  })
                                }
                              >
                                {['enter', 'loop', 'exit'].map((phase) => (
                                  <option key={phase}>{phase}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Group by">
                              <select
                                value={activeEffect.each || 'character'}
                                onChange={(e) =>
                                  changeEffect((f) => {
                                    f.each = e.target.value;
                                  })
                                }
                              >
                                {['character', 'word', 'phrase'].map((each) => (
                                  <option key={each}>{each}</option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <div className="field-grid">
                            <NumberField
                              label="Duration"
                              value={activeEffect.duration ?? def.duration ?? 1000}
                              min={1}
                              max={60000}
                              step={50}
                              suffix="ms"
                              onChange={(n) =>
                                changeEffect((f) => {
                                  f.duration = n;
                                })
                              }
                            />
                            <NumberField
                              label="Stagger"
                              value={activeEffect.stagger || 0}
                              min={0}
                              max={60000}
                              step={10}
                              suffix="ms"
                              onChange={(n) =>
                                changeEffect((f) => {
                                  f.stagger = n;
                                })
                              }
                            />
                          </div>
                          <div className="field-grid">
                            <Field label="Order">
                              <select
                                value={activeEffect.order || 'forward'}
                                onChange={(e) =>
                                  changeEffect((f) => {
                                    f.order = e.target.value;
                                  })
                                }
                              >
                                {['forward', 'reverse', 'center', 'random'].map((order) => (
                                  <option key={order}>{order}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Clock">
                              <select
                                value={activeEffect.anchor || 'scene'}
                                onChange={(e) =>
                                  changeEffect((f) => {
                                    f.anchor = e.target.value;
                                  })
                                }
                              >
                                <option value="scene">Clip</option>
                                <option value="unit">Vocal unit</option>
                              </select>
                            </Field>
                          </div>
                          <NumberField
                            label="Start offset"
                            value={activeEffect.at ?? 0}
                            min={0}
                            max={60000}
                            suffix="ms"
                            onChange={(n) =>
                              changeEffect((f) => {
                                f.at = n;
                              })
                            }
                          />
                          <Button
                            className="text-button"
                            onClick={() =>
                              changeEffect((f) => {
                                delete f.at;
                              })
                            }
                          >
                            Use automatic {activeEffect.phase || def.phase || 'enter'} timing
                          </Button>
                        </>
                      )}
                      {def.phase !== 'loop' && !def.keyframes && (
                        <BezierEditor
                          label="Animation easing"
                          value={activeEffect.ease}
                          allowDefault
                          onChange={(ease) =>
                            changeEffect((f) => {
                              if (ease === undefined) delete f.ease;
                              else f.ease = ease;
                            })
                          }
                        />
                      )}
                      {Object.entries(def.controls || {}).map(([key, control]) => (
                        <Field key={key} label={control.label || pretty(key)}>
                          <div className="slider-control">
                            <input
                              type="range"
                              min={control.min ?? 0}
                              max={control.max ?? 100}
                              step={control.step ?? 0.1}
                              value={activeEffect.params?.[key] ?? def.defaults?.[key] ?? 0}
                              onChange={(e) =>
                                changeEffect((f) => {
                                  f.params = { ...f.params, [key]: Number(e.target.value) };
                                })
                              }
                            />
                            <span>
                              {(activeEffect.params?.[key] ?? def.defaults?.[key] ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </Field>
                      ))}
                      <p className="hint">
                        Transforms compose in stack order. Word and phrase groups move around their
                        shared center.
                      </p>
                    </section>
                  </>
                )}
                <section className="inspector-section">
                  <h3>Motion intensity</h3>
                  <div className="slider-control">
                    <input
                      aria-label="Global motion intensity"
                      type="range"
                      min="0"
                      max="1.6"
                      step=".05"
                      value={score.motion ?? 1}
                      onChange={(e) =>
                        commit((s) => {
                          s.motion = Number(e.target.value);
                        })
                      }
                    />
                    <span>{Math.round((score.motion ?? 1) * 100)}%</span>
                  </div>
                </section>
              </>
            )}
            {inspectorTab === 'keys' && (
              <>
                <section className="inspector-section">
                  <h3>Bézier motion path</h3>
                  {!pathEffect && (
                    <>
                      <Button icon="plus" onClick={addPath}>
                        Add Bézier path
                      </Button>
                      <p className="hint">
                        Move the whole clip along a curved route. Works with text, shapes and
                        images.
                      </p>
                    </>
                  )}
                  {pathEffect && pathDef?.path && (
                    <>
                      <MotionPathEditor
                        path={pathDef.path}
                        onChange={(path) =>
                          editClip((c, s) => {
                            s.effects![pathEffect.use].path = path;
                          }, 'Motion path updated')
                        }
                      />
                      <BezierEditor
                        label="Path timing"
                        value={pathEffect.ease ?? pathDef.ease}
                        onChange={(ease) =>
                          editClip((c) => {
                            c.animations!.find((f) => f.use === pathEffect.use)!.ease =
                              ease || 'linear';
                          })
                        }
                      />
                      <NumberField
                        label="Path duration"
                        value={(pathEffect.duration || clip.duration) / 1000}
                        min={0.1}
                        max={60}
                        step={0.1}
                        suffix="s"
                        onChange={(n) =>
                          editClip((c) => {
                            c.animations!.find((f) => f.use === pathEffect.use)!.duration =
                              n * 1000;
                          })
                        }
                      />
                      <Button
                        icon="trash"
                        onClick={() =>
                          editClip((c) => {
                            c.animations = c.animations!.filter(
                              (f) => f !== c.animations!.find((x) => x.use === pathEffect.use),
                            );
                          })
                        }
                      >
                        Remove path
                      </Button>
                    </>
                  )}
                </section>
                <section className="inspector-section">
                  <h3>
                    Transform keyframes <Icon name="diamond" size={12} />
                  </h3>
                  <p className="hint">
                    Set values at the playhead. Your animation is stored as data and runs in the
                    vanilla renderer.
                  </p>
                  <Field label="Property">
                    <select
                      value={property}
                      onChange={(e) => {
                        setProperty(e.target.value);
                        setFrameIndex(0);
                        setKeyValue(neutral(e.target.value));
                      }}
                    >
                      {keyProps.map((p) => (
                        <option key={p} value={p}>
                          {
                            (
                              {
                                x: 'Position X',
                                y: 'Position Y',
                                rotation: 'Rotation (radians)',
                                sx: 'Scale X',
                                sy: 'Scale Y',
                                opacity: 'Opacity',
                                blur: 'Blur',
                                reveal: 'Reveal',
                              } as Record<string, string>
                            )[p]
                          }
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="key-clock">
                    <Icon name="diamond" />
                    <span>
                      Clip time <strong>{seconds(Math.max(0, time - (clip.start || 0)))}</strong>
                    </span>
                  </div>
                  <NumberField
                    label="Value at playhead"
                    value={keyValue}
                    step={
                      ['opacity', 'sx', 'sy', 'rotation', 'reveal'].includes(property) ? 0.05 : 1
                    }
                    onChange={setKeyValue}
                  />
                  <Button icon="plus" className="key-add" onClick={addKeyframe}>
                    Add / update keyframe
                  </Button>
                  <div className="graph">
                    <div className="graph-label">VALUE OVER TIME</div>
                    <svg
                      viewBox="0 0 240 105"
                      role="img"
                      aria-label={`${pretty(property)} keyframe graph`}
                    >
                      <path
                        d="M0 25h240M0 50h240M0 75h240M60 0v100M120 0v100M180 0v100"
                        stroke="#34343b"
                        strokeWidth=".5"
                      />
                      {frames.length > 0 &&
                        (() => {
                          const values = frames.map((f) => f.value),
                            min = Math.min(...values) - 1,
                            max = Math.max(...values) + 1;
                          const points = frames.map((f) => ({
                            x: (f.time / clip.duration) * 240,
                            y: 90 - ((f.value - min) / (max - min)) * 75,
                          }));
                          const curve = Array.from({ length: 121 }, (_, i) => {
                            const x = i * 2,
                              y =
                                90 -
                                ((engine.keyframeValue(frames, (clip.duration * i) / 120) - min) /
                                  (max - min)) *
                                  75;
                            return `${i ? 'L' : 'M'}${x},${y}`;
                          }).join(' ');
                          return (
                            <>
                              <path d={curve} fill="none" stroke="#bea1ff" strokeWidth="2" />
                              {points.map((p, i) => (
                                <circle
                                  key={i}
                                  cx={p.x}
                                  cy={p.y}
                                  r={frameIndex === i ? 5 : 3}
                                  fill={frameIndex === i ? '#f5ecff' : '#bea1ff'}
                                  onClick={() => {
                                    setFrameIndex(i);
                                    pause();
                                    seek((clip.start || 0) + frames[i].time);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                              ))}
                            </>
                          );
                        })()}
                      <path
                        d={`M${Math.max(0, Math.min(240, ((time - (clip.start || 0)) / clip.duration) * 240))} 0v100`}
                        stroke="#74d7cb"
                        strokeWidth="1"
                      />
                    </svg>
                    <div className="graph-axis">
                      <span>0s</span>
                      <span>{seconds(clip.duration)}</span>
                    </div>
                  </div>
                  <div className="key-list">
                    {frames.map((f, i) => (
                      <button
                        key={i}
                        className={frameIndex === i ? 'active' : ''}
                        onClick={() => {
                          setFrameIndex(i);
                          pause();
                          seek((clip.start || 0) + f.time);
                        }}
                      >
                        <Icon name="diamond" size={12} />
                        <span>{seconds(f.time)}</span>
                        <strong>{f.value.toFixed(2)}</strong>
                        <small>{Array.isArray(f.ease) ? 'Bézier' : f.ease || 'linear'}</small>
                      </button>
                    ))}
                  </div>
                  {!frames.length && (
                    <p className="empty">No keyframes yet. Try Y: 100 at 0s, then Y: 0 at 1.5s.</p>
                  )}
                  {chosenFrame && (
                    <>
                      <div className="field-grid">
                        <NumberField
                          label="Keyframe time"
                          value={chosenFrame.time / 1000}
                          min={0}
                          max={clip.duration / 1000}
                          step={0.1}
                          suffix="s"
                          onChange={(n) =>
                            updateFrames((list) => {
                              list[frameIndex].time = Math.round(n * 1000);
                            })
                          }
                        />
                        <NumberField
                          label="Keyframe value"
                          value={chosenFrame.value}
                          step={0.05}
                          onChange={(n) =>
                            updateFrames((list) => {
                              list[frameIndex].value = n;
                            })
                          }
                        />
                      </div>
                      <BezierEditor
                        label="Interpolation to next key"
                        value={chosenFrame.ease}
                        onChange={(ease) =>
                          updateFrames((list) => {
                            list[frameIndex].ease = ease || 'linear';
                          })
                        }
                      />
                      <Button
                        icon="trash"
                        onClick={() => {
                          updateFrames((list) => {
                            list.splice(frameIndex, 1);
                          });
                          setFrameIndex(0);
                        }}
                      >
                        Delete keyframe
                      </Button>
                    </>
                  )}
                </section>
              </>
            )}
            {inspectorTab === 'stage' && (
              <>
                <section className="inspector-section">
                  <h3>Composition settings</h3>
                  <div className="field-grid">
                    <NumberField
                      label="Width"
                      value={score.stage!.width}
                      min={64}
                      max={7680}
                      step={10}
                      suffix="px"
                      onChange={(n) =>
                        commit((s) => {
                          s.stage!.width = n;
                        })
                      }
                    />
                    <NumberField
                      label="Height"
                      value={score.stage!.height}
                      min={64}
                      max={4320}
                      step={10}
                      suffix="px"
                      onChange={(n) =>
                        commit((s) => {
                          s.stage!.height = n;
                        })
                      }
                    />
                  </div>
                  <Field label="Resolution preset">
                    <select
                      value={`${score.stage!.width}x${score.stage!.height}`}
                      onChange={(e) => {
                        const [width, height] = e.target.value.split('x').map(Number);
                        commit((s) => {
                          s.stage = { ...s.stage!, width, height };
                        });
                      }}
                    >
                      <option value={`${score.stage!.width}x${score.stage!.height}`}>
                        Current · {score.stage!.width} × {score.stage!.height}
                      </option>
                      <option value="1280x720">HD · 1280 × 720</option>
                      <option value="1920x1080">Full HD · 1920 × 1080</option>
                      <option value="1080x1920">Portrait · 1080 × 1920</option>
                      <option value="1080x1080">Square · 1080 × 1080</option>
                    </select>
                  </Field>
                  <div className="field-grid">
                    <Field label="Frame rate">
                      <select
                        value={score.stage!.fps}
                        onChange={(e) =>
                          commit((s) => {
                            s.stage!.fps = Number(e.target.value);
                          })
                        }
                      >
                        {[24, 25, 30, 50, 60].map((fps) => (
                          <option key={fps} value={fps}>
                            {fps} fps
                          </option>
                        ))}
                      </select>
                    </Field>
                    <NumberField
                      label="Song end"
                      value={duration / 1000}
                      step={0.1}
                      suffix="s"
                      onChange={(n) =>
                        commit((s) => {
                          s.duration = Math.round(n * 1000);
                        })
                      }
                    />
                  </div>
                  <NumberField
                    label="Random seed"
                    value={score.seed}
                    onChange={(n) =>
                      commit((s) => {
                        s.seed = n;
                      })
                    }
                  />
                </section>
                <section className="inspector-section">
                  <h3>Background</h3>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={!!score.background?.transparent}
                      onChange={(e) =>
                        commit((s) => {
                          s.background = e.target.checked
                            ? { ...s.background, transparent: true }
                            : { hue: 190, backdrop: 'rings', ...s.background, transparent: false };
                        })
                      }
                    />
                    Transparent background
                  </label>
                  <p className="hint">
                    No background by default. Place your own image or video behind the player in
                    OBS, or turn transparency off to use a preset.
                  </p>
                  <Field label="Backdrop">
                    <select
                      disabled={!!score.background?.transparent}
                      value={score.background?.backdrop || 'rings'}
                      onChange={(e) =>
                        commit((s) => {
                          s.background!.backdrop = e.target.value;
                        })
                      }
                    >
                      {['rings', 'waves', 'grid', 'rays'].map((bg) => (
                        <option key={bg}>{bg}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Theme">
                    <select
                      disabled={!!score.background?.transparent}
                      value={score.background?.theme || 'dark'}
                      onChange={(e) =>
                        commit((s) => {
                          s.background!.theme = e.target.value;
                        })
                      }
                    >
                      <option value="dark">Midnight</option>
                      <option value="paper">Warm paper</option>
                    </select>
                  </Field>
                  <Field label="Hue">
                    <input
                      aria-label="Background hue"
                      disabled={!!score.background?.transparent}
                      type="range"
                      min="0"
                      max="360"
                      value={score.background?.hue ?? 190}
                      onChange={(e) =>
                        commit((s) => {
                          s.background!.hue = Number(e.target.value);
                        })
                      }
                    />
                  </Field>
                </section>
                <section className="inspector-section">
                  <h3>Selected layer</h3>
                  <Field label="Name">
                    <input
                      key={focusLayer.id + focusLayer.name}
                      defaultValue={focusLayer.name || focusLayer.id}
                      onBlur={(e) =>
                        commit((s) => {
                          s.layers!.find((l) => l.id === focusLayer.id)!.name = e.target.value;
                        })
                      }
                    />
                  </Field>
                  <Field label="Region">
                    <select
                      value={JSON.stringify(focusLayer.rect || [0, 0, 1, 1])}
                      onChange={(e) =>
                        commit((s) => {
                          s.layers!.find((l) => l.id === focusLayer.id)!.rect = JSON.parse(
                            e.target.value,
                          );
                        })
                      }
                    >
                      {[
                        [[0, 0, 1, 1], 'Full stage'],
                        [[0, 0, 0.5, 1], 'Left half'],
                        [[0.5, 0, 0.5, 1], 'Right half'],
                        [[0, 0, 1, 0.5], 'Top half'],
                        [[0, 0.5, 1, 0.5], 'Bottom half'],
                      ].map(([rect, label]) => (
                        <option key={String(label)} value={JSON.stringify(rect)}>
                          {String(label)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="field-grid">
                    <NumberField
                      label="Z order"
                      value={focusLayer.z ?? 0}
                      onChange={(n) =>
                        commit((s) => {
                          s.layers!.find((l) => l.id === focusLayer.id)!.z = n;
                        })
                      }
                    />
                    <NumberField
                      label="Opacity"
                      value={focusLayer.opacity ?? 1}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(n) =>
                        commit((s) => {
                          s.layers!.find((l) => l.id === focusLayer.id)!.opacity = n;
                        })
                      }
                    />
                  </div>
                  <div className="field-grid">
                    {(focusLayer.rect || [0, 0, 1, 1]).map((value, i) => (
                      <NumberField
                        key={i}
                        label={['Region X', 'Region Y', 'Region width', 'Region height'][i]}
                        value={value}
                        min={i < 2 ? 0 : 0.01}
                        max={1}
                        step={0.01}
                        onChange={(n) =>
                          commit((s) => {
                            const layer = s.layers!.find((l) => l.id === focusLayer.id)!;
                            layer.rect ??= [0, 0, 1, 1];
                            layer.rect[i] = n;
                          })
                        }
                      />
                    ))}
                  </div>
                  <Button icon="plus" onClick={addLayer}>
                    Add layer
                  </Button>
                </section>
              </>
            )}
          </div>
          <div className="inspector-foot">
            <Icon name="bolt" size={12} />
            <span>Deterministic. Seek anywhere.</span>
          </div>
        </aside>
      </div>
      <section className="timeline-panel" aria-label="Composition timeline">
        <div className="timeline-toolbar">
          <div>
            <Icon name="layers" />
            <strong>Timeline</strong>
            <span className="timeline-count">{score.scenes.length} clips</span>
            <span className="separator" />
            <Button icon="plus" onClick={addClip}>
              Text
            </Button>
            <Button icon="plus" onClick={() => addVisual('shape')}>
              Shape
            </Button>
            <Button icon="plus" onClick={() => imageInput.current?.click()}>
              Image
            </Button>
            <Button icon="music" onClick={() => audioInput.current?.click()}>
              Audio
            </Button>
            <Button icon="layers" title="Add layer" onClick={addLayer} />
          </div>
          <div className="timeline-right">
            <span>{seconds(time)}</span>
            <span className="separator" />
            <span className="zoom-label">−</span>
            <input
              aria-label="Timeline zoom"
              type="range"
              min=".5"
              max="5"
              step=".1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span className="zoom-label">+</span>
            <Button
              icon="frame"
              title="Fit timeline"
              onClick={() => {
                setZoom(1);
                timelineScroll.current?.scrollTo({ left: 0 });
              }}
            />
          </div>
        </div>
        <div className="timeline-scroll" ref={timelineScroll}>
          <div className="timeline-content" style={{ width: totalWidth + 188 }}>
            <div className="timeline-row ruler-row">
              <div className="track-label ruler-label">
                <span>LAYER / SOURCE</span>
                <span>◈</span>
              </div>
              <div
                className="time-ruler"
                style={{ width: totalWidth }}
                onPointerDown={(e) => {
                  pause();
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * duration);
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * duration);
                  }
                }}
              >
                {Array.from({ length: Math.max(9, Math.round(zoom * 12)) }, (_, i) => {
                  const n = Math.max(9, Math.round(zoom * 12));
                  return (
                    <span key={i} style={{ left: `${(i / (n - 1)) * 100}%` }}>
                      {(((duration / 1000) * i) / (n - 1)).toFixed(duration < 30000 ? 1 : 0)}
                      <small>s</small>
                    </span>
                  );
                })}
                <div className="playhead-handle" style={{ left: `${(time / duration) * 100}%` }} />
              </div>
            </div>
            {layers.map((layer, li) => {
              const clips = timeline.clips
                .filter((c) => c.layer === layer.id)
                .sort((a, b) => a.start - b.start);
              const ends: number[] = [];
              const seats = new Map<string, number>();
              clips.forEach((c) => {
                let seat = ends.findIndex((end) => end <= c.start);
                if (seat < 0) seat = ends.length;
                ends[seat] = c.end;
                seats.set(c.id, seat);
              });
              return (
                <div className="timeline-row" key={layer.id}>
                  <div
                    className="track-label"
                    style={{ minHeight: Math.max(1, ends.length) * 40 + 16 }}
                  >
                    <Button
                      icon={layer.visible === false ? 'hidden' : 'eye'}
                      title={`Toggle ${layer.name || layer.id} visibility`}
                      onClick={() =>
                        commit((s) => {
                          const edited = s.layers!.find((l) => l.id === layer.id)!;
                          edited.visible = edited.visible === false;
                        }, 'Layer visibility updated')
                      }
                    />
                    <span className="track-index">{String(li + 1).padStart(2, '0')}</span>
                    <Icon name="layers" size={13} />
                    <strong>{layer.name || layer.id}</strong>
                  </div>
                  <div
                    className={`clip-lane ${layer.visible === false ? 'muted-layer' : ''}`}
                    style={{ width: totalWidth, height: Math.max(1, ends.length) * 40 + 16 }}
                    onPointerDown={(e) => {
                      if (e.target === e.currentTarget) {
                        pause();
                        const rect = e.currentTarget.getBoundingClientRect();
                        seek(((e.clientX - rect.left) / rect.width) * duration);
                      }
                    }}
                  >
                    {clips.map((c) => {
                      const index = score.scenes.findIndex((s) => s.id === c.id),
                        preview = dragPreview?.id === c.id ? dragPreview : c,
                        cc = palette[index % palette.length];
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Clip ${c.name || c.id}`}
                          key={c.id}
                          className={`timeline-clip ${clip.id === c.id ? 'selected' : ''}`}
                          style={
                            {
                              left: `${(preview.start / duration) * 100}%`,
                              width: `${(preview.duration / duration) * 100}%`,
                              top: (seats.get(c.id) || 0) * 40 + 8,
                              '--clip-color': cc,
                            } as React.CSSProperties
                          }
                          onClick={() => selectClip(c.id, false)}
                          onDoubleClick={() => {
                            selectClip(c.id);
                            setInspectorTab('clip');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              selectClip(c.id);
                            }
                          }}
                          onPointerDown={(e) => beginClipDrag(e, c.id, 'move')}
                        >
                          <span
                            className="trim-handle left"
                            aria-label="Trim clip start"
                            onPointerDown={(e) => beginClipDrag(e, c.id, 'start')}
                          />
                          <span className="clip-content">
                            <span>
                              {c.type === 'shape' ? '◈' : c.type === 'image' ? '▧' : 'Aa'}
                            </span>
                            {c.type === 'shape' || c.type === 'image'
                              ? c.name || pretty(c.type)
                              : engine.contentText(c.content)}
                          </span>
                          <span className="clip-duration">{seconds(preview.duration)}</span>
                          <span
                            className="trim-handle right"
                            aria-label="Trim clip end"
                            onPointerDown={(e) => beginClipDrag(e, c.id, 'end')}
                          />
                        </div>
                      );
                    })}
                    <div
                      className="timeline-playhead"
                      style={{ left: `${(time / duration) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="timeline-row audio-row">
              <div className="track-label">
                <Icon name="music" size={14} />
                <strong>{audioName || 'Audio track'}</strong>
                {audioName ? (
                  <Button
                    icon="close"
                    title="Remove audio"
                    onClick={() => {
                      pause();
                      audio.current!.removeAttribute('src');
                      audio.current!.load();
                      URL.revokeObjectURL(audioURL.current);
                      audioURL.current = '';
                      setAudioName('');
                      setWaveform([]);
                    }}
                  />
                ) : (
                  <Button
                    icon="plus"
                    title="Load audio"
                    onClick={() => audioInput.current?.click()}
                  />
                )}
              </div>
              <div
                className="audio-lane"
                style={{ width: totalWidth }}
                onClick={(e) => {
                  pause();
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * duration);
                }}
              >
                {waveform.length ? (
                  <svg viewBox="0 0 800 40" preserveAspectRatio="none" aria-label="Audio waveform">
                    {waveform.map((peak, i) => (
                      <path
                        key={i}
                        d={`M${i} ${20 - peak * 18}v${peak * 36}`}
                        stroke="#70bfb2"
                        strokeWidth=".7"
                      />
                    ))}
                  </svg>
                ) : (
                  <button onClick={() => audioInput.current?.click()}>
                    <Icon name="music" size={13} />
                    Bring your own audio · WAV, MP3, OGG
                  </button>
                )}
                <div
                  className="timeline-playhead"
                  style={{ left: `${(time / duration) * 100}%` }}
                />
              </div>
            </div>
            {keyedDef &&
              Object.entries(keyedDef.keyframes || {}).map(([prop, list]) => (
                <div className="timeline-row key-row" key={prop}>
                  <div className="track-label">
                    <Icon name="diamond" size={12} />
                    <strong>{pretty(prop)}</strong>
                    <span className="muted">{list.length} keys</span>
                  </div>
                  <div className="key-lane" style={{ width: totalWidth }}>
                    {list.map((f, i) => (
                      <button
                        key={i}
                        aria-label={`${prop} keyframe at ${seconds(f.time)}`}
                        className="timeline-key"
                        style={{ left: `${(((clip.start || 0) + f.time) / duration) * 100}%` }}
                        onClick={() => {
                          setProperty(prop);
                          setFrameIndex(i);
                          setInspectorTab('keys');
                          pause();
                          seek((clip.start || 0) + f.time);
                        }}
                      >
                        <Icon name="diamond" size={12} />
                      </button>
                    ))}
                    <div
                      className="timeline-playhead"
                      style={{ left: `${(time / duration) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>
      <footer className="statusbar">
        <span role="status">
          <span className="tiny-dot" />
          {status}
        </span>
        <div>
          <label className="obs-sync">
            <input
              type="checkbox"
              checked={broadcast}
              onChange={(e) => {
                broadcastRef.current = e.target.checked;
                setBroadcast(e.target.checked);
                if (e.target.checked) {
                  send('load', { score: scoreRef.current });
                  send(playingRef.current ? 'play' : 'seek', { time: timeRef.current });
                }
              }}
            />
            <span>{relayConnected ? 'OBS relay connected ·' : 'Sync local player'}</span>
          </label>
          <a href="/player.html?autoplay=0" target="_blank" rel="noreferrer">
            <Icon name="eye" size={12} />
            Player
          </a>
          <button onClick={() => setModal('help')}>⌨ Shortcuts</button>
          <span className="version">LILT / 04</span>
        </div>
      </footer>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 8_000_000) throw Error('Score exceeds 8 MB including images.');
            applyProject(JSON.parse(await f.text()));
          } catch (error) {
            setStatus((error as Error).message);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            setStatus('Embedding image…');
            const asset = await embedImage(file);
            addVisual('image', asset);
          } catch (error) {
            setStatus((error as Error).message);
          }
        }}
      />
      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadAudio(f);
          e.target.value = '';
        }}
      />
      {restore && (
        <div className="restore-banner">
          <Icon name="save" />
          <span>
            A saved project uses custom JavaScript. Restore it only if you trust its code.
          </span>
          <Button
            onClick={() => {
              try {
                const definitions = Object.fromEntries(
                  Object.entries(restore.packSources).map(([id, text]) => [
                    id,
                    new Function(`"use strict";return (${text}\n)`)(),
                  ]),
                );
                engine.registerPack({ id: 'user', version: '1.0.0', effects: definitions });
                engine.validate(restore.score);
                setPackSources(restore.packSources);
                applyProject(restore.score);
                setRestore(null);
              } catch (error) {
                setStatus((error as Error).message);
              }
            }}
          >
            Restore & run trusted code
          </Button>
          <Button icon="close" title="Dismiss saved project" onClick={() => setRestore(null)} />
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={`modal ${modal === 'json' || modal === 'code' ? 'wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setModal(null);
            }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">LILT STUDIO</span>
                <h2 id="modal-title">
                  {
                    {
                      export: 'Out into the world.',
                      code: 'Write your own motion.',
                      json: 'The score behind the scene.',
                      help: 'A little help, a lot of possibility.',
                    }[modal]
                  }
                </h2>
              </div>
              <Button icon="close" title="Close dialog" onClick={() => setModal(null)} />
            </div>
            {modal === 'export' && (
              <>
                <p className="modal-description">
                  Your composition, ready for a browser, a stream, or another project.
                </p>
                <button className="export-option" onClick={() => void exportHTML()}>
                  <span className="export-icon">
                    <Icon name="film" size={24} />
                  </span>
                  <span>
                    <strong>Standalone player</strong>
                    <small>
                      A single HTML file. Renderer, fonts, score, and custom effects included.
                    </small>
                  </span>
                  <Icon name="download" />
                </button>
                <button className="export-option" onClick={exportScore}>
                  <span className="export-icon">
                    <Icon name="code" size={24} />
                  </span>
                  <span>
                    <strong>Score JSON</strong>
                    <small>Lightweight animation data. Keep code and fonts separate.</small>
                  </span>
                  <Icon name="download" />
                </button>
                <button className="export-option" onClick={snapshot}>
                  <span className="export-icon">
                    <Icon name="frame" size={24} />
                  </span>
                  <span>
                    <strong>Current frame</strong>
                    <small>PNG from the preview canvas, without editor guides.</small>
                  </span>
                  <Icon name="download" />
                </button>
                {Object.keys(packSources).length > 0 && (
                  <button
                    className="export-option"
                    onClick={() =>
                      download(
                        `Lilt3.registerPack({id:'user',version:'1.0.0',effects:{${Object.entries(
                          packSources,
                        )
                          .map(([id, src]) => `${JSON.stringify(id)}:(${src})`)
                          .join(',')}});`,
                        'lilt-user-pack.js',
                        'text/javascript',
                      )
                    }
                  >
                    <span className="export-icon">
                      <Icon name="spark" size={24} />
                    </span>
                    <span>
                      <strong>Custom effect pack</strong>
                      <small>Reusable vanilla JavaScript definitions.</small>
                    </span>
                    <Icon name="download" />
                  </button>
                )}
                <div className="obs-note">
                  <Icon name="eye" />
                  <div>
                    <strong>Made for OBS Browser Sources</strong>
                    <p>
                      Export the player, enable “Local file” in OBS, and select the HTML. Match the
                      source size to {score.stage!.width} × {score.stage!.height}. The player is
                      transparent by default. Audio is separate.
                    </p>
                    <code>
                      {typeof location !== 'undefined' ? location.origin : ''}
                      /player.html?transparent=1
                    </code>
                    <p>
                      Run <code>npm run relay</code>, connect below, then use this OBS URL:{' '}
                      <code>
                        {typeof location !== 'undefined' ? location.origin : ''}
                        /player.html?autoplay=0&amp;socket={encodeURIComponent(relayURL)}
                      </code>
                      . A standalone HTML player accepts the same <code>?socket=</code> parameter.
                    </p>
                    <div className="relay-controls">
                      <input
                        aria-label="WebSocket relay URL"
                        value={relayURL}
                        onChange={(e) => setRelayURL(e.target.value)}
                        placeholder="ws://127.0.0.1:8787"
                      />
                      <Button icon={relayConnected ? 'check' : 'bolt'} onClick={connectRelay}>
                        {relayConnected ? 'Disconnect' : 'Connect relay'}
                      </Button>
                    </div>
                    <p>
                      “Sync local player” controls same-origin tabs in this browser. The relay
                      connects the studio to OBS on this computer.
                    </p>
                  </div>
                </div>
              </>
            )}
            {modal === 'json' && (
              <>
                <p className="modal-description">
                  Version 3 scores stay compatible. Keyframes and stage settings extend the format.
                </p>
                <textarea
                  className="code-editor"
                  aria-label="Score JSON"
                  spellCheck={false}
                  value={jsonDraft}
                  onChange={(e) => setJsonDraft(e.target.value)}
                />
                <div className="modal-actions">
                  <Button icon="download" onClick={exportScore}>
                    Export JSON
                  </Button>
                  <Button
                    icon="check"
                    className="primary"
                    onClick={() => {
                      try {
                        applyProject(JSON.parse(jsonDraft));
                      } catch (error) {
                        setStatus((error as Error).message);
                      }
                    }}
                  >
                    Validate & apply
                  </Button>
                </div>
              </>
            )}
            {modal === 'code' && (
              <>
                <p className="modal-description">
                  Custom templates use the same registry as the built-in effects. This runs trusted
                  JavaScript only when you click Register.
                </p>
                <Field label="Template name">
                  <input value={packName} onChange={(e) => setPackName(e.target.value)} />
                </Field>
                <textarea
                  className="code-editor"
                  aria-label="Custom effect JavaScript"
                  spellCheck={false}
                  value={packSource}
                  onChange={(e) => setPackSource(e.target.value)}
                />
                <div className="modal-actions">
                  <span className="hint">
                    Expose numeric parameters with <code>controls</code>.
                  </span>
                  <Button icon="bolt" className="primary" onClick={() => installPack()}>
                    Register trusted code
                  </Button>
                </div>
              </>
            )}
            {modal === 'help' && (
              <>
                <p className="modal-description">
                  Start with a clip, find its rhythm, and make every character feel intentional.
                </p>
                <div className="shortcut-list">
                  {[
                    ['Space', 'Play / pause'],
                    ['← / →', 'Step one frame'],
                    ['Shift + ← / →', 'Seek one second'],
                    ['Home', 'Go to start'],
                    ['⌘ / Ctrl + Z', 'Undo'],
                    ['⌘ / Ctrl + Shift + Z', 'Redo'],
                    ['⌘ / Ctrl + S', 'Save locally'],
                    ['Shift + click', 'Select multiple characters'],
                    ['Drag a clip', 'Move · snaps to 100 ms'],
                    ['Alt + drag', 'Move without snapping'],
                    ['Drag clip edges', 'Trim start / duration'],
                    ['Escape', 'Clear selection / close dialog'],
                  ].map(([key, action]) => (
                    <div key={key}>
                      <span>{action}</span>
                      <kbd>{key}</kbd>
                    </div>
                  ))}
                </div>
                <p className="hint">
                  The supplied Japanese lyrics have illustrative timing, not timing aligned to a
                  recording. Embedded fonts cover the supplied glyphs; other characters use system
                  fallback. Audio stays local and is not embedded in exports.
                </p>
                <a className="docs-link" href="/lilt/SOURCE-README.md" target="_blank">
                  Original model & pack documentation <Icon name="arrow" />
                </a>
              </>
            )}
            <div className="modal-status" role="status">
              {status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
