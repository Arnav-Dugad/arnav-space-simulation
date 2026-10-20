import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('Moon cameras reach individual moons and mobile instruments remain usable', async ({
  page,
}) => {
  await page.goto('/#explore/jupiter');
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: 'Observatory instruments', exact: true }).click();
  await page.getByRole('button', { name: 'Moon system', exact: true }).click();
  await expect(page.locator('.scene-notice')).toContainText('Galilean moon system');
  await page.getByRole('button', { name: 'Observatory instruments', exact: true }).click();
  await page.getByRole('button', { name: 'Io', exact: true }).click();
  await expect(page.locator('.scene-notice')).toContainText('1821.6 km');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const camera = JSON.parse(localStorage.getItem('ass-camera-current') ?? 'null');
        return camera
          ? Math.hypot(...camera.position.map((v: number, i: number) => v - camera.target[i]))
          : 100;
      }),
    )
    .toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Observatory instruments', exact: true }).click();
  const box = await page.locator('.tools-panel').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(800);
  await page.getByRole('button', { name: 'Close instruments', exact: true }).click();
  await page.locator('.dock-handle').scrollIntoViewIfNeeded();
  const handle = (await page.locator('.dock-handle').boundingBox())!;
  await page.mouse.move(handle.x + 40, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 40, handle.y - 70, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.dock-panel')).toHaveClass(/dock-full/);
});
test('Observatory instruments save a workspace, switch physical scale, and capture a real PNG', async ({
  page,
}) => {
  await page.goto('/#explore/earth');
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: 'Observatory instruments', exact: true }).click();
  await page.getByLabel('Reference frame', { exact: true }).selectOption('body');
  await page.getByLabel('Body scale', { exact: true }).selectOption('physical');
  await expect(page.locator('.tools-panel')).toContainText('Physical radii');
  await page.locator('.tools-panel summary').filter({ hasText: 'Saved workspaces' }).click();
  await page.getByRole('button', { name: 'Save this workspace', exact: true }).click();
  await expect(page.locator('.workspace-entry')).toContainText('My observatory');
  await page.locator('.tools-panel summary').filter({ hasText: 'Capture studio' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scene PNG', exact: true }).click();
  const image = await download;
  expect(image.suggestedFilename()).toMatch(/observation\.png$/);
  const bytes = await fs.readFile((await image.path())!);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(1500);
  await page.getByRole('button', { name: 'Close instruments', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse inspector', exact: true }).click();
  await expect(page.locator('.dock-panel')).toHaveClass(/dock-collapsed/);
  await page.getByRole('button', { name: 'Open inspector', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Earth.' })).toBeVisible();
});
test('Gravity history restores states and orbit creation, maneuver preview, undo and sharing function', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#gravity');
  await page.getByRole('button', { name: 'Run gravity', exact: true }).click();
  await expect(page.locator('.mono')).not.toHaveText('0.000 yr');
  await page.getByRole('button', { name: 'Pause gravity', exact: true }).click();
  await page.getByLabel('Rewind simulation', { exact: true }).fill('0');
  await expect(page.locator('.mono')).toHaveText('0.000 yr');
  await page.getByRole('button', { name: 'Orbit creation assistant', exact: true }).click();
  await page.getByLabel('Semi-major axis', { exact: true }).fill('2e0');
  await page.getByLabel('Semi-major axis', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Create world in this orbit', exact: true }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(3);
  await page.getByLabel('Experiment name', { exact: true }).fill('Polar discovery');
  await page.getByRole('button', { name: 'Save named experiment', exact: true }).click();
  await expect(page.locator('.experiment-entry')).toContainText('Polar discovery');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByPlaceholder('Search worlds and experiments...').fill('Polar discovery');
  await page.getByRole('button', { name: /Polar discovery.*Saved experiment/ }).click();
  await expect(page.locator('.body-chips button')).toHaveCount(3);
  await page.getByRole('button', { name: 'Plan a maneuver', exact: true }).click();
  await expect(page.getByLabel('Integrated post-maneuver trajectory preview')).toBeVisible();
  await page.getByLabel('Prograde Δv', { exact: true }).fill('0.1');
  await page.getByLabel('Prograde Δv', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Execute burn', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Impulse executed');
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Previous body state restored');
  await page.getByRole('button', { name: 'Share experiment', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#gravity/shared/');
  await page.goto(link);
  await expect(page.locator('.body-chips button')).toHaveCount(3);
});
test('Catalogs propagate satellites, preserve missing data, and recover from download failure', async ({
  page,
}) => {
  await page.goto('/#catalog');
  await expect(page.locator('.catalog-detail')).toContainText('ISS');
  await expect(page.locator('.catalog-detail')).toContainText('SGP4');
  await expect(page.locator('.ground-track path').last()).toHaveAttribute('d', /M/);
  await page.getByRole('button', { name: 'Exoplanets', exact: true }).click();
  await expect(page.locator('.catalog-detail')).toContainText('uncertainty');
  await page.getByLabel('Search catalog', { exact: true }).fill('Proxima');
  await expect(page.locator('.catalog-detail')).toContainText('Msini');
  await page.getByLabel('Search catalog', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Asteroid approaches', exact: true }).click();
  await expect(page.locator('.catalog-detail')).toContainText('3σ');
  await expect(page.locator('.catalog-detail')).toContainText('Unknown');
  await page.getByRole('button', { name: 'Bright stars', exact: true }).click();
  await expect(page.locator('.catalog-detail')).toContainText('Sirius');
  await expect(page.locator('.catalog-sky circle')).toHaveCount(926);
  await page.route('**/data/stations.json', (route) =>
    route.fulfill({ status: 503, body: 'temporarily unavailable' }),
  );
  await page.getByRole('button', { name: 'Satellites', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('503');
  await page.unroute('**/data/stations.json');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.catalog-detail')).toContainText('ISS');
});
test('Science labs respond with computed results and rocket flight has monotonic samples', async ({
  page,
}) => {
  await page.goto('/#labs/blackhole');
  await page.getByLabel('Black hole mass', { exact: true }).fill('20');
  await page.getByLabel('Black hole mass', { exact: true }).press('Enter');
  await expect(page.locator('.science-readouts')).toContainText('59.067');
  await page.getByRole('button', { name: 'Eclipses', exact: true }).click();
  await expect(page.locator('.table-panel tbody tr')).toHaveCount(6);
  const before = await page.getByLabel('Eclipse date', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Set instant →', exact: true }).first().click();
  await expect(page.getByLabel('Eclipse date', { exact: true })).not.toHaveValue(before);
  await page.getByRole('button', { name: 'Planet designer', exact: true }).click();
  const text = await page.locator('.science-readouts').innerText();
  await page.getByLabel('Planet mass', { exact: true }).fill('2');
  await expect(page.locator('.science-readouts')).not.toHaveText(text);
  await page.getByRole('button', { name: 'Kepler’s laws', exact: true }).click();
  await page.getByLabel('Orbital eccentricity', { exact: true }).fill('0.7');
  await expect(page.locator('.kepler-stage')).toContainText('0.30 / 1.70');
  await page.getByRole('button', { name: 'Model validation', exact: true }).click();
  await expect(page.locator('.table-panel tbody tr')).toHaveCount(45);
  await page.getByRole('button', { name: 'Rocket ascent', exact: true }).click();
  await page.getByRole('button', { name: 'Launch / resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible({
    timeout: 7000,
  });
  await expect(page.locator('.experiment-stage .footnote')).not.toContainText('T+0.0');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export flight CSV', exact: true }).click();
  const file = await download;
  const content = await fs.readFile((await file.path())!, 'utf8');
  const times = content
    .trim()
    .split('\n')
    .slice(1)
    .map((row) => Number(row.split(',')[0].replaceAll('"', '')));
  expect(times.length).toBeGreaterThan(1);
  expect(times.every((t, i) => i === 0 || t > times[i - 1])).toBe(true);
});
test('Mission phase search, patched-conic estimates and trade exports function', async ({
  page,
}) => {
  await page.goto('/#missions');
  await page.getByRole('button', { name: 'Find next ideal phase crossing', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Next crossing');
  await expect(page.locator('.mission-extensions .table-panel tbody tr')).toHaveCount(4);
  const before = await page.locator('.mission-extensions .science-readouts').innerText();
  await page.getByLabel('Departure parking altitude', { exact: true }).fill('1000');
  await page.getByLabel('Departure parking altitude', { exact: true }).press('Enter');
  await expect(page.locator('.mission-extensions .science-readouts')).not.toHaveText(before);
});
test('New labs and data explorer fit mobile and tablet viewports', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      'labs/rocket',
      'labs/blackhole',
      'labs/eclipse',
      'labs/designer',
      'labs/kepler',
      'labs/sensitivity',
      'labs/validation',
      'catalog',
    ]) {
      await page.goto('/#' + route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
