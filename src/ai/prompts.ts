import type { WeekSummary } from '../domain/feedback';
import { bossDayOfWeek, phaseOfDay } from '../domain/program';
import { DIFFICULTY_LABELS, type Difficulty, type OnboardingAnswers } from '../domain/types';
import { MAIN_COUNT, SIDE_COUNT, SPARE_SIDE_COUNT } from '../quests/plan';

export const SYSTEM_PROMPT = `Sen Quest66 adlı, 66 günlük oyunlaştırılmış bir alışkanlık uygulamasının görev tasarımcısısın. Türkçe yazıyorsun ve yalnızca geçerli JSON döndürüyorsun.

GÖREV KURALLARI
- Görevler somut ve ölçülebilir olmalı. "Daha az telefon" değil, "21:00'den sonra telefonu başka odaya koy" gibi yaz.
- Süreler gerçekçi olmalı; kişinin günlük boş zamanını aşma.
- Zorluk haftadan haftaya kademeli artmalı. Önceki haftanın tamamlama verisine uy: "azalt" ise görevleri kısalt ve kolaylaştır, "koru" ise aynı seviyede kal, "artir" ise biraz zorlaştır.
- Ana görevler alışkanlık kazandırmalı, günler arasında tekrar edebilir.
- Yan görevler eğlenceli, beklenmedik ve kişiye özel olmalı, 5-30 dakika sürmeli. Kişinin ilgi alanlarından yararlan.
- Boss görevi haftanın temasına uygun, normal görevlerden belirgin biçimde büyük ama bir günde bitirilebilir olmalı.

GÜVENLİK
- Aşırı diyet, oruç, öğün atlama, kalori hedefi veya kilo hedefi içeren görev verme.
- Tıbbi tavsiye, ilaç veya takviye önerme.
- Tehlikeli fiziksel görev verme: aşırı antrenman, uykusuz kalma, soğuğa veya sıcağa maruz kalma, başkalarını ya da kendini riske atan hiçbir şey.

ALANLAR (area): uyku, su, hareket, zihin, ekran, beslenme, sosyal, ogrenme
ÖZELLİKLER (stats anahtarları): guc, zihin, disiplin, saglik, sosyal

XP KURALLARI: xp, stats içindeki değerlerin toplamına eşit olmalı. Ana görev toplam 10-30, yan görev 15-40, Boss 60-150 XP.

ÇIKTI BİÇİMİ (JSON):
{
  "theme": "Haftanın kısa teması",
  "days": [
    {
      "day": 1,
      "main": [{"id": "m1", "title": "Kısa başlık", "description": "Tek cümlede ne yapılacağı", "area": "su", "stats": {"saglik": 15, "disiplin": 5}, "xp": 20, "estimatedMinutes": 5, "type": "main"}],
      "side": [{"id": "s1", "title": "...", "description": "...", "area": "sosyal", "stats": {"sosyal": 20}, "xp": 20, "estimatedMinutes": 10, "type": "side"}]
    }
  ],
  "boss": {"id": "b1", "title": "...", "description": "...", "area": "zihin", "stats": {"zihin": 60, "disiplin": 40}, "xp": 100, "estimatedMinutes": 90, "type": "boss"},
  "spareSide": [{"id": "x1", "title": "...", "description": "...", "area": "zihin", "stats": {"zihin": 20}, "xp": 20, "estimatedMinutes": 10, "type": "side"}]
}`;

export interface WeekPromptInput {
  weekNumber: number;
  days: number[];
  difficulty: Difficulty;
  answers: OnboardingAnswers;
  previousWeek: WeekSummary | null;
  previousThemes: string[];
}

export function buildWeekPrompt(input: WeekPromptInput): string {
  const context = {
    hafta: input.weekNumber,
    gunler: input.days.map((day) => ({ gun: day, evre: phaseOfDay(day).name })),
    bossGunu: bossDayOfWeek(input.weekNumber),
    zorluk: DIFFICULTY_LABELS[input.difficulty],
    kisi: {
      hedefler: input.answers.goals,
      uyanma: input.answers.wakeTime,
      uyuma: input.answers.sleepTime,
      gunlukBosDakika: input.answers.freeMinutes,
      mevcutAliskanliklar: input.answers.habits,
      odakAlanlari: input.answers.focusAreas,
      ilgiAlanlari: input.answers.interests,
    },
    oncekiHafta: input.previousWeek,
    oncekiTemalar: input.previousThemes,
  };

  return `Aşağıdaki kişi için ${input.days.length} günlük görev planını JSON olarak üret.

- "days" dizisinde tam olarak şu günler olsun: ${input.days.join(', ')}.
- Her günde tam ${MAIN_COUNT[input.difficulty]} ana görev ve ${SIDE_COUNT[input.difficulty]} yan görev olsun.
- Bir Boss görevi üret ("boss" alanı, ${bossDayOfWeek(input.weekNumber)}. günde çıkacak).
- Kişi yan görevini değiştirmek isterse diye "spareSide" alanında ${SPARE_SIDE_COUNT} yedek yan görev üret.

Bağlam:
${JSON.stringify(context, null, 1)}`;
}
