import { isAiConfigured } from '../ai/client';
import { db, getSettings } from '../db/database';
import { dayNumberFor, toDateKey } from '../domain/dates';
import { daysOfWeek, TOTAL_DAYS, weekOfDay } from '../domain/program';
import { isDayUntouched, missingDayRecords, overdueQuestIds } from '../domain/reset';
import type { AppSettings, Profile } from '../domain/types';
import { buildWeek, QUEST_VERSION, saveWeekPlan } from './generator';

const AI_RETRY_MS = 60 * 60 * 1000;

export function todayNumberFor(profile: Pick<Profile, 'startDate'>, now: Date = new Date()): number {
  return dayNumberFor(profile.startDate, toDateKey(now));
}

function canUseAi(settings: AppSettings): boolean {
  return isAiConfigured(settings) && globalThis.navigator?.onLine !== false;
}

function describeError(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  return error instanceof Error ? error.message : String(error);
}

// Arayüzdeki "yapay zekâ çalışıyor" şeridi için küçük bir durum aboneliği.
let generating = false;
let startedAt = 0;
let percent = 0;
let cancelRun: AbortController | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function setGenerating(value: boolean) {
  generating = value;
  startedAt = value ? Date.now() : 0;
  percent = 0;
  notify();
}

// Gerçek ölçüm: yapay zekâ yanıtı gün başına yaklaşık 2.800 karakter tutuyor.
const CHARS_PER_DAY = 2_800;

function setPercent(chars: number, dayCount: number) {
  const next = Math.min(99, Math.round((chars / (dayCount * CHARS_PER_DAY)) * 100));
  if (next === percent) return;
  percent = next;
  notify();
}

export const syncStatus = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  isGenerating: () => generating,
  percent: () => percent,
  startedAt: () => startedAt,
};

/** Süren yapay zekâ isteğini durdurur; hazır havuz görevleri yerinde kalır. */
export function cancelAiUpgrade(): void {
  cancelRun?.abort();
}

/** İstek sürerken ekran kilitlenirse bağlantı kopabilir; destekleyen tarayıcıda ekran açık tutulur. */
async function keepScreenOn(): Promise<() => void> {
  try {
    const lock = await globalThis.navigator?.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => {});
  } catch {
    return () => {};
  }
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

async function isTodayUntouched(todayNumber: number): Promise<boolean> {
  const [quests, day] = await Promise.all([db.quests.where('dayNumber').equals(todayNumber).toArray(), db.days.get(todayNumber)]);
  return isDayUntouched(quests, day);
}

/**
 * Havuzdan kurulan haftayı yapay zekâ planıyla değiştirir. Kullanıcı bugünkü görevlere başladıysa
 * bugüne dokunmaz, yalnızca sonraki günleri değiştirir. Arayüz bu işi beklemez.
 */
async function runAiUpgrade(now: Date, force: boolean): Promise<boolean> {
  const profile = await db.profile.get('me');
  if (!profile) return false;
  const todayNumber = todayNumberFor(profile, now);
  if (todayNumber < 1 || todayNumber > TOTAL_DAYS) return false;

  const settings = await getSettings();
  const weekNumber = weekOfDay(todayNumber);
  const week = await db.weeks.get(weekNumber);
  if (!week || week.source !== 'pool' || !canUseAi(settings)) return false;
  if (!force && week.lastAiAttemptAt && now.getTime() - week.lastAiAttemptAt < AI_RETRY_MS) return false;

  const firstDay = (await isTodayUntouched(todayNumber)) ? todayNumber : todayNumber + 1;
  const days = daysOfWeek(weekNumber).filter((day) => day >= firstDay);
  if (days.length === 0) return false;

  const cancel = new AbortController();
  cancelRun = cancel;
  // Uygulamadan çıkılan sırada kopan istek gerçek bir hata sayılmaz: dönüşte hemen yeniden denenir.
  let leftApp = false;
  const onVisibility = () => {
    if (document.hidden) leftApp = true;
  };
  globalThis.document?.addEventListener('visibilitychange', onVisibility);
  const releaseScreen = await keepScreenOn();
  setGenerating(true);
  try {
    const result = await buildWeek(profile, settings, weekNumber, days, true, {
      signal: cancel.signal,
      onProgress: (chars) => setPercent(chars, days.length),
    });
    // İstek sürerken kullanıcı bugünün görevlerine başlamış olabilir.
    const fromDay = (await isTodayUntouched(todayNumber)) ? firstDay : Math.max(firstDay, todayNumber + 1);
    const plannedDays = result.plan.days.filter((day) => day.day >= fromDay);
    if (result.source === 'ai' && plannedDays.length > 0) {
      await saveWeekPlan(weekNumber, { ...result.plan, days: plannedDays }, 'ai', fromDay, { attemptedAt: now.getTime() });
      return true;
    }
    if (leftApp && !cancel.signal.aborted) {
      retryWhenBack = true;
      return false;
    }
    await db.weeks.update(weekNumber, { lastAiAttemptAt: now.getTime(), lastError: describeError(result.error) });
    return false;
  } catch (error) {
    // Plan kaydedilemezse de havuz görevleri yerinde kalır.
    await db.weeks.update(weekNumber, { lastAiAttemptAt: now.getTime(), lastError: describeError(error) });
    return false;
  } finally {
    globalThis.document?.removeEventListener('visibilitychange', onVisibility);
    releaseScreen();
    cancelRun = null;
    setGenerating(false);
  }
}

let aiRun: Promise<boolean> | null = null;
let retryWhenBack = false;

export function upgradePoolWeek(now: Date = new Date(), force = false): Promise<boolean> {
  // Ayarlar'dan yeni anahtar geldiyse, süren istek eski anahtarla olabilir: bitince yeniden denenir.
  if (aiRun) return force ? aiRun.then(() => upgradePoolWeek(now, true)) : aiRun;
  aiRun = runAiUpgrade(now, force).finally(() => {
    aiRun = null;
    const retry = retryWhenBack && !globalThis.document?.hidden;
    retryWhenBack = false;
    // Hâlâ arka plandaysa yeniden deneme, uygulama görünür olunca syncProgram'dan gelir.
    if (retry) void upgradePoolWeek(new Date()).catch(console.error);
  });
  return aiRun;
}

/** Testler için: arka plandaki yapay zekâ işinin bitmesini bekler. */
export function aiSettled(): Promise<unknown> {
  return aiRun ?? Promise.resolve();
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
  const outdated = week !== undefined && week.questVersion !== QUEST_VERSION;
  if (!week || todayCount === 0 || outdated) {
    // Eski içerik yenilenirken kullanıcının başladığı güne dokunulmaz.
    const fromDay = outdated && todayCount > 0 && !(await isTodayUntouched(todayNumber)) ? todayNumber + 1 : todayNumber;
    const days = daysOfWeek(weekNumber).filter((day) => day >= fromDay);
    if (days.length > 0) {
      // Görevler önce havuzdan kurulur: uygulama ağ isteğini beklemeden her zaman kullanılabilir.
      const { plan } = await buildWeek(profile, settings, weekNumber, days, false);
      await saveWeekPlan(weekNumber, plan, 'pool', fromDay, {});
    } else {
      await db.weeks.update(weekNumber, { questVersion: QUEST_VERSION });
    }
  }
  void upgradePoolWeek(now).catch(console.error);
}

let activeSync: Promise<void> | null = null;

/** Uygulama açıldığında, görünür olduğunda ve tarih değiştiğinde çağrılır. */
export function syncProgram(now: Date = new Date()): Promise<void> {
  activeSync ??= runSync(now).finally(() => {
    activeSync = null;
  });
  return activeSync;
}
