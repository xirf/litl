'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

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
        <div className={ui('stage-topline')}>
          <span>
            <i className={ui('live-dot')} />
            LIVE CANVAS
          </span>
          <span>
            {timeline.clips.filter((c) => time >= c.start && time < c.end).length} active clips
          </span>
        </div>
        <div
          className={ui(`stage-frame ${score.background?.transparent ? 'checker' : ''}`)}
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
          {guides && <div className={ui('safe-area')} />}
        </div>
        <div className={ui('stage-bottomline')}>
          <span>
            {selected.length
              ? `${selected.length} character${selected.length > 1 ? 's' : ''} selected · drag to reposition`
              : 'Click a character to make it yours.'}
          </span>
          <span>{clock(time, score.stage!.fps)}</span>
        </div>
      </div>
      <div className={ui('transport')}>
        <div className={ui('preview-options')}>
          <Button
            icon="frame"
            title="Toggle safe areas and glyph guides"
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
