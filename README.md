# Project Q

Azerbaycan'da villa ve günlük kiralık konaklamalar için profesyonel rezervasyon
platformu. İlan sitesi değil — admin tarafından küratörlü, komisyon modeliyle
çalışan bir rezervasyon platformu.

## Teknoloji Kararları (neden bunlar seçildi)

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** — spec'te belirtildiği gibi.
- **Cloudflare D1 (SQLite) + Prisma (driver adapter: `@prisma/adapter-d1`)** —
  kullanıcının tüm stack'i tek yerden (Cloudflare) yönetme isteği nedeniyle
  Postgres yerine D1 seçildi. Ölçek (yoğun eşzamanlı trafik, 10K+ günlük
  aktif kullanıcı) gerçek bir ihtiyaç haline gelirse Postgres + Cloudflare
  Hyperdrive'a geçiş bir migration projesi olarak planlanabilir — şu an için
  gerek yok.
- **Cloudflare R2** — fotoğraf/video depolama.
- **Cloudflare Pages/Workers** — hosting (`@cloudflare/next-on-pages` ile build).
- **Better Auth** — auth.
- Double-booking koruması **veritabanı seviyesinde**: `CalendarDay` tablosunda
  `@@unique([villaId, date])` — uygulama katmanına güvenilmiyor.

## Mimari

Clean Architecture, 3 katman:

```
src/domain/          → framework-bağımsız iş kuralları (entities, use-cases, repository interface'leri)
src/infrastructure/  → Prisma/D1, R2, Payriff, Better Auth implementasyonları
src/presentation/    → React bileşenleri (UI)
src/app/             → Next.js route'ları (ince katman — iş mantığı burada YAZILMAZ, use-case'leri çağırır)
```

Kural: `src/app` içindeki route handler'lar/page'ler doğrudan Prisma sorgusu
yazmaz; `domain/use-cases` çağırır, onlar da `infrastructure/repositories`
implementasyonlarını kullanır. Bu sayede DB sağlayıcısı değişirse (D1 → Postgres)
sadece infrastructure katmanı değişir.

## Kapsam (MVP — Faz 1)

Faz 1'e dahil: villa listeleme/detay, takvim (müsait/dolu/rezerve/giriş-çıkış),
rezervasyon + Payriff ödeme, admin paneli, villa sahibi paneli, yorum sistemi,
RBAC + rate limiting + çifte rezervasyon koruması.

Faz 2/3'e ertelenenler (mimaride yeri var ama şimdi kodlanmıyor): check-in/out
doğrulama akışı, hasar raporu, düzenleme talebi, rozet sistemi, acil destek
butonu, kupon/kampanya motoru, sezonluk fiyatlandırma, çoklu kategori, drone/360° tur.

## Kurulum (yerel geliştirme)

```bash
npm install
npm run db:generate
npm run dev
```

Cloudflare D1/R2 binding'leri gerçek `database_id` ile `wrangler.toml` içinde
doldurulmalı (şu an placeholder: `REPLACE_WITH_REAL_D1_ID`).

---

## 🔄 AI Devir Teslim Günlüğü

> Bu proje birden fazla AI aracı arasında geçişle geliştiriliyor. Her önemli
> aşamadan sonra buraya not düşülür ki devralan AI sıfırdan başlamasın.

### [2026-08-04] Claude (Sonnet) — Aşama 1: İskelet kuruldu

**Yapılanlar:**
- Clean Architecture klasör yapısı (`domain / infrastructure / presentation / app`)
- `package.json` — tüm bağımlılıklar tanımlı (henüz `npm install` ÇALIŞTIRILMADI)
- `prisma/schema.prisma` — MVP kapsamındaki tüm modeller: User, Villa,
  VillaPhoto, VillaAmenity, CalendarDay (double-booking koruması burada),
  Booking, Payment, Review, Coupon, PlatformSetting, AuditLog
- `wrangler.toml` — D1 + R2 binding tanımları (placeholder ID'ler dolduruncaya kadar deploy edilemez)
- Domain katmanı örnek dosyalar: `villa.ts`, `booking.ts` (komisyon/iptal hesaplama kuralları)
- `booking-repository.ts` — repository interface (henüz implementasyon YOK)
- `src/infrastructure/db/client.ts` — Prisma+D1 client factory
- Next.js temel iskelet: `layout.tsx`, `page.tsx`, `globals.css` (dark mode CSS
  değişkenleri hazır, toggle UI'ı henüz yok)

**YAPILMADI / sıradaki adım:**
1. `npm install` hiç çalıştırılmadı — ilk iş bu olmalı, sonra `npm run dev` ile
   scaffold'un gerçekten build olduğu doğrulanmalı.
2. `BookingRepository` interface'inin Prisma implementasyonu yazılmadı
   (`src/infrastructure/repositories/` boş).
3. Auth (Better Auth) hiç kurulmadı — sadece paket bağımlılığı eklendi.
4. shadcn/ui hiç init edilmedi (`src/presentation/components/ui` boş).
5. Villa listeleme, takvim UI'ı (ekran görüntüsündeki örneğe benzer), rezervasyon
   akışı, admin paneli — hiçbiri başlamadı.
6. Payriff entegrasyonu hiç başlamadı (`src/infrastructure/payment/` boş).
7. `wrangler.toml` içindeki `database_id` gerçek D1 ID'siyle değiştirilmeli
   (kullanıcı Cloudflare'de D1 database'i henüz oluşturmadıysa önce o yapılmalı).

**Öneri — devralan AI için ilk 3 adım:**
1. `npm install` çalıştır, hataları çöz.
2. `src/infrastructure/repositories/villa-repository.ts` ve
   `booking-repository.ts` implementasyonlarını yaz (Prisma sorguları burada).
3. Villa listeleme sayfası + tekil villa detay/takvim sayfasını
   `src/app/(public)/villalar/` altında kur.

### [2026-08-04] Claude (Sonnet) — Aşama 2: Auth + RBAC

**Yapılanlar:**
- `src/domain/entities/user.ts` — `UserRole` tipi + merkezi `PERMISSIONS` haritası
  (`hasPermission(role, domain, action)`). UI ve route handler'lar rol mantığını
  tekrar tekrar yazmak yerine buraya başvuracak.
- `src/infrastructure/auth/auth.ts` — Better Auth konfigürasyonu, **factory
  fonksiyon olarak** (`createAuth(d1)`), modül seviyesinde singleton DEĞİL.
  Sebep: Cloudflare Workers'ta D1 binding'i (`env.DB`) sadece request context
  içinde erişilebilir; modül seviyesinde yakalanamaz. Bu detayı unutup normal
  Node.js Better Auth örneklerindeki gibi singleton kurmaya çalışmak en olası
  hata kaynağı olacaktır — dikkat edilmeli.
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler (`edge` runtime).
- `src/infrastructure/auth/session.ts` — `getSession(headers)` ve
  `requireRole(headers, allowedRoles)` helper'ları. `requireRole` yetkisiz
  erişimde 401/403 `Response` fırlatır (throw), böylece her sayfada
  if/else tekrarı olmaz.
- `src/middleware.ts` — İKİ KATMANLI koruma stratejisinin 1. katmanı: sadece
  session cookie'sinin VARLIĞINI kontrol eder (`/admin`, `/owner`, `/hesabim`
  prefix'leri için), yoksa `/giris`'e yönlendirir. Gerçek rol kontrolü
  (`requireRole`) her route group'un `layout.tsx`'inde yapılır — çünkü D1'e
  middleware'den değil, ancak request-bound layout'tan erişilebiliyor.
- `src/app/(admin)/layout.tsx` — bu iki katmanlı korumanın örnek kullanımı;
  `/admin/*` altındaki her sayfa otomatik olarak ADMIN rolü gerektirir.
- `(owner)` ve `(public)` route group klasörleri açıldı ama içleri boş.

**YAPILMADI / sıradaki adım:**
1. `(owner)/layout.tsx` henüz yazılmadı — `(admin)/layout.tsx` ile birebir aynı
   mantık, `["OWNER"]` (veya `["ADMIN","OWNER"]`) ile kurulmalı.
2. Giriş/kayıt sayfaları (`/giris`, `/kayit`) hiç yok — Better Auth backend'i
   hazır ama frontend formu (React Hook Form + Zod) yazılmadı.
3. `npm install` hâlâ çalıştırılmadı (bkz. Aşama 1 notu) — Better Auth'un
   `better-auth/adapters/prisma` importunun gerçekten bu sürümde bu path'te
   olduğu DOĞRULANMADI, ilk kurulumda kontrol edilmeli.
4. Villa/Booking repository implementasyonları hâlâ yok.
5. Rol değiştirme (admin panelinden kullanıcıyı OWNER/ADMIN yapma) UI'ı yok.

**Öneri — devralan AI için ilk adımlar:**
1. `npm install` çalıştır, auth API yüzeyini derleme hatalarıyla doğrula.
2. Admin panelinde basit bir "kullanıcı listesi + rol değiştir" ekranı kur
   (`(admin)/kullanicilar/`) — OWNER hesabı açabilmek için bu şart.
3. Villa listeleme sayfası + tekil villa/takvim sayfasına geç
   (`src/infrastructure/repositories/villa-repository.ts` ile başla).

### [2026-08-04] Claude (Sonnet) — Aşama 4: Admin kullanıcı yönetimi (rol + ban)

**Yapılanlar:**
- `src/domain/repositories/user-repository.ts` — `UserRepository` interface.
- `src/infrastructure/repositories/user-repository.ts` — **projedeki ilk somut
  repository implementasyonu** (`PrismaUserRepository`). Bundan sonra
  Villa/Booking repository'leri yazılırken buradaki desen (constructor'a
  `PrismaClient` inject edilir, domain tipine map eden `toDomainX()` helper'ı)
  kopyalanmalı.
- `src/domain/use-cases/manage-users.ts` — `changeUserRole` / `toggleUserBan`.
  İzin kontrolü (`hasPermission`) use-case seviyesinde yapılıyor, route/action
  seviyesinde değil — yani bu fonksiyonlar başka bir yerden (ör. gelecekte bir
  CLI script) çağrılsa bile güvenlik kuralı atlanamaz.
- `(admin)/kullanicilar/actions.ts` — Next.js Server Actions (`"use server"`).
  Her action önce `requireRole(headers(), ["ADMIN"])` çağırıyor — yani hem
  layout hem action seviyesinde çift kontrol var (savunma derinliği).
- `(admin)/kullanicilar/page.tsx` + `user-row.tsx` — kullanıcı tablosu, satır
  başına rol `<select>` ve banla/kaldır butonu, `useTransition` ile server
  action tetikleniyor.

**YAPILMADI / sıradaki adım:**
1. `npm install` HÂLÂ çalıştırılmadı — Aşama 1'den beri tekrar eden not,
   artık gerçekten önce bu yapılmalı, birikmiş küçük hatalar olabilir.
2. Sayfalama/arama UI'ı yok (`repo.list({ search })` altyapısı var ama arama
   kutusu bağlanmadı).
3. Admin'in "yeni kullanıcı oluştur" (spec'teki "Kullanıcı oluşturma" yetkisi)
   akışı yok — şu an sadece VAR OLAN (kayıt olmuş) kullanıcıların rolü
   değiştirilebiliyor. Admin'in sıfırdan bir OWNER hesabı açması (e-posta+geçici
   şifre ile) hâlâ eksik.
4. Villa/Booking repository'leri hâlâ yok — bu artık projenin en büyük boşluğu.
5. Villa listeleme + takvim modülü (ekran görüntüsündeki UI) hiç başlamadı.

**Öneri — devralan AI için ilk adımlar:**
1. `npm install` + tüm dosyaları derleme hatalarına karşı doğrula.
2. `VillaRepository` + `PrismaVillaRepository`'yi `user-repository.ts`
   deseniyle yaz.
3. `(public)/villalar/page.tsx` (liste) ve `(public)/villalar/[slug]/page.tsx`
   (detay + takvim) sayfalarına geç — ekran görüntüsündeki takvim UI'ı
   `src/presentation/components/calendar/` altına, `CalendarDay` modelini
   (villaId+date unique) tüketecek şekilde kurulmalı.

### [2026-08-04] Claude (Sonnet) — Aşama 5: Build doğrulandı, Cloudflare Pages çıktısı üretildi

**Yapılanlar — kullanıcı "gerçekten deploy edilebilir mi?" diye sorunca sandbox'ta denendi:**
- `npm install` çalıştırıldı — 681 paket, temiz kuruldu.
- `npx prisma generate` **BAŞARISIZ** oldu: `binaries.prisma.sh` bu sandbox'ın
  izin verilen ağ listesinde yok (403 Forbidden). **Bu kritik bir uyarı:**
  gerçek geliştirme ortamınızda (kendi bilgisayarınız / Cloudflare'in build
  sunucusu) bu adım muhtemelen sorunsuz çalışacak çünkü oranın ağ kısıtlaması
  yok — ama şu ana kadar hiçbir ortamda gerçek bir Prisma client
  ÜRETİLMEDİ. Yani `next build` tipi kontrolü geçti (çünkü `@prisma/client`
  paketinin generate-öncesi iskelet tipleri yeterliydi) ama **DB'ye gerçekten
  dokunan hiçbir kod (kullanıcı listesi, auth) runtime'da henüz test
  edilmedi.** İlk gerçek deploy'da `/kullanicilar` veya `/api/auth/*` 500
  verirse, ilk bakılacak yer burası.
- `npx next build` → **BAŞARILI** (tip kontrolü + statik sayfa üretimi dahil).
  Bulunan/düzeltilen 2 gerçek hata:
  1. `worker-configuration.d.ts` yerine `env.d.ts` — `wrangler types
     --env-interface CloudflareEnv env.d.ts` ile üretildi ve `tsconfig.json`'ın
     `include`'ına eklendi. Sebep: `@cloudflare/next-on-pages`'in
     `getRequestContext()`'i global `CloudflareEnv` interface'ini bekliyor,
     wrangler'ın varsayılan `Env` ismi eşleşmiyordu.
  2. `/giris` sayfasında `useSearchParams()` bir `<Suspense>` sınırına
     sarılmadan kullanılıyordu — Next.js bunu build-time'da statik export'tan
     düşürüyordu. `GirisPage` artık sadece bir Suspense wrapper, form
     `GirisForm` adında iç bileşende.
- `npx @cloudflare/next-on-pages` (Cloudflare Pages build) → **BAŞARILI**,
  ama önce `(admin)/layout.tsx`, `(admin)/kullanicilar/page.tsx`,
  `(owner)/layout.tsx` dosyalarına `export const runtime = "edge"` eklenmesi
  gerekti — `getRequestContext()` kullanan her route/layout'un edge runtime
  ilan etmesi ZORUNLU, yoksa build "not configured for Edge Runtime" hatasıyla
  düşüyor. **Kural: D1'e dokunan her yeni sayfa/layout'a bu satır eklenmeli,
  aksi halde Cloudflare Pages build'i kırılır.**
- Çıktı: `.vercel/output/static/` — bu klasör Cloudflare Pages dashboard'una
  doğrudan sürükle-bırak yapılabilir durumda (`project-q-cloudflare-pages-build.zip`
  olarak kullanıcıya verildi).

**YAPILMADI / gerçek risk:**
1. **Prisma client hiç generate edilmedi** — yukarıda açıklandığı gibi, bu
   sandbox'ın ağ kısıtlaması yüzünden. Devralan AI/kullanıcı kendi ortamında
   `npx prisma generate` çalıştırıp DB'ye dokunan akışları (kayıt ol → giriş
   yap → /kullanicilar) MUTLAKA elle test etmeli, build başarısı bunu garanti
   etmiyor.
2. D1 database'i, R2 bucket'ı Cloudflare'de hâlâ oluşturulmadı;
   `wrangler.toml`'daki `database_id` hâlâ placeholder.
3. `BETTER_AUTH_SECRET` ve Payriff anahtarları hâlâ boş — bunlar olmadan
   auth prod'da çalışmaz.
4. Villa/Booking repository'leri, villa listeleme + takvim modülü hâlâ yok.

**Öneri — devralan AI/kullanıcı için ilk adımlar:**
1. Cloudflare dashboard'da D1 database + R2 bucket oluştur, `wrangler.toml`'a
   gerçek ID'leri yaz.
2. Pages projesine `project-q-cloudflare-pages-build.zip` içeriğini sürükle-bırak
   ile yükle, Bindings sekmesinden D1/R2/env variable'ları bağla.
3. Deploy sonrası `/kayit` → `/giris` → `/kullanicilar` akışını gerçekten
   dene — Prisma generate hiç doğrulanmadığı için burada sürpriz hata çıkma
   ihtimali var.
4. Sorunsuzsa Villa listeleme + takvim modülüne geç.

### [2026-08-04] Claude (Sonnet) — Aşama 6: Villa repository + Villa listeleme/takvim modülü

**Yapılanlar:**
- `src/domain/repositories/villa-repository.ts` — `VillaRepository` interface'i.
  `VillaWithCover` (liste kartı için kapak fotoğrafı + amenity etiketleri) ve
  `VillaDetail` (tekil sayfa için tüm fotoğraflar) ayrı tiplerle modellendi ki
  liste sorgusu gereksiz veri çekmesin. `CalendarDayView` — takvim UI'ının
  tükettiği, boşlukları AVAILABLE olarak doldurulmuş görünüm tipi.
- `src/infrastructure/repositories/villa-repository.ts` — `PrismaVillaRepository`,
  `PrismaUserRepository` (Aşama 4) deseniyle: constructor injection, module-private
  `toVillaWithCover()` mapper. `getCalendar()` — DB'de sadece istisna satırları
  (rezerve/bloklu/fiyat override) var; bu fonksiyon `from..to` aralığındaki HER
  günü üretip DB satırı olmayanları AVAILABLE + basePrice ile dolduruyor, yani
  UI hiçbir zaman "eksik gün" görmüyor.
- `src/domain/entities/villa.ts` — `Villa` tipine `isFeatured` eklendi (şemada
  zaten vardı, "Editörün Seçimi" rozetini listede/detayda göstermek için
  domain katmanına da taşındı).
- `src/presentation/components/calendar/villa-calendar.tsx` — Aya göre
  gruplanmış, Pazartesi-başlangıçlı takvim grid'i. Salt görüntüleme — tıklanabilir
  tarih seçimi / rezervasyon akışı henüz YOK (Payriff entegrasyonu bekliyor).
- `src/app/(public)/villalar/page.tsx` — liste sayfası, şehir/kategori/misafir
  sayısı filtreli (GET query params, client JS gerektirmiyor).
- `src/app/(public)/villalar/[slug]/page.tsx` — detay sayfası: fotoğraf
  grid'i, özellikler, olanaklar, 60 günlük müsaitlik takvimi.
- Her iki sayfaya da `export const runtime = "edge"` eklendi (Aşama 5'teki
  kural: D1'e dokunan her route bunu ilan etmeli).

**YAPILMADI / sıradaki adım:**
1. `npm install` / `npx prisma generate` bu oturumda da ÇALIŞTIRILAMADI —
   bu sefer neden farklı: bu sandbox'ta ağ **tamamen kapalıydı** (Aşama 5'teki
   sandbox'ta en azından npm registry'ye erişim vardı, sadece
   `binaries.prisma.sh` engelliydi). Yani bu yeni kod hiç derlenmedi/typecheck
   edilmedi. Devralan AI/kullanıcı `npm install && npx prisma generate && npm run typecheck`
   çalıştırıp özellikle şunları doğrulamalı: Prisma'nın `villa.findMany({ include })`
   dönüş tipiyle `VillaRow` elle yazılmış tipinin eşleştiği, ve
   `searchParams`/`params` Promise tiplerinin kullanılan Next.js sürümüyle uyumlu
   olduğu (Next 15 App Router'da bunlar Promise, ama paket sürümü henüz
   doğrulanmadığı için küçük bir risk).
2. Takvimde tarih seçip rezervasyon başlatma akışı yok — sadece görüntüleme.
   `BookingRepository` interface'i var (Aşama 0'dan beri) ama
   `PrismaBookingRepository` implementasyonu hâlâ YOK — bir sonraki büyük adım bu.
3. `next/image` yerine düz `<img>` kullanıldı (R2 bucket domain'i
   `next.config.js`'e `images.remotePatterns` olarak henüz eklenmedi).
4. Villa oluşturma/düzenleme (admin) ekranı yok — şu an DB'ye villa eklemenin
   tek yolu manuel seed/SQL. Boş listeyle karşılaşmamak için bir seed script'i
   faydalı olur.
5. Fiyat/tarih aralığı seçilip "X gece için toplam Y AZN" hesaplaması yok —
   `calculateStayPrice()` (domain/entities/villa.ts) hazır ama hiçbir UI
   çağırmıyor henüz.

**Öneri — devralan AI için ilk adımlar:**
1. `npm install && npx prisma generate` çalıştır, `npm run typecheck` ile bu
   aşamada yazılan dosyaları doğrula (özellikle Prisma include tipleri).
   Sorun çıkarsa `PrismaVillaRepository` içindeki elle yazılmış `VillaRow`
   tipini gerçek Prisma `Prisma.VillaGetPayload<...>` tipiyle değiştir.
2. Basit bir seed script'i (`prisma/seed.ts`) yaz — en az 1 owner + birkaç
   villa + birkaç CalendarDay istisnası (BOOKED/BLOCKED) — takvim ve liste
   sayfalarını gerçek veriyle görsel olarak test etmek için.
3. `src/infrastructure/repositories/booking-repository.ts`
   (`PrismaBookingRepository`) yaz — `createBookingWithDateLock` içinde
   `CalendarDay`'in `@@unique([villaId, date])` kısıtına dayanan bir
   transaction (Prisma `$transaction`, çakışan tarihte `createMany` unique
   constraint hatası fırlatırsa rezervasyonu reddet) kur. Bu, double-booking
   korumasının gerçek test edileceği yer.

### [2026-08-04] Claude (Sonnet) — Aşama 7: Booking repository + rezervasyon akışı + auth şeması düzeltmesi

**Yapılanlar:**
- **Kritik düzeltme — `prisma/schema.prisma`:** Better Auth'un Prisma adapter'ı
  `Session`, `Account`, `Verification` modellerini ve `User.emailVerified`
  alanını zorunlu kılıyor; şemada bunların HİÇBİRİ yoktu (Aşama 2'den beri
  fark edilmemiş bir eksiklik — auth backend'i "kuruldu" olarak işaretlenmişti
  ama gerçek login asla çalışmazdı). Eklendi; şifre artık `Account.password`'de
  (better-auth'un standart yeri), bu yüzden hiçbir yerde kullanılmayan
  `User.passwordHash` kaldırıldı.
- `src/domain/repositories/booking-repository.ts` — `DateRangeUnavailableError`
  eklendi (domain katmanında, çünkü hem repository hem use-case bunu fırlatıp
  yakalıyor).
- `src/infrastructure/repositories/booking-repository.ts` —
  `PrismaBookingRepository`. Çifte rezervasyon koruması iki adımlı: (1) her
  gece için önce düz `create()` denenir, `@@unique([villaId,date])`
  ihlaliyle karşılaşırsa (2) `updateMany({where:{...,status:"AVAILABLE"}})`
  ile koşullu güncellemeye düşer; `count===0` ise `DateRangeUnavailableError`
  fırlatır ve tüm transaction (booking satırı dahil) geri alınır. Yorumlarda
  NEDEN bu iki adımın gerektiği açıklandı — D1 tek yazarlı olsa da
  uygulama katmanına güvenilmiyor (README'nin kendi ilkesi).
- `src/infrastructure/repositories/platform-settings.ts` — `getCommissionRate()`,
  `PlatformSetting` key/value tablosundan okuyor, satır yoksa %15 varsayılan.
- `src/domain/use-cases/create-booking.ts` — izin kontrolü
  (`hasPermission(role,"booking","create")`) + takvimden fiyat hesaplama
  (`calculateStayPrice`) + asıl kilitlemeyi repository'ye devretme. Buradaki
  müsaitlik kontrolü sadece hızlı/kullanıcı dostu hata mesajı içindir — asıl
  garanti repository'nin transaction'ında.
- `(public)/villalar/[slug]/actions.ts` + `booking-form.tsx` — basit
  giriş/çıkış tarihi formu, `createBookingAction` server action'ı çağırıyor,
  villa detay sayfasına eklendi. Takvimde tıklayarak tarih seçimi YOK (elle
  tarih girişi) — kapsam dışı bırakıldı.
- `prisma/seed.ts` — 2 owner + 4 demo villa (fotoğraf/olanak/birkaç takvim
  istisnasıyla — BOOKED/BLOCKED/fırsat günü), düz `PrismaClient` ile (D1
  binding'i değil, yerel `DATABASE_URL` sqlite dosyası).
- `prisma/promote-admin.ts` — ilk ADMIN'i bootstraplamak için: önce `/kayit`
  ile normal kayıt ol (böylece better-auth şifre hash'ini kendisi doğru
  üretir), sonra `npm run db:seed:admin -- <email>` ile rolü ADMIN'e çevir.
  Şifre hash'ini elle taklit etmeye çalışmak yerine bu yol seçildi.
- `package.json` — `db:seed`, `db:seed:admin` script'leri + `tsx` devDependency.

**YAPILMADI / sıradaki adım:**
1. Bu aşama da derlenmedi/typecheck edilmedi (ağ hâlâ kapalı — bkz. Aşama 6
   notu, durum değişmedi). En riskli noktalar: (a) yeni Better Auth şemasının
   gerçekten `better-auth/adapters/prisma`'nın beklediğiyle birebir eşleşmesi
   (model/alan adları doğru ama TS tarafında `createAuth()`'un `user.additionalFields`
   ile üretilen tipin `session.user.id` gibi erişimlerle uyumu doğrulanmadı),
   (b) `Prisma.TransactionClient` tipinin import edildiği yer (`booking-repository.ts`).
2. Rezervasyon PENDING durumunda kalıyor — Payriff ödeme entegrasyonu
   (`src/infrastructure/payment/` hâlâ boş) olmadan CONFIRMED'e geçiş yok.
   Ödeme başarısız/timeout olursa PENDING rezervasyonların (ve tuttukları
   CalendarDay satırlarının) temizlenmesi için bir job/TTL yok — bu, gerçek
   kullanıcıların günleri sonsuza kadar "meşgul" gösterebilir.
3. Takvimde tıklayarak tarih seçimi yok, elle `<input type=date>` var.
4. `admin/rezervasyonlar` ekranı yok — oluşan rezervasyonları admin'in
   görebileceği/onaylayabileceği bir yer yok.
5. E-posta doğrulama (`emailVerified`) alanı şemaya eklendi ama akış
   (doğrulama linki gönderme) hâlâ bağlanmadı — şu an her yeni kullanıcı
   `emailVerified: false` ile kalıyor ve hiçbir kontrol buna bakmıyor.

**Öneri — devralan AI için ilk adımlar:**
1. `npm install && npx prisma generate && npm run typecheck` — özellikle
   yeni auth şemasını ve booking-repository'deki transaction tiplerini
   doğrula.
2. `npm run db:seed` sonra `/kayit` + `npm run db:seed:admin -- <email>` ile
   uçtan uca dene: villa listesi → detay/takvim → rezervasyon formu → admin
   panelinde kullanıcı rolü.
3. Payriff entegrasyonuna başla (`src/infrastructure/payment/`) — PENDING
   rezervasyonu ödeme sonrası CONFIRMED'e çeken bir webhook/callback route'u
   ilk hedef olmalı.

### [2026-08-04] Claude (Sonnet) — Aşama 3: Giriş/Kayıt sayfaları + Owner layout

**Yapılanlar:**
- `src/lib/auth-client.ts` — Better Auth browser client (bu modül-seviyesinde
  singleton OLABİLİR, çünkü D1'e ihtiyacı yok, sadece `/api/auth/*`'a istek atıyor).
- `src/lib/validation/auth.ts` — login/register Zod şemaları (Türkçe hata mesajlarıyla).
- `/giris` sayfası — React Hook Form + Zod + `signIn.email()`, başarılı girişte
  `?redirect=` param'ına (middleware'in eklediği) geri döner.
- `/kayit` sayfası — `signUp.email()`. **Önemli:** bu form HER ZAMAN CUSTOMER
  rolüyle kayıt açar — backend'de (`auth.ts`, Aşama 2) `role` alanı
  `input: false` olarak kilitlendiği için zaten kullanıcı formdan rol
  gönderemez, ama bu bilinçli bir tasarım kararı: OWNER hesapları sadece admin
  panelinden açılacak (spec'teki "villa sahibi doğrudan ilan oluşturamaz"
  kuralına paralel).
- `(owner)/layout.tsx` — `(admin)/layout.tsx` ile aynı mantık, `["OWNER","ADMIN"]`
  izinli (admin destek amaçlı owner panelini görebilsin diye).

**YAPILMADI / sıradaki adım:**
1. `npm install` HÂLÂ çalıştırılmadı — bu noktada gerçekten yapılmalı, çünkü
   Better Auth client/server API yüzeyi (`signIn.email`, `auth.api.getSession`
   dönüş şekli vb.) sürüme göre değişebilir; kod "muhtemelen doğru" ama
   derlemeden doğrulanmadı.
2. Kayıt sonrası e-posta doğrulama akışı yok (Better Auth'ta `emailVerification`
   ayarı eklenmedi — MVP kapsamına dahil mi karar verilmeli).
3. Admin'in "kullanıcı oluşturma / OWNER yapma" ekranı hâlâ yok — bu olmadan
   sistemde OWNER rolüne sahip gerçek bir kullanıcı oluşturulamaz.
4. Villa/Booking repository implementasyonları hâlâ yok.
5. Villa listeleme + takvim modülü (ekran görüntüsündeki UI) hiç başlamadı.

**Öneri — devralan AI için ilk adımlar:**
1. `npm install` çalıştır, auth API yüzeyini derleme hatalarıyla doğrula.
2. Admin panelinde basit bir "kullanıcı listesi + rol değiştir" ekranı kur
   (`(admin)/kullanicilar/`) — OWNER hesabı açabilmek için bu şart.
3. Villa listeleme sayfası + tekil villa/takvim sayfasına geç
   (`src/infrastructure/repositories/villa-repository.ts` ile başla).

