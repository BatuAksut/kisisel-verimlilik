import { expect, test, type Page } from '@playwright/test';
import { at, completeOnboarding, questButtons } from './helpers';

async function openProfile(page: Page) {
  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page.getByRole('heading', { name: '66 günlük yol' })).toBeVisible();
}

const dayCell = (page: Page, day: number) => page.locator(`[data-day="${day}"]`);

test('görev bitince XP, özellik ve seri profilde görünür', async ({ page }) => {
  await completeOnboarding(page);
  const mains = questButtons(page, 'Ana görevler');
  await expect(mains).toHaveCount(4);
  for (const index of [0, 1, 2]) await mains.nth(index).click();
  await expect(page.getByLabel('Seri: 1 gün')).toBeVisible();

  await openProfile(page);
  await expect(page.getByText(/^Toplam [1-9]\d* XP/)).toBeVisible();
  const statValues = await page.locator('[data-testid^="stat-"]').allTextContents();
  expect(statValues.map(Number).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
  await expect(dayCell(page, 1)).toHaveAttribute('data-outcome', 'success');
  await expect(dayCell(page, 2)).toHaveAttribute('data-outcome', 'upcoming');
  await expect(page.locator('[data-day]')).toHaveCount(66);

  // Özellik çubuklarının rengi CSS değişkeninden gelir; değişken derlemede kaybolursa çubuk görünmez olur.
  const colors = await page.evaluate(() =>
    ['guc', 'zihin', 'disiplin', 'saglik', 'sosyal'].map((key) =>
      getComputedStyle(document.documentElement).getPropertyValue(`--color-stat-${key}`).trim(),
    ),
  );
  expect(colors.every((color) => color.startsWith('#'))).toBe(true);
});

test('kaçırılan gün seriyi sıfırlar ve ızgarada görünür', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page);
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);

  await page.clock.setFixedTime(at('2026-03-03T10:00:00'));
  await page.reload();
  await expect(page.getByText('Dün hedefi kaçırdın, seri sıfırlandı.')).toBeVisible();

  await openProfile(page);
  await expect(dayCell(page, 1)).toHaveAttribute('data-outcome', 'failed');
  await expect(dayCell(page, 2)).toHaveAttribute('data-outcome', 'pending');
});

test('Hard Mode da kaçırılan görev XP düşürür', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { difficulty: 'Hard Mode' });
  const mains = questButtons(page, 'Ana görevler');
  await expect(mains).toHaveCount(5);
  await mains.nth(0).click();
  await expect(mains.nth(0)).toHaveAttribute('aria-pressed', 'true');

  await page.clock.setFixedTime(at('2026-03-03T10:00:00'));
  await page.reload();
  await expect(page.getByText(/Hard Mode cezası: -\d+ XP\./)).toBeVisible();

  await openProfile(page);
  await expect(page.getByText(/Hard Mode cezası olarak toplam \d+ XP kaybettin\./)).toBeVisible();
});

test('hafta sonunda dondurucu kazanılır ve kaçırılan günde seriyi korur', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page, { difficulty: 'Kolay' });

  for (let day = 1; day <= 7; day++) {
    await page.clock.setFixedTime(at(`2026-03-${String(day + 1).padStart(2, '0')}T10:00:00`));
    await page.reload();
    await expect(page.getByRole('heading', { name: new RegExp(`Gün ${day} / 66`) })).toBeVisible();
    const mains = questButtons(page, 'Ana görevler');
    await expect(mains).toHaveCount(3);
    for (const index of [0, 1]) await mains.nth(index).click();
    await expect(page.getByLabel(`Seri: ${day} gün`)).toBeVisible();
  }

  await page.clock.setFixedTime(at('2026-03-09T10:00:00'));
  await page.reload();
  await expect(page.getByLabel('Seri dondurucu: 1')).toBeVisible();

  // 8. gün boş geçiyor, 9. gün dondurucu devreye girmiş olmalı.
  await page.clock.setFixedTime(at('2026-03-10T10:00:00'));
  await page.reload();
  await expect(page.getByText('dondurucu devreye girdi')).toBeVisible();
  await expect(page.getByLabel('Seri: 7 gün')).toBeVisible();
  await expect(page.getByLabel('Seri dondurucu: 0')).toBeVisible();
});

test('66 gün bitince tamamlandı ekranı çıkar', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-03-02T10:00:00'));
  await completeOnboarding(page);
  await expect(questButtons(page, 'Ana görevler')).toHaveCount(4);

  await page.clock.setFixedTime(at('2026-05-10T10:00:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: '66 gün tamam!' })).toBeVisible();
});
