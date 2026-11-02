import { expect, test } from '@playwright/test';
import { at, completeOnboarding, questButtons } from './helpers';

test('anket bitince API anahtarı olmadan da görevler havuzdan gelir', async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole('heading', { name: /Gün 1 \/ 66/ })).toBeVisible();
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await expect(questButtons(page, 'Yan görevler')).toHaveCount(2);
  await expect(page.getByText('Görevler hazır havuzdan geliyor.')).toBeVisible();
});

test('yarın başlama seçeneği bekleme ekranı gösterir', async ({ page }) => {
  await completeOnboarding(page, { startTomorrow: true });
  await expect(page.getByRole('heading', { name: 'Macera yarın başlıyor' })).toBeVisible();
});

test('görev işaretlenip geri alınabilir ve durum şeridi güncellenir', async ({ page }) => {
  await completeOnboarding(page);
  const mains = questButtons(page, 'Ana görevler');
  await expect(page.getByText('Seriyi korumak için 3 ana görev daha.')).toBeVisible();

  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Seriyi korumak için 2 ana görev daha.')).toBeVisible();

  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'false');

  for (const index of [0, 1, 2]) await mains.nth(index).click();
  await expect(page.getByText('Günü kazandın, serin güvende.')).toBeVisible();
});

test('yan görev günde yalnızca bir kez değiştirilir', async ({ page }) => {
  await completeOnboarding(page);
  const sides = questButtons(page, 'Yan görevler');
  await expect(sides).toHaveCount(2);
  const before = await sides.nth(0).textContent();

  await page.getByRole('button', { name: 'Başka görev getir' }).first().click();
  await expect(sides.nth(0)).not.toHaveText(before!);
  await expect(sides).toHaveCount(2);

  const used = page.getByRole('button', { name: 'Değiştirme hakkı bugün kullanıldı' });
  await expect(used).toHaveCount(2);
  await expect(used.first()).toBeDisabled();
});

test('gece yarısı, uygulama açıkken de gün değişir ve bekleyenler kaçırılır', async ({ page }) => {
  await page.clock.install({ time: at('2026-03-02T23:50:00') });
  await completeOnboarding(page);
  const mains = questButtons(page, 'Ana görevler');
  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');

  await page.clock.fastForward('00:20:00');
  await expect(page.getByRole('heading', { name: /Gün 2 \/ 66/ })).toBeVisible();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'false');

  const statuses = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('quest66');
        open.onsuccess = () => {
          const all = open.result.transaction('quests').objectStore('quests').getAll();
          all.onsuccess = () =>
            resolve(all.result.filter((quest) => quest.dayNumber === 1).map((quest) => quest.status));
        };
      }),
  );
  expect(statuses.filter((status) => status === 'done')).toHaveLength(1);
  expect(statuses.filter((status) => status === 'missed').length).toBe(statuses.length - 1);
});

test('akşam yansıtması saat 17:00 den sonra açılır, kaydedilir ve düzenlenir', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page);
  await expect(page.getByText('Akşam yansıtması saat 17:00’de açılır.')).toBeVisible();

  await page.clock.setFixedTime(at('2026-03-02T20:00:00'));
  await page.reload();
  const card = page.getByRole('region', { name: 'Akşam yansıtması' });
  await expect(card.getByRole('button', { name: 'Kaydet' })).toBeDisabled();
  await card.getByRole('radio', { name: '4: İyi' }).click();
  await card.getByLabel('Tek satırlık not').fill('Yürüyüş iyi geldi');
  await card.getByRole('button', { name: 'Kaydet' }).click();

  await expect(card.getByText('Bugünkü ruh halin: İyi')).toBeVisible();
  await expect(card.getByText('Yürüyüş iyi geldi')).toBeVisible();

  await card.getByRole('button', { name: 'Düzenle' }).click();
  await card.getByRole('radio', { name: '5: Harika' }).click();
  await card.getByRole('button', { name: 'Kaydet' }).click();
  await expect(card.getByText('Bugünkü ruh halin: Harika')).toBeVisible();
});

test('Boss görevi haftanın son gününde çıkar', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page);
  await expect(page.getByRole('region', { name: 'Boss görevi' })).toHaveCount(0);

  await page.clock.setFixedTime(at('2026-03-08T10:00:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: /Gün 7 \/ 66/ })).toBeVisible();
  await expect(questButtons(page, 'Boss görevi')).toHaveCount(1);
});

test('gün kazanılınca kutlama çıkar ve dokunmayı engellemez, açılışta tekrar etmez', async ({ page }) => {
  await completeOnboarding(page);
  const mains = questButtons(page, 'Ana görevler');
  await expect(page.getByLabel('Yaklaşan Boss')).toContainText('Erteleme Gölgesi');
  for (const index of [0, 1, 2]) await mains.nth(index).click();
  await expect(page.getByText('Gün fethedildi')).toBeVisible();

  await mains.nth(3).click();
  await expect(mains.nth(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Gün fethedildi')).toBeHidden();

  await page.reload();
  await expect(mains).toHaveCount(4);
  await expect(page.getByText('Gün fethedildi')).toHaveCount(0);
});

test('Boss günü isimli düşman çıkar, görev bitince yenilir', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page);
  await page.clock.setFixedTime(at('2026-03-08T10:00:00'));
  await page.reload();

  const encounter = page.getByRole('region', { name: 'Boss görevi' });
  await expect(encounter.getByRole('heading', { name: 'Erteleme Gölgesi' })).toBeVisible();
  await expect(page.getByText('Erteleme Gölgesi yolunu kesti.')).toBeVisible();
  await questButtons(page, 'Boss görevi').click();
  await expect(page.getByText('Boss yenildi!')).toBeVisible();
  await expect(page.getByText('Erteleme Gölgesi yenildi. Yol yeniden açık.')).toBeVisible();
});

test('hareket azaltma açıkken açılış kartı çıkmaz, kutlama yine okunur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  const mains = questButtons(page, 'Ana görevler');
  for (const index of [0, 1, 2]) await mains.nth(index).click();
  await expect(page.getByText('Gün fethedildi')).toBeVisible();
});

test('ses efektleri ayardan kapatılır', async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole('link', { name: 'Ayarlar' }).click();
  const sound = page.getByLabel('Ses efektleri');
  await expect(sound).toBeChecked();
  await sound.uncheck();
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.getByLabel('Ses efektleri')).not.toBeChecked();
});

test('bildirim izni kartla istenir, reddedilince bir daha sorulmaz', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'default' });
  });
  await completeOnboarding(page);
  const prompt = page.getByText('Uygulamayı açtığında bekleyen görevlerini hatırlatayım mı?');
  await expect(prompt).toBeVisible();
  await page.getByRole('button', { name: 'Şimdi değil' }).click();
  await expect(prompt).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('quest66');
            open.onsuccess = () => {
              const get = open.result.transaction('settings').objectStore('settings').get('app');
              get.onsuccess = () => resolve(Boolean(get.result?.notificationPromptDismissed));
            };
          }),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);
  await expect(prompt).toBeHidden();
});

test('ekranda yatay taşma olmaz', async ({ page }) => {
  await completeOnboarding(page, { difficulty: 'Hard Mode' });
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
