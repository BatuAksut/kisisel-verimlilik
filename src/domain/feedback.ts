import type { Area, Quest, Reflection } from './types';

export type Intensity = 'azalt' | 'koru' | 'artir';

export interface WeekSummary {
  weekNumber: number;
  mainCompletion: number;
  sideCompletion: number;
  bossDone: boolean;
  byArea: Partial<Record<Area, { done: number; total: number }>>;
  averageMood: number | null;
  notes: string[];
  missedTitles: string[];
  daysWithoutQuests: number;
  intensity: Intensity;
}

export function intensityFor(mainCompletion: number): Intensity {
  if (mainCompletion >= 0.85) return 'artir';
  if (mainCompletion < 0.5) return 'azalt';
  return 'koru';
}

function completion(quests: Quest[]): number {
  if (quests.length === 0) return 0;
  return quests.filter((quest) => quest.status === 'done').length / quests.length;
}

/**
 * Bir sonraki haftanın üretiminde modele bağlam olarak giden özet. Uygulamanın hiç açılmadığı
 * günlerde görev olmadığından, yoğunluk önerisi bu günleri de tamamlanmamış sayar.
 */
export function summarizeWeek(
  weekNumber: number,
  quests: Quest[],
  reflections: Reflection[],
  daysInWeek: number = new Set(quests.map((quest) => quest.dayNumber)).size,
): WeekSummary {
  const mains = quests.filter((quest) => quest.type === 'main');
  const daysWithQuests = new Set(quests.map((quest) => quest.dayNumber)).size;
  const byArea: WeekSummary['byArea'] = {};
  for (const quest of quests) {
    const entry = byArea[quest.area] ?? { done: 0, total: 0 };
    entry.total++;
    if (quest.status === 'done') entry.done++;
    byArea[quest.area] = entry;
  }
  const mainCompletion = completion(mains);
  return {
    weekNumber,
    mainCompletion: Math.round(mainCompletion * 100) / 100,
    sideCompletion: Math.round(completion(quests.filter((quest) => quest.type === 'side')) * 100) / 100,
    bossDone: quests.some((quest) => quest.type === 'boss' && quest.status === 'done'),
    byArea,
    averageMood:
      reflections.length === 0
        ? null
        : Math.round((reflections.reduce((sum, item) => sum + item.mood, 0) / reflections.length) * 10) / 10,
    notes: reflections.map((item) => item.note.trim()).filter(Boolean),
    missedTitles: mains.filter((quest) => quest.status !== 'done').map((quest) => quest.title),
    daysWithoutQuests: daysInWeek - daysWithQuests,
    intensity: intensityFor(daysInWeek === 0 ? 0 : (mainCompletion * daysWithQuests) / daysInWeek),
  };
}
