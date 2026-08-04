import { getRequestContext } from "@cloudflare/next-on-pages";
import { createAuth } from "@/infrastructure/auth/auth";
import type { UserRole } from "@/domain/entities/user";

export async function getSession(requestHeaders: Headers) {
  const { env } = getRequestContext();
  const auth = createAuth(env.DB);
  return auth.api.getSession({ headers: requestHeaders });
}

// Throws a Response (Next.js convention for early-exit in Server Components/Route Handlers)
// so callers can just `await requireRole(headers(), ["ADMIN"])` without extra if/else noise.
// In a Route Handler pass `request.headers`; in a Server Component/layout pass
// `headers()` imported from "next/headers".
export async function requireRole(requestHeaders: Headers, allowed: UserRole[]) {
  const session = await getSession(requestHeaders);

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const role = (session.user as { role?: UserRole }).role ?? "CUSTOMER";
  const isBanned = (session.user as { isBanned?: boolean }).isBanned ?? false;

  if (isBanned) {
    throw new Response("Account banned", { status: 403 });
  }

  if (!allowed.includes(role)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return { ...session, role };
}
