import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createPrismaClient } from "@/infrastructure/db/client";

// IMPORTANT (Cloudflare Workers gotcha): the D1 binding (env.DB) only exists
// inside a request context — it cannot be captured in a module-level singleton
// the way Better Auth examples usually show for Node servers. So auth() is a
// factory, called fresh inside each route handler with the current request's
// D1 binding. See src/app/api/auth/[...all]/route.ts for usage.
export function createAuth(d1: D1Database) {
  const prisma = createPrismaClient(d1);

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 gün
      updateAge: 60 * 60 * 24, // her 24 saatte bir session yenile
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "CUSTOMER",
          input: false, // kullanıcı kayıt formundan role gönderemez — sadece admin değiştirebilir
        },
        isBanned: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
      },
    },
  });
}
