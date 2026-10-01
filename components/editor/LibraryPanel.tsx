'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import { TabsControl } from '../ui';
import { Button, Input } from '../ui';

import { palette, pretty, seconds } from '../../lib/editor-helpers';
import AddMediaButtons from './AddMediaButtons';

export default function LibraryPanel() {
  const {
    score,
    current,
    selected,
    leftTab,
    setLeftTab,
    search,
    setSearch,
    category,
    setCategory,
    setModal,
    setPackSource,
    importInput,
    clip,
    selectClip,
    addEffect,
    loadDemo,
    duration,
    layers,
    style,
    filteredEffects,
    color,
  } = useEditor();
  return (
    <aside className={ui('library')}>
      <TabsControl
        label="Library"
        value={leftTab}
        onChange={setLeftTab}
        contentClass="flex min-h-0 flex-col"
        items={[
          { id: 'effects', label: 'Effects', icon: 'spark' },
          { id: 'project', label: 'Project', icon: 'folder' },
        ]}
      >
        {(id) =>
          id === 'effects' ? (
            <>
              <div className={ui('library-heading')}>
                <h2>Effects library</h2>
              </div>
              <label className={ui('search')}>
                <Icon name="search" />
                <Input
                  aria-label="Search effects"
                  placeholder="Find an effect…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd>/</kbd>
              </label>
              <div className={ui('effect-filters')}>
                {[
                  ['enter', 'In'],
                  ['loop', 'Hold'],
                  ['exit', 'Out'],
                  ['material', 'Texture'],
                  ['all', 'All'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={ui(category === id ? 'active' : '')}
                    onClick={() => setCategory(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={ui('effect-library')}>
                {filteredEffects.map((d, i) => (
                  <button
                    key={d.id}
                    className={ui(`effect-card effect-${d.kind}`)}
                    onClick={() => addEffect(d.id!)}
                    title={`Add ${pretty(d.id!)} to ${selected.length ? 'selected characters' : 'this clip'}`}
                  >
                    <div className={ui(`effect-art art-${i % 6}`)}>
                      <span>{d.kind === 'material' ? 'Aa' : d.phase === 'exit' ? '散' : 'あ'}</span>
                      <i />
                      <i />
                      <i />
                      <span className={ui('effect-add')}>
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
                {!filteredEffects.length && (
                  <p className={ui('empty')}>No effects match your search.</p>
                )}
              </div>
              <button
                className={ui('library-custom')}
                onClick={() => {
                  setPackSource(
                    `{\n  kind: "motion", phase: "enter", duration: 1400,\n  defaults: { radius: 120, turns: 1.5 },\n  controls: { radius: { min: 0, max: 300, step: 5 }, turns: { min: 0, max: 4, step: 0.1 } },\n  sample({ p, rand, params }) {\n    const q = Math.pow(1 - p, 3);\n    const angle = rand("angle") * Math.PI * 2 + q * params.turns * Math.PI * 2;\n    return { x: Math.cos(angle) * params.radius * q, y: Math.sin(angle) * params.radius * q, rotation: q, opacity: Math.min(1, p * 4) };\n  }\n}`,
                  );
                  setModal('code');
                }}
              >
                <Icon name="code" />
                <span>Create an effect</span>
                <Icon name="plus" />
              </button>
            </>
          ) : (
            <>
              <div className={ui('library-heading')}>
                <h2>Your composition</h2>
                <p>
                  {score.scenes.length} clips · {layers.length} layers · {seconds(duration)}
                </p>
              </div>
              <div className={ui('project-tools')}>
                <AddMediaButtons textLabel="Text clip" />
              </div>
              <div className={ui('project-clips')}>
                {score.scenes.map((c, i) => (
                  <button
                    key={c.id}
                    className={ui(c.id === clip.id ? 'active' : '')}
                    onClick={() => selectClip(c.id)}
                  >
                    <span
                      className={ui('clip-mini')}
                      style={{ color: palette[i % palette.length] }}
                    >
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
              <div className={ui('demo-section')}>
                <span className={ui('eyebrow')}>STARTING POINTS</span>
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
          )
        }
      </TabsControl>
    </aside>
  );
}
