import type { QuestBlueprint } from '../domain/types';

// Modelin kural dışına çıkmasına karşı son savunma. Listedeki bir ifadeyi içeren görev
// kullanılmaz, yerine havuzdan görev gelir.
const FORBIDDEN = [
  'oruç',
  'kalori',
  'diyet',
  'açlık',
  'aç kal',
  'öğün atla',
  'öğünü atla',
  'kilo ver',
  'zayıfla',
  'detoks',
  'ilaç',
  'takviye',
  'dozaj',
  'tedavi',
  'teşhis',
  'buz banyosu',
  'uykusuz kal',
  'nefesini tut',
];

export function isSafeQuest(quest: Pick<QuestBlueprint, 'title' | 'description'>): boolean {
  const text = `${quest.title} ${quest.description}`.toLocaleLowerCase('tr');
  return !FORBIDDEN.some((phrase) => text.includes(phrase));
}
