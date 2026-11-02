import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, saveSettings } from '../db/database';
import type { OnboardingAnswers, Profile } from '../domain/types';
import { rerollSideQuest, toggleQuest } from './actions';
import { syncProgram, upgradePoolWeek } from './sync';

const answers: OnboardingAnswers = {
  goals: ['Odaklanmak'],
  wakeTime: '07:00',
  sleepTime: '23:00',
  freeMinutes: 60,
  habits: { uyku: '', su: '', hareket: '', zihin: '', ekran: '', beslenme: '', sosyal: '', ogrenme: '' },
  focusAreas: ['su'],
  interests: 'gitar',
};

const START = '2026-03-02';
const onDay = (day: number) => new Date(2026, 2, 1 + day, 10, 0);

async function createProfile(difficulty: Profile['difficulty'] = 'normal') {
  await db.profile.put({ id: 'me', answers, difficulty, startDate: START, createdAt: 123 });
}

function task(id: string, type: string) {
  return {
    id,
    title: `Yapay zekâ görevi ${id}`,
    description: 'Somut ve ölçülebilir bir görev.',
    area: 'su',
    stats: { saglik: type === 'boss' ? 100 : 20 },
    xp: type === 'boss' ? 100 : 20,
    estimatedMinutes: 10,
    type,
  };
}

function aiWeek(days: number[]) {
  return {
    theme: 'Yapay Zekâ Haftası',
    days: days.map((day) => ({
      day,
      main: [1, 2, 3, 4].map((index) => task(`m${day}-${index}`, 'main')),
      side: [task(`s${day}`, 'side')],
    })),
    boss: task('boss', 'boss'),
    spareSide: [task('spare1', 'side')],
  };
}

function stubFetch(handler: (body: { messages: { content: string }[] }) => Response | Promise<Response>) {
  const mock = vi.fn(async (_url: string, init: RequestInit) => handler(JSON.parse(String(init.body))));
  vi.stubGlobal('fetch', mock);
  return mock;
}

const jsonReply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));

const questsOn = (day: number) => db.quests.where('dayNumber').equals(day).toArray();

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('program eşitleme', () => {
  it('API anahtarı yoksa haftayı istek atmadan havuzdan kurar', async () => {
    const fetchMock = stubFetch(() => jsonReply({}));
    await createProfile();
    await syncProgram(onDay(1));

    expect(fetchMock).not.toHaveBeenCalled();
    const today = await questsOn(1);
    expect(today.filter((quest) => quest.type === 'main')).toHaveLength(4);
    expect(today.filter((quest) => quest.type === 'side')).toHaveLength(2);
    expect((await db.weeks.get(1))?.source).toBe('pool');
    expect((await questsOn(7)).some((quest) => quest.type === 'boss')).toBe(true);
  });

  it('anahtar varsa haftayı yapay zekâdan üretir', async () => {
    const fetchMock = stubFetch(() => jsonReply(aiWeek([1, 2, 3, 4, 5, 6, 7])));
    await createProfile();
    await saveSettings({ apiKey: 'test-key' });
    await syncProgram(onDay(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const week = await db.weeks.get(1);
    expect(week?.source).toBe('ai');
    expect(week?.theme).toBe('Yapay Zekâ Haftası');
    expect((await questsOn(1)).every((quest) => quest.source === 'ai')).toBe(true);
    expect(await db.spares.count()).toBe(1);
  });

  it('API iki kez hatalı dönerse havuza düşer ve görev eksik kalmaz', async () => {
    const fetchMock = stubFetch(() => new Response(JSON.stringify({ choices: [{ message: { content: 'bozuk' } }] })));
    await createProfile();
    await saveSettings({ apiKey: 'test-key' });
    await syncProgram(onDay(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await questsOn(1)).length).toBeGreaterThanOrEqual(5);
    const week = await db.weeks.get(1);
    expect(week?.source).toBe('pool');
    expect(week?.lastError).toContain('JSON');
  });

  it('internet yoksa istek atmadan havuza düşer', async () => {
    const fetchMock = stubFetch(() => jsonReply({}));
    vi.stubGlobal('navigator', { onLine: false });
    await createProfile();
    await saveSettings({ apiKey: 'test-key' });
    await syncProgram(onDay(1));

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await questsOn(1)).length).toBeGreaterThan(0);
  });

  it('gece yarısından sonra bekleyen görevleri kaçırıldı yapar, bitenlere dokunmaz', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    const [first] = await questsOn(1);
    await toggleQuest(first.id, 1);

    await syncProgram(new Date(2026, 2, 3, 0, 1));
    const yesterday = await questsOn(1);
    expect(yesterday.find((quest) => quest.id === first.id)?.status).toBe('done');
    expect(yesterday.filter((quest) => quest.id !== first.id).every((quest) => quest.status === 'missed')).toBe(true);
    expect((await questsOn(2)).every((quest) => quest.status === 'pending')).toBe(true);
  });

  it('birkaç gün açılmazsa araya kalan günleri de kapatır', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    await syncProgram(onDay(5));

    expect(await db.days.count()).toBe(5);
    expect((await questsOn(4)).every((quest) => quest.status === 'missed')).toBe(true);
    expect((await questsOn(5)).every((quest) => quest.status === 'pending')).toBe(true);
  });

  it('yeni haftada önceki haftanın verisini modele gönderir', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    for (const quest of await questsOn(1)) await toggleQuest(quest.id, 1);
    await db.reflections.put({ dayNumber: 1, mood: 2, note: 'Yorgun bir gündü', createdAt: 0 });
    await saveSettings({ apiKey: 'test-key' });

    const prompts: string[] = [];
    stubFetch((body) => {
      prompts.push(body.messages[1].content);
      return jsonReply(aiWeek([8, 9, 10, 11, 12, 13, 14]));
    });
    await syncProgram(onDay(8));

    const context = prompts.find((prompt) => prompt.includes('"hafta": 2'));
    expect(context).toContain('Yorgun bir gündü');
    expect(context).toContain('"mainCompletion"');
    expect(context).toContain('"intensity": "azalt"');
  });

  it('66. günden sonra yeni görev üretmez', async () => {
    await createProfile();
    await syncProgram(onDay(70));
    expect(await db.days.count()).toBe(66);
    expect(await db.quests.count()).toBe(0);
  });

  it('başlangıçtan önce hiçbir şey üretmez', async () => {
    await createProfile();
    await syncProgram(onDay(0));
    expect(await db.quests.count()).toBe(0);
    expect(await db.days.count()).toBe(0);
  });

  it('final haftası 3 gün sürer ve Boss 66. gündedir', async () => {
    await createProfile('kolay');
    await syncProgram(onDay(64));
    expect((await questsOn(66)).some((quest) => quest.type === 'boss')).toBe(true);
    expect(await db.quests.where('dayNumber').above(66).count()).toBe(0);
  });
});

describe('havuz haftasını yükseltme', () => {
  it('anahtar eklenince yalnızca gelecek günleri yeniden üretir', async () => {
    await createProfile();
    await syncProgram(onDay(3));
    const todayBefore = await questsOn(3);
    await saveSettings({ apiKey: 'test-key' });

    const fetchMock = stubFetch(() => jsonReply(aiWeek([4, 5, 6, 7])));
    expect(await upgradePoolWeek(onDay(3), true)).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await questsOn(3)).toEqual(todayBefore);
    expect((await questsOn(4)).every((quest) => quest.source === 'ai')).toBe(true);
    expect((await questsOn(7)).filter((quest) => quest.type === 'boss')).toHaveLength(1);
    expect((await db.weeks.get(1))?.source).toBe('ai');
  });

  it('başarısız denemeden sonra bir saat beklemeden tekrar denemez', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    await saveSettings({ apiKey: 'test-key' });
    const fetchMock = stubFetch(() => new Response('', { status: 500 }));

    expect(await upgradePoolWeek(onDay(1))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await upgradePoolWeek(onDay(1))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('görev işaretleme', () => {
  it('bugünün görevi işaretlenip geri alınabilir', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    const [quest] = await questsOn(1);

    expect(await toggleQuest(quest.id, 1)).toBe('done');
    expect((await db.quests.get(quest.id))?.completedAt).toBeDefined();
    expect(await toggleQuest(quest.id, 1)).toBe('pending');
    expect((await db.quests.get(quest.id))?.completedAt).toBeUndefined();
  });

  it('geçmiş günün görevi değiştirilemez', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    const [quest] = await questsOn(1);
    await syncProgram(onDay(2));

    expect(await toggleQuest(quest.id, 2)).toBeNull();
    expect((await db.quests.get(quest.id))?.status).toBe('missed');
  });
});

describe('yan görev değiştirme', () => {
  const sideOf = async (day: number) => (await questsOn(day)).filter((quest) => quest.type === 'side');

  it('günde yalnızca bir kez çalışır ve görev sayısını korur', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    const [first, second] = await sideOf(1);
    const total = (await questsOn(1)).length;

    const replacement = await rerollSideQuest(first.id, 1);
    expect(replacement).not.toBeNull();
    expect(replacement?.id).not.toBe(first.id);
    expect((await questsOn(1)).length).toBe(total);
    expect(await rerollSideQuest(second.id, 1)).toBeNull();
    expect(await db.quests.get(second.id)).toBeDefined();
  });

  it('ertesi gün hak yenilenir', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    await rerollSideQuest((await sideOf(1))[0].id, 1);
    await syncProgram(onDay(2));
    expect(await rerollSideQuest((await sideOf(2))[0].id, 2)).not.toBeNull();
  });

  it('önce yapay zekânın yedek görevini kullanır', async () => {
    stubFetch(() => jsonReply(aiWeek([1, 2, 3, 4, 5, 6, 7])));
    await createProfile();
    await saveSettings({ apiKey: 'test-key' });
    await syncProgram(onDay(1));

    const replacement = await rerollSideQuest((await sideOf(1))[0].id, 1);
    expect(replacement?.title).toBe('Yapay zekâ görevi spare1');
    expect(replacement?.source).toBe('ai');
  });

  it('tamamlanan yan görev değiştirilemez', async () => {
    await createProfile();
    await syncProgram(onDay(1));
    const [side] = await sideOf(1);
    await toggleQuest(side.id, 1);
    expect(await rerollSideQuest(side.id, 1)).toBeNull();
  });
});
