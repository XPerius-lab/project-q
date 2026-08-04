import { headers } from "next/headers";
import { requireRole } from "@/infrastructure/auth/session";

export const runtime = "edge";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  // ADMIN da villa sahibi panelini görebilir (destek/denetim amaçlı).
  await requireRole(await headers(), ["OWNER", "ADMIN"]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">{/* TODO: owner nav — takvim, rezervasyonlar, kazanç */}</aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
