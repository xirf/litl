'use client';
import { Tooltip } from 'radix-ui';
import { ui } from '../lib/ui';
import { useStudioController } from '../hooks/useStudioController';
import { EditorContext } from './editor/EditorContext';
import EditorHeader from './editor/EditorHeader';
import LibraryPanel from './editor/LibraryPanel';
import PreviewPanel from './editor/PreviewPanel';
import InspectorPanel from './editor/InspectorPanel';
import TimelinePanel from './editor/TimelinePanel';
import EditorFooter from './editor/EditorFooter';
import CommandPalette from './editor/CommandPalette';
import MarkerDialog from './editor/MarkerDialog';
import EditorOverlays from './editor/EditorOverlays';
export default function Studio() {
  const editor = useStudioController();
  if (!editor.ready)
    return (
      <div className={ui('studio loading')}>
        <div className={ui('logo-mark')}>lilt.</div>
        <p role="status">{editor.status}</p>
        <a href="/">Back home</a>
      </div>
    );
  return (
    <Tooltip.Provider delayDuration={400}>
      <EditorContext.Provider value={editor}>
        <div className={ui('studio')}>
          <EditorHeader />
          <div className={ui('workspace')}>
            <LibraryPanel />
            <PreviewPanel />
            <InspectorPanel />
          </div>
          <TimelinePanel />
          <EditorFooter />
          <EditorOverlays />
          <CommandPalette />
          <MarkerDialog />
        </div>
      </EditorContext.Provider>
    </Tooltip.Provider>
  );
}
