import { DAYS_PER_WEEK } from './program';
import { STAT_KEYS, type DayRecord, type Difficulty, type Quest, type StatKey } from './types';

/** Bir günün başarılı sayılması için bitirilmesi gereken ana görev oranı. */
export const SUCCESS_THRESHOLD: Record<Difficulty, number> = {
  kolay: 0.5,
  normal: 0.7,
  hard: 1,
};

export const MAX_FREEZES = 3;
/** Hard Mode'da hiç görev üretilmemiş (uygulamanın açılmadığı) bir günün cezası. */
export const ABSENT_DAY_PENALTY = 40;

export function xpNeededForLevel(level: number): number {
  return 100 + 25 * (level - 1);
}

export function totalXpAtLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current++) total += xpNeededForLevel(current);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= totalXpAtLevel(level + 1)) level++;
  return level;
}

export function isDaySuccessful(mainDone: number, mainTotal: number, difficulty: Difficulty): boolean {
  if (mainTotal === 0) return false;
  return mainDone / mainTotal >= SUCCESS_THRESHOLD[difficulty];
}

/** Her kaçırılan ana görev için görev XP'sinin yarısı (aşağı yuvarlanır). */
export function hardModePenalty(mains: Pick<Quest, 'xp' | 'status'>[]): number {
  if (mains.length === 0) return ABSENT_DAY_PENALTY;
  return mains.filter((quest) => quest.status !== 'done').reduce((sum, quest) => sum + Math.floor(quest.xp / 2), 0);
}

export type DayOutcome = 'success' | 'frozen' | 'failed' | 'pending';

export interface Progress {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  stats: Record<StatKey, number>;
  streak: number;
  bestStreak: number;
  freezes: number;
  penaltyTotal: number;
  penalties: Record<number, number>;
  outcomes: Record<number, DayOutcome>;
}

const RANKS: { minLevel: number; name: string }[] = [
  { minLevel: 20, name: 'Efsane' },
  { minLevel: 15, name: 'Usta' },
  { minLevel: 10, name: 'Savaşçı' },
  { minLevel: 5, name: 'Kâşif' },
  { minLevel: 1, name: 'Çırak' },
];

export function rankForLevel(level: number): string {
  return RANKS.find((rank) => level >= rank.minLevel)!.name;
}

/** Karakterin görünümü için rütbe sırası: 0 Çırak, 4 Efsane. */
export function heroTier(level: number): number {
  return RANKS.length - 1 - RANKS.findIndex((rank) => level >= rank.minLevel);
}

export function nextRank(level: number): { name: string; minLevel: number } | null {
  return [...RANKS].reverse().find((rank) => rank.minLevel > level) ?? null;
}

/**
 * Tüm ilerleme kayıtlardan baştan hesaplanır, ayrıca saklanmaz. Böylece bugünkü bir görevin
 * geri alınması ya da yedekten içe aktarma, tutarsız bir sayaç bırakamaz.
 */
export function computeProgress(days: DayRecord[], quests: Quest[], todayNumber: number): Progress {
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as Record<StatKey, number>;
  const outcomes: Record<number, DayOutcome> = {};
  const penalties: Record<number, number> = {};
  const questsByDay = new Map<number, Quest[]>();
  for (const quest of quests) {
    const list = questsByDay.get(quest.dayNumber);
    if (list) list.push(quest);
    else questsByDay.set(quest.dayNumber, [quest]);
  }

  let totalXp = 0;
  let streak = 0;
  let bestStreak = 0;
  let freezes = 0;
  let penaltyTotal = 0;

  for (const day of [...days].sort((a, b) => a.dayNumber - b.dayNumber)) {
    if (day.dayNumber > todayNumber) continue;
    const dayQuests = questsByDay.get(day.dayNumber) ?? [];
    for (const quest of dayQuests) {
      if (quest.status !== 'done') continue;
      totalXp += quest.xp;
      for (const key of STAT_KEYS) stats[key] += quest.stats[key] ?? 0;
    }

    const mains = dayQuests.filter((quest) => quest.type === 'main');
    const mainDone = mains.filter((quest) => quest.status === 'done').length;
    const successful = isDaySuccessful(mainDone, mains.length, day.difficulty);

    if (day.dayNumber === todayNumber) {
      // Bugün henüz bitmedi: yalnızca başarı erken sayılır, kaçırma ertesi güne kadar işlenmez.
      outcomes[day.dayNumber] = successful ? 'success' : 'pending';
      if (successful) streak++;
    } else {
      if (day.difficulty === 'hard') {
        const penalty = hardModePenalty(mains);
        const floor = totalXpAtLevel(levelFromXp(totalXp));
        const applied = Math.min(penalty, totalXp - floor);
        totalXp -= applied;
        penaltyTotal += applied;
        if (applied > 0) penalties[day.dayNumber] = applied;
      }
      if (successful) {
        streak++;
        outcomes[day.dayNumber] = 'success';
      } else if (streak > 0 && freezes > 0) {
        freezes--;
        outcomes[day.dayNumber] = 'frozen';
      } else {
        streak = 0;
        outcomes[day.dayNumber] = 'failed';
      }
      if (day.dayNumber % DAYS_PER_WEEK === 0) freezes = Math.min(freezes + 1, MAX_FREEZES);
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  const level = levelFromXp(totalXp);
  return {
    totalXp,
    level,
    xpIntoLevel: totalXp - totalXpAtLevel(level),
    xpForNextLevel: xpNeededForLevel(level),
    stats,
    streak,
    bestStreak,
    freezes,
    penaltyTotal,
    penalties,
    outcomes,
  };
}
