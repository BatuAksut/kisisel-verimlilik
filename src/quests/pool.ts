import type { Area, QuestBlueprint, QuestType, Stats } from '../domain/types';

export interface PoolQuest extends QuestBlueprint {
  /** 1 kolay, 3 zor. Evre ilerledikçe daha yüksek kademeler devreye girer. */
  tier: 1 | 2 | 3;
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
): PoolQuest {
  const xp = Object.values(stats).reduce((sum, value) => sum + (value ?? 0), 0);
  return { id: `pool-${type}-${++counter}`, type, area, tier, title, description, stats, xp, estimatedMinutes };
}

const main = (area: Area, tier: PoolQuest['tier'], title: string, description: string, stats: Stats, minutes: number) =>
  quest('main', area, tier, title, description, stats, minutes);
const side = (area: Area, title: string, description: string, stats: Stats, minutes: number) =>
  quest('side', area, 1, title, description, stats, minutes);
const boss = (area: Area, title: string, description: string, stats: Stats, minutes: number) =>
  quest('boss', area, 3, title, description, stats, minutes);

export const POOL: PoolQuest[] = [
  // Uyku
  main('uyku', 1, 'Yatış alarmı kur', 'Yatma saatinden 30 dakika önce çalacak bir alarm kur. Çaldığında uykuya hazırlanmaya başla.', { disiplin: 10, saglik: 5 }, 5),
  main('uyku', 1, 'Ertelemeden kalk', 'Bu sabah alarm çaldığı an yataktan çık. Erteleme tuşuna hiç basma.', { disiplin: 15, saglik: 5 }, 2),
  main('uyku', 2, 'Yatmadan 30 dakika ekransız', 'Yatmadan önceki 30 dakikayı ekransız geçir: kitap, esneme ya da sakin müzik.', { disiplin: 10, saglik: 10 }, 30),
  main('uyku', 2, 'Yatak odasını hazırla', 'Yatmadan önce odayı 5 dakika havalandır, ışığı kıs ve yarın giyeceklerini hazırla.', { disiplin: 5, saglik: 15 }, 10),
  main('uyku', 3, 'Planlanan saatte yatakta ol', 'Belirlediğin uyku saatinden 15 dakika önce yatakta, telefon elinden uzakta ol.', { disiplin: 15, saglik: 15 }, 15),
  main('uyku', 3, '60 dakikalık sakin akşam', 'Yatmadan önceki 60 dakika boyunca ekrana bakma ve kafein alma.', { disiplin: 15, saglik: 15 }, 60),

  // Su
  main('su', 1, 'Güne suyla başla', 'Uyandıktan sonraki ilk 10 dakika içinde bir bardak su iç.', { saglik: 10, disiplin: 5 }, 2),
  main('su', 1, 'Masana su şişesi koy', 'Çalıştığın yere dolu bir şişe su koy ve öğleden önce bitir.', { saglik: 15 }, 3),
  main('su', 2, 'Günde 6 bardak', 'Gün içinde 6 bardak su iç. Her birinde kağıda bir çizgi çekerek say.', { saglik: 15, disiplin: 5 }, 5),
  main('su', 2, 'Her öğünde bir bardak', 'Bugünkü her öğünden önce bir bardak su iç.', { saglik: 15, disiplin: 5 }, 3),
  main('su', 3, 'Günde 8 bardak', 'Gün içinde 8 bardak suyu saat başı küçük yudumlara bölerek bitir.', { saglik: 20, disiplin: 5 }, 5),
  main('su', 3, 'Şekerli içecek yerine su', 'Bugün gazlı ve şekerli içecek yerine yalnızca su ya da şekersiz çay iç.', { saglik: 15, disiplin: 10 }, 2),

  // Hareket
  main('hareket', 1, '10 dakika yürü', 'Telefon elinde olmadan, dışarıda ya da evin içinde 10 dakika yürü.', { guc: 10, saglik: 10 }, 10),
  main('hareket', 1, '5 dakika esne', 'Boyun, omuz, sırt ve bacaklarını sırayla esnet. Her bölgeye 1 dakika ayır.', { guc: 5, saglik: 10 }, 5),
  main('hareket', 2, '20 dakika tempolu yürüyüş', 'Konuşmanın biraz zorlaştığı bir tempoda 20 dakika yürü.', { guc: 15, saglik: 10 }, 20),
  main('hareket', 2, '3 turluk vücut ağırlığı seti', 'Üç tur: 10 çömelme, 8 şınav (dizler yerde olabilir), 20 saniye plank.', { guc: 20, disiplin: 5 }, 15),
  main('hareket', 3, '30 dakika kardiyo', 'Yürüyüş, bisiklet veya koşudan birini seç ve kendi temponda 30 dakika sürdür.', { guc: 20, saglik: 10 }, 30),
  main('hareket', 3, '5 turluk vücut ağırlığı seti', 'Beş tur: 12 çömelme, 10 şınav (dizler yerde olabilir), 30 saniye plank.', { guc: 25, disiplin: 5 }, 25),

  // Zihin
  main('zihin', 1, '3 dakika nefes', 'Sayaç kur: 4 saniye nefes al, 6 saniye ver. 3 dakika boyunca yalnızca buna odaklan.', { zihin: 10, saglik: 5 }, 3),
  main('zihin', 1, 'Günün 3 önceliği', 'Güne başlarken bugünkü en önemli 3 işi kağıda yaz.', { zihin: 10, disiplin: 5 }, 5),
  main('zihin', 2, '10 dakika sessiz oturuş', 'Sessiz bir yerde 10 dakika otur. Dikkatin dağılınca nefesine dön.', { zihin: 20 }, 10),
  main('zihin', 2, '25 dakika tek iş', 'Sayaç kur, telefonu görüş alanından çıkar ve 25 dakika yalnızca tek bir işle uğraş.', { zihin: 15, disiplin: 10 }, 25),
  main('zihin', 3, 'İki odak bloğu', '5 dakika araya sahip, 25’er dakikalık iki kesintisiz çalışma bloğu tamamla.', { zihin: 20, disiplin: 10 }, 55),
  main('zihin', 3, '15 dakika günlük', '15 dakika boyunca kalemi bırakmadan yaz: Bugün neyi fark ettin, yarın neyi farklı yaparsın?', { zihin: 20, disiplin: 5 }, 15),

  // Ekran
  main('ekran', 1, 'Telefonsuz yemek', 'Bugünkü bir öğün boyunca telefonu başka bir odada bırak.', { disiplin: 10, sosyal: 5 }, 20),
  main('ekran', 1, 'Üç bildirimi kapat', 'Dikkatini en çok dağıtan 3 uygulamanın bildirimlerini ayarlardan kapat.', { disiplin: 10, zihin: 5 }, 5),
  main('ekran', 2, '21:00’den sonra başka odada', 'Saat 21:00’de telefonu başka bir odaya koy ve sabaha kadar yatak odasına getirme.', { disiplin: 20, saglik: 5 }, 5),
  main('ekran', 2, 'Telefonsuz ilk 30 dakika', 'Uyandıktan sonraki ilk 30 dakika telefona dokunma.', { disiplin: 15, zihin: 5 }, 30),
  main('ekran', 3, 'Sosyal medyaya 30 dakika', 'Uygulama süre sınırı kur ve bugün sosyal medyada toplam 30 dakikayı geçme.', { disiplin: 20, zihin: 5 }, 5),
  main('ekran', 3, '2 saat telefonsuz blok', 'Gün içinde 2 saat boyunca telefonu kapat ya da uçak moduna al.', { disiplin: 25, zihin: 5 }, 120),

  // Beslenme
  main('beslenme', 1, 'Bir porsiyon sebze ekle', 'Bugünkü öğle ya da akşam yemeğine bir porsiyon sebze veya salata ekle.', { saglik: 15 }, 10),
  main('beslenme', 1, 'Masada otur, sakin ye', 'Bir öğünü oturarak, ekransız ve acele etmeden ye.', { saglik: 10, disiplin: 5 }, 20),
  main('beslenme', 2, 'Yarının öğününü planla', 'Yarın ne yiyeceğine bugünden karar ver ve malzemeleri kontrol et.', { disiplin: 10, saglik: 10 }, 10),
  main('beslenme', 2, 'Meyve veya kuruyemiş hazırla', 'Gün içinde kolayca ulaşacağın bir yere meyve ya da bir avuç kuruyemiş koy.', { saglik: 15, disiplin: 5 }, 5),
  main('beslenme', 3, 'Evde bir öğün pişir', 'Hazır gıda kullanmadan, kendin için evde bir öğün pişir.', { saglik: 15, disiplin: 10 }, 40),
  main('beslenme', 3, 'Haftalık alışveriş listesi', 'Gelecek haftanın ana öğünlerini kabaca planla ve alışveriş listesini çıkar.', { disiplin: 15, saglik: 10 }, 20),

  // Sosyal
  main('sosyal', 1, 'Bir teşekkür mesajı', 'Sana yakın zamanda yardımı dokunan birine neden teşekkür ettiğini yazarak mesaj at.', { sosyal: 15 }, 5),
  main('sosyal', 1, 'Birinin halini sor', 'Uzun süredir konuşmadığın birine “nasılsın?” diye yaz ve cevabını oku.', { sosyal: 15 }, 5),
  main('sosyal', 2, '10 dakikalık telefon görüşmesi', 'Mesaj yerine sevdiğin birini ara ve en az 10 dakika konuş.', { sosyal: 20 }, 10),
  main('sosyal', 2, 'Somut bir iltifat', 'Birine yüz yüze, ne yaptığını açıkça söyleyerek bir iltifat et.', { sosyal: 15, zihin: 5 }, 5),
  main('sosyal', 3, 'Bir buluşma ayarla', 'Bu hafta için birisiyle gün ve saat belirleyerek yüz yüze bir buluşma ayarla.', { sosyal: 20, disiplin: 5 }, 10),
  main('sosyal', 3, 'Ekransız 30 dakika', 'Ailenden ya da arkadaşlarından biriyle 30 dakikayı telefonsuz geçir.', { sosyal: 25, disiplin: 5 }, 30),

  // Öğrenme
  main('ogrenme', 1, '5 sayfa oku', 'Seçtiğin bir kitaptan 5 sayfa oku.', { zihin: 15 }, 10),
  main('ogrenme', 1, 'Tek cümleyle öğren', 'Merak ettiğin bir kavramı araştır ve kendi cümlenle tek satırda yaz.', { zihin: 15 }, 10),
  main('ogrenme', 2, '15 dakika pratik', 'Geliştirmek istediğin bir dil ya da beceriye 15 dakika çalış.', { zihin: 15, disiplin: 5 }, 15),
  main('ogrenme', 2, '15 sayfa oku', 'Seçtiğin kitaptan 15 sayfa oku ve akılda kalan tek fikri not et.', { zihin: 20 }, 25),
  main('ogrenme', 3, '30 dakika ders', 'Bir kursun ya da eğitim videosunun 30 dakikasını not alarak izle.', { zihin: 20, disiplin: 5 }, 30),
  main('ogrenme', 3, 'Öğrendiğini anlat', 'Bu hafta öğrendiğin bir şeyi birine anlat veya 5 cümleyle yazıya dök.', { zihin: 20, sosyal: 5 }, 15),

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
  side('ekran', 'Galeri avı', 'Galerinden gereksiz 30 fotoğrafı sil.', { disiplin: 15, zihin: 5 }, 10),
  side('ekran', 'Kağıda dönüş', 'Bugün telefona yazacağın bir listeyi kağıda yaz.', { disiplin: 10, zihin: 10 }, 5),
  side('beslenme', 'Yeni bir tat', 'Daha önce denemediğin bir meyve, sebze veya baharatı dene.', { saglik: 15, zihin: 5 }, 15),
  side('beslenme', 'Sürpriz sofra', 'Sofrayı özenle kur: peçete, su, küçük bir detay. Sıradan bir öğünü özel yap.', { sosyal: 10, saglik: 10 }, 15),
  side('uyku', 'Yastık sıfırlama', 'Çarşafını ya da yastık kılıfını değiştir.', { saglik: 15, disiplin: 5 }, 10),
  side('uyku', 'Beş dakikalık çekmece', 'Yatağının yanındaki çekmeceyi ya da komodini 5 dakikada toparla.', { disiplin: 15, saglik: 5 }, 5),
  side('su', 'Su şişesine isim ver', 'Su şişene bir isim ver, üzerine bir etiket yapıştır ve gün boyu yanında taşı.', { saglik: 15, zihin: 5 }, 5),
  side('su', 'Limon nane deneyi', 'Bir sürahi suya limon ve nane ekle, gün boyu bundan iç.', { saglik: 20 }, 5),

  // Boss görevleri
  boss('ekran', 'Ekransız Akşam', 'Bu akşam 19:00’dan yatana kadar telefona, televizyona ve bilgisayara dokunma.', { disiplin: 50, zihin: 30 }, 180),
  boss('hareket', 'Uzun Yürüyüş', 'Telefonu cepte tutarak, kendi temponda 60 dakika dışarıda yürü.', { guc: 50, saglik: 30 }, 60),
  boss('zihin', 'Derin Çalışma', 'Ertelediğin önemli bir iş için telefonsuz, kesintisiz 90 dakikalık bir blok tamamla.', { zihin: 60, disiplin: 40 }, 90),
  boss('sosyal', 'Bir Saatlik Buluşma', 'Sevdiğin biriyle yüz yüze görüş ve 1 saat boyunca telefona bakma.', { sosyal: 70, disiplin: 20 }, 60),
  boss('beslenme', 'Şefin Sofrası', 'Sevdiğin birine ya da kendine baştan sona bir öğün pişir ve sofraya özenle koy.', { saglik: 50, sosyal: 40 }, 75),
  boss('ogrenme', 'Küçük Ders', 'Bir konuyu 45 dakika çalış, sonra birine 5 dakikada anlat ya da kısa bir özet yaz.', { zihin: 70, sosyal: 20 }, 60),
  boss('uyku', 'Uyku Kalesi', 'Odanı 30 dakikada toparla, havalandır ve bu gece planlanan saatten 30 dakika önce yat.', { saglik: 60, disiplin: 30 }, 45),
  boss('ekran', 'Dijital Bahar Temizliği', '60 dakikada dosyalarını düzenle, gereksiz abonelikleri bırak ve kullanmadığın uygulamaları sil.', { disiplin: 60, zihin: 30 }, 60),
  boss('zihin', 'Haftayı Tasarla', '45 dakikada geçen haftayı değerlendir ve gelecek haftanın üç hedefini takvimine işle.', { zihin: 50, disiplin: 40 }, 45),
  boss('hareket', 'Kişisel Rekor', '45 dakikalık bir antrenman yap ve bir hareketin tekrar sayısında kendi rekorunu dene. Ağrı olursa dur.', { guc: 70, disiplin: 30 }, 45),
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
