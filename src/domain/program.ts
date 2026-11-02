export const TOTAL_DAYS = 66;
export const DAYS_PER_WEEK = 7;
export const TOTAL_WEEKS = Math.ceil(TOTAL_DAYS / DAYS_PER_WEEK);

export interface Phase {
  key: 'temel' | 'yukselis' | 'ustalik';
  name: string;
  firstDay: number;
  lastDay: number;
}

export const PHASES: Phase[] = [
  { key: 'temel', name: 'Temel', firstDay: 1, lastDay: 21 },
  { key: 'yukselis', name: 'Yükseliş', firstDay: 22, lastDay: 44 },
  { key: 'ustalik', name: 'Ustalık', firstDay: 45, lastDay: 66 },
];

export function phaseOfDay(day: number): Phase {
  return PHASES.find((phase) => day <= phase.lastDay) ?? PHASES[PHASES.length - 1];
}

export function weekOfDay(day: number): number {
  return Math.min(Math.max(Math.ceil(day / DAYS_PER_WEEK), 1), TOTAL_WEEKS);
}

export function daysOfWeek(week: number): number[] {
  const first = (week - 1) * DAYS_PER_WEEK + 1;
  const last = Math.min(week * DAYS_PER_WEEK, TOTAL_DAYS);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/** Boss her haftanın son gününde çıkar; son hafta 3 gün sürdüğü için final Boss 66. gündedir. */
export function bossDayOfWeek(week: number): number {
  return Math.min(week * DAYS_PER_WEEK, TOTAL_DAYS);
}

export function isBossDay(day: number): boolean {
  return bossDayOfWeek(weekOfDay(day)) === day;
}
