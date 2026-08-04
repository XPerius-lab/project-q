import { headers } from "next/headers";
import { requireRole } from "@/infrastructure/auth/session";

export const runtime = "edge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Throws a 401/403 Response if the visitor isn't an ADMIN — Next.js renders
  // its nearest error boundary for that. Every /admin/* page is covered
  // automatically because layouts wrap all nested routes.
  await requireRole(await headers(), ["ADMIN"]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">{/* TODO: admin nav — villalar, kullanıcılar, rezervasyonlar, ayarlar */}</aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
