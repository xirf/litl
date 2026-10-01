import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const score = {
  v: 3,
  seed: 42,
  name: 'Video export test',
  packs: { core: '3.0.0' },
  stage: { width: 161, height: 91, fps: 24 },
  duration: 1000,
  background: { transparent: true },
  loopRegion: { start: 250, end: 750 },
  layers: [{ id: 'main', rect: [0, 0, 1, 1], opacity: 0.5 }],
  effects: {
    move: {
      kind: 'motion',
      keyframes: {
        x: [
          { time: 0, value: -25 },
          { time: 1000, value: 25 },
        ],
      },
    },
  },
  scenes: [
    {
      id: 'shape',
      name: 'Moving shape',
      type: 'shape',
      layout: 'line',
      start: 0,
      duration: 1000,
      layer: 'main',
      content: [],
      shape: { kind: 'rectangle', width: 30, height: 30, fill: '#ffffff' },
      animations: [{ id: 'move', use: 'move', each: 'phrase', at: 0, duration: 1000 }],
    },
  ],
};
function wav() {
  const samples = 16000;
  const data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF');
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    data.writeInt16LE(
      i < 4000 ? 0 : Math.round(Math.sin((i * 2 * Math.PI * 440) / 8000) * 5000),
      44 + i * 2,
    );
  return data;
}

test('video exports encode MP4, real-alpha MOV, and MPEG with loop timing and imported audio', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Effects library' })).toBeVisible();
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({
    name: 'video.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(score)),
  });
  await page
    .locator('input[type=file][accept="audio/*"]')
    .setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.getByText('tone.wav', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Video export' });
  await panel.getByLabel('Export range', { exact: true }).selectOption('loop');
  await panel.getByLabel('Video background', { exact: true }).fill('#204060');
  for (const format of ['mp4', 'mov', 'mpeg']) {
    await panel.getByLabel('Video format', { exact: true }).selectOption(format);
    const promise = page.waitForEvent('download', { timeout: 120000 });
    await panel.getByRole('button', { name: 'Export video', exact: true }).click();
    const download = await promise;
    const path = info.outputPath(download.suggestedFilename());
    await download.saveAs(path);
    const probe = JSON.parse(
      execFileSync('ffprobe', [
        '-v',
        'error',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        path,
      ]).toString(),
    );
    const video = probe.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
    const audio = probe.streams.find((s: { codec_type: string }) => s.codec_type === 'audio');
    expect(video.codec_name).toBe(
      format === 'mov' ? 'qtrle' : format === 'mpeg' ? 'mpeg2video' : 'h264',
    );
    expect(video.width).toBe(format === 'mov' ? 161 : 162);
    expect(video.height).toBe(format === 'mov' ? 91 : 92);
    expect(audio.codec_name).toBe(format === 'mpeg' ? 'mp2' : 'aac');
    if (format !== 'mpeg') expect(Number(video.duration)).toBeCloseTo(0.5, 1);
    if (format === 'mp4') {
      const pixels = execFileSync('ffmpeg', [
        '-v',
        'error',
        '-i',
        path,
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        'pipe:1',
      ]);
      [32, 64, 96].forEach((value, i) => expect(Math.abs(pixels[i] - value)).toBeLessThan(6));
      const pcm = execFileSync('ffmpeg', [
        '-v',
        'error',
        '-i',
        path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '8000',
        '-f',
        's16le',
        'pipe:1',
      ]);
      const rms = (start: number) => {
        let power = 0;
        for (let i = start; i < start + 800; i++) power += pcm.readInt16LE(i * 2) ** 2;
        return Math.sqrt(power / 800);
      };
      expect(rms(400)).toBeLessThan(5);
      expect(rms(2800)).toBeGreaterThan(1000);
    }
    if (format === 'mov') {
      expect(video.pix_fmt).toBe('argb');
      const pixels = execFileSync('ffmpeg', [
        '-v',
        'error',
        '-i',
        path,
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        'pipe:1',
      ]);
      const alpha = [...pixels].filter((_, i) => i % 4 === 3);
      expect(Math.min(...alpha)).toBe(0);
      expect(Math.max(...alpha)).toBeGreaterThanOrEqual(126);
      expect(Math.max(...alpha)).toBeLessThanOrEqual(129);
    }
    expect((await readFile(path)).length).toBeGreaterThan(1000);
    await expect(panel.getByRole('button', { name: 'Export video', exact: true })).toBeEnabled();
  }
  expect(errors).toEqual([]);
});

test('video export can be cancelled and restarted without changing the composition', async ({
  page,
}) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Effects library' })).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Export video', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel export', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export video', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
