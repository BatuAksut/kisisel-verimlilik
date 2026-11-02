# Quest66

66 günlük, oyunlaştırılmış alışkanlık ve kişisel gelişim uygulaması. Android telefona kurulabilen bir PWA'dır, sunucusu yoktur ve tüm veriler cihazda IndexedDB'de durur.

- **Program:** Temel (1-21. gün), Yükseliş (22-44), Ustalık (45-66). Görevler haftalık üretilir ve geçen haftanın verisine göre ayarlanır.
- **Görevler:** Günde 3-5 ana görev, 1-2 yan görev, her haftanın sonunda bir Boss.
- **Oyun:** XP, seviye, 5 özellik, seri, seri dondurucu ve Hard Mode cezası.
- **Yapay zekâ:** OpenAI uyumlu herhangi bir API. Çalışmazsa 82 görevlik hazır havuz devreye girer, uygulama hiç boş kalmaz.

## Kurulum

Node.js 22 veya üstü gerekir.

```bash
npm install
```

```bash
npm run dev
```

| Komut | Görevi |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tür denetimi ve üretim derlemesi (`dist/`) |
| `npm run preview` | Derlemeyi yerelde sunar. Service worker ve çevrimdışı çalışma burada denenir. |
| `npm test` | Birim testleri |
| `npm run test:e2e` | 390x844 ekranda Playwright testleri |
| `npm run icons` | PWA ikonlarını yeniden üretir |

Playwright'ı ilk kez çalıştırmadan önce tarayıcıyı kurun:

```bash
npx playwright install chromium
```

## DeepSeek API anahtarı

1. <https://platform.deepseek.com/api_keys> adresinde hesap açıp bir API anahtarı oluşturun. API kullanımı ücretlidir, hesaba bakiye yüklemeniz gerekebilir.
2. Uygulamada anahtarı anketin son adımına ya da **Ayarlar > Yapay zekâ** bölümüne yazın ve **Kaydet**'e basın.
3. **Bağlantıyı test et** düğmesine basın.

Hata alırsanız:

| Mesaj | Yapılacak |
|---|---|
| Sağlayıcı isteği reddetti, model adı güncel olmayabilir | **Model** alanına [DeepSeek belgelerindeki](https://api-docs.deepseek.com/) güncel adı yazın. Bkz. aşağıdaki not. |
| API anahtarı reddedildi | Anahtarı kontrol edin |
| Yeterli bakiye yok | Sağlayıcı hesabına bakiye yükleyin |
| Sunucuya ulaşılamadı, CORS engeli olabilir | [Proxy'yi](proxy/README.md) kurup adresini **Proxy URL** alanına yazın |

> **Model adı hakkında not:** Varsayılan model `deepseek-flash`'tir. 2026-11-02'deki denemede `deepseek-chat` ve `deepseek-v4-flash` adlarının da aynı modele gittiği görüldü. Fark şu: `deepseek-chat` düşünme adımı olmadan çalışıyor ve DeepSeek'in değişiklik günlüğüne göre kaldırılması planlanıyor.
>
> | Model (Hard Mode, 60 dk boş zaman, 1 hafta) | Süre | Token | Günlük toplam süre |
> |---|---|---|---|
> | `deepseek-flash` | 57 sn | 12.897 | 55-60 dk |
> | `deepseek-chat` | 19 sn | 5.501 | 64-139 dk |
>
> Düşünme adımı çıktıyı daha pahalı ve yavaş yapıyor ama süre kuralına çok daha iyi uyuyor. Üretim haftada yalnızca bir kez yapılır. Beklemek istemezseniz ekrandaki **Beklemeden başla** düğmesi o haftayı hazır havuzla başlatır.
>
> Aynı denemede DeepSeek, GitHub Pages kökeninden gelen isteklere CORS izni verdi. Bu nedenle proxy büyük olasılıkla gerekmez.

Başka bir OpenAI uyumlu sağlayıcıya geçmek için **Base URL**, **Model** ve **API anahtarı** alanlarını değiştirmeniz yeterlidir. İstekler `<Base URL>/chat/completions` adresine gider ve sağlayıcının `response_format: json_object` desteklemesi gerekir.

### Gizlilik

- API anahtarı cihazda şifresiz durur, koda ya da depoya girmez. JSON yedeğine yalnızca açıkça işaretlerseniz eklenir.
- Anket cevaplarınız, haftalık tamamlama verileriniz, ruh haliniz ve yansıtma notlarınız görev üretmek için seçtiğiniz sağlayıcıya gönderilir. Anahtar girmezseniz hiçbir veri cihazdan çıkmaz.

## Deploy

### GitHub Pages

Depoda `.github/workflows/deploy.yml` hazırdır. `main` dalına her gönderimde testleri çalıştırır, derler ve yayınlar. Adres otomatik ayarlanır.

1. GitHub'da yeni bir depo açın. Örnek ad: `quest66`.
2. Bu projeyi depoya gönderin (`KULLANICI` yerine kendi adınızı yazın):

   ```bash
   git remote add origin https://github.com/KULLANICI/quest66.git
   ```

   ```bash
   git push -u origin main
   ```

3. Depoda **Settings > Pages > Build and deployment > Source** altında **GitHub Actions**'ı seçin.
4. **Actions** sekmesinden çalışmayı izleyin. İlk gönderimde Pages henüz açık olmadığı için hata alırsanız **Re-run jobs** ile tekrarlayın.
5. Site `https://KULLANICI.github.io/quest66/` adresinde yayına girer.

### Cloudflare Pages

1. Cloudflare panelinde **Workers & Pages > Create > Pages > Connect to Git** yolunu izleyip depoyu seçin.
2. Derleme ayarlarını girin:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION` = `24`
3. **Save and Deploy**'a basın. Site `https://<proje>.pages.dev` adresinde açılır. `BASE_PATH` gerekmez.

## Telefona kurulum

1. Android'de **Chrome** ile yayın adresini açın.
2. Sağ üstteki **⋮** menüsünden **Ana ekrana ekle** veya **Uygulamayı yükle**'yi seçin.
3. Ana ekrandaki **Quest66** simgesinden açın. İlk açılıştan sonra internet olmadan da çalışır.

Veriler bu cihazın tarayıcı deposundadır. Chrome'un site verilerini temizlemek veya uygulamayı kaldırmak verileri siler. Düzenli olarak **Ayarlar > Dışa aktar** ile yedek alın.

### Kurulumdan sonra denenecekler

Otomatik testler sahte API yanıtlarıyla ve masaüstü Chromium'da çalışır. Şunları gerçek telefonda bir kez deneyin:

- [ ] **Ayarlar > Bağlantıyı test et** gerçek anahtarla çalışıyor.
- [ ] Yeni bir haftada görevler yapay zekâdan geliyor (hazır havuz uyarısı çıkmıyor).
- [ ] Ana ekrana ekleme çalışıyor, simge doğru görünüyor.
- [ ] Uçak modunda uygulama açılıyor.
- [ ] Bildirim izni verildikten sonra bildirim görünüyor ve dokununca uygulama öne geliyor.

## Kurallar

| Konu | Davranış |
|---|---|
| Hafta | 66 gün, 7 günlük 9 hafta ve 3 günlük final haftasıdır. Boss 7, 14, ... 63. ve 66. gündedir. |
| Başarılı gün | Ana görevlerin en az Kolay'da %50'si, Normal'de %70'i, Hard Mode'da tamamı biter. Yan görev ve Boss seriyi etkilemez. |
| Gün sıfırlama | Yerel gece yarısında olur. Uygulama kapalıysa bir sonraki açılışta işlenir, aradaki günler kaçırılmış sayılır. |
| Seri dondurucu | Her hafta sonunda 1 tane kazanılır, en fazla 3 birikir. Seri varken başarısız bir günde otomatik kullanılır. |
| Hard Mode cezası | Kaçırılan her ana görev için o görevin XP'sinin yarısı düşülür. Hiç açılmayan gün için 40 XP düşülür. Seviye düşmez, dondurucu cezayı silmez. |
| Yan görev değiştirme | Günde 1 hak. Önce haftanın yedek görevleri, sonra hazır havuz kullanılır. |
| Yapay zekâ başarısızsa | Hatalı yanıtta bir kez yeniden denenir, sonra hafta havuzdan kurulur. En erken bir saat sonra, uygulama açıldığında kalan günler için yeniden denenir. |
| Güvenlik | Model kurallarla sınırlanır. Yine de oruç, kalori, diyet, ilaç gibi ifadeler içeren görevler atılır, yerine havuzdan görev gelir. |

## Klasör yapısı

```text
src/domain/         Saf oyun mantığı: tarih, program, ilerleme, sıfırlama, haftalık özet
src/db/             Dexie şeması, yedekleme ve sıfırlama
src/ai/             API istemcisi, prompt, zod şemaları, güvenlik filtresi
src/quests/         Hazır havuz, seçici, haftalık üretim ve eşitleme
src/features/       Onboarding, Bugün, Profil, Ayarlar ekranları
src/notifications/  Bildirim izni ve hatırlatma
proxy/              Cloudflare Worker CORS proxy'si
tests/e2e/          Playwright testleri
```

## v2 notu: zamanlanmış push bildirimleri

v1 yalnızca uygulama açıldığında hatırlatır. Uygulama kapalıyken bildirim göndermek için sunucu tarafı gerekir:

1. `web-push` ile VAPID anahtar çifti üretin.
2. Uygulamada `registration.pushManager.subscribe()` ile abonelik alıp Cloudflare Worker'a gönderin ve Workers KV'de saklayın.
3. Worker'a bir Cron Trigger ekleyin. Örneğin her akşam abonelere Web Push isteği göndersin. Kimlik doğrulama için VAPID özel anahtarı Worker secret olarak saklanır.
4. Service worker'a (`public/sw-notifications.js`) bir `push` olay dinleyicisi ekleyip `showNotification` çağırın.

Görev verisi yalnızca cihazda olduğu için bildirim metni genel kalır ("Bugünün görevleri seni bekliyor"). Bekleyen görev sayısını göstermek için `push` dinleyicisi IndexedDB'den okuyabilir.

Tarayıcıların Notification Triggers API'si standartlaşmadığı için sunucusuz zamanlamaya güvenilmemelidir.
