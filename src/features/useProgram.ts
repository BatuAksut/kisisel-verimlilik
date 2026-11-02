import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/database';
import { dayNumberFor, toDateKey } from '../domain/dates';
import { computeProgress, type Progress } from '../domain/progress';
import type { Profile } from '../domain/types';
import { syncProgram } from '../quests/sync';

const CLOCK_INTERVAL_MS = 30_000;

/**
 * Bugünün gün numarasını verir ve programı eşitler. Uygulama açık kalsa da gece yarısı yakalansın
 * diye tarih düzenli aralıkla ve ekrana dönüldüğünde kontrol edilir.
 */
export function useTodayNumber(profile: Profile): number {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const check = () => setDateKey(toDateKey(new Date()));
    const resync = () => {
      check();
      void syncProgram().catch(console.error);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resync();
    };
    const timer = setInterval(check, CLOCK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', resync);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', resync);
    };
  }, []);

  useEffect(() => {
    void syncProgram().catch(console.error);
  }, [dateKey, profile.startDate, profile.createdAt]);

  return dayNumberFor(profile.startDate, dateKey);
}

export function useProgress(todayNumber: number): Progress | undefined {
  const data = useLiveQuery(async () => {
    const [days, quests] = await Promise.all([db.days.toArray(), db.quests.toArray()]);
    return { days, quests };
  });
  return useMemo(() => (data ? computeProgress(data.days, data.quests, todayNumber) : undefined), [data, todayNumber]);
}
