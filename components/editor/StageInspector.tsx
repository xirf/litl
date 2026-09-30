'use client';
import { Section } from '../ui';

import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';

import { Field, NumberField, Button, Input, Select } from '../ui';

export default function StageInspector() {
  const { score, commit, addLayer, duration, layers, focusLayer } = useEditor();
  return (
    <>
      <Section title={<>Composition settings</>}>
        <div className={ui('field-grid')}>
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
          <Select
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
          </Select>
        </Field>
        <div className={ui('field-grid')}>
          <Field label="Frame rate">
            <Select
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
            </Select>
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
      </Section>
      <Section title={<>Background</>}>
        <label className={ui('checkbox')}>
          <Input
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
        <p className={ui('hint')}>
          No background by default. Place your own image or video behind the player in OBS, or turn
          transparency off to use a preset.
        </p>
        <Field label="Backdrop">
          <Select
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
          </Select>
        </Field>
        <Field label="Theme">
          <Select
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
          </Select>
        </Field>
        <Field label="Hue">
          <Input
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
      </Section>
      <Section title={<>Selected layer</>}>
        <Field label="Name">
          <Input
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
          <Select
            value={JSON.stringify(focusLayer.rect || [0, 0, 1, 1])}
            onChange={(e) =>
              commit((s) => {
                s.layers!.find((l) => l.id === focusLayer.id)!.rect = JSON.parse(e.target.value);
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
          </Select>
        </Field>
        <div className={ui('field-grid')}>
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
        <div className={ui('field-grid')}>
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
      </Section>
    </>
  );
}
