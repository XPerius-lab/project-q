import Link from "next/link";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createPrismaClient } from "@/infrastructure/db/client";
import { PrismaVillaRepository } from "@/infrastructure/repositories/villa-repository";
import type { VillaCategory } from "@/domain/entities/villa";

// D1'e dokunan her sayfa/layout edge runtime ilan etmeli (bkz. Aşama 5 notu),
// aksi halde `next-on-pages` build'i "not configured for Edge Runtime" ile kırılıyor.
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

export default async function VillalarPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string; misafir?: string }>;
}) {
  const { city, category, misafir } = await searchParams;

  const { env } = getRequestContext();
  const prisma = createPrismaClient(env.DB);
  const repo = new PrismaVillaRepository(prisma);

  const villas = await repo.list({
    city: city || undefined,
    category: (category as VillaCategory) || undefined,
    minCapacity: misafir ? Number(misafir) : undefined,
    limit: 48,
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Villa &amp; Günlük Kiralık İlanları</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Küratörlü konaklamalar — Azerbaycan genelinde.
      </p>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <input
          name="city"
          defaultValue={city ?? ""}
          placeholder="Şehir (örn. Qəbələ)"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select name="category" defaultValue={category ?? ""} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Tüm kategoriler</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="misafir"
          type="number"
          min={1}
          defaultValue={misafir ?? ""}
          placeholder="Misafir sayısı"
          className="w-36 rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm text-white">
          Filtrele
        </button>
      </form>

      {villas.length === 0 ? (
        <p className="text-muted-foreground">Kriterlere uyan ilan bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {villas.map((villa) => (
            <Link
              key={villa.id}
              href={`/villalar/${villa.slug}`}
              className="group overflow-hidden rounded-xl border transition hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {villa.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2 URL'leri, next/image domain izni ayrı bir görev
                  <img
                    src={villa.coverPhotoUrl}
                    alt={villa.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Fotoğraf yok
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="font-medium leading-tight">{villa.title}</h2>
                  {villa.isFeatured && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Editörün Seçimi
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {villa.city}
                  {villa.region ? `, ${villa.region}` : ""} · {CATEGORY_LABELS[villa.category]}
                </p>
                <p className="mt-2 text-sm">
                  {villa.capacity} misafir · {villa.bedrooms} yatak odası · {villa.bathrooms} banyo
                </p>
                <p className="mt-2 font-semibold">
                  {villa.basePrice} AZN <span className="font-normal text-muted-foreground">/ gece</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
