import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { overlapsGuide, OverlapTimer } from '../../lib/safe-areas';

const area = { id: 'guide', x: 0, y: 0, width: 10, height: 10 };
test('safe-area bounds account for rotation and layer clipping', () => {
  const hit = {
    scene: 0,
    i: 0,
    x: 15,
    y: 5,
    width: 12,
    height: 2,
    rotation: 0,
    clip: [0, 0, 100, 100] as [number, number, number, number],
  };
  expect(overlapsGuide(hit, area)).toBe(true);
  expect(overlapsGuide({ ...hit, rotation: Math.PI / 2 }, area)).toBe(false);
  expect(overlapsGuide({ ...hit, clip: [11, 0, 89, 100] }, area)).toBe(false);
  expect(overlapsGuide({ ...hit, width: 0 }, area)).toBe(false);
});

test('continuous overlap turns red after one playback second and resets on exit or seeking', () => {
  const timer = new OverlapTimer(),
    keys = new Set(['clip:guide']);
  const update = (time: number, playing = true) =>
    timer.update(keys, time, playing).get('clip:guide');
  expect(update(0)).toBe('yellow');
  for (let time = 100; time <= 1000; time += 100) expect(update(time)).toBe('yellow');
  expect(update(1001)).toBe('red');
  expect(update(1001, false)).toBe('red');
  expect(update(1001, false)).toBe('red');
  timer.update(new Set(), 1001, false);
  expect(update(1001, false)).toBe('yellow');
  expect(update(6000)).toBe('yellow');
  expect(update(0)).toBe('yellow');
  timer.reset();
  expect(update(10000)).toBe('yellow');
  const paused = new OverlapTimer();
  for (let time = 0; time <= 2000; time += 100)
    expect(paused.update(keys, time, false).get('clip:guide')).toBe('yellow');
});

const score = {
  v: 3,
  seed: 42,
  name: 'Safe-area test',
  packs: { core: '3.0.0' },
  stage: { width: 400, height: 240, fps: 24 },
  duration: 5000,
  background: { transparent: true },
  layers: [{ id: 'main', rect: [0, 0, 1, 1], opacity: 1 }],
  scenes: [
    {
      id: 'shape',
      name: 'Stationary shape',
      type: 'shape',
      layout: 'line',
      start: 0,
      duration: 5000,
      layer: 'main',
      content: [],
      shape: { kind: 'rectangle', width: 60, height: 60, fill: '#ffffff' },
      animations: [],
    },
  ],
};

test('drawn guides warn during playback and stay out of PNGs and project JSON', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Effects library' })).toBeVisible();
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({
    name: 'safe.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(score)),
  });
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await page.waitForTimeout(750);
  const before = await page
    .locator('.stage-frame canvas')
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  const stored = await page.evaluate(() => localStorage.getItem('lilt-studio-project-v1'));
  await page.getByRole('button', { name: 'Draw safe area', exact: true }).click();
  const surface = page.getByLabel('Safe-area drawing surface');
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25, { steps: 5 });
  await page.mouse.up();
  const guide = page.locator('[data-safe-area]');
  await expect(guide).toHaveAttribute('data-status', 'yellow');
  await page.waitForTimeout(1200);
  await expect(guide).toHaveAttribute('data-status', 'yellow');
  expect(
    await page
      .locator('.stage-frame canvas')
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL()),
  ).toBe(before);
  expect(await page.evaluate(() => localStorage.getItem('lilt-studio-project-v1'))).toBe(stored);
  const pngPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save current frame as PNG', exact: true }).click();
  const png = await pngPromise;
  expect((await readFile((await png.path())!)).toString('base64')).toBe(before.split(',')[1]);
  await page.getByRole('button', { name: 'Play (Space)', exact: true }).click();
  await expect(guide).toHaveAttribute('data-status', 'red', { timeout: 4000 });
  await page.getByRole('button', { name: 'Pause (Space)', exact: true }).click();
  await expect(guide).toHaveAttribute('data-status', 'red');
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await expect(guide).toHaveAttribute('data-status', 'yellow');
  await page.getByRole('button', { name: 'Hide safe areas', exact: true }).click();
  await expect(guide).toHaveCount(0);
  await page.getByRole('button', { name: 'Show safe areas', exact: true }).click();
  await expect(guide).toHaveAttribute('data-status', 'yellow');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const jsonPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Score JSON/ }).click();
  const json = JSON.parse(await readFile((await (await jsonPromise).path())!, 'utf8'));
  expect(json.score || json).toEqual(JSON.parse(stored!).score);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page
    .getByLabel('Remove safe area', { exact: true })
    .selectOption((await guide.getAttribute('data-safe-area')) as string);
  await expect(guide).toHaveCount(0);
  expect(errors).toEqual([]);
});
