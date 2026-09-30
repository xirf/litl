'use client';
import AppDialog from '../ui/AppDialog';
import { Field, Input, NumberField, Button } from '../ui';
import { useEditor } from './EditorContext';
export default function MarkerDialog() {
  const e = useEditor(),
    m = e.selectedMarker;
  if (!m) return null;
  return (
    <AppDialog
      open={e.markerDialogOpen}
      title="Edit timeline marker"
      onClose={() => e.setMarkerDialogOpen(false)}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold">Edit timeline marker</h2>
        <Button
          icon="close"
          title="Close marker editor"
          onClick={() => e.setMarkerDialogOpen(false)}
        />
      </div>
      <div className="space-y-4">
        <Field label="Marker name">
          <Input
            aria-label="Marker name"
            defaultValue={m.name}
            onBlur={(event) => e.updateMarker({ ...m, name: event.target.value })}
          />
        </Field>
        <NumberField
          label="Marker time"
          value={m.time / 1000}
          min={0}
          max={e.duration / 1000}
          step={0.1}
          suffix="s"
          onChange={(n) => e.updateMarker({ ...m, time: Math.round(n * 1000) })}
        />
        <Field label="Marker color">
          <Input
            type="color"
            aria-label="Marker color"
            value={m.color}
            onChange={(event) => e.updateMarker({ ...m, color: event.target.value })}
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-between">
        <Button icon="trash" onClick={e.deleteMarker}>
          Delete marker
        </Button>
        <Button className="primary" onClick={() => e.setMarkerDialogOpen(false)}>
          Done
        </Button>
      </div>
    </AppDialog>
  );
}
