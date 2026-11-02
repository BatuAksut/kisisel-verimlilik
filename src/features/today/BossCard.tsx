import { MonsterSprite } from '../../components/Sprite';
import type { Quest } from '../../domain/types';
import type { Boss } from '../../domain/world';
import { QuestCard } from './QuestCard';

const HEALTH_SEGMENTS = 12;

export function BossEncounter({ boss, quest, onToggle }: { boss: Boss; quest: Quest; onToggle: (quest: Quest) => void }) {
  const defeated = quest.status === 'done';
  return (
    <section aria-label="Boss görevi" className="boss-panel pixel-frame space-y-3 p-3">
      <div className="flex items-center gap-3">
        <div className={defeated ? 'opacity-50 grayscale' : 'animate-hover'}>
          <MonsterSprite boss={boss} scale={5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-sm text-rose">Haftanın Boss’u</p>
          <h2 className="text-2xl leading-none">{boss.name}</h2>
          <p className="mt-1 text-xs text-muted">{boss.quote}</p>
          <div className="mt-2 grid h-3 gap-px bg-ink p-px" style={{ gridTemplateColumns: `repeat(${HEALTH_SEGMENTS}, 1fr)` }} aria-hidden="true">
            {Array.from({ length: HEALTH_SEGMENTS }, (_, index) => (
              <span key={index} className={defeated ? 'bg-ink-soft' : 'bg-rose'} />
            ))}
          </div>
        </div>
      </div>
      <QuestCard quest={quest} onToggle={onToggle} />
    </section>
  );
}

export function BossTeaser({ boss, days }: { boss: Boss; days: number }) {
  return (
    <aside aria-label="Yaklaşan Boss" className="flex items-center gap-3 bg-ink-soft px-3 py-2">
      <MonsterSprite boss={boss} scale={2} className="opacity-80 brightness-75" />
      <p className="min-w-0 flex-1 text-sm text-muted">
        <span className="text-rose">{days === 1 ? 'Yarın' : `${days} gün sonra`}:</span> {boss.name}
      </p>
    </aside>
  );
}
