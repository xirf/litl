import { test, expect } from '@playwright/test';

test('keyboard creation, trimming, splitting, deletion and undo respect text input', async ({
  page,
}) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Effects library' })).toBeVisible();
  await page.getByRole('button', { name: 'New composition (⌘/Ctrl Alt N)', exact: true }).click();
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('n');
  await expect(page.locator('.timeline-clip')).toHaveCount(2);
  const text = page.getByRole('textbox', { name: 'Lyric text' });
  await text.focus();
  await page.keyboard.press('n');
  await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await text.blur();
  await page.keyboard.press('Delete');
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await page.keyboard.press('Alt+ArrowLeft');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('w');
  await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('2');
  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('6');
  await page.keyboard.press('q');
  await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('4');
  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('6');
  await page.keyboard.press('s');
  await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('4');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search editor actions' }).fill('fit timeline');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+Alt+n');
  await expect(page.locator('.timeline-clip')).toHaveCount(1);
  await expect(page.locator('.stage-frame')).toHaveClass(/checker/);
});

test('markers support editing, context actions, navigation, deletion and persisted restoration', async ({
  page,
}) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'Effects library' })).toBeVisible();
  await page.getByRole('button', { name: 'New composition (⌘/Ctrl Alt N)', exact: true }).click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('m');
  await expect(page.locator('.timeline-marker')).toHaveCount(1);
  await page.locator('.timeline-marker').dblclick();
  await page.getByRole('textbox', { name: 'Marker name' }).fill('Chorus');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.timeline-marker')).toContainText('Chorus');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('m');
  await expect(page.locator('.timeline-marker')).toHaveCount(2);
  await page.keyboard.press('Alt+m');
  await expect(page.locator('.timeline-right')).toContainText('1.00s');
  await page.keyboard.press('Shift+m');
  await expect(page.locator('.timeline-right')).toContainText('2.00s');
  await page.keyboard.press('Delete');
  await expect(page.locator('.timeline-marker')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.timeline-marker')).toHaveCount(2);
  await page.locator('.timeline-marker').first().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Edit marker', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit timeline marker' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('.timeline-marker')).toHaveCount(2);
  await expect(page.locator('.timeline-marker').first()).toContainText('Chorus');
});
