import { chatJson } from '../ai/client';
import { buildWeekPrompt, SYSTEM_PROMPT } from '../ai/prompts';
import { isSafeQuest } from '../ai/safety';
import { normalizePlan, weekPlanSchema } from '../ai/schemas';
import { db } from '../db/database';
import { summarizeWeek, type WeekSummary } from '../domain/feedback';
import { bossDayOfWeek, daysOfWeek } from '../domain/program';
import type { AppSettings, Profile, Quest, QuestBlueprint, QuestSource, SpareQuest } from '../domain/types';
import type { PlanInput, PlannedWeek } from './plan';
import { buildPoolWeek, poolBaseId } from './selector';

export function questUsage(quests: Pick<Quest, 'id'>[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const quest of quests) {
    if (!quest.id.startsWith('pool-')) continue;
    const base = poolBaseId(quest.id);
    usage.set(base, (usage.get(base) ?? 0) + 1);
  }
  return usage;
}

export async function previousWeekSummary(weekNumber: number): Promise<WeekSummary | null> {
  if (weekNumber <= 1) return null;
  const week = weekNumber - 1;
  const days = daysOfWeek(week);
  const [quests, reflections] = await Promise.all([
    db.quests.where('weekNumber').equals(week).toArray(),
    db.reflections.where('dayNumber').between(days[0], days[days.length - 1], true, true).toArray(),
  ]);
  return summarizeWeek(week, quests, reflections, days.length);
}

async function buildPlanInput(profile: Profile, weekNumber: number, days: number[], summary: WeekSummary | null): Promise<PlanInput> {
  const quests = await db.quests.toArray();
  return {
    weekNumber,
    days,
    difficulty: profile.difficulty,
    focusAreas: profile.answers.focusAreas,
    freeMinutes: profile.answers.freeMinutes,
    intensity: summary?.intensity ?? 'koru',
    usage: questUsage(quests),
    seed: profile.createdAt % 100_000 + weekNumber * 7919,
  };
}

/** Güvenlik filtresine takılan görevleri aynı konumdaki havuz görevleriyle değiştirir. */
export function applySafety(plan: PlannedWeek, fallback: PlannedWeek): PlannedWeek {
  const pick = (quest: QuestBlueprint, options: QuestBlueprint[], index: number) =>
    isSafeQuest(quest) ? quest : options[index % options.length];
  return {
    ...plan,
    days: plan.days.map((day, dayIndex) => ({
      day: day.day,
      main: day.main.map((quest, index) => pick(quest, fallback.days[dayIndex].main, index)),
      side: day.side.map((quest, index) => pick(quest, fallback.days[dayIndex].side, index)),
    })),
    boss: isSafeQuest(plan.boss) ? plan.boss : fallback.boss,
    spareSide: plan.spareSide.filter(isSafeQuest),
  };
}

export interface WeekBuildResult {
  plan: PlannedWeek;
  source: QuestSource;
  error?: unknown;
}

/** Hazır havuz planını her zaman önceden kurar, böylece yapay zekâ başarısız olsa da görev eksik kalmaz. */
export async function buildWeek(
  profile: Profile,
  settings: AppSettings,
  weekNumber: number,
  days: number[],
  useAi: boolean,
  signal?: AbortSignal,
): Promise<WeekBuildResult> {
  const summary = await previousWeekSummary(weekNumber);
  const input = await buildPlanInput(profile, weekNumber, days, summary);
  const poolPlan = buildPoolWeek(input);
  if (!useAi) return { plan: poolPlan, source: 'pool' };

  try {
    const themes = (await db.weeks.toArray()).filter((week) => week.weekNumber < weekNumber).map((week) => week.theme);
    const raw = await chatJson(
      settings,
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildWeekPrompt({
            weekNumber,
            days,
            difficulty: profile.difficulty,
            answers: profile.answers,
            previousWeek: summary,
            previousThemes: themes,
          }),
        },
      ],
      weekPlanSchema(days),
      { signal },
    );
    const plan = normalizePlan(raw, weekNumber, Date.now().toString(36));
    return { plan: applySafety(plan, poolPlan), source: 'ai' };
  } catch (error) {
    return { plan: poolPlan, source: 'pool', error };
  }
}

function toQuest(blueprint: QuestBlueprint, dayNumber: number, weekNumber: number, order: number): Quest {
  return {
    ...blueprint,
    dayNumber,
    weekNumber,
    order,
    status: 'pending',
    source: blueprint.id.startsWith('pool-') ? 'pool' : 'ai',
  };
}

/** Haftanın `fromDay` ve sonrasındaki görevlerini yeni planla değiştirir; geçmiş günlere dokunmaz. */
export async function saveWeekPlan(
  weekNumber: number,
  plan: PlannedWeek,
  source: QuestSource,
  fromDay: number,
  meta: { attemptedAt?: number; error?: string },
): Promise<void> {
  const quests = plan.days.flatMap((day) => [
    ...day.main.map((quest, index) => toQuest(quest, day.day, weekNumber, index)),
    ...day.side.map((quest, index) => toQuest(quest, day.day, weekNumber, 100 + index)),
  ]);
  quests.push(toQuest(plan.boss, bossDayOfWeek(weekNumber), weekNumber, 200));
  const spares: SpareQuest[] = plan.spareSide.map((quest) => ({
    ...quest,
    weekNumber,
    source: quest.id.startsWith('pool-') ? 'pool' : 'ai',
    used: false,
  }));

  await db.transaction('rw', db.quests, db.spares, db.weeks, async () => {
    await db.quests
      .where('weekNumber')
      .equals(weekNumber)
      .filter((quest) => quest.dayNumber >= fromDay)
      .delete();
    await db.spares.where('weekNumber').equals(weekNumber).delete();
    await db.quests.bulkAdd(quests);
    await db.spares.bulkAdd(spares);
    await db.weeks.put({
      weekNumber,
      theme: plan.theme,
      source,
      generatedAt: Date.now(),
      lastAiAttemptAt: meta.attemptedAt,
      lastError: meta.error,
    });
  });
}
