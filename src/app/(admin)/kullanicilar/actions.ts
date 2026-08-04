"use server";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createPrismaClient } from "@/infrastructure/db/client";
import { PrismaUserRepository } from "@/infrastructure/repositories/user-repository";
import { requireRole } from "@/infrastructure/auth/session";
import { changeUserRole, toggleUserBan } from "@/domain/use-cases/manage-users";
import type { UserRole } from "@/domain/entities/user";

async function getRepo() {
  const { env } = getRequestContext();
  const prisma = createPrismaClient(env.DB);
  return new PrismaUserRepository(prisma);
}

export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  const { role } = await requireRole(await headers(), ["ADMIN"]);
  const repo = await getRepo();
  await changeUserRole(repo, role, userId, newRole);
  revalidatePath("/kullanicilar");
}

export async function toggleBanAction(userId: string, isBanned: boolean) {
  const { role } = await requireRole(await headers(), ["ADMIN"]);
  const repo = await getRepo();
  await toggleUserBan(repo, role, userId, isBanned);
  revalidatePath("/kullanicilar");
}
