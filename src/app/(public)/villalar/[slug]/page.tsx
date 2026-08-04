import { notFound } from "next/navigation";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createPrismaClient } from "@/infrastructure/db/client";
import { PrismaVillaRepository } from "@/infrastructure/repositories/villa-repository";
import { VillaCalendar } from "@/presentation/components/calendar/villa-calendar";
import { BookingForm } from "./booking-form";
import type { VillaCategory } from "@/domain/entities/villa";

export const runtime = "edge";

const CATEGORY_LABELS: Record<VillaCategory, string> = {
  VILLA: "Villa",
  DAILY_HOUSE: "Günlük Ev",
  TINY_HOUSE: "Tiny House",
  MOUNTAIN_HOUSE: "Dağ Evi",
  CAMPSITE: "Kamp Alanı",
  CARAVAN: "Karavan",
  BOAT: "Tekne",
  EVENT_SPACE: "Etkinlik Alanı",
  STUDIO: "Stüdyo",
};

// Takvimde iki aylık müsaitlik gösteriliyor; rezervasyon akışı (Payriff ile
// birlikte) henüz kodlanmadı — bu sayfa şimdilik salt görüntüleme.
const CALENDAR_RANGE_DAYS = 60;

export default async function VillaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { env } = getRequestContext();
  const prisma = createPrismaClient(env.DB);
  const repo = new PrismaVillaRepository(prisma);

  const villa = await repo.findBySlug(slug);
  if (!villa) notFound();

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + CALENDAR_RANGE_DAYS);

  const calendarDays = await repo.getCalendar(villa.id, from, to);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/villalar" className="hover:underline">
          Villalar
        </a>{" "}
        / {villa.title}
      </nav>

      {villa.photoUrls.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 overflow-hidden rounded-xl sm:grid-cols-4">
          {villa.photoUrls.slice(0, 4).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- R2 URL'leri, next/image domain izni ayrı bir görev
            <img
              key={url}
              src={url}
              alt={`${villa.title} — fotoğraf ${i + 1}`}
              className={`aspect-square w-full object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : ""}`}
            />
          ))}
        </div>
      )}

      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{villa.title}</h1>
        {villa.isFeatured && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
            Editörün Seçimi
          </span>
        )}
      </div>
      <p className="mb-4 text-muted-foreground">
        {villa.city}
        {villa.region ? `, ${villa.region}` : ""} · {CATEGORY_LABELS[villa.category]}
      </p>

      <dl className="mb-6 grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Kapasite</dt>
          <dd className="font-medium">{villa.capacity} misafir</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Yatak odası</dt>
          <dd className="font-medium">{villa.bedrooms}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Yatak</dt>
          <dd className="font-medium">{villa.beds}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Banyo</dt>
          <dd className="font-medium">{villa.bathrooms}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Giriş</dt>
          <dd className="font-medium">{villa.checkInTime}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Çıkış</dt>
          <dd className="font-medium">{villa.checkOutTime}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Gecelik fiyat</dt>
          <dd className="font-medium">{villa.basePrice} AZN</dd>
        </div>
      </dl>

      <p className="mb-6 whitespace-pre-line leading-relaxed">{villa.description}</p>

      <div className="mb-8">
        <BookingForm villaId={villa.id} basePrice={villa.basePrice} />
      </div>

      {villa.amenityLabels.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 font-medium">Olanaklar</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {villa.amenityLabels.map((label) => (
              <li key={label} className="rounded-full border px-3 py-1">
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Müsaitlik Takvimi</h2>
        <VillaCalendar days={calendarDays} />
        <p className="mt-3 text-xs text-muted-foreground">
          Takvimde tarih tıklayarak seçim henüz yok — yukarıdaki formdan giriş/çıkış
          tarihini elle girin. Ödeme (Payriff) entegrasyonu henüz eklenmedi; rezervasyon
          şu an PENDING durumunda oluşturuluyor.
        </p>
      </div>
    </main>
  );
}
