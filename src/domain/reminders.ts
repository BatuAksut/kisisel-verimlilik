export const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;

export function shouldRemind(pendingCount: number, lastReminderAt: number | undefined, now: number): boolean {
  if (pendingCount === 0) return false;
  return lastReminderAt === undefined || now - lastReminderAt >= REMINDER_INTERVAL_MS;
}
