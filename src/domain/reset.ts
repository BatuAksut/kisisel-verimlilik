import { addDays } from './dates';
import { TOTAL_DAYS } from './program';
import type { DayRecord, Difficulty, Quest } from './types';

/** Geçmiş bir güne ait, hâlâ bekleyen görevler: gece yarısı sıfırlamasında "kaçırıldı" olur. */
export function overdueQuestIds(quests: Pick<Quest, 'id' | 'dayNumber' | 'status'>[], todayNumber: number): string[] {
  return quests.filter((quest) => quest.status === 'pending' && quest.dayNumber < todayNumber).map((quest) => quest.id);
}

/** Uygulamanın açılmadığı günler dahil, bugüne kadar kaydı olmayan günleri üretir. */
export function missingDayRecords(
  existing: Pick<DayRecord, 'dayNumber'>[],
  startDate: string,
  todayNumber: number,
  difficulty: Difficulty,
): DayRecord[] {
  const known = new Set(existing.map((day) => day.dayNumber));
  const records: DayRecord[] = [];
  for (let dayNumber = 1; dayNumber <= Math.min(todayNumber, TOTAL_DAYS); dayNumber++) {
    if (known.has(dayNumber)) continue;
    records.push({ dayNumber, date: addDays(startDate, dayNumber - 1), difficulty, rerollUsed: false });
  }
  return records;
}
