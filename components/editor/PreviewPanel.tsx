'use client';
import { useRef, useState, useLayoutEffect } from 'react';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';
import SafeAreaOverlay from './SafeAreaOverlay';
import type { GuideArea } from '../../lib/safe-areas';

import { Button, Select } from '../ui';

import { clock } from '../../lib/editor-helpers';
export default function PreviewPanel() {
  const {
    score,
    current,
    selected,
    time,
    playing,
    rate,
    setRate,
    loop,
    guides,
    setGuides,
    calm,
    setCalm,
    canvas,
    renderer,
    timeRef,
    audio,
    anchor,
    rateRef,
    send,
    pause,
    seek,
    play,
    snapshot,
    toggleLoop,
    openContext,
    stagePointer,
    timeline,
    duration,
    style,
  } = useEditor();
  const [safeAreas, setSafeAreas] = useState<GuideArea[]>([]);
  const [drawingSafeArea, setDrawingSafeArea] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const frameHost = useRef<HTMLDivElement>(null),
    [frameWidth, setFrameWidth] = useState<number>();
  useLayoutEffect(() => {
    const host = frameHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() => {
      const box = host.getBoundingClientRect();
      setFrameWidth(Math.min(box.width, (box.height * score.stage!.width) / score.stage!.height));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [score.stage!.width, score.stage!.height]);
  return (
    <main className={ui('composition')}>
      <div className={ui('composition-bar')}>
        <div>
          <Icon name="film" />
          <span>Composition</span>
          <span className={ui('tab-name')}>{score.name}</span>
        </div>
        <div>
          <span>
            {score.stage!.width} × {score.stage!.height}
          </span>
          <span className={ui('separator')} />
          <span>{score.stage!.fps} FPS</span>
        </div>
      </div>
      <div className={ui('stage-area')}>
        <div
          ref={frameHost}
          className="flex h-[40dvh] min-h-0 w-full shrink-0 items-center justify-center lg:h-auto lg:flex-1"
        >
          <div
            className={ui(`stage-frame ${score.background?.transparent ? 'checker' : ''}`)}
            style={
              {
                width: frameWidth,
                flexShrink: 0,
                aspectRatio: `${score.stage!.width}/${score.stage!.height}`,
                '--stage-ratio': score.stage!.width / score.stage!.height,
              } as React.CSSProperties
            }
          >
            <canvas
              ref={canvas}
              onPointerDown={stagePointer}
              onContextMenu={(e) => {
                const r = renderer.current!,
                  rect = e.currentTarget.getBoundingClientRect();
                const hit = r.hit(
                  ((e.clientX - rect.left) / rect.width) * r.w,
                  ((e.clientY - rect.top) / rect.height) * r.h,
                );
                openContext(e, hit === null ? undefined : score.scenes[r.hitScene].id);
              }}
              aria-label="Composition preview. Click characters to select them."
            />
            <div className={ui('stage-corner top-left')} />
            <div className={ui('stage-corner bottom-right')} />
            <SafeAreaOverlay
              areas={safeAreas}
              drawing={drawingSafeArea}
              visible={showSafeAreas}
              onAdd={(area) => setSafeAreas((areas) => [...areas, area])}
              onFinish={() => setDrawingSafeArea(false)}
            />
          </div>
        </div>
      </div>
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-t border-zinc-800 px-3 py-1 text-xs text-zinc-400"
        aria-label="Safe-area guides"
      >
        <Button
          icon="frame"
          title={drawingSafeArea ? 'Cancel drawing safe area' : 'Draw safe area'}
          aria-pressed={drawingSafeArea}
          className={ui(drawingSafeArea ? 'active' : '')}
          onClick={() => {
            pause();
            setShowSafeAreas(true);
            setDrawingSafeArea(!drawingSafeArea);
          }}
        >
          Draw safe area
        </Button>
        {safeAreas.length > 0 && (
          <>
            <Select
              aria-label="Remove safe area"
              className="h-7 w-32"
              value=""
              onChange={(event) =>
                setSafeAreas((areas) => areas.filter((area) => area.id !== event.target.value))
              }
            >
              <option value="" disabled>
                Remove guide…
              </option>
              {safeAreas.map((area, i) => (
                <option key={area.id} value={area.id}>
                  Safe area {i + 1}
                </option>
              ))}
            </Select>
            <Button
              icon={showSafeAreas ? 'eye' : 'hidden'}
              title={showSafeAreas ? 'Hide safe areas' : 'Show safe areas'}
              onClick={() => {
                setDrawingSafeArea(false);
                setShowSafeAreas(!showSafeAreas);
              }}
            />
            <Button
              icon="trash"
              title="Clear safe areas"
              onClick={() => {
                setDrawingSafeArea(false);
                setSafeAreas([]);
              }}
            />
          </>
        )}
        <span>
          {drawingSafeArea
            ? 'Drag on the preview to mark an area to keep clear.'
            : 'Preview only · overlap: yellow · >1s: red'}
        </span>
      </div>
      <div className={ui('transport')}>
        <div className={ui('preview-options')}>
          <Button
            icon="frame"
            title="Toggle glyph guides"
            className={ui(guides ? 'active' : '')}
            onClick={() => setGuides(!guides)}
          />
          <Button
            icon="eye"
            title="Reduced motion preview"
            className={ui(calm ? 'active' : '')}
            onClick={() => setCalm(!calm)}
          />
          <Button icon="download" title="Save current frame as PNG" onClick={snapshot} />
          <span className={ui('preview-scale')}>Fit</span>
        </div>
        <div className={ui('playback-controls')}>
          <Button
            icon="rewind"
            title="Go to start"
            onClick={() => {
              pause();
              seek(0);
            }}
          />
          <Button
            className={ui('play-button')}
            icon={playing ? 'pause' : 'play'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            onClick={() => (playing ? pause() : void play())}
          />
          <Button
            icon="loop"
            title={score.loopRegion ? 'Loop region' : 'Loop composition'}
            className={ui(loop ? 'active' : '')}
            onClick={() => {
              toggleLoop();
            }}
          />
        </div>
        <div className={ui('transport-time')}>
          <span>{clock(time, score.stage!.fps)}</span>
          <span className={ui('muted')}>/ {clock(duration, score.stage!.fps)}</span>
          <Select
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
          </Select>
        </div>
      </div>
    </main>
  );
}
