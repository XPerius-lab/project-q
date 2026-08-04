import { createAuthClient } from "better-auth/react";

// Browser-side client — talks to /api/auth/* (the catch-all route from Aşama 2).
// No D1/env access needed here, so this CAN be a module-level singleton.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
