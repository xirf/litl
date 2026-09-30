'use client';
import { Section } from '../ui';

import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import { Field, NumberField, Button, Input, Select, Textarea } from '../ui';

import { type Clip } from '../../lib/lilt';
import { pretty } from '../../lib/editor-helpers';
export default function ClipInspector() {
  const {
    engine,
    score,
    selected,
    setSelected,
    textDraft,
    setTextDraft,
    nameDraft,
    setNameDraft,
    clip,
    editClip,
    resizeClip,
    ensureEnd,
    removeClip,
    duplicateClip,
    setStyle,
    duration,
    layers,
    visual,
    glyphs,
    style,
    color,
    openJSON,
  } = useEditor();
  return (
    <>
      <Section
        title={
          <>
            Content <span>{visual ? clip.type : `${glyphs.length} characters`}</span>
          </>
        }
      >
        <Field label="Clip name">
          <Input
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
            <Textarea
              className={ui('lyric-input')}
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
            <div className={ui('glyph-selector')} aria-label="Select characters">
              {glyphs.map((g) => (
                <button
                  key={g.id}
                  className={ui(selected.includes(g.id) ? 'selected' : '')}
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
              <Button className={ui('text-button')} onClick={() => setSelected([])}>
                Apply to whole clip
              </Button>
            )}
          </>
        )}
      </Section>
      {!visual && (
        <>
          <Section
            title={
              <>
                Typography <Icon name="settings" size={12} />
              </>
            }
          >
            <Field label="Typeface">
              <Select value={style.face} onChange={(e) => setStyle('face', e.target.value)}>
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
              </Select>
            </Field>
            <div className={ui('field-grid')}>
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
                <div className={ui('color-field')}>
                  <Input
                    aria-label="Text color"
                    type="color"
                    value={style.color}
                    onChange={(e) => setStyle('color', e.target.value)}
                  />
                  <span>{style.color.toUpperCase()}</span>
                </div>
              </Field>
            </div>
            <div className={ui('field-grid')}>
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
              <Select
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
              </Select>
            </Field>
            <label className={ui('checkbox')}>
              <Input
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
          </Section>
        </>
      )}
      {visual && (
        <Section title={<>{clip.type === 'shape' ? 'Shape geometry' : 'Image geometry'}</>}>
          {clip.shape && (
            <>
              <Field label="Shape">
                <Select
                  aria-label="Shape"
                  value={clip.shape.kind}
                  onChange={(e) =>
                    editClip((c) => {
                      c.shape!.kind = e.target.value as NonNullable<Clip['shape']>['kind'];
                    })
                  }
                >
                  {['rectangle', 'ellipse', 'triangle', 'star', 'polygon', 'line'].map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </Select>
              </Field>
              <div className={ui('field-grid')}>
                <Field label="Fill">
                  <Input
                    type="color"
                    value={clip.shape.fill === 'none' ? '#c4a2ff' : clip.shape.fill || '#c4a2ff'}
                    onChange={(e) =>
                      editClip((c) => {
                        c.shape!.fill = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Stroke">
                  <Input
                    type="color"
                    value={
                      clip.shape.stroke === 'none' ? '#c4a2ff' : clip.shape.stroke || '#c4a2ff'
                    }
                    onChange={(e) =>
                      editClip((c) => {
                        c.shape!.stroke = e.target.value;
                      })
                    }
                  />
                </Field>
              </div>
              <label className={ui('checkbox')}>
                <Input
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
              <label className={ui('checkbox')}>
                <Input
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
                <Select
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
                </Select>
              </Field>
              <p className={ui('hint')}>
                Embedded in your project and standalone player. PNG, JPEG and WebP are supported.
              </p>
            </>
          )}
          <div className={ui('field-grid')}>
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
          <div className={ui('field-grid')}>
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
        </Section>
      )}
      <Section title={<>Timing & layer</>}>
        <Button icon="code" onClick={() => openJSON('clip')}>
          Edit clip code
        </Button>
        <div className={ui('field-grid')}>
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
          <Select
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
          </Select>
        </Field>
        <div className={ui('field-grid')}>
          <Button icon="duplicate" onClick={duplicateClip}>
            Duplicate
          </Button>
          <Button icon="trash" disabled={score.scenes.length === 1} onClick={removeClip}>
            Remove
          </Button>
        </div>
      </Section>
    </>
  );
}
