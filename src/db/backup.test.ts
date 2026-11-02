import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OnboardingAnswers } from '../domain/types';
import { toggleQuest } from '../quests/actions';
import { syncProgram } from '../quests/sync';
import { BackupError, createBackup, parseBackup, resetAll, restoreBackup } from './backup';
import { db, getSettings, saveSettings } from './database';

const answers: OnboardingAnswers = {
  goals: ['Odaklanmak'],
  wakeTime: '07:00',
  sleepTime: '23:00',
  freeMinutes: 60,
  habits: { uyku: 'a', su: 'b', hareket: 'c', zihin: 'd', ekran: 'e', beslenme: 'f', sosyal: 'g', ogrenme: 'h' },
  focusAreas: ['su'],
  interests: '',
};

async function seed() {
  await db.profile.put({ id: 'me', answers, difficulty: 'hard', startDate: '2026-03-02', createdAt: 1 });
  await saveSettings({ apiKey: 'gizli-anahtar', model: 'ozel-model', proxyUrl: 'https://p.workers.dev' });
  await syncProgram(new Date(2026, 2, 2, 10));
  const [quest] = await db.quests.where('dayNumber').equals(1).toArray();
  await toggleQuest(quest.id, 1);
  await db.reflections.put({ dayNumber: 1, mood: 4, note: 'Güzel gün', createdAt: 5 });
}

beforeEach(async () => {
  // Sahte anahtarla gerçek API'ye istek gitmesin.
  vi.stubGlobal('navigator', { onLine: false });
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('dışa ve içe aktarma', () => {
  it('API anahtarı varsayılan olarak yedeğe yazılmaz', async () => {
    await saveSettings({ apiKey: 'gizli-anahtar' });
    await db.profile.put({ id: 'me', answers, difficulty: 'normal', startDate: '2026-03-02', createdAt: 1 });
    const text = JSON.stringify(await createBackup(false));
    expect(text).not.toContain('gizli-anahtar');
    expect(text).toContain('deepseek-flash');
  });

  it('açıkça istenirse anahtar yedeğe girer', async () => {
    await seed();
    expect((await createBackup(true)).settings.apiKey).toBe('gizli-anahtar');
  });

  it('veriyi kayıpsız geri yükler', async () => {
    await seed();
    const backup = await createBackup(true);
    const text = JSON.stringify(backup);
    await resetAll(false);
    expect(await db.quests.count()).toBe(0);

    await restoreBackup(parseBackup(text));
    expect(await createBackup(true)).toEqual({ ...backup, exportedAt: expect.any(Number) });
    expect((await db.profile.get('me'))?.difficulty).toBe('hard');
    expect((await db.reflections.get(1))?.note).toBe('Güzel gün');
    expect((await getSettings()).model).toBe('ozel-model');
  });

  it('yedekte anahtar yoksa cihazdaki anahtarı korur', async () => {
    await seed();
    const backup = await createBackup(false);
    await saveSettings({ apiKey: 'yeni-anahtar' });
    await restoreBackup(backup);
    expect((await getSettings()).apiKey).toBe('yeni-anahtar');
  });

  it('hatalı dosyaları reddeder ve mevcut veriye dokunmaz', async () => {
    await seed();
    const before = await db.quests.count();
    expect(() => parseBackup('json değil')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"baska"}')).toThrow(BackupError);
    const broken = await createBackup(false);
    expect(() => parseBackup(JSON.stringify({ ...broken, reflections: [{ dayNumber: 1, mood: 9 }] }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...broken, version: 99 }))).toThrow(BackupError);
    expect(await db.quests.count()).toBe(before);
  });
});

describe('sıfırlama', () => {
  it('her şeyi siler', async () => {
    await seed();
    await resetAll(false);
    for (const table of db.tables) expect(await table.count()).toBe(0);
    expect((await getSettings()).apiKey).toBe('');
  });

  it('istenirse API ayarlarını korur, ilerlemeyi siler', async () => {
    await seed();
    await resetAll(true);
    expect(await db.profile.count()).toBe(0);
    expect(await db.quests.count()).toBe(0);
    const settings = await getSettings();
    expect(settings.apiKey).toBe('gizli-anahtar');
    expect(settings.proxyUrl).toBe('https://p.workers.dev');
  });
});
