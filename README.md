# ZecLearn — Global canlı Zcash bilgi yarışması

Dünyanın her yerinden oyuncuların aynı anda katıldığı, sunucu yönetimli canlı Zcash yarışmaları.
Web sitesi + telefona kurulabilir uygulama (PWA).

**Öne çıkanlar**
- **Planlı global yarışmalar:** Yönetici başlangıç saatini ve ödülü belirler; yarışma o saatte kendiliğinden başlar, sorular otomatik ilerler, host gerekmez.
- **Sunucu yönetimli odalar:** Sınıf/etkinlik için Kahoot tarzı oda; host projeksiyondan yönetir, oyuncular kod/QR ile katılır.
- **Yenilemeye dayanıklı:** Tüm oyun durumu veritabanında. Host da oyuncu da sayfayı yenilerse, interneti kopup gelirse ya da başka cihazdan açarsa kaldığı yerden devam eder.
- **Hileye dayanıklı:** Doğru cevap, cevap ekranına kadar istemciye hiç gönderilmez. Süre ve puan sunucu saatiyle hesaplanır (uzak ülkeler için gecikme payı var). Solo modda aynı quizi tekrar oynayarak puan kasılamaz.
- **Zorunlu hesap:** Google veya e-posta koduyla giriş; kullanıcı adı, ülke ve isteğe bağlı üniversite/takım.
- **Liderlik:** Oyuncu, **ülke** ve takım bazında; tüm zamanlar / 30 gün / hafta / bugün.
- **ZEC ödülleri:** İlk N kişiye otomatik ödül talebi açılır, kazanan Zcash adresini girer (u1 / zs / t adres biçimi denetlenir), yönetici gönderip işlem kimliğiyle "ödendi" işaretler.
- **İçerik üretimi:** Onaylı üreticiler quiz hazırlar (iki dilli editör + JSON içe aktarma), yöneticiler inceleyip yayınlar.
- **TR / EN**, koyu/açık tema, mobil öncelikli tasarım.

---

## Mimari

```
Tarayıcı / Telefon (Next.js, PWA)
   │  supabase-js
   ├── RPC (PostgREST)  → supabase/migrations/*.sql içindeki güvenlik denetimli fonksiyonlar
   ├── Realtime         ← "game:<id>" kanalı: her durum değişikliği veritabanından yayınlanır
   └── Auth             → Google OAuth, e-posta OTP
Supabase Postgres  ← oyun motoru burada (faz geçişleri, puanlama, ödüller)
pg_cron (önerilir)  → her 5 sn'de zamanı gelen yarışmaları ilerletir
```

- Tablolara doğrudan erişim **kapalı** (RLS açık, politika yok). Her şey `security definer` RPC fonksiyonlarıyla yapılır; her fonksiyon kendi yetki denetimini yapar.
- Realtime koparsa istemci otomatik olarak yoklamaya (polling) geçer; oyun kesilmez.
- Süre dolduğunda geçişi herhangi bir istemci veya pg_cron tetikler; tekrarlı çağrılar güvenlidir.

---

## Marka: isim ve resmi Zcash logosu

**İsim:** Uygulama adı `lib/config.ts` → `SITE.name` alanından gelir (menü, sayfa başlıkları, paylaşım görseli). Ayrıca `public/manifest.webmanifest` içindeki `name` / `short_name` alanlarını güncelleyin.

**Resmi Zcash logosu:** Zcash'in resmi marka kitinden indirdiğiniz dosyaları `public/brand/` klasörüne koyun:

| Dosya | Nerede görünür |
|---|---|
| `public/brand/zcash-mark.svg` | Menüdeki logo, Zcash kartı, giriş/katılım ekranları, oyuncu ekranı, favicon |
| `public/brand/zcash-mark-white.svg` | Koyu zeminler (isteğe bağlı) |

Sonra uygulama ikonlarını ve paylaşım görselini yeniden üretin:
```bash
npm run brand
```
Dosya konana kadar arayüzde yerine sade bir "ZEC" rozeti görünür. Zcash ticari markası Zcash Foundation'a aittir; yayından önce marka kullanım koşullarına göz atmanızı öneririz.

## Kurulum (yaklaşık 20 dakika)

### 1) Supabase projesi
1. https://supabase.com → **New project** (bölge olarak oyuncularına yakın bir yer seç, ör. Frankfurt).
2. **SQL Editor**'de sırayla çalıştır:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_profiles_quizzes.sql`
   3. `supabase/migrations/0003_game_engine.sql`
   4. `supabase/migrations/0004_solo_leaderboard_admin.sql`
3. **Database → Extensions** → `pg_cron`'u aç, sonra `supabase/optional/cron.sql` dosyasını çalıştır. *(Önerilir: kimse bağlı değilken bile planlı yarışmalar zamanında ilerler.)*
4. **Realtime → Settings**: "Allow public access" / public channels açık olmalı (varsayılan). Oyun durumu herkese açıktır; doğru cevap içermez.

> Supabase CLI kullanıyorsan: `supabase link` ve `supabase db push` aynı migration'ları uygular.

### 2) Giriş yöntemleri
**Authentication → URL Configuration**
- *Site URL:* `https://alan-adin.com`
- *Redirect URLs:* `https://alan-adin.com/auth/callback` ve geliştirme için `http://localhost:3000/auth/callback`

**E-posta ile kod (OTP)** — *Authentication → Emails → Magic Link* şablonuna kodu ekle:
```html
<h2>ZecLearn giriş kodun</h2>
<p>Kodun: <strong>{{ .Token }}</strong></p>
<p>Ya da bu bağlantıya tıkla: <a href="{{ .ConfirmationURL }}">Giriş yap</a></p>
```
Gerçek kullanıcılar için **SMTP** ayarla (*Authentication → SMTP Settings*; Resend, Postmark, SES vb.). Supabase'in yerleşik e-posta servisi saatte yalnızca birkaç e-postaya izin verir.

**Google ile giriş** — *Authentication → Providers → Google*:
1. https://console.cloud.google.com → APIs & Services → Credentials → **OAuth client ID** (Web application)
2. *Authorized redirect URI:* `https://<proje-ref>.supabase.co/auth/v1/callback`
3. Client ID ve Secret'ı Supabase'e gir.

### 3) Yayına alma (Vercel)
1. Projeyi GitHub'a yükle.
2. https://vercel.com → **Import** → ortam değişkenleri (`.env.example`'a bak):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (*Supabase → Project Settings → API*)
   - `NEXT_PUBLIC_SITE_URL` = yayındaki adresin
3. Deploy. Alan adını bağla ve Supabase *Site URL* / *Redirect URLs* ayarlarını güncelle.

### 4) İlk yönetici
Sitede giriş yapıp profilini oluştur, sonra `supabase/optional/first_admin.sql` içindeki e-postayı değiştirip çalıştır. Diğer yönetici/üretici atamaları sitedeki **Yönetim → Kullanıcılar** ekranından yapılır.

### Yerelde geliştirme
```bash
cp .env.example .env.local   # Supabase bilgilerini gir
npm install
npm run dev                  # http://localhost:3000
```

---

## Kullanım

### Quiz eklemek
- **Stüdyo → Yeni quiz:** iki dilli editör (soru, 2–4 seçenek, doğru cevap, açıklama, sıralama).
- **Stüdyo → JSON içe aktar:** elinizdeki soruları toplu yüklemek için. Biçim: `samples/` klasörü (`_SABLON.json` şablon, diğerleri örnek). Tek quiz ya da quiz dizisi yapıştırılabilir; içe aktarılanlar taslak olarak gelir.
- Üreticiler **İncelemeye gönder**ir; yöneticiler **Yönetim → İnceleme**'den onaylar/reddeder (ret sebebi yazara gösterilir). Yöneticinin kendi quizleri doğrudan yayınlanır.
- Yayındaki bir quiz düzenlenirse tekrar incelemeye düşer. Başlamış oyunlar etkilenmez (oyun başlarken soruların kopyası alınır).

### Planlı global yarışma
**Yönetim → Yarışmalar → Yarışma planla:** quiz, ad (TR/EN), başlangıç (kendi yerel saatinle girilir, herkese kendi saat diliminde gösterilir), cevap/skor ekranı süreleri, ödül metni ve ödüllü sıra sayısı.
- Yarışma ana sayfada ve **Canlı Yarışmalar**'da geri sayımla listelenir; oyuncular takvime ekleyebilir.
- Oyuncular lobiye istediği zaman girer, geç gelenler bir sonraki sorudan katılır.
- **Konsolu aç** ile ekranı yansıtabilirsin; akış otomatiktir. İstersen "Şimdi başlat" ile erken başlatırsın.

### Sunucu yönetimli oda
Quiz sayfasında **Canlı Oda Aç** (üretici ve yöneticiler). Projeksiyonda kod + QR görünür. **Boşluk/Enter** ile ilerlenir: başlat → cevabı göster → skor tablosu → sonraki soru → kürsü. Herkes cevaplayınca ya da süre bitince cevap otomatik gösterilir. Lobide oyuncunun adına tıklayarak çıkarabilirsin.

### Ödüller
Yarışma bitince ilk N oyuncu (puanı > 0; eşitlikte önce katılan) için talep açılır. Profilinde kayıtlı adresi olanlar doğrudan "Ödeme bekleniyor"a düşer; diğerleri **Ödüllerim** sayfasında adres girer. **Yönetim → Ödüller**'de adresi kopyala, cüzdanından gönder, işlem kimliğini (txid) girip **Ödendi işaretle**.

> Adres biçimi denetlenir, ancak sağlama toplamı (checksum) doğrulanmaz. Göndermeden önce adresi cüzdanında kontrol et.

### 10 saniye kuralı
Her soru için cevap süresi **10 saniyedir** (canlı yarışma, sunucu yönetimli oda ve solo). Kural sunucuda uygulanır: quiz dosyalarında veya editörde farklı süre olsa bile kullanılmaz, istemci tarafında değiştirilemez. Süreyi ileride değiştirmek isterseniz iki yeri birlikte güncelleyin: `supabase/migrations/0001_schema.sql` → `_answer_secs()` ve `lib/config.ts` → `ANSWER_SECS`.

### Puanlama
Doğru cevap = 500 + hıza göre 0–500 + art arda doğru serisi başına +100 (en fazla +500). Yanlış/boş = 0. Hız, sunucunun soruyu açtığı andan ölçülür; ağ gecikmesi için 800 ms pay verilir. Değerler: `supabase/migrations/0001_schema.sql` (`_points`) ve `0003_game_engine.sql` (`_latency_grace_ms`).

**Liderlik toplamı** = canlı yarışma skorlarının toplamı + her quiz için en iyi solo skor.

---

## Uygulama (PWA)
- Android/Chrome/Edge: menüde **Uygulamayı yükle** düğmesi çıkar.
- iPhone: Safari → Paylaş → **Ana Ekrana Ekle**.
- Oyun sırasında ekran kararmaz (destekleyen tarayıcılarda). İnternet koparsa uyarı gösterilir, bağlantı gelince devam edilir.
- İleride App Store / Play Store sürümü aynı Supabase altyapısıyla (ör. Capacitor veya React Native) yapılabilir.

## Ölçek
- Supabase ücretsiz plan: aynı anda ~200 Realtime bağlantı. Büyük global yarışmalar için **Pro** plan (500+ bağlantı, eklentilerle binlerce) önerilir. Realtime limitine ulaşılsa bile istemciler yoklamayla çalışmaya devam eder.
- Cevap gösteriminde istemciler kendi sonuçlarını rastgele gecikmeyle (0–2 sn) çeker; binlerce oyuncu aynı anda sunucuya yüklenmez.
- Çok büyük etkinliklerden önce `supabase/tests` ile yük testi yapmanı öneririz.

## Testler
`supabase/tests/test_engine.py` — oyun motorunun 117 testi (roller, 10 saniye kuralı, quiz yaşam döngüsü, tablo erişim güvenliği, sunucu yönetimli ve planlı oyunlar, yenileme sonrası devam, süre aşımı, geç cevap, oyuncu çıkarma, ödüller, solo, liderlik, 60 eşzamanlı oyuncu). Supabase'i taklit eden yerel bir Postgres'te çalışır:
```bash
createdb -E UTF8 zq_test
psql -d zq_test -f supabase/tests/stub.sql
for f in supabase/migrations/*.sql; do psql -d zq_test -f $f; done
pip install "psycopg[binary]"
ZQ_TEST_DSN="dbname=zq_test" python3 supabase/tests/test_engine.py
```

## Özelleştirme
- İsim, slogan, kenar çubuğu kartı, X linki, blok gezgini: `lib/config.ts`
- Arayüz metinleri ve hata mesajları (TR/EN): `lib/i18n.tsx`
- Renkler: `tailwind.config.ts` (`zec` paleti), `app/globals.css` (tema tokenları)
- Logo ve ikonlar: yukarıdaki "Marka" bölümü (`public/brand/`, `npm run brand`)
- Hukuki metinler: `app/terms`, `app/privacy` — başlangıç şablonudur; yayın öncesi hukukçuya gözden geçirtin (KVKK/GDPR).

## Klasör yapısı
```
app/                     sayfalar
  page.tsx               ana sayfa (canlı/yaklaşan yarışmalar, quizler, liderlik)
  events/                yarışma listesi
  play/[code]/           oyuncu ekranı (telefon)
  host/[id]/             host / projeksiyon konsolu
  results/[id]/          yarışma sonuçları (paylaşılabilir)
  solo/[slug]/           solo pratik
  studio/                üretici stüdyosu ve editör
  admin/                 yönetim paneli
  login, onboarding, me, u/[username], leaderboard, explore, quiz/[slug] …
components/              arayüz bileşenleri
lib/                     api (RPC sarmalayıcıları), auth, useGame (realtime + yoklama), saat senkronu, i18n
supabase/migrations/     veritabanı şeması ve oyun motoru
supabase/optional/       pg_cron ve ilk yönetici
supabase/tests/          motor testleri
samples/                 örnek quiz JSON'ları + şablon
public/                  PWA manifest, service worker, ikonlar
```

Teknolojiler: Next.js 14, React 18, Tailwind CSS, Supabase (Postgres, Auth, Realtime), lucide-react, qrcode, sharp (ikon üretimi).

Tasarım: açık tema varsayılan (koyu tema düğmeyle), Plus Jakarta Sans, Zcash altını yalnızca ana eylemlerde. Renk tokenları `app/globals.css` içinde.

*Bağımsız bir topluluk projesidir; Electric Coin Co. veya Zcash Foundation ile resmi bağı yoktur.*
