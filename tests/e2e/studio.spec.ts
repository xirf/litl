import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('studio loads without runtime errors and can edit, undo, and keyframe a clip', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  await expect(page.locator('.stage-frame canvas')).toBeVisible();
  await expect(page.locator('.stage-frame')).toHaveClass(/checker/);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  const original = await page.getByRole('textbox', { name: 'Lyric text' }).inputValue();
  await page.getByRole('textbox', { name: 'Lyric text' }).fill('あ' + original);
  await page.getByRole('textbox', { name: 'Lyric text' }).blur();
  await expect(page.getByRole('textbox', { name: 'Lyric text' })).toHaveValue('あ' + original);
  await page.getByRole('button', { name: 'Undo (⌘/Ctrl Z)', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Lyric text' })).toHaveValue(original);
  await page.getByRole('tab', { name: 'Keys', exact: true }).click();
  await page.getByLabel('Value at playhead', { exact: true }).fill('120');
  await page.getByRole('button', { name: 'Add / update keyframe' }).click();
  await expect(page.locator('.key-list button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await page.getByLabel('Value at playhead', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Add / update keyframe' }).click();
  await expect(page.locator('.key-list button')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Motion', exact: true }).click();
  expect(await page.locator('.effect-stack button').count()).toBeGreaterThan(1);
  await page.getByRole('tab', { name: 'Stage', exact: true }).click();
  await page.getByLabel('Transparent background').check();
  await expect(page.locator('.stage-frame')).toHaveClass(/checker/);
  expect(errors).toEqual([]);
});

test('clip dragging, resizing, audio decoding, import and standalone export', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  const clip = page.locator('.timeline-clip').first();
  const rect = (await clip.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + 15);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 60, rect.y + 15, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const start = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).score.scenes[0].start,
  );
  expect(start).toBeGreaterThan(0);
  // Resize a clip from its right edge.
  const resized = (await clip.boundingBox())!;
  await page.mouse.move(resized.x + resized.width - 2, resized.y + 15);
  await page.mouse.down();
  await page.mouse.move(resized.x + resized.width + 20, resized.y + 15, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).score.scenes[0].duration,
    ),
  ).toBeGreaterThan(7200);
  // Generate a real WAV and exercise decoding, waveform, and audio cleanup.
  const wav = Buffer.alloc(44 + 16000);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++)
    wav.writeInt16LE(Math.round(Math.sin((i / 8000) * 440 * Math.PI * 2) * 6000), 44 + i * 2);
  await page
    .locator('input[type=file][accept="audio/*"]')
    .setInputFiles({ name: 'test-tone.wav', mimeType: 'audio/wav', buffer: wav });
  await expect(page.locator('.audio-row')).toContainText('test-tone.wav');
  await expect(page.locator('.audio-lane>svg')).toBeVisible();
  await page.getByRole('button', { name: 'Remove audio', exact: true }).click();
  await page.getByRole('tab', { name: 'Project', exact: true }).click();
  await page.getByRole('button', { name: 'Duet + silence', exact: true }).click();
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await page.waitForTimeout(650);
  const live = await page.evaluate(async () => {
    const entry = '/lilt/index.js';
    const module = await import(entry);
    const score = JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).score;
    return module.default.activeClips(module.default.schedule(score), 0).length;
  });
  expect(live).toBe(0);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Standalone player/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('lilt-player.html');
  const file = await download.path();
  expect(file).toBeTruthy();
  // Chromium's environment policy blocks file://; evaluate the exported document offline.
  const player = await page.context().newPage();
  const errors: string[] = [];
  player.on('pageerror', (e) => errors.push(e.message));
  await player.context().setOffline(true);
  await player.setContent(await readFile(file!, 'utf8'));
  await player.evaluate(() => {
    (window as any).liltPlayer?.pause();
  });
  await player.waitForFunction(() => !!(window as any).liltPlayer);
  const alpha = await player.evaluate(() => {
    const p = (window as any).liltPlayer;
    p.seek(0);
    const data = p.renderer.ctx.getImageData(
      0,
      0,
      p.renderer.canvas.width,
      p.renderer.canvas.height,
    ).data;
    return data.some((v: number, i: number) => i % 4 === 3 && v !== 0);
  });
  expect(alpha).toBe(false);
  expect(errors).toEqual([]);
});

test('vanilla ESM player transparency, deterministic seeks, transport, and mobile layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/player.html?autoplay=0&transparent=1');
  await page.waitForFunction(() => !!(window as any).liltPlayer);
  const result = await page.evaluate(() => {
    const p = (window as any).liltPlayer;
    p.seek(2400);
    const first = p.renderer.ctx.getImageData(
      0,
      0,
      p.renderer.canvas.width,
      p.renderer.canvas.height,
    );
    p.seek(5400);
    p.seek(2400);
    const second = p.renderer.ctx.getImageData(
      0,
      0,
      p.renderer.canvas.width,
      p.renderer.canvas.height,
    );
    return {
      same: first.data.every((v: number, i: number) => v === second.data[i]),
      corner: second.data[3],
      visible: second.data.some((v: number, i: number) => i % 4 === 3 && v > 0),
    };
  });
  expect(result).toEqual({ same: true, corner: 0, visible: true });
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/studio-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('custom packs survive explicit restoration and OBS relay controls a separate player', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  await page.getByRole('button', { name: /Create an effect/ }).click();
  await page.getByRole('button', { name: 'Register trusted code', exact: true }).click();
  const custom = page.locator('.effect-card').filter({ hasText: 'User/Helix' });
  await expect(custom).toBeVisible();
  await custom.click();
  await expect(page.locator('.effect-stack')).toContainText('User/Helix');
  await page.getByRole('button', { name: 'Edit effect code', exact: true }).click();
  const effectSource = page.getByRole('textbox', { name: 'Custom effect JavaScript' });
  const originalSource = await effectSource.inputValue();
  expect(originalSource).toContain('sample');
  await effectSource.fill(originalSource + '\n// Edited in Studio');
  await page.getByRole('button', { name: 'Register trusted code', exact: true }).click();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Restore & run trusted code', exact: true }),
  ).toBeVisible();
  // Waiting must not overwrite the pending saved project with the demo.
  await page.waitForTimeout(650);
  expect(
    await page.evaluate(
      () => !!JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).packSources.helix,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Restore & run trusted code', exact: true }).click();
  await page.getByRole('tab', { name: 'Motion', exact: true }).click();
  await expect(page.locator('.effect-stack')).toContainText('User/Helix');
  // Load a core-only project for a player with no user pack preinstalled.
  await page.getByRole('tab', { name: 'Project', exact: true }).click();
  await page.getByRole('button', { name: 'Duet + silence', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Connect relay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toBeVisible();
  const player = await page.context().newPage();
  await player.goto('/player.html?autoplay=0&socket=ws%3A%2F%2F127.0.0.1%3A8787');
  await player.waitForFunction(
    () =>
      !!(window as any).liltPlayer?.socket && (window as any).liltPlayer.socket.readyState === 1,
  );
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await player.waitForFunction(() => Math.abs((window as any).liltPlayer.time) < 1);
  await page.getByRole('button', { name: 'Play (Space)', exact: true }).click();
  await player.waitForFunction(() => (window as any).liltPlayer.playing);
  await page.getByRole('button', { name: 'Pause (Space)', exact: true }).click();
  await player.waitForFunction(() => !(window as any).liltPlayer.playing);
  expect(errors).toEqual([]);
  await player.close();
});

test('shape/image clips, editable Bézier easing and paths survive offline export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  await page
    .locator('.timeline-toolbar')
    .getByRole('button', { name: 'Shape', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Shape geometry' })).toBeVisible();
  await page.getByLabel('Shape', { exact: true }).selectOption('star');
  await page.getByLabel('Width', { exact: true }).fill('200');
  await page.getByRole('tab', { name: 'Keys', exact: true }).click();
  await page.getByRole('button', { name: 'Add Bézier path' }).click();
  await expect(page.getByLabel('Cubic Bézier motion path', { exact: true })).toBeVisible();
  await page.getByLabel('Path start X', { exact: true }).fill('-180');
  await page.getByLabel('Rotate along the path', { exact: true }).check();
  await page.getByLabel('Path timing', { exact: true }).selectOption('bezier');
  await page.getByLabel('Bezier X1', { exact: true }).fill('.2');
  const handle = page.getByRole('button', { name: 'Second easing handle' });
  const playheadBefore = await page.locator('.timeline-right').innerText();
  await handle.focus();
  await handle.press('ArrowLeft');
  expect(await page.locator('.timeline-right').innerText()).toBe(playheadBefore);
  await page.waitForTimeout(650);
  const shape = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).score.scenes.at(-1),
  );
  expect(shape.type).toBe('shape');
  expect(shape.shape.kind).toBe('star');
  expect(shape.shape.width).toBe(200);
  expect(shape.animations[0].ease).toEqual([0.2, 0, 0.56, 1]);
  const easingBox = (await page
    .getByRole('button', { name: 'First easing handle' })
    .boundingBox())!;
  await page.mouse.move(easingBox.x + easingBox.width / 2, easingBox.y + easingBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    easingBox.x + easingBox.width / 2 + 20,
    easingBox.y + easingBox.height / 2 - 10,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByLabel('Bezier X1', { exact: true })).not.toHaveValue('0.2');

  await page.screenshot({ path: 'test-results/bezier-path-studio.png', fullPage: true });
  // Generate a transparent PNG and exercise actual image decoding/embedding.
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 40;
    const x = c.getContext('2d')!;
    x.fillStyle = '#ff3300';
    x.fillRect(10, 5, 60, 30);
    return c.toDataURL().split(',')[1];
  });
  await page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({
    name: 'badge.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await expect(page.getByRole('heading', { name: 'Image geometry' })).toBeVisible();
  await page.getByRole('tab', { name: 'Keys', exact: true }).click();
  await page.getByRole('button', { name: 'Add Bézier path' }).click();
  await page.getByLabel('Value at playhead', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Add / update keyframe' }).click();
  await page.getByLabel('Interpolation to next key', { exact: true }).selectOption('bezier');
  await expect(page.getByLabel('Cubic Bézier timing curve', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /Standalone player/ }).click();
  const download = await pending;
  const html = await readFile((await download.path())!, 'utf8');
  expect(html).toContain('data:image/webp;base64');
  const player = await page.context().newPage();
  player.on('pageerror', (e) => errors.push(e.message));
  await player.context().setOffline(true);
  await player.setContent(html);
  await player.waitForFunction(() => !!(window as any).liltPlayer);
  const result = await player.evaluate(async () => {
    const p = (window as any).liltPlayer;
    p.pause();
    await p.renderer.ready();
    const scene = p.renderer.score.scenes.at(-1);
    p.seek(scene.start + 2000);
    const pixels = () =>
      p.renderer.ctx.getImageData(0, 0, p.renderer.canvas.width, p.renderer.canvas.height).data;
    const a = pixels();
    p.seek(scene.start + 4000);
    p.seek(scene.start + 2000);
    const b = pixels();
    const cache = p.renderer.caches.get(p.renderer.score.scenes.length - 1);
    const source = cache.glyphs[0].bitmap
      .getContext('2d')
      .getImageData(0, 0, cache.glyphs[0].bitmap.width, cache.glyphs[0].bitmap.height).data;
    return {
      same: a.every((v: number, i: number) => v === b[i]),
      transparent: a[3] === 0,
      red: source.some(
        (v: number, i: number) => i % 4 === 0 && v > 220 && source[i + 1] < 90 && source[i + 3] > 0,
      ),
      imageLoaded: [...p.renderer.images.values()].every((x: any) => x.loaded),
      types: p.renderer.score.scenes.slice(-2).map((c: any) => c.type),
    };
  });
  expect(result).toEqual({
    same: true,
    transparent: true,
    red: true,
    imageLoaded: true,
    types: ['shape', 'image'],
  });
  expect(errors).toEqual([]);
});

test('clip code validation, context menus, region-only playback and touchpad panning', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Make words move.' })).toBeVisible();
  await page
    .locator('.timeline-toolbar')
    .getByRole('button', { name: 'Shape', exact: true })
    .click();
  const item = page.locator('.timeline-clip').last();
  await item.click({ button: 'right' });
  await expect(page.getByRole('menu', { name: 'Timeline actions' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Edit clip code', exact: true }).click();
  const code = page.getByRole('textbox', { name: 'Clip JSON', exact: true });
  const clip = JSON.parse(await code.inputValue());
  await code.fill(JSON.stringify({ ...clip, duration: 0 }));
  await page.getByRole('button', { name: 'Validate & apply' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await code.fill(
    JSON.stringify({ ...clip, name: 'Code badge', shape: { ...clip.shape, kind: 'ellipse' } }),
  );
  await page.getByRole('button', { name: 'Validate & apply' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Shape', { exact: true })).toHaveValue('ellipse');
  await page.getByRole('button', { name: 'Loop selected clip', exact: true }).click();
  await expect(page.getByLabel('Enable timeline loop')).toBeChecked();
  await page.getByLabel('Loop start', { exact: true }).fill('1.2');
  await page.getByLabel('Loop end', { exact: true }).fill('1.5');
  await page.getByRole('button', { name: 'Play (Space)', exact: true }).click();
  await page.waitForTimeout(850);
  const displayed = await page.locator('.timeline-right > span').first().innerText();
  const seconds = Number(displayed.replace('s', ''));
  expect(seconds).toBeGreaterThanOrEqual(1.2);
  expect(seconds).toBeLessThanOrEqual(1.5);
  await page.getByRole('button', { name: 'Pause (Space)', exact: true }).click();
  await page.getByLabel('Loop end', { exact: true }).fill('10');
  await page.getByLabel('Loop start', { exact: true }).fill('2');
  const end = page.getByRole('button', { name: 'Drag loop end', exact: true }),
    box = (await end.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(Number(await page.getByLabel('Loop end', { exact: true }).inputValue())).toBeGreaterThan(
    10,
  );
  await page.getByLabel('Timeline zoom', { exact: true }).fill('4');
  const scroller = page.locator('.timeline-scroll');
  await scroller.hover();
  await page.mouse.wheel(350, 0);
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  const url = page.url();
  await page.mouse.wheel(-1500, 0);
  await page.waitForTimeout(100);
  expect(page.url()).toBe(url);
  await page.getByLabel('Horizontal swipe action', { exact: true }).selectOption('clips');
  await scroller.hover();
  await page.mouse.wheel(-100, 0);
  await expect(page.locator('.selected-summary strong')).not.toHaveText('Code badge');
  await page.mouse.wheel(100, 0);
  await expect(page.locator('.selected-summary strong')).toHaveText('Code badge');

  await page.screenshot({ path: 'test-results/loop-region-code.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('vanilla player loops a score region with exact overshoot and transports loop mode', async ({
  page,
}) => {
  await page.goto('/player.html?autoplay=0');
  await page.waitForFunction(() => !!(window as any).liltPlayer);
  const result = await page.evaluate(async () => {
    const p = (window as any).liltPlayer;
    const score = structuredClone(p.renderer.score);
    score.loopRegion = { start: 1000, end: 1400 };
    p.load(score);
    p.setLoop(true);
    p.seek(5000);
    await p.play();
    const initial = p.time;
    cancelAnimationFrame(p.frame);
    p.tick(p.anchor + 1850);
    const wrapped = p.time;
    p.pause();
    p.command({ type: 'lilt', action: 'loop', loop: false });
    p.seek(5000);
    await p.play();
    const unrestricted = p.time;
    p.pause();
    return { initial, wrapped, unrestricted, loop: p.loop };
  });
  expect(result).toEqual({ initial: 1000, wrapped: 1050, unrestricted: 5000, loop: false });
});
