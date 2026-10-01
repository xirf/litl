'use client';
import { useEditor } from './EditorContext';
import { cn } from '../../lib/ui';
import { seconds } from '../../lib/editor-helpers';
export default function TimelineMarkers() {
  const e = useEditor();
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 left-[188px] z-20"
      style={{ width: e.totalWidth }}
    >
      {e.score.markers?.map((marker) => (
        <div
          key={marker.id}
          className="absolute top-0 bottom-0 border-l"
          style={{ left: `${(marker.time / e.duration) * 100}%`, borderColor: marker.color }}
        >
          <button
            aria-label={`${marker.name} at ${seconds(marker.time)}`}
            title={`${marker.name} · ${seconds(marker.time)} · double-click to edit`}
            className={cn(
              'timeline-marker pointer-events-auto absolute top-0 -left-px max-w-40 truncate rounded-tr rounded-br px-2 py-0.5 text-left text-xs text-zinc-950',
              e.selectedMarkerId === marker.id && 'ring-1 ring-white',
            )}
            style={{ backgroundColor: marker.color }}
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
            {marker.name}
          </button>
        </div>
      ))}
    </div>
  );
}
