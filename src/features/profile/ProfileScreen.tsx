import { useLiveQuery } from 'dexie-react-hooks';
import { PixelIcon, type IconName } from '../../components/PixelIcon';
import { Scene } from '../../components/Scene';
import { XpBar } from '../../components/XpBar';
import { db } from '../../db/database';
import { computeAchievements } from '../../domain/achievements';
import { isBossDay, PHASES, phaseOfDay, TOTAL_DAYS } from '../../domain/program';
import { heroTier, nextRank, rankForLevel, type DayOutcome, type Progress } from '../../domain/progress';
import { DIFFICULTY_LABELS, STAT_KEYS, STAT_LABELS, type Profile, type Quest } from '../../domain/types';
import { LOCATIONS, timeOfDay } from '../../domain/world';
import { STAT_ICONS } from '../today/QuestCard';
import { useProgress } from '../useProgram';

const OUTCOME_STYLES: Record<DayOutcome | 'upcoming', { className: string; label: string }> = {
  success: { className: 'bg-moss text-ink', label: 'başarılı' },
  frozen: { className: 'bg-ice text-ink', label: 'dondurucu kullanıldı' },
  failed: { className: 'bg-rose text-ink', label: 'kaçırıldı' },
  pending: { className: 'bg-panel-high text-text', label: 'bugün' },
  upcoming: { className: 'bg-ink-soft text-muted', label: 'gelecek' },
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
            <span className="inline-flex items-center gap-1.5">
              <span style={{ color: `var(--color-stat-${key})` }}>
                <PixelIcon name={STAT_ICONS[key]} size={14} />
              </span>
              {STAT_LABELS[key]}
            </span>
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

function Badges({ progress, quests, todayNumber }: { progress: Progress; quests: Quest[]; todayNumber: number }) {
  const badges = computeAchievements(progress, quests, todayNumber);
  const unlocked = badges.filter((badge) => badge.unlocked).length;
  return (
    <section aria-label="Rozetler" className="panel pixel-frame space-y-3 p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">Rozetler</h2>
        <span className="font-pixel text-sm text-muted">
          {unlocked} / {badges.length}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {badges.map((badge) => (
          <li
            key={badge.id}
            data-unlocked={badge.unlocked}
            className={`flex flex-col items-center gap-1 px-1 py-2 text-center ${badge.unlocked ? 'bg-panel-high' : 'bg-ink-soft'}`}
          >
            <PixelIcon name={badge.unlocked ? badge.icon : 'lock'} size={24} className={badge.unlocked ? 'text-amber' : 'text-line'} />
            <span className={`font-pixel text-sm leading-none ${badge.unlocked ? '' : 'text-muted'}`}>{badge.title}</span>
            <span className="text-[11px] leading-tight text-muted">{badge.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayGrid({ progress, todayNumber }: { progress: Progress; todayNumber: number }) {
  return (
    <section aria-label="66 günlük ilerleme" className="panel pixel-frame space-y-3 p-3">
      <h2 className="text-xl">66 günlük yol</h2>
      {PHASES.map((phase) => (
        <div key={phase.key}>
          <p className="mb-1.5 font-pixel text-sm text-muted">
            {phase.name} · {LOCATIONS[phase.key]}
          </p>
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
                  }`}
                >
                  {boss && outcome === 'upcoming' ? <PixelIcon name="skull" size={14} className="text-rose" /> : day}
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
          <PixelIcon name="skull" size={12} className="text-rose" /> Boss günü
        </li>
      </ul>
    </section>
  );
}

export function ProfileScreen({ profile, todayNumber }: { profile: Profile; todayNumber: number }) {
  const progress = useProgress(todayNumber);
  const quests = useLiveQuery(() => db.quests.toArray());
  if (!progress) return null;

  const daysLeft = Math.max(TOTAL_DAYS - Math.max(todayNumber, 0), 0);
  const phase = phaseOfDay(Math.max(todayNumber, 1));
  const next = nextRank(progress.level);

  return (
    <div className="space-y-4">
      <div>
        <div className="scene-bleed">
          <Scene
            phase={phase.key}
            time={timeOfDay(new Date().getHours())}
            journey={(todayNumber - phase.firstDay) / (phase.lastDay - phase.firstDay)}
            tier={heroTier(progress.level)}
            seed={phase.firstDay}
            tintStatusBar
          />
        </div>
        <section aria-label="Karakter" className="panel pixel-frame relative -mt-3 space-y-1.5 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-3xl leading-none">Seviye {progress.level}</h1>
            <p className="font-pixel text-amber">{rankForLevel(progress.level)}</p>
          </div>
          <XpBar value={progress.xpIntoLevel} max={progress.xpForNextLevel} label="Seviye ilerlemesi" />
          <p className="text-xs text-muted">
            Toplam {progress.totalXp} XP · sonraki seviyeye {progress.xpForNextLevel - progress.xpIntoLevel} XP
          </p>
          <p className="text-xs text-muted">
            {DIFFICULTY_LABELS[profile.difficulty]}
            {next ? ` · Seviye ${next.minLevel}’de ${next.name} olursun, görünümün de değişir.` : ' · En yüksek rütbedesin.'}
          </p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile icon="flame" label="Güncel seri" value={progress.streak} tone="text-amber" />
        <StatTile icon="star" label="En iyi seri" value={progress.bestStreak} tone="text-orchid" />
        <StatTile icon="snow" label="Dondurucu" value={progress.freezes} tone="text-ice" />
        <StatTile icon="flag" label="Kalan gün" value={daysLeft} tone="text-moss" />
      </div>

      {progress.penaltyTotal > 0 && (
        <p className="text-sm text-rose">Hard Mode cezası olarak toplam {progress.penaltyTotal} XP kaybettin.</p>
      )}

      <Attributes progress={progress} />
      <Badges progress={progress} quests={quests ?? []} todayNumber={todayNumber} />
      <DayGrid progress={progress} todayNumber={todayNumber} />
    </div>
  );
}
