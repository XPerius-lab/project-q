import type { PrismaClient } from "@prisma/client";
import type {
  VillaRepository,
  VillaWithCover,
  VillaDetail,
  CalendarDayView,
} from "@/domain/repositories/villa-repository";
import type { VillaCategory } from "@/domain/entities/villa";

// Same pattern as PrismaUserRepository (Aşama 4): constructor-injected PrismaClient,
// module-private toDomainX() mappers, no Prisma types leak past this file.
export class PrismaVillaRepository implements VillaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list({
    city,
    category,
    minCapacity,
    limit = 24,
  }: {
    city?: string;
    category?: VillaCategory;
    minCapacity?: number;
    limit?: number;
  }): Promise<VillaWithCover[]> {
    const rows = await this.prisma.villa.findMany({
      where: {
        isActive: true,
        ...(city ? { city } : {}),
        ...(category ? { category } : {}),
        ...(minCapacity ? { capacity: { gte: minCapacity } } : {}),
      },
      include: {
        photos: { orderBy: { order: "asc" } },
        amenities: true,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return rows.map(toVillaWithCover);
  }

  async findBySlug(slug: string): Promise<VillaDetail | null> {
    const row = await this.prisma.villa.findUnique({
      where: { slug },
      include: {
        photos: { orderBy: { order: "asc" } },
        amenities: true,
      },
    });

    if (!row || !row.isActive) return null;

    return {
      ...toVillaWithCover(row),
      photoUrls: row.photos.map((p) => p.url),
    };
  }

  async getCalendar(villaId: string, from: Date, to: Date): Promise<CalendarDayView[]> {
    const villa = await this.prisma.villa.findUnique({
      where: { id: villaId },
      select: { basePrice: true },
    });
    if (!villa) return [];

    const rows = await this.prisma.calendarDay.findMany({
      where: { villaId, date: { gte: from, lte: to } },
    });

    // Index existing rows by ISO date-only string so we can fill gaps below —
    // most nights have no row at all (that's the AVAILABLE default), so we
    // build the full range here instead of only returning what's in the DB.
    const byDate = new Map(rows.map((r) => [isoDateOnly(r.date), r]));

    const out: CalendarDayView[] = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = isoDateOnly(d);
      const existing = byDate.get(key);
      out.push({
        date: key,
        status: (existing?.status as CalendarDayView["status"]) ?? "AVAILABLE",
        price: existing?.price ?? villa.basePrice,
      });
    }
    return out;
  }
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type VillaRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  ownerId: string;
  city: string;
  region: string | null;
  approxLat: number;
  approxLng: number;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
  isFeatured: boolean;
  photos: { url: string; isCover: boolean }[];
  amenities: { label: string }[];
};

function toVillaWithCover(row: VillaRow): VillaWithCover {
  const cover = row.photos.find((p) => p.isCover) ?? row.photos[0];
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category as VillaCategory,
    ownerId: row.ownerId,
    city: row.city,
    region: row.region ?? undefined,
    approxLat: row.approxLat,
    approxLng: row.approxLng,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    basePrice: row.basePrice,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    coverPhotoUrl: cover?.url ?? null,
    amenityLabels: row.amenities.map((a) => a.label),
  };
}
