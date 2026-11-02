import { useState, useSyncExternalStore } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { saveSettings } from '../../db/database';
import { installStatus, promptInstall } from '../../pwa/install';

/** Tarayıcı sekmesinde açıldıysa uygulamayı ana ekrana kurmayı önerir. */
export function InstallPrompt({ dismissed }: { dismissed: boolean }) {
  const [hidden, setHidden] = useState(false);
  const canPrompt = useSyncExternalStore(installStatus.subscribe, installStatus.canPrompt);
  const isInstalled = useSyncExternalStore(installStatus.subscribe, installStatus.isInstalled);
  if (hidden || dismissed || isInstalled) return null;

  return (
    <section
      aria-label="Uygulamayı yükle"
      className="panel pixel-frame space-y-2 p-3 text-sm"
      style={{ '--frame': 'var(--color-amber)' } as React.CSSProperties}
    >
      <p className="flex items-center gap-2 font-pixel text-lg">
        <PixelIcon name="star" size={18} className="text-amber" />
        Telefona uygulama olarak kur
      </p>
      <p className="text-muted">
        {canPrompt
          ? 'Ana ekranda kendi simgesiyle, adres çubuğu olmadan tam ekran açılır.'
          : 'Chrome menüsünden (sağ üstte ⋮) “Ana ekrana ekle” veya “Uygulamayı yükle”yi seç. Ana ekrandaki simgeden açınca adres çubuğu kaybolur.'}
      </p>
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          className="min-h-9 text-muted"
          onClick={() => {
            setHidden(true);
            void saveSettings({ installPromptDismissed: true });
          }}
        >
          Gizle
        </button>
        {canPrompt && (
          <button type="button" className="pixel-btn pixel-frame" onClick={() => void promptInstall()}>
            Yükle
          </button>
        )}
      </div>
    </section>
  );
}
