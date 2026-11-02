import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { AREA_LABELS, STAT_KEYS, STAT_LABELS, type Quest } from '../../domain/types';

interface QuestCardProps {
  quest: Quest;
  onToggle: (quest: Quest) => void;
  onReroll?: (quest: Quest) => void;
  rerollUsed?: boolean;
}

function frameColor(quest: Quest): string {
  if (quest.status === 'done') return 'var(--color-moss)';
  if (quest.type === 'boss') return 'var(--color-rose)';
  return 'var(--color-line)';
}

export function QuestCard({ quest, onToggle, onReroll, rerollUsed }: QuestCardProps) {
  const [justDone, setJustDone] = useState(false);
  const done = quest.status === 'done';
  const missed = quest.status === 'missed';

  return (
    <article
      className={`panel pixel-frame relative ${missed ? 'opacity-60' : ''}`}
      style={{ '--frame': frameColor(quest) } as React.CSSProperties}
    >
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${quest.title}: ${done ? 'tamamlandı, geri al' : 'tamamla'}`}
        disabled={missed}
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={() => {
          setJustDone(!done);
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
            <span className="text-muted">{AREA_LABELS[quest.area]}</span>
            <span className="text-muted">{quest.estimatedMinutes} dk</span>
            {STAT_KEYS.filter((key) => quest.stats[key]).map((key) => (
              <span key={key} style={{ color: `var(--color-stat-${key})` }}>
                +{quest.stats[key]} {STAT_LABELS[key]}
              </span>
            ))}
          </span>
        </span>
        <span className="shrink-0 font-pixel text-amber">{quest.xp} XP</span>
      </button>

      {done && justDone && (
        <span
          key={quest.completedAt}
          aria-hidden="true"
          className="animate-float-up pointer-events-none absolute right-3 top-2 font-pixel text-lg text-moss"
        >
          +{quest.xp} XP
        </span>
      )}

      {onReroll && quest.status === 'pending' && (
        <div className="border-t-2 border-ink-soft px-3 py-1.5 text-right">
          <button
            type="button"
            disabled={rerollUsed}
            onClick={() => onReroll(quest)}
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
