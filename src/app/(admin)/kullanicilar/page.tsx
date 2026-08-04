import { getRequestContext } from "@cloudflare/next-on-pages";
import { createPrismaClient } from "@/infrastructure/db/client";
import { PrismaUserRepository } from "@/infrastructure/repositories/user-repository";
import { UserRow } from "./user-row";

export const runtime = "edge";

// Not: sayfanın kendisi (admin)/layout.tsx üzerinden zaten ADMIN'e kilitli
// (bkz. Aşama 2) — burada ayrıca requireRole çağırmaya gerek yok, layout hallediyor.
export default async function KullanicilarPage() {
  const { env } = getRequestContext();
  const prisma = createPrismaClient(env.DB);
  const repo = new PrismaUserRepository(prisma);
  const users = await repo.list({ limit: 100 });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Kullanıcılar</h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b font-medium">
            <th className="p-2">Ad Soyad</th>
            <th className="p-2">E-posta</th>
            <th className="p-2">Rol</th>
            <th className="p-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="mt-4 text-muted-foreground">Henüz kayıtlı kullanıcı yok.</p>
      )}
    </div>
  );
}
