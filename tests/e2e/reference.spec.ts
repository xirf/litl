import { test, expect } from '@playwright/test';

test('reference lyrics load, preserve italic styles, and render in the vanilla OBS player', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio');
  await page.getByRole('tab', { name: 'Project', exact: true }).click();
  await page.getByRole('button', { name: 'I’m a mess · Reference lyrics', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Lyric text' })).toHaveValue("I'm a mess");
  await expect(page.getByLabel('Italic text', { exact: true })).toBeChecked();
  await page.waitForTimeout(650);
  const score = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lilt-studio-project-v1')!).score,
  );
  expect(score.background.transparent).toBe(true);
  expect(score.duration).toBe(27792);
  expect(score.scenes).toHaveLength(25);
  expect(
    score.scenes
      .find((clip: { id: string }) => clip.id === 'voice')
      .content.map((g: { text: string }) => g.text)
      .join(''),
  ).toBe('失いかけた声を上げて');
  await page.getByLabel('Italic text', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Undo (⌘/Ctrl Z)', exact: true }).click();
  await expect(page.getByLabel('Italic text', { exact: true })).toBeChecked();

  await page.goto('/player.html?score=/examples/akubi-mess.json&autoplay=0&time=2000');
  await page.waitForFunction(
    () => !!(window as any).liltPlayer?.renderer.cache?.glyphs[0]?.font.includes('italic'),
  );
  const opaquePixels = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas')!;
      const bytes = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let i = 3; i < bytes.length; i += 4) if (bytes[i]) opaque++;
      return opaque;
    });
  expect(await opaquePixels()).toBeGreaterThan(100);
  await page.evaluate(() => (window as any).liltPlayer.seek(15000));
  expect(await opaquePixels()).toBe(0);
  await page.evaluate(() => (window as any).liltPlayer.seek(18000));
  expect(await opaquePixels()).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});
