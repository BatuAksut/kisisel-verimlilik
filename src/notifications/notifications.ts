import { getSettings, saveSettings } from '../db/database';
import { shouldRemind } from '../domain/reminders';

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

/** Android Chrome `new Notification()` desteklemez, bildirim service worker üzerinden gösterilir. */
export async function remindPendingQuests(pendingCount: number, now: number = Date.now()): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const settings = await getSettings();
  if (!shouldRemind(pendingCount, settings.lastReminderAt, now)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  await registration.showNotification('Quest66', {
    body: `Bugün ${pendingCount} görev seni bekliyor.`,
    icon: 'icons/icon-192.png',
    tag: 'quest66-reminder',
  });
  await saveSettings({ lastReminderAt: now });
}
