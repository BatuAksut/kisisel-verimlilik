import { useEffect, useRef, useState } from 'react';
import { playCue } from '../../audio/sfx';
import { PixelIcon } from '../../components/PixelIcon';
import { HeroSprite, MonsterSprite } from '../../components/Sprite';
import { weekOfDay } from '../../domain/program';
import { heroTier, rankForLevel, type Progress } from '../../domain/progress';
import type { Quest } from '../../domain/types';
import { bossOfWeek, type Boss } from '../../domain/world';

export type CelebrationEvent = { kind: 'boss'; boss: Boss } | { kind: 'level'; level: number } | { kind: 'day' };

const VISIBLE_MS = 2400;

/** Ödül anları yalnızca bu ekranda bir görev bitince kutlanır, açılışta değil. */
export function useCelebrations(progress: Progress | undefined, quests: Quest[] | undefined, todayNumber: number) {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const seen = useRef<{ day: number; level: number; won: boolean; bossDone: boolean } | null>(null);

  useEffect(() => {
    if (!progress || !quests) return;
    const snapshot = {
      day: todayNumber,
      level: progress.level,
      won: progress.outcomes[todayNumber] === 'success',
      bossDone: quests.some((quest) => quest.type === 'boss' && quest.status === 'done'),
    };
    const previous = seen.current;
    seen.current = snapshot;
    if (!previous || previous.day !== todayNumber) return;
    const events: CelebrationEvent[] = [];
    if (snapshot.bossDone && !previous.bossDone) events.push({ kind: 'boss', boss: bossOfWeek(weekOfDay(todayNumber)) });
    if (snapshot.level > previous.level) events.push({ kind: 'level', level: snapshot.level });
    if (snapshot.won && !previous.won) events.push({ kind: 'day' });
    if (events.length > 0) setQueue((current) => [...current, ...events]);
  }, [progress, quests, todayNumber]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    playCue(current.kind);
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return current;
}

function Sparks() {
  return (
    <span aria-hidden="true" className="absolute inset-0">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={index}
          className="celebrate-spark absolute top-1/2 left-1/2 size-1.5"
          style={
            {
              '--dx': `${Math.cos((index / 14) * 6.283) * 130}px`,
              '--dy': `${Math.sin((index / 14) * 6.283) * 130}px`,
              background: ['#f2b441', '#6fcf7f', '#6cc4e8', '#c58be0'][index % 4],
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function Celebration({ event }: { event: CelebrationEvent }) {
  return (
    <div role="status" className="animate-fade-through pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-ink/70 px-6">
      <div className="relative w-full max-w-xs text-center">
        <span aria-hidden="true" className="celebrate-rays absolute top-1/2 left-1/2 size-72" />
        <Sparks />
        <div className="animate-stamp relative space-y-2">
          {event.kind === 'boss' && (
            <>
              <MonsterSprite boss={event.boss} scale={6} className="grayscale" />
              <p className="font-pixel text-4xl text-rose">Boss yenildi!</p>
              <p className="font-pixel text-xl">{event.boss.name} yolundan çekildi.</p>
            </>
          )}
          {event.kind === 'level' && (
            <>
              <HeroSprite tier={heroTier(event.level)} scale={6} />
              <p className="font-pixel text-4xl text-amber">Seviye atladın!</p>
              <p className="font-pixel text-xl">
                Artık seviye {event.level} · {rankForLevel(event.level)}
              </p>
            </>
          )}
          {event.kind === 'day' && (
            <>
              <PixelIcon name="flag" size={72} className="text-moss" />
              <p className="font-pixel text-4xl text-moss">Gün fethedildi</p>
              <p className="font-pixel text-xl">Serin bir adım daha uzadı.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
