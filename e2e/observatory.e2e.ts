import { test, expect } from '@playwright/test';
test('Solar System selection, date controls, search, favorites, and settings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Earth.' })).toBeVisible();
  await expect(page.locator('.scene canvas')).toBeVisible();
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: '06 Saturn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saturn.' })).toBeVisible();
  await page.getByRole('button', { name: 'In detail', exact: true }).click();
  await expect(page.locator('.detail-list')).toContainText('Titan');
  await page.getByRole('button', { name: 'Add favorite', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Saturn', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByLabel('Simulation date', { exact: true }).fill('2000-01-01');
  await page.getByRole('button', { name: 'Step forward one day' }).click();
  await expect(page.getByLabel('Simulation date', { exact: true })).toHaveValue('2000-01-02');
  await page.getByRole('button', { name: 'Play time', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause time', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause time', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Graphics quality').selectOption('low');
  await page.getByLabel('Proportional orbital distances').check();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.scene-footer')).toContainText('Proportional distances');
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Search worlds and experiments...').fill('nptn');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Neptune/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Neptune.' })).toBeVisible();
  await expect(page.locator('.scene-error,.scene-notice')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('Gravity worker advances, edits, duplicates, removes, saves, loads and exports', async ({
  page,
}) => {
  await page.goto('/#gravity');
  await expect(page.getByRole('heading', { name: 'A universe of your making.' })).toBeVisible();
  await expect(page.locator('.gravity-settings')).toContainText('0.0002 yr');
  await page.getByRole('button', { name: 'Run gravity', exact: true }).click();
  await expect(page.locator('.mono')).not.toHaveText('0.000 yr');
  await page.getByRole('button', { name: 'Pause gravity', exact: true }).click();
  await page.getByRole('button', { name: 'Save universe', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.getByRole('button', { name: 'Add a planet', exact: true }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(3);
  await page.getByLabel('Body mass', { exact: true }).fill('0.00001');
  await expect(page.getByLabel('Body mass', { exact: true })).toHaveValue('0.00001');
  await page.getByRole('button', { name: 'Duplicate body', exact: true }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(4);
  await page.getByRole('button', { name: 'Remove body', exact: true }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(3);
  await page.getByRole('button', { name: 'Load saved', exact: true }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('orbitarium-universe.json');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"bodies":[]}'),
  });
  await expect(page.getByRole('status')).toContainText('1–64');
  await page.getByLabel('Gravity scenario').selectOption('binary');
  await expect(page.locator('.body-chips')).toContainText('Star A');
});
test('Mission calculations respond to destination, mass, impulse and transfer progress', async ({
  page,
}) => {
  await page.goto('/#missions');
  await expect(page.locator('.mission-metrics')).toContainText('259');
  const before = await page.locator('.mission-metrics').innerText();
  await page.getByLabel('Arrival', { exact: true }).selectOption('jupiter');
  await expect(page.locator('.mission-metrics')).not.toHaveText(before);
  await page.getByLabel('Dry spacecraft mass', { exact: true }).fill('2000');
  await page.getByLabel('Specific impulse', { exact: true }).fill('900');
  await page.getByLabel('Explore transfer', { exact: true }).fill('50');
  await expect(page.locator('.trajectory-scrub')).toContainText('50');
  await page.getByLabel('Departure', { exact: true }).selectOption('saturn');
  await page.getByLabel('Arrival', { exact: true }).selectOption('earth');
  await expect(page.locator('.trajectory')).toBeVisible();
});
test('Comparison uses selected worlds and supports swapping', async ({ page }) => {
  await page.goto('/#compare');
  await expect(page.locator('.comparison-caption')).toContainText('1.88');
  await page.getByLabel('Planet 2', { exact: true }).selectOption('jupiter');
  await expect(page.locator('.compare-table')).toContainText('JUPITER');
  await page.getByRole('button', { name: 'Swap worlds' }).click();
  await expect(page.getByLabel('Planet 1', { exact: true })).toHaveValue('jupiter');
  await page.getByRole('button', { name: 'Equal visual size' }).click();
  await expect(page.locator('.comparison-caption')).toContainText('Equal-size');
});
test('Mobile, tablet and landscape layouts keep every experience within the viewport', async ({
  page,
}) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const route of ['explore', 'gravity', 'missions', 'compare']) {
      await page.goto('/#' + route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (route === 'explore')
        expect(
          await page.locator('.timeline').evaluate((e) => e.scrollWidth <= e.clientWidth),
        ).toBe(true);
    }
  }
});
