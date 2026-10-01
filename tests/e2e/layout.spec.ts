import { test, expect } from '@playwright/test';
test('preview fits landscape and portrait, File menu creates compositions and splits accept short clips', async ({
  page,
}) => {
  await page.goto('/studio');
  await expect(page.locator('.stage-frame canvas')).toBeVisible();
  const ratio = async () => {
    const box = await page.locator('.stage-frame').boundingBox();
    return box!.width / box!.height;
  };
  expect(await ratio()).toBeCloseTo(16 / 9, 2);
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'New composition', exact: true }).click();
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Stage', exact: true }).click();
  await page.getByLabel('Width', { exact: true }).fill('720');
  await page.getByLabel('Height', { exact: true }).fill('1280');
  expect(await ratio()).toBeCloseTo(9 / 16, 2);
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('s');
  await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  const ruler = await page.locator('.time-ruler').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(ruler!.x + ruler!.width * 0.2, ruler!.y + 12);
  await page.mouse.down();
  await page.mouse.move(ruler!.x + ruler!.width * 0.7, ruler!.y + 12, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(page.locator('.region-range')).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.region-range')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.region-range')).toBeVisible();
  await page.keyboard.press('m');
  const marker = await page.locator('.timeline-marker').boundingBox();
  const line = await page.locator('.timeline-marker').locator('..').boundingBox();
  expect(marker!.x).toBeCloseTo(line!.x, 0);
  expect(line!.height).toBeGreaterThan(100);
  await page.screenshot({ path: 'test-results/compact-portrait.png', fullPage: true });
});
