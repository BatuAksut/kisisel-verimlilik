# Quest66 proxy

Uygulama sağlayıcıya tarayıcıdan doğrudan bağlanamazsa (CORS hatası) bu Cloudflare Worker aracı olur.
Ayarlar ekranındaki **Bağlantıyı test et** düğmesi hata veriyorsa kullanın. Doğrudan bağlantı çalışıyorsa gerekmez.

## Kurulum

1. `wrangler.toml` içindeki `ALLOWED_ORIGINS` değerini uygulamanın kökeniyle değiştirin. Örnek:
   `https://kullanici.github.io`. Sonda `/` veya depo adı olmamalı.
2. Bu klasörde Cloudflare hesabınıza girin ve Worker'ı yayınlayın:

   ```bash
   npx wrangler login
   ```

   ```bash
   npx wrangler deploy
   ```

3. Komutun verdiği `https://quest66-proxy.<hesap>.workers.dev` adresini uygulamada **Ayarlar > Proxy URL** alanına yazın.

## Güvenlik

- Worker anahtarı saklamaz, her istekte uygulamanın gönderdiği `Authorization` başlığını iletir.
- `ALLOWED_ORIGINS` boşsa tüm istekler reddedilir.
- Yalnızca `POST /chat/completions` kabul edilir ve yalnızca `ALLOWED_UPSTREAMS` listesindeki sağlayıcılara gider.
- Başka bir OpenAI uyumlu sağlayıcıya geçerseniz adresini `ALLOWED_UPSTREAMS` listesine ekleyip yeniden yayınlayın.
- Köken kontrolü yalnızca tarayıcıları sınırlar, tarayıcı dışı araçlar `Origin` başlığını taklit edebilir. Bu durumda bile istek yalnızca izinli sağlayıcılara gider ve gönderenin kendi API anahtarını gerektirir.
