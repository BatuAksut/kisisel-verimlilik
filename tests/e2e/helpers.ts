import { expect, type Page } from '@playwright/test';

interface OnboardingOptions {
  difficulty?: 'Kolay' | 'Normal' | 'Hard Mode';
  apiKey?: string;
  startTomorrow?: boolean;
}

/** Anketi uçtan uca doldurur; her soruda ilk seçeneği (veya istenen zorluğu) seçer. */
export async function completeOnboarding(page: Page, options: OnboardingOptions = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Maceraya başla' }).click();

  const continueButton = page.getByRole('button', { name: 'Devam', exact: true });
  for (let question = 1; question <= 15; question++) {
    await expect(page.getByText(`Soru ${question} / 15`)).toBeVisible();
    const options_ = page.locator('button[aria-pressed]');
    if (question === 14) {
      await page.getByRole('button', { name: new RegExp(`^${options.difficulty ?? 'Normal'}`) }).click();
    } else if ((await options_.count()) > 0) {
      await options_.first().click();
    }
    await continueButton.click();
  }

  await expect(page.getByRole('heading', { name: 'Macera hazır' })).toBeVisible();
  if (options.apiKey) await page.getByPlaceholder('sk-...').fill(options.apiKey);
  await page.getByRole('button', { name: options.startTomorrow ? 'Yarın başla' : 'Bugün başla' }).click();
}

export function questButtons(page: Page, section: 'Ana görevler' | 'Yan görevler' | 'Boss görevi') {
  return page.getByRole('region', { name: section }).locator('button[aria-pressed]');
}

function aiTask(id: string, type: string) {
  const isBoss = type === 'boss';
  return {
    id,
    title: `AI görevi ${id}`,
    description: 'Yapay zekânın ürettiği somut bir görev.',
    area: 'zihin',
    stats: isBoss ? { zihin: 60, disiplin: 40 } : { zihin: 20 },
    xp: isBoss ? 100 : 20,
    estimatedMinutes: 10,
    type,
  };
}

export function aiWeek(days: number[]) {
  return {
    theme: 'Mock Teması',
    days: days.map((day) => ({
      day,
      main: [1, 2, 3, 4].map((index) => aiTask(`m${day}-${index}`, 'main')),
      side: [aiTask(`s${day}`, 'side')],
    })),
    boss: aiTask('boss', 'boss'),
    spareSide: [aiTask('yedek', 'side')],
  };
}

export const chatReply = (content: string) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
  body: JSON.stringify({ choices: [{ message: { content } }] }),
});

/** Yerel takvimde "gün" farkı kadar sonrasını Date'e çevirir (test saat dilimi İstanbul). */
export const at = (isoLocal: string) => new Date(`${isoLocal}+03:00`);
