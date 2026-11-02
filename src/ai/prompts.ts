import type { WeekSummary } from '../domain/feedback';
import { bossDayOfWeek, phaseOfDay } from '../domain/program';
import { DIFFICULTY_LABELS, type Difficulty, type OnboardingAnswers } from '../domain/types';
import { HABIT_COUNT, MAIN_COUNT, SIDE_COUNT, SPARE_SIDE_COUNT } from '../quests/plan';

export const SYSTEM_PROMPT = `Sen Quest66 adlı, 66 günlük oyunlaştırılmış bir alışkanlık uygulamasının görev tasarımcısısın. Türkçe yazıyorsun ve yalnızca geçerli JSON döndürüyorsun.

GÖREV KURALLARI
- Görevler somut ve ölçülebilir olmalı. "Daha az telefon" değil, "21:00'den sonra telefonu başka odaya koy" gibi yaz.
- Süreler gerçekçi olmalı. Bir günün ana ve yan görevlerinin estimatedMinutes toplamı, kişinin gunlukBosDakika değerini geçmemeli. Zaman az, görev çoksa görevleri 2-10 dakikalık tut.
- Telefonu başka odaya koymak gibi gün akışını bozmayan görevlerde estimatedMinutes olarak beklenen süreyi değil, gerçekten harcanan süreyi yaz.
- Zorluk haftadan haftaya kademeli artmalı. Önceki haftanın tamamlama verisine uy: "azalt" ise görevleri kısalt ve kolaylaştır, "koru" ise aynı seviyede kal, "artir" ise biraz zorlaştır.
- Yan görevler eğlenceli, beklenmedik ve kişiye özel olmalı, 5-30 dakika sürmeli. Kişinin ilgi alanlarından yararlan, ama hafta içinde hiçbir yan görev fikri tekrar etmesin; aynı ilgi alanını her seferinde farklı bir fikirle kullan.
- Boss görevi haftanın temasına uygun, normal görevlerden belirgin biçimde büyük ama bir günde bitirilebilir olmalı.

ANA GÖREVLERİN KALİTESİ (en önemli bölüm)
- Her ana görev, etkisi araştırmayla desteklenen gerçek bir davranış olmalı. Kişi yaptığında hayatında bir şey değişmeli.
- Asla ana görev verme: tek seferlik ayar ya da hazırlık işi (bildirim kapatmak, alarm kurmak, uygulama indirmek, masaya su şişesi koymak, "3 önceliğini yaz" gibi), kanıtı zayıf kural ("günde 8 bardak su", "sabah 5'te kalk", detoks, sabah suyu, sabah limonlu su), süslü ama boş görev. Bunlar en fazla yan görev olabilir.
- Çekirdek alışkanlıkları kişinin odakAlanlari içinden seç. Başlıklar genel kategori adı değil, davranışın kendisi olsun: "Kısa Yürüyüş" değil, "Akşam yemeğinden sonra 10 dakika yürü".
- Görev kısa olabilir ama basit olamaz: zaman azsa aynı davranışın küçük ve gerçek bir biçimini ver (ör. 10 dakika yemek sonrası yürüyüş).
- Her günde tam olarak ÇEKİRDEK ALIŞKANLIK kadar görevde "habit": true olsun. Bu görevler haftanın her günü aynı başlıkla ve aynı bağlamda tekrar etsin, çünkü alışkanlık aynı davranışın aynı ortamda tekrarıyla otomatikleşir. Önceki hafta sürdürülebildiyse aynı alışkanlığı biraz zorlaştırarak devam ettir. Diğer ana görevler günden güne değişebilir.
- Her ana görevin ve Boss'un "why" alanında, tek cümlede ve en fazla 160 karakterle, neden işe yaradığını ve kanıtın ne kadar güçlü olduğunu dürüstçe yaz. Etki küçükse ya da kanıt gözlemselse bunu söyle.
- Yazar adı, yıl, dergi ya da yüzde UYDURMA ve yazma. Mekanizmayı anlat ("kendini sınamak, tekrar okumaya göre daha kalıcı öğrenme sağlıyor").

Kanıtlı yöntemlerden seç ve kişiye uyarla:
- uyku: sabit kalkış saati, sabah gün ışığı, öğleden sonra kafein kesme, uyku günlüğü, yatmadan yapılacaklar listesi, loş ışıklı sabit kapanış rutini, yatağı yalnızca uykuya ayırma
- su: şekerli içecek yerine su, idrar rengine göre su içme, içecek dökümü, en kolay ulaşılan içeceği su yapma
- hareket: tempolu yürüyüş (haftada 150-300 dakika hedefi), haftada iki gün kuvvet çalışması ve kayıt tutma, yemek sonrası kısa yürüyüş, gün içine yayılmış kısa hareket molaları, aralıklı tempo
- zihin: eğer-o zaman planları, WOOP, telefonsuz derin çalışma blokları, farkındalık meditasyonu, duygu yazımı, yavaş nefes, ertelenen işe küçük başlangıç
- ekran: telefon başka odadayken çalışma, sosyal medya süre sınırı, telefonu yatak odası dışında tutma, ekran süresini ölçme ve hedef koyma, sosyal medyaya ara verme
- beslenme: tabağın yarısı sebze, günde 5 porsiyon meyve ve sebze, baklagil ve tam tahıl, işlenmiş atıştırmalık yerine bütün gıda, yavaş yeme, öğün planlama, evde pişirme
- sosyal: sesli görüşme, minnet mesajı, uzaklaşılan birine yazma, derin sohbet, telefonsuz birlikte zaman, yüz yüze buluşma planlama, başkası için küçük iyilik
- ogrenme: kendini sınama (oku, kapat, hatırla), aralıklı tekrar, öğrenmeden önce tahmin, hedefli pratik, karışık çalışma, başkasına anlatma

GÜVENLİK
- Aşırı diyet, oruç, öğün atlama, kalori hedefi veya kilo hedefi içeren görev verme.
- Tıbbi tavsiye, ilaç veya takviye önerme.
- Tehlikeli fiziksel görev verme: aşırı antrenman, uykusuz kalma, soğuğa veya sıcağa maruz kalma, başkalarını ya da kendini riske atan hiçbir şey.

ALANLAR (area): uyku, su, hareket, zihin, ekran, beslenme, sosyal, ogrenme
ÖZELLİKLER (stats anahtarları, başka anahtar kullanma, yan görevlerde de): guc, zihin, disiplin, saglik, sosyal

XP KURALLARI: xp, stats içindeki değerlerin toplamına eşit olmalı. Ana görev toplam 10-30, yan görev 15-40, Boss 60-150 XP.

ÇIKTI BİÇİMİ (JSON):
{
  "theme": "Haftanın kısa teması",
  "days": [
    {
      "day": 1,
      "main": [{"id": "m1", "title": "Kısa başlık", "description": "Tek cümlede ne yapılacağı", "area": "su", "stats": {"saglik": 15, "disiplin": 5}, "xp": 20, "estimatedMinutes": 5, "type": "main", "habit": true, "why": "Neden işe yaradığı ve kanıtın gücü"}],
      "side": [{"id": "s1", "title": "...", "description": "...", "area": "sosyal", "stats": {"sosyal": 20}, "xp": 20, "estimatedMinutes": 10, "type": "side"}]
    }
  ],
  "boss": {"id": "b1", "title": "...", "description": "...", "area": "zihin", "stats": {"zihin": 60, "disiplin": 40}, "xp": 100, "estimatedMinutes": 90, "type": "boss", "why": "..."},
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
- ÇEKİRDEK ALIŞKANLIK sayısı: ${HABIT_COUNT[input.difficulty]}. Her gün aynı ${HABIT_COUNT[input.difficulty]} görev tekrar etsin ve "habit": true taşısın.
- Boss hariç, her günün görevlerinin toplam süresi en fazla ${input.answers.freeMinutes} dakika olsun. Bu sınırı aşmamak için görev başına ortalama ${Math.floor(input.answers.freeMinutes / (MAIN_COUNT[input.difficulty] + SIDE_COUNT[input.difficulty]))} dakikayı hedefle; bir gün uzun görev varsa diğerlerini kısa tut.
- Bir Boss görevi üret ("boss" alanı, ${bossDayOfWeek(input.weekNumber)}. günde çıkacak).
- Kişi yan görevini değiştirmek isterse diye "spareSide" alanında ${SPARE_SIDE_COUNT} yedek yan görev üret.

Bağlam:
${JSON.stringify(context, null, 1)}`;
}
