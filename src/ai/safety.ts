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

// "Detoks" yiyecekle ilgiliyse yasak, ekran detoksu gibi kullanımlar ise zararsız bir alışkanlık görevidir.
const HARMLESS_DETOX = /(dijital|ekran|telefon|sosyal medya|internet)\s+detoks/g;

export function isSafeQuest(quest: Pick<QuestBlueprint, 'title' | 'description' | 'why'>): boolean {
  const text = `${quest.title} ${quest.description} ${quest.why ?? ''}`.toLocaleLowerCase('tr').replace(HARMLESS_DETOX, '');
  return !FORBIDDEN.some((phrase) => text.includes(phrase));
}
