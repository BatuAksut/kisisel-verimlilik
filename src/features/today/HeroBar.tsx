import { PixelIcon } from '../../components/PixelIcon';
import { HeroSprite } from '../../components/Sprite';
import { XpBar } from '../../components/XpBar';
import { heroTier, rankForLevel, type Progress } from '../../domain/progress';

export function HeroBar({ progress, todayXp }: { progress: Progress; todayXp: number }) {
  return (
    <section aria-label="Karakter durumu" className="panel pixel-frame flex items-center gap-3 p-3">
      <div className="portrait flex size-16 shrink-0 items-end justify-center overflow-hidden">
        <HeroSprite tier={heroTier(progress.level)} scale={4} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2 font-pixel">
          <span className="truncate text-lg leading-none">
            Seviye {progress.level} <span className="text-sm text-muted">{rankForLevel(progress.level)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="flex items-center gap-1 text-amber" title="Seri" aria-label={`Seri: ${progress.streak} gün`}>
              <PixelIcon name="flame" size={16} className={progress.streak > 0 ? 'animate-flicker' : 'opacity-40'} />
              {progress.streak}
            </span>
            <span className="flex items-center gap-1 text-ice" title="Seri dondurucu" aria-label={`Seri dondurucu: ${progress.freezes}`}>
              <PixelIcon name="snow" size={16} />
              {progress.freezes}
            </span>
          </span>
        </div>
        <XpBar value={progress.xpIntoLevel} max={progress.xpForNextLevel} label="Seviye ilerlemesi" />
        <p className="flex justify-between text-xs text-muted">
          <span className={todayXp > 0 ? 'text-moss' : ''}>Bugün +{todayXp} XP</span>
          <span>
            {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
          </span>
        </p>
      </div>
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
