import { PixelIcon, type IconName } from '../../components/PixelIcon';
import { XpBar } from '../../components/XpBar';
import { isBossDay, PHASES, TOTAL_DAYS } from '../../domain/program';
import { rankForLevel, type DayOutcome, type Progress } from '../../domain/progress';
import { DIFFICULTY_LABELS, STAT_KEYS, STAT_LABELS, type Profile } from '../../domain/types';
import { useProgress } from '../useProgram';

const OUTCOME_STYLES: Record<DayOutcome | 'upcoming', { className: string; label: string }> = {
  success: { className: 'bg-moss text-ink', label: 'başarılı' },
  frozen: { className: 'bg-ice text-ink', label: 'dondurucu kullanıldı' },
  failed: { className: 'bg-rose text-ink', label: 'kaçırıldı' },
  pending: { className: 'bg-panel-high text-text', label: 'bugün' },
  upcoming: { className: 'bg-panel text-muted', label: 'gelecek' },
};

function StatTile({ icon, label, value, tone }: { icon: IconName; label: string; value: string | number; tone: string }) {
  return (
    <div className="panel pixel-frame flex items-center gap-2 p-2.5">
      <PixelIcon name={icon} size={20} className={tone} />
      <div className="min-w-0">
        <p className="font-pixel text-xl leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function Attributes({ progress }: { progress: Progress }) {
  const scale = Math.max(100, ...STAT_KEYS.map((key) => progress.stats[key]));
  return (
    <section aria-label="Özellikler" className="panel pixel-frame space-y-2.5 p-3">
      <h2 className="text-xl">Özellikler</h2>
      {STAT_KEYS.map((key) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{STAT_LABELS[key]}</span>
            <span className="font-pixel" data-testid={`stat-${key}`}>
              {progress.stats[key]}
            </span>
          </div>
          <div className="h-2.5 bg-ink-soft">
            <div
              className="h-full"
              style={{ width: `${(progress.stats[key] / scale) * 100}%`, background: `var(--color-stat-${key})` }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

function DayGrid({ progress, todayNumber }: { progress: Progress; todayNumber: number }) {
  return (
    <section aria-label="66 günlük ilerleme" className="panel pixel-frame space-y-3 p-3">
      <h2 className="text-xl">66 günlük yol</h2>
      {PHASES.map((phase) => (
        <div key={phase.key}>
          <p className="mb-1.5 font-pixel text-sm text-muted">{phase.name}</p>
          <div className="grid grid-cols-11 gap-[3px]">
            {Array.from({ length: phase.lastDay - phase.firstDay + 1 }, (_, index) => {
              const day = phase.firstDay + index;
              const outcome: DayOutcome | 'upcoming' = day <= todayNumber ? (progress.outcomes[day] ?? 'upcoming') : 'upcoming';
              const style = OUTCOME_STYLES[outcome];
              const boss = isBossDay(day);
              return (
                <div
                  key={day}
                  role="img"
                  aria-label={`Gün ${day}: ${style.label}${boss ? ', Boss günü' : ''}`}
                  data-day={day}
                  data-outcome={outcome}
                  className={`flex aspect-square items-center justify-center font-pixel text-[11px] ${style.className} ${
                    day === todayNumber ? 'outline-2 outline-offset-1 outline-amber' : ''
                  } ${boss && outcome === 'upcoming' ? 'border-b-2 border-rose' : ''}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-3 bg-moss" /> Başarılı
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 bg-ice" /> Dondurucu
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 bg-rose" /> Kaçırıldı
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 border-b-2 border-rose bg-panel" /> Boss günü
        </li>
      </ul>
    </section>
  );
}

export function ProfileScreen({ profile, todayNumber }: { profile: Profile; todayNumber: number }) {
  const progress = useProgress(todayNumber);
  if (!progress) return null;

  const daysLeft = Math.max(TOTAL_DAYS - Math.max(todayNumber, 0), 0);

  return (
    <div className="space-y-4">
      <section aria-label="Karakter" className="panel pixel-frame flex items-center gap-4 p-4">
        <div className="flex size-16 shrink-0 items-center justify-center bg-ink-soft text-amber">
          <PixelIcon name="hero" size={44} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="text-2xl leading-none">Seviye {progress.level}</h1>
          <p className="text-sm text-muted">
            {rankForLevel(progress.level)} · {DIFFICULTY_LABELS[profile.difficulty]}
          </p>
          <XpBar value={progress.xpIntoLevel} max={progress.xpForNextLevel} label="Seviye ilerlemesi" />
          <p className="text-xs text-muted">
            Toplam {progress.totalXp} XP · sonraki seviyeye {progress.xpForNextLevel - progress.xpIntoLevel} XP
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <StatTile icon="flame" label="Güncel seri" value={progress.streak} tone="text-amber" />
        <StatTile icon="star" label="En iyi seri" value={progress.bestStreak} tone="text-orchid" />
        <StatTile icon="snow" label="Dondurucu" value={progress.freezes} tone="text-ice" />
        <StatTile icon="map" label="Kalan gün" value={daysLeft} tone="text-moss" />
      </div>

      {progress.penaltyTotal > 0 && (
        <p className="text-sm text-rose">Hard Mode cezası olarak toplam {progress.penaltyTotal} XP kaybettin.</p>
      )}

      <Attributes progress={progress} />
      <DayGrid progress={progress} todayNumber={todayNumber} />
    </div>
  );
}
