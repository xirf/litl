import type { Engine, Score } from './lilt';

export type VideoFormat = 'mp4' | 'mov' | 'mpeg';
export type VideoExportOptions = {
  format: VideoFormat;
  matte: string;
  range: 'all' | 'loop';
  includeAudio: boolean;
};
export type VideoProgress = { phase: string; progress: number };
type Manifest = { coreURL: string; classWorkerURL: string; parts: string[] };
const check = (signal: AbortSignal) => signal.throwIfAborted();
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function exportVideo({
  engine,
  score,
  options,
  audioURL,
  signal,
  onProgress,
}: {
  engine: Engine;
  score: Score;
  options: VideoExportOptions;
  audioURL?: string;
  signal: AbortSignal;
  onProgress: (state: VideoProgress) => void;
}): Promise<Blob> {
  const source = structuredClone(score);
  const timeline = engine.schedule(source);
  const start = options.range === 'loop' ? source.loopRegion?.start : 0;
  const end = options.range === 'loop' ? source.loopRegion?.end : timeline.duration;
  if (start == null || end == null || end <= start)
    throw Error('Set a loop region before exporting it.');
  const width = Math.round(source.stage?.width ?? 1280);
  const height = Math.round(source.stage?.height ?? 720);
  const fps = source.stage?.fps ?? 30;
  const seconds = (end - start) / 1000;
  const count = Math.ceil(seconds * fps);
  if (width * height > 3840 * 2160 || count > 10000)
    throw Error(
      'This export is too large for the browser. Use a smaller composition or export a shorter loop region.',
    );
  if (!/^#[0-9a-f]{6}$/i.test(options.matte)) throw Error('Choose a valid video background color.');
  onProgress({ phase: 'Loading video encoder…', progress: 0 });
  const [{ FFmpeg }, { fetchFile }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);
  check(signal);
  const ffmpeg = new FFmpeg();
  let wasmURL = '';
  let renderer: InstanceType<Engine['Renderer']> | undefined;
  const abort = () => ffmpeg.terminate();
  signal.addEventListener('abort', abort, { once: true });
  const logs: string[] = [];
  ffmpeg.on('log', ({ message }) => {
    logs.push(message);
    if (logs.length > 12) logs.shift();
  });
  try {
    const response = await fetch('/lilt/export/manifest.json', { signal });
    if (!response.ok) throw Error('Could not load the video encoder. Reload Studio and try again.');
    const manifest: Manifest = await response.json();
    const parts = await Promise.all(
      manifest.parts.map(async (url) => {
        const response = await fetch(url, { signal });
        if (!response.ok) throw Error('Could not download the video encoder. Try again.');
        return response.arrayBuffer();
      }),
    );
    check(signal);
    wasmURL = URL.createObjectURL(new Blob(parts, { type: 'application/wasm' }));
    await ffmpeg.load(
      {
        coreURL: new URL(manifest.coreURL, location.origin).href,
        classWorkerURL: new URL(manifest.classWorkerURL, location.origin).href,
        wasmURL,
      },
      { signal },
    );
    check(signal);
    const stage = document.createElement('canvas');
    renderer = new engine.Renderer(stage, source, {
      width,
      height,
      pixelWidth: width,
      pixelHeight: height,
      pixelRatio: 1,
      transparent: options.format === 'mov',
    });
    // A detached canvas needs explicit pixels, independent of viewport and DPR.
    stage.width = width;
    stage.height = height;
    await renderer.ready();
    check(signal);
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const context = output.getContext('2d')!;
    let inputBytes = 0;
    for (let frame = 0; frame < count; frame++) {
      check(signal);
      renderer.draw(start + (frame * 1000) / fps);
      context.clearRect(0, 0, width, height);
      if (options.format !== 'mov') {
        context.fillStyle = options.matte;
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(stage, 0, 0);
      const png = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (blob) => (blob ? resolve(blob) : reject(Error('Could not render a video frame.'))),
          'image/png',
        ),
      );
      inputBytes += png.size;
      if (inputBytes > 192 * 1024 * 1024)
        throw Error(
          'Frames exceed browser memory limits. Export a shorter loop region or reduce the composition size.',
        );
      await ffmpeg.writeFile(`frame-${String(frame).padStart(6, '0')}.png`, await fetchFile(png), {
        signal,
      });
      onProgress({
        phase: `Rendering frame ${frame + 1} of ${count}`,
        progress: ((frame + 1) / count) * 0.6,
      });
      await tick();
    }
    check(signal);
    const withAudio = options.includeAudio && !!audioURL;
    if (withAudio) {
      const response = await fetch(audioURL!, { signal });
      const data = await response.arrayBuffer();
      if (data.byteLength > 64 * 1024 * 1024)
        throw Error('Audio exceeds 64 MB. Use a smaller audio file or export without audio.');
      await ffmpeg.writeFile('audio.input', new Uint8Array(data), { signal });
    }
    const args = ['-framerate', String(fps), '-i', 'frame-%06d.png'];
    if (withAudio)
      args.push(
        '-ss',
        String(start / 1000),
        '-i',
        'audio.input',
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-af',
        'apad',
      );
    const codecs = {
      mov: ['-c:v', 'qtrle', '-pix_fmt', 'argb'],
      mp4: [
        '-vf',
        'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
      ],
      mpeg: [
        '-vf',
        'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v',
        'mpeg2video',
        '-q:v',
        '2',
        '-pix_fmt',
        'yuv420p',
      ],
    };
    args.push(...codecs[options.format]);
    if (withAudio)
      args.push('-c:a', options.format === 'mpeg' ? 'mp2' : 'aac', '-b:a', '192k', '-ar', '48000');
    else args.push('-an');
    const file = `lilt-video.${options.format === 'mpeg' ? 'mpg' : options.format}`;
    args.push('-t', String(seconds), '-y', file);
    ffmpeg.on('progress', ({ progress }) =>
      onProgress({
        phase: 'Encoding video…',
        progress: 0.6 + Math.max(0, Math.min(1, progress)) * 0.39,
      }),
    );
    onProgress({ phase: 'Encoding video…', progress: 0.6 });
    const code = await ffmpeg.exec(args, -1, { signal });
    check(signal);
    if (code !== 0)
      throw Error(
        `Video encoding failed. Try a shorter region or smaller composition. ${logs.slice(-3).join(' ')}`,
      );
    const data = await ffmpeg.readFile(file, undefined, { signal });
    if (typeof data === 'string' || !data.length)
      throw Error('The encoder returned an empty video.');
    onProgress({ phase: 'Video ready', progress: 1 });
    return new Blob([new Uint8Array(data).buffer], {
      type:
        options.format === 'mov'
          ? 'video/quicktime'
          : options.format === 'mpeg'
            ? 'video/mpeg'
            : 'video/mp4',
    });
  } finally {
    signal.removeEventListener('abort', abort);
    renderer?.destroy();
    ffmpeg.terminate();
    if (wasmURL) URL.revokeObjectURL(wasmURL);
  }
}
