'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import { TabsControl } from '../ui';
import { Button } from '../ui';

import { seconds } from '../../lib/editor-helpers';
import ClipInspector from './ClipInspector';
import MotionInspector from './MotionInspector';
import KeyframeInspector from './KeyframeInspector';
import StageInspector from './StageInspector';
export default function InspectorPanel() {
  const {
    selected,
    inspectorTab,
    setInspectorTab,
    clip,
    duplicateClip,
    duration,
    visual,
    glyphs,
    style,
    currentIndex,
    color,
  } = useEditor();
  return (
    <aside className={ui('inspector')}>
      <div className={ui('inspector-heading')}>
        <span>
          <Icon name="settings" />
          Inspector
        </span>
        <span className={ui('selection-tag')}>
          {visual ? clip.type!.toUpperCase() : selected.length ? 'CHARACTER' : 'TEXT CLIP'}
        </span>
      </div>
      <div className={ui('selected-summary')}>
        <span className={ui('selected-icon')} style={{ color }}>
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
      <TabsControl
        label="Inspector"
        value={inspectorTab}
        onChange={setInspectorTab}
        listClass="inspector-tabs"
        contentClass="inspector-body"
        items={[
          { id: 'clip', label: visual ? 'Object' : 'Text' },
          { id: 'motion', label: 'Motion' },
          { id: 'keys', label: 'Keys' },
          { id: 'stage', label: 'Stage' },
        ]}
      >
        {(id) =>
          id === 'clip' ? (
            <ClipInspector />
          ) : id === 'motion' ? (
            <MotionInspector />
          ) : id === 'keys' ? (
            <KeyframeInspector />
          ) : (
            <StageInspector />
          )
        }
      </TabsControl>
      <div className={ui('inspector-foot')}>
        <Icon name="bolt" size={12} />
        <span>Deterministic. Seek anywhere.</span>
      </div>
    </aside>
  );
}
