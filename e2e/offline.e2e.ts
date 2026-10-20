import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'allow' });
test('Production offline pack opens previously unvisited catalogs and runs a physics worker', async ({
  page,
  context,
  request,
}) => {
  const manifest = await request.get('/offline-manifest.json');
  test.skip(
    !(manifest.headers()['content-type'] ?? '').includes('application/json'),
    'Offline packs require the production build.',
  );
  await page.goto('/#explore/earth');
  await expect(page.locator('.scene canvas')).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: 'Observatory instruments', exact: true }).click();
  await page
    .locator('.tools-panel summary')
    .filter({ hasText: 'Offline exploration pack' })
    .click();
  await page.getByRole('button', { name: 'Download offline pack', exact: true }).click();
  await expect(page.locator('.tools-panel')).toContainText('Offline exploration pack saved.', {
    timeout: 60000,
  });
  const release = await manifest.json();
  expect(await page.evaluate(() => caches.keys())).toContain(
    `arnav-space-simulation-${release.build}`,
  );
  await context.setOffline(true);
  await page.goto('/#catalog');
  await expect(page.locator('.catalog-detail')).toContainText('ISS');
  await page.getByRole('button', { name: 'Exoplanets', exact: true }).click();
  await expect(page.locator('.catalog-detail')).toContainText('uncertainty');
  await page.goto('/#gravity');
  await page.getByRole('button', { name: 'Run gravity', exact: true }).click();
  await expect(page.locator('.mono')).not.toHaveText('0.000 yr');
  await context.setOffline(false);
});
