'use client';
import { Section } from '../ui';

import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import BezierEditor from '../BezierEditor';

import { Field, NumberField, Button, Input, Select } from '../ui';

import { pretty } from '../../lib/editor-helpers';
export default function MotionInspector() {
  const {
    engine,
    score,
    selected,
    setEffectId,
    setStatus,
    anchor,
    commit,
    effects,
    activeEffect,
    def,
    changeEffect,
    removeEffect,
    reorderEffect,
    duration,
    editEffectCode,
  } = useEditor();
  return (
    <>
      <Section
        title={
          <>
            Effect stack <span>{effects.length} effects</span>
          </>
        }
      >
        <div className={ui('effect-stack')}>
          {effects.map((fx, i) => (
            <button
              key={fx.id}
              className={ui(activeEffect?.id === fx.id ? 'active' : '')}
              onClick={() => setEffectId(fx.id)}
            >
              <span className={ui('effect-order')}>{String(i + 1).padStart(2, '0')}</span>
              <span>
                <strong>
                  {engine.definition(score, fx.use)?.path ? 'Bézier path' : pretty(fx.use)}
                </strong>
                <small>
                  {fx.select?.ids ? `${fx.select.ids.length} targets` : 'All characters'} ·{' '}
                  {engine.definition(score, fx.use).kind}
                </small>
              </span>
              <Icon name="chevron" size={12} />
            </button>
          ))}
        </div>
        {!effects.length && (
          <p className={ui('empty')}>Choose an effect from the library to start a little magic.</p>
        )}
      </Section>
      {activeEffect && def && (
        <>
          <Section
            title={
              <>
                {def?.path ? 'Bézier path' : pretty(activeEffect.use)}
                <div className={ui('stack-actions')}>
                  <Button title="Move effect up" onClick={() => reorderEffect(-1)}>
                    ↑
                  </Button>
                  <Button title="Move effect down" onClick={() => reorderEffect(1)}>
                    ↓
                  </Button>
                  <Button icon="trash" title="Remove effect" onClick={removeEffect} />
                </div>
              </>
            }
          >
            <Field label="Targets">
              <Select
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
                  <option value="custom">{activeEffect.select.ids.length} selected targets</option>
                )}
              </Select>
            </Field>
            {def.kind === 'motion' && (
              <>
                <div className={ui('field-grid')}>
                  <Field label="Phase">
                    <Select
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
                    </Select>
                  </Field>
                  <Field label="Group by">
                    <Select
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
                    </Select>
                  </Field>
                </div>
                <div className={ui('field-grid')}>
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
                <div className={ui('field-grid')}>
                  <Field label="Order">
                    <Select
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
                    </Select>
                  </Field>
                  <Field label="Clock">
                    <Select
                      value={activeEffect.anchor || 'scene'}
                      onChange={(e) =>
                        changeEffect((f) => {
                          f.anchor = e.target.value;
                        })
                      }
                    >
                      <option value="scene">Clip</option>
                      <option value="unit">Vocal unit</option>
                    </Select>
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
                  className={ui('text-button')}
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
            <Button icon="code" onClick={editEffectCode}>
              Edit effect code
            </Button>
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
                <div className={ui('slider-control')}>
                  <Input
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
                  <span>{(activeEffect.params?.[key] ?? def.defaults?.[key] ?? 0).toFixed(2)}</span>
                </div>
              </Field>
            ))}
            <p className={ui('hint')}>
              Transforms compose in stack order. Word and phrase groups move around their shared
              center.
            </p>
          </Section>
        </>
      )}
      <Section title={<>Motion intensity</>}>
        <div className={ui('slider-control')}>
          <Input
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
      </Section>
    </>
  );
}
