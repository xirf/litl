'use client';
import { Section } from '../ui';

import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import BezierEditor from '../BezierEditor';
import MotionPathEditor from '../MotionPathEditor';
import { Field, NumberField, Button, Select } from '../ui';

import { keyProps, neutral, pretty, seconds } from '../../lib/editor-helpers';
export default function KeyframeInspector() {
  const {
    engine,
    time,
    property,
    setProperty,
    frameIndex,
    setFrameIndex,
    keyValue,
    setKeyValue,
    pause,
    seek,
    clip,
    editClip,
    addPath,
    effects,
    frames,
    chosenFrame,
    updateFrames,
    addKeyframe,
    duration,
    pathEffect,
    pathDef,
  } = useEditor();
  return (
    <>
      <Section title={<>Bézier motion path</>}>
        {!pathEffect && (
          <>
            <Button icon="plus" onClick={addPath}>
              Add Bézier path
            </Button>
            <p className={ui('hint')}>
              Move the whole clip along a curved route. Works with text, shapes and images.
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
                  c.animations!.find((f) => f.use === pathEffect.use)!.ease = ease || 'linear';
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
                  c.animations!.find((f) => f.use === pathEffect.use)!.duration = n * 1000;
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
      </Section>
      <Section
        title={
          <>
            Transform keyframes <Icon name="diamond" size={12} />
          </>
        }
      >
        <p className={ui('hint')}>
          Set values at the playhead. Your animation is stored as data and runs in the vanilla
          renderer.
        </p>
        <Field label="Property">
          <Select
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
          </Select>
        </Field>
        <div className={ui('key-clock')}>
          <Icon name="diamond" />
          <span>
            Clip time <strong>{seconds(Math.max(0, time - (clip.start || 0)))}</strong>
          </span>
        </div>
        <NumberField
          label="Value at playhead"
          value={keyValue}
          step={['opacity', 'sx', 'sy', 'rotation', 'reveal'].includes(property) ? 0.05 : 1}
          onChange={setKeyValue}
        />
        <Button icon="plus" className={ui('key-add')} onClick={addKeyframe}>
          Add / update keyframe
        </Button>
        <div className={ui('graph')}>
          <div className={ui('graph-label')}>VALUE OVER TIME</div>
          <svg viewBox="0 0 240 105" role="img" aria-label={`${pretty(property)} keyframe graph`}>
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
                        className="cursor-pointer"
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
          <div className={ui('graph-axis')}>
            <span>0s</span>
            <span>{seconds(clip.duration)}</span>
          </div>
        </div>
        <div className={ui('key-list')}>
          {frames.map((f, i) => (
            <button
              key={i}
              className={ui(frameIndex === i ? 'active' : '')}
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
          <p className={ui('empty')}>No keyframes yet. Try Y: 100 at 0s, then Y: 0 at 1.5s.</p>
        )}
        {chosenFrame && (
          <>
            <div className={ui('field-grid')}>
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
      </Section>
    </>
  );
}
