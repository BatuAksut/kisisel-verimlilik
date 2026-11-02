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

test('tarayıcıda açılınca kurulum kartı çıkar, Yükle tarayıcı penceresini açar', async ({ page }) => {
  await completeOnboarding(page);
  const card = page.getByRole('region', { name: 'Uygulamayı yükle' });
  await expect(card.getByText('Ana ekrana ekle')).toBeVisible();

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt?: () => Promise<void> };
    event.prompt = async () => {
      (window as unknown as { promptCalled: boolean }).promptCalled = true;
    };
    window.dispatchEvent(event);
  });
  await card.getByRole('button', { name: 'Yükle' }).click();
  expect(await page.evaluate(() => (window as unknown as { promptCalled: boolean }).promptCalled)).toBe(true);

  await card.getByRole('button', { name: 'Gizle' }).click();
  await expect(card).toBeHidden();
});

test('kurulu uygulamada kurulum kartı çıkmaz', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) =>
      query.includes('display-mode: standalone')
        ? ({ matches: true, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
        : original(query);
  });
  await completeOnboarding(page);
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Uygulamayı yükle' })).toHaveCount(0);
});

test('izin verilmişse açılışta bekleyen görevleri bildirimle hatırlatır, sık tekrarlamaz', async ({ page }) => {
  // Başsız Chromium izni her zaman "denied" bildirir ve bildirim gösteremez. Bu yüzden izin taklit edilir,
  // uygulamanın service worker'dan bildirim istediği kaydedilerek doğrulanır.
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    ServiceWorkerRegistration.prototype.showNotification = async function (_title, options) {
      const shown = JSON.parse(localStorage.getItem('shown') ?? '[]');
      localStorage.setItem('shown', JSON.stringify([...shown, options?.body]));
    };
  });
  const shown = () => page.evaluate(() => JSON.parse(localStorage.getItem('shown') ?? '[]') as string[]);

  await completeOnboarding(page);
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await expect.poll(shown).toEqual([expect.stringMatching(/^Bugün \d+ görev seni bekliyor\.$/)]);

  await page.reload();
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await page.waitForTimeout(300);
  expect(await shown()).toHaveLength(1);
});

test('çevrimdışı ilk haftada anahtar olsa bile görevler havuzdan gelir', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
});
