import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

// D1Database type comes from the Cloudflare Workers runtime bindings (env.DB).
// In Next.js on Cloudflare Pages, env is accessed via getRequestContext() from
// '@cloudflare/next-on-pages' inside route handlers — pass the binding in here.
export function createPrismaClient(d1: D1Database) {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({ adapter });
}

// Usage inside a Route Handler:
//
// import { getRequestContext } from "@cloudflare/next-on-pages";
// import { createPrismaClient } from "@/infrastructure/db/client";
//
// export async function GET() {
//   const { env } = getRequestContext();
//   const prisma = createPrismaClient(env.DB);
//   ...
// }
