import type { Area, QuestBlueprint, QuestType, Stats } from '../domain/types';

export interface PoolQuest extends QuestBlueprint {
  /** 1 kolay, 3 zor. Evre ilerledikçe daha yüksek kademeler devreye girer. */
  tier: 1 | 2 | 3;
  /** Her gün aynı biçimde tekrarlanabilir, çekirdek alışkanlık olarak seçilebilir. */
  repeatable: boolean;
}

let counter = 0;

function quest(
  type: QuestType,
  area: Area,
  tier: PoolQuest['tier'],
  title: string,
  description: string,
  stats: Stats,
  estimatedMinutes: number,
  why?: string,
  repeatable = false,
): PoolQuest {
  const xp = Object.values(stats).reduce((sum, value) => sum + (value ?? 0), 0);
  return { id: `pool-${type}-${++counter}`, type, area, tier, repeatable, title, description, stats, xp, estimatedMinutes, why };
}

// Ana görevler tek seferlik ayar değil, etkisi araştırılmış davranışlardır. `why` etkiyi ve kanıtın gücünü söyler.
const main = (area: Area, tier: PoolQuest['tier'], title: string, description: string, stats: Stats, minutes: number, why: string) =>
  quest('main', area, tier, title, description, stats, minutes, why);
const habit = (area: Area, tier: PoolQuest['tier'], title: string, description: string, stats: Stats, minutes: number, why: string) =>
  quest('main', area, tier, title, description, stats, minutes, why, true);
const side = (area: Area, title: string, description: string, stats: Stats, minutes: number) =>
  quest('side', area, 1, title, description, stats, minutes);
const boss = (area: Area, title: string, description: string, stats: Stats, minutes: number, why: string) =>
  quest('boss', area, 3, title, description, stats, minutes, why);

export const POOL: PoolQuest[] = [
  // Uyku
  habit('uyku', 1, 'Sabit kalkış saati', 'Hedef kalkış saatinden en fazla 30 dakika sapmadan kalk. Hafta sonu da aynı saat geçerli.', { disiplin: 15, saglik: 10 }, 2, 'Büyük bir kohortta uyku düzeni, ölüm riskini uyku süresinden daha güçlü öngördü (Windred 2024). Gözlemsel bir bulgu, ama düzen en ucuz müdahale.'),
  main('uyku', 1, 'Yatmadan yapılacaklar listesi', 'Yatakta 5 dakika boyunca yarın yapman gereken her şeyi kağıda, olabildiğince ayrıntılı yaz.', { zihin: 10, saglik: 10 }, 5, 'Bir uyku laboratuvarı deneyinde 5 dakikalık yapılacaklar listesi, tamamlananları yazmaya göre uykuya geçişi yaklaşık 9 dakika kısalttı (Scullin 2018).'),
  habit('uyku', 2, 'Kafein için son saat 14:00', 'Saat 14:00’ten sonra kahve, çay, kola ve enerji içeceği içme. Son kafein saatini not et.', { disiplin: 15, saglik: 10 }, 1, 'Yatmadan 6 saat önce alınan kafein bile uykuyu ölçülebilir biçimde kısalttı (Drake 2013).'),
  main('uyku', 2, 'Uyku günlüğü', 'Sabah şunları yaz: kaçta yattın, tahminen kaçta uyudun, kaçta kalktın, dinçliğin 1-5 arası kaç?', { disiplin: 10, saglik: 15 }, 3, 'Uyku günlüğü, kronik uykusuzlukta ilk önerilen bilişsel davranışçı yaklaşımın temel aracıdır (Qaseem 2016). Ölçmeden düzeltmek zordur.'),
  habit('uyku', 3, 'Loş ışıklı kapanış', 'Uyku saatinden 45 dakika önce ekranları kapat, ışıkları kıs ve her gece aynı üç adımı aynı sırayla uygula.', { disiplin: 15, saglik: 15 }, 45, 'Yatmadan önceki normal oda ışığı bile melatonin başlangıcını geciktirdi (Gooley 2011). Sabit sıra, davranışı bağlama bağlar.'),
  main('uyku', 3, 'Yatak yalnızca uyku için', 'Bu gece yatakta telefon ve dizi yok. Uykun 20 dakikada gelmezse kalk, loş ışıkta sakin bir şey yap, uykun gelince dön.', { disiplin: 20, saglik: 10 }, 10, 'Yatağı yeniden uykuyla eşleştirmek (uyaran kontrolü), uykusuzlukta önerilen yaklaşımın bileşenidir (Qaseem 2016).'),

  // Su
  habit('su', 1, 'Şekerli içecek yerine su', 'Bugün gazlı, şekerli ve meyve aromalı içecek içme. Canın çektiğinde önce su iç.', { saglik: 15, disiplin: 10 }, 2, 'Şekerli içecek tüketimi tip 2 diyabet riskiyle güçlü biçimde ilişkili (Malik 2010). Su konusundaki en kanıtlı değişiklik budur.'),
  main('su', 1, 'İdrar rengine bak', 'Gün içinde iki kez idrar rengine bak. Koyu sarıysa bir bardak su iç, açık renkse yeterlisin.', { saglik: 15 }, 2, '“Günde 8 bardak” kuralının sağlam bir kanıtı yok (Valtin 2002). Sabit sayı yerine kendi vücudunun sinyalini kullanırsın.'),
  main('su', 2, 'Bir günlük içecek dökümü', 'Bugün içtiğin her şeyi miktarıyla yaz. Akşam şekerli olanları ve kafeinli olanları say.', { disiplin: 15, saglik: 10 }, 5, 'Kendini izleme, davranış değiştirme tekniklerinin en etkililerinden biri (Michie 2009).'),
  main('su', 3, 'İçecek ortamını değiştir', 'Şekerli içecekleri göz önünden kaldır, en kolay ulaşılan yere suyu koy. Evde ve çantada uygula.', { disiplin: 15, saglik: 15 }, 15, 'Bir hastane kafeteryasında suyu göz hizasına almak, irade gerektirmeden seçimleri değiştirdi (Thorndike 2012).'),

  // Hareket
  habit('hareket', 1, 'Yemekten sonra 10 dakika yürü', 'Günün en büyük öğününden sonraki 30 dakika içinde 10 dakika yürü.', { guc: 10, saglik: 15 }, 10, 'Uzun oturmayı hafif yürüyüşle bölmek, yemek sonrası kan şekerini ayakta durmaktan daha çok düşürdü (Buffey 2022).'),
  main('hareket', 1, 'Üç hareket molası', 'Gün içinde üç kez, aralarında en az bir saat olacak şekilde 1 dakika hızlı merdiven çık ya da çömelme yap.', { guc: 15, saglik: 10 }, 5, 'Gün içine yayılan kısa merdiven çıkışları 6 haftada kondisyonu artırdı (Jenkins 2019). Spor salonu gerekmez.'),
  habit('hareket', 2, '25 dakika tempolu yürüyüş', 'Konuşabileceğin ama şarkı söyleyemeyeceğin bir tempoda 25 dakika yürü.', { guc: 15, saglik: 15 }, 25, 'DSÖ haftada 150-300 dakika orta yoğunluklu hareket öneriyor (Bull 2020). Bu görevi altı gün yapmak alt sınırı karşılar.'),
  main('hareket', 2, 'Kuvvet devresi', 'Üç tur: 10 çömelme, 8 şınav (dizler yerde olabilir), 30 saniye plank. Tekrarları yaz, geçen seferi geçmeye çalış.', { guc: 20, disiplin: 5 }, 15, 'Haftada 30-60 dakika kuvvet çalışması, daha düşük ölüm ve kronik hastalık riskiyle ilişkili (Momma 2022). DSÖ haftada 2 gün öneriyor.'),
  habit('hareket', 3, '30 dakika kuvvet', 'Büyük kas gruplarına 4-5 hareket seç. Son tekrarları zorlayacak yükle çalış ve yük ile tekrarları not et. Ağrı olursa dur.', { guc: 20, disiplin: 10 }, 30, 'DSÖ haftada en az 2 gün kuvvet öneriyor (Bull 2020). Kayıt tutmak yükü kademeli artırmanın ön koşulu.'),
  main('hareket', 3, 'Aralıklı tempo', '5 dakika ısın, sonra 4 kez 3 dakika hızlı, 3 dakika yavaş yürü ya da koş. Baş dönmesi ya da göğüs ağrısı olursa dur.', { guc: 20, saglik: 10 }, 30, 'Yüksek yoğunluklu aralıklar, kardiyometabolik sorunu olanlarda bile kondisyonu sürekli tempoya göre yaklaşık iki kat artırdı (Weston 2014).'),

  // Zihin
  habit('zihin', 1, 'Eğer-o zaman planı', 'Bugünün en önemli işi için tek cümle yaz: “Saat ... olunca, ... yerinde, ... yapacağım.”', { zihin: 15, disiplin: 10 }, 3, 'Sadece hedef koymaya göre zaman ve yer belirtmek, yaklaşık 100 çalışmada hedefe ulaşmayı orta-yüksek düzeyde artırdı (Gollwitzer 2006).'),
  main('zihin', 1, 'Ertelediğin işe 10 dakika', 'Ertelediğin bir işi seç, sayaç kur ve 10 dakika yalnızca onun ilk adımıyla uğraş. Süre dolunca bırakabilirsin.', { zihin: 10, disiplin: 15 }, 10, 'Ertelemeyi en çok görevin itici görünmesi ve ödülün uzak olması besliyor (Steel 2007). Küçük bir başlangıç ikisini de azaltır.'),
  main('zihin', 1, '5 dakika yavaş nefes', 'Sayaçla 5 saniye al, 5 saniye ver. Dakikada 6 nefes hızında 5 dakika sürdür.', { zihin: 10, saglik: 10 }, 5, 'Dakikada 10 nefesin altı, kalp atım değişkenliğini artırıyor ve rahatlama bildiriliyor (Zaccaro 2018). Çalışmalar küçük, etkisi kısa süreli.'),
  habit('zihin', 2, '25 dakika derin çalışma', 'Tek bir iş seç, sayacı kur, telefonu başka odaya koy. Bitince ne ilerlediğini tek cümleyle yaz.', { zihin: 15, disiplin: 15 }, 25, 'İşten işe geçince dikkatin bir kısmı öncekinde kalıyor, buna dikkat kalıntısı deniyor (Leroy 2009). Tek iş bu maliyeti ortadan kaldırır.'),
  main('zihin', 2, '10 dakika farkındalık', 'Otur, nefesine odaklan. Aklın dağıldığını fark edince yargılamadan geri dön. Bu dönüş asıl alıştırmadır.', { zihin: 20, saglik: 5 }, 10, 'Meta-analizde farkındalık programları kaygı ve depresif belirtilerde, orta güçte kanıtla küçük-orta iyileşme gösterdi (Goyal 2014).'),
  main('zihin', 2, '15 dakika duygu yazımı', 'Seni zorlayan bir konu hakkında, kimse okumayacakmış gibi 15 dakika yaz. Çok sarsarsa bırak.', { zihin: 20, saglik: 5 }, 15, 'Duyguları yazıya dökmenin küçük ama tekrarlanan olumlu etkisi var (Frattaroli 2006). Etki büyük değil, maliyeti de çok düşük.'),
  main('zihin', 3, 'WOOP ile engel planı', 'Bu haftaki bir dileğini, en iyi sonucu, önündeki gerçek iç engeli ve “Engel çıkarsa şunu yapacağım” planını yaz.', { zihin: 20, disiplin: 10 }, 15, 'İstenen sonucu gerçek engelle karşılaştırıp plana bağlamak, yalnızca olumlu hayal kurmaktan daha iyi sonuç verdi (Oettingen 2012).'),
  habit('zihin', 3, '50 dakika derin çalışma', 'En önemli işinde telefon başka odada, sekmeler kapalı 50 dakika çalış. Başlamadan hedefi, bitince sonucu yaz.', { zihin: 20, disiplin: 10 }, 50, 'Dikkat kalıntısı bölünmeyle birikir (Leroy 2009). Hedef ve sonucu yazmak süreyi ölçülebilir ilerlemeye çevirir.'),

  // Ekran
  main('ekran', 1, 'Ekran süresini kayda geç', 'Telefon ayarlarından dünkü süreni ve en çok kullandığın 3 uygulamayı yaz. Hedefini de yanına yaz.', { disiplin: 15, zihin: 5 }, 5, 'Kendini izleme ve hedef koymak birlikte kullanılınca davranış değişikliği belirgin biçimde güçleniyor (Michie 2009).'),
  habit('ekran', 1, 'Telefon başka odada çalış', 'Bugün en az 30 dakikalık bir işi telefon başka odadayken yap.', { disiplin: 15, zihin: 10 }, 30, 'Telefonun yalnızca masada durması bile bazı deneylerde bilişsel performansı düşürdü (Ward 2017). Sonraki tekrarlar karışık, ama denemesi ucuz.'),
  habit('ekran', 2, 'Sosyal medyaya günde 30 dakika', 'Uygulama süre sınırını toplam 30 dakikaya kur ve sınırı aşmadan günü bitir.', { disiplin: 20, zihin: 5 }, 2, 'Rastgele deneyde 3 hafta günde 30 dakikayla sınırlamak yalnızlık ve depresif belirtileri azalttı (Hunt 2018).'),
  main('ekran', 2, 'Telefon yatak odası dışında', 'Telefonu gece yatak odası dışında şarj et. Gerekirse ayrı bir çalar saat kullan.', { disiplin: 20, saglik: 10 }, 3, 'Telefon yataktan uzaktayken gece son kontrol ve ilk sabah kontrolü zorlaşır. Akşam ışığı da melatonini geciktirir (Gooley 2011).'),
  main('ekran', 3, 'Bir gün sosyal medyasız', 'Bugün hiçbir sosyal medya uygulamasını açma. Akşam kazandığın süreyi ve nasıl hissettiğini yaz.', { disiplin: 25, zihin: 5 }, 2, 'Büyük bir rastgele deneyde 4 hafta Facebook’u bırakanların iyi oluşu küçük ama anlamlı biçimde arttı (Allcott 2020).'),
  habit('ekran', 3, 'İki saatlik telefonsuz blok', 'Gün içinde kesintisiz 2 saat telefonu kapat ya da uçak moduna al. Blokta ne yaptığını not et.', { disiplin: 25, zihin: 5 }, 5, 'Uzun blok, sürekli kontrol alışkanlığının dürtüsünü kırmaya zorlar ve telefon yakınındayken oluşan dikkat maliyetini kaldırır (Ward 2017).'),

  // Beslenme
  habit('beslenme', 1, 'Bir öğüne sebze ekle', 'Bugün öğle ya da akşam yemeğinde tabağının yarısını sebze ya da salata yap.', { saglik: 20 }, 10, 'Meta-analize göre meyve ve sebze arttıkça kalp-damar hastalığı ve ölüm riski azalıyor (Aune 2017).'),
  main('beslenme', 1, 'Yavaş ye', 'Bir öğünü ekransız, lokmalar arasında çatalı bırakarak en az 20 dakikada ye.', { saglik: 15, disiplin: 10 }, 20, 'Meta-analizde daha yavaş yiyenler daha az yedi (Robinson 2014). Doyma sinyaline zaman tanır, kısıtlama gerektirmez.'),
  habit('beslenme', 2, 'Günde 5 porsiyon say', 'Bugün 2 porsiyon meyve ve 3 porsiyon sebze ye. Her birini kağıda işaretle.', { saglik: 20, disiplin: 5 }, 10, 'İki büyük kohortta ölüm riskindeki düşüş günde yaklaşık 5 porsiyonda (2 meyve, 3 sebze) doygunluğa ulaştı (Wang 2021).'),
  main('beslenme', 2, 'Baklagil ya da tam tahıl', 'Bugün bir öğüne mercimek, nohut, fasulye ya da tam tahıl ekle.', { saglik: 20 }, 15, 'Lif tüketimi arttıkça kalp hastalığı, tip 2 diyabet ve bağırsak kanseri riski azalıyor (Reynolds 2019).'),
  main('beslenme', 2, 'Atıştırmalığı değiştir', 'Bugünkü paketli atıştırmalık yerine meyve, yoğurt ya da kuruyemiş ye. Önceden hazırla.', { saglik: 15, disiplin: 10 }, 5, 'Kontrollü deneyde aşırı işlenmiş beslenmede katılımcılar kendiliğinden belirgin biçimde daha fazla yedi (Hall 2019).'),
  main('beslenme', 3, 'Evde sebzeli bir öğün pişir', 'Hazır gıda kullanmadan, içinde sebze olan bir öğün pişir.', { saglik: 15, disiplin: 10 }, 40, 'Evde sık yemek yapanların beslenme kalitesi daha yüksek bulundu (Wolfson 2015). Gözlemsel bir bulgu.'),
  main('beslenme', 3, 'Üç günlük öğün planı', 'Önümüzdeki 3 günün ana öğünlerini yaz ve eksik malzemeleri listele.', { disiplin: 15, saglik: 10 }, 20, 'Öğün planlayanlarda çeşitlilik ve beslenme kalitesi daha yüksek bulundu (Ducrot 2017). Gözlemsel bir bulgu.'),

  // Sosyal
  main('sosyal', 1, 'Minnet mesajı', 'Hayatında fark yaratan birine neyi, neden takdir ettiğini somut olarak yaz ve gönder.', { sosyal: 20, zihin: 5 }, 10, 'Deneylerde insanlar teşekkür mesajının karşıdakini ne kadar mutlu edeceğini hep düşük tahmin etti (Kumar 2018).'),
  main('sosyal', 1, 'Uzaklaştığın birine yaz', 'Uzun süredir konuşmadığın birine, onu neden hatırladığını söyleyen kısa bir mesaj at.', { sosyal: 20 }, 5, 'Deneylerde insanlar, beklenmedik bir mesajın ne kadar takdir edileceğini düşük tahmin etti (Liu 2023).'),
  habit('sosyal', 1, 'Günün sesli görüşmesi', 'Mesaj yerine sevdiğin birini ara ve en az 5 dakika konuş.', { sosyal: 20 }, 5, 'Deneyde telefon görüşmesi mesajlaşmaya göre daha güçlü bağ kurdu ve beklenildiği kadar garip de gelmedi (Kumar 2021).'),
  main('sosyal', 2, 'Derin bir soru sor', 'Birine havadan sudan değil, gerçek bir soru sor: “Son zamanlarda seni en çok ne düşündürüyor?” ve dinle.', { sosyal: 20, zihin: 5 }, 15, 'Deneylerde derin sohbetler, beklenenden daha az garip ve daha bağ kurucu çıktı (Kardas 2022).'),
  habit('sosyal', 2, '30 dakika telefonsuz birlikte', 'Biriyle 30 dakikayı telefon masada değil, görünmeyen bir yerdeyken geçir.', { sosyal: 25, disiplin: 5 }, 30, 'Güçlü sosyal bağlar yaşam süresiyle sigarayı bırakmaya yakın büyüklükte ilişkili (Holt-Lunstad 2010). Telefon sohbetin niteliğini düşürebiliyor (Przybylski 2013).'),
  main('sosyal', 3, 'Yüz yüze buluşma ayarla', 'Biriyle gün, saat ve yer belirleyerek bu hafta için bir buluşma ayarla.', { sosyal: 25, disiplin: 5 }, 10, 'Yakın arkadaş olmak yaklaşık 200 saat birlikte geçirmeyi gerektiriyor (Hall 2019). Saatler ancak planlanınca birikir.'),
  main('sosyal', 3, 'Birine somut bir iyilik yap', 'Birinin işini kolaylaştıracak bir şey yap ya da küçük bir harcamayı onun için yap.', { sosyal: 25, zihin: 5 }, 20, 'Deneyde parayı başkası için harcayanlar, kendisi için harcayanlardan daha mutlu oldu (Dunn 2008).'),

  // Öğrenme
  habit('ogrenme', 1, 'Oku, kapat, hatırla', 'Çalıştığın bir konudan 5 sayfa oku, kapat ve hatırladığın her şeyi yaz. Sonra eksiklerine bak.', { zihin: 20, disiplin: 5 }, 15, 'Tekrar okumaya göre kendini sınamak, bir hafta sonra belirgin biçimde daha iyi hatırlama sağladı (Roediger 2006).'),
  main('ogrenme', 1, 'Okumadan önce sor', 'Yeni bir konuya başlamadan cevabını bilmediğin 3 soru yaz, tahmin et, sonra çalışıp cevapları bul.', { zihin: 20 }, 15, 'Yanlış bile olsa önceden tahmin etmek, sonraki öğrenmeyi güçlendirdi (Richland 2009).'),
  habit('ogrenme', 2, 'Aralıklı tekrar', 'Düne, üç gün öncesine ve geçen haftaya ait öğrendiklerinden 5’er soru çöz. Bilmediklerini kısa aralığa al.', { zihin: 20, disiplin: 5 }, 15, 'Yüzlerce deneyin analizinde aynı süreyi aralara yaymak, tek seferde çalışmaktan daha iyi kalıcılık sağladı (Cepeda 2006).'),
  main('ogrenme', 2, '20 dakika hedefli pratik', 'Becerinin en zayıf kısmını seç, tek bir ölçülebilir hedef koy, 20 dakika çalış ve sonucu kaydet.', { zihin: 20, disiplin: 5 }, 20, 'Hedefli pratik gelişimin önemli bir parçası (Ericsson 1993), ama tek belirleyici değil: etki alana göre değişiyor (Macnamara 2014).'),
  main('ogrenme', 3, 'Konuları karıştırarak çalış', 'Benzer 2-3 konudan ya da problem türünden soruları karışık sırayla, 30 dakika boyunca çöz.', { zihin: 25, disiplin: 5 }, 30, 'Benzer kavramları ayırt etmeyi öğretir. Etki özellikle görsel materyalde ve matematikte güçlü, her alanda aynı değil (Brunmair 2019).'),
  habit('ogrenme', 3, '30 dakika çalış, sonra anlat', 'Bir konuyu 30 dakika çalış, sonra birine ya da kameraya notlara bakmadan anlat.', { zihin: 25, sosyal: 5 }, 40, 'Gerçekten anlatmak, yalnızca anlatmaya hazırlanmaktan daha kalıcı öğrenme sağladı (Fiorella 2013).'),

  // Yan görevler
  side('hareket', 'Keşif rotası', 'Evinin çevresinde daha önce hiç girmediğin bir sokaktan geç.', { guc: 10, zihin: 10 }, 20),
  side('hareket', 'Tek şarkılık dans', 'En sevdiğin hareketli şarkıyı aç ve şarkı bitene kadar dans et.', { guc: 10, saglik: 10 }, 5),
  side('hareket', 'Merdiven görevi', 'Bugün karşına çıkan bütün merdivenleri asansörsüz çık.', { guc: 15, disiplin: 5 }, 10),
  side('zihin', 'Gökyüzü gözlemi', 'Pencereden ya da dışarıdan 5 dakika gökyüzüne bak ve gördüğün üç şeyi yaz.', { zihin: 15, saglik: 5 }, 5),
  side('zihin', 'Ters el meydan okuması', 'Dişlerini bugün diğer elinle fırçala.', { zihin: 20 }, 5),
  side('zihin', 'Geleceğe mektup', '66. günün sonundaki kendine üç cümlelik bir not yaz.', { zihin: 15, disiplin: 10 }, 10),
  side('zihin', 'Kağıt uçak rekoru', 'Bir kağıt uçak yap, üç kez uçur ve en uzak mesafeyi adımla ölç.', { zihin: 20 }, 10),
  side('ogrenme', 'Rastgele ansiklopedi', 'Vikipedi’de “Rastgele madde”ye tıkla, ilginç bulduğun bir bilgiyi not et.', { zihin: 20 }, 10),
  side('ogrenme', 'Tek çizgilik sanat', 'Kalemi kağıttan kaldırmadan masandaki bir nesneyi çiz.', { zihin: 20 }, 10),
  side('ogrenme', 'Üç kelimelik dil', 'Hiç bilmediğin bir dilde selam, teşekkür ve hoşça kal demeyi öğren.', { zihin: 15, sosyal: 5 }, 10),
  side('ogrenme', 'Mini şiir', 'Bugünü anlatan üç dizelik kısa bir şiir yaz.', { zihin: 20 }, 10),
  side('sosyal', 'Eski bir fotoğraf', 'Galerinden eski bir fotoğraf bul ve içindeki kişiye gönder.', { sosyal: 20 }, 5),
  side('sosyal', 'Şarkı armağanı', 'Birine “bunu dinlerken seni düşündüm” diyerek bir şarkı gönder.', { sosyal: 20 }, 5),
  side('sosyal', 'Komşu selamı', 'Normalde selamlaşmadığın bir komşuya ya da esnafa adını sorarak selam ver.', { sosyal: 25 }, 5),
  side('sosyal', 'Rozet dağıt', 'Bugün üç farklı kişiye içten bir teşekkür et.', { sosyal: 20, zihin: 5 }, 10),
  side('ekran', 'Ana ekran temizliği', 'Telefonunun ana ekranından kullanmadığın en az 5 uygulamayı kaldır veya taşı.', { disiplin: 15, zihin: 5 }, 10),
  side('ekran', 'Bildirim avı', 'Dikkatini en çok dağıtan 3 uygulamanın bildirimlerini kapat.', { disiplin: 15, zihin: 5 }, 5),
  side('ekran', 'Galeri avı', 'Galerinden gereksiz 30 fotoğrafı sil.', { disiplin: 15, zihin: 5 }, 10),
  side('ekran', 'Kağıda dönüş', 'Bugün telefona yazacağın bir listeyi kağıda yaz.', { disiplin: 10, zihin: 10 }, 5),
  side('beslenme', 'Yeni bir tat', 'Daha önce denemediğin bir meyve, sebze veya baharatı dene.', { saglik: 15, zihin: 5 }, 15),
  side('beslenme', 'Sürpriz sofra', 'Sofrayı özenle kur: peçete, su, küçük bir detay. Sıradan bir öğünü özel yap.', { sosyal: 10, saglik: 10 }, 15),
  side('uyku', 'Yastık sıfırlama', 'Çarşafını ya da yastık kılıfını değiştir.', { saglik: 15, disiplin: 5 }, 10),
  side('uyku', 'Beş dakikalık çekmece', 'Yatağının yanındaki çekmeceyi ya da komodini 5 dakikada toparla.', { disiplin: 15, saglik: 5 }, 5),
  side('su', 'Su şişesine isim ver', 'Su şişene bir isim ver, üzerine bir etiket yapıştır ve gün boyu yanında taşı.', { saglik: 15, zihin: 5 }, 5),
  side('su', 'Limon nane deneyi', 'Bir sürahi suya limon ve nane ekle, gün boyu bundan iç.', { saglik: 20 }, 5),

  // Boss görevleri
  boss('ekran', 'Ekransız Akşam', 'Bu akşam 19:00’dan yatana kadar telefona, televizyona ve bilgisayara dokunma. Akşamın nasıl geçtiğini yaz.', { disiplin: 50, zihin: 30 }, 180, 'Akşam ekranını bırakmak ışığı azaltır (Gooley 2011) ve sosyal medya süresini kısmak iyi oluşu artırabilir (Hunt 2018).'),
  boss('hareket', 'Uzun Yürüyüş', 'Telefonu cepte tutarak, konuşabileceğin ama şarkı söyleyemeyeceğin tempoda 60 dakika yürü.', { guc: 50, saglik: 30 }, 60, 'Tek seferde DSÖ’nün haftalık 150 dakikalık alt sınırının %40’ı (Bull 2020).'),
  boss('zihin', 'Derin Çalışma', 'Ertelediğin önemli bir iş için telefonsuz, kesintisiz 90 dakikalık bir blok tamamla. Hedefi önceden yaz.', { zihin: 60, disiplin: 40 }, 90, 'Zaman, yer ve hedefi önceden belirlemek başlamayı kolaylaştırır (Gollwitzer 2006), tek iş dikkat kalıntısını önler (Leroy 2009).'),
  boss('sosyal', 'Bir Saatlik Buluşma', 'Sevdiğin biriyle yüz yüze görüş, telefonu görünmeyen bir yere koy ve en az bir derin soru sor.', { sosyal: 70, disiplin: 20 }, 60, 'Güçlü bağlar yaşam süresiyle ilişkili (Holt-Lunstad 2010), derin sohbet beklenenden daha iyi hissettiriyor (Kardas 2022).'),
  boss('beslenme', 'Üç Günün Sofrası', 'Üç günlük öğün planı yap, alışverişini tamamla ve ilk öğünü sebzeli olarak pişir.', { saglik: 50, sosyal: 40 }, 75, 'Planlama çeşitliliği (Ducrot 2017), evde yemek beslenme kalitesini (Wolfson 2015) artırmakla ilişkili.'),
  boss('ogrenme', 'Küçük Ders', 'Bir konuyu 45 dakika çalış, sonra notlara bakmadan birine 5 dakikada anlat ve takıldığın yerleri yaz.', { zihin: 70, sosyal: 20 }, 60, 'Hatırlamak (Roediger 2006) ve gerçekten anlatmak (Fiorella 2013) en kalıcı çalışma yöntemlerindendir.'),
  boss('uyku', 'Uyku Kalesi', 'Yedi günlük uyku günlüğünü incele, en büyük sorunu bul, bir kural seç ve bu gece uygula.', { saglik: 60, disiplin: 30 }, 45, 'Günlük ve uyaran kontrolü, uykusuzlukta önerilen yaklaşımın temel parçalarıdır (Qaseem 2016).'),
  boss('ekran', 'Dikkat Denetimi', '60 dakikada ekran süreni uygulama uygulama incele, en çok zaman alan ikisine süre sınırı kur ve bir hafta için hedef yaz.', { disiplin: 60, zihin: 30 }, 60, 'Kendini izleme ve hedef birlikte daha güçlü (Michie 2009), süre sınırı rastgele deneyde iyi oluşu artırdı (Hunt 2018).'),
  boss('zihin', 'Haftayı Tasarla', 'Geçen haftayı değerlendir, gelecek haftanın üç hedefi için WOOP yaz ve hepsini takvimine eğer-o zaman planıyla işle.', { zihin: 50, disiplin: 40 }, 45, 'Engeli önceden görmek (Oettingen 2012) ve yerle zamanı belirlemek (Gollwitzer 2006) birbirini tamamlar.'),
  boss('hareket', 'Kişisel Rekor', '45 dakikalık bir antrenman yap ve bir hareketin tekrar sayısında geçen kaydını geçmeye çalış. Ağrı olursa dur.', { guc: 70, disiplin: 30 }, 45, 'Kuvvet çalışması sağlıkla güçlü biçimde ilişkili (Momma 2022). Kayda dayalı artış gelişimi görünür kılar.'),
];

export const POOL_THEMES = [
  'İlk Adımlar',
  'Ritmi Bul',
  'Temeli Sağlamlaştır',
  'Yükselişe Geçiş',
  'Sınırları Yokla',
  'Odak Kalesi',
  'Ustalığın Eşiği',
  'Derin Disiplin',
  'Zirve Hazırlığı',
  'Son Düzlük',
];
