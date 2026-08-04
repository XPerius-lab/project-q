// Chicken-and-egg çözümü: sistemde admin panelinden başka ADMIN yapma yolu
// yok (bkz. README, Aşama 4 notu #3), ama admin panelinin kendisi ADMIN
// gerektiriyor. Bu script köprü: önce /kayit ile normal (CUSTOMER) kayıt ol
// — böylece better-auth password hash'ini KENDİSİ doğru üretir — sonra bu
// script sadece role sütununu ADMIN'e çeviriyor.
//
// Kullanım: npm run db:seed:admin -- admin@example.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Kullanım: npm run db:seed:admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Bulunamadı: ${email} — önce /kayit üzerinden hesap oluştur.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`✓ ${updated.email} artık ADMIN.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
