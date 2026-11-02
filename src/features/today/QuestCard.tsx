import { useState } from 'react';
import { playCue } from '../../audio/sfx';
import { PixelIcon, type IconName } from '../../components/PixelIcon';
import { AREA_LABELS, STAT_KEYS, STAT_LABELS, type Area, type Quest, type StatKey } from '../../domain/types';

interface QuestCardProps {
  quest: Quest;
  onToggle: (quest: Quest) => void;
  onReroll?: (quest: Quest) => void;
  rerollUsed?: boolean;
  index?: number;
}

const AREA_STYLES: Record<Area, { icon: IconName; color: string }> = {
  uyku: { icon: 'moon', color: 'var(--color-orchid)' },
  su: { icon: 'drop', color: 'var(--color-ice)' },
  hareket: { icon: 'dumbbell', color: 'var(--color-rose)' },
  zihin: { icon: 'gem', color: 'var(--color-ice)' },
  ekran: { icon: 'screen', color: 'var(--color-amber)' },
  beslenme: { icon: 'apple', color: 'var(--color-moss)' },
  sosyal: { icon: 'people', color: 'var(--color-orchid)' },
  ogrenme: { icon: 'book', color: 'var(--color-amber)' },
};

export const STAT_ICONS: Record<StatKey, IconName> = {
  guc: 'sword',
  zihin: 'gem',
  disiplin: 'shield',
  saglik: 'heart',
  sosyal: 'people',
};

function frameColor(quest: Quest): string {
  if (quest.status === 'done') return 'var(--color-moss)';
  if (quest.type === 'boss') return 'var(--color-rose)';
  return 'var(--color-line)';
}

function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-6 left-6">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          className="burst-dot absolute size-1"
          style={
            {
              '--dx': `${Math.cos((index / 10) * 6.283) * (26 + (index % 3) * 8)}px`,
              '--dy': `${Math.sin((index / 10) * 6.283) * (26 + (index % 3) * 8)}px`,
              background: index % 2 ? 'var(--color-amber)' : 'var(--color-moss)',
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function QuestCard({ quest, onToggle, onReroll, rerollUsed, index = 0 }: QuestCardProps) {
  const [justDone, setJustDone] = useState(false);
  const done = quest.status === 'done';
  const missed = quest.status === 'missed';
  const area = AREA_STYLES[quest.area];

  return (
    <article
      className={`panel pixel-frame animate-rise relative ${missed ? 'opacity-60' : ''}`}
      style={{ '--frame': frameColor(quest), animationDelay: `${index * 45}ms` } as React.CSSProperties}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: done ? 'var(--color-moss)' : area.color }} />
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${quest.title}: ${done ? 'tamamlandı, geri al' : 'tamamla'}`}
        disabled={missed}
        className="flex w-full items-start gap-3 p-3 pl-4 text-left active:bg-panel-high"
        onClick={() => {
          setJustDone(!done);
          playCue(done ? 'undo' : 'complete');
          onToggle(quest);
        }}
      >
        <span
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center border-2 ${
            done ? 'border-moss bg-moss text-ink' : 'border-line bg-ink-soft text-transparent'
          } ${done && justDone ? 'animate-pop' : ''}`}
        >
          <PixelIcon name={missed ? 'cross' : 'check'} size={16} className={missed ? 'text-rose' : ''} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold leading-snug ${done ? 'text-muted line-through' : ''}`}>{quest.title}</span>
          <span className="mt-1 block text-sm leading-snug text-muted">{quest.description}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 text-muted">
              <span style={{ color: area.color }}>
                <PixelIcon name={area.icon} size={12} />
              </span>
              {AREA_LABELS[quest.area]}
            </span>
            <span className="inline-flex items-center gap-1 text-muted">
              <PixelIcon name="clock" size={12} />
              {quest.estimatedMinutes} dk
            </span>
            {STAT_KEYS.filter((key) => quest.stats[key]).map((key) => (
              <span key={key} className="inline-flex items-center gap-1" style={{ color: `var(--color-stat-${key})` }}>
                <PixelIcon name={STAT_ICONS[key]} size={12} />+{quest.stats[key]} {STAT_LABELS[key]}
              </span>
            ))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-pixel text-amber">
          <PixelIcon name="coin" size={14} />
          {quest.xp} XP
        </span>
      </button>

      {done && justDone && <Burst key={`burst-${quest.completedAt}`} />}
      {done && justDone && (
        <span
          key={quest.completedAt}
          aria-hidden="true"
          className="animate-float-up pointer-events-none absolute right-20 top-2 font-pixel text-lg text-moss"
        >
          +{quest.xp} XP
        </span>
      )}

      {onReroll && quest.status === 'pending' && (
        <div className="border-t-2 border-ink-soft px-3 py-1.5 text-right">
          <button
            type="button"
            disabled={rerollUsed}
            onClick={() => {
              playCue('reroll');
              onReroll(quest);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 font-pixel text-sm text-ice disabled:text-muted disabled:opacity-60"
          >
            <PixelIcon name="dice" size={14} />
            {rerollUsed ? 'Değiştirme hakkı bugün kullanıldı' : 'Başka görev getir'}
          </button>
        </div>
      )}
    </article>
  );
}
