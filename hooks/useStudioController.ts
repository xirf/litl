'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useEditorPreferences } from '../lib/editor-preferences';
import { markerSchema, type Marker } from '../lib/markers';
import { useEditorShortcuts } from './useEditorShortcuts';
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
import {
  STORAGE,
  palette,
  keyProps,
  neutral,
  clone,
  pretty,
  seconds,
  clock,
  type Modal,
  type History,
} from '../lib/editor-helpers';
export function useStudioController() {
  const [engine, setEngine] = useState<Engine | null>(null),
    [score, setScore] = useState<Score | null>(null),
    [current, setCurrent] = useState(''),
    [selected, setSelected] = useState<string[]>([]);
  const [time, setTime] = useState(2400),
    [playing, setPlaying] = useState(false),
    [rate, setRate] = useState(1),
    [loop, setLoop] = useState(false),
    [timelineWidth, setTimelineWidth] = useState(1168);
  const { zoom, setZoom, swipeMode, setSwipeMode, commandOpen, setCommandOpen } =
    useEditorPreferences();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null),
    [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  useEffect(() => {
    void useEditorPreferences.persist.rehydrate();
  }, []);
  const swipeGesture = useRef({ at: 0, delta: 0, handled: false, sign: 0 });
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
  const [jsonTarget, setJsonTarget] = useState<'project' | 'clip' | 'effect'>('project');
  const [codeError, setCodeError] = useState('');
  const [regionPreview, setRegionPreview] = useState<{ start: number; end: number } | null>(null);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    time: number;
    clipId?: string;
  } | null>(null);
  const closeContext = useCallback(() => setContext(null), []);
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
      const region = loopRef.current ? scoreRef.current?.loopRegion : null;
      if (region && (timeRef.current < region.start || timeRef.current >= region.end))
        seek(region.start);
      else if (timeRef.current >= renderer.current.duration) seek(0);
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
        const region = loopRef.current ? scoreRef.current?.loopRegion : null;
        const start = region?.start ?? 0,
          end = region?.end ?? renderer.current!.duration;
        if (region && next < start) {
          next = start;
          seek(next);
        }
        if (next >= end) {
          if (loopRef.current) {
            next = start + ((next - start) % (end - start));
            seek(next);
          } else {
            next = end;
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
    audio.current.onended = () => {
      const region = scoreRef.current?.loopRegion;
      const repeat =
        loopRef.current && (!region || region.end <= (audio.current?.duration || 0) * 1000 + 1);
      pause();
      if (repeat) {
        seek(region?.start || 0);
        void play();
      }
    };
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
    setSelectedMarkerId(null);
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
    if (!clip || !score) return;
    if (score.scenes.length < 2) {
      setStatus('Keep at least one clip. Add another clip before deleting this one.');
      return;
    }
    pause();
    const nextId = score.scenes.find((c) => c.id !== clip.id)!.id;
    if (
      editClip((c, s) => {
        s.duration ??= engine!.schedule(s).duration;
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
      setSelectedMarkerId(null);
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
      setSelectedMarkerId(null);
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
      setSelectedMarkerId(null);
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
      const playerStyles = await (await fetch('/lilt/player.css')).text();
      const safe = (text: string) => text.replace(/<\/script/gi, '<\\/script');
      const custom = Object.entries(packSources)
        .map(([id, source]) => `${JSON.stringify(id)}:(${source})`)
        .join(',');
      const packed = custom
        ? `Lilt3.registerPack({id:'user',version:'1.0.0',effects:{${custom}}});`
        : '';
      const html = `<!doctype html><html lang="en" class="h-full"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lilt player</title><style>${fonts}\n${playerStyles}</style></head><body class="m-0 h-full overflow-hidden bg-transparent"><canvas class="block h-full w-full" id="stage" aria-label="Animated lyrics"></canvas><script>${safe(sources.join('\n'))}\n${safe(packed)}\nconst score=${JSON.stringify(scoreRef.current).replace(/</g, '\\u003c')};const q=new URLSearchParams(location.search);const player=window.liltPlayer=new Lilt3.Player(document.getElementById('stage'),score,{transparent:q.get('transparent')!=='0',loop:q.get('loop')!=='0',channel:'lilt-studio'});Promise.all([document.fonts.ready,player.renderer.ready()]).then(()=>{player.renderer.invalidate();player.seek(Number(q.get('time')||0));if(q.get('socket'))player.connectSocket(q.get('socket'));if(q.get('autoplay')!=='0')player.play();});<\/script></body></html>`;
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
        send('loop', { loop: loopRef.current });
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
      setCodeError((error as Error).message);
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
      if (mode === 'end') newDuration = Math.max(1, Math.min(60000, duration + delta));
      if (mode === 'start') {
        newStart = Math.max(0, Math.min(start + duration - 1, start + delta));
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
  const toggleLoop = (enabled = !loopRef.current) => {
    loopRef.current = enabled;
    setLoop(enabled);
    send('loop', { loop: enabled });
  };
  const setRegion = (start: number, end: number) => {
    const duration = renderer.current?.duration || 0;
    const a = Math.max(0, Math.min(duration - 1, Math.round(start))),
      b = Math.max(a + 1, Math.min(duration, Math.round(end)));
    if (
      commit((s) => {
        s.loopRegion = { start: a, end: b };
      }, 'Loop region updated')
    )
      toggleLoop(true);
  };
  const loopClip = () => {
    if (clip) {
      pause();
      setRegion(clip.start || 0, (clip.start || 0) + clip.duration);
      seek(clip.start || 0);
    }
  };
  const markRegion = (edge: 'start' | 'end', at = timeRef.current) => {
    const duration = renderer.current?.duration || 0,
      region = scoreRef.current?.loopRegion || { start: 0, end: duration };
    if (edge === 'start') setRegion(at, Math.max(region.end, at + 1));
    else setRegion(Math.min(region.start, at - 1), at);
  };
  const navigateClip = (direction: number) => {
    const clips = engineRef
      .current!.schedule(scoreNow())
      .clips.slice()
      .sort((a, b) => a.start - b.start || a.index - b.index);
    const index = clips.findIndex((c) => c.id === current);
    selectClip(clips[Math.max(0, Math.min(clips.length - 1, index + direction))].id);
  };
  const beginRegionDrag = (event: React.PointerEvent, mode: 'start' | 'end' | 'move') => {
    if (event.button !== 0 || !score?.loopRegion) return;
    event.preventDefault();
    event.stopPropagation();
    pause();
    const target = event.currentTarget as HTMLElement,
      lane = target.closest('.region-lane')!,
      rect = lane.getBoundingClientRect(),
      origin = event.clientX;
    const region = clone(score.loopRegion),
      duration = renderer.current!.duration,
      min = 1000 / (score.stage?.fps || 30);
    let latest = region;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const raw = ((e.clientX - origin) / rect.width) * duration,
        delta = e.altKey ? raw : Math.round(raw / min) * min;
      if (mode === 'move') {
        const d = Math.max(-region.start, Math.min(duration - region.end, delta));
        latest = { start: region.start + d, end: region.end + d };
      } else if (mode === 'start')
        latest = {
          ...region,
          start: Math.max(0, Math.min(region.end - min, region.start + delta)),
        };
      else
        latest = {
          ...region,
          end: Math.max(region.start + min, Math.min(duration, region.end + delta)),
        };
      setRegionPreview(latest);
    };
    const cleanup = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      setRegionPreview(null);
    };
    const end = () => {
      cleanup();
      setRegion(latest.start, latest.end);
    };
    const cancel = () => cleanup();
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  const openContext = (event: React.MouseEvent, clipId?: string, at = timeRef.current) => {
    event.preventDefault();
    event.stopPropagation();
    if (clipId) selectClip(clipId, false);
    setContext({
      x: event.clientX,
      y: event.clientY,
      time: Math.max(0, Math.min(renderer.current!.duration, at)),
      clipId,
    });
  };
  const stagePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
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
      target.classList.add('cursor-grabbing');
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', cancel);
      target.classList.remove('cursor-grabbing');
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
      target.classList.remove('cursor-grabbing');
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', cancel);
  };
  const selectedMarker = score?.markers?.find((m) => m.id === selectedMarkerId);
  const addMarker = () => {
    if (!score || !engine) return;
    const at = Math.round(timeRef.current),
      existing = score.markers?.find(
        (m) => Math.abs(m.time - at) < 1000 / (score.stage?.fps || 30),
      );
    if (existing) {
      setSelectedMarkerId(existing.id);
      setMarkerDialogOpen(true);
      return;
    }
    const marker = markerSchema.parse({
      id: uid('marker'),
      time: at,
      name: `Marker ${(score.markers?.length || 0) + 1}`,
      color: '#fbbf24',
    });
    if (
      commit((s) => {
        s.markers ??= [];
        s.markers.push(marker);
        s.markers.sort((a, b) => a.time - b.time);
      }, 'Marker added')
    )
      setSelectedMarkerId(marker.id);
  };
  const updateMarker = (marker: Marker) => {
    const parsed = markerSchema.safeParse(marker);
    if (!parsed.success) {
      setStatus(parsed.error.issues[0].message);
      return false;
    }
    return commit((s) => {
      s.markers = s.markers
        ?.map((m) => (m.id === marker.id ? parsed.data : m))
        .sort((a, b) => a.time - b.time);
    }, 'Marker updated');
  };
  const deleteMarker = () => {
    if (!selectedMarkerId) return;
    commit((s) => {
      s.markers = s.markers?.filter((m) => m.id !== selectedMarkerId);
    }, 'Marker removed');
    setSelectedMarkerId(null);
    setMarkerDialogOpen(false);
  };
  const navigateMarker = (direction: number) => {
    const markers = scoreRef.current?.markers?.slice().sort((a, b) => a.time - b.time) || [];
    const target =
      direction > 0
        ? markers.find((m) => m.time > timeRef.current + 1)
        : markers.reverse().find((m) => m.time < timeRef.current - 1);
    if (target) {
      pause();
      seek(target.time);
      setSelectedMarkerId(target.id);
    } else setStatus('No marker in that direction. Press M to add one.');
  };
  const deleteSelection = () => {
    if (selectedMarkerId) {
      deleteMarker();
      return;
    }
    if (selected.length && clip && !['shape', 'image'].includes(clip.type || '') && engine) {
      const text = engine
        .flatten(clip)
        .glyphs.filter((g) => !selected.includes(g.id))
        .map((g) => g.ch)
        .join('');
      if (text) {
        pause();
        editClip((c) => engine.editText(c, text), 'Selected characters deleted');
        setSelected([]);
        return;
      }
    }
    removeClip();
  };
  const trimToPlayhead = (edge: 'start' | 'end') => {
    if (!clip) return;
    pause();
    const local = Math.round(timeRef.current - (clip.start || 0));
    const duration = edge === 'start' ? clip.duration - local : local;
    if (local <= 0 || local >= clip.duration || duration < 1) {
      setStatus('Place the playhead inside the clip and keep a positive duration.');
      return;
    }
    editClip((c, s) => {
      if (edge === 'start') c.start = (c.start || 0) + local;
      resizeClip(c, duration);
      ensureEnd(s);
    }, `Clip ${edge} trimmed to playhead`);
  };
  const splitClip = () => {
    if (!clip) return;
    pause();
    const local = Math.round(timeRef.current - (clip.start || 0));
    if (local < 1 || clip.duration - local < 1) {
      setStatus('Place the playhead inside the clip to split it.');
      return;
    }
    const id = uid('clip');
    if (
      editClip((c, s) => {
        const dup = clone(c),
          remaining = c.duration - local;
        dup.id = id;
        dup.name = (c.name || 'Clip') + ' split';
        dup.start = (c.start || 0) + local;
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
        for (const fx of [...(dup.animations || []), ...(dup.materials || [])]) {
          fx.id = uid('fx');
          if (s.effects?.[fx.use]) {
            const use = uid(fx.use.startsWith('studio-') ? 'studio' : 'path');
            s.effects[use] = clone(s.effects[fx.use]);
            fx.use = use;
          }
        }
        resizeClip(c, local);
        resizeClip(dup, remaining);
        s.scenes.push(dup);
        ensureEnd(s);
      }, 'Clip split at playhead')
    ) {
      setCurrent(id);
      setSelected([]);
    }
  };
  const newProject = () => {
    if (!engine) return;
    pause();
    const id = uid('clip');
    if (audioURL.current) URL.revokeObjectURL(audioURL.current);
    audioURL.current = '';
    if (audio.current) audio.current.src = '';
    setAudioName('');
    setWaveform([]);
    setSelectedMarkerId(null);
    toggleLoop(false);
    applyProject({
      v: 3,
      seed: Math.floor(Math.random() * 1000000),
      name: 'Untitled composition',
      packs: { core: '3.0.0' },
      stage: { width: 1280, height: 720, fps: 30 },
      background: { transparent: true },
      layers: [
        {
          id: 'main',
          name: 'Main composition',
          z: 0,
          rect: [0, 0, 1, 1],
          opacity: 1,
          visible: true,
        },
      ],
      scenes: [
        {
          id,
          name: 'Your first words',
          duration: 6000,
          start: 0,
          layer: 'main',
          layout: 'line',
          content: [{ id: uid('text'), text: 'Make it move.' }],
          animations: [],
          materials: [],
        },
      ],
    });
  };
  const saveProject = () => {
    if (scoreRef.current)
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ score: scoreRef.current, packSources }));
        setSaveStatus('Saved locally');
        setStatus('Project saved on this device.');
      } catch {
        setSaveStatus('Local storage unavailable');
      }
  };
  const scrollTimeline = (direction: number) =>
    timelineScroll.current?.scrollBy({
      left: direction * timelineScroll.current.clientWidth * 0.7,
      behavior: 'smooth',
    });
  const fitTimeline = () => {
    setZoom(1);
    timelineScroll.current?.scrollTo({ left: 0 });
  };
  useEditorShortcuts(
    {
      play: () => (playingRef.current ? pause() : void play()),
      step: (n) => {
        pause();
        seek(timeRef.current + (n * 1000) / (scoreRef.current?.stage?.fps || 30));
      },
      seekSecond: (n) => {
        pause();
        seek(timeRef.current + n * 1000);
      },
      start: () => {
        pause();
        seek(0);
      },
      end: () => {
        pause();
        seek(renderer.current?.duration || 0);
      },
      delete: deleteSelection,
      newText: addClip,
      newShape: () => addVisual('shape'),
      newProject,
      duplicate: duplicateClip,
      trimStart: () => trimToPlayhead('start'),
      trimEnd: () => trimToPlayhead('end'),
      split: splitClip,
      markIn: () => markRegion('start'),
      markOut: () => markRegion('end'),
      loop: () => toggleLoop(),
      marker: addMarker,
      prevMarker: () => navigateMarker(-1),
      nextMarker: () => navigateMarker(1),
      prevClip: () => navigateClip(-1),
      nextClip: () => navigateClip(1),
      scroll: scrollTimeline,
      zoom: (n) => setZoom((z) => Math.max(0.5, Math.min(5, z + n * 0.25))),
      fit: fitTimeline,
      undo: () => undo(),
      redo: () => undo(true),
      save: saveProject,
      import: () => importInput.current?.click(),
      help: () => setModal('help'),
      escape: () => {
        setSelected([]);
        setSelectedMarkerId(null);
        closeContext();
        setCommandOpen(false);
        setMarkerDialogOpen(false);
      },
      commands: () => setCommandOpen(!commandOpen),
    },
    !!score && !modal && !context && !commandOpen && !markerDialogOpen,
  );
  useEffect(() => {
    const target = timelineScroll.current;
    if (!target) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, Math.min(5, z * Math.exp(-e.deltaY * 0.005))));
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        if (swipeMode === 'clips') {
          const delta = e.deltaX || e.deltaY,
            now = performance.now(),
            gesture = swipeGesture.current;
          if (now - gesture.at > 180 || Math.sign(delta) !== gesture.sign) {
            gesture.delta = 0;
            gesture.handled = false;
          }
          gesture.at = now;
          gesture.sign = Math.sign(delta);
          gesture.delta += delta;
          if (!gesture.handled && Math.abs(gesture.delta) >= 40) {
            gesture.handled = true;
            navigateClip(Math.sign(gesture.delta));
          }
          return;
        }
        target.scrollLeft +=
          (e.deltaX || e.deltaY) *
          (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? target.clientWidth : 1);
      }
    };
    target.addEventListener('wheel', wheel, { passive: false });
    return () => target.removeEventListener('wheel', wheel);
  }, [!!score, swipeMode, current]);
  if (!score || !engine || !clip) return { ready: false as const, status };
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
  const openJSON = (target: 'project' | 'clip' | 'effect' = 'project') => {
    setJsonTarget(target);
    setCodeError('');
    setJsonDraft(
      JSON.stringify(
        target === 'project'
          ? score
          : target === 'clip'
            ? clip
            : score.effects?.[activeEffect?.use || ''],
        null,
        2,
      ) || '{}',
    );
    setModal('json');
  };
  const editEffectCode = () => {
    if (activeEffect?.use.startsWith('user/')) {
      const name = activeEffect.use.slice(5);
      setPackName(name);
      setPackSource(packSources[name] || '');
      setCodeError('');
      setModal('code');
    } else if (activeEffect && score.effects?.[activeEffect.use]) openJSON('effect');
    else {
      setModal('code');
      setCodeError('');
      setPackSource(`{kind: "motion", phase: "enter", duration: 1200,
 sample({e}) {return {y: 120 * (1-e), opacity: e};}}`);
      setPackName('custom-motion');
    }
  };
  const applyCode = () => {
    try {
      const source = JSON.parse(jsonDraft);
      if (jsonTarget === 'project') {
        engine.validate(normalize(engine, source));
        applyProject(source);
        return;
      }
      const next = clone(score);
      if (jsonTarget === 'clip')
        next.scenes[next.scenes.findIndex((c) => c.id === clip.id)] = source;
      else next.effects![activeEffect.use] = source;
      engine.validate(next);
      if (commit((s) => Object.assign(s, next), 'Code applied')) {
        if (jsonTarget === 'clip') {
          setCurrent(source.id);
          setSelected([]);
        }
        setModal(null);
      }
    } catch (error) {
      setCodeError((error as Error).message);
    }
  };

  return {
    ready: true as const,
    engine,
    setEngine,
    score,
    setScore,
    current,
    setCurrent,
    selected,
    setSelected,
    time,
    setTime,
    playing,
    setPlaying,
    rate,
    setRate,
    loop,
    setLoop,
    timelineWidth,
    setTimelineWidth,
    zoom,
    setZoom,
    swipeMode,
    setSwipeMode,
    commandOpen,
    setCommandOpen,
    selectedMarkerId,
    setSelectedMarkerId,
    markerDialogOpen,
    setMarkerDialogOpen,
    swipeGesture,
    leftTab,
    setLeftTab,
    inspectorTab,
    setInspectorTab,
    effectId,
    setEffectId,
    search,
    setSearch,
    category,
    setCategory,
    historyCount,
    setHistoryCount,
    status,
    setStatus,
    saveStatus,
    setSaveStatus,
    modal,
    setModal,
    jsonDraft,
    setJsonDraft,
    packSource,
    setPackSource,
    packName,
    setPackName,
    packSources,
    setPackSources,
    textDraft,
    setTextDraft,
    nameDraft,
    setNameDraft,
    projectName,
    setProjectName,
    audioName,
    setAudioName,
    waveform,
    setWaveform,
    guides,
    setGuides,
    calm,
    setCalm,
    property,
    setProperty,
    frameIndex,
    setFrameIndex,
    keyValue,
    setKeyValue,
    dragPreview,
    setDragPreview,
    relayURL,
    setRelayURL,
    relayConnected,
    setRelayConnected,
    broadcast,
    setBroadcast,
    restore,
    setRestore,
    jsonTarget,
    setJsonTarget,
    codeError,
    setCodeError,
    regionPreview,
    setRegionPreview,
    context,
    setContext,
    closeContext,
    canvas,
    renderer,
    scoreRef,
    engineRef,
    timeRef,
    playingRef,
    audio,
    audioURL,
    raf,
    anchor,
    rateRef,
    loopRef,
    history,
    channel,
    socket,
    broadcastRef,
    importInput,
    audioInput,
    imageInput,
    timelineScroll,
    lastPublished,
    scoreNow,
    send,
    pause,
    draw,
    seek,
    play,
    clip,
    commit,
    editClip,
    undo,
    selectClip,
    resizeClip,
    ensureEnd,
    removeClip,
    duplicateClip,
    addClip,
    addVisual,
    addPath,
    addLayer,
    setStyle,
    allEffects,
    effects,
    activeEffect,
    def,
    addEffect,
    changeEffect,
    removeEffect,
    reorderEffect,
    keyedId,
    keyedDef,
    frames,
    chosenFrame,
    updateFrames,
    addKeyframe,
    applyProject,
    loadDemo,
    exportScore,
    exportHTML,
    snapshot,
    connectRelay,
    installPack,
    loadAudio,
    beginClipDrag,
    toggleLoop,
    setRegion,
    loopClip,
    markRegion,
    navigateClip,
    beginRegionDrag,
    openContext,
    stagePointer,
    selectedMarker,
    addMarker,
    updateMarker,
    deleteMarker,
    navigateMarker,
    deleteSelection,
    trimToPlayhead,
    splitClip,
    newProject,
    saveProject,
    scrollTimeline,
    fitTimeline,
    timeline,
    duration,
    layers,
    focusLayer,
    visual,
    pathEffect,
    pathDef,
    glyphs,
    selectedGlyph,
    style,
    filteredEffects,
    currentIndex,
    color,
    totalWidth,
    openJSON,
    editEffectCode,
    applyCode,
  };
}
export type EditorController = Extract<ReturnType<typeof useStudioController>, { ready: true }>;
