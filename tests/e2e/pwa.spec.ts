import { expect, test } from '@playwright/test';
import { completeOnboarding, questButtons } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('manifest kurulum için gerekli alanları içerir', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Quest66');
  expect(manifest.display).toBe('standalone');
  expect(manifest.lang).toBe('tr');
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).status(), icon.src).toBe(200);
  }
});

test('internet kesilse de uygulama açılır ve görevler çalışır', async ({ page, context }) => {
  await completeOnboarding(page);
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Gün 1 \/ 66/ })).toBeVisible();
  const mains = questButtons(page, 'Ana görevler');
  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');
});

test('çevrimdışı ilk haftada anahtar olsa bile görevler havuzdan gelir', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
});
