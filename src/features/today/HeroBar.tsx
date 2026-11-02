import { PixelIcon } from '../../components/PixelIcon';
import { XpBar } from '../../components/XpBar';
import type { Progress } from '../../domain/progress';

export function HeroBar({ progress }: { progress: Progress }) {
  return (
    <section aria-label="Karakter durumu" className="panel pixel-frame space-y-2 p-3">
      <div className="flex items-center justify-between gap-3 font-pixel">
        <span className="text-lg">Seviye {progress.level}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-amber" title="Seri" aria-label={`Seri: ${progress.streak} gün`}>
            <PixelIcon name="flame" size={16} />
            {progress.streak}
          </span>
          <span className="flex items-center gap-1 text-ice" title="Seri dondurucu" aria-label={`Seri dondurucu: ${progress.freezes}`}>
            <PixelIcon name="snow" size={16} />
            {progress.freezes}
          </span>
        </span>
      </div>
      <XpBar value={progress.xpIntoLevel} max={progress.xpForNextLevel} label="Seviye ilerlemesi" />
      <p className="text-right text-xs text-muted">
        {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
      </p>
    </section>
  );
}

export function YesterdayNotice({ progress, todayNumber }: { progress: Progress; todayNumber: number }) {
  const outcome = progress.outcomes[todayNumber - 1];
  const penalty = progress.penalties[todayNumber - 1];
  if (outcome !== 'frozen' && outcome !== 'failed' && !penalty) return null;

  return (
    <p role="status" className="bg-panel-high px-3 py-2 text-sm">
      {outcome === 'frozen' && <span className="text-ice">Dün hedefi kaçırdın, dondurucu devreye girdi ve serin korundu. </span>}
      {outcome === 'failed' && <span className="text-rose">Dün hedefi kaçırdın, seri sıfırlandı. Bugün yeni bir başlangıç. </span>}
      {penalty ? <span className="text-rose">Hard Mode cezası: -{penalty} XP.</span> : null}
    </p>
  );
}

export function LevelUpToast({ level }: { level: number }) {
  return (
    <div
      role="status"
      className="pixel-frame animate-pop fixed inset-x-4 top-4 z-30 mx-auto max-w-sm bg-amber p-3 text-center font-pixel text-xl text-ink"
    >
      Seviye atladın! Artık seviye {level}
    </div>
  );
}
