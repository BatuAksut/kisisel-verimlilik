import { describe, expect, it } from 'vitest';
import { isSafeQuest } from '../ai/safety';
import { normalizeTask, weekPlanSchema, type RawTask } from '../ai/schemas';
import { AREAS, STAT_KEYS, type Difficulty } from '../domain/types';
import { applySafety } from './generator';
import { MAIN_COUNT, SIDE_COUNT, type PlanInput } from './plan';
import { POOL, POOL_THEMES } from './pool';
import { buildPoolWeek, pickPoolSide, tierRange } from './selector';

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    weekNumber: 1,
    days: [1, 2, 3, 4, 5, 6, 7],
    difficulty: 'normal',
    focusAreas: ['su', 'uyku'],
    freeMinutes: 60,
    intensity: 'koru',
    usage: new Map(),
    seed: 42,
    ...overrides,
  };
}

const rawTask = (overrides: Partial<RawTask> = {}): RawTask => ({
  id: '1',
  title: 'Bir bardak su iç',
  description: 'Uyanınca bir bardak su iç.',
  area: 'su',
  stats: { saglik: 20 },
  xp: 20,
  estimatedMinutes: 5,
  type: 'main',
  ...overrides,
});

describe('hazır görev havuzu', () => {
  it('en az 60 görev içerir ve her alanda görev vardır', () => {
    expect(POOL.length).toBeGreaterThanOrEqual(60);
    for (const area of AREAS) {
      expect(POOL.filter((quest) => quest.type === 'main' && quest.area === area).length).toBeGreaterThanOrEqual(6);
      expect(POOL.some((quest) => quest.type === 'side' && quest.area === area)).toBe(true);
    }
    expect(POOL.filter((quest) => quest.type === 'boss').length).toBeGreaterThanOrEqual(POOL_THEMES.length);
  });

  it('her görev geçerli alanlara sahiptir', () => {
    expect(new Set(POOL.map((quest) => quest.id)).size).toBe(POOL.length);
    for (const quest of POOL) {
      const statTotal = STAT_KEYS.reduce((sum, key) => sum + (quest.stats[key] ?? 0), 0);
      expect(statTotal, quest.title).toBe(quest.xp);
      expect(quest.xp, quest.title).toBeGreaterThan(0);
      expect(quest.estimatedMinutes, quest.title).toBeGreaterThan(0);
      if (quest.type === 'side') {
        expect(quest.estimatedMinutes, quest.title).toBeGreaterThanOrEqual(5);
        expect(quest.estimatedMinutes, quest.title).toBeLessThanOrEqual(30);
      }
    }
  });

  it('kendi güvenlik filtresine takılmaz', () => {
    expect(POOL.filter((quest) => !isSafeQuest(quest)).map((quest) => quest.title)).toEqual([]);
  });
});

describe('havuzdan hafta kurma', () => {
  const difficulties: Difficulty[] = ['kolay', 'normal', 'hard'];

  it.each(difficulties)('%s için her güne doğru sayıda görev koyar', (difficulty) => {
    const plan = buildPoolWeek(input({ difficulty }));
    expect(plan.days.map((day) => day.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const day of plan.days) {
      expect(day.main).toHaveLength(MAIN_COUNT[difficulty]);
      expect(day.side).toHaveLength(SIDE_COUNT[difficulty]);
      expect(new Set(day.main.map((quest) => quest.area)).size).toBe(day.main.length);
    }
    expect(plan.boss.type).toBe('boss');
    expect(plan.spareSide.length).toBeGreaterThan(0);
  });

  it('boş zaman çok az olsa bile görev sayısını tamamlar', () => {
    const plan = buildPoolWeek(input({ difficulty: 'hard', freeMinutes: 5 }));
    for (const day of plan.days) expect(day.main).toHaveLength(5);
  });

  it('aynı girdiyle aynı planı üretir ve görev kimlikleri benzersizdir', () => {
    expect(buildPoolWeek(input())).toEqual(buildPoolWeek(input()));
    const plan = buildPoolWeek(input());
    const ids = plan.days.flatMap((day) => [...day.main, ...day.side]).map((quest) => quest.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('odak alanlarına ağırlık verir', () => {
    const plan = buildPoolWeek(input({ focusAreas: ['ekran'] }));
    const ekranDays = plan.days.filter((day) => day.main.some((quest) => quest.area === 'ekran')).length;
    expect(ekranDays).toBeGreaterThanOrEqual(5);
  });

  it('önceden az kullanılan Boss görevini seçer', () => {
    const bosses = POOL.filter((quest) => quest.type === 'boss');
    const usage = new Map(bosses.slice(1).map((quest) => [quest.id, 5]));
    expect(buildPoolWeek(input({ usage })).boss.id.split('@')[0]).toBe(bosses[0].id);
  });
});

describe('kademeli zorluk', () => {
  it('evreyle birlikte yükselir', () => {
    expect(tierRange(1, 'koru')).toEqual([1, 1]);
    expect(tierRange(10, 'koru')).toEqual([1, 2]);
    expect(tierRange(30, 'koru')).toEqual([1, 3]);
    expect(tierRange(50, 'koru')).toEqual([2, 3]);
  });

  it('tamamlama oranı kademeyi kaydırır', () => {
    expect(tierRange(10, 'azalt')).toEqual([1, 1]);
    expect(tierRange(10, 'artir')).toEqual([2, 3]);
    expect(tierRange(50, 'artir')).toEqual([3, 3]);
  });
});

describe('reroll havuzu', () => {
  it('bugün olan görevleri tekrar vermez, en az kullanılanı seçer', () => {
    const sides = POOL.filter((quest) => quest.type === 'side');
    const usage = new Map(sides.map((quest) => [quest.id, 3]));
    usage.set(sides[4].id, 0);
    usage.set(sides[5].id, 1);
    expect(pickPoolSide(usage, new Set([sides[4].id]), 'r1').id).toBe(`${sides[5].id}@r1`);
  });
});

describe('güvenlik filtresi', () => {
  it.each([
    ['24 saat oruç tut', ''],
    ['Akşam yemeğini atla', 'Kalori hedefini düşür'],
    ['DİYET LİSTESİ yap', ''],
    ['Takviye al', ''],
    ['Bir öğün atla', ''],
  ])('%s reddedilir', (title, description) => {
    expect(isSafeQuest({ title, description })).toBe(false);
  });

  it('normal görevleri geçirir', () => {
    expect(isSafeQuest({ title: '21:00’den sonra telefonu başka odaya koy', description: 'Sabaha kadar getirme.' })).toBe(true);
  });

  it('ekran detoksunu geçirir, yiyecek detoksunu reddeder', () => {
    expect(isSafeQuest({ title: 'Haftalık Odak ve Ekran Detoksu', description: '2 saat telefonsuz kal.' })).toBe(true);
    expect(isSafeQuest({ title: 'Dijital detoks', description: 'Bildirimleri kapat.' })).toBe(true);
    expect(isSafeQuest({ title: 'Detoks suyu iç', description: 'Bütün gün.' })).toBe(false);
    expect(isSafeQuest({ title: 'Ekran detoksu ve oruç', description: '' })).toBe(false);
  });

  it('güvensiz görevleri havuz göreviyle değiştirir', () => {
    const fallback = buildPoolWeek(input({ days: [1] }));
    const plan = {
      theme: 'Test',
      days: [
        {
          day: 1,
          main: [
            { ...fallback.days[0].main[0], id: 'ai-1', title: 'Oruç tut' },
            { ...fallback.days[0].main[1], id: 'ai-2', title: 'Güvenli görev' },
          ],
          side: [{ ...fallback.days[0].side[0], id: 'ai-3', description: 'Kalori say' }],
        },
      ],
      boss: { ...fallback.boss, id: 'ai-b', title: 'Detoks haftası' },
      spareSide: [{ ...fallback.days[0].side[0], id: 'ai-x', title: 'Diyet yap' }],
    };
    const safe = applySafety(plan, fallback);
    expect(safe.days[0].main[0].id).toBe(fallback.days[0].main[0].id);
    expect(safe.days[0].main[1].id).toBe('ai-2');
    expect(safe.days[0].side[0].id).toBe(fallback.days[0].side[0].id);
    expect(safe.boss.id).toBe(fallback.boss.id);
    expect(safe.spareSide).toEqual([]);
  });
});

describe('yapay zekâ görev şeması', () => {
  const validPlan = {
    theme: 'Başlangıç',
    days: [
      { day: 1, main: [rawTask(), rawTask(), rawTask()], side: [rawTask({ type: 'side' })] },
      { day: 2, main: [rawTask(), rawTask(), rawTask()], side: [rawTask({ type: 'side' })] },
    ],
    boss: rawTask({ type: 'boss' }),
    spareSide: [],
  };

  it('geçerli planı kabul eder', () => {
    expect(weekPlanSchema([1, 2]).safeParse(validPlan).success).toBe(true);
  });

  it('eksik günü, bilinmeyen alanı ve hatalı görev sayısını reddeder', () => {
    expect(weekPlanSchema([1, 2, 3]).safeParse(validPlan).success).toBe(false);
    const badArea = structuredClone(validPlan);
    (badArea.days[0].main[0] as { area: string }).area = 'uzay';
    expect(weekPlanSchema([1, 2]).safeParse(badArea).success).toBe(false);
    const tooFew = structuredClone(validPlan);
    tooFew.days[0].main = tooFew.days[0].main.slice(0, 2);
    expect(weekPlanSchema([1, 2]).safeParse(tooFew).success).toBe(false);
  });

  it('özellik puanı vermeyen görevi reddeder', () => {
    const plan = structuredClone(validPlan);
    plan.boss.stats = {};
    expect(weekPlanSchema([1, 2]).safeParse(plan).success).toBe(false);
  });
});

describe('görev normalleştirme', () => {
  it('xp değerini özellik toplamına eşitler', () => {
    const quest = normalizeTask(rawTask({ xp: 999, stats: { guc: 10, zihin: 15 } }), 'main', 'x');
    expect(quest.xp).toBe(25);
  });

  it('aşırı XP yi tür aralığına çeker', () => {
    const quest = normalizeTask(rawTask({ stats: { guc: 500, zihin: 500 } }), 'main', 'x');
    expect(quest.xp).toBe(30);
    expect(quest.stats).toEqual({ guc: 15, zihin: 15 });
  });

  it('düşük XP yi ve süreyi yan görev aralığına çeker', () => {
    const quest = normalizeTask(rawTask({ stats: { sosyal: 1 }, estimatedMinutes: 300 }), 'side', 'x');
    expect(quest.xp).toBe(15);
    expect(quest.estimatedMinutes).toBe(30);
    expect(quest.type).toBe('side');
    expect(quest.id).toBe('x');
  });
});
