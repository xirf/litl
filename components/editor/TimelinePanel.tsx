'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import { NumberField, Button, Input, Select } from '../ui';

import { palette, pretty, seconds } from '../../lib/editor-helpers';
import AddMediaButtons from './AddMediaButtons';
import Playhead from './Playhead';
import TimelineMarkers from './TimelineMarkers';
export default function TimelinePanel() {
  const { addMarker, trimToPlayhead, splitClip, deleteSelection } = useEditor();
  const {
    engine,
    score,
    current,
    time,
    loop,
    zoom,
    setZoom,
    swipeMode,
    setSwipeMode,
    setInspectorTab,
    audioName,
    setAudioName,
    waveform,
    setWaveform,
    setProperty,
    setFrameIndex,
    dragPreview,
    regionPreview,
    audio,
    audioURL,
    audioInput,
    timelineScroll,
    pause,
    seek,
    clip,
    commit,
    selectClip,
    addLayer,
    keyedDef,
    beginClipDrag,
    toggleLoop,
    setRegion,
    loopClip,
    markRegion,
    beginRegionDrag,
    openContext,
    timeline,
    duration,
    layers,
    style,
    totalWidth,
  } = useEditor();
  return (
    <section className={ui('timeline-panel')} aria-label="Composition timeline">
      <div className={ui('timeline-toolbar')}>
        <div>
          <Icon name="layers" />
          <strong>Timeline</strong>
          <span className={ui('timeline-count')}>{score.scenes.length} clips</span>
          <span className={ui('separator')} />
          <AddMediaButtons />

          <Button icon="marker" title="Add timeline marker (M)" onClick={addMarker} />
          <Button icon="trim" title="Split clip at playhead (S)" onClick={splitClip} />
          <Button
            icon="trim"
            title="Trim start to playhead (Q)"
            onClick={() => trimToPlayhead('start')}
          />
          <Button
            icon="trim"
            title="Trim end to playhead (W)"
            onClick={() => trimToPlayhead('end')}
          />
          <Button icon="trash" title="Delete selection (Delete)" onClick={deleteSelection} />
          <Button icon="layers" title="Add layer" onClick={addLayer} />
        </div>
        <div className={ui('timeline-right')}>
          <span>{seconds(time)}</span>
          <span className={ui('separator')} />
          <span className={ui('zoom-label')}>−</span>
          <Input
            aria-label="Timeline zoom"
            type="range"
            min=".5"
            max="5"
            step=".1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className={ui('zoom-label')}>+</span>
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
      <div className={ui('loop-region-tools')}>
        <label className={ui('checkbox')}>
          <Input
            type="checkbox"
            aria-label="Enable timeline loop"
            checked={loop}
            onChange={(e) => toggleLoop(e.target.checked)}
          />
          Loop {score.loopRegion ? 'region' : 'composition'}
        </label>
        <Button icon="loop" onClick={loopClip}>
          Loop selected clip
        </Button>
        <Button onClick={() => markRegion('start')} title="Set loop start at playhead (I)">
          Mark in
        </Button>
        <Button onClick={() => markRegion('end')} title="Set loop end at playhead (O)">
          Mark out
        </Button>
        {score.loopRegion && (
          <>
            <NumberField
              label="Loop start"
              value={score.loopRegion.start / 1000}
              min={0}
              max={score.loopRegion.end / 1000}
              step={0.1}
              suffix="s"
              onChange={(n) => setRegion(n * 1000, score.loopRegion!.end)}
            />
            <NumberField
              label="Loop end"
              value={score.loopRegion.end / 1000}
              min={score.loopRegion.start / 1000}
              max={duration / 1000}
              step={0.1}
              suffix="s"
              onChange={(n) => setRegion(score.loopRegion!.start, n * 1000)}
            />
            <Button
              title="Clear loop region"
              onClick={() => {
                commit((s) => {
                  delete s.loopRegion;
                }, 'Loop region cleared');
              }}
            >
              Clear region
            </Button>
          </>
        )}
        <label className={ui('swipe-choice')}>
          Swipe{' '}
          <Select
            aria-label="Horizontal swipe action"
            value={swipeMode}
            onChange={(e) => setSwipeMode(e.target.value)}
          >
            <option value="pan">Pan timeline</option>
            <option value="clips">Previous / next clip</option>
          </Select>
        </label>
        <span className={ui('hint')}>
          Two-finger swipe to pan · Ctrl/pinch to zoom · right-click for actions
        </span>
      </div>
      <div className={ui('timeline-scroll')} ref={timelineScroll}>
        <div className={ui('timeline-content')} style={{ width: totalWidth + 188 }}>
          <TimelineMarkers />
          <div className={ui('timeline-row region-row')}>
            <div className={ui('track-label')}>
              <span>LOOP REGION</span>
            </div>
            <div
              className={ui('region-lane')}
              style={{ width: totalWidth }}
              onContextMenu={(e) =>
                openContext(
                  e,
                  undefined,
                  ((e.clientX - e.currentTarget.getBoundingClientRect().left) /
                    e.currentTarget.getBoundingClientRect().width) *
                    duration,
                )
              }
            >
              {(regionPreview || score.loopRegion) &&
                (() => {
                  const region = regionPreview || score.loopRegion!;
                  return (
                    <div
                      className={ui(`region-range ${loop ? 'enabled' : ''}`)}
                      style={{
                        left: `${(region.start / duration) * 100}%`,
                        width: `${((region.end - region.start) / duration) * 100}%`,
                      }}
                      onPointerDown={(e) => beginRegionDrag(e, 'move')}
                    >
                      <button
                        aria-label="Drag loop start"
                        className={ui('region-handle start')}
                        onPointerDown={(e) => beginRegionDrag(e, 'start')}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            e.stopPropagation();
                            setRegion(
                              region.start +
                                ((e.key === 'ArrowLeft' ? -1 : 1) * 1000) /
                                  (score.stage?.fps || 30),
                              region.end,
                            );
                          }
                        }}
                      >
                        I
                      </button>
                      <span>
                        {seconds(region.start)} – {seconds(region.end)}
                      </span>
                      <button
                        aria-label="Drag loop end"
                        className={ui('region-handle end')}
                        onPointerDown={(e) => beginRegionDrag(e, 'end')}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            e.stopPropagation();
                            setRegion(
                              region.start,
                              region.end +
                                ((e.key === 'ArrowLeft' ? -1 : 1) * 1000) /
                                  (score.stage?.fps || 30),
                            );
                          }
                        }}
                      >
                        O
                      </button>
                    </div>
                  );
                })()}
            </div>
          </div>
          <div className={ui('timeline-row ruler-row')}>
            <div className={ui('track-label ruler-label')}>
              <span>LAYER / SOURCE</span>
              <span>◈</span>
            </div>
            <div
              className={ui('time-ruler')}
              onContextMenu={(e) =>
                openContext(
                  e,
                  undefined,
                  ((e.clientX - e.currentTarget.getBoundingClientRect().left) /
                    e.currentTarget.getBoundingClientRect().width) *
                    duration,
                )
              }
              style={{ width: totalWidth }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
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
              <div
                className={ui('playhead-handle')}
                style={{ left: `${(time / duration) * 100}%` }}
              />
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
              <div className={ui('timeline-row')} key={layer.id}>
                <div
                  className={ui('track-label')}
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
                  <span className={ui('track-index')}>{String(li + 1).padStart(2, '0')}</span>
                  <Icon name="layers" size={13} />
                  <strong>{layer.name || layer.id}</strong>
                </div>
                <div
                  className={ui(`clip-lane ${layer.visible === false ? 'muted-layer' : ''}`)}
                  style={{ width: totalWidth, height: Math.max(1, ends.length) * 40 + 16 }}
                  onPointerDown={(e) => {
                    if (e.button === 0 && e.target === e.currentTarget) {
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
                        className={ui(`timeline-clip ${clip.id === c.id ? 'selected' : ''}`)}
                        style={
                          {
                            left: `${(preview.start / duration) * 100}%`,
                            width: `${(preview.duration / duration) * 100}%`,
                            top: (seats.get(c.id) || 0) * 40 + 8,
                            '--clip-color': cc,
                          } as React.CSSProperties
                        }
                        onContextMenu={(e) => openContext(e, c.id)}
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
                          className={ui('trim-handle left')}
                          aria-label="Trim clip start"
                          onPointerDown={(e) => beginClipDrag(e, c.id, 'start')}
                        />
                        <span className={ui('clip-content')}>
                          <span>{c.type === 'shape' ? '◈' : c.type === 'image' ? '▧' : 'Aa'}</span>
                          {c.type === 'shape' || c.type === 'image'
                            ? c.name || pretty(c.type)
                            : engine.contentText(c.content)}
                        </span>
                        <span className={ui('clip-duration')}>{seconds(preview.duration)}</span>
                        <span
                          className={ui('trim-handle right')}
                          aria-label="Trim clip end"
                          onPointerDown={(e) => beginClipDrag(e, c.id, 'end')}
                        />
                      </div>
                    );
                  })}
                  <Playhead time={time} duration={duration} />
                </div>
              </div>
            );
          })}
          <div className={ui('timeline-row audio-row')}>
            <div className={ui('track-label')}>
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
              className={ui('audio-lane')}
              style={{ width: totalWidth }}
              onClick={(e) => {
                if (e.button !== 0) return;
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
              <Playhead time={time} duration={duration} />
            </div>
          </div>
          {keyedDef &&
            Object.entries(keyedDef.keyframes || {}).map(([prop, list]) => (
              <div className={ui('timeline-row key-row')} key={prop}>
                <div className={ui('track-label')}>
                  <Icon name="diamond" size={12} />
                  <strong>{pretty(prop)}</strong>
                  <span className={ui('muted')}>{list.length} keys</span>
                </div>
                <div className={ui('key-lane')} style={{ width: totalWidth }}>
                  {list.map((f, i) => (
                    <button
                      key={i}
                      aria-label={`${prop} keyframe at ${seconds(f.time)}`}
                      className={ui('timeline-key')}
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
                  <Playhead time={time} duration={duration} />
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
