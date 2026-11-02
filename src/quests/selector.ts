import type { Intensity } from '../domain/feedback';
import { phaseOfDay, type Phase } from '../domain/program';
import type { Area, QuestBlueprint } from '../domain/types';
import { HABIT_COUNT, MAIN_COUNT, SIDE_COUNT, SPARE_SIDE_COUNT, type PlanInput, type PlannedWeek } from './plan';
import { POOL, POOL_THEMES, type PoolQuest } from './pool';

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kademe aralığı evreye göre yükselir, geçen haftanın tamamlama oranı bir kademe kaydırır. */
export function tierRange(day: number, intensity: Intensity): [number, number] {
  let range: [number, number];
  const phase = phaseOfDay(day).key;
  if (phase === 'temel') range = day <= 7 ? [1, 1] : [1, 2];
  else if (phase === 'yukselis') range = [1, 3];
  else range = [2, 3];
  if (intensity === 'azalt') range = [Math.max(range[0] - 1, 1), Math.max(range[1] - 1, 1)];
  if (intensity === 'artir') range = [Math.min(range[0] + 1, 3), Math.min(range[1] + 1, 3)];
  return range;
}

/** Havuz görevi farklı günlerde tekrar edebilir; kimlikler çakışmasın diye sonuna "@gün" eklenir. */
export function poolBaseId(id: string): string {
  return id.split('@')[0];
}

function strip({ tier: _tier, repeatable: _repeatable, ...blueprint }: PoolQuest, suffix: string): QuestBlueprint {
  return { ...blueprint, id: `${blueprint.id}@${suffix}` };
}

const PHASE_TIER: Record<Phase['key'], PoolQuest['tier']> = { temel: 1, yukselis: 2, ustalik: 3 };

/**
 * Evre boyunca aynı kalan alışkanlıkları seçer, evre değişince zorlaşır. Önce kişinin odak alanlarına bakar.
 * Su alanı hariç tutulur: orada en kanıtlı davranış tek bir değişikliktir, her gün izlenecek bir beceri değil.
 */
export function habitsForDay(input: Pick<PlanInput, 'difficulty' | 'focusAreas' | 'freeMinutes' | 'habitSeed'>, day: number): PoolQuest[] {
  const phase = phaseOfDay(day).key;
  const areas = [...new Set<Area>([...input.focusAreas.filter((area) => area !== 'su'), 'uyku', 'hareket', 'zihin'])];
  const habits: PoolQuest[] = [];
  let spent = 0;
  for (const area of areas) {
    if (habits.length === HABIT_COUNT[input.difficulty]) break;
    const options = POOL.filter((quest) => quest.repeatable && quest.area === area && quest.tier === PHASE_TIER[phase]);
    if (options.length === 0) continue;
    const pick = options[input.habitSeed % options.length];
    // Boş zaman azsa uzun bir alışkanlık günü tek başına doldurmasın.
    if (spent + pick.estimatedMinutes > input.freeMinutes) continue;
    habits.push(pick);
    spent += pick.estimatedMinutes;
  }
  return habits;
}

export function buildPoolWeek(input: PlanInput): PlannedWeek {
  const random = mulberry32(input.seed);
  const usage = new Map(input.usage);
  const use = (quest: PoolQuest) => usage.set(quest.id, (usage.get(quest.id) ?? 0) + 1);
  const useCount = (quest: PoolQuest) => usage.get(quest.id) ?? 0;

  const mains = POOL.filter((quest) => quest.type === 'main');
  const sides = POOL.filter((quest) => quest.type === 'side');
  const bosses = POOL.filter((quest) => quest.type === 'boss');

  // Az kullanılan öne gelir, eşitlikte sıra rastgele kalır.
  const ranked = (list: PoolQuest[], extra: (quest: PoolQuest) => number = () => 0) =>
    list
      .map((quest) => ({ quest, order: useCount(quest) + extra(quest) + random() * 0.5 }))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.quest);

  const days = input.days.map((day) => {
    const [minTier, maxTier] = tierRange(day, input.intensity);
    const inRange = mains.filter((quest) => quest.tier >= minTier && quest.tier <= maxTier);
    const candidates = ranked(inRange, (quest) => (input.focusAreas.includes(quest.area) ? -1.5 : 0));
    const count = MAIN_COUNT[input.difficulty];
    const sideCount = SIDE_COUNT[input.difficulty];

    const habits = habitsForDay(input, day);
    const chosen: PoolQuest[] = [...habits];
    const areas = new Set<string>(habits.map((quest) => quest.area));
    let spent = habits.reduce((sum, quest) => sum + quest.estimatedMinutes, 0);
    // Önce boş zamana sığanlar seçilir; sığmazsa en kısa görevlerle sayı tamamlanır.
    for (const candidate of candidates) {
      if (chosen.length === count) break;
      if (areas.has(candidate.area) || spent + candidate.estimatedMinutes > input.freeMinutes) continue;
      chosen.push(candidate);
      areas.add(candidate.area);
      spent += candidate.estimatedMinutes;
    }
    const shortestFirst = [...candidates].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    for (const candidate of shortestFirst) {
      if (chosen.length === count) break;
      if (areas.has(candidate.area)) continue;
      chosen.push(candidate);
      areas.add(candidate.area);
    }
    chosen.forEach(use);

    const sidesToday = ranked(sides).slice(0, sideCount);
    sidesToday.forEach(use);

    return {
      day,
      main: chosen.map((quest) => ({ ...strip(quest, `d${day}`), habit: habits.includes(quest) || undefined })),
      side: sidesToday.map((quest) => strip(quest, `d${day}`)),
    };
  });

  const spareSide = ranked(sides)
    .slice(0, SPARE_SIDE_COUNT)
    .map((quest) => strip(quest, `w${input.weekNumber}s`));

  return {
    theme: POOL_THEMES[input.weekNumber - 1] ?? POOL_THEMES[POOL_THEMES.length - 1],
    days,
    boss: strip(ranked(bosses)[0], `w${input.weekNumber}b`),
    spareSide,
  };
}

/** Reroll'de yedek kalmadığında kullanılır: bugün olmayan, en az kullanılmış yan görevi seçer. */
export function pickPoolSide(usage: Map<string, number>, excludeBaseIds: Set<string>, suffix: string): QuestBlueprint {
  const candidates = POOL.filter((quest) => quest.type === 'side' && !excludeBaseIds.has(quest.id));
  const best = candidates.reduce((current, quest) =>
    (usage.get(quest.id) ?? 0) < (usage.get(current.id) ?? 0) ? quest : current,
  );
  return strip(best, suffix);
}
