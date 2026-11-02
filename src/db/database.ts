import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type DayRecord,
  type Profile,
  type Quest,
  type Reflection,
  type SpareQuest,
  type WeekRecord,
} from '../domain/types';

export const db = new Dexie('quest66') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
  weeks: EntityTable<WeekRecord, 'weekNumber'>;
  days: EntityTable<DayRecord, 'dayNumber'>;
  quests: EntityTable<Quest, 'id'>;
  spares: EntityTable<SpareQuest, 'id'>;
  reflections: EntityTable<Reflection, 'dayNumber'>;
};

db.version(1).stores({
  profile: 'id',
  settings: 'id',
  weeks: 'weekNumber',
  days: 'dayNumber',
  quests: 'id, dayNumber, weekNumber',
  spares: 'id, weekNumber',
  reflections: 'dayNumber',
});

export async function getSettings(): Promise<AppSettings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(changes: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ ...(await getSettings()), ...changes });
  });
}
