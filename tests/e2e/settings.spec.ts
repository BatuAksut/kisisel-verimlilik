import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { aiWeek, at, chatReply, completeOnboarding, questButtons } from './helpers';

const API_PATTERN = '**/chat/completions';

async function openSettings(page: Page) {
  await page.getByRole('link', { name: 'Ayarlar' }).click();
  await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible();
}

test('anahtar girilince görevler yapay zekâdan gelir, istek doğru biçimdedir', async ({ page }) => {
  const requests: { auth: string | null; body: Record<string, unknown>; url: string }[] = [];
  await page.route(API_PATTERN, async (route) => {
    const request = route.request();
    requests.push({ auth: await request.headerValue('authorization'), body: request.postDataJSON(), url: request.url() });
    await route.fulfill(chatReply(JSON.stringify(aiWeek([1, 2, 3, 4, 5, 6, 7]))));
  });

  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { apiKey: 'test-anahtari' });

  await expect(page.getByText('AI görevi m1-1')).toBeVisible();
  await expect(page.getByText('Mock Teması')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('https://api.deepseek.com/chat/completions');
  expect(requests[0].auth).toBe('Bearer test-anahtari');
  expect(requests[0].body.model).toBe('deepseek-flash');
  expect(requests[0].body.response_format).toEqual({ type: 'json_object' });
});

test('model bozuk JSON döndürürse bir kez yeniden dener', async ({ page }) => {
  let calls = 0;
  await page.route(API_PATTERN, (route) => {
    calls++;
    return route.fulfill(chatReply(calls === 1 ? '{bozuk' : JSON.stringify(aiWeek([1, 2, 3, 4, 5, 6, 7]))));
  });
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  await expect(page.getByText('AI görevi m1-1')).toBeVisible();
  expect(calls).toBe(2);
});

test('API çalışmazsa görevler havuzdan gelir ve neden yazılır', async ({ page }) => {
  let calls = 0;
  await page.route(API_PATTERN, (route) => {
    calls++;
    return route.fulfill({ status: 500, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await expect(page.getByText('Yapay zekâya ulaşılamadı')).toBeVisible();
  expect(calls).toBe(2);
});

test('yapay zekâ yanıt vermezken görevler hemen kullanılabilir, başlanınca bugün korunur', async ({ page }) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(API_PATTERN, async (route) => {
    await held;
    await route.fulfill(chatReply(JSON.stringify(aiWeek([1, 2, 3, 4, 5, 6, 7]))));
  });
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { apiKey: 'test-anahtari' });

  const mains = questButtons(page, 'Ana görevler');
  await expect(mains).toHaveCount(4);
  await expect(page.getByText('Yapay zekâ sana özel görevleri hazırlıyor')).toBeVisible();
  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');

  release();
  await expect(page.getByText('Yapay zekâ sana özel görevleri hazırlıyor')).toBeHidden();
  await expect(page.getByText('Mock Teması')).toBeVisible();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('AI görevi m1-1')).toHaveCount(0);

  await page.clock.setFixedTime(at('2026-03-03T10:00:00'));
  await page.reload();
  await expect(page.getByText('AI görevi m2-1')).toBeVisible();
});

test('yapay zekâ hatasında Yeniden dene çalışır', async ({ page }) => {
  let healthy = false;
  await page.route(API_PATTERN, (route) =>
    healthy
      ? route.fulfill(chatReply(JSON.stringify(aiWeek([1, 2, 3, 4, 5, 6, 7]))))
      : route.fulfill({ status: 500, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } }),
  );
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  await expect(page.getByText('Yapay zekâya ulaşılamadı')).toBeVisible();

  healthy = true;
  await page.getByRole('button', { name: 'Yeniden dene' }).click();
  await expect(page.getByText('AI görevi m1-1')).toBeVisible();
});

test('ayarlar kaydedilir ve proxy adresi kullanılır', async ({ page }) => {
  const urls: string[] = [];
  const upstreams: (string | null)[] = [];
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!url.includes('workers.test')) return route.fallback();
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*',
        },
      });
    }
    urls.push(url);
    upstreams.push(await route.request().headerValue('x-upstream-base'));
    return route.fulfill(chatReply('{"ok":true}'));
  });

  await completeOnboarding(page);
  await openSettings(page);

  await page.getByPlaceholder('sk-...').fill('test-anahtari');
  await page.getByLabel('Base URL').fill('https://saglayici.test/v1/');
  await page.getByLabel('Model').fill('baska-model');
  await page.getByLabel('Proxy URL (isteğe bağlı)').fill('https://proxy.workers.test');
  await page.getByRole('button', { name: 'Bağlantıyı test et' }).click();
  await expect(page.getByText('Bağlantı çalışıyor.')).toBeVisible();
  expect(urls[0]).toBe('https://proxy.workers.test/chat/completions');
  expect(upstreams[0]).toBe('https://saglayici.test/v1');

  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Model')).toHaveValue('baska-model');
  await expect(page.getByLabel('Base URL')).toHaveValue('https://saglayici.test/v1/');
});

test('güvensiz adres ve başarısız bağlantı anlaşılır hata verir', async ({ page }) => {
  await page.route(API_PATTERN, (route) => route.abort());
  await completeOnboarding(page);
  await openSettings(page);

  await page.getByLabel('Base URL').fill('http://kotu.example');
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Base URL https:// ile başlayan geçerli bir adres olmalı.')).toBeVisible();

  await page.getByRole('button', { name: 'DeepSeek varsayılanlarına dön' }).click();
  await page.getByPlaceholder('sk-...').fill('test-anahtari');
  await page.getByRole('button', { name: 'Bağlantıyı test et' }).click();
  await expect(page.getByText(/CORS engeli olabilir/)).toBeVisible();
});

test('zorluk değişince profile yansır', async ({ page }) => {
  await completeOnboarding(page);
  await openSettings(page);
  await page.getByRole('radio', { name: 'Hard Mode' }).click();
  await expect(page.getByRole('radio', { name: 'Hard Mode' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page.getByText(/Hard Mode/).first()).toBeVisible();
});

test('dışa aktarılan yedek anahtar içermez, sıfırlama ve içe aktarma çalışır', async ({ page }, testInfo) => {
  await page.route(API_PATTERN, (route) => route.fulfill({ status: 500, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await completeOnboarding(page, { apiKey: 'test-anahtari' });
  const mains = questButtons(page, 'Ana görevler');
  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await openSettings(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Dışa aktar' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^quest66-yedek-\d{4}-\d{2}-\d{2}\.json$/);
  const path = testInfo.outputPath('yedek.json');
  await download.saveAs(path);
  const content = await readFile(path, 'utf8');
  expect(content).not.toContain('test-anahtari');
  expect(JSON.parse(content).quests.some((quest: { status: string }) => quest.status === 'done')).toBe(true);

  await page.getByRole('button', { name: 'Her şeyi sıfırla' }).click();
  await page.getByRole('button', { name: 'Vazgeç' }).click();
  await page.getByRole('button', { name: 'Her şeyi sıfırla' }).click();
  await page.getByLabel('API ayarlarını koru').uncheck();
  await page.getByRole('button', { name: 'Evet, sil' }).click();
  await expect(page.getByRole('button', { name: 'Maceraya başla' })).toBeVisible();

  await completeOnboarding(page);
  await openSettings(page);
  await page.getByLabel('Yedek dosyası seç').setInputFiles({ name: 'bozuk.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('Bu dosya bir Quest66 yedeği değil ya da bozuk.')).toBeVisible();

  await page.getByLabel('Yedek dosyası seç').setInputFiles(path);
  await page.getByRole('button', { name: 'Geri yükle' }).click();
  await expect(page.getByText('Yedek geri yüklendi.')).toBeVisible();
  await page.getByRole('link', { name: 'Bugün' }).click();
  await expect(questButtons(page, 'Ana görevler').nth(0)).toHaveAttribute('aria-pressed', 'true');
});
