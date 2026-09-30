'use client';
import { useEditor } from './EditorContext';
import { ui, cn } from '../../lib/ui';
import { seconds } from '../../lib/editor-helpers';
import Icon from '../Icon';
export default function TimelineMarkers() {
  const e = useEditor();
  return (
    <div className={cn(ui('timeline-row'), 'marker-row h-9')}>
      <div className={ui('track-label')}>
        <Icon name="marker" />
        <span>MARKERS</span>
        <span className="ml-auto text-zinc-500">{e.score.markers?.length || 0}</span>
      </div>
      <div
        className="marker-lane relative h-9 shrink-0 bg-zinc-950/60"
        style={{ width: e.totalWidth }}
      >
        {e.score.markers?.map((marker) => (
          <button
            key={marker.id}
            aria-label={`${marker.name} at ${seconds(marker.time)}`}
            title={`${marker.name} · ${seconds(marker.time)} · double-click to edit`}
            className={cn(
              'timeline-marker absolute inset-y-1 flex -translate-x-1/2 items-center gap-1 rounded px-1 text-xs hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-violet-300',
              e.selectedMarkerId === marker.id && 'bg-zinc-800 ring-1 ring-amber-300/50',
            )}
            style={{ left: `${(marker.time / e.duration) * 100}%`, color: marker.color }}
            onClick={() => {
              e.pause();
              e.seek(marker.time);
              e.setSelectedMarkerId(marker.id);
            }}
            onDoubleClick={() => {
              e.setSelectedMarkerId(marker.id);
              e.setMarkerDialogOpen(true);
            }}
            onContextMenu={(event) => {
              e.setSelectedMarkerId(marker.id);
              e.openContext(event, undefined, marker.time);
            }}
          >
            <Icon name="marker" />
            <span className="max-w-28 truncate">{marker.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
