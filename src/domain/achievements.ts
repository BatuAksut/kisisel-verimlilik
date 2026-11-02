import { PHASES } from './program';
import type { Progress } from './progress';
import { STAT_KEYS, type Quest } from './types';

export type BadgeIcon = 'check' | 'flame' | 'skull' | 'star' | 'flag' | 'hero' | 'shield' | 'crown';

export interface Achievement {
  id: string;
  title: string;
  hint: string;
  icon: BadgeIcon;
  unlocked: boolean;
}

/** Rozetler de ilerleme gibi kayıtlardan hesaplanır, ayrıca saklanmaz. */
export function computeAchievements(progress: Progress, quests: Pick<Quest, 'status' | 'type'>[], todayNumber: number): Achievement[] {
  const done = quests.filter((quest) => quest.status === 'done');
  const bosses = done.filter((quest) => quest.type === 'boss').length;
  const [temel, yukselis] = PHASES;
  const rows: Omit<Achievement, 'id'>[] = [
    { title: 'İlk Adım', hint: 'İlk görevini bitir', icon: 'check', unlocked: done.length >= 1 },
    { title: 'Kıvılcım', hint: '3 günlük seri', icon: 'flame', unlocked: progress.bestStreak >= 3 },
    { title: 'Alev', hint: '7 günlük seri', icon: 'flame', unlocked: progress.bestStreak >= 7 },
    { title: 'Yangın', hint: '21 günlük seri', icon: 'flame', unlocked: progress.bestStreak >= 21 },
    { title: 'İlk Zafer', hint: 'İlk Boss’u yen', icon: 'skull', unlocked: bosses >= 1 },
    { title: 'Avcı', hint: '5 Boss yen', icon: 'skull', unlocked: bosses >= 5 },
    { title: 'Elli Görev', hint: '50 görev bitir', icon: 'star', unlocked: done.length >= 50 },
    { title: 'Kâşif', hint: 'Seviye 5’e ulaş', icon: 'hero', unlocked: progress.level >= 5 },
    { title: 'Savaşçı', hint: 'Seviye 10’a ulaş', icon: 'hero', unlocked: progress.level >= 10 },
    { title: 'Çok Yönlü', hint: 'Her özellikte 100 puan', icon: 'shield', unlocked: STAT_KEYS.every((key) => progress.stats[key] >= 100) },
    { title: 'Ormandan Çıkış', hint: 'Temel evresini bitir', icon: 'flag', unlocked: todayNumber > temel.lastDay },
    { title: 'Geçidin Ötesi', hint: 'Yükseliş evresini bitir', icon: 'flag', unlocked: todayNumber > yukselis.lastDay },
    { title: 'Zirve', hint: 'Son Boss’u yen', icon: 'crown', unlocked: bosses >= 10 },
  ];
  return rows.map((row) => ({ ...row, id: row.title }));
}
