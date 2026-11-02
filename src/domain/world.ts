import { bossDayOfWeek, phaseOfDay, TOTAL_WEEKS, weekOfDay, type Phase } from './program';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export const LOCATIONS: Record<Phase['key'], string> = {
  temel: 'Kamp Ormanı',
  yukselis: 'Rüzgârlı Geçit',
  ustalik: 'Zirve Kalesi',
};

export type MonsterKind = 'shade' | 'golem' | 'horned' | 'gazer';

export interface Boss {
  name: string;
  quote: string;
  kind: MonsterKind;
  color: string;
}

/** Her hafta bir Boss: görevi yapay zekâ ya da havuz yazar, karşıdaki düşman kötü alışkanlıktır. */
export const BOSSES: Boss[] = [
  { name: 'Erteleme Gölgesi', quote: 'Yarın da olur diye fısıldar.', kind: 'shade', color: '#7b6bb0' },
  { name: 'Ekran Hayaleti', quote: 'Bir kaydırma daha ister.', kind: 'gazer', color: '#4f9fc4' },
  { name: 'Yorgunluk Devi', quote: 'Omuzlarına çöker, kalkma der.', kind: 'golem', color: '#8a8373' },
  { name: 'Dağınıklık Gözü', quote: 'Dikkatini parça parça çalar.', kind: 'gazer', color: '#b5699b' },
  { name: 'Bahane Ustası', quote: 'Her zaman haklı bir nedeni vardır.', kind: 'horned', color: '#c4693f' },
  { name: 'Uykusuzluk Cini', quote: 'Gece yarısından sonra uyanır.', kind: 'shade', color: '#4c6bb8' },
  { name: 'Kıyas Aynası', quote: 'Sana hep başkasını gösterir.', kind: 'gazer', color: '#6fb0a8' },
  { name: 'Konfor Bataklığı', quote: 'Yumuşaktır ama bırakmaz.', kind: 'golem', color: '#6b8a4c' },
  { name: 'Şüphe Kralı', quote: 'Bunca yol boşuna mı diye sorar.', kind: 'horned', color: '#a04a5f' },
  { name: 'Eski Sen', quote: 'Son kapıda seni bekliyor.', kind: 'horned', color: '#d9a13b' },
];

export function bossOfWeek(week: number): Boss {
  return BOSSES[Math.min(Math.max(week, 1), TOTAL_WEEKS) - 1];
}

export function daysUntilBoss(day: number): number {
  return bossDayOfWeek(weekOfDay(day)) - day;
}

const CHAPTER_OPENINGS: Record<number, string> = {
  1: 'Macera burada başlıyor. Çantanı al, ateşi yak.',
  22: 'Orman geride kaldı. Önünde Rüzgârlı Geçit var.',
  45: 'Geçidi aştın. Zirve Kalesi ufukta göründü.',
};

const PHASE_LINES: Record<Phase['key'], string[]> = {
  temel: [
    'Kamp ateşi yanıyor. Bugünün işi küçük ama gerçek.',
    'Orman sessiz. İlk adımlar en ağır olanlardır.',
    'Patika önünde uzanıyor. Acele yok, durmak da yok.',
    'Çantan hafif, yolun uzun. Bir görevle başla.',
  ],
  yukselis: [
    'Rüzgâr sertleşti. Geldiğin yol artık aşağıda kalıyor.',
    'Geçit dar ama açık. Bugün de bir adım yukarı.',
    'Alışkanlık burada sınanır. Yorulmak geri dönmek demek değil.',
    'Bulutlar ayağının altında toplanıyor.',
  ],
  ustalik: [
    'Kulelerin ışığı görünüyor. Artık bunu görevler değil, sen yapıyorsun.',
    'Zirve yakın. Çok az kişi bu kadar uzağa gelir.',
    'Taş yol adımlarını tanıyor. Ritmini koru.',
  ],
};

const WON_LINES = [
  'Bugünün yolu tamam. Ateşin başında dinlenebilirsin.',
  'Sancağını diktin. Yarınki sen sana teşekkür edecek.',
  'Gün senin. Bir yan görev için hâlâ vaktin var.',
];

export type BossState = 'none' | 'pending' | 'defeated';

/** Bugünün anlatıcı cümlesi. Rastgele değildir: aynı gün ve aynı durumda hep aynı cümle gelir. */
export function narratorLine(day: number, state: { won: boolean; boss: BossState; time: TimeOfDay }): string {
  const boss = bossOfWeek(weekOfDay(day));
  if (state.boss === 'pending') return `${boss.name} yolunu kesti. ${boss.quote}`;
  if (state.boss === 'defeated') return `${boss.name} yenildi. Yol yeniden açık.`;
  if (state.won) return WON_LINES[day % WON_LINES.length];
  if (CHAPTER_OPENINGS[day]) return CHAPTER_OPENINGS[day];
  if (state.time === 'night') return 'Gece çöktü ama gün bitmedi. Bir görev daha sığar.';
  const lines = PHASE_LINES[phaseOfDay(day).key];
  return lines[(day - 1) % lines.length];
}
