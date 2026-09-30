'use client';
import { Button } from '../ui';
import { useEditor } from './EditorContext';
export default function AddMediaButtons({ textLabel = 'Text' }: { textLabel?: string }) {
  const e = useEditor();
  return (
    <>
      <Button
        icon="plus"
        title={textLabel === 'Text' ? 'New text clip (N)' : undefined}
        onClick={e.addClip}
      >
        {textLabel}
      </Button>
      <Button icon="diamond" onClick={() => e.addVisual('shape')}>
        Shape
      </Button>
      <Button icon="film" onClick={() => e.imageInput.current?.click()}>
        Image
      </Button>
      <Button icon="music" onClick={() => e.audioInput.current?.click()}>
        Audio
      </Button>
    </>
  );
}
