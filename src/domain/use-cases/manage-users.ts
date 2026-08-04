import type { UserRepository } from "@/domain/repositories/user-repository";
import type { UserRole } from "@/domain/entities/user";
import { hasPermission } from "@/domain/entities/user";

export class UnauthorizedActionError extends Error {}

export async function changeUserRole(
  repo: UserRepository,
  actorRole: UserRole,
  targetUserId: string,
  newRole: UserRole,
) {
  if (!hasPermission(actorRole, "user", "manage")) {
    throw new UnauthorizedActionError("Bu işlem için yetkiniz yok.");
  }
  return repo.updateRole(targetUserId, newRole);
}

export async function toggleUserBan(
  repo: UserRepository,
  actorRole: UserRole,
  targetUserId: string,
  isBanned: boolean,
) {
  if (!hasPermission(actorRole, "user", "ban")) {
    throw new UnauthorizedActionError("Bu işlem için yetkiniz yok.");
  }
  return repo.setBanned(targetUserId, isBanned);
}
