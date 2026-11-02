import { describe, expect, it } from 'vitest';
import { addDays, dayNumberFor, diffDays, toDateKey } from './dates';
import { intensityFor, summarizeWeek } from './feedback';
import { bossDayOfWeek, daysOfWeek, isBossDay, phaseOfDay, TOTAL_WEEKS, weekOfDay } from './program';
import {
  ABSENT_DAY_PENALTY,
  computeProgress,
  hardModePenalty,
  isDaySuccessful,
  levelFromXp,
  MAX_FREEZES,
  totalXpAtLevel,
} from './progress';
import { REMINDER_INTERVAL_MS, shouldRemind } from './reminders';
import { missingDayRecords, overdueQuestIds } from './reset';
import type { DayRecord, Difficulty, Quest, QuestStatus, QuestType, Reflection } from './types';

function quest(dayNumber: number, status: QuestStatus, overrides: Partial<Quest> & { type?: QuestType } = {}): Quest {
  return {
    id: `q-${dayNumber}-${Math.random()}`,
    title: 'Görev',
    description: '',
    area: 'su',
    stats: { saglik: 20 },
    xp: 20,
    estimatedMinutes: 10,
    type: 'main',
    dayNumber,
    weekNumber: weekOfDay(dayNumber),
    status,
    source: 'pool',
    order: 0,
    ...overrides,
  };
}

function day(dayNumber: number, difficulty: Difficulty = 'normal'): DayRecord {
  return { dayNumber, date: addDays('2026-01-01', dayNumber - 1), difficulty, rerollUsed: false };
}

/** n gün üretir; `pattern` true ise o günün tek ana görevi tamamlanmıştır. */
function scenario(pattern: boolean[], difficulty: Difficulty = 'normal') {
  const days = pattern.map((_, index) => day(index + 1, difficulty));
  const quests = pattern.map((done, index) => quest(index + 1, done ? 'done' : 'missed'));
  return { days, quests };
}

describe('tarihler', () => {
  it('yerel takvim anahtarı üretir', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 0, 6, 0, 0))).toBe('2026-01-06');
  });

  it('ay ve yıl sınırlarını doğru sayar', () => {
    expect(diffDays('2025-12-31', '2026-01-01')).toBe(1);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('yaz saati geçişi olan haftalarda gün kaydırmaz', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('başlangıç günü 1. gündür', () => {
    expect(dayNumberFor('2026-01-01', '2026-01-01')).toBe(1);
    expect(dayNumberFor('2026-01-01', '2026-01-02')).toBe(2);
    expect(dayNumberFor('2026-01-02', '2026-01-01')).toBe(0);
  });
});

describe('program takvimi', () => {
  it('evre sınırları doğrudur', () => {
    expect(phaseOfDay(1).key).toBe('temel');
    expect(phaseOfDay(21).key).toBe('temel');
    expect(phaseOfDay(22).key).toBe('yukselis');
    expect(phaseOfDay(44).key).toBe('yukselis');
    expect(phaseOfDay(45).key).toBe('ustalik');
    expect(phaseOfDay(66).key).toBe('ustalik');
  });

  it('66 gün eksiksiz 10 haftaya bölünür ve son hafta 3 gündür', () => {
    expect(TOTAL_WEEKS).toBe(10);
    const all = Array.from({ length: TOTAL_WEEKS }, (_, index) => daysOfWeek(index + 1)).flat();
    expect(all).toEqual(Array.from({ length: 66 }, (_, index) => index + 1));
    expect(daysOfWeek(10)).toEqual([64, 65, 66]);
  });

  it('gün-hafta eşlemesi ve Boss günleri doğrudur', () => {
    expect(weekOfDay(7)).toBe(1);
    expect(weekOfDay(8)).toBe(2);
    expect(weekOfDay(66)).toBe(10);
    expect(bossDayOfWeek(1)).toBe(7);
    expect(bossDayOfWeek(10)).toBe(66);
    expect(isBossDay(63)).toBe(true);
    expect(isBossDay(64)).toBe(false);
    expect(isBossDay(66)).toBe(true);
  });
});

describe('gün sıfırlama', () => {
  it('yalnızca geçmiş günlerin bekleyen görevlerini kaçırıldı sayar', () => {
    const quests = [
      { id: 'dun-bekleyen', dayNumber: 3, status: 'pending' as const },
      { id: 'dun-biten', dayNumber: 3, status: 'done' as const },
      { id: 'bugun', dayNumber: 4, status: 'pending' as const },
    ];
    expect(overdueQuestIds(quests, 4)).toEqual(['dun-bekleyen']);
  });

  it('uygulama açılmayan günleri de kayıt altına alır', () => {
    const records = missingDayRecords([{ dayNumber: 1 }], '2026-01-01', 4, 'hard');
    expect(records.map((record) => record.dayNumber)).toEqual([2, 3, 4]);
    expect(records[2]).toEqual({ dayNumber: 4, date: '2026-01-04', difficulty: 'hard', rerollUsed: false });
  });

  it('66. günden sonrası için kayıt üretmez', () => {
    const records = missingDayRecords([], '2026-01-01', 70, 'normal');
    expect(records).toHaveLength(66);
  });
});

describe('XP ve seviye', () => {
  it('seviye eşikleri artarak ilerler', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(totalXpAtLevel(3)).toBe(225);
    expect(levelFromXp(224)).toBe(2);
    expect(levelFromXp(225)).toBe(3);
  });

  it('XP ve özellik puanlarını yalnızca tamamlanan görevlerden toplar', () => {
    const days = [day(1)];
    const quests = [
      quest(1, 'done', { xp: 30, stats: { guc: 10, saglik: 20 } }),
      quest(1, 'done', { xp: 15, stats: { zihin: 15 } }),
      quest(1, 'pending', { xp: 50, stats: { zihin: 50 } }),
    ];
    const progress = computeProgress(days, quests, 1);
    expect(progress.totalXp).toBe(45);
    expect(progress.stats).toEqual({ guc: 10, zihin: 15, disiplin: 0, saglik: 20, sosyal: 0 });
    expect(progress.xpIntoLevel).toBe(45);
    expect(progress.xpForNextLevel).toBe(100);
  });
});

describe('başarılı gün eşiği', () => {
  it('zorluğa göre değişir', () => {
    expect(isDaySuccessful(2, 4, 'kolay')).toBe(true);
    expect(isDaySuccessful(2, 4, 'normal')).toBe(false);
    expect(isDaySuccessful(3, 4, 'normal')).toBe(true);
    expect(isDaySuccessful(4, 5, 'hard')).toBe(false);
    expect(isDaySuccessful(5, 5, 'hard')).toBe(true);
  });

  it('görev yoksa gün başarılı değildir', () => {
    expect(isDaySuccessful(0, 0, 'kolay')).toBe(false);
  });
});

describe('seri', () => {
  it('başarılı günlerde artar, başarısız günde sıfırlanır', () => {
    const { days, quests } = scenario([true, true, false, true]);
    const progress = computeProgress(days, quests, 5);
    expect(progress.streak).toBe(1);
    expect(progress.bestStreak).toBe(2);
    expect(progress.outcomes[3]).toBe('failed');
  });

  it('bugün bitene kadar seriyi bozmaz, başarı ise hemen sayılır', () => {
    const past = scenario([true, true]);
    const days = [...past.days, day(3)];
    expect(computeProgress(days, [...past.quests, quest(3, 'pending')], 3).streak).toBe(2);
    expect(computeProgress(days, [...past.quests, quest(3, 'pending')], 3).outcomes[3]).toBe('pending');
    expect(computeProgress(days, [...past.quests, quest(3, 'done')], 3).streak).toBe(3);
  });

  it('görev bitirilip geri alınınca seri de geri döner', () => {
    const past = scenario([true]);
    const days = [...past.days, day(2)];
    const progress = computeProgress(days, [...past.quests, quest(2, 'pending')], 2);
    expect(progress.streak).toBe(1);
    expect(progress.totalXp).toBe(20);
  });

  it('Boss ve yan görevleri kaçırmak seriyi bozmaz', () => {
    const days = [day(1), day(2)];
    const quests = [
      quest(1, 'done'),
      quest(1, 'missed', { type: 'side' }),
      quest(1, 'missed', { type: 'boss' }),
      quest(2, 'pending'),
    ];
    expect(computeProgress(days, quests, 2).streak).toBe(1);
  });
});

describe('seri dondurucu', () => {
  const sevenGood = Array<boolean>(7).fill(true);

  it('her haftanın sonunda 1 tane kazanılır', () => {
    const { days, quests } = scenario(sevenGood);
    expect(computeProgress(days, quests, 7).freezes).toBe(0);
    expect(computeProgress(days, quests, 8).freezes).toBe(1);
  });

  it('başarısız günde otomatik kullanılır ve seriyi korur', () => {
    const { days, quests } = scenario([...sevenGood, false, true]);
    const progress = computeProgress(days, quests, 10);
    expect(progress.outcomes[8]).toBe('frozen');
    expect(progress.freezes).toBe(0);
    expect(progress.streak).toBe(8);
  });

  it('dondurucu bitince seri bozulur', () => {
    const { days, quests } = scenario([...sevenGood, false, false, true]);
    const progress = computeProgress(days, quests, 11);
    expect(progress.outcomes[9]).toBe('failed');
    expect(progress.streak).toBe(1);
  });

  it('seri sıfırken boşa harcanmaz', () => {
    const { days, quests } = scenario([...Array<boolean>(7).fill(false), false]);
    const progress = computeProgress(days, quests, 9);
    expect(progress.outcomes[8]).toBe('failed');
    expect(progress.freezes).toBe(1);
  });

  it('en fazla 3 tane birikir', () => {
    const { days, quests } = scenario(Array<boolean>(35).fill(true));
    expect(computeProgress(days, quests, 36).freezes).toBe(MAX_FREEZES);
  });
});

describe('Hard Mode cezası', () => {
  it('kaçırılan her ana görev için XP nin yarısını düşer', () => {
    expect(
      hardModePenalty([
        { xp: 21, status: 'missed' },
        { xp: 30, status: 'done' },
        { xp: 40, status: 'pending' },
      ]),
    ).toBe(30);
  });

  it('görev üretilmemiş gün için sabit ceza uygular', () => {
    expect(hardModePenalty([])).toBe(ABSENT_DAY_PENALTY);
  });

  it('toplam XP den düşer, özellik puanlarına dokunmaz', () => {
    const days = [day(1, 'hard')];
    const quests = [
      quest(1, 'done', { xp: 50, stats: { guc: 50 } }),
      quest(1, 'missed', { xp: 20, stats: { guc: 20 } }),
    ];
    const progress = computeProgress(days, quests, 2);
    expect(progress.totalXp).toBe(40);
    expect(progress.penaltyTotal).toBe(10);
    expect(progress.stats.guc).toBe(50);
  });

  it('seviyeyi düşürmez', () => {
    const days = [day(1, 'hard')];
    const quests = [quest(1, 'done', { xp: 105 }), quest(1, 'missed', { xp: 100 })];
    const progress = computeProgress(days, quests, 2);
    expect(progress.level).toBe(2);
    expect(progress.totalXp).toBe(100);
    expect(progress.penaltyTotal).toBe(5);
  });

  it('bugün için henüz ceza işlemez', () => {
    const days = [day(1, 'hard')];
    const quests = [quest(1, 'done', { xp: 50 }), quest(1, 'pending', { xp: 20 })];
    expect(computeProgress(days, quests, 1).penaltyTotal).toBe(0);
  });

  it('dondurucu seriyi korur ama cezayı silmez', () => {
    const { days, quests } = scenario([...Array<boolean>(7).fill(true), false], 'hard');
    const progress = computeProgress(days, quests, 9);
    expect(progress.outcomes[8]).toBe('frozen');
    expect(progress.penaltyTotal).toBe(10);
  });

  it('günün kendi zorluğu geçerlidir, sonradan Hard seçmek geçmişi cezalandırmaz', () => {
    const days = [day(1, 'normal'), day(2, 'hard')];
    const quests = [quest(1, 'done', { xp: 100 }), quest(1, 'missed', { xp: 40 }), quest(2, 'done')];
    expect(computeProgress(days, quests, 3).penaltyTotal).toBe(0);
  });
});

describe('haftalık özet', () => {
  const reflection = (dayNumber: number, mood: number, note: string): Reflection => ({
    dayNumber,
    mood,
    note,
    createdAt: 0,
  });

  it('tamamlama oranlarını, ruh halini ve notları toplar', () => {
    const summary = summarizeWeek(
      1,
      [
        quest(1, 'done', { area: 'su' }),
        quest(1, 'missed', { area: 'uyku', title: 'Erken yat' }),
        quest(1, 'done', { type: 'side', area: 'su' }),
        quest(7, 'done', { type: 'boss', area: 'zihin' }),
      ],
      [reflection(1, 4, ' İyi geçti '), reflection(2, 3, '')],
    );
    expect(summary.mainCompletion).toBe(0.5);
    expect(summary.sideCompletion).toBe(1);
    expect(summary.bossDone).toBe(true);
    expect(summary.averageMood).toBe(3.5);
    expect(summary.notes).toEqual(['İyi geçti']);
    expect(summary.missedTitles).toEqual(['Erken yat']);
    expect(summary.byArea.su).toEqual({ done: 2, total: 2 });
  });

  it('zorluk önerisi tamamlama oranına göre değişir', () => {
    expect(intensityFor(0.9)).toBe('artir');
    expect(intensityFor(0.85)).toBe('artir');
    expect(intensityFor(0.6)).toBe('koru');
    expect(intensityFor(0.49)).toBe('azalt');
  });

  it('hiç görev yoksa yoğunluğu azaltır', () => {
    const summary = summarizeWeek(2, [], []);
    expect(summary.intensity).toBe('azalt');
    expect(summary.averageMood).toBeNull();
  });
});

describe('hatırlatma', () => {
  it('bekleyen görev yoksa hatırlatmaz', () => {
    expect(shouldRemind(0, undefined, 1000)).toBe(false);
  });

  it('aralık dolmadan tekrar hatırlatmaz', () => {
    expect(shouldRemind(2, undefined, 1000)).toBe(true);
    expect(shouldRemind(2, 1000, 1000 + REMINDER_INTERVAL_MS - 1)).toBe(false);
    expect(shouldRemind(2, 1000, 1000 + REMINDER_INTERVAL_MS)).toBe(true);
  });
});
