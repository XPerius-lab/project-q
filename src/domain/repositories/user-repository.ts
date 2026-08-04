import type { User, UserRole } from "@/domain/entities/user";

export interface UserRepository {
  list(params: { search?: string; limit?: number }): Promise<User[]>;
  updateRole(userId: string, role: UserRole): Promise<User>;
  setBanned(userId: string, isBanned: boolean): Promise<User>;
}
