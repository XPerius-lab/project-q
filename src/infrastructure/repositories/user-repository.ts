import type { PrismaClient } from "@prisma/client";
import type { UserRepository } from "@/domain/repositories/user-repository";
import type { User, UserRole } from "@/domain/entities/user";

// First concrete repository implementation in the project — this is the
// pattern to copy for VillaRepository / BookingRepository next.
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list({ search, limit = 50 }: { search?: string; limit?: number }): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map(toDomainUser);
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return toDomainUser(row);
  }

  async setBanned(userId: string, isBanned: boolean): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });
    return toDomainUser(row);
  }
}

function toDomainUser(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  isBanned: boolean;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    isBanned: row.isBanned,
  };
}
