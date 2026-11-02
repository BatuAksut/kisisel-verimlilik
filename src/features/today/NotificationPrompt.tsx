import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { saveSettings } from '../../db/database';
import { notificationsSupported, requestNotificationPermission } from '../../notifications/notifications';

/** Android izin penceresi bir dokunuş ister, bu yüzden izin kart üzerinden istenir. */
export function NotificationPrompt({ dismissed, onGranted }: { dismissed: boolean; onGranted: () => void }) {
  const [hidden, setHidden] = useState(false);
  if (hidden || dismissed || !notificationsSupported() || Notification.permission !== 'default') return null;

  return (
    <section className="panel pixel-frame flex items-center gap-3 p-3 text-sm">
      <PixelIcon name="bell" size={20} className="text-amber" />
      <p className="flex-1">Uygulamayı açtığında bekleyen görevlerini hatırlatayım mı?</p>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          className="min-h-8 font-pixel text-amber"
          onClick={async () => {
            setHidden(true);
            if ((await requestNotificationPermission()) === 'granted') onGranted();
          }}
        >
          Bildirimi aç
        </button>
        <button
          type="button"
          className="min-h-8 text-muted"
          onClick={() => {
            setHidden(true);
            void saveSettings({ notificationPromptDismissed: true });
          }}
        >
          Şimdi değil
        </button>
      </div>
    </section>
  );
}
