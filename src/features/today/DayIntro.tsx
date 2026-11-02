import { useEffect, useState } from 'react';
import { isBossDay, phaseOfDay, TOTAL_DAYS } from '../../domain/program';
import { LOCATIONS } from '../../domain/world';

const STORAGE_KEY = 'quest66-intro-day';
const VISIBLE_MS = 1700;

function alreadyShown(day: number): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === String(day)) return true;
    localStorage.setItem(STORAGE_KEY, String(day));
  } catch {
    // Depo kapalıysa açılış kartı her seferinde görünür, sorun değil.
  }
  return false;
}

/** Günün ilk açılışında kısa bir bölüm kartı. Dokunmayı engellemez. */
export function DayIntro({ day }: { day: number }) {
  const [visible, setVisible] = useState(() => !alreadyShown(day));

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  const boss = isBossDay(day);
  return (
    <div aria-hidden="true" className="animate-intro pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-1 bg-ink">
      <p className="font-pixel text-lg tracking-widest text-muted">{LOCATIONS[phaseOfDay(day).key]}</p>
      <p className="font-pixel text-7xl text-amber">{day}. gün</p>
      <p className={`font-pixel text-xl ${boss ? 'text-rose' : 'text-muted'}`}>{boss ? 'Boss seni bekliyor' : `${TOTAL_DAYS} günlük yolda`}</p>
    </div>
  );
}
