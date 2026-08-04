// Yerel geliştirme için demo veri. D1 binding'i gerektirmez — düz PrismaClient
// kullanır, bu yüzden DATABASE_URL (.env'deki `file:./local.db`) üzerinden
// çalışır. Production/D1 için bu script kullanılmaz.
//
// NOT — neden kullanıcı şifreleri burada YOK: better-auth parolaları kendi
// scrypt tabanlı algoritmasıyla Account.password'e yazıyor; burada elle aynı
// hash'i üretmeye çalışmak (yanlış yapılırsa sessizce kırılan login'lere yol
// açar) yerine, gerçek login gerektiren kullanıcılar için `/kayit` üzerinden
// normal kayıt + `npm run db:seed:admin -- <email>` akışı kullanılmalı (bkz.
// prisma/promote-admin.ts). Bu script sadece villa sahibi FK hedefleri ve
// demo villa/takvim verisi üretir — login gerektirmeyen satırlar.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNERS = [
  { email: "sahibe1@example.com", name: "Elvin Məmmədov" },
  { email: "sahibe2@example.com", name: "Aygün Hüseynova" },
];

const VILLAS = [
  {
    title: "Qəbələ Dağ Manzaralı Villa",
    slug: "qebele-dag-manzarali-villa",
    description:
      "Qəbələ'nin dağ eteklerinde, şam ormanına bakan, hovuzlu geniş villa. " +
      "6 yataq otağı, tam təchiz edilmiş mətbəx, şömünəli oturma salonu.",
    category: "VILLA",
    ownerEmail: "sahibe1@example.com",
    city: "Qəbələ",
    region: "Qəbələ rayonu",
    approxLat: 40.9903,
    approxLng: 47.8456,
    capacity: 12,
    bedrooms: 6,
    beds: 8,
    bathrooms: 4,
    basePrice: 450,
    isFeatured: true,
    amenities: ["Hovuz", "Wi-Fi", "Parkinq", "Şömine", "Sauna", "Barbekü"],
  },
  {
    title: "Şəki Tarixi Mərkəz Günlük Ev",
    slug: "seki-tarixi-merkez-gunluk-ev",
    description:
      "Şəki'nin tarixi mərkəzində, Karvansaraya yürüş məsafəsində, ənənəvi " +
      "memarlıqla bərpa edilmiş 2 otaqlı ev.",
    category: "DAILY_HOUSE",
    ownerEmail: "sahibe1@example.com",
    city: "Şəki",
    region: "Şəki rayonu",
    approxLat: 41.1919,
    approxLng: 47.1706,
    capacity: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    basePrice: 180,
    isFeatured: false,
    amenities: ["Wi-Fi", "Mətbəx", "Kondisioner"],
  },
  {
    title: "Naftalan Termal Yaxınlığı Tiny House",
    slug: "naftalan-termal-yakinlik-tiny-house",
    description:
      "Naftalan sağlamlıq mərkəzlərinə yaxın, sakit bağ içində minimalist tiny house.",
    category: "TINY_HOUSE",
    ownerEmail: "sahibe2@example.com",
    city: "Naftalan",
    region: null,
    approxLat: 40.5975,
    approxLng: 46.8261,
    capacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePrice: 120,
    isFeatured: false,
    amenities: ["Wi-Fi", "Terras"],
  },
  {
    title: "Qusar Şahdağ Ətəyi Dağ Evi",
    slug: "qusar-sahdag-etegi-dag-evi",
    description:
      "Şahdağ qış-yay turizm mərkəzinə 15 dəqiqə, kaminli, geniş terraslı dağ evi.",
    category: "MOUNTAIN_HOUSE",
    ownerEmail: "sahibe2@example.com",
    city: "Qusar",
    region: "Qusar rayonu",
    approxLat: 41.4189,
    approxLng: 48.0083,
    capacity: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 2,
    basePrice: 320,
    isFeatured: true,
    amenities: ["Şömine", "Wi-Fi", "Parkinq", "Dağ mənzərəsi"],
  },
];

async function main() {
  const ownerIdByEmail = new Map<string, string>();
  for (const owner of OWNERS) {
    const row = await prisma.user.upsert({
      where: { email: owner.email },
      update: {},
      create: { email: owner.email, name: owner.name, role: "OWNER", emailVerified: true },
    });
    ownerIdByEmail.set(owner.email, row.id);
    console.log(`✓ owner: ${owner.name} (${row.id})`);
  }

  for (const v of VILLAS) {
    const ownerId = ownerIdByEmail.get(v.ownerEmail);
    if (!ownerId) throw new Error(`Owner not seeded: ${v.ownerEmail}`);

    const villa = await prisma.villa.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        title: v.title,
        slug: v.slug,
        description: v.description,
        category: v.category,
        ownerId,
        city: v.city,
        region: v.region ?? undefined,
        approxLat: v.approxLat,
        approxLng: v.approxLng,
        capacity: v.capacity,
        bedrooms: v.bedrooms,
        beds: v.beds,
        bathrooms: v.bathrooms,
        basePrice: v.basePrice,
        isFeatured: v.isFeatured,
        amenities: {
          create: v.amenities.map((label) => ({ key: slugify(label), label })),
        },
        photos: {
          create: [
            { url: placeholderPhoto(v.slug, 1), order: 0, isCover: true },
            { url: placeholderPhoto(v.slug, 2), order: 1, isCover: false },
            { url: placeholderPhoto(v.slug, 3), order: 2, isCover: false },
          ],
        },
      },
    });
    console.log(`✓ villa: ${villa.title} (${villa.slug})`);

    // Birkaç istisna gün: takvim UI'ının BOOKED/BLOCKED renklerini de
    // gösterebilmesi için. Geri kalan tüm günler kasıtlı olarak boş
    // bırakılıyor — PrismaVillaRepository.getCalendar() bunları AVAILABLE
    // olarak dolduruyor zaten (bkz. Aşama 6 notu, README).
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await seedCalendarDay(villa.id, addDays(today, 3), "BOOKED");
    await seedCalendarDay(villa.id, addDays(today, 4), "BOOKED");
    await seedCalendarDay(villa.id, addDays(today, 10), "BLOCKED_BY_OWNER");
    await seedCalendarDay(villa.id, addDays(today, 20), "AVAILABLE", v.basePrice * 0.8); // fırsat günü
  }

  console.log("\nTamamlandı. Giriş yapabilen (ADMIN) bir kullanıcı için:");
  console.log("  1) npm run dev, sonra /kayit ile normal kayıt ol");
  console.log("  2) npm run db:seed:admin -- <kayıt olduğun e-posta>");
}

async function seedCalendarDay(villaId: string, date: Date, status: string, price?: number) {
  await prisma.calendarDay.upsert({
    where: { villaId_date: { villaId, date } },
    update: {},
    create: { villaId, date, status, price },
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Gerçek R2 fotoğrafları yüklenene kadar yer tutucu — deploy sonrası
// admin panelinden gerçek fotoğraflarla değiştirilecek.
function placeholderPhoto(slug: string, n: number): string {
  return `https://placehold.co/1200x800?text=${slug}-${n}`;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
