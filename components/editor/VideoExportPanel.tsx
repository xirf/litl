'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Field, Input, Select } from '../ui';
import { useEditor } from './EditorContext';
import { download } from '../../lib/lilt';
import { ui } from '../../lib/ui';
import {
  exportVideo,
  type VideoExportOptions,
  type VideoFormat,
  type VideoProgress,
} from '../../lib/video-export';

export default function VideoExportPanel() {
  const { engine, score, audioURL, audioName, pause, setStatus } = useEditor();
  const [options, setOptions] = useState<VideoExportOptions>({
    format: 'mp4',
    matte: '#000000',
    range: 'all',
    includeAudio: true,
  });
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const start = async () => {
    if (active.current) return;
    pause();
    setError('');
    const controller = new AbortController();
    active.current = controller;
    const audio = audioURL.current;
    try {
      const blob = await exportVideo({
        engine,
        score,
        options,
        audioURL: audio,
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;
      const name = (score.name || 'lilt-video')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
        .slice(0, 100);
      download(blob, `${name}.${options.format === 'mpeg' ? 'mpg' : options.format}`, blob.type);
      setStatus('Video exported.');
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : String(error));
      else setStatus('Video export cancelled.');
    } finally {
      if (active.current === controller) {
        active.current = null;
        setProgress(null);
      }
    }
  };
  const busy = progress !== null;
  return (
    <section
      className="mb-5 space-y-3 rounded-md border border-zinc-700 p-4"
      aria-label="Video export"
    >
      <h3 className="text-sm font-medium text-zinc-100">Video</h3>
      <Field label="Video format">
        <Select
          aria-label="Video format"
          disabled={busy}
          value={options.format}
          onChange={(e) => setOptions({ ...options, format: e.target.value as VideoFormat })}
        >
          <option value="mp4">MP4 · H.264</option>
          <option value="mov">MOV · Transparent (QuickTime Animation)</option>
          <option value="mpeg">MPEG · MPEG-2</option>
        </Select>
      </Field>
      <Field label="Export range">
        <Select
          aria-label="Export range"
          disabled={busy}
          value={options.range}
          onChange={(e) => setOptions({ ...options, range: e.target.value as 'all' | 'loop' })}
        >
          <option value="all">Entire composition</option>
          <option value="loop" disabled={!score.loopRegion}>
            Loop region
          </option>
        </Select>
      </Field>
      {options.format !== 'mov' && (
        <Field label="Video background">
          <Input
            aria-label="Video background"
            type="color"
            disabled={busy}
            value={options.matte}
            onChange={(e) => setOptions({ ...options, matte: e.target.value })}
          />
        </Field>
      )}
      <label className={ui('checkbox')}>
        <Input
          type="checkbox"
          disabled={busy || !audioName}
          checked={options.includeAudio && !!audioName}
          onChange={(e) => setOptions({ ...options, includeAudio: e.target.checked })}
        />
        Include imported audio
      </label>
      <p className="text-xs leading-relaxed text-zinc-400">
        {score.stage!.width} × {score.stage!.height} · {score.stage!.fps} fps.{' '}
        {options.format === 'mov'
          ? 'Preserves transparency for OBS and video editors. Lossless files may be large.'
          : 'MP4 and MPEG use an opaque background.'}{' '}
        Export stays on this device. The encoder downloads on first use.
      </p>
      {progress && (
        <div role="status" aria-live="polite" className="space-y-2 text-xs text-zinc-300">
          <p>
            {progress.phase} · {Math.round(progress.progress * 100)}%
          </p>
          <progress
            aria-label="Video export progress"
            value={progress.progress}
            max={1}
            className="h-2 w-full accent-violet-400"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs leading-relaxed text-rose-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button icon="download" disabled={busy} onClick={() => void start()}>
          Export video
        </Button>
        {busy && <Button onClick={() => active.current?.abort()}>Cancel export</Button>}
      </div>
    </section>
  );
}
