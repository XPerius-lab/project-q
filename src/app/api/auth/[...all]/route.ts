import { getRequestContext } from "@cloudflare/next-on-pages";
import { createAuth } from "@/infrastructure/auth/auth";

export const runtime = "edge";

function handler(request: Request) {
  const { env } = getRequestContext();
  const auth = createAuth(env.DB);
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
