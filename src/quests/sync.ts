import { AiError, isAiConfigured } from '../ai/client';
import { db, getSettings } from '../db/database';
import { dayNumberFor, toDateKey } from '../domain/dates';
import { daysOfWeek, TOTAL_DAYS, weekOfDay } from '../domain/program';
import { missingDayRecords, overdueQuestIds } from '../domain/reset';
import type { AppSettings, Profile } from '../domain/types';
import { buildWeek, saveWeekPlan } from './generator';

const UPGRADE_RETRY_MS = 60 * 60 * 1000;

export function todayNumberFor(profile: Pick<Profile, 'startDate'>, now: Date = new Date()): number {
  return dayNumberFor(profile.startDate, toDateKey(now));
}

function canUseAi(settings: AppSettings): boolean {
  return isAiConfigured(settings) && globalThis.navigator?.onLine !== false;
}

function describeError(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  if (error instanceof AiError && error.kind === 'aborted') return undefined;
  return error instanceof Error ? error.message : String(error);
}

// Arayüzün "hazırlanıyor" ekranı için küçük bir durum aboneliği.
let generating = false;
let waitController: AbortController | null = null;
const listeners = new Set<() => void>();

function setGenerating(value: boolean) {
  generating = value;
  listeners.forEach((listener) => listener());
}

export const syncStatus = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isGenerating: () => generating,
};

/** "Beklemeden başla" düğmesi: yapay zekâyı iptal eder, hafta havuzdan kurulur. */
export function skipAiWait(): void {
  waitController?.abort();
}

/** Geçmiş günleri kapatır: eksik gün kayıtları açılır, bekleyen görevler "kaçırıldı" olur. */
export async function closePastDays(profile: Profile, todayNumber: number): Promise<void> {
  await db.transaction('rw', db.days, db.quests, async () => {
    const existing = await db.days.toArray();
    const missing = missingDayRecords(existing, profile.startDate, todayNumber, profile.difficulty);
    if (missing.length > 0) await db.days.bulkAdd(missing);
    const pending = await db.quests.filter((quest) => quest.status === 'pending').toArray();
    const overdue = overdueQuestIds(pending, todayNumber);
    if (overdue.length > 0) {
      await db.quests.bulkUpdate(overdue.map((key) => ({ key, changes: { status: 'missed' as const } })));
    }
  });
}

async function generateWeek(profile: Profile, settings: AppSettings, weekNumber: number, todayNumber: number) {
  const days = daysOfWeek(weekNumber).filter((day) => day >= todayNumber);
  const useAi = canUseAi(settings);
  if (useAi) {
    waitController = new AbortController();
    setGenerating(true);
  }
  try {
    const result = await buildWeek(profile, settings, weekNumber, days, useAi, waitController?.signal);
    await saveWeekPlan(weekNumber, result.plan, result.source, todayNumber, {
      attemptedAt: useAi ? Date.now() : undefined,
      error: describeError(result.error),
    });
  } finally {
    waitController = null;
    setGenerating(false);
  }
}

/**
 * Hafta havuzdan kurulmuşsa ve yapay zekâ artık kullanılabiliyorsa yarından itibaren olan günleri
 * yeniden üretir. Bugünün görevlerine dokunmaz, çünkü kullanıcı onlara başlamış olabilir.
 */
export async function upgradePoolWeek(now: Date = new Date(), force = false): Promise<boolean> {
  const profile = await db.profile.get('me');
  if (!profile) return false;
  const todayNumber = todayNumberFor(profile, now);
  if (todayNumber < 1 || todayNumber >= TOTAL_DAYS) return false;

  const settings = await getSettings();
  const weekNumber = weekOfDay(todayNumber);
  const week = await db.weeks.get(weekNumber);
  if (!week || week.source !== 'pool' || !canUseAi(settings)) return false;
  if (!force && week.lastAiAttemptAt && now.getTime() - week.lastAiAttemptAt < UPGRADE_RETRY_MS) return false;

  const days = daysOfWeek(weekNumber).filter((day) => day > todayNumber);
  if (days.length === 0) return false;

  const result = await buildWeek(profile, settings, weekNumber, days, true);
  if (result.source === 'ai') {
    await saveWeekPlan(weekNumber, result.plan, 'ai', todayNumber + 1, { attemptedAt: now.getTime() });
    return true;
  }
  await db.weeks.update(weekNumber, { lastAiAttemptAt: now.getTime(), lastError: describeError(result.error) });
  return false;
}

async function runSync(now: Date): Promise<void> {
  const profile = await db.profile.get('me');
  if (!profile) return;
  const todayNumber = todayNumberFor(profile, now);
  if (todayNumber < 1) return;

  await closePastDays(profile, todayNumber);
  if (todayNumber > TOTAL_DAYS) return;

  const settings = await getSettings();
  const weekNumber = weekOfDay(todayNumber);
  const [week, todayCount] = await Promise.all([
    db.weeks.get(weekNumber),
    db.quests.where('dayNumber').equals(todayNumber).count(),
  ]);
  if (!week || todayCount === 0) {
    await generateWeek(profile, settings, weekNumber, todayNumber);
  } else {
    void upgradePoolWeek(now).catch(() => undefined);
  }
}

let activeSync: Promise<void> | null = null;

/** Uygulama açıldığında, görünür olduğunda ve tarih değiştiğinde çağrılır. */
export function syncProgram(now: Date = new Date()): Promise<void> {
  activeSync ??= runSync(now).finally(() => {
    activeSync = null;
  });
  return activeSync;
}
