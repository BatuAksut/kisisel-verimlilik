import { z } from 'zod';
import { AREAS, STAT_KEYS, type Area, type QuestBlueprint, type QuestType, type StatKey, type Stats } from '../domain/types';
import type { PlannedWeek } from '../quests/plan';

// Model bazen listede olmayan bir özellik adı yazıyor; bu yüzden bütün hafta reddedilmesin (bkz. normalizeTask).
const statsSchema = z.object({
  guc: z.number().min(0).optional(),
  zihin: z.number().min(0).optional(),
  disiplin: z.number().min(0).optional(),
  saglik: z.number().min(0).optional(),
  sosyal: z.number().min(0).optional(),
});

const AREA_STAT: Record<Area, StatKey> = {
  uyku: 'saglik',
  su: 'saglik',
  hareket: 'guc',
  zihin: 'zihin',
  ekran: 'disiplin',
  beslenme: 'saglik',
  sosyal: 'sosyal',
  ogrenme: 'zihin',
};

export const taskSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(500),
  area: z.enum(AREAS),
  stats: statsSchema,
  xp: z.number().positive(),
  estimatedMinutes: z.number().positive(),
  type: z.enum(['main', 'side', 'boss']),
  // Modeller boş alanı null olarak da yazabiliyor; ek alan yüzünden bütün hafta reddedilmesin.
  why: z.string().trim().transform((text) => text.slice(0, 300)).nullish(),
  habit: z.boolean().nullish(),
});

export type RawTask = z.infer<typeof taskSchema>;

export function weekPlanSchema(expectedDays: number[]) {
  return z
    .object({
      theme: z.string().trim().min(2).max(60),
      days: z.array(
        z.object({
          day: z.number().int(),
          main: z.array(taskSchema).min(3).max(5),
          side: z.array(taskSchema).min(1).max(2),
        }),
      ),
      boss: taskSchema,
      spareSide: z.array(taskSchema).max(6).default([]),
    })
    .superRefine((plan, context) => {
      const received = plan.days.map((item) => item.day).sort((a, b) => a - b);
      if (received.join() !== expectedDays.join()) {
        context.addIssue({
          code: 'custom',
          path: ['days'],
          message: `Beklenen günler: ${expectedDays.join(', ')}. Gelen günler: ${received.join(', ')}.`,
        });
      }
    });
}

export type RawWeekPlan = z.infer<ReturnType<typeof weekPlanSchema>>;

const XP_RANGE: Record<QuestType, [number, number]> = { main: [10, 30], side: [15, 40], boss: [60, 150] };
const MINUTES_RANGE: Record<QuestType, [number, number]> = { main: [1, 120], side: [5, 30], boss: [10, 180] };

const clamp = (value: number, [min, max]: [number, number]) => Math.min(Math.max(value, min), max);

/**
 * Modelin sayılarına tek başına güvenilmez: xp her zaman özellik puanlarının toplamına eşitlenir,
 * bu toplam da görev türünün aralığına çekilir. Geçerli özellik yoksa puan görevin alanına yazılır.
 */
export function normalizeTask(task: RawTask, type: QuestType, id: string): QuestBlueprint {
  const raw = STAT_KEYS.reduce((sum, key) => sum + (task.stats[key] ?? 0), 0);
  const source: Stats = raw > 0 ? task.stats : { [AREA_STAT[task.area]]: task.xp };
  const total = raw > 0 ? raw : task.xp;
  const scale = clamp(total, XP_RANGE[type]) / total;
  const stats: Stats = {};
  let xp = 0;
  for (const key of STAT_KEYS) {
    const value = Math.round((source[key] ?? 0) * scale);
    if (value > 0) {
      stats[key] = value;
      xp += value;
    }
  }
  return {
    id,
    title: task.title,
    description: task.description,
    area: task.area,
    stats,
    xp,
    estimatedMinutes: Math.round(clamp(task.estimatedMinutes, MINUTES_RANGE[type])),
    type,
    // Yan görevler eğlence içindir, gerekçe ve alışkanlık etiketi yalnızca ana görev ve Boss'ta anlamlıdır.
    why: type === 'side' ? undefined : task.why || undefined,
    habit: type === 'main' ? task.habit || undefined : undefined,
  };
}

export function normalizePlan(raw: RawWeekPlan, weekNumber: number, salt: string): PlannedWeek {
  const days = [...raw.days]
    .sort((a, b) => a.day - b.day)
    .map((item) => ({
      day: item.day,
      main: item.main.map((task, index) => normalizeTask(task, 'main', `ai-${salt}-d${item.day}-m${index}`)),
      side: item.side.map((task, index) => normalizeTask(task, 'side', `ai-${salt}-d${item.day}-s${index}`)),
    }));
  return {
    theme: raw.theme,
    days,
    boss: normalizeTask(raw.boss, 'boss', `ai-${salt}-w${weekNumber}-boss`),
    spareSide: raw.spareSide.map((task, index) => normalizeTask(task, 'side', `ai-${salt}-w${weekNumber}-x${index}`)),
  };
}
