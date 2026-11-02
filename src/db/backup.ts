import { z } from 'zod';
import { AREAS, DEFAULT_SETTINGS, STAT_KEYS, type AppSettings } from '../domain/types';
import { db, getSettings } from './database';

const BACKUP_VERSION = 1;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKey = z.string().regex(/^\d{2}:\d{2}$/);
const difficulty = z.enum(['kolay', 'normal', 'hard']);
const area = z.enum(AREAS);
const source = z.enum(['ai', 'pool']);
const stats = z.partialRecord(z.enum(STAT_KEYS), z.number());

const blueprint = {
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  area,
  stats,
  xp: z.number(),
  estimatedMinutes: z.number(),
  type: z.enum(['main', 'side', 'boss']),
  why: z.string().optional(),
  habit: z.boolean().optional(),
};

const backupSchema = z.object({
  app: z.literal('quest66'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.number(),
  profile: z.object({
    id: z.literal('me'),
    difficulty,
    startDate: dateKey,
    createdAt: z.number(),
    answers: z.object({
      goals: z.array(z.string()),
      wakeTime: timeKey,
      sleepTime: timeKey,
      freeMinutes: z.number(),
      habits: z.record(area, z.string()),
      focusAreas: z.array(area),
      interests: z.string(),
    }),
  }),
  settings: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string(),
    model: z.string(),
    proxyUrl: z.string(),
  }),
  weeks: z.array(
    z.object({
      weekNumber: z.number().int(),
      theme: z.string(),
      source,
      generatedAt: z.number(),
      lastAiAttemptAt: z.number().optional(),
      lastError: z.string().optional(),
      questVersion: z.number().optional(),
    }),
  ),
  days: z.array(
    z.object({ dayNumber: z.number().int(), date: dateKey, difficulty, rerollUsed: z.boolean() }),
  ),
  quests: z.array(
    z.object({
      ...blueprint,
      dayNumber: z.number().int(),
      weekNumber: z.number().int(),
      status: z.enum(['pending', 'done', 'missed']),
      source,
      order: z.number(),
      completedAt: z.number().optional(),
    }),
  ),
  spares: z.array(z.object({ ...blueprint, weekNumber: z.number().int(), source, used: z.boolean() })),
  reflections: z.array(
    z.object({ dayNumber: z.number().int(), mood: z.number().min(1).max(5), note: z.string(), createdAt: z.number() }),
  ),
});

export type Backup = z.infer<typeof backupSchema>;

/** API anahtarı, açıkça istenmedikçe yedek dosyasına yazılmaz. */
export async function createBackup(includeApiKey: boolean, now: number = Date.now()): Promise<Backup> {
  const [profile, settings, weeks, days, quests, spares, reflections] = await Promise.all([
    db.profile.get('me'),
    getSettings(),
    db.weeks.toArray(),
    db.days.toArray(),
    db.quests.toArray(),
    db.spares.toArray(),
    db.reflections.toArray(),
  ]);
  if (!profile) throw new Error('Dışa aktarılacak veri yok.');
  return {
    app: 'quest66',
    version: BACKUP_VERSION,
    exportedAt: now,
    profile,
    settings: {
      ...(includeApiKey ? { apiKey: settings.apiKey } : {}),
      baseUrl: settings.baseUrl,
      model: settings.model,
      proxyUrl: settings.proxyUrl,
    },
    weeks,
    days,
    quests,
    spares,
    reflections,
  };
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('Dosya geçerli bir JSON değil.');
  }
  const result = backupSchema.safeParse(raw);
  if (!result.success) throw new BackupError('Bu dosya bir Quest66 yedeği değil ya da bozuk.');
  return result.data;
}

/** Mevcut verilerin tamamını yedekle değiştirir. Yedekte anahtar yoksa cihazdaki anahtar korunur. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const current = await getSettings();
  const settings: AppSettings = {
    id: 'app',
    apiKey: backup.settings.apiKey ?? current.apiKey,
    baseUrl: backup.settings.baseUrl,
    model: backup.settings.model,
    proxyUrl: backup.settings.proxyUrl,
  };
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.profile.put(backup.profile);
    await db.settings.put(settings);
    await db.weeks.bulkPut(backup.weeks);
    await db.days.bulkPut(backup.days);
    await db.quests.bulkPut(backup.quests);
    await db.spares.bulkPut(backup.spares);
    await db.reflections.bulkPut(backup.reflections);
  });
}

/** Tüm ilerlemeyi siler. İstenirse API ayarları cihazda kalır. */
export async function resetAll(keepApiSettings: boolean): Promise<void> {
  const current = await getSettings();
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    if (keepApiSettings) {
      await db.settings.put({
        ...DEFAULT_SETTINGS,
        apiKey: current.apiKey,
        baseUrl: current.baseUrl,
        model: current.model,
        proxyUrl: current.proxyUrl,
      });
    }
  });
}
